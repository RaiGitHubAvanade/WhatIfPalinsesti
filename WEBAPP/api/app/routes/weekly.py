from flask import Blueprint, request
from dataclasses import asdict
from app.models.api_response import success, error
from app.services.databricks_service_mock import get_table_rows, get_competitor_programs, edit_manual_share as mock_edit_manual_share
from app.container import get_databricks_service
from app.logics.weekly_logic import WeeklyLogic
from app.utils.date_time_utils import DateTimeUtils
from datetime import date

bp = Blueprint("weekly", __name__)



@bp.route("/weekly/getWeeklyTableDatabricks")
def get_weekly_table_databricks():
    channel = request.args.get("channel")
    day_str = request.args.get("day")

    if not channel or not day_str:
        return error(
            message="I parametri 'channel' e 'day' sono obbligatori",
            errors=["channel and day required"],
        ), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    if DateTimeUtils.is_past_current_week_sunday(day):
        return error(
            message="Non è possibile selezionare una data successiva alla domenica della settimana corrente",
            errors=["day exceeds current week"],
        ), 400

    logic = WeeklyLogic(get_databricks_service())
    try:
        result = logic.get_weekly_table_databricks(channel, day)
    except RuntimeError as e:
        return error(message=str(e), errors=["databricks_error"]), 502

    return success(data=asdict(result), message="Tabella settimanale databricks ottenuta con successo")


#To be dismissed. The endpoint above will be used instead, fetching data from databricks.
@bp.route("/weekly/getWeeklyTable")
def get_weekly_table():
    channel = request.args.get("channel")
    day = request.args.get("day")

    if not channel or not day:
        return error(
            message="I parametri 'channel' e 'day' sono obbligatori",
            errors=["channel and day required"],
        ), 400

    try:
        day_date = date.fromisoformat(day)
    except ValueError:
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    if DateTimeUtils.is_past_current_week_sunday(day_date):
        return error(
            message="Non è possibile selezionare una data successiva alla domenica della settimana corrente",
            errors=["day exceeds current week"],
        ), 400

    result = get_table_rows(channel, day)
    if result is None:
        return error(
            message="Formato data non valido",
            errors=["invalid day format"],
        ), 400

    return success(data=asdict(result), message="Tabella settimanale ottenuta con successo")


@bp.route("/weekly/getCompetitorProgramsDatabricks")
def get_competitor_programs_databricks():
    channel = request.args.get("channel")
    day_str = request.args.get("day")
    from_time = request.args.get("from_time")
    to_time = request.args.get("to_time")
    program_name = request.args.get("program_name", "")

    if not channel or not day_str or not from_time or not to_time:
        return error(
            message="I parametri 'channel', 'day', 'from_time' e 'to_time' sono obbligatori",
            errors=["channel, day, from_time and to_time required"],
        ), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    logic = WeeklyLogic(get_databricks_service())
    try:
        result = logic.get_competitor_programs_databricks(channel, day, from_time, to_time, program_name)
    except RuntimeError as e:
        return error(message=str(e), errors=["databricks_error"]), 502

    return success(data=asdict(result), message="Programmi concorrenti Databricks ottenuti con successo")


#To be dismissed. The endpoint above will be used instead, fetching data from databricks.
@bp.route("/weekly/getCompetitorPrograms")
def get_competitor_programs_route():
    channel = request.args.get("channel")
    day = request.args.get("day")
    from_time = request.args.get("from_time")
    to_time = request.args.get("to_time")
    program_name = request.args.get("program_name", "")

    if not channel or not day or not from_time or not to_time:
        return error(
            message="I parametri 'channel', 'day', 'from_time' e 'to_time' sono obbligatori",
            errors=["channel, day, from_time and to_time required"],
        ), 400

    result = get_competitor_programs(channel, day, from_time, to_time, program_name)
    if result is None:
        return error(
            message="Formato data non valido",
            errors=["invalid day format"],
        ), 400

    return success(data=result, message="Programmi concorrenti ottenuti con successo")


def _parse_edit_manual_share_body():
    """Parse and validate the JSON body shared by both editManualShare endpoints.
    Returns (channel, program_name, from_time, to_time, day, value) or raises.
    """
    body = request.get_json(silent=True) or {}
    channel = body.get("channel")
    program_name = body.get("program_name")
    from_time = body.get("from_time")
    to_time = body.get("to_time")
    day_str = body.get("day")
    value = body.get("value")  # float | None (null clears the field)
    return channel, program_name, from_time, to_time, day_str, value


def _validate_edit_manual_share(channel, program_name, from_time, to_time, day_str, value):
    """Validate fields; returns (day: date, value: float|None) or an error response tuple."""
    if not channel or not program_name or not from_time or not to_time or not day_str:
        return None, None, (error(
            message="I parametri 'channel', 'program_name', 'from_time', 'to_time' e 'day' sono obbligatori",
            errors=["missing required fields"],
        ), 400)

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        return None, None, (error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400)

    if DateTimeUtils.is_past_current_week_sunday(day):
        return None, None, (error(
            message="Non è possibile selezionare una data successiva alla domenica della settimana corrente",
            errors=["day exceeds current week"],
        ), 400)

    if value is not None:
        try:
            value = float(value)
        except (TypeError, ValueError):
            return None, None, (error(
                message="Il valore deve essere un numero o null",
                errors=["invalid value"],
            ), 400)

    return day, value, None


@bp.route("/weekly/editManualShareDatabricks", methods=["POST"])
def edit_manual_share_databricks():
    channel, program_name, from_time, to_time, day_str, value = _parse_edit_manual_share_body()
    day, value, err = _validate_edit_manual_share(channel, program_name, from_time, to_time, day_str, value)
    if err:
        return err

    if not DateTimeUtils.is_current_week(day):
        raise ValueError(
            "Non è possibile modificare il palinsesto di settimane passate"
        )
    logic = WeeklyLogic(get_databricks_service())
    try:
        logic.edit_manual_share_databricks(channel, program_name, from_time, to_time, day, value)
    except ValueError as e:
        return error(message=str(e), errors=["validation_error"]), 400
    except RuntimeError as e:
        return error(message=str(e), errors=["databricks_error"]), 502

    return success(data=None, message="Share manuale aggiornato con successo")


@bp.route("/weekly/editManualShare", methods=["POST"])
def edit_manual_share():
    channel, program_name, from_time, to_time, day_str, value = _parse_edit_manual_share_body()
    day, value, err = _validate_edit_manual_share(channel, program_name, from_time, to_time, day_str, value)
    if err:
        return err

    if not DateTimeUtils.is_current_week(day):
        return error(
            message="Non è possibile modificare il palinsesto di settimane passate",
            errors=["validation_error"],
        ), 400

    mock_edit_manual_share(channel, program_name, from_time, to_time, day, value)

    return success(data=None, message="Share manuale aggiornato con successo")
