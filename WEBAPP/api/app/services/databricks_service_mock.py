"""Weekly programming service layer."""

from datetime import date, timedelta

from app.data.programs_data import DAY_SCHED, OTHER_CHANNELS, WEEKLY, WEEK_STARTS
from app.view_models.weekly_table_view_model import WeeklyTableViewModel
from app.view_models.palinsesto_view_model import PalinsestoViewModel
from app.models.palinsesto import Palinsesto
from app.services.weekly_enrichment_service import normalize_title
from app.services.weekly_time_source_service import get_default_time_source

# Prime-time window boundaries (inclusive start, exclusive end)
from ..config import Config
_WEEK_TABLE_START = Config.WEEK_TABLE_START
_WEEK_TABLE_END = Config.WEEK_TABLE_END
_WEEK_TABLE_START_OFFSET = Config.WEEK_TABLE_START_OFFSET_MINUTES
_WEEK_TABLE_END_OFFSET = Config.WEEK_TABLE_END_OFFSET_MINUTES

# Italian day abbreviations indexed from Monday (0) to Sunday (6)
_DAY_NAMES = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]


def _week_monday(iso: str) -> date:
    d = date.fromisoformat(iso)
    return d - timedelta(days=d.weekday())


def _in_prime_window(start_str: str | None, end_str: str | None = None) -> bool:
    """Return True when the program falls within (or overlaps into) the configured prime-time window.

    Inclusion rules:
    1. Program starts after WEEK_TABLE_START and ends before WEEK_TABLE_END).
    2. Program starts before WEEK_TABLE_START but ends past WEEK_TABLE_START + START_OFFSET.
    3. Program ends after WEEK_TABLE_END but starts before WEEK_TABLE_END - END_OFFSET.
    """
    if not start_str or not end_str:
        return False

    start = _to_minutes(start_str.strip()[:5])
    end = _to_minutes(end_str.strip()[:5])
    window_start = _to_minutes(_WEEK_TABLE_START)
    window_end = _to_minutes(_WEEK_TABLE_END)

    return (
        (window_start <= start <= window_end)
        or end > window_start + _WEEK_TABLE_START_OFFSET
    ) and (
        (window_start <= end <= window_end)
        or start < window_end - _WEEK_TABLE_END_OFFSET
    )



def _day_label(d: date) -> str:
    return _DAY_NAMES[d.weekday()] + " " + d.strftime("%d/%m")


def _find_archive_by_title(channel: str, monday: date) -> dict:
    """Return a {normalized_title: row} dict from WEEKLY for the matching week."""
    monday_str = str(monday)
    week_key = next((k for k, v in WEEK_STARTS.items() if v == monday_str), None)
    if not week_key or week_key not in WEEKLY:
        return {}

    archive_rows = WEEKLY[week_key]
    # Filter by channel only when rows carry an explicit 'ch' field
    rows_with_ch = [r for r in archive_rows if "ch" in r]
    if rows_with_ch:
        archive_rows = [r for r in archive_rows if r.get("ch") == channel]

    return {normalize_title(str(r.get("prog", ""))): r for r in archive_rows}


def _build_rows_for_day(
    channel: str,
    d: date,
    source,
    archive_by_title: dict,
) -> list[Palinsesto]:
    dow_key = (d.weekday() + 1) % 7  # Mon=1..Sat=6, Sun=0
    progs = source.get_day_schedule(channel, dow_key)
    rows = []

    for p in progs:
        if not _in_prime_window(p.get("time"), p.get("end")):
            continue

        time_str = p.get("time")
        end_str = p.get("end")

        archive = archive_by_title.get(normalize_title(str(p.get("title", ""))))
        row = Palinsesto(
            canale=channel,
            data=d,
            programma=p.get("title"),
            orario_inizio=time_str or "",
            orario_fine=end_str or "",
            share_predetto=archive.get("prev") if archive else p.get("share"),
            share_manuale=None,
            share_reale=archive.get("real") if archive else None,
        )
        rows.append(row)

    return rows


