"""QR-Codes erzeugen - ohne Fremdbibliothek.

Warum selbst geschrieben: der automatische Ablauf soll mit moeglichst
wenigen Abhaengigkeiten auskommen, und die erzeugten Codes sollen als
SVG vorliegen. SVG laesst sich beliebig gross drucken, ohne unscharf zu
werden - bei einem QR-Code auf einem Aushang genau das, worauf es
ankommt.

Umfang: Byte-Modus, Fehlerkorrektur Stufe M (etwa 15 % der Flaeche
duerfen beschaedigt sein), Versionen 1 bis 10. Das reicht fuer rund
210 Zeichen und damit fuer jede Kalenderadresse mit grossem Abstand.

Geprueft wurde die Ausgabe gegen den QR-Decoder von OpenCV: jeder
erzeugte Code wird zurueckgelesen und mit dem Ausgangstext verglichen
(siehe scripts/build_qr.py, Aufruf mit --pruefen).
"""

# --- Tabellen aus der Norm (ISO/IEC 18004), nur Stufe M --------------

# Version: (Codewoerter gesamt, EC-Codewoerter je Block,
#           Bloecke Gruppe 1, Datencodewoerter je Block Gruppe 1,
#           Bloecke Gruppe 2, Datencodewoerter je Block Gruppe 2)
VERSIONEN = {
    1:  (26,   10, 1, 16, 0, 0),
    2:  (44,   16, 1, 28, 0, 0),
    3:  (70,   26, 1, 44, 0, 0),
    4:  (100,  18, 2, 32, 0, 0),
    5:  (134,  24, 2, 43, 0, 0),
    6:  (172,  16, 4, 27, 0, 0),
    7:  (196,  18, 4, 31, 0, 0),
    8:  (242,  22, 2, 38, 2, 39),
    9:  (292,  22, 3, 36, 2, 37),
    10: (346,  26, 4, 43, 1, 44),
}

# Mittelpunkte der Ausrichtungsmuster je Version
AUSRICHTUNG = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46],
    10: [6, 28, 50],
}

ECC_BITS = 0b00          # Stufe M
FORMAT_MASKE = 0x5412
FORMAT_GENERATOR = 0x537
VERSION_GENERATOR = 0x1F25


# --- Rechnen in GF(256) ----------------------------------------------

_EXP = [0] * 512
_LOG = [0] * 256

def _tabellen():
    x = 1
    for i in range(255):
        _EXP[i] = x
        _LOG[x] = i
        x <<= 1
        if x & 0x100:
            x ^= 0x11D
    for i in range(255, 512):
        _EXP[i] = _EXP[i - 255]

_tabellen()


def _mal(a, b):
    if a == 0 or b == 0:
        return 0
    return _EXP[_LOG[a] + _LOG[b]]


def _generatorpolynom(grad):
    poly = [1]

    for i in range(grad):
        neu = [0] * (len(poly) + 1)

        for j, wert in enumerate(poly):
            neu[j] ^= wert
            neu[j + 1] ^= _mal(wert, _EXP[i])

        poly = neu

    return poly


def _fehlerkorrektur(daten, anzahl):
    """Reed-Solomon-Rest zu einem Datenblock."""
    generator = _generatorpolynom(anzahl)
    rest = list(daten) + [0] * anzahl

    for i in range(len(daten)):
        faktor = rest[i]

        if faktor == 0:
            continue

        for j, wert in enumerate(generator):
            rest[i + j] ^= _mal(wert, faktor)

    return rest[len(daten):]


# --- Bitstrom --------------------------------------------------------

class Bits:
    def __init__(self):
        self.werte = []

    def dazu(self, wert, laenge):
        for i in range(laenge - 1, -1, -1):
            self.werte.append((wert >> i) & 1)

    def __len__(self):
        return len(self.werte)

    def bytes(self):
        return [
            int("".join(str(b) for b in self.werte[i:i + 8]), 2)
            for i in range(0, len(self.werte), 8)
        ]


