"""Holt die Webschriften einmalig von Google Fonts ins Repo.

Danach laedt die Seite keine Schriften mehr von Google nach. Das ist
wichtig, weil die Seite per iframe auf der Vereinsseite eingebunden
werden soll - deren Cookie-Hinweis verspricht, Google-Inhalte nur nach
Zustimmung zu laden.

AUSFUEHREN:

    python scripts/fetch_fonts.py

Danach die erzeugten Dateien committen. Das Skript laeuft nur, wenn es
gebraucht wird - nicht im automatischen Ablauf alle sechs Stunden.

AENDERT SICH DIE VEREINSSEITE?

Dann nur die Liste SCHRIFTEN unten anpassen und das Skript erneut
ausfuehren. Es loescht alte Dateien im Schriftordner und schreibt
assets/css/fonts.css neu. Sonst ist nirgends etwas zu aendern - die
Seite spricht die Schriften ueber die Variablen --schrift und
--schrift-eng in assets/css/style.css an.

Welche Schriften eine Seite benutzt, zeigt im Browser ein Rechtsklick,
"Untersuchen", Reiter "Berechnet", Eintrag "font-family".
"""

import re
import shutil
import sys
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.common import paths  # noqa: E402

# ---------------------------------------------------------------------
# Hier anpassen, wenn sich die Schriften der Vereinsseite aendern.
# ---------------------------------------------------------------------

SCHRIFTEN = [
    {"familie": "Barlow", "schnitte": [400, 600, 700]},
    {"familie": "Barlow Condensed", "schnitte": [600, 700]},
]

ZEICHENSAETZE = ["latin", "latin-ext"]

# ---------------------------------------------------------------------

FONT_DIR = paths.ROOT / "assets" / "fonts"
CSS_DATEI = paths.ROOT / "assets" / "css" / "fonts.css"

API = "https://fonts.googleapis.com/css2"

# Ohne diesen User-Agent liefert Google die alten woff-Dateien statt
# woff2 - die sind deutlich groesser.
KOPF = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0 Safari/537.36"
    )
}


def hole(url, kopf=None):
    anfrage = Request(url, headers=kopf or KOPF)

    with urlopen(anfrage, timeout=60) as antwort:
        return antwort.read()


def css_url(schriften):
    teile = []

    for eintrag in schriften:
        familie = quote(eintrag["familie"].replace(" ", "+"), safe="+")
        schnitte = ";".join(
            f"0,{gewicht}" for gewicht in sorted(eintrag["schnitte"])
        )
        teile.append(f"family={familie}:ital,wght@{schnitte}")

    return f"{API}?" + "&".join(teile) + "&display=swap"


def dateiname(familie, gewicht, stil, satz):
    """Der Zeichensatz gehoert in den Namen.

    Google liefert je Zeichensatz eine eigene Datei mit denselben
    Schriftmerkmalen. Ohne den Zusatz wuerden latin und latin-ext auf
    denselben Dateinamen fallen und einer der beiden ginge verloren -
    mit dem Ergebnis, dass Umlaute oder Sonderzeichen fehlen.
    """
    kurz = familie.lower().replace(" ", "-")
    return f"{kurz}-{gewicht}-{stil}-{satz}.woff2"


def main():
    url = css_url(SCHRIFTEN)
    print(f"Schriftverzeichnis abrufen:\n  {url}\n")

    try:
        css = hole(url).decode("utf-8")
    except Exception as fehler:
        print(f"FEHLER: Google Fonts nicht erreichbar ({fehler})")
        print("Das Skript braucht einmalig Internetzugang.")
        return 1

    # Google stellt jedem Block einen Kommentar mit dem Zeichensatz
    # voran:   /* latin */ @font-face { ... }
    bloecke = re.findall(
        r"/\*\s*([a-z0-9-]+)\s*\*/\s*@font-face\s*\{(.*?)\}",
        css,
        re.S,
    )

    if not bloecke:
        print("FEHLER: keine @font-face-Angaben gefunden.")
        return 1

    if FONT_DIR.exists():
        shutil.rmtree(FONT_DIR)

    FONT_DIR.mkdir(parents=True, exist_ok=True)

    zeilen = [
        "/* Automatisch erzeugt von scripts/fetch_fonts.py.",
        " * Nicht von Hand aendern - stattdessen die Liste SCHRIFTEN",
        " * im Skript anpassen und es erneut ausfuehren.",
        " */",
        "",
    ]

    geladen = {}
    uebersprungen = 0

    for satz, block in bloecke:
        # Nur die gewuenschten Zeichensaetze; der Rest waere unnoetiger
        # Ballast im Repository.
        if satz not in ZEICHENSAETZE:
            uebersprungen += 1
            continue

        def feld(name, text=block):
            treffer = re.search(rf"{name}:\s*([^;]+);", text)
            return treffer.group(1).strip().strip("'\"") if treffer else ""

        familie = feld("font-family")
        gewicht = feld("font-weight")
        stil = feld("font-style") or "normal"
        bereich = feld("unicode-range")

        quelle = re.search(r"url\((https://[^)]+\.woff2)\)", block)

        if not quelle or not familie:
            continue

        ziel = dateiname(familie, gewicht, stil, satz)
        pfad = FONT_DIR / ziel

        if ziel not in geladen:
            print(f"  lade {familie} {gewicht} {stil} ({satz})")
            pfad.write_bytes(
                hole(quelle.group(1), {"User-Agent": "Mozilla/5.0"})
            )
            geladen[ziel] = pfad.stat().st_size

        zeilen.append("@font-face {")
        zeilen.append(f"  font-family: '{familie}';")
        zeilen.append(f"  font-style: {stil};")
        zeilen.append(f"  font-weight: {gewicht};")
        zeilen.append("  font-display: swap;")
        zeilen.append(f"  src: url('../fonts/{ziel}') format('woff2');")

        if bereich:
            zeilen.append(f"  unicode-range: {bereich};")

        zeilen.append("}")
        zeilen.append("")

    CSS_DATEI.write_text("\n".join(zeilen), encoding="utf-8")

    gesamt = sum(geladen.values())

    print()
    print(f"{len(geladen)} Schriftdateien in assets/fonts/ "
          f"({gesamt / 1024:.0f} KB)")

    if uebersprungen:
        print(f"{uebersprungen} Zeichensätze übersprungen "
              f"(nur {', '.join(ZEICHENSAETZE)} werden mitgeliefert)")

    print(f"assets/css/fonts.css neu geschrieben")
    print()
    print("Beide Ordner committen, dann lädt die Seite nichts mehr "
          "von Google.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
