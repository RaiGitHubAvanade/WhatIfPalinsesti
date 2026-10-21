from __future__ import annotations

import logging
from datetime import date

from app.config import Config
from app.models.simulation_context_occurrence import SimulationContextOccurrence
from app.models.simulation_context_reference import SimulationContextReference
from app.models.simulation_context_slot import SimulationContextSlot
from app.services.databricks_service_scenarios import DatabricksServiceScenarios
from app.view_models.scenarios import (
    SimulationContextElementViewModel,
    SimulationContextViewModel,
    SimulationOccurrenceViewModel,
)

LABEL_SELECTED = "Programma selezionato"
LABEL_PREV = "Programma precedente"
LABEL_NEXT = "Programma successivo"
LABEL_COMPETITOR = "Programma competitor individuato"
LABEL_REPLACED = "Programma sostituito"
LABEL_IMPACTED = "Programmi coinvolti nello spostamento"
LABEL_IMPACTED_CHILD = "Programma coinvolto nello spostamento"

ROLE_SELECTED = "Selezionato"
ROLE_PREV = "Precedente"
ROLE_NEXT = "Successivo"
ROLE_COMPETITOR = "Competitor"
ROLE_REPLACED = "Sostituito"
ROLE_IMPACTED = "Coinvolto"


def _to_percent(value) -> float | None:
    return None if value is None else round(float(value) * 100, 2)


def _hhmm_to_hour_round(hhmm: str | int | float | None) -> int | None:
    if hhmm is None:
        return None

    if isinstance(hhmm, (int, float)):
        return int(round(float(hhmm)))

    text = str(hhmm).strip()
    if not text:
        return None
    if ":" not in text:
        return int(round(float(text)))
    if len(text) < 5:
        return None

    hour = int(text[:2])
    minute = int(text[3:5])
    return int(round((hour * 60 + minute) / 60.0))


def _weekday_or_weekend(day: date | None) -> str | None:
    if day is None:
        return None
    return "Weekday" if day.weekday() < 5 else "Weekend"


