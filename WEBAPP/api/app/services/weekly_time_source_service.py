"""Schedule time sources for weekly programming rows.

Today this module serves mocked data from DAY_SCHED.
It is intentionally structured so a databricks-backed source can be plugged in later.
"""

from app.data.programs_data import DAY_SCHED


class WeeklyTimeSource:
    """Abstract time source for (channel, weekday) schedule rows."""

    def get_day_schedule(self, ch: str, dow_key: int) -> list[dict]:
        raise NotImplementedError


class MockWeeklyTimeSource(WeeklyTimeSource):
    """Mocked time source based on in-repo static data."""

    def get_day_schedule(self, ch: str, dow_key: int) -> list[dict]:
        return DAY_SCHED.get(ch, {}).get(dow_key, [])


class DatabricksWeeklyTimeSource(WeeklyTimeSource):
    """Future databricks-backed time source.

    This is a placeholder so route/service wiring is ready when databricks API calls are added.
    """

    def get_day_schedule(self, ch: str, dow_key: int) -> list[dict]:
        # TODO: replace mock usage with databricks API call through a dedicated client.
        raise NotImplementedError("Databricks source not implemented yet")


def get_default_time_source() -> WeeklyTimeSource:
    """Return the active time source.

    For now we keep using mocked data as requested.
    """
    return MockWeeklyTimeSource()
