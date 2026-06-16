from dataclasses import dataclass
from app.models.other_channel import OtherChannel


@dataclass
class OtherProgramViewModel:
    program_name: str | None
    from_time: str
    to_time: str

    @classmethod
    def MapOtherProgramViewModelFromOtherChannel(cls, row: OtherChannel) -> "OtherProgramViewModel":
        return cls(
            program_name=row.programma,
            from_time=row.orario_inizio,
            to_time=row.orario_fine,
        )
