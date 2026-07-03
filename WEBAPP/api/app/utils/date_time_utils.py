from datetime import date, timedelta


class DateTimeUtils:
    @staticmethod
    def hhmm_to_minutes(t: str) -> int:
        """Convert 'HH:MM' to minutes since midnight. Times before 06:00 are treated as next-day."""
        h, m = int(t[:2]), int(t[3:5])
        mins = h * 60 + m
        return mins + 1440 if h < 6 else mins

    @staticmethod
    def monday_of_week(d: date) -> date:
        """Return the Monday of the week containing *d*."""
        return d - timedelta(days=d.weekday())

    @staticmethod
    def is_past_week(d: date) -> bool:
        """Return True when *d* belongs to a week that ended before the current week."""
        return DateTimeUtils.monday_of_week(d) < DateTimeUtils.monday_of_week(date.today())

    @staticmethod
    def is_current_week(d: date) -> bool:
        """Return True when *d* belongs to the current week."""
        return DateTimeUtils.monday_of_week(d) == DateTimeUtils.monday_of_week(date.today())

    @staticmethod
    def sunday_of_current_week() -> date:
        """Return the Sunday that closes the current week."""
        today = date.today()
        days_to_sunday = 6 - today.weekday()  # weekday(): Mon=0 … Sun=6
        return today + timedelta(days=days_to_sunday)

    @staticmethod
    def is_past_current_week_sunday(d: date) -> bool:
        """Return True when *d* is beyond the Sunday of the current week."""
        return d > DateTimeUtils.sunday_of_current_week()

    @staticmethod
    def hhmm_to_seconds(t: str) -> int:
        """Convert 'HH:MM' string to total seconds since midnight.
        Times before 06:00 are treated as next-day (result > 86400)."""
        h, m = int(t[:2]), int(t[3:5])
        secs = h * 3600 + m * 60
        return secs + 86400 if h < 6 else secs

    @staticmethod
    def seconds_to_hhmm(seconds: int) -> str:
        """Convert total seconds since midnight to 'HH:MM' string."""
        seconds = seconds % 86400  # wrap to [0, 86400)
        h = seconds // 3600
        m = (seconds % 3600) // 60
        return f"{h:02d}:{m:02d}"

    @staticmethod
    def minutes_to_hhmm(minutes: int) -> str:
        """Convert raw minutes (no overnight offset) to 'HH:MM', wrapping at midnight."""
        minutes = minutes % 1440
        h = minutes // 60
        m = minutes % 60
        return f"{h:02d}:{m:02d}"
