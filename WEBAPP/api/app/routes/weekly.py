import logging
from flask import Blueprint, request
from dataclasses import asdict
from app.models.api_response import success, error
from app.services.databricks_service_mock import get_table_rows, get_competitor_programs, edit_manual_share as mock_edit_manual_share
from app.container import get_databricks_service
from app.logics.weekly_logic import WeeklyLogic
from app.utils.date_time_utils import DateTimeUtils
from datetime import date

logger = logging.getLogger(__name__)

bp = Blueprint("weekly", __name__)



@bp.route("/weekly/getWeeklyTableDatabricks")
def get_weekly_table_databricks():
    channel = request.args.get("channel")
    day_str = request.args.get("day")
    logger.info("getWeeklyTableDatabricks called | channel=%s day=%s", channel, day_str)

    if not channel or not day_str:
        logger.warning("getWeeklyTableDatabricks: missing required params | channel=%s day=%s", channel, day_str)
        return error(
            message="I parametri 'channel' e 'day' sono obbligatori",
            errors=["channel and day required"],
        ), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        logger.warning("getWeeklyTableDatabricks: invalid date format | day=%s", day_str)
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    if DateTimeUtils.is_past_current_week_sunday(day):
        logger.warning("getWeeklyTableDatabricks: day exceeds current week | day=%s", day)
        return error(
            message="Non è possibile selezionare una data successiva alla domenica della settimana corrente",
            errors=["day exceeds current week"],
        ), 400

    try:
        logic = WeeklyLogic(get_databricks_service())
        result = logic.get_weekly_table_databricks(channel, day)
    except RuntimeError as e:
        logger.error("getWeeklyTableDatabricks: Databricks error | channel=%s day=%s error=%s", channel, day, e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception(
            "getWeeklyTableDatabricks: unexpected error | channel=%s day=%s error_type=%s error=%s",
            channel, day, type(e).__name__, e,
        )
        return error(
            message=f"Errore imprevisto ({type(e).__name__}): {e}",
            errors=["internal_error"],
        ), 500

    logger.info("getWeeklyTableDatabricks: success | channel=%s day=%s", channel, day)
    return success(data=asdict(result), message="Tabella settimanale databricks ottenuta con successo")


#To be dismissed. The endpoint above will be used instead, fetching data from databricks.
@bp.route("/weekly/getWeeklyTable")
def get_weekly_table():
    channel = request.args.get("channel")
    day = request.args.get("day")
    logger.info("getWeeklyTable (mock) called | channel=%s day=%s", channel, day)

    if not channel or not day:
        logger.warning("getWeeklyTable: missing required params | channel=%s day=%s", channel, day)
        return error(
            message="I parametri 'channel' e 'day' sono obbligatori",
            errors=["channel and day required"],
        ), 400

    try:
        day_date = date.fromisoformat(day)
    except ValueError:
        logger.warning("getWeeklyTable: invalid date format | day=%s", day)
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    if DateTimeUtils.is_past_current_week_sunday(day_date):
        logger.warning("getWeeklyTable: day exceeds current week | day=%s", day)
        return error(
            message="Non è possibile selezionare una data successiva alla domenica della settimana corrente",
            errors=["day exceeds current week"],
        ), 400

    result = get_table_rows(channel, day)
    if result is None:
        logger.warning("getWeeklyTable: no result returned | channel=%s day=%s", channel, day)
        return error(
            message="Formato data non valido",
            errors=["invalid day format"],
        ), 400

    logger.info("getWeeklyTable: success | channel=%s day=%s", channel, day)
    return success(data=asdict(result), message="Tabella settimanale ottenuta con successo")


@bp.route("/weekly/getCompetitorProgramsDatabricks")
def get_competitor_programs_databricks():
    channel = request.args.get("channel")
    day_str = request.args.get("day")
    from_time = request.args.get("from_time")
    to_time = request.args.get("to_time")
    program_name = request.args.get("program_name", "")
    logger.info("getCompetitorProgramsDatabricks called | channel=%s day=%s from=%s to=%s program=%s", channel, day_str, from_time, to_time, program_name)

    if not channel or not day_str or not from_time or not to_time:
        logger.warning("getCompetitorProgramsDatabricks: missing required params | channel=%s day=%s from=%s to=%s", channel, day_str, from_time, to_time)
        return error(
            message="I parametri 'channel', 'day', 'from_time' e 'to_time' sono obbligatori",
            errors=["channel, day, from_time and to_time required"],
        ), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        logger.warning("getCompetitorProgramsDatabricks: invalid date format | day=%s", day_str)
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    logic = WeeklyLogic(get_databricks_service())
    try:
        result = logic.get_competitor_programs_databricks(channel, day, from_time, to_time, program_name)
    except RuntimeError as e:
        logger.error("getCompetitorProgramsDatabricks: Databricks error | channel=%s day=%s error=%s", channel, day, e)
        return error(message=str(e), errors=["databricks_error"]), 502

    logger.info("getCompetitorProgramsDatabricks: success | channel=%s day=%s", channel, day)
    return success(data=asdict(result), message="Programmi concorrenti Databricks ottenuti con successo")


#To be dismissed. The endpoint above will be used instead, fetching data from databricks.
@bp.route("/weekly/getCompetitorPrograms")
def get_competitor_programs_route():
    channel = request.args.get("channel")
    day = request.args.get("day")
    from_time = request.args.get("from_time")
    to_time = request.args.get("to_time")
    program_name = request.args.get("program_name", "")
    logger.info("getCompetitorPrograms (mock) called | channel=%s day=%s from=%s to=%s program=%s", channel, day, from_time, to_time, program_name)

    if not channel or not day or not from_time or not to_time:
        logger.warning("getCompetitorPrograms: missing required params | channel=%s day=%s from=%s to=%s", channel, day, from_time, to_time)
        return error(
            message="I parametri 'channel', 'day', 'from_time' e 'to_time' sono obbligatori",
            errors=["channel, day, from_time and to_time required"],
        ), 400

    result = get_competitor_programs(channel, day, from_time, to_time, program_name)
    if result is None:
        logger.warning("getCompetitorPrograms: no result returned | channel=%s day=%s", channel, day)
        return error(
            message="Formato data non valido",
            errors=["invalid day format"],
        ), 400

    logger.info("getCompetitorPrograms: success | channel=%s day=%s", channel, day)
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
    logger.info("editManualShareDatabricks called | channel=%s program=%s day=%s from=%s to=%s value=%s", channel, program_name, day_str, from_time, to_time, value)
    day, value, err = _validate_edit_manual_share(channel, program_name, from_time, to_time, day_str, value)
    if err:
        logger.warning("editManualShareDatabricks: validation failed | channel=%s program=%s day=%s", channel, program_name, day_str)
        return err

    if not DateTimeUtils.is_current_week(day):
        logger.warning("editManualShareDatabricks: day not in current week | day=%s", day)
        raise ValueError(
            "Non è possibile modificare il palinsesto di settimane passate"
        )
    logic = WeeklyLogic(get_databricks_service())
    try:
        logic.edit_manual_share_databricks(channel, program_name, from_time, to_time, day, value)
    except ValueError as e:
        logger.warning("editManualShareDatabricks: validation error from logic | error=%s", e)
        return error(message=str(e), errors=["validation_error"]), 400
    except RuntimeError as e:
        logger.error("editManualShareDatabricks: Databricks error | channel=%s program=%s day=%s error=%s", channel, program_name, day, e)
        return error(message=str(e), errors=["databricks_error"]), 502

    logger.info("editManualShareDatabricks: success | channel=%s program=%s day=%s", channel, program_name, day)
    return success(data=None, message="Share manuale aggiornato con successo")


@bp.route("/weekly/editManualShare", methods=["POST"])
def edit_manual_share():
    channel, program_name, from_time, to_time, day_str, value = _parse_edit_manual_share_body()
    logger.info("editManualShare (mock) called | channel=%s program=%s day=%s from=%s to=%s value=%s", channel, program_name, day_str, from_time, to_time, value)
    day, value, err = _validate_edit_manual_share(channel, program_name, from_time, to_time, day_str, value)
    if err:
        logger.warning("editManualShare: validation failed | channel=%s program=%s day=%s", channel, program_name, day_str)
        return err

    if not DateTimeUtils.is_current_week(day):
        logger.warning("editManualShare: day not in current week | day=%s", day)
        return error(
            message="Non è possibile modificare il palinsesto di settimane passate",
            errors=["validation_error"],
        ), 400

    mock_edit_manual_share(channel, program_name, from_time, to_time, day, value)

    logger.info("editManualShare: success | channel=%s program=%s day=%s", channel, program_name, day)
    return success(data=None, message="Share manuale aggiornato con successo")
