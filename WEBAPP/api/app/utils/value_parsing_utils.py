import json


def parse_string_float_map(raw) -> dict[str, float] | None:
    """Parse a mapping-like value (or its JSON string) into dict[str, float]."""
    if raw is None:
        return None

    source = raw
    if isinstance(raw, str):
        stripped = raw.strip()
        if not stripped:
            return {}
        try:
            source = json.loads(stripped)
        except json.JSONDecodeError:
            return None

    if not isinstance(source, dict):
        return None

    out: dict[str, float] = {}
    for key, value in source.items():
        try:
            out[str(key)] = float(value)
        except (TypeError, ValueError):
            continue

    return out