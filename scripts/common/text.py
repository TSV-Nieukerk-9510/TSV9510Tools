"""Textaufbereitung fuer Daten von fussball.de."""

import re
import unicodedata


def clean_text(text):
    """Mehrfache Leerzeichen und unsichtbare Zeichen entfernen."""
    if not text:
        return ""

    text = text.replace("​", "").replace("­", "")
    return re.sub(r"\s+", " ", text).strip()


def lesbar(text):
    """Gibt den Text zurueck - oder "", wenn fussball.de ihn verschleiert.

    Der Name des Schiedsrichters kommt wie das Ergebnis als Zeichen aus
    dem privaten Unicode-Bereich (U+E000-U+F8FF), die erst eine
    mitgelieferte Schrift lesbar macht. Ausgelesen entstehen nur
    Kaestchen. Solche Texte gelten als nicht vorhanden.
    """
    if not text:
        return ""

    if any("\ue000" <= zeichen <= "\uf8ff" for zeichen in text):
        return ""

    return text


def slugify(text):
    """Erzeugt ein URL-taugliches Kuerzel aus einem Mannschaftsnamen.

    Nur fuer noch unbekannte Mannschaften. Dauerhafte Kuerzel stehen in
    config/teams.map.json und werden dort von Hand festgeschrieben.
    """
    text = clean_text(text).lower()

    replacements = {
        "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)

    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")

    text = re.sub(r"[^a-z0-9]+", "-", text)
    return re.sub(r"-+", "-", text).strip("-")


# Reihenfolge ist entscheidend: "Kunstrasen" enthaelt "rasen", also muss
# der genauere Begriff zuerst geprueft werden.
PITCH_RULES = (
    ("Kunstrasen", ("kunstrasen", "kunstgras", "kr-platz")),
    ("Halle", ("halle", "sporthalle", "hallenturnier")),
    ("Hartplatz", ("hartplatz", "asche", "aschenplatz", "tenne")),
    ("Naturrasen", ("naturrasen", "rasenplatz", "rasen", "grossfeld")),
)


def detect_pitch(text):
    """Platzart aus einem Freitext ableiten.

    Gibt "" zurueck, wenn sich nichts Eindeutiges finden laesst. Eine
    Annahme wird hier bewusst NICHT getroffen - das entscheidet
    fetch_matches.py, damit sie als solche gekennzeichnet werden kann.
    """
    if not text:
        return ""

    lowered = text.lower()

    for bezeichnung, begriffe in PITCH_RULES:
        if any(begriff in lowered for begriff in begriffe):
            return bezeichnung

    return ""


def is_own_venue(venue, home_venues):
    """Prueft, ob die Spielstaette zu den eigenen Anlagen gehoert."""
    if not venue:
        return False

    lowered = clean_text(venue).lower()
    return any(clean_text(ort).lower() in lowered for ort in home_venues)


def matches_club(team_name, aliases):
    """Prueft, ob ein Mannschaftsname zu einer eigenen Mannschaft gehoert."""
    if not team_name:
        return False

    name = clean_text(team_name).lower()
    return any(clean_text(alias).lower() in name for alias in aliases)
