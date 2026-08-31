import logging
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
