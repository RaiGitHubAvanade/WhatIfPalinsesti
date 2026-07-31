import logging
from databricks import sql

from app.utils.databricks_config_utils import build_databricks_config


class DatabricksService:
    """Service that opens a single SQL Connector connection for its lifetime.

        Authentication is handled by Databricks unified auth:
            - DATABRICKS_CONFIG_PROFILE from .databrickscfg (recommended for local), or
            - explicit env credentials (client id/secret or token)

        The warehouse id can come from DATABRICKS_WAREHOUSE_ID or, in local dev,
        from WEBAPP/databricks.yml SQL warehouse resource configuration.

    The SQL connector maps Spark types to Python types automatically:
      date   ? datetime.date
      double ? float
      string ? str
    """

    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)
        cfg = build_databricks_config()
        if not cfg.warehouse_id:
            raise ValueError(
                "Missing warehouse id. Set DATABRICKS_WAREHOUSE_ID or configure "
                "a sql_warehouse id in WEBAPP/databricks.yml."
            )
        self._connection = sql.connect(
            server_hostname=cfg.host,
            http_path=f"/sql/1.0/warehouses/{cfg.warehouse_id}",
            credentials_provider=lambda: cfg.authenticate,
        )

    def close(self) -> None:
        """Close the underlying connection."""
        self._connection.close()

    def __enter__(self) -> "DatabricksService":
        return self

    def __exit__(self, *_) -> None:
        self.close()
