import logging
from databricks import sql

from app.config import Config
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
        self._default_namespace = "ta_coll.whatif"
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
        self._db_namespace = self._resolve_db_namespace()

    def cursor(self):
        """Return a cursor that rewrites SQL namespace based on environment config."""
        return _NamespaceAwareCursor(
            self._connection.cursor(),
            source_namespace=self._default_namespace,
            target_namespace=self._db_namespace,
        )

    def _resolve_db_namespace(self) -> str:
        catalog = _sanitize_env_name(Config.DB_CATALOG)
        schema = _sanitize_env_name(Config.DB_SCHEMA)

        if not catalog:
            catalog = self._detect_reachable_catalog(("ta_prod", "ta_coll")) or "ta_coll"

        if not schema:
            schema = "whatif"

        return f"{catalog}.{schema}"

    def _detect_reachable_catalog(self, candidates: tuple[str, ...]) -> str:
        for candidate in candidates:
            try:
                with self._connection.cursor() as cursor:
                    cursor.execute(f"USE CATALOG {candidate}")
                self._logger.info("Using detected catalog '%s'", candidate)
                return candidate
            except Exception:
                continue
        return ""

    def close(self) -> None:
        """Close the underlying connection."""
        self._connection.close()

    def __enter__(self) -> "DatabricksService":
        return self

    def __exit__(self, *_) -> None:
        self.close()


class _NamespaceAwareCursor:
    def __init__(self, cursor, source_namespace: str, target_namespace: str) -> None:
        self._cursor = cursor
        self._source_namespace = source_namespace
        self._target_namespace = target_namespace

    def execute(self, operation: str, parameters=None):
        if isinstance(operation, str) and self._source_namespace != self._target_namespace:
            operation = operation.replace(self._source_namespace, self._target_namespace)

        if parameters is None:
            return self._cursor.execute(operation)
        return self._cursor.execute(operation, parameters=parameters)

    def __enter__(self):
        self._cursor.__enter__()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return self._cursor.__exit__(exc_type, exc_value, traceback)

    def __getattr__(self, name):
        return getattr(self._cursor, name)


def _sanitize_env_name(value: str | None) -> str:
    if not value:
        return ""
    stripped = value.strip()
    # Databricks App env values may be left as raw bundle placeholders.
    if stripped.startswith("${") and stripped.endswith("}"):
        return ""
    return stripped
