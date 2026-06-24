import logging
from dataclasses import asdict

from flask import Blueprint, request

from app.container import get_simulation_service
from app.logics.business_logic_simulation import BusinessLogicSimulation
from app.models.api_response import error, success

logger = logging.getLogger(__name__)

bp = Blueprint("simulation", __name__)


# ------------------------------------------------------------------ #
# Programs
# ------------------------------------------------------------------ #

@bp.route("/simulation/programs")
def get_programs():
    ch = request.args.get("ch") or None
    date = request.args.get("date") or None
    from_time = request.args.get("from_time") or None
    to_time = request.args.get("to_time") or None
    search = request.args.get("search") or None

    logger.info(
        "getSimPrograms | ch=%s date=%s from=%s to=%s search=%s",
        ch, date, from_time, to_time, search,
    )

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_programs(
            ch=ch, date=date, from_time=from_time, to_time=to_time, search=search
        )
    except RuntimeError as e:
        logger.error("getSimPrograms RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getSimPrograms unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=asdict(result), message="Programmi ottenuti con successo")


# ------------------------------------------------------------------ #
# Candidates
# ------------------------------------------------------------------ #

@bp.route("/simulation/candidates")
def get_candidates():
    exclude_id = request.args.get("exclude_id") or None
    ch = request.args.get("ch") or None
    search = request.args.get("search") or None
    genere = request.args.get("genere") or None
    eta = request.args.get("eta") or None
    share_min_str = request.args.get("share_min") or None
    target_dur_str = request.args.get("target_dur") or None

    share_min: float | None = None
    if share_min_str:
        try:
            share_min = float(share_min_str)
        except ValueError:
            return error(message="Valore share_min non valido", errors=["invalid_share_min"]), 400

    target_dur: int | None = None
    if target_dur_str:
        try:
            target_dur = int(target_dur_str)
        except ValueError:
            pass

    logger.info(
        "getSimCandidates | exclude=%s ch=%s search=%s genere=%s eta=%s share_min=%s",
        exclude_id, ch, search, genere, eta, share_min,
    )

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_candidates(
            exclude_id=exclude_id,
            ch=ch,
            search=search,
            genere=genere,
            eta=eta,
            share_min=share_min,
            target_dur=target_dur,
        )
    except RuntimeError as e:
        logger.error("getSimCandidates RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getSimCandidates unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=asdict(result), message="Candidati ottenuti con successo")


# ------------------------------------------------------------------ #
# Simulate
# ------------------------------------------------------------------ #

@bp.route("/simulation/simulate", methods=["POST"])
def run_simulation():
    body = request.get_json(silent=True) or {}
    mode = body.get("mode")

    if not mode:
        return error(message="Il parametro 'mode' è obbligatorio", errors=["missing_mode"]), 400

    logger.info("runSimulation | mode=%s", mode)

    try:
        logic = BusinessLogicSimulation(get_simulation_service())

        if mode == "sostituzione":
            orig_id = body.get("orig_id")
            cand_id = body.get("cand_id")
            if not orig_id or not cand_id:
                return error(
                    message="I parametri 'orig_id' e 'cand_id' sono obbligatori per la sostituzione",
                    errors=["missing_params"],
                ), 400
            result = logic.simulate_sostituzione(orig_id=orig_id, cand_id=cand_id)

        elif mode == "spostamento":
            prog_id = body.get("prog_id")
            dest_ch = body.get("dest_ch")
            dest_day = body.get("dest_day")
            dest_time = body.get("dest_time")
            if not all([prog_id, dest_ch, dest_day, dest_time]):
                return error(
                    message="I parametri 'prog_id', 'dest_ch', 'dest_day', 'dest_time' sono obbligatori",
                    errors=["missing_params"],
                ), 400
            result = logic.simulate_spostamento(
                prog_id=prog_id,
                dest_ch=dest_ch,
                dest_day=dest_day,
                dest_time=dest_time,
            )

        else:
            return error(message=f"Modalità non valida: {mode}", errors=["invalid_mode"]), 400

    except RuntimeError as e:
        logger.error("runSimulation RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("runSimulation unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=asdict(result), message="Simulazione completata con successo")


# ------------------------------------------------------------------ #
# Competitors
# ------------------------------------------------------------------ #

@bp.route("/simulation/competitors")
def get_competitors():
    slot = request.args.get("slot") or None

    logger.info("getSimCompetitors | slot=%s", slot)

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_competitors(slot=slot)
    except RuntimeError as e:
        logger.error("getSimCompetitors RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getSimCompetitors unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=asdict(result), message="Competitor ottenuti con successo")


# ------------------------------------------------------------------ #
# Channel schedule (for spostamento destination)
# ------------------------------------------------------------------ #

@bp.route("/simulation/schedule")
def get_channel_schedule():
    ch = request.args.get("ch") or None
    dest_time = request.args.get("dest_time") or None

    if not ch or not dest_time:
        return error(
            message="I parametri 'ch' e 'dest_time' sono obbligatori",
            errors=["missing_params"],
        ), 400

    logger.info("getSimSchedule | ch=%s dest_time=%s", ch, dest_time)

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        result = logic.get_channel_schedule(ch=ch, dest_time=dest_time)
    except RuntimeError as e:
        logger.error("getSimSchedule RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("getSimSchedule unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    return success(data=asdict(result), message="Palinsesto ottenuto con successo")


# ------------------------------------------------------------------ #
# Spostamento — start scenario/simulation
# ------------------------------------------------------------------ #

@bp.route("/simulation/spostamento/start", methods=["POST"])
def start_spostamento():
    body = request.get_json(silent=True) or {}

    logger.info(
        "startSpostamento | program=%s channel=%s date=%s from=%s new_program=%s",
        body.get("program_name"),
        body.get("program_channel"),
        body.get("program_date"),
        body.get("program_from_time"),
        body.get("new_program_name"),
    )

    try:
        logic = BusinessLogicSimulation(get_simulation_service())
        message, status_code = logic.start_spostamento(body)
    except ValueError as e:
        return error(message=str(e), errors=["missing_params"]), 400
    except RuntimeError as e:
        logger.error("startSpostamento RuntimeError: %s", e)
        return error(message=str(e), errors=["databricks_error"]), 502
    except Exception as e:
        logger.exception("startSpostamento unexpected: %s", e)
        return error(message=f"Errore imprevisto: {e}", errors=["internal_error"]), 500

    if status_code == 202:
        return success(message=message), 202
    return error(message=message, errors=["simulation_conflict"]), status_code
