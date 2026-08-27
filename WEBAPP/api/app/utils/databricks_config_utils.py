import os
import re
import json
import configparser
import shutil
import subprocess
from pathlib import Path

from databricks.sdk.core import Config as DatabricksConfig


def build_databricks_config() -> DatabricksConfig:
    """Build Databricks SDK config and ensure warehouse_id is available.

    Preferred source is standard unified auth resolution (env/.databrickscfg).
    For local development, if warehouse_id is missing, fall back to the SQL
    warehouse id configured in WEBAPP/databricks.yml.
    """
    _ensure_databricks_cli_path_env()
    try:
        cfg = DatabricksConfig()
    except ValueError:
        fallback_cfg = _build_config_from_cli_token()
        if fallback_cfg is None:
            raise
        cfg = fallback_cfg

    _apply_cli_token_fallback(cfg)
    if not getattr(cfg, "warehouse_id", None):
        fallback_id = _resolve_local_warehouse_id(
            preferred_host=getattr(cfg, "host", None),
            preferred_profile=os.getenv("DATABRICKS_CONFIG_PROFILE") or getattr(cfg, "profile", None),
        )
        if fallback_id:
            cfg.warehouse_id = fallback_id
    return cfg


def _build_config_from_cli_token() -> DatabricksConfig | None:
    profile = os.getenv("DATABRICKS_CONFIG_PROFILE") or _read_default_profile()
    host = os.getenv("DATABRICKS_HOST") or _read_profile_value(profile, "host")
    if not profile or not host:
        return None

    token = _fetch_cli_token(host=host, profile=profile)
    if not token:
        return None

    warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID") or _resolve_local_warehouse_id(
        preferred_host=host,
        preferred_profile=profile,
    )
    kwargs: dict[str, str] = {
        "host": host,
        "token": token,
    }
    if warehouse_id:
        kwargs["warehouse_id"] = warehouse_id

    return DatabricksConfig(**kwargs)


def _apply_cli_token_fallback(cfg: DatabricksConfig) -> None:
    """Populate cfg.token from Databricks CLI when unified auth is profile-only.

    This handles local setups where auth_type=databricks-cli is configured in
    .databrickscfg and the Python SDK cannot resolve credentials directly.
    """
    if getattr(cfg, "token", None):
        return

    profile = os.getenv("DATABRICKS_CONFIG_PROFILE") or getattr(cfg, "profile", None)
    host = os.getenv("DATABRICKS_HOST") or getattr(cfg, "host", None)
    if not profile or not host:
        return

    cli_path = os.getenv("DATABRICKS_CLI_PATH") or shutil.which("databricks")
    if not cli_path:
        return

    token = _fetch_cli_token(host=host, profile=profile, cli_path=cli_path)
    if not token:
        return

    cfg.token = token
    cfg.auth_type = "pat"


def _safe_load_json(raw: str) -> dict:
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _ensure_databricks_cli_path_env() -> None:
    """Set DATABRICKS_CLI_PATH if Databricks CLI is installed outside PATH."""
    if os.getenv("DATABRICKS_CLI_PATH"):
        return
    if shutil.which("databricks"):
        return

    user_home = Path.home()
    extensions_root = user_home / ".vscode" / "extensions"
    candidates = sorted(extensions_root.glob("databricks.databricks-*/bin/databricks.exe"))
    if candidates:
        os.environ["DATABRICKS_CLI_PATH"] = str(candidates[-1])


