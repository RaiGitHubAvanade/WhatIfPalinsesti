"""Simulation logic — mirrors predictShare() from mock/js/weeklyprogramming.js"""


def _hash_to_number(s: str) -> float:
    """Deterministic djb2 hash normalized to [0, 1)."""
    if not s:
        return 0.0
    h = 5381
    for ch in s:
        h = ((h << 5) + h) + ord(ch)
        h &= 0xFFFFFFFF
    return (h & 0xFFFFFFFF) / 4294967296.0


def predict_share(orig: dict, cand: dict) -> dict:
    """
    Lightweight share prediction matching the mock logic.
    Returns {'pred': float, 'reason': str}.
    """
    base = float(orig.get("share", 6.0)) if isinstance(orig.get("share"), (int, float)) else 6.0
    factor = 0.0

    if cand.get("id") == "move":
        key = (str(orig.get("id", "")) + "|" + str(cand.get("tipo", "")) +
               "|" + str(cand.get("eta", "")) + "|" + str(cand.get("sesso", "")))
        r = _hash_to_number(key)
        factor = (r - 0.5) * 4  # range [-2, +2]
    else:
        k = str(cand.get("title") or cand.get("id") or "") + "|" + str(cand.get("tipo", ""))
        r2 = _hash_to_number(k)
        factor = (r2 - 0.45) * 6  # approx [-2.7, +3.3]
        orig_share = orig.get("share")
        cand_share = cand.get("share") or cand.get("hist")
        if isinstance(orig_share, (int, float)) and isinstance(cand_share, (int, float)):
            factor += (float(cand_share) - float(orig_share)) * 0.1

    pred = base + factor
    pred = max(0.0, min(100.0, pred))
    return {"pred": round(pred, 1), "reason": "mocked-predict"}


def get_competitors(slot: str | None, force_external: bool = False) -> list:
    """Return a list of competitor program summaries for a given slot."""
    from app.data.programs_data import PROGS, COMPS  # noqa: F401
    if not force_external and slot:
        matches = [p for p in PROGS if p.get("slot") == slot and
                   p.get("ch") and not p["ch"].lower().startswith("rai")]
        if matches:
            return [
                {
                    "title": p.get("title", "Programma"),
                    "ch": p.get("ch", "Altro"),
                    "tipo": p.get("tipo") or p.get("genre", "—"),
                    "eta": p.get("eta", "All"),
                    "sesso": p.get("sesso", "All"),
                    "share": p.get("share"),
                    "evento": p.get("evento", False),
                }
                for p in matches[:6]
            ]

    # synthetic competitor fallback
    competitor_data = [
        {"ch": "Canale 5", "programs": [
            {"title": "Grande Fratello", "tipo": "Reality"},
            {"title": "Striscia la Notizia", "tipo": "Satira"},
            {"title": "Uomini e Donne", "tipo": "Talk Show"},
            {"title": "Avanti un Altro!", "tipo": "Game Show"},
        ]},
        {"ch": "Italia 1", "programs": [
            {"title": "Le Iene", "tipo": "Informazione"},
            {"title": "Chicago Fire", "tipo": "Serie TV"},
            {"title": "NCIS", "tipo": "Serie TV"},
            {"title": "Dragon Ball Super", "tipo": "Animazione"},
        ]},
        {"ch": "Rete 4", "programs": [
            {"title": "Quarta Repubblica", "tipo": "Talk Politico"},
            {"title": "Dritto e Rovescio", "tipo": "Talk Politico"},
            {"title": "Stasera Italia", "tipo": "Informazione"},
            {"title": "Zona Bianca", "tipo": "Talk Show"},
        ]},
        {"ch": "La7", "programs": [
            {"title": "Otto e Mezzo", "tipo": "Informazione"},
            {"title": "Piazzapulita", "tipo": "Talk Politico"},
            {"title": "Di Martedì", "tipo": "Talk Politico"},
            {"title": "In Onda", "tipo": "Informazione"},
        ]},
    ]
    out = []
    for i, entry in enumerate(competitor_data):
        r = _hash_to_number((slot or "") + "|" + str(i))
        prog_idx = int(r * len(entry["programs"])) % len(entry["programs"])
        prog = entry["programs"][prog_idx]
        out.append({
            "title": prog["title"],
            "ch": entry["ch"],
            "tipo": prog["tipo"],
            "share": round((5 + r * 16) * 10) / 10,
            "evento": r > 0.85,
        })
    return out
