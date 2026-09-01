import logging
import json
from datetime import datetime, timezone
from databricks import sql

from app.config import Config
from app.utils.databricks_config_utils import build_databricks_config


class DatabricksService:
    """Service that opens a single SQL Connector connection for its lifetime.

        Runtime authentication is Service Principal only:
            - DATABRICKS_HOST
            - DATABRICKS_CLIENT_ID
            - DATABRICKS_CLIENT_SECRET
            - DATABRICKS_WAREHOUSE_ID

    The SQL connector maps Spark types to Python types automatically:
      date   ? datetime.date
      double ? float
      string ? str
    """

    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)
        self._db_catalog = Config.DB_CATALOG
        self._db_schema = Config.DB_SCHEMA
        cfg = build_databricks_config()
        self._connection = sql.connect(
            server_hostname=cfg.host,
            http_path=f"/sql/1.0/warehouses/{cfg.warehouse_id}",
            credentials_provider=lambda: cfg.authenticate,
        )

        # Pin the SQL session namespace once so unqualified table names resolve correctly.
        with self._connection.cursor() as cursor:
            cursor.execute(f"USE CATALOG `{self._db_catalog}`")
            cursor.execute(f"USE SCHEMA `{self._db_schema}`")

    def cursor(self):
        """Return a cursor bound to a session configured with catalog/schema."""
        return self._connection.cursor()

    def close(self) -> None:
        """Close the underlying connection."""
        self._connection.close()

    def __enter__(self) -> "DatabricksService":
        return self

    def __exit__(self, *_) -> None:
        self.close()

    def write_webapp_audit_log(self, record: dict) -> None:
        """Write one audit event row into the configured webapp_* audit table."""
        event_time_utc = record.get("event_time_utc") or datetime.now(timezone.utc)
        if not isinstance(event_time_utc, datetime):
            event_time_utc = datetime.now(timezone.utc)

        parameters = record.get("parameters")
        if parameters is None:
            parameters_json = "{}"
        elif isinstance(parameters, str):
            parameters_json = parameters
        else:
            parameters_json = json.dumps(parameters, ensure_ascii=True, separators=(",", ":"))

        query = f"""
            INSERT INTO webapp_audit_log
                (id, event_time_utc, operation_name,
                 http_method, route_path, endpoint, duration_ms,
                 user_email, identity_source, user_agent, client_ip,
                 request_id, client_session_id, parameters_json)
            VALUES
                (:id, :event_time_utc, :operation_name,
                 :http_method, :route_path, :endpoint, :duration_ms,
                 :user_email, :identity_source, :user_agent, :client_ip,
                 :request_id, :client_session_id, :parameters_json)
        """

        params = {
            "id": record.get("id"),
            "event_time_utc": event_time_utc,
            "operation_name": record.get("operation_name"),
            "http_method": record.get("http_method"),
            "route_path": record.get("route_path"),
            "endpoint": record.get("endpoint"),
            "duration_ms": record.get("duration_ms"),
            "user_email": record.get("user_email"),
            "identity_source": record.get("identity_source"),
            "user_agent": record.get("user_agent"),
            "client_ip": record.get("client_ip"),
            "request_id": record.get("request_id"),
            "client_session_id": record.get("client_session_id"),
            "parameters_json": parameters_json,
        }

        with self.cursor() as cursor:
            cursor.execute(query, parameters=params)
