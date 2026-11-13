# FAQ für Betreuer des Repositories

Technische Fragen zu Daten, Konfiguration und Betrieb. Diese Datei gehört nur
zum Repository und wird auf der Webseite nirgends verlinkt. Die FAQ für
Besucher steht in `config/faq.json`.

## Daten und Abruf

**Woher kommen die Spieldaten, und wie oft?**
Von FUSSBALL.DE. Eine GitHub Action ruft sie alle sechs Stunden ab
(`scripts/fetch_teams.py`, `scripts/fetch_matches.py`) und schreibt
`data/teams.json`, `data/matches.json`, die Kalender unter `kalender/` und die
QR-Codes unter `qr/`. Der Abrufzeitpunkt steht als „Stand“ auf den Seiten.

**Warum bleiben vergangene Spiele erhalten?**
FUSSBALL.DE liefert nur kommende Spiele. Bereits gespielte Spiele übernimmt
das Skript aus dem vorherigen Stand in `data/matches.json`.

**Was bedeutet „Anstoßzeit offen“ und das Fragezeichen im Kalender?**
Das Spiel hat bei FUSSBALL.DE noch keine Uhrzeit. Auf der Seite steht
„offen“, im Kalender die übliche Zeit der Mannschaft (`anstoss` in
`config/teams.map.json`), im Betreff mit `?` gekennzeichnet.

**Was ist `pitchAssumed` und der Stern bei der Platzart?**
Viele Jugendspiele nennen keine Platzart. Bei Heimspielen gilt dann
`default_home_pitch` aus `config/club.json`, im Datensatz als
`pitchAssumed` markiert, auf der Seite als Stern.

**Wie erkennt das System eigene Spiele und Heimspiele auf der eigenen Anlage?**
Über `club_aliases` (Namensbestandteile, auch Spielgemeinschaften) und
`home_venues` in `config/club.json`.

## Kalender

**Entstehen doppelte Einträge, wenn ein Spiel verlegt wird?**
Nein. Jedes Spiel hat eine feste UID, abgeleitet aus der Spiel-ID. Eine
Verlegung ändert denselben Termin. Bereits gespielte Termine bleiben im
Kalender erhalten.

**Wie lang ist ein Termin?**
`spielzeit` der Mannschaft (Regelspielzeit inklusive Halbzeitpause) aus
`config/teams.map.json`, sonst `match_duration_minutes` aus
`config/club.json`.

**Warum darf ein slug nie geändert werden?**
Der `slug` bestimmt Dateinamen und öffentliche Adressen der Kalender-Abos.
Eine Änderung lässt alle bestehenden Abos ins Leere laufen, ohne dass es
jemand merkt.

**Neue Mannschaft bei FUSSBALL.DE?**
`fetch_teams.py` meldet jede unbekannte team-id und legt vorläufig einen slug
aus dem Namen an. Dann in `config/teams.map.json` eintragen und festschreiben.

## Einbetten

**Kann ich eine Seite in eine andere Webseite einbetten?**
Ja. Mit `?embed=1` blendet jede Seite Kopf und Menü aus. Auf der
Spielübersicht stellen `?team=tsv-h1` oder `?gruppe=jugend` die Auswahl vor.

## Trainingszeiten und Platzbelegung

**Platzcodes (`PLATZ-TEIL`)**
`KR` = Kunstrasen, `NR` = Naturrasen. Teile: `G` ganzes Feld, `H1`/`H2`
Hälften, `D1`–`D3` Drittel, `V1`–`V4` Viertel. Hochkant gesehen, Vereinsheim
unten: H1 unten, H2 oben; V1 unten links, V2 unten rechts, V3 oben links,
V4 oben rechts; D3 oben über die ganze Breite, D1 unten links, D2 unten
rechts. Ohne Teil (`KR`) gilt das ganze Feld.

**Warum steht höchstens eine Hälfte im Plan?**
Auch wenn der ganze Platz frei wäre, trägt man pro Training höchstens eine
Hälfte ein. `felder` je Jahreszeit unter `saisons` legt fest, was erlaubt ist.
Ein ganzes Feld (`G`) meldet die Platzbelegung als Unstimmigkeit.

**Wie entsteht die rote Markierung?**
Zwei Einheiten am selben Tag, deren Zeiten sich überlappen und deren
Platzteile sich geometrisch überschneiden. Die Geometrie steht in
`FELDER` in `assets/js/seite.js`.

**Wie trainieren zwei Mannschaften gemeinsam?**
Die zweite trägt bei der Einheit `zusammen: "<slug der ersten>"` ein. Dann
erscheint ein gemeinsamer Block ohne Doppelbelegung.

**Wann gilt Sommer, wann Winter?**
`saisons.sommer.ab` und `saisons.winter.ab` in `config/mannschaften.json`.
Die Platzbelegung öffnet die gerade gültige Jahreszeit. Sommer und Winter sind
getrennte Objekte, auch Drittel können im Sommer vorkommen.

**Wie drehe ich die Platzzeichnung?**
`platzansicht.drehung` in `config/mannschaften.json`: `rechts` oder `links`.
Aktuell `links` (Hälfte 1 unten, Vereinsheim unten).

**Platzsperren**
Sie werden bewusst nicht eingetragen, das entscheidet der Platzwart. Im Winter
ist der Naturrasen über `saisons.winter.plaetze` gesperrt.

## Textvorlagen

**Wie ändere ich eine Vorlage?**
Es sind einfache Textdateien in `templates/`, aufgeführt in
`templates/manifest.json`. Siehe `docs/textvorlagen.md`. Platzhalter wie
`{{spielnummer}}` werden aus den Spieldaten gefüllt, unbekannte werden zu
Eingabefeldern.

## Datenschutz

**Was darf in `config/mannschaften.json` stehen?**
Die Datei liegt in einem öffentlichen Repository. Nur Funktionsadressen des
Vereins eintragen, keine privaten Mobilnummern oder Mailadressen ohne
ausdrückliches Einverständnis. Bei Jugendmannschaften besonders zurückhaltend.
Keine Trainernamen speichern.

## Betrieb

**Seite lokal testen:** `python -m http.server 8100` im Repository-Ordner,
dann `http://localhost:8100/` öffnen.

**Mehr:** `README.md` (Überblick und Betrieb), `docs/datenmodell.md`
(Datenfelder), `docs/textvorlagen.md`.
