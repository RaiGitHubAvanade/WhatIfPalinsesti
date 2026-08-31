import os

from databricks.sdk.core import Config as DatabricksConfig


def build_databricks_config() -> DatabricksConfig:
    """Build Databricks SDK config using Service Principal credentials only.

    Runtime authentication is intentionally strict and does not use profiles
    or user tokens. Required env vars:
    - DATABRICKS_HOST
    - DATABRICKS_CLIENT_ID
    - DATABRICKS_CLIENT_SECRET
    - DATABRICKS_WAREHOUSE_ID
    """
    
    host = _normalize_host(os.getenv("DATABRICKS_HOST"))
    client_id = (os.getenv("DATABRICKS_CLIENT_ID") or "").strip()
    client_secret = (os.getenv("DATABRICKS_CLIENT_SECRET") or "").strip()
    warehouse_id = (os.getenv("DATABRICKS_WAREHOUSE_ID") or "").strip()

    missing: list[str] = []
    if not host:
        missing.append("DATABRICKS_HOST")
    if not client_id:
        missing.append("DATABRICKS_CLIENT_ID")
    if not client_secret:
        missing.append("DATABRICKS_CLIENT_SECRET")
    if not warehouse_id:
        missing.append("DATABRICKS_WAREHOUSE_ID")

    if missing:
        raise ValueError(
            "Missing Databricks runtime configuration: "
            + ", ".join(missing)
            + "."
        )

    return DatabricksConfig(
        host=host,
        client_id=client_id,
        client_secret=client_secret,
        warehouse_id=warehouse_id,
    )


def _normalize_host(raw_host: str | None) -> str:
    host = (raw_host or "").strip()
    if not host:
        return ""
    if host.startswith("https://") or host.startswith("http://"):
        return host.rstrip("/")
    return f"https://{host.rstrip('/')}"
