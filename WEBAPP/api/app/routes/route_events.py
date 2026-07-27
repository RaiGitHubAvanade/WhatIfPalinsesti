import json
import queue as queue_module
import logging

from flask import Blueprint, Response, stream_with_context, request

from app.config import Config
from app.utils.sse_broker import broker
from app.utils.lock_store import lock_store

logger = logging.getLogger(__name__)
bp = Blueprint("events", __name__)


@bp.route("/events")
def stream_events():
    """Long-lived SSE endpoint — one persistent connection per browser tab.

    Accepts an optional ``clientId`` query param so that lock auto-release
    works correctly when the tab is closed.
    A comment-only keepalive line is flushed every ~20 s so proxies do
    not close the idle connection.
    """
    client_id = request.args.get("clientId", "")
    client_q = broker.subscribe()
    keepalive = Config.SSE_KEEPALIVE_SECONDS
    logger.info("SSE client connected | clientId=%s (active: %d)", client_id, broker.client_count)

    @stream_with_context
    def generate():
        try:
            while True:
                try:
                    msg = client_q.get(timeout=keepalive)
                    payload = json.dumps(msg["data"])
                    yield f"event: {msg['event']}\ndata: {payload}\n\n"
                except queue_module.Empty:
                    yield ": keepalive\n\n"
        except GeneratorExit:
            pass
        finally:
            broker.unsubscribe(client_q)
            logger.info(
                "SSE client disconnected | clientId=%s (active: %d)",
                client_id, broker.client_count,
            )
            # Auto-release any edit locks held by this client
            if client_id:
                released = lock_store.release_by_client(client_id)
                for week_monday in released:
                    logger.info(
                        "SSE: auto-released edit lock for week %s (clientId=%s disconnected)",
                        week_monday, client_id,
                    )
                    broker.broadcast("weekly_lock_released", {"weekMonday": week_monday})

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
