"""Schritt 3: Kalenderdateien aus data/matches.json erzeugen.

Liest ausschliesslich die JSON-Daten, nie fussball.de. Der Dateiname
haengt am dauerhaften Kuerzel der Mannschaft, nicht am Anzeigenamen -
dadurch bleibt ein einmal veroeffentlichtes Abo dauerhaft gueltig, auch
wenn die Mannschaft auf fussball.de umbenannt wird.
"""

from urllib.parse import urlparse

import sys
from pathlib import Path

# Damit "python scripts/<name>.py" aus dem Repo-Verzeichnis genuegt und
# niemand PYTHONPATH setzen muss.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.common import paths
from scripts.common.ical import (
    build_calendar, build_event, summary, write_calendar
)

DEFAULT_DURATION = 105


def collections(teams_file, club):
    """Sammelkalender neben den Mannschaftskalendern.

    Jeder Eintrag: (slug, Anzeigename, Filterfunktion).
    """
    groups = teams_file.get("groups", {})
    by_slug = {team["slug"]: team for team in teams_file["teams"]}

    def in_group(group):
        return lambda match: (
            by_slug.get(match["teamSlug"], {}).get("group") == group
        )

    def home_pitch(pitch):
        # Grundlage fuer den Platzbelegungsplan: nur Spiele auf eigener
        # Anlage, nicht jedes Heimspiel - Spielgemeinschaften spielen
        # ihre Heimspiele teils auf fremden Plaetzen.
        return lambda match: (
            match.get("ownVenue") and match.get("pitch") == pitch
        )

    entries = [
        ("alle", "Alle Mannschaften", lambda match: True),
    ]

    for group_key, group_label in groups.items():
        entries.append((group_key, group_label, in_group(group_key)))

    entries.append(
        ("heim-kunstrasen", "Heimspiele Kunstrasen", home_pitch("Kunstrasen"))
    )
    entries.append(
        ("heim-naturrasen", "Heimspiele Naturrasen", home_pitch("Naturrasen"))
    )

    return entries


def main():
    club = paths.load_club()
    teams_file = paths.read_json(paths.TEAMS_DATA)
    matches_file = paths.read_json(paths.MATCHES_DATA)

    matches = matches_file["matches"]
    domain = urlparse(club["base_url"]).netloc or "tsv9510tools"
    website = club["base_url"].rstrip("/") + "/index.html"

    def dauer(match):
        """Regelspielzeit der Mannschaft, sonst der Vorgabewert."""
        return match.get("duration") or DEFAULT_DURATION

    by_slug = {}

    for match in matches:
        by_slug.setdefault(match["teamSlug"], []).append(match)

    written = 0
    unchanged = 0

    # Mannschaftskalender. Auch inaktive Mannschaften bekommen weiterhin
    # eine Datei, damit bestehende Abos nicht ins Leere laufen.
    for team in teams_file["teams"]:
        team_matches = by_slug.get(team["slug"], [])

        events = []

        for match in team_matches:
            # Im Mannschaftskalender bleibt der eigene Name weg - er
            # steht schon im Kalendernamen und frisst sonst den Platz,
            # den auf dem Handy der Gegner braucht.
            events.extend(
                build_event(
                    match,
                    summary(match),
                    dauer(match),
                    domain,
                    f"{website}?team={team['slug']}",
                )
            )

        text = build_calendar(
            f"{team['name']} ({teams_file['season']})",
            f"Spielplan {team['name']} - automatisch von fussball.de",
            events,
        )

        path = paths.CALENDAR_DIR / f"{team['slug']}.ics"

        if write_calendar(path, text):
            written += 1
            print(f"  {path.name}: {len(team_matches)} Spiele")
        else:
            unchanged += 1

    # Sammelkalender
    for slug, label, keep in collections(teams_file, club):
        selected = [match for match in matches if keep(match)]

        shorts = {team["slug"]: team["short"] for team in teams_file["teams"]}

        events = []

        for match in selected:
            # Im Sammelkalender ist das Kuerzel noetig, sonst weiss
            # niemand, welche Mannschaft gemeint ist.
            events.extend(
                build_event(
                    match,
                    summary(match, shorts.get(match["teamSlug"])),
                    dauer(match),
                    domain,
                    f"{website}?team={match['teamSlug']}",
                )
            )

        text = build_calendar(
            f"{club['short_name']} {label} ({teams_file['season']})",
            f"{label} - automatisch von fussball.de",
            events,
        )

        path = paths.CALENDAR_DIR / f"{slug}.ics"

        if write_calendar(path, text):
            written += 1
            print(f"  {path.name}: {len(selected)} Spiele")
        else:
            unchanged += 1

    print()
    print(f"{written} Kalender aktualisiert, {unchanged} unveraendert")

    return 0


if __name__ == "__main__":
    sys.exit(main())
