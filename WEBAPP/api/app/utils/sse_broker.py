import queue
import threading
import logging

logger = logging.getLogger(__name__)


class SseBroker:
    """Thread-safe in-memory pub/sub broker for Server-Sent Events.

    Each connected client gets a dedicated Queue. Mutation routes call
    broadcast() to push a named event to every active queue without
    blocking the request thread.
    """

    def __init__(self):
        self._clients: set[queue.Queue] = set()
        self._lock = threading.Lock()

    def subscribe(self) -> queue.Queue:
        """Register a new SSE client; returns its dedicated Queue."""
        q: queue.Queue = queue.Queue(maxsize=20)
        with self._lock:
            self._clients.add(q)
        return q

    def unsubscribe(self, q: queue.Queue) -> None:
        """Remove a client queue when its SSE connection closes."""
        with self._lock:
            self._clients.discard(q)

    def broadcast(self, event: str, data: dict) -> None:
        """Send a named event to every connected client.

        Uses put_nowait so slow clients never block the request thread;
        their queue fills up and the event is silently dropped for them.
        """
        with self._lock:
            clients = list(self._clients)

        dropped = 0
        for q in clients:
            try:
                q.put_nowait({"event": event, "data": data})
            except queue.Full:
                dropped += 1

        if dropped:
            logger.warning(
                "SSE broker: dropped event '%s' for %d slow client(s)",
                event, dropped,
            )

    @property
    def client_count(self) -> int:
        with self._lock:
            return len(self._clients)


# Module-level singleton — shared across all request threads in the same process
broker = SseBroker()
