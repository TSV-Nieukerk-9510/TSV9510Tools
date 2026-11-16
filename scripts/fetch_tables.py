"""Holt die Tabellen der Mannschaften von fussball.de.

Schreibt data/tables.json fuer die Seite Tabelle. Ein Ausfall einer
einzelnen Tabelle bricht den Lauf nie ab: die Mannschaft erscheint dann
ohne Tabelle, alle anderen bleiben erhalten. Eine zuvor erfolgreich
geholte Tabelle bleibt stehen, wenn der neue Abruf nichts liefert.

Einstellungen: Abschnitt 'tabellen' in config/spielbetrieb.json.
"""

from scripts.common import paths
from scripts.common.fussballde import fetch_team_table
from scripts.common.text import matches_club


def main():
    config = paths.load_spielbetrieb()
    club = config["verein"]
    einstellungen = config.get("tabellen", {})

    if not einstellungen.get("aktiv", True):
        print("Tabellen abgeschaltet (tabellen.aktiv = false).")
        return

    ausschluss = set(einstellungen.get("ausschluss", []))
    teams_file = paths.read_json(paths.TEAMS_DATA)
    alt = paths.read_json(paths.TABLES_DATA, default={"tables": {}})
    tables = {}

    for team in teams_file.get("teams", []):
        if not team.get("active", True) or team["slug"] in ausschluss:
            continue

        table = None

        try:
            table = fetch_team_table(team["id"], team.get("url", ""))
        except Exception as error:
            print(f"  Tabelle nicht lesbar: {team['slug']} ({error})")

        if table:
            for row in table["rows"]:
                row["own"] = any(
                    matches_club(zelle, club.get("club_aliases", []))
                    for zelle in row["cells"]
                )
            tables[team["slug"]] = table
        elif team["slug"] in alt.get("tables", {}):
            print(f"  {team['slug']}: alter Stand bleibt erhalten")
            tables[team["slug"]] = alt["tables"][team["slug"]]

    paths.write_json(paths.TABLES_DATA, {
        "generated": paths.now_iso(),
        "season": club["season"],
        "count": len(tables),
        "tables": tables,
    })


if __name__ == "__main__":
    main()