def _fetch_cli_token(host: str, profile: str, cli_path: str | None = None) -> str:
    resolved_cli = cli_path or os.getenv("DATABRICKS_CLI_PATH") or shutil.which("databricks")
    if not resolved_cli:
        return ""

    cmd = [
        resolved_cli,
        "auth",
        "token",
        "--host",
        host,
        "--profile",
        profile,
        "--output",
        "json",
    ]
    proc = subprocess.run(
        cmd,
        check=False,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        return ""

    data = _safe_load_json(proc.stdout)
    return (
        data.get("access_token")
        or data.get("token_value")
        or data.get("token")
        or ""
    ).strip()


def _read_default_profile() -> str | None:
    cfg_file = Path.home() / ".databrickscfg"
    if not cfg_file.exists():
        return None

    parser = configparser.RawConfigParser()
    parser.read(cfg_file, encoding="utf-8")
    if parser.has_section("__settings__"):
        default_profile = parser.get("__settings__", "default_profile", fallback="").strip()
        if default_profile:
            return default_profile

    sections = [sec for sec in parser.sections() if sec not in {"DEFAULT", "__settings__"}]
    return sections[0] if sections else None


def _read_profile_value(profile: str | None, key: str) -> str | None:
    if not profile:
        return None

    cfg_file = Path.home() / ".databrickscfg"
    if not cfg_file.exists():
        return None

    parser = configparser.RawConfigParser()
    parser.read(cfg_file, encoding="utf-8")
    if not parser.has_section(profile):
        return None

    value = parser.get(profile, key, fallback="").strip()
    return value or None


def _resolve_local_warehouse_id(
    preferred_host: str | None = None,
    preferred_profile: str | None = None,
) -> str | None:
    env_warehouse_id = os.getenv("DATABRICKS_WAREHOUSE_ID")
    if env_warehouse_id:
        return env_warehouse_id

    webapp_root = Path(__file__).resolve().parents[3]
    bundle_file = webapp_root / "databricks.yml"
    if not bundle_file.exists():
        return None

    content = bundle_file.read_text(encoding="utf-8")

    resolved_host = (preferred_host or "").strip()
    if not resolved_host and preferred_profile:
        resolved_host = (_read_profile_value(preferred_profile, "host") or "").strip()

    if resolved_host:
        target_id = _resolve_target_warehouse_id_for_host(content, resolved_host)
        if target_id:
            return target_id

    default_id = _resolve_default_resources_warehouse_id(content)
    if default_id:
        return default_id

    # Last resort: keep previous broad behavior.
    match = re.search(
        r"sql_warehouse:\s*\n\s*id:\s*['\"]?([^'\"\n]+)['\"]?",
        content,
        flags=re.IGNORECASE,
    )
    if not match:
        return None

    return match.group(1).strip()


def _resolve_target_warehouse_id_for_host(content: str, host: str) -> str | None:
    target_name = _find_target_name_for_host(content, host)
    if not target_name:
        return None

    target_block = _extract_named_top_level_block(content, "targets", target_name)
    if not target_block:
        return None

    match = re.search(
        r"sql_warehouse:\s*\n\s*id:\s*['\"]?([^'\"\n]+)['\"]?",
        target_block,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    return match.group(1).strip()


def _resolve_default_resources_warehouse_id(content: str) -> str | None:
    resources_block = _extract_top_level_block(content, "resources")
    if not resources_block:
        return None

    match = re.search(
        r"sql_warehouse:\s*\n\s*id:\s*['\"]?([^'\"\n]+)['\"]?",
        resources_block,
        flags=re.IGNORECASE,
    )
    if not match:
        return None
    return match.group(1).strip()


def _find_target_name_for_host(content: str, host: str) -> str | None:
    targets_block = _extract_top_level_block(content, "targets")
    if not targets_block:
        return None

    for match in re.finditer(r"^\s{2}([A-Za-z0-9_-]+):\s*$", targets_block, flags=re.MULTILINE):
        target_name = match.group(1)
        target_block = _extract_named_top_level_block(content, "targets", target_name)
        if not target_block:
            continue
        host_match = re.search(r"^\s{6}host:\s*(.+?)\s*$", target_block, flags=re.MULTILINE)
        if host_match and host_match.group(1).strip() == host.strip():
            return target_name

    return None


def _extract_top_level_block(content: str, key: str) -> str:
    lines = content.splitlines()
    collecting = False
    block: list[str] = []

    for line in lines:
        if not collecting and re.match(rf"^{re.escape(key)}:\s*$", line):
            collecting = True
            block.append(line)
            continue

        if collecting:
            if line and not line.startswith((" ", "\t")):
                break
            block.append(line)

    return "\n".join(block)


def _extract_named_top_level_block(content: str, parent_key: str, child_key: str) -> str:
    parent = _extract_top_level_block(content, parent_key)
    if not parent:
        return ""

    lines = parent.splitlines()
    collecting = False
    block: list[str] = []

    for line in lines:
        if not collecting and re.match(rf"^\s{{2}}{re.escape(child_key)}:\s*$", line):
            collecting = True
            block.append(line)
            continue

        if collecting:
            if re.match(r"^\s{2}[A-Za-z0-9_-]+:\s*$", line):
                break
            block.append(line)

    return "\n".join(block)
