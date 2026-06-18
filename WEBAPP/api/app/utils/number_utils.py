"""General-purpose number formatting utilities."""


class NumberUtils:
    @staticmethod
    def float_to_percent(value: float | None) -> float | None:
        """Convert a float fraction (e.g. 0.031) to a percentage rounded to 2 decimals (e.g. 3.17)."""
        if value is None:
            return None
        return round(value * 100, 2)

    @staticmethod
    def percent_to_float(value: float | None) -> float | None:
        """Convert a percentage (e.g. 35.57) to a float fraction (e.g. 0.3557)."""
        if value is None:
            return None
        return round(value / 100, 10)
