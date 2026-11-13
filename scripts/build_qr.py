"""Schritt 4: QR-Codes zu allen Kalendern erzeugen.

Jeder Kalender bekommt einen QR-Code als SVG unter qr/. SVG, weil die
Codes auch auf Aushaengen und in Mannschaftsheften landen sollen - dort
muessen sie beliebig gross und trotzdem scharf sein.

Erzeugt wird ohne Fremdbibliothek (scripts/common/qr.py).

    python scripts/build_qr.py
    python scripts/build_qr.py --pruefen

Mit --pruefen wird jeder erzeugte Code wieder eingelesen und mit der
Ausgangsadresse verglichen. Das braucht OpenCV (pip install
opencv-python-headless) und ist fuer den normalen Lauf nicht noetig.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from scripts.common import paths
from scripts.common.qr import matrix, svg


def adresse(basis, slug):
    return f"{basis.rstrip('/')}/kalender/{slug}.ics"


def alle_kalender(teams_datei):
    """Dieselbe Liste wie build_calendars.py erzeugt."""
    slugs = ["alle"]
    slugs += list((teams_datei.get("groups") or {}).keys())
    slugs += ["heim-kunstrasen", "heim-naturrasen"]
    slugs += [team["slug"] for team in teams_datei["teams"]]

    # Reihenfolge erhalten, Doppelte entfernen
    gesehen = set()
    einmalig = []

    for slug in slugs:
        if slug not in gesehen:
            gesehen.add(slug)
            einmalig.append(slug)

    return einmalig


def pruefe(paare):
    """Jeden Code zurueckleseon und vergleichen."""
    try:
        import numpy as np
        import cv2
    except ImportError:
        print()
        print("Pruefung uebersprungen: OpenCV ist nicht installiert.")
        print("  pip install opencv-python-headless numpy")
        return 0

    leser = cv2.QRCodeDetectorAruco() if hasattr(cv2, "QRCodeDetectorAruco") \
        else cv2.QRCodeDetector()

    fehler = 0

    for slug, url in paare:
        feld = matrix(url)
        n = len(feld)
        rand, gross = 4, 8
        bild = np.full(((n + 2 * rand) * gross,) * 2, 255, np.uint8)

        for z in range(n):
            for s in range(n):
                if feld[z][s]:
                    bild[(z + rand) * gross:(z + rand + 1) * gross,
                         (s + rand) * gross:(s + rand + 1) * gross] = 0

        gelesen = leser.detectAndDecode(bild)[0]

        if gelesen != url:
            fehler += 1
            print(f"  FEHLER {slug}: zurueckgelesen {gelesen!r}")

    print()
    print(f"Pruefung: {len(paare) - fehler} von {len(paare)} Codes korrekt")

    return fehler


def main():
    club = paths.load_club()
    teams_datei = paths.read_json(paths.TEAMS_DATA)
    basis = club["base_url"]

    paths.QR_DIR.mkdir(parents=True, exist_ok=True)

    paare = []
    geschrieben = 0
    unveraendert = 0

    for slug in alle_kalender(teams_datei):
        url = adresse(basis, slug)
        paare.append((slug, url))

        inhalt = svg(url)
        ziel = paths.QR_DIR / f"{slug}.svg"

        # Zeilenenden unveraendert lassen, damit Windows und der Linux-
        # Runner dieselben Bytes schreiben und vergleichen.
        if ziel.exists():
            with ziel.open("r", encoding="utf-8", newline="") as handle:
                if handle.read() == inhalt:
                    unveraendert += 1
                    continue

        with ziel.open("w", encoding="utf-8", newline="") as handle:
            handle.write(inhalt)
        geschrieben += 1

    # Nicht mehr benoetigte Codes entfernen, damit keine Leichen bleiben
    bekannt = {f"{slug}.svg" for slug, _ in paare}

    for datei in paths.QR_DIR.glob("*.svg"):
        if datei.name not in bekannt:
            datei.unlink()
            print(f"  entfernt: {datei.name}")

    print(f"{geschrieben} QR-Codes geschrieben, {unveraendert} unveraendert")

    if "--pruefen" in sys.argv:
        return 1 if pruefe(paare) else 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
