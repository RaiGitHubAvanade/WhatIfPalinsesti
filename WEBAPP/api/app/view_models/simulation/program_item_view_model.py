from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ProgramItemViewModel:
    id: str
    title: str
    genre: str | None
    time: str | None
    end: str | None
    dur: int | None
    ch: str
    share: float | None
    eta: str | None
    sesso: str | None
    tipo: str | None
    slot: str | None


@dataclass
class ProgramListViewModel:
    programs: list[ProgramItemViewModel] = field(default_factory=list)
    total: int = 0