# In-memory store for manual share overrides: { (channel, program_name, from_time, to_time, day_iso): float|None }
_manual_share_overrides: dict[tuple, float | None] = {}


def edit_manual_share(
    channel: str,
    program_name: str,
    from_time: str,
    to_time: str,
    day: date,
    value: float | None,
) -> None:
    """Store (or clear) a manual share override in memory, mirroring the Databricks UPDATE."""
    key = (channel, program_name, from_time, to_time, str(day))
    if value is None:
        _manual_share_overrides.pop(key, None)
    else:
        _manual_share_overrides[key] = value


def get_table_rows(channel: str, day_iso: str) -> WeeklyTableViewModel | None:
    """Build the full weekly table for the week containing `day_iso`."""
    try:
        monday = _week_monday(day_iso)
    except ValueError:
        return None

    sunday = monday + timedelta(days=6)
    week_label = f"{monday.strftime('%d/%m/%Y')} – {sunday.strftime('%d/%m/%Y')}"

    source = get_default_time_source()
    archive_by_title = _find_archive_by_title(channel, monday)

    rows: list[Palinsesto] = []
    for offset in range(7):
        d = monday + timedelta(days=offset)
        rows.extend(_build_rows_for_day(channel, d, source, archive_by_title))

    vm_rows = []
    for r in rows:
        vm = PalinsestoViewModel.MapPalinsestoViewModelFromPalinsesto(r)
        # Apply any in-memory manual share override
        override_key = (channel, r.programma, r.orario_inizio, r.orario_fine, str(r.data))
        if override_key in _manual_share_overrides:
            vm.share_manual = _manual_share_overrides[override_key]
        vm_rows.append(vm)

    return WeeklyTableViewModel(
        week=week_label,
        channel=channel,
        rows=vm_rows,
    )


# ── Competitor programs ────────────────────────────────────────────────────────

_RAI_CHANNELS = {"Rai 1", "Rai 2", "Rai 3"}


def _to_minutes(t: str) -> int:
    """Convert 'HH:MM' to minutes since midnight. Times past midnight (< 06:00) are treated as next-day."""
    h, m = int(t[:2]), int(t[3:5])
    mins = h * 60 + m
    return mins + 1440 if h < 6 else mins


def _overlaps(p_start: str, p_end: str, ref_start: str, ref_end: str) -> bool:
    """Return True when [p_start, p_end) overlaps [ref_start, ref_end)."""
    return _to_minutes(p_start) < _to_minutes(ref_end) and _to_minutes(p_end) > _to_minutes(ref_start)


def get_competitor_programs(
    channel: str,
    day_iso: str,
    from_time: str,
    to_time: str,
    program_name: str,
) -> dict | None:
    """Return programs on all other channels that overlap with [from_time, to_time]."""
    try:
        d = date.fromisoformat(day_iso)
    except ValueError:
        return None

    dow_key = (d.weekday() + 1) % 7  # Mon=1..Sat=6, Sun=0

    # Collect matching programs grouped by channel
    channel_map: dict[str, dict] = {}

    def _add(ch: str, channel_type: str, p: dict) -> None:
        p_start = p.get("time", "")
        p_end = p.get("end", "")
        if p_start and p_end and _overlaps(p_start, p_end, from_time, to_time):
            if ch not in channel_map:
                channel_map[ch] = {"channel": ch, "channel_type": channel_type, "programs": []}
            channel_map[ch]["programs"].append({
                "from_time": p_start,
                "to_time": p_end,
                "program_name": p.get("title"),
            })

    for ch, sched in DAY_SCHED.items():
        if ch == channel:
            continue
        for p in sched.get(dow_key, []):
            _add(ch, "RAI", p)

    for ch, sched in OTHER_CHANNELS.items():
        for p in sched.get(dow_key, []):
            _add(ch, "Competitor", p)

    return {
        "channel": channel,
        "day": day_iso,
        "from_time": from_time,
        "to_time": to_time,
        "program_name": program_name,
        "other_channels": list(channel_map.values()),
    }