def _version_fuer(laenge):
    for version in sorted(VERSIONEN):
        gesamt, ec, b1, d1, b2, d2 = VERSIONEN[version]
        datencodewoerter = b1 * d1 + b2 * d2
        # 4 Bit Modus + 8 oder 16 Bit Laengenangabe
        kopf = 4 + (8 if version < 10 else 16)

        if laenge * 8 + kopf <= datencodewoerter * 8:
            return version

    raise ValueError(
        f"Text zu lang fuer Version 10 ({laenge} Byte). "
        "Fuer laengere Texte muessen Tabellen ergaenzt werden."
    )


def _datencodewoerter(text, version):
    gesamt, ec, b1, d1, b2, d2 = VERSIONEN[version]
    soll = b1 * d1 + b2 * d2

    roh = text.encode("utf-8")
    bits = Bits()
    bits.dazu(0b0100, 4)                       # Byte-Modus
    bits.dazu(len(roh), 8 if version < 10 else 16)

    for byte in roh:
        bits.dazu(byte, 8)

    # Abschluss, dann auf volle Bytes auffuellen
    fuellbits = min(4, soll * 8 - len(bits))
    bits.dazu(0, fuellbits)

    while len(bits) % 8:
        bits.dazu(0, 1)

    woerter = bits.bytes()
    fueller = [0xEC, 0x11]

    while len(woerter) < soll:
        woerter.append(fueller[(len(woerter) - len(bits.bytes())) % 2])

    return woerter


def _verschachteln(woerter, version):
    gesamt, ec, b1, d1, b2, d2 = VERSIONEN[version]

    bloecke = []
    pos = 0

    for _ in range(b1):
        bloecke.append(woerter[pos:pos + d1])
        pos += d1

    for _ in range(b2):
        bloecke.append(woerter[pos:pos + d2])
        pos += d2

    ec_bloecke = [_fehlerkorrektur(block, ec) for block in bloecke]

    strom = []

    for i in range(max(len(b) for b in bloecke)):
        for block in bloecke:
            if i < len(block):
                strom.append(block[i])

    for i in range(ec):
        for block in ec_bloecke:
            strom.append(block[i])

    return strom


# --- Matrix ----------------------------------------------------------

def _leere_matrix(groesse):
    return [[None] * groesse for _ in range(groesse)]


def _setze_muster(matrix, version):
    groesse = len(matrix)

    def finder(zeile, spalte):
        for i in range(-1, 8):
            for j in range(-1, 8):
                z, s = zeile + i, spalte + j

                if not (0 <= z < groesse and 0 <= s < groesse):
                    continue

                rand = i in (-1, 7) or j in (-1, 7)
                ring = i in (0, 6) or j in (0, 6)
                kern = 2 <= i <= 4 and 2 <= j <= 4

                matrix[z][s] = 0 if rand else (1 if (ring or kern) else 0)

    finder(0, 0)
    finder(0, groesse - 7)
    finder(groesse - 7, 0)

    # Taktlinien
    for i in range(8, groesse - 8):
        wert = 1 if i % 2 == 0 else 0
        matrix[6][i] = wert
        matrix[i][6] = wert

    # Ausrichtungsmuster
    mitten = AUSRICHTUNG[version]

    for zeile in mitten:
        for spalte in mitten:
            if (zeile < 8 and spalte < 8) \
                    or (zeile < 8 and spalte > groesse - 9) \
                    or (zeile > groesse - 9 and spalte < 8):
                continue

            for i in range(-2, 3):
                for j in range(-2, 3):
                    aussen = max(abs(i), abs(j))
                    matrix[zeile + i][spalte + j] = \
                        1 if aussen in (0, 2) else 0

    # immer dunkles Modul
    matrix[groesse - 8][8] = 1


def _format_bits(maske):
    wert = (ECC_BITS << 3) | maske
    rest = wert << 10

    for i in range(4, -1, -1):
        if rest & (1 << (i + 10)):
            rest ^= FORMAT_GENERATOR << i

    return ((wert << 10) | rest) ^ FORMAT_MASKE


