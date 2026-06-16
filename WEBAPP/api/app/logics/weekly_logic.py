"""Business logic for the weekly programming feature."""

from datetime import date, timedelta

from app.services.databricks_service import DatabricksService
from app.view_models.weekly_table_view_model import WeeklyTableViewModel
from app.view_models.competitor_programs_view_model import CompetitorProgramsViewModel
from app.view_models.palinsesto_view_model import PalinsestoViewModel
from app.utils.date_time_utils import DateTimeUtils
from app.config import Config


class WeeklyLogic:
    def __init__(self, databricks_service: DatabricksService) -> None:
        self._databricks_service = databricks_service

    def _in_prime_window(self, orario_inizio: str | None, orario_fine: str | None) -> bool:
        """Return True when the program falls within the configured prime-time window."""
        if not orario_inizio or not orario_fine:
            return False
        start = DateTimeUtils.to_minutes(orario_inizio.strip()[:5])
        end = DateTimeUtils.to_minutes(orario_fine.strip()[:5])
        window_start = DateTimeUtils.to_minutes(Config.WEEK_TABLE_START)
        window_end = DateTimeUtils.to_minutes(Config.WEEK_TABLE_END)
        return (
            (window_start <= start <= window_end)
            or end > window_start + Config.WEEK_TABLE_START_OFFSET_MINUTES
        ) and (
            (window_start <= end <= window_end)
            or start < window_end - Config.WEEK_TABLE_END_OFFSET_MINUTES
        )

    def get_weekly_table_databricks(self, channel: str, day: date) -> WeeklyTableViewModel:
        """Return a WeeklyTableViewModel for the given channel and day.

        Source selection:
          - day is before the current week's Monday → use _delta table (historical)
          - day is on the current week or a future week  → use _predict table
        """
        from_day = day - timedelta(days=day.weekday())
        to_day = from_day + timedelta(days=6)

        all_rows = []
        try:
            if DateTimeUtils.is_current_week(day):
                all_rows = self._databricks_service.get_palinsesto_predict(channel, from_day, to_day)
            else:
                all_rows = self._databricks_service.get_palinsesto_delta(channel, from_day, to_day)
        except Exception as e:
            raise RuntimeError(
                f"Errore durante il recupero dei dati Databricks per il canale '{channel}' nella settimana del {from_day.strftime('%d/%m/%Y')}: {e}"
            ) from e

        filtered = [
            PalinsestoViewModel.MapPalinsestoViewModelFromPalinsesto(row)
            for row in all_rows
            if self._in_prime_window(row.orario_inizio, row.orario_fine)
        ]

        return WeeklyTableViewModel(
            week=f"{from_day.strftime('%d/%m/%Y')} – {to_day.strftime('%d/%m/%Y')}",
            channel=channel,
            rows=filtered,
        )

    def get_competitor_programs_databricks(
        self,
        channel: str,
        day: date,
        from_time: str,
        to_time: str,
        program_name: str,
    ) -> CompetitorProgramsViewModel:
        """Return a CompetitorProgramsViewModel with all channels overlapping [from_time, to_time]."""
        
        all_rows = []
        try:
            if not DateTimeUtils.is_current_week(day):
                all_rows = self._databricks_service.get_vw_output_palinsesto_futuro(channel, day, from_time, to_time)
            else:
                all_rows = self._databricks_service.get_storico_programmi(channel, day, from_time, to_time)
        except Exception as e:
            raise RuntimeError(
                f"Errore durante il recupero dei programmi concorrenti per il canale '{channel}' "
                f"in data {day.isoformat()}: {e}"
            ) from e

        # Sorting rows by canale and orario_inizio
        _CHANNEL_ORDER = ["Rai 1", "Rai 2", "Rai 3", "Rete 4", "Canale 5", "Italia 1", "La7", "Tv8", "Nove"]
        def _sort_key(row) -> tuple:
            canale = row.canale  # sorting uses the model field (OtherChannel.canale)
            try:
                priority = (0, _CHANNEL_ORDER.index(canale))
            except ValueError:
                priority = (1, canale)
            return (*priority, DateTimeUtils.to_minutes(row.orario_inizio))
        all_rows.sort(key=_sort_key)

        return CompetitorProgramsViewModel.MapFromOtherChannels(
            channel=channel,
            day=day.isoformat(),
            from_time=from_time,
            to_time=to_time,
            program_name=program_name,
            rows=all_rows,
        )

    def edit_manual_share_databricks(
        self,
        channel: str,
        program_name: str,
        from_time: str,
        to_time: str,
        day: date,
        value: float | None,
    ) -> None:
        """Persist a manual share override for a single program row via Databricks.

        Only the current week's predict table is writable; past weeks are read-only.
        """
        
        try:
            self._databricks_service.edit_manual_share_predict(
                channel, program_name, from_time, to_time, day, value
            )
        except Exception as e:
            raise RuntimeError(
                f"Errore durante l'aggiornamento del palinsesto per '{program_name}' "
                f"in data {day.isoformat()}: {e}"
            ) from e


