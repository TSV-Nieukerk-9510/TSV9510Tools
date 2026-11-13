"""Erzeugt iCalendar-Dateien (.ics) ohne Fremdbibliothek.

Bewusst selbst geschrieben statt mit einer Bibliothek:

1. Weniger Abhaengigkeiten im Workflow.
2. Volle Kontrolle ueber UID, SEQUENCE und Zeitzonen - genau die Punkte,
   an denen Kalender-Abos in der Praxis scheitern.
3. Die Ausgabe ist zeichengenau vorhersagbar. Dadurch aendert sich eine
   Datei nur, wenn sich die Spieldaten wirklich geaendert haben, und der
   automatische Lauf erzeugt keine leeren Commits.

Alle Zeitangaben werden nach UTC umgerechnet. Damit entfaellt ein
VTIMEZONE-Block, und die Termine erscheinen in jedem Kalenderprogramm in
der jeweils richtigen Ortszeit.
"""

from datetime import datetime, timedelta, timezone

from scripts.common.text import lesbar

PRODID = "-//TSV Nieukerk 95/10//TSV9510Tools//DE"

# Sagt dem Kalenderprogramm, wie oft es neu laden soll. Ohne diese Angabe
# fragen manche Clients nur einmal taeglich nach.
REFRESH = "PT6H"


def escape(value):
    """Sonderzeichen nach RFC 5545 maskieren."""
    if value is None:
        return ""

    return (
        str(value)
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\r\n", "\\n")
        .replace("\n", "\\n")
    )


def fold(line):
    """Zeilen auf 75 Oktett umbrechen - gezaehlt wird in Bytes, nicht in
    Zeichen, sonst brechen Umlaute die Datei."""
    raw = line.encode("utf-8")

    if len(raw) <= 75:
        return line

    parts = []
    start = 0
    limit = 75

    while start < len(raw):
        end = min(start + limit, len(raw))

        # nicht mitten in ein Mehrbyte-Zeichen schneiden
        while end > start and end < len(raw) and (raw[end] & 0xC0) == 0x80:
            end -= 1

        parts.append(raw[start:end].decode("utf-8"))
        start = end
        limit = 74  # Folgezeilen beginnen mit einem Leerzeichen

    return "\r\n ".join(parts)


def _utc(value):
    """ISO-Zeitstempel nach UTC umrechnen und als iCal-Zeit ausgeben."""
    moment = datetime.fromisoformat(value).astimezone(timezone.utc)
    return moment.strftime("%Y%m%dT%H%M%SZ")


_KURZ = [
    (r"\s*\be\.\s?V\.?(?=\s|$)", ""),
    (r"\bTurn- und Sportverein\b", "TSV"),
    (r"\bJugendspielgemeinschaft\b", "JSG"),
    (r"\bSpielgemeinschaft\b", "SG"),
    (r"\bSportgemeinschaft\b", "SG"),
    (r"\bSpielvereinigung\b", "SpVgg"),
    (r"\bSportverein\b", "SV"),
    (r"\bFussballclub\b", "FC"),
    (r"\bFußballclub\b", "FC"),
    (r"\s+", " "),
]


def kurz(name):
    """Gegnername fuer kleine Bildschirme straffen: Rechtsform weg,
    ausgeschriebene Vereinsarten abkuerzen. Mehr nicht - der Name muss
    erkennbar bleiben."""
    import re

    ergebnis = name or ""

    for muster, ersatz in _KURZ:
        ergebnis = re.sub(muster, ersatz, ergebnis)

    return ergebnis.strip()


def summary(match, team_short=None):
    """Betreff des Termins - bewusst kurz.

    Im Monatsraster eines Handykalenders sind oft nur rund 15 Zeichen
    sichtbar. In einem Mannschaftskalender weiss man ohnehin, um welche
    Mannschaft es geht; es zaehlt, ob daheim oder auswaerts gespielt
    wird und gegen wen. Deshalb nur H oder A und der Gegner.

    Steht die Anstosszeit noch nicht fest, beginnt der Betreff mit "?".
    Vorne, weil ein Anhaengsel am Ende auf dem Handy abgeschnitten wird.
    """
    seite = "H" if match.get("isHome") else "A"
    kern = f"{seite} {kurz(match.get('opponent'))}".strip()

    if team_short:
        kern = f"{team_short}: {kern}"

    if match.get("timeAssumed"):
        kern = f"? {kern}"

    return kern


_WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag",
               "Samstag", "Sonntag"]
_MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
           "August", "September", "Oktober", "November", "Dezember"]


def datum_lang(iso):
    tag = datetime.strptime(iso, "%Y-%m-%d")
    return (f"{_WOCHENTAGE[tag.weekday()]}, {tag.day}. "
            f"{_MONATE[tag.month - 1]} {tag.year}")


