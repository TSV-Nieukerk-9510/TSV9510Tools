"""Der einzige Ort im Projekt, der fussball.de aufruft.

Wenn fussball.de seinen Seitenaufbau aendert, muss ausschliesslich diese
Datei angepasst werden. Alles andere arbeitet nur noch mit den JSON-Daten
unter data/.

Genutzt werden die beiden AJAX-Endpunkte, die schlanke HTML-Fragmente
liefern. Die sind deutlich stabiler als die vollstaendigen Seiten.
"""

import re
import time
from datetime import datetime

import requests
from bs4 import BeautifulSoup

from scripts.common.text import clean_text, detect_pitch, lesbar

BASE = "https://www.fussball.de"

TEAMS_ENDPOINT = BASE + "/ajax.club.teams/-/action/search/id/{club_id}"
MATCHPLAN_ENDPOINT = BASE + "/ajax.team.matchplan/-/mode/PAGE/team-id/{team_id}"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0 Safari/537.36"
    ),
    "Accept-Language": "de-DE,de;q=0.9",
}

TIMEOUT = 30

# Pause zwischen zwei Abrufen. Bewusst gesetzt: wir holen pro Lauf einige
# hundert Spieldetailseiten und wollen fussball.de nicht belasten.
DELAY_SECONDS = 0.6

_session = None


def session():
    global _session

    if _session is None:
        _session = requests.Session()
        _session.headers.update(HEADERS)

    return _session


def _get(url):
    time.sleep(DELAY_SECONDS)
    response = session().get(url, timeout=TIMEOUT)
    response.raise_for_status()
    return response.text


def extract_team_id(url):
    match = re.search(r"team-id/([^/?#]+)", url or "")
    return match.group(1) if match else ""


def extract_match_id(url):
    """Die Spiel-ID ist das letzte Pfadsegment der Spiel-URL."""
    if not url:
        return ""

    segments = [segment for segment in url.split("?")[0].split("/") if segment]
    return segments[-1] if segments else ""


