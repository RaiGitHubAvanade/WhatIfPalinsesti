import logging
from datetime import date, timedelta

from app.services.databricks_service_weekly_programming import DatabricksServiceWeeklyProgramming
from app.view_models.weekly_programming import WeeklyTableViewModel, CompetitorProgramsViewModel, RaiProgramViewModel
from app.utils.date_time_utils import DateTimeUtils
from app.config import Config
from app.utils.number_utils import NumberUtils


class BusinessLogicWeeklyProgramming:
    def __init__(self, databricks_service: DatabricksServiceWeeklyProgramming) -> None:
        self._databricks_service = databricks_service
        self._logger = logging.getLogger(__name__)


    def _in_prime_window(self, orario_inizio: str | None, orario_fine: str | None) -> bool:
        if not orario_inizio or not orario_fine:
            return False
        start = DateTimeUtils.hhmm_to_minutes(orario_inizio.strip()[:5])
        end = DateTimeUtils.hhmm_to_minutes(orario_fine.strip()[:5])
        window_start = DateTimeUtils.hhmm_to_minutes(Config.WEEK_TABLE_START)
        window_end = DateTimeUtils.hhmm_to_minutes(Config.WEEK_TABLE_END)
        return (
            (window_start <= start <= window_end)
            or end > window_start + Config.WEEK_TABLE_START_OFFSET_MINUTES
        ) and (
            (window_start <= end <= window_end)
            or start < window_end - Config.WEEK_TABLE_END_OFFSET_MINUTES
        )


    def get_weekly_table(self, channel: str, day: date) -> WeeklyTableViewModel:
        from_day = day - timedelta(days=day.weekday())
        to_day = from_day + timedelta(days=6)

        today = date.today()
        all_rows = []
        try:
            if DateTimeUtils.is_past_week(day):
                all_rows = self._databricks_service.get_palinsesto_delta(channel, from_day, to_day)
            elif DateTimeUtils.is_current_week(day):
                all_rows = self._databricks_service.get_palinsesto_current_week(channel, from_day, to_day, today)
            else:
                all_rows = self._databricks_service.get_palinsesto_predict(channel, from_day, to_day)
        except Exception as e:
            raise RuntimeError(
                f"Errore durante il recupero dei dati Databricks per il canale '{channel}' nella settimana del {from_day.strftime('%d/%m/%Y')}: {e}"
            ) from e

        filtered = [
            RaiProgramViewModel.from_rai_program(row)
            for row in all_rows
            if self._in_prime_window(row.orario_inizio, row.orario_fine)
        ]

        return WeeklyTableViewModel(
            week=f"{from_day.strftime('%d/%m/%Y')} – {to_day.strftime('%d/%m/%Y')}",
            channel=channel,
            rows=filtered,
        )


    def get_competitor_programs(
        self,
        channel: str,
        day: date,
        from_time: str,
        to_time: str,
        program_name: str,
    ) -> CompetitorProgramsViewModel:        
        channel_order = [c for c in Config.CHANNEL_ORDER if c != channel]
        
        all_rows = []
        try:
            all_rows = self._databricks_service.get_vw_output_palinsesto_futuro(channel_order, day, from_time, to_time)
        except Exception as e:
            raise RuntimeError(
                f"Errore durante il recupero dei programmi concorrenti per il canale '{channel}' "
                f"in data {day.isoformat()}: {e}"
            ) from e

        # Sorting rows by canale and orario_inizio
        def _sort_key(row) -> tuple:
            canale = row.Canale
            try:
                priority = (0, channel_order.index(canale))
            except ValueError:
                priority = (1, canale)
            return (*priority, DateTimeUtils.hhmm_to_minutes(row.orario_inizio))
        all_rows.sort(key=_sort_key)

        return CompetitorProgramsViewModel.MapFromOtherChannels(
            channel=channel,
            day=day.isoformat(),
            from_time=from_time,
            to_time=to_time,
            program_name=program_name,
            rows=all_rows,
        )


    def edit_manual_share_batch(self, changes: dict[str, float | None]) -> None:
        if not changes:
            raise ValueError("Nessuna modifica da salvare")
        try:
            for row_id, value in changes.items():
                db_value = NumberUtils.percent_to_float(value)
                self._databricks_service.edit_manual_share_predict(row_id, db_value)
        except Exception as e:
            raise RuntimeError(
                f"Errore durante l'aggiornamento batch del palinsesto: {e}"
            ) from e

