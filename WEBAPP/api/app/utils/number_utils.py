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

    @staticmethod
    def round_share(value: float | None) -> float | None:
        """Round a share percentage to 2 decimal places (e.g. 8.413568 → 8.41)."""
        if value is None:
            return None
        return round(value, 2)

    @staticmethod
    def format_age(age: str | None) -> str | None:
        """Convert DB age codes to display labels: '75_plus' → '75+', '45_54' → '45-54'."""
        if not age:
            return None
        if '_plus' in age:
            return age.replace('_plus', '+')
        return age.replace('_', '-')
