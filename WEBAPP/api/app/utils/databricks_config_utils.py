import os

from databricks.sdk.core import Config as DatabricksConfig


def build_databricks_config() -> DatabricksConfig:
    """Build Databricks SDK config with token-first auth.

    Auth precedence:
    1) PAT/OAuth access token (local-friendly):
        - DATABRICKS_HOST
        - DATABRICKS_TOKEN
        - DATABRICKS_WAREHOUSE_ID
    2) Service Principal fallback:
        - DATABRICKS_HOST
        - DATABRICKS_CLIENT_ID
        - DATABRICKS_CLIENT_SECRET
        - DATABRICKS_WAREHOUSE_ID
    """
    
    host = _normalize_host(os.getenv("DATABRICKS_HOST"))
    token = (os.getenv("DATABRICKS_TOKEN") or "").strip()
    client_id = (os.getenv("DATABRICKS_CLIENT_ID") or "").strip()
    client_secret = (os.getenv("DATABRICKS_CLIENT_SECRET") or "").strip()
    warehouse_id = (os.getenv("DATABRICKS_WAREHOUSE_ID") or "").strip()

    common_missing: list[str] = []
    if not host:
        common_missing.append("DATABRICKS_HOST")
    if not warehouse_id:
        common_missing.append("DATABRICKS_WAREHOUSE_ID")

    if common_missing:
        raise ValueError(
            "Missing Databricks runtime configuration: "
            + ", ".join(common_missing)
            + "."
        )

    if token:
        return DatabricksConfig(
            host=host,
            auth_type="pat",
            token=token,
            client_id="",
            client_secret="",
            warehouse_id=warehouse_id,
        )

    sp_missing: list[str] = []
    if not client_id:
        sp_missing.append("DATABRICKS_CLIENT_ID")
    if not client_secret:
        sp_missing.append("DATABRICKS_CLIENT_SECRET")

    if sp_missing:
        raise ValueError(
            "Missing Databricks runtime configuration: provide DATABRICKS_TOKEN "
            "or Service Principal credentials ("
            + ", ".join(sp_missing)
            + ")."
        )

    return DatabricksConfig(
        host=host,
        auth_type="oauth-m2m",
        token="",
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
