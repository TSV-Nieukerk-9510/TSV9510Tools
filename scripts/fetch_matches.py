"""Schritt 2: Spielplaene holen und nach data/matches.json schreiben.

data/matches.json ist die zentrale Schnittstelle des Projekts. Website,
Kalenderdateien und spaeter die Android-App lesen ausschliesslich daraus
und sprechen nie selbst mit fussball.de.
"""

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import sys
from pathlib import Path

# Damit "python scripts/<name>.py" aus dem Repo-Verzeichnis genuegt und
# niemand PYTHONPATH setzen muss.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.common import paths
from scripts.common.fussballde import fetch_team_matchplan
from scripts.common.text import is_own_venue, matches_club


def to_start(date_iso, time_text, tz, ersatz):
    """Baut aus Datum und Uhrzeit einen Zeitstempel mit Zeitzone.

    Steht die Anstosszeit noch nicht fest - bei Jugendspielen haeufig -,
    wird die uebliche Anstosszeit der Mannschaft eingesetzt. Ganztaegige
    Eintraege gibt es bewusst nicht: sie verschwinden in Handykalendern
    in der Kopfzeile und sagen nichts ueber den Nachmittag aus. Der
    Eintrag weist dafuer deutlich darauf hin, dass die Zeit offen ist.

    Die Zeitzone kommt aus zoneinfo und kennt damit die Umstellung
    zwischen Sommer- und Winterzeit - ein Spiel am letzten Oktober-
    wochenende liegt richtig, ohne Zutun.
    """
    angenommen = not time_text
    clock = time_text or ersatz

    naive = datetime.strptime(f"{date_iso} {clock}", "%Y-%m-%d %H:%M")
    return naive.replace(tzinfo=tz).isoformat(), clock, angenommen


def resolve_pitch(raw, is_home, club):
    """Platzart bestimmen und offenlegen, ob sie angenommen wurde.

    Viele Jugendspiele nennen keine Platzart. Fuer ein Heimspiel nehmen
    wir dann den Vorgabewert aus config/club.json an - aber nie
    stillschweigend: pitchAssumed macht die Annahme sichtbar, auf der
    Seite erscheint ein Stern. Bei Auswaertsspielen wird nichts
    angenommen; ueber fremde Anlagen koennen wir nichts wissen.
    """
    pitch = raw["pitch"]

    if pitch:
        return pitch, False

    if is_home:
        return club.get("default_home_pitch", "Kunstrasen"), True

    return "", False


def build_match(raw, team, club, tz):
    start, anstoss, zeit_angenommen = to_start(
        raw["date"], raw["time"], tz,
        team.get("kickoff") or club.get("anstoss_standard", "15:00")
    )

    is_home = matches_club(raw["home"], club["club_aliases"])
    opponent = raw["away"] if is_home else raw["home"]

    pitch, pitch_assumed = resolve_pitch(raw, is_home, club)

    # Fuer den Platzbelegungsplan: liegt das Spiel auf eigener Anlage?
    # Steht keine Spielstaette da, gilt ein Heimspiel als eigene Anlage.
    own_venue = is_own_venue(raw["venue"], club.get("home_venues", []))

    if not raw["venue"] and is_home:
        own_venue = True

    return {
        "id": raw["match_id"] or f'{team["slug"]}-{raw["date"]}-{raw["time"]}',

        # eigene Mannschaft
        "teamId": team["id"],
        "teamSlug": team["slug"],
        "teamName": team["name"],

        # Termin
        "date": raw["date"],
        "time": raw["time"],
        "startTime": anstoss,
        "timeAssumed": zeit_angenommen,
        "start": start,
        "duration": team.get("duration", 105),

        # amtliche Kennungen - genau das, was der Staffelleiter braucht
        "matchNumber": raw["matchNumber"],
        "matchDay": raw["matchDay"],
        "divisionId": raw["divisionId"],
        "divisionUrl": raw["divisionUrl"],
        "competition": raw["competition"],

        # Begegnung
        "home": raw["home"],
        "away": raw["away"],
        "isHome": is_home,
        "opponent": opponent,
        "homeTeamId": raw["homeTeamId"],
        "awayTeamId": raw["awayTeamId"],
        "homeClubUrl": raw["homeClubUrl"],
        "awayClubUrl": raw["awayClubUrl"],

        # Spielstaette
        "venue": raw["venue"],
        "venueName": raw["venueName"],
        "address": raw["address"],
        "mapsUrl": raw["mapsUrl"],
        "pitch": pitch,
        "pitchAssumed": pitch_assumed,
        "ownVenue": own_venue,

        "referee": raw["referee"],

        # Ergebnisse stehen auf fussball.de nur in einer verschleierten
        # Schrift und sind nicht auslesbar. Feld bleibt vorerst leer.
        "result": None,

        "url": raw["url"],
    }


