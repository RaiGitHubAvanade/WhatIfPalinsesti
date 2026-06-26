import logging
from databricks import sql
from databricks.sdk.core import Config as DatabricksConfig


class DatabricksService:
    """Service that opens a single SQL Connector connection for its lifetime.

    Authentication is handled by the Databricks SDK Config, which automatically
    picks up Service Principal credentials from environment variables:
      DATABRICKS_HOST, DATABRICKS_CLIENT_ID, DATABRICKS_CLIENT_SECRET

    The SQL connector maps Spark types to Python types automatically:
      date   ? datetime.date
      double ? float
      string ? str
    """

    def __init__(self) -> None:
        self._logger = logging.getLogger(__name__)
        cfg = DatabricksConfig()
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