def _version_bits(version):
    rest = version << 12

    for i in range(5, -1, -1):
        if rest & (1 << (i + 12)):
            rest ^= VERSION_GENERATOR << i

    return (version << 12) | rest


def _reservieren(matrix, version):
    """Plaetze fuer Format- und Versionsangaben freihalten.

    Ohne die Reservierung der Versionsblocks (ab Version 7) schreibt die
    Datenplatzierung dorthin und die Angabe ueberschreibt sie
    anschliessend - das Symbol verliert 36 Datenmodule und ist nicht
    mehr lesbar.
    """
    groesse = len(matrix)

    if version >= 7:
        for zeile in range(6):
            for spalte in range(3):
                matrix[groesse - 11 + spalte][zeile] = 0
                matrix[zeile][groesse - 11 + spalte] = 0

    for i in range(9):
        if matrix[8][i] is None:
            matrix[8][i] = 0
        if matrix[i][8] is None:
            matrix[i][8] = 0

    for i in range(8):
        matrix[8][groesse - 1 - i] = 0

    # Nur sieben Module: das achte waere das Pflicht-Dunkelmodul bei
    # (groesse - 8, 8), das nicht ueberschrieben werden darf.
    for i in range(7):
        matrix[groesse - 1 - i][8] = 0


def _schreibe_format(matrix, maske):
    groesse = len(matrix)
    bits = _format_bits(maske)

    for i in range(15):
        # Die Formatangabe wird mit dem hoechstwertigen Bit zuerst
        # gesetzt - anders als die Versionsangabe weiter unten. Das
        # falsch herum zu schreiben ergibt ein Symbol, das in sich
        # stimmig aussieht, aber von keinem Lesegeraet entschluesselt
        # werden kann.
        bit = (bits >> (14 - i)) & 1

        if i < 6:
            matrix[8][i] = bit
        elif i < 8:
            matrix[8][i + 1] = bit
        elif i == 8:
            matrix[7][8] = bit
        else:
            matrix[14 - i][8] = bit

        # Zweite Kopie: sieben Module in der Spalte, acht in der Zeile.
        if i < 7:
            matrix[groesse - 1 - i][8] = bit
        else:
            matrix[8][groesse - 15 + i] = bit


def _schreibe_version(matrix, version):
    if version < 7:
        return

    groesse = len(matrix)
    bits = _version_bits(version)

    for i in range(18):
        bit = (bits >> i) & 1
        zeile, spalte = i // 3, i % 3
        matrix[groesse - 11 + spalte][zeile] = bit
        matrix[zeile][groesse - 11 + spalte] = bit