def bereits_gespielt(match, jetzt):
    """True, wenn das Spiel samt Spielzeit vorbei ist."""
    try:
        start = datetime.fromisoformat(match["start"])
    except (KeyError, ValueError):
        return False

    ende = start + timedelta(minutes=match.get("duration") or 105)
    return ende < jetzt


def behalte_vergangene(neu, vorher, jetzt):
    """Gespielte Spiele aus dem letzten Stand uebernehmen.

    fussball.de liefert im Spielplan nur noch kommende Spiele - was
    gespielt ist, verschwindet dort. Ohne diese Uebernahme wuerden
    Spiele nach dem Abpfiff aus Website und Kalender fallen.

    Uebernommen wird nur, was (1) in der neuen Antwort fehlt und (2)
    bereits vorbei ist. Ein Spiel in der Zukunft, das fussball.de nicht
    mehr nennt, ist abgesetzt oder entfernt und faellt bewusst raus.
    """
    bekannte = {match["id"] for match in neu}

    return [
        match for match in vorher
        if match["id"] not in bekannte and bereits_gespielt(match, jetzt)
    ]


def main():
    club = paths.load_club()
    tz = ZoneInfo(club.get("timezone", "Europe/Berlin"))

    teams_file = paths.read_json(paths.TEAMS_DATA)
    teams = [team for team in teams_file["teams"] if team.get("active")]

    if not teams:
        print("FEHLER: keine aktiven Mannschaften in data/teams.json.")
        print("Zuerst scripts/fetch_teams.py ausfuehren.")
        return 1

    previous_file = paths.read_json(paths.MATCHES_DATA, default={})
    previous = previous_file.get("matches", [])

    # Neue Saison: der alte Stand gehoert nicht mehr dazu.
    if previous_file.get("season") != teams_file.get("season"):
        previous = []

    jetzt = datetime.now(tz)
    previous_by_team = {}

    for match in previous:
        previous_by_team.setdefault(match["teamSlug"], []).append(match)

    matches = []
    failed = []

    for team in teams:
        try:
            raw_matches = fetch_team_matchplan(team["id"])
        except Exception as error:
            # Einzelne Ausfaelle duerfen den Lauf nicht beenden. Die alten
            # Spiele der Mannschaft bleiben stehen, damit weder Website
            # noch Kalender ploetzlich leer sind.
            print(f"  FEHLER bei {team['name']}: {error}")
            failed.append(team["name"])
            matches.extend(previous_by_team.get(team["slug"], []))
            continue

        for raw in raw_matches:
            matches.append(build_match(raw, team, club, tz))

    # Gespielte Spiele bleiben stehen (siehe behalte_vergangene). Bei
    # ausgefallenen Mannschaften steckt der alte Stand schon in matches.
    aktuelle_ids = {match["id"] for match in matches}
    behalten = behalte_vergangene(matches, [
        match for match in previous if match["id"] not in aktuelle_ids
    ], jetzt)
    matches.extend(behalten)

    if behalten:
        print(f"  {len(behalten)} bereits gespielte Spiele aus dem "
              "letzten Stand behalten")

    matches.sort(key=lambda match: (match["start"], match["teamSlug"]))

    paths.write_json(paths.MATCHES_DATA, {
        "generated": paths.now_iso(),
        "season": teams_file["season"],
        "count": len(matches),
        "incomplete": bool(failed),
        "failedTeams": failed,
        "matches": matches,
    })

    print()
    print(f"{len(matches)} Spiele aus {len(teams) - len(failed)} Mannschaften")

    if failed:
        print(f"Nicht abrufbar: {', '.join(failed)}")
        print("Fuer diese Mannschaften wurde der letzte bekannte Stand behalten.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
