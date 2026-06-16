"""SQL helper utilities shared across service classes."""


class SqlHelper:
    @staticmethod
    def to_minutes_sql(col: str) -> str:
        """Return a Spark SQL expression converting an 'HH:mm' column to minutes since midnight.
        Times before 06:00 are shifted +1440 to preserve next-day ordering (mirrors DateTimeUtils.to_minutes)."""
        return (
            f"CASE WHEN INT(split({col}, ':')[0]) < 6"
            f" THEN INT(split({col}, ':')[0]) * 60 + INT(split({col}, ':')[1]) + 1440"
            f" ELSE INT(split({col}, ':')[0]) * 60 + INT(split({col}, ':')[1])"
            f" END"
        )

    @staticmethod
    def overlap_where_clause() -> str:
        """SQL AND fragment checking orario_inizio/orario_fine overlap against a [from, to] window.

        Expects two positional parameters in order:
          %s → to_minutes(to_time)   (orario_inizio must be strictly less)
          %s → to_minutes(from_time) (orario_fine must be strictly greater)
        """
        inizio = SqlHelper.to_minutes_sql("orario_inizio")
        fine = SqlHelper.to_minutes_sql("orario_fine")
        return f"""
            AND ({inizio}) < %s
            AND ({fine}) > %s
        """