def describe(match, website=None):
    """Alle Angaben zum Spiel - dieselben Zeilen wie in der Detailansicht
    der Spieluebersicht, in derselben Reihenfolge.

    Im Kalender auf dem Handy ist das oft die einzige Stelle, an der
    jemand nachschaut. Der Textgenerator wird bewusst nicht verlinkt;
    dafuer fuehrt ein Link zur Seite des Vereins.
    """
    zeilen = []

    def zeile(beschriftung, wert):
        if wert:
            zeilen.append(f"{beschriftung}: {wert}")

    # Der wichtigste Hinweis steht ganz oben, sonst geht er unter.
    if match.get("timeAssumed"):
        zeilen.append(
            "ACHTUNG: Die Anstoßzeit steht noch nicht fest. Eingetragen "
            f"ist die übliche Anstoßzeit ({match.get('startTime')} Uhr). "
            "Bitte vor dem Spiel auf FUSSBALL.DE prüfen."
        )
        zeilen.append("")

    zeile("Mannschaft", match.get("teamName"))
    zeile("Begegnung", f"{match.get('home')} – {match.get('away')}")

    if match.get("isHome") is not None:
        zeile("Art", "Heimspiel" if match["isHome"] else "Auswärtsspiel")

    if match.get("isHome") is False and match.get("ownVenue"):
        zeile("Hinweis", "Laut FUSSBALL.DE hat der Gegner Heimrecht, "
              "der Spielort ist aber unsere eigene Anlage.")

    if match.get("date"):
        if match.get("timeAssumed"):
            zeile("Anstoß", f"{datum_lang(match['date'])} – Zeit steht "
                  f"noch nicht fest (angenommen {match.get('startTime')} Uhr)")
        else:
            zeile("Anstoß", f"{datum_lang(match['date'])}, "
                  f"{match.get('startTime')} Uhr")

    wettbewerb = match.get("competition") or ""

    if match.get("matchDay"):
        wettbewerb = f"{wettbewerb}, {match['matchDay']}. Spieltag".strip(", ")

    zeile("Wettbewerb", wettbewerb)
    zeile("Spielnummer", match.get("matchNumber"))
    zeile("Staffel-ID", match.get("divisionId"))
    zeile("Spielstätte", match.get("venue"))
    zeile("Anschrift", match.get("address"))

    if match.get("pitch"):
        hinweis = " * (angenommen, FUSSBALL.DE nennt keine Platzart)" \
            if match.get("pitchAssumed") else ""
        zeile("Platzart", match["pitch"] + hinweis)

    zeile("Schiedsrichter", lesbar(match.get("referee")) or "k. A.")

    if zeilen and zeilen[-1] != "":
        zeilen.append("")

    zeile("Spiel auf FUSSBALL.DE", match.get("url"))
    zeile("Sportanlage in Google Maps", match.get("mapsUrl"))
    zeile("Staffel und Tabelle", match.get("divisionUrl"))
    zeile("Spielübersicht der Webseite", website)

    return zeilen


def build_event(match, betreff, duration_minutes, domain, website=None):
    """Ein VEVENT als Liste von Zeilen."""
    lines = ["BEGIN:VEVENT"]

    lines.append(f"UID:{match['id']}@{domain}")

    # DTSTAMP wird absichtlich aus dem Spiel selbst abgeleitet und nicht
    # auf "jetzt" gesetzt. Sonst wuerde sich bei jedem Lauf jede Zeile
    # aendern und der Workflow commitet alle sechs Stunden Rauschen.
    lines.append(f"DTSTAMP:{_utc(match['start'])}")

    # Immer ein Termin mit Uhrzeit, nie ganztaegig: der Eintrag beginnt
    # beim Anstoss und dauert die Regelspielzeit samt Halbzeitpause.
    start = datetime.fromisoformat(match["start"])
    end = start + timedelta(minutes=duration_minutes)
    lines.append(f"DTSTART:{_utc(start.isoformat())}")
    lines.append(f"DTEND:{_utc(end.isoformat())}")

    lines.append(f"SUMMARY:{escape(betreff)}")

    # "venue" ist der heutige Feldname; "location" bleibt als Rueckfall
    # fuer Daten stehen, die vor der Umbenennung erzeugt wurden.
    venue = match.get("venue") or match.get("location") or ""

    if venue:
        lines.append(f"LOCATION:{escape(venue)}")

    lines.append(
        f"DESCRIPTION:{escape(chr(10).join(describe(match, website)))}"
    )

    if match.get("url"):
        lines.append(f"URL:{escape(match['url'])}")

    lines.append("STATUS:CONFIRMED")
    lines.append("TRANSP:OPAQUE")
    lines.append("END:VEVENT")

    return lines


def build_calendar(name, description, events):
    """Vollstaendige .ics-Datei als Text mit CRLF-Zeilenenden."""
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{escape(name)}",
        f"X-WR-CALDESC:{escape(description)}",
        "X-WR-TIMEZONE:Europe/Berlin",
        f"REFRESH-INTERVAL;VALUE=DURATION:{REFRESH}",
        f"X-PUBLISHED-TTL:{REFRESH}",
    ]

    lines.extend(events)
    lines.append("END:VCALENDAR")

    return "\r\n".join(fold(line) for line in lines) + "\r\n"


def write_calendar(path, text):
    """Schreibt nur, wenn sich der Inhalt geaendert hat."""
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        # open() statt Path.read_text(newline=...): der Parameter kennt
        # erst Python 3.13, der Workflow laeuft mit 3.12.
        with path.open("r", encoding="utf-8", newline="") as handle:
            current = handle.read()

        if current == text:
            return False

    with path.open("w", encoding="utf-8", newline="") as handle:
        handle.write(text)

    return True
