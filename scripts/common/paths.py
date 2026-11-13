"""Pfade und JSON-Ein-/Ausgabe.

Alle Skripte benutzen ausschliesslich die Pfade aus diesem Modul. Dadurch
laufen sie unabhaengig davon, aus welchem Verzeichnis sie gestartet werden.
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

# scripts/common/paths.py -> scripts/common -> scripts -> Repo-Wurzel
ROOT = Path(__file__).resolve().parents[2]

CONFIG_DIR = ROOT / "config"
DATA_DIR = ROOT / "data"
CALENDAR_DIR = ROOT / "kalender"
QR_DIR = ROOT / "qr"

CLUB_CONFIG = CONFIG_DIR / "club.json"
TEAMS_MAP = CONFIG_DIR / "teams.map.json"

TEAMS_DATA = DATA_DIR / "teams.json"
MATCHES_DATA = DATA_DIR / "matches.json"

# Deutschland: Winterzeit UTC+1, Sommerzeit UTC+2.
BERLIN_WINTER = timezone(timedelta(hours=1))


def read_json(path, default=None):
    """Liest eine JSON-Datei. Fehlt sie, wird default zurueckgegeben."""
    path = Path(path)

    if not path.exists():
        if default is None:
            raise FileNotFoundError(f"Datei fehlt: {path}")
        return default

    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, payload):
    """Schreibt JSON mit festem Format, damit git-Diffs lesbar bleiben."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=False)
        handle.write("\n")

    print(f"geschrieben: {path.relative_to(ROOT)}")


def load_club():
    return read_json(CLUB_CONFIG)


def load_teams_map():
    return read_json(TEAMS_MAP)


def now_iso():
    """Zeitstempel des Laufs in UTC."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
