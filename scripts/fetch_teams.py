"""Schritt 1: Mannschaften von fussball.de holen und nach data/teams.json schreiben.

Die Liste von fussball.de wird mit den dauerhaften Kuerzeln aus
config/teams.map.json zusammengefuehrt. Massgeblich ist immer die team-id,
nie der Anzeigename - der kann sich jederzeit aendern.
"""

import sys
from pathlib import Path

# Damit "python scripts/<name>.py" aus dem Repo-Verzeichnis genuegt und
# niemand PYTHONPATH setzen muss.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.common import paths
from scripts.common.fussballde import fetch_club_teams
from scripts.common.text import slugify


def build_team(team_id, remote, mapping, order_fallback):
    """Setzt einen Eintrag fuer data/teams.json zusammen."""
    entry = mapping.get(team_id, {})
    is_known = bool(entry)

    slug = entry.get("slug") or slugify(remote["name"])

    return {
        "id": team_id,
        "slug": slug,
        "name": remote["name"],
        "short": entry.get("short") or slug.upper(),
        "group": entry.get("group") or "sonstige",
        "order": entry.get("order", order_fallback),
        "url": remote["url"],
        "active": True,
        "mapped": is_known,
        "calendar": f"kalender/{slug}.ics",

        # Regelspielzeit inklusive Pause und uebliche Anstosszeit -
        # beides bestimmt, wie der Kalendereintrag aussieht.
        "duration": entry.get("spielzeit", 105),
        "kickoff": entry.get("anstoss", "15:00"),
    }


def main():
    club = paths.load_club()
    teams_map = paths.load_teams_map()

    mapping = teams_map.get("teams", {})
    groups = teams_map.get("groups", {})

    remote_teams = fetch_club_teams(club["club_id"], club["season"])

    if not remote_teams:
        print("FEHLER: fussball.de hat keine Mannschaften geliefert.")
        print("Lauf wird abgebrochen, damit vorhandene Daten erhalten bleiben.")
        return 1

    teams = []
    unmapped = []

    for index, remote in enumerate(remote_teams):
        team = build_team(
            remote["team_id"], remote, mapping, 900 + index
        )
        teams.append(team)

        if not team["mapped"]:
            unmapped.append(team)

    # Mannschaften, die frueher gemeldet waren und jetzt fehlen, bleiben
    # erhalten - nur als inaktiv markiert. Sonst verschwinden Kalender-
    # dateien, die moeglicherweise jemand abonniert hat.
    previous = paths.read_json(paths.TEAMS_DATA, default={}).get("teams", [])
    current_ids = {team["id"] for team in teams}

    for old in previous:
        if old["id"] in current_ids:
            continue

        old["active"] = False
        teams.append(old)
        print(f"HINWEIS: {old['name']} wird nicht mehr gefuehrt -> inaktiv")

    teams.sort(key=lambda team: (team["order"], team["slug"]))

    paths.write_json(paths.TEAMS_DATA, {
        "generated": paths.now_iso(),
        "season": club["season"],
        "club": {
            "id": club["club_id"],
            "name": club["name"],
            "short_name": club["short_name"],
        },
        "groups": groups,
        "teams": teams,
    })

    if unmapped:
        print()
        print("ACHTUNG: unbekannte Mannschaften, Kuerzel nur vorlaeufig.")
        print("Bitte in config/teams.map.json eintragen und festschreiben:")

        for team in unmapped:
            print(f'  "{team["id"]}": '
                  f'{{"slug": "{team["slug"]}", "short": "", '
                  f'"group": "", "order": 0}}   # {team["name"]}')

    return 0


if __name__ == "__main__":
    sys.exit(main())
