"""Helpers to enrich weekly rows with Orario (time-end) data."""

from datetime import timedelta
import re


def normalize_title(title: str) -> str:
    """Normalize program titles for fuzzy matching across datasets."""
    t = (title or "").strip().lower()
    t = re.sub(r"\s*\([^)]*\)", "", t)
    return re.sub(r"\s+", " ", t)


def enrich_rows_with_time(
    rows: list[dict],
    ch: str | None,
    week_monday,
    time_source,
) -> list[dict]:
    """Attach time/end/orario to rows using channel/day schedule data.

    Matching priority:
    1) exact/contained title match against the day schedule
    2) first day entry fallback
    """
    if not rows or not ch or week_monday is None:
        return rows

    enriched = []
    for idx, row in enumerate(rows):
        item = dict(row)

        if item.get("time") and item.get("end"):
            if not item.get("orario"):
                item["orario"] = f"{item['time']}-{item['end']}"
            enriched.append(item)
            continue

        d = week_monday + timedelta(days=idx)
        dow_key = (d.weekday() + 1) % 7  # Mon..Sun -> 1..6,0
        day_progs = time_source.get_day_schedule(ch, dow_key)

        target = normalize_title(str(item.get("prog", "")))
        match = None
        for p in day_progs:
            cand = normalize_title(str(p.get("title", "")))
            if cand == target or (target and target in cand) or (cand and cand in target):
                match = p
                break

        if match is None and day_progs:
            match = day_progs[0]

        if match:
            item["time"] = match.get("time")
            item["end"] = match.get("end")
            if match.get("time") and match.get("end"):
                item["orario"] = f"{match['time']}-{match['end']}"

        enriched.append(item)

    return enriched