def fetch_club_teams(club_id, season):
    """Alle gemeldeten Mannschaften des Vereins fuer eine Saison."""
    url = TEAMS_ENDPOINT.format(club_id=club_id)
    print(f"Mannschaften abrufen: {url}")

    time.sleep(DELAY_SECONDS)
    response = session().post(
        url,
        data={
            "saison": season,
            "mannschaftsart": "-1",
            "wettkampftyp": "-1",
        },
        timeout=TIMEOUT,
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    teams = []

    for item in soup.select(".result .item"):
        link = item.select_one("h4 a")

        if not link:
            continue

        team_url = link.get("href", "")
        team_id = extract_team_id(team_url)

        if not team_id:
            continue

        teams.append({
            "team_id": team_id,
            "name": clean_text(link.get_text(" ", strip=True)),
            "url": team_url,
        })

    print(f"  {len(teams)} Mannschaften gefunden")
    return teams


EMPTY_DETAILS = {
    "matchNumber": "",
    "matchDay": "",
    "divisionId": "",
    "divisionUrl": "",
    "competition": "",
    "venue": "",
    "venueName": "",
    "address": "",
    "mapsUrl": "",
    "pitch": "",
    "referee": "",
    "homeTeamId": "",
    "awayTeamId": "",
    "homeClubUrl": "",
    "awayClubUrl": "",
}


def _meta_rows(soup, css_class):
    """Liest eine Liste der Art 'Staffel-ID: 220545' aus dem Kopfbereich."""
    rows = {}

    for item in soup.select(f"ul.{css_class} li.row"):
        spans = item.find_all("span")

        if len(spans) < 2:
            continue

        label = clean_text(spans[0].get_text()).rstrip(":")
        value = clean_text(spans[1].get_text())

        if label:
            rows[label] = value

    return rows


def _split_venue(venue):
    """'Kunstrasenplatz, Kunstrasen TSV Nieukerk, Am Aermen Düwel 16, 47647
    Kerken' in Anlagenname und Anschrift zerlegen.

    fussball.de setzt die Anschrift ans Ende: Strasse mit Hausnummer,
    dann Postleitzahl und Ort.
    """
    if not venue:
        return "", ""

    teile = [clean_text(teil) for teil in venue.split(",") if clean_text(teil)]

    for index, teil in enumerate(teile):
        if re.match(r"^\d{5}\s", teil) and index > 0:
            return ", ".join(teile[:index - 1]), ", ".join(teile[index - 1:])

    return venue, ""


def fetch_match_details(match_url):
    """Alle brauchbaren Angaben der Spielseite einsammeln.

    Wichtig: Anstosszeit und Ergebnis stehen auf dieser Seite nur in einer
    verschleierten Schrift (data-obfuscation, Zeichen aus dem privaten
    Unicode-Bereich) und sind daher hier NICHT lesbar. Die Anstosszeit
    holen wir ohnehin aus dem Spielplan-Endpunkt; Ergebnisse bleiben
    vorerst aussen vor.

    Gibt bei einem Fehler ein leeres Feldpaket zurueck - ein Ausfall darf
    den Lauf nie abbrechen.
    """
    if not match_url:
        return dict(EMPTY_DETAILS)

    try:
        html = _get(match_url)
    except Exception as error:
        print(f"  Spieldetails nicht lesbar: {match_url} ({error})")
        return dict(EMPTY_DETAILS)

    soup = BeautifulSoup(html, "html.parser")
    details = dict(EMPTY_DETAILS)

    # Spielnummer, Spieltag, Staffel
    rechts = _meta_rows(soup, "stage-meta-right")
    details["divisionId"] = rechts.get("Staffel-ID", "")

    spiel = rechts.get("Spiel", "")

    if spiel:
        nummer = re.match(r"\s*(\S+)", spiel)
        tag = re.search(r"(\d+)\.\s*Spieltag", spiel)

        details["matchNumber"] = nummer.group(1) if nummer else ""
        details["matchDay"] = tag.group(1) if tag else ""

    links = _meta_rows(soup, "stage-meta-left")
    details["referee"] = lesbar(links.get("Schiedsrichter", ""))

    # Wettbewerb und Staffel-Seite
    competition = soup.select_one("a.competition")

    if competition:
        details["competition"] = clean_text(competition.get_text())
        details["divisionUrl"] = competition.get("href", "")

    # Spielstaette
    location = soup.select_one("a.location")

    if location:
        venue = clean_text(location.get_text())
        details["venue"] = venue
        details["mapsUrl"] = location.get("href", "")
        details["venueName"], details["address"] = _split_venue(venue)
        details["pitch"] = detect_pitch(venue)

    # Die CSS-Klasse des Kopfbereichs (".stage match grass") taugt NICHT
    # als Ersatzquelle fuer die Platzart: sie stand im Beispiel auf
    # "grass", obwohl die Anlage ein Kunstrasenplatz ist. Sie ist reine
    # Gestaltung. Ohne Angabe im Spielstaetten-Text bleibt pitch leer.

    # Mannschafts- und Vereinsseiten beider Seiten
    for seite, praefix in (("home", "team-home"), ("away", "team-away")):
        team_link = soup.select_one(f".{praefix} .team-name a")
        club_link = soup.select_one(f".{praefix} .team-logo a")

        if team_link:
            details[f"{seite}TeamId"] = extract_team_id(
                team_link.get("href", "")
            )

        if club_link:
            details[f"{seite}ClubUrl"] = club_link.get("href", "")

    return details


def fetch_team_matchplan(team_id, with_details=True):
    """Alle Spiele einer Mannschaft als Liste von Rohdaten-Dictionaries."""
    url = MATCHPLAN_ENDPOINT.format(team_id=team_id)
    print(f"Spielplan abrufen: {team_id}")

    soup = BeautifulSoup(_get(url), "html.parser")
    matches = []

    for header_row in soup.select("tr.row-competition"):
        game_row = header_row.find_next_sibling("tr")

        if not game_row:
            continue

        date_cell = header_row.select_one(".column-date")

        if not date_cell:
            continue

        date_text = date_cell.get_text(" ", strip=True)
        date_match = re.search(r"(\d{2}\.\d{2}\.\d{2})", date_text)
        time_match = re.search(r"(\d{1,2}:\d{2})", date_text)

        if not date_match:
            continue

        try:
            date_iso = datetime.strptime(
                date_match.group(1), "%d.%m.%y"
            ).strftime("%Y-%m-%d")
        except ValueError:
            continue

        clubs = game_row.select(".club-name")

        if len(clubs) < 2:
            continue

        competition_cell = header_row.select_one(".column-team")
        score_link = game_row.select_one(".column-score a")
        match_url = score_link.get("href", "") if score_link else ""

        details = dict(EMPTY_DETAILS)

        if with_details and match_url:
            details = fetch_match_details(match_url)

        # Erst die Detailfelder, dann die Werte aus dem Spielplan - die
        # sind hier die verlaesslichere Quelle und sollen gewinnen.
        eintrag = dict(details)

        competition = clean_text(
            competition_cell.get_text(strip=True) if competition_cell else ""
        )

        eintrag.update({
            "match_id": extract_match_id(match_url),
            "date": date_iso,
            "time": time_match.group(1) if time_match else "",
            "home": clean_text(clubs[0].get_text(strip=True)),
            "away": clean_text(clubs[1].get_text(strip=True)),
            "competition": competition or details["competition"],
            "url": match_url,
        })

        matches.append(eintrag)

    print(f"  {len(matches)} Spiele")
    return matches
