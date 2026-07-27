import logging
from flask import Blueprint, request
from dataclasses import asdict
from app.models.api_response import success, error
from app.container import get_databricks_service
from app.logics.business_logic_weekly_programming import BusinessLogicWeeklyProgramming
from app.utils.date_time_utils import DateTimeUtils
from app.utils.sse_broker import broker
from app.utils.lock_store import lock_store
from app.utils.request_identity import resolve_request_user_identity
from datetime import date

logger = logging.getLogger(__name__)

bp = Blueprint("weekly", __name__)



@bp.route("/weekly/getWeeklyTable")
def get_weekly_table():
    channel = request.args.get("channel")
    day_str = request.args.get("day")
    logger.info("getWeeklyTable called | channel=%s day=%s", channel, day_str)

    if not channel or not day_str:
        logger.warning("getWeeklyTable: missing required params | channel=%s day=%s", channel, day_str)
        return error(
            message="I parametri 'channel' e 'day' sono obbligatori",
            errors=["channel and day required"],
        ), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        logger.warning("getWeeklyTable: invalid date format | day=%s", day_str)
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    try:
        logic = BusinessLogicWeeklyProgramming(get_databricks_service())
        result = logic.get_weekly_table(channel, day)
    except RuntimeError as e:
        logger.error("getWeeklyTable: Databricks error | channel=%s day=%s error=%s", channel, day, e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception(
            "getWeeklyTable: unexpected error | channel=%s day=%s error_type=%s error=%s",
            channel, day, type(e).__name__, e,
        )
        return error(
            message=f"Errore imprevisto ({type(e).__name__}): {e}",
            errors=["internal_error"],
        ), 500

    logger.info("getWeeklyTable: success | channel=%s day=%s", channel, day)
    return success(data=asdict(result), message="Tabella settimanale databricks ottenuta con successo")


@bp.route("/weekly/getCompetitorPrograms")
def get_competitor_programs():
    channel = request.args.get("channel")
    day_str = request.args.get("day")
    from_time = request.args.get("from_time")
    to_time = request.args.get("to_time")
    program_name = request.args.get("program_name", "")
    logger.info("getCompetitorPrograms called | channel=%s day=%s from=%s to=%s program=%s", channel, day_str, from_time, to_time, program_name)

    if not channel or not day_str or not from_time or not to_time:
        logger.warning("getCompetitorPrograms: missing required params | channel=%s day=%s from=%s to=%s", channel, day_str, from_time, to_time)
        return error(
            message="I parametri 'channel', 'day', 'from_time' e 'to_time' sono obbligatori",
            errors=["channel, day, from_time and to_time required"],
        ), 400

    try:
        day = date.fromisoformat(day_str)
    except ValueError:
        logger.warning("getCompetitorPrograms: invalid date format | day=%s", day_str)
        return error(
            message="Formato data non valido (atteso YYYY-MM-DD)",
            errors=["invalid day format"],
        ), 400

    logic = BusinessLogicWeeklyProgramming(get_databricks_service())
    try:
        result = logic.get_competitor_programs(channel, day, from_time, to_time, program_name)
    except RuntimeError as e:
        logger.error("getCompetitorPrograms: Databricks error | channel=%s day=%s error=%s", channel, day, e)
        return error(message=str(e), errors=["databricks_error"]), 502

    logger.info("getCompetitorPrograms: success | channel=%s day=%s", channel, day)
    return success(data=asdict(result), message="Programmi concorrenti Databricks ottenuti con successo")


@bp.route("/weekly/editManualShare", methods=["POST"])
def edit_manual_share():
    body = request.get_json(silent=True) or {}
    row_id = body.get("id")
    value = body.get("value")

    if not row_id:
        return error(message="Il parametro 'id' è obbligatorio", errors=["missing required fields"]), 400

    if value is not None:
        try:
            value = float(value)
        except (TypeError, ValueError):
            return error(message="Il valore deve essere un numero o null", errors=["invalid value"]), 400

    logger.info("editManualShare called | id=%s value=%s", row_id, value)

    logic = BusinessLogicWeeklyProgramming(get_databricks_service())
    try:
        logic.edit_manual_share(row_id, value)
    except ValueError as e:
        logger.warning("editManualShare: validation error from logic | error=%s", e)
        return error(message=str(e), errors=["validation_error"]), 400
    except RuntimeError as e:
        logger.error("editManualShare: Databricks error | id=%s error=%s", row_id, e)
        return error(message=str(e), errors=["databricks_error"]), 502

    logger.info("editManualShare: success | id=%s", row_id)
    broker.broadcast("weekly_changed", {})
    return success(data=None, message="Share manuale aggiornato con successo")


@bp.route("/weekly/editManualShareBatch", methods=["POST"])
def edit_manual_share_batch():
    body = request.get_json(silent=True) or {}
    changes = body.get("changes")

    if not isinstance(changes, dict) or not changes:
        return error(
            message="Il parametro 'changes' deve essere un dizionario non vuoto",
            errors=["invalid_changes"],
        ), 400

    validated: dict[str, float | None] = {}
    for row_id, value in changes.items():
        if value is not None:
            try:
                value = float(value)
            except (TypeError, ValueError):
                return error(
                    message=f"Valore non valido per ID {row_id}",
                    errors=["invalid_value"],
                ), 400
        validated[str(row_id)] = value

    logger.info("editManualShareBatch called | count=%d", len(validated))

    logic = BusinessLogicWeeklyProgramming(get_databricks_service())
    try:
        logic.edit_manual_share_batch(validated)
    except ValueError as e:
        logger.warning("editManualShareBatch validation error: %s", e)
        return error(message=str(e), errors=["validation_error"]), 400
    except RuntimeError as e:
        logger.error("editManualShareBatch Databricks error: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("editManualShareBatch unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    broker.broadcast("weekly_changed", {})
    logger.info("editManualShareBatch: success | count=%d", len(validated))
    return success(message="Share manuali aggiornati con successo")


@bp.route("/weekly/lock", methods=["POST"])
def acquire_lock():
    body = request.get_json(silent=True) or {}
    week_monday = body.get("weekMonday")
    client_id = body.get("clientId", "")

    if not week_monday:
        return error(message="Il parametro 'weekMonday' è obbligatorio", errors=["missing_field"]), 400

    actor_identity, _ = resolve_request_user_identity(request)
    user_display = actor_identity or "Utente sconosciuto"

    acquired, existing = lock_store.try_acquire(week_monday, user_display, client_id)
    if not acquired:
        logger.info("acquireLock: rejected | weekMonday=%s holder=%s", week_monday, existing.user)
        return error(
            message=f"Un altro utente sta modificando gli share manuali: {existing.user}",
            errors=["lock_held"],
            data={"holder": existing.user},
        ), 409

    broker.broadcast("weekly_lock_acquired", {"weekMonday": week_monday, "user": user_display})
    logger.info("acquireLock: acquired | weekMonday=%s user=%s clientId=%s", week_monday, user_display, client_id)
    return success(data={"weekMonday": week_monday, "user": user_display}, message="Lock acquisito")


@bp.route("/weekly/lock", methods=["DELETE"])
def release_lock():
    body = request.get_json(silent=True) or {}
    week_monday = body.get("weekMonday")
    client_id = body.get("clientId", "")

    if not week_monday:
        return error(message="Il parametro 'weekMonday' è obbligatorio", errors=["missing_field"]), 400

    released = lock_store.release(week_monday, client_id)
    if released:
        broker.broadcast("weekly_lock_released", {"weekMonday": week_monday})
        logger.info("releaseLock: released | weekMonday=%s clientId=%s", week_monday, client_id)
    else:
        logger.warning("releaseLock: not owner or already released | weekMonday=%s clientId=%s", week_monday, client_id)

    return success(message="Lock rilasciato")

