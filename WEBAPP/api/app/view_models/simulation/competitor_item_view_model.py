from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class CompetitorItemViewModel:
    title: str
    ch: str
    tipo: str | None
    share: float | None
    evento: bool = False


@dataclass
class CompetitorListViewModel:
    competitors: list[CompetitorItemViewModel] = field(default_factory=list)