def _maskenwert(maske, zeile, spalte):
    if maske == 0:
        return (zeile + spalte) % 2 == 0
    if maske == 1:
        return zeile % 2 == 0
    if maske == 2:
        return spalte % 3 == 0
    if maske == 3:
        return (zeile + spalte) % 3 == 0
    if maske == 4:
        return (zeile // 2 + spalte // 3) % 2 == 0
    if maske == 5:
        return (zeile * spalte) % 2 + (zeile * spalte) % 3 == 0
    if maske == 6:
        return ((zeile * spalte) % 2 + (zeile * spalte) % 3) % 2 == 0
    return ((zeile + spalte) % 2 + (zeile * spalte) % 3) % 2 == 0


def _platziere(matrix, strom, maske):
    groesse = len(matrix)
    bits = []

    for wert in strom:
        for i in range(7, -1, -1):
            bits.append((wert >> i) & 1)

    index = 0
    spalte = groesse - 1

    while spalte > 0:
        if spalte == 6:        # Taktspalte ueberspringen
            spalte -= 1

        for n in range(groesse):
            aufwaerts = ((groesse - 1 - spalte) // 2) % 2 == 0
            zeile = (groesse - 1 - n) if aufwaerts else n

            for s in (spalte, spalte - 1):
                if matrix[zeile][s] is not None:
                    continue

                bit = bits[index] if index < len(bits) else 0
                index += 1

                if _maskenwert(maske, zeile, s):
                    bit ^= 1

                matrix[zeile][s] = bit

        spalte -= 2


def _strafe(matrix):
    """Bewertung nach den vier Regeln der Norm - je kleiner, desto besser."""
    groesse = len(matrix)
    punkte = 0

    # Regel 1: Reihen gleicher Farbe
    for richtung in range(2):
        for i in range(groesse):
            laufend = 1

            for j in range(1, groesse):
                a = matrix[i][j] if richtung == 0 else matrix[j][i]
                b = matrix[i][j - 1] if richtung == 0 else matrix[j - 1][i]

                if a == b:
                    laufend += 1
                else:
                    if laufend >= 5:
                        punkte += 3 + (laufend - 5)
                    laufend = 1

            if laufend >= 5:
                punkte += 3 + (laufend - 5)

    # Regel 2: gleichfarbige 2x2-Bloecke
    for i in range(groesse - 1):
        for j in range(groesse - 1):
            wert = matrix[i][j]
            if wert == matrix[i][j + 1] == matrix[i + 1][j] \
                    == matrix[i + 1][j + 1]:
                punkte += 3

    # Regel 3: Muster, das mit dem Suchmuster verwechselt werden kann
    muster_a = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0]
    muster_b = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1]

    for i in range(groesse):
        for j in range(groesse - 10):
            zeile = [matrix[i][j + k] for k in range(11)]
            spalte = [matrix[j + k][i] for k in range(11)]

            for muster in (muster_a, muster_b):
                if zeile == muster:
                    punkte += 40
                if spalte == muster:
                    punkte += 40

    # Regel 4: Verhaeltnis dunkler Module
    dunkel = sum(sum(zeile) for zeile in matrix)
    anteil = dunkel * 100 // (groesse * groesse)
    punkte += 10 * (abs(anteil - 50) // 5)

    return punkte


def matrix(text):
    """Erzeugt die Modulmatrix: Liste von Zeilen mit 0 und 1."""
    roh = text.encode("utf-8")
    version = _version_fuer(len(roh))
    groesse = version * 4 + 17

    strom = _verschachteln(_datencodewoerter(text, version), version)

    bestes = None
    beste_punkte = None

    for maske in range(8):
        feld = _leere_matrix(groesse)
        _setze_muster(feld, version)
        _reservieren(feld, version)
        _platziere(feld, strom, maske)
        _schreibe_format(feld, maske)
        _schreibe_version(feld, version)

        punkte = _strafe(feld)

        if beste_punkte is None or punkte < beste_punkte:
            beste_punkte = punkte
            bestes = feld

    return bestes


def svg(text, rand=4, modul=4, farbe="#11244e", hintergrund="#ffffff"):
    """QR-Code als SVG. Groesse in Modulen, nicht in Pixeln - die Datei
    skaliert verlustfrei auf jede Druckgroesse."""
    feld = matrix(text)
    groesse = len(feld)
    gesamt = (groesse + 2 * rand) * modul

    pfade = []

    for z, zeile in enumerate(feld):
        s = 0
        while s < groesse:
            if zeile[s]:
                start = s
                while s < groesse and zeile[s]:
                    s += 1
                breite = (s - start) * modul
                pfade.append(
                    f"M{(start + rand) * modul} {(z + rand) * modul}"
                    f"h{breite}v{modul}h-{breite}z"
                )
            else:
                s += 1

    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{gesamt}" '
        f'height="{gesamt}" viewBox="0 0 {gesamt} {gesamt}" '
        f'shape-rendering="crispEdges" role="img">'
        f'<rect width="{gesamt}" height="{gesamt}" fill="{hintergrund}"/>'
        f'<path d="{"".join(pfade)}" fill="{farbe}"/>'
        f"</svg>\n"
    )
