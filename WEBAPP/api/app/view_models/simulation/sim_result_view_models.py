from __future__ import annotations

from dataclasses import dataclass


@dataclass
class SimResultSostViewModel:
    """Result of a sostituzione simulation."""
    mode: str  # 'sostituzione'
    orig_title: str
    orig_share: float | None
    orig_ch: str
    orig_time: str | None
    orig_end: str | None
    cand_title: str
    cand_share: float | None
    predicted_share: float | None
    delta: float | None


@dataclass
class SimResultSpostaViewModel:
    """Result of a spostamento simulation."""
    mode: str  # 'spostamento'
    prog_title: str
    orig_ch: str
    orig_date: str
    orig_time: str | None
    orig_end: str | None
    orig_slot_share: float | None
    dest_ch: str | None
    dest_date: str | None
    dest_time: str | None
    dest_slot_share: float | None
    delta: float | None
