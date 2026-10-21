from __future__ import annotations

from dataclasses import dataclass, field

from app.models.simulation_context_occurrence import SimulationContextOccurrence
from app.models.simulation_context_reference import SimulationContextReference
from app.utils.date_time_utils import DateTimeUtils

_DAY_NAMES = ("Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica")


def _to_percent(value) -> float | None:
    return None if value is None else round(float(value) * 100, 2)


def _round_or_none(value, digits: int = 2) -> float | None:
    return None if value is None else round(float(value), digits)


def _duration_minutes(start_seconds, end_seconds) -> int | None:
    if start_seconds is None or end_seconds is None:
        return None
    seconds = int(end_seconds) - int(start_seconds)
    if seconds < 0:
        seconds += 86400
    return int(round(seconds / 60))


@dataclass
class SimulationContextElementViewModel:
    key: str
    label: str
    program_name: str | None
    channel: str | None
    share_storico: float | None          # percentage, e.g. 11.3
    occurrences_count: int | None        # None = not applicable / program not resolvable
    from_time: str | None = None
    to_time: str | None = None
    children: list[SimulationContextElementViewModel] = field(default_factory=list)

    @classmethod
    def map_from_reference(
        cls,
        ref: SimulationContextReference,
        occurrences_count: int | None,
        child_occurrences_count_by_key: dict[str, int | None] | None = None,
    ) -> "SimulationContextElementViewModel":
        child_occurrences_count_by_key = child_occurrences_count_by_key or {}
        return cls(
            key=ref.key,
            label=ref.label,
            program_name=ref.program_name,
            channel=ref.channel,
            share_storico=ref.share_storico,
            occurrences_count=occurrences_count,
            from_time=ref.from_time,
            to_time=ref.to_time,
            children=[
                cls.map_from_reference(
                    child,
                    occurrences_count=child_occurrences_count_by_key.get(child.key),
                    child_occurrences_count_by_key=child_occurrences_count_by_key,
                )
                for child in ref.children
            ],
        )


@dataclass
class SimulationOccurrenceViewModel:
    element_key: str
    element_label: str
    role: str                            # short label: Selezionato, Precedente, Successivo, ...
    scenario_program: str | None
    historical_program: str | None
    broadcast_type: str | None           # storico_programmi.Tipo_Trasmissione
    direction_genre: str | None
    channel: str | None
    date: str | None
    day_type: str | None                 # Weekday / Weekend (filter used for the lookup)
    day_name: str | None                 # Lunedì ... Domenica
    from_time: str | None
    to_time: str | None
    duration_minutes: int | None
    share: float | None                  # percentage, e.g. 11.3
    amr: float | None                    # thousands (000)
    platea: float | None                 # thousands (000)
    share_men: float | None              # percentage of the program audience, e.g. 54.6
    share_women: float | None            # percentage of the program audience, e.g. 45.4
    amr_men: float | None                # thousands (000)
    amr_women: float | None              # thousands (000)

    @classmethod
    def map_from_occurrence(
        cls,
        occurrence: SimulationContextOccurrence,
        ref: SimulationContextReference,
    ) -> "SimulationOccurrenceViewModel":
        occurrence_date = occurrence.data
        return cls(
            element_key=ref.key,
            element_label=ref.label,
            role=ref.role,
            scenario_program=ref.program_name,
            historical_program=occurrence.programma,
            broadcast_type=occurrence.tipo_trasmissione,
            direction_genre=occurrence.direzione_di_genere,
            channel=occurrence.canale,
            date=occurrence_date.isoformat() if occurrence_date is not None else None,
            day_type=occurrence.tipo_giorno,
            day_name=_DAY_NAMES[occurrence_date.weekday()] if occurrence_date is not None else None,
            from_time=DateTimeUtils.seconds_to_hhmm(int(occurrence.ora_inizio_trx))
            if occurrence.ora_inizio_trx is not None else None,
            to_time=DateTimeUtils.seconds_to_hhmm(int(occurrence.ora_fine_trx))
            if occurrence.ora_fine_trx is not None else None,
            duration_minutes=_duration_minutes(occurrence.ora_inizio_trx, occurrence.ora_fine_trx),
            share=_to_percent(occurrence.share),
            amr=_round_or_none(occurrence.amr),
            platea=_round_or_none(occurrence.platea),
            share_men=_round_or_none(occurrence.share_uomini_pct),
            share_women=_round_or_none(occurrence.share_donne_pct),
            amr_men=_round_or_none(occurrence.amr_uomini),
            amr_women=_round_or_none(occurrence.amr_donne),
        )


@dataclass
class SimulationContextViewModel:
    simulation_id: str
    simulation_type: str
    elements: list[SimulationContextElementViewModel] = field(default_factory=list)
    occurrences: list[SimulationOccurrenceViewModel] = field(default_factory=list)