def _subtract_months(base_date: date, months: int) -> date:
    month_index = base_date.month - 1 - months
    year = base_date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(
        base_date.day,
        [31, 29 if (year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1],
    )
    return date(year, month, day)


class BusinessLogicSimulationContext:
    def __init__(self, service: DatabricksServiceScenarios) -> None:
        self._service = service
        self._logger = logging.getLogger(__name__)

    def get_simulation_context(self, simulation_type: str, simulation_id: str) -> SimulationContextViewModel:
        if simulation_type == "sostituzione":
            elements, occurrence_map = self._load_sostituzione(simulation_id)
        elif simulation_type == "spostamento":
            elements, occurrence_map = self._load_spostamento(simulation_id)
        else:
            raise ValueError(f"Tipo simulazione non supportato: {simulation_type}")

        occurrence_rows: list[SimulationOccurrenceViewModel] = []
        occurrence_counts: dict[str, int | None] = {}

        flat_refs: list[SimulationContextReference] = []
        for element in elements:
            if element.is_group:
                flat_refs.extend(element.children)
            else:
                flat_refs.append(element)

        for ref in flat_refs:
            rows = occurrence_map.get(ref.key)
            if rows is None:
                occurrence_counts[ref.key] = None
                continue
            occurrence_counts[ref.key] = len(rows)
            for row in rows:
                occurrence_rows.append(SimulationOccurrenceViewModel.map_from_occurrence(row, ref))

        view_elements = [
            SimulationContextElementViewModel.map_from_reference(
                ref,
                occurrences_count=occurrence_counts.get(ref.key),
                child_occurrences_count_by_key=occurrence_counts,
            )
            for ref in elements
        ]

        return SimulationContextViewModel(
            simulation_id=simulation_id,
            simulation_type=simulation_type,
            elements=view_elements,
            occurrences=occurrence_rows,
        )

    def _load_sostituzione(
        self,
        simulation_id: str,
    ) -> tuple[list[SimulationContextReference], dict[str, list[SimulationContextOccurrence] | None]]:
        try:
            source = self._service.get_simulation_context_source_sostituzione(simulation_id)
            if source is None:
                raise LookupError("Simulazione non trovata")

            replaced_slot = self._service.get_context_slot_by_program_id("replaced", source.program_id)
            if replaced_slot is None:
                raise LookupError("Dati di contesto non disponibili per il programma sostituito")
        except LookupError:
            raise
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del contesto della simulazione: {e}") from e

        selected = SimulationContextReference(
            key="selected",
            label=LABEL_SELECTED,
            role=ROLE_SELECTED,
            program_name=source.new_program_name,
            channel=None,
            share_storico=round(float(source.new_program_share_storico), 2) if source.new_program_share_storico is not None else None,
        )
        replaced = self._slot_to_reference("replaced", LABEL_REPLACED, ROLE_REPLACED, replaced_slot)

        prev = SimulationContextReference(
            key="prev",
            label=LABEL_PREV,
            role=ROLE_PREV,
            program_name=replaced_slot.programma_prev,
            channel=replaced_slot.canale,
            share_storico=_to_percent(replaced_slot.storico_share_prev),
            data_rif=replaced_slot.data,
            tipo_giorno=replaced_slot.tipo_giorno or _weekday_or_weekend(replaced_slot.data),
        )
        next_ref = SimulationContextReference(
            key="next",
            label=LABEL_NEXT,
            role=ROLE_NEXT,
            program_name=replaced_slot.programma_next,
            channel=replaced_slot.canale,
            share_storico=_to_percent(replaced_slot.storico_share_next),
            data_rif=replaced_slot.data,
            tipo_giorno=replaced_slot.tipo_giorno or _weekday_or_weekend(replaced_slot.data),
        )
        competitor = SimulationContextReference(
            key="competitor",
            label=LABEL_COMPETITOR,
            role=ROLE_COMPETITOR,
            program_name=replaced_slot.programma_competitor,
            channel=replaced_slot.canale_competitor,
            share_storico=_to_percent(replaced_slot.storico_share_competitor),
            data_rif=replaced_slot.data,
            tipo_giorno=replaced_slot.tipo_giorno or _weekday_or_weekend(replaced_slot.data),
        )

        try:
            anchors = self._service.get_prev_next_program_anchors(
                data_rif=replaced_slot.data,
                canale=replaced_slot.canale or "",
                program_prev=replaced_slot.programma_prev,
                program_next=replaced_slot.programma_next,
                orario_inizio=replaced_slot.orario_inizio or "00:00",
                orario_fine=replaced_slot.orario_fine or replaced_slot.orario_inizio or "00:00",
            )
            by_role = {anchor.ruolo: anchor for anchor in anchors}

            prev_anchor = by_role.get("prev")
            if prev_anchor is not None:
                prev.programma_norm = prev_anchor.programma_norm
                prev.ora_rif = _hhmm_to_hour_round(prev_anchor.orario_inizio)

            next_anchor = by_role.get("next")
            if next_anchor is not None:
                next_ref.programma_norm = next_anchor.programma_norm
                next_ref.ora_rif = _hhmm_to_hour_round(next_anchor.orario_inizio)

            competitor_anchor = self._service.get_competitor_anchor(
                programma_competitor=replaced_slot.programma_competitor,
                canale_competitor=replaced_slot.canale_competitor,
                data_rif=replaced_slot.data,
                orario_inizio_rif=replaced_slot.orario_inizio or "00:00",
            )
            if competitor_anchor is not None:
                competitor.programma_norm = competitor_anchor.programma_norm
                competitor.ora_rif = _hhmm_to_hour_round(competitor_anchor.orario_inizio)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del contesto della simulazione: {e}") from e

        occurrences_map: dict[str, list[SimulationContextOccurrence] | None] = {
            "selected": None,
            "prev": None,
            "next": None,
            "competitor": None,
            "replaced": None,
        }
        try:
            if source.new_program_name:
                selected_rows = self._service.get_occurrences_new_program_name(
                    programma=source.new_program_name,
                    time_tolerance=Config.OCCURRENCES_TIME_TOLERANCE_HOURS,
                    cutoff_days=Config.OCCURRENCES_CUTOFF_DAYS,
                    cutoff_num_occurrences=Config.OCCURRENCES_MAX_PER_PROGRAM,
                )
                occurrences_map["selected"] = selected_rows
                if selected_rows:
                    selected.channel = selected_rows[0].canale

            start_date = self._build_occurrences_start_date()
            for ref in (prev, next_ref, competitor, replaced):
                if ref.is_queryable():
                    occurrences_map[ref.key] = self._service.get_occurrences_normal(
                        role=self._normal_query_role(ref.key),
                        programma_norm=ref.programma_norm or "",
                        canale=ref.channel or "",
                        data_rif=ref.data_rif,
                        ora_rif=ref.ora_rif or 0,
                        tipo_giorno=ref.tipo_giorno or "",
                        start_date=start_date,
                        time_tolerance=Config.OCCURRENCES_TIME_TOLERANCE_HOURS,
                        cutoff_days=Config.OCCURRENCES_CUTOFF_DAYS,
                        cutoff_num_occurrences=Config.OCCURRENCES_MAX_PER_PROGRAM,
                    )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero delle occorrenze storiche: {e}") from e

        return [selected, prev, next_ref, competitor, replaced], occurrences_map

    def _load_spostamento(
        self,
        simulation_id: str,
    ) -> tuple[list[SimulationContextReference], dict[str, list[SimulationContextOccurrence] | None]]:
        try:
            source = self._service.get_simulation_context_source_spostamento(simulation_id)
            if source is None:
                raise LookupError("Simulazione non trovata")

            selected_slot = self._service.get_context_slot_by_program_id("selected", source.program_id)
            if selected_slot is None:
                raise LookupError("Dati di contesto non disponibili per il programma spostato")

            previous_slot = (
                self._service.get_context_slot_by_program_id("prev", source.previous_program)
                if source.previous_program else None
            )
            next_slot = (
                self._service.get_context_slot_by_program_id("next", source.next_program)
                if source.next_program else None
            )
            impacted_slots = self._service.get_context_slots_by_program_ids("impacted", source.impacted_programs)
        except LookupError:
            raise
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del contesto della simulazione: {e}") from e

        selected = self._slot_to_reference("selected", LABEL_SELECTED, ROLE_SELECTED, selected_slot)

        prev = self._slot_to_reference("prev", LABEL_PREV, ROLE_PREV, previous_slot) if previous_slot else SimulationContextReference(
            key="prev",
            label=LABEL_PREV,
            role=ROLE_PREV,
            program_name=None,
            channel=None,
            share_storico=None,
        )
        next_ref = self._slot_to_reference("next", LABEL_NEXT, ROLE_NEXT, next_slot) if next_slot else SimulationContextReference(
            key="next",
            label=LABEL_NEXT,
            role=ROLE_NEXT,
            program_name=None,
            channel=None,
            share_storico=None,
        )

        competitor = SimulationContextReference(
            key="competitor",
            label=LABEL_COMPETITOR,
            role=ROLE_COMPETITOR,
            program_name=selected_slot.programma_competitor,
            channel=selected_slot.canale_competitor,
            share_storico=_to_percent(selected_slot.storico_share_competitor),
            data_rif=selected_slot.data,
            tipo_giorno=selected_slot.tipo_giorno or _weekday_or_weekend(selected_slot.data),
        )
        try:
            competitor_anchor = self._service.get_competitor_anchor(
                programma_competitor=selected_slot.programma_competitor,
                canale_competitor=selected_slot.canale_competitor,
                data_rif=selected_slot.data,
                orario_inizio_rif=selected_slot.orario_inizio or "00:00",
            )
            if competitor_anchor is not None:
                competitor.programma_norm = competitor_anchor.programma_norm
                competitor.ora_rif = _hhmm_to_hour_round(competitor_anchor.orario_inizio)
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero del contesto della simulazione: {e}") from e

        children: list[SimulationContextReference] = []
        for index, slot in enumerate(impacted_slots):
            children.append(
                self._slot_to_reference(
                    f"impacted_{index}",
                    LABEL_IMPACTED_CHILD,
                    ROLE_IMPACTED,
                    slot,
                ),
            )
        impacted_share_values = [child.share_storico for child in children if child.share_storico is not None]
        impacted = SimulationContextReference(
            key="impacted",
            label=LABEL_IMPACTED,
            role=ROLE_IMPACTED,
            program_name=f"{len(children)} {'programma' if len(children) == 1 else 'programmi'}",
            channel=selected.channel,
            share_storico=round(sum(impacted_share_values) / len(impacted_share_values), 2) if impacted_share_values else None,
            children=children,
            is_group=True,
        )

        occurrences_map: dict[str, list[SimulationContextOccurrence] | None] = {
            "selected": None,
            "prev": None,
            "next": None,
            "competitor": None,
        }
        for child in children:
            occurrences_map[child.key] = None

        try:
            start_date = self._build_occurrences_start_date()
            for ref in [selected, prev, next_ref, competitor, *children]:
                if ref.is_queryable():
                    occurrences_map[ref.key] = self._service.get_occurrences_normal(
                        role=self._normal_query_role(ref.key),
                        programma_norm=ref.programma_norm or "",
                        canale=ref.channel or "",
                        data_rif=ref.data_rif,
                        ora_rif=ref.ora_rif or 0,
                        tipo_giorno=ref.tipo_giorno or "",
                        start_date=start_date,
                        time_tolerance=Config.OCCURRENCES_TIME_TOLERANCE_HOURS,
                        cutoff_days=Config.OCCURRENCES_CUTOFF_DAYS,
                        cutoff_num_occurrences=Config.OCCURRENCES_MAX_PER_PROGRAM,
                    )
        except Exception as e:
            raise RuntimeError(f"Errore nel recupero delle occorrenze storiche: {e}") from e

        return [selected, prev, next_ref, competitor, impacted], occurrences_map

    @staticmethod
    def _normal_query_role(key: str) -> str:
        if key.startswith("impacted"):
            return "impacted"
        return key

    @staticmethod
    def _slot_to_reference(key: str, label: str, role: str, slot: SimulationContextSlot) -> SimulationContextReference:
        return SimulationContextReference(
            key=key,
            label=label,
            role=role,
            program_name=slot.programma,
            channel=slot.canale,
            share_storico=_to_percent(slot.storico_share),
            programma_norm=slot.programma_norm,
            data_rif=slot.data,
            tipo_giorno=slot.tipo_giorno or _weekday_or_weekend(slot.data),
            ora_rif=_hhmm_to_hour_round(slot.orario_inizio),
            from_time=slot.orario_inizio,
            to_time=slot.orario_fine,
        )

    @staticmethod
    def _build_occurrences_start_date() -> date:
        months = abs(Config.OCCURRENCES_HISTORY_MONTHS)
        return _subtract_months(date.today(), months)
