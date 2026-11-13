# TSV9510Tools

Spielpläne, Termine und Kalender-Abos des **TSV 95/10 Nieukerk e.V.**.

Die Daten stammen von FUSSBALL.DE, werden automatisch abgerufen und als
JSON, als Webseite und als abonnierbare Kalenderdateien bereitgestellt.

**Seite:** https://tsv-nieukerk-9510.github.io/TSV9510Tools

## Wie es aufgebaut ist

```
fussball.de  ──►  data/*.json  ──►  Website (index.html)
                       │
                       ├──────────►  kalender/*.ics  ──►  qr/*.svg
                       └──────────►  später: Android-App
```

Der Abruf von fussball.de findet an **genau einer Stelle** statt:
`scripts/common/fussballde.py`. Alles andere arbeitet nur noch mit den
JSON-Dateien unter `data/`. Ändert fussball.de seinen Seitenaufbau, ist
nur diese eine Datei anzupassen.

Das Datenmodell ist in [`docs/datenmodell.md`](docs/datenmodell.md)
beschrieben. Es ist der Vertrag für alles, was später darauf aufsetzt.

## Verzeichnisse

| Pfad | Inhalt |
|---|---|
| `config/` | **von Hand gepflegt** — Vereinsdaten, Mannschaftskürzel, Trainingszeiten und Ansprechpartner |
| `templates/` | **von Hand gepflegt** — Textvorlagen für die E-Mail-Vorschläge |
| `scripts/` | Abruf und Erzeugung |
| `data/` | **automatisch erzeugt** — die Schnittstelle |
| `kalender/` | **automatisch erzeugt** — die `.ics`-Dateien |
| `qr/` | **automatisch erzeugt** — ein QR-Code (SVG) je Kalender |
| `assets/`, `*.html` | die Webseite |
| `docs/` | Dokumentation |

## Die Seiten

Das Menü hat zwei Ebenen: oben die Bereiche, darunter die Seiten des
geöffneten Bereichs. Alle Seiten lassen sich per `?embed=1` ohne Kopf-
und Fußzeile einbetten.

| Bereich | Seite | Datei |
|---|---|---|
| Spielübersicht | Spielübersicht | `index.html` |
| Trainingsplan | Trainingszeiten | `training.html` |
| | Platzbelegung | `platzbelegung.html` |
| | Sportanlage | `sportanlage.html` (Texte und Fotos in `config/sportanlage.json`, Bilder in `assets/img/`) |
| Tools | Kalender | `kalender.html` |
| | Textvorlagen | `textgenerator.html` |
| FAQ | FAQ | `faq.html` (Inhalt: `config/faq.json`) |

Die Menüeinträge stehen an **einer** Stelle: `NAVIGATION` oben in
`assets/js/seite.js`. Dort wird auch eine neue Seite eingetragen.
`training.html` leitet nur noch auf die Sommerseite weiter und kann bei
Gelegenheit gelöscht werden.

### Spielübersicht

Alle Spiele nach Spieltagen gruppiert. Die Seite beginnt immer beim
nächsten Spieltag; bereits gespielte Begegnungen bleiben erhalten und
lassen sich in Fünferschritten darüber einblenden. Die Filter stehen in
vier Zeilen — Übersicht, Senioren, Junioren, Juniorinnen — dazu die
zentrale Wahl zwischen allen, nur Heim- oder nur Auswärtsspielen.

Ein Klick auf die Paarung klappt alle Angaben zum Spiel auf:
Spielnummer, Staffel-ID, Spielstätte mit Anschrift, Platzart,
Schiedsrichter, dazu die Verknüpfungen zu FUSSBALL.DE, Google Maps und
zur Staffel. Ein `*` hinter der Platzart bedeutet: angenommen,
FUSSBALL.DE nennt keine.

Per Adresszusatz lässt sich die Seite zuschneiden — gedacht für die
Mannschaftsseiten auf der Vereinsseite:

```
…/TSV9510Tools/?embed=1&team=tsv-h1
…/TSV9510Tools/?embed=1&gruppe=jugend&seite=heim
```

| Zusatz | Wirkung |
|---|---|
| `embed=1` | Kopf- und Fußzeile ausblenden |
| `team=<kürzel>` | eine Mannschaft vorauswählen |
| `gruppe=senioren\|jugend\|maedchen` | eine ganze Gruppe vorauswählen |
| `seite=heim\|auswaerts` | nur Heim- oder Auswärtsspiele |
| `frueher=<zahl>` | so viele vergangene Spieltage gleich mit anzeigen (`alle` für die ganze Rückschau) |

### Kalender

Gegliedert wie die Spielübersicht: Sammelkalender (alle Mannschaften,
Heimspiele Kunstrasen, Heimspiele Naturrasen), dann je Gruppe der
Gruppenkalender und darunter die einzelnen Mannschaften. Jeder Eintrag
klappt auf und zeigt die Adresse zum Kopieren, den QR-Code und die
Knöpfe. Die Erklärungen sind standardmäßig zugeklappt.

**So sehen die Termine aus:**

* Der Termin beginnt zur **Anstoßzeit** und dauert die Regelspielzeit
  samt Halbzeitpause (`spielzeit` je Mannschaft in
  `config/teams.map.json`).
* **Keine ganztägigen Einträge.** Steht noch keine Zeit fest, gilt die
  übliche Anstoßzeit der Mannschaft (`anstoss`). Der Betreff beginnt
  dann mit `?`, und die Beschreibung beginnt mit einem Hinweis.
* **Sommer- und Winterzeit** stimmen automatisch (Zeitzone
  `Europe/Berlin`).
* **Kurzer Betreff** für kleine Bildschirme: im Mannschaftskalender nur
  `H Gegner` oder `A Gegner`, im Sammelkalender zusätzlich die
  Mannschaft davor.
* Die **Beschreibung** enthält dieselben Angaben wie die aufgeklappte
  Spielzeile der Übersicht, dazu die Links zu FUSSBALL.DE, Google Maps,
  Staffel und zur Spielübersicht dieser Seite.

Ein Abo aktualisiert sich von selbst (Aktualisierungsintervall
6 Stunden, soweit das Kalenderprogramm es beachtet). Wer die Datei nur
herunterlädt, importiert einen Stand, der sich nicht mehr ändert.

### Trainingszeiten

Trainingszeiten und Ansprechpartner je Mannschaft, gepflegt von Hand in
`config/mannschaften.json`. Die Datei ist oben selbst erklärt; in Kürze:

* **`bereiche`** — Gliederung der Seite (Senioren, Leistungsbereich,
  Entwicklungsbereich, Mädchen) mit den Mannschaften je Bereich.
* **`stand_trainingszeiten`** — Datum der letzten Änderung der Zeiten
  (JJJJ-MM-TT); erscheint im Kopf der Trainingsseiten.
* **`saisons`** — `sommer` (Kunstrasen KR und Naturrasen NR, Felder G/H/V)
  und `winter` (nur KR, zusätzlich Drittel D). `ab` ist der erste Tag der
  Jahreszeit; die Platzbelegung öffnet die gerade gültige.
* **`orte`** — jede Trainingsstätte einmal als vollständiges Datenpaket:
  `name`, `abk` (Abkürzung, die in Klammern hinter dem Tag steht, z. B. `TSV`,
  `FCA`), `strasse`, `plz`, `ort`, optional `karte` (eigener Kartenlink,
  sonst wird er aus der Anschrift gebaut), bei eigenen Plätzen `kuerzel`
  (`KR`/`NR`) und `rasen`.
* **`hauptort`** bei jeder Mannschaft, **`nebenort`** optional (etwa die
  JSG-Jugend, die auch in Aldekerk trainiert). Beide zeigen Adresse und
  Kartenlink.
* **`training`** getrennt nach `sommer` und `winter`. Eine Einheit hat
  `tag`, `von`, `bis` und entweder `platz` (Code `PLATZ-TEIL`, z. B.
  `NR-H1` = Naturrasen Hälfte 1, `KR-H2` = Kunstrasen Hälfte 2, `KR-D2` =
  Kunstrasen Drittel 2, `KR-V3` = Viertel 3, `KR-G` = ganzes Feld) oder
  `ort` (`neben`, `haupt` oder ein Schlüssel aus `orte`).
* Die Ansprechpartner gelten für beide Jahreszeiten.
* **`beispieldaten: true`** blendet auf den Seiten einen Hinweis ein,
  dass die Zeiten nur Beispiele sind. Vor dem Veröffentlichen echter
  Zeiten auf `false` setzen.

**Datenschutz:** das Repository ist öffentlich — dort nur
Funktionsadressen des Vereins eintragen, keine privaten Nummern oder
Adressen. Leere Felder zeigt die Seite als „noch nicht hinterlegt“.

### Platzbelegung

Ganz oben der **Tagesplan**: Auswahl Mo–So, darunter für Sommer und Winter
eine Zeitleiste (je Platz zwei Zeilen Hälfte 1/2, Balken über die Uhrzeit;
Überschneidungen rot, Lücken sichtbar). Darunter je Jahreszeit eine Tabelle: eine Zeile je Wochentag,
je Platz und je Fremdanlage eine Spalte, jeder Eintrag zweizeilig (Uhrzeit,
darunter Mannschaft und Platzteil). Darunter eine Grafik der Platzteile
(Hälften, Drittel, Viertel) und die kommenden Spiele auf den eigenen Plätzen.
Sommer und Winter sind getrennte Daten; welche Platzteile erlaubt sind,
steht je Jahreszeit unter `saisons` (`felder`: `H`, `D`, `V`).

Die Auswahlleiste und die Platzansicht mit den gezeichneten Plätzen sind
im Code fertig, aber vorerst abgeschaltet (`MIT_PLATZANSICHT` in
`assets/js/platzbelegung.js`).

Der Teil des Platzes kommt aus dem Code im Feld `platz` jeder Einheit
(H1/H2 Hälften, D1–D3 Drittel nur im Winter, V1–V4 Viertel; V1 links oben,
V2 links unten, V3 rechts oben, V4 rechts unten). Es wird höchstens eine
Hälfte eingetragen; ein ganzes Feld (G) meldet die Seite als
Unstimmigkeit. Weitere Felder in der Config:

* `bereich` bei einer Gruppe unter `weitere` (z. B. `"senioren"`): die Gruppe erscheint dann als eigene Karte ohne Spiele in diesem Bereich der Trainingszeiten und in der Platzbelegung (z. B. Damen 1, Alte Herren). `kontakt` wie bei den Mannschaften.
* `hinweis` je Einheit (z. B. „nach Bedarf“),
* `zusammen: "<slug>"` bei gemeinsamem Training zweier Mannschaften
  (G1+G2: ein gemeinsamer Block ohne Doppelbelegung),
* `weitere`: Gruppen ohne Mannschaftsseite (Alte Herren, Damen,
  Ballgruppe, Gastverein), die nur in der Platzbelegung erscheinen,
* `platzansicht.drehung` (`rechts`/`links`): Drehung der hochkant gezeichneten
  Plätze (links Naturrasen mit Laufbahn, rechts Kunstrasen), damit die
  Hälften zur Lage des Vereinsheims passen,
* Gäste (`art: gast`) wie der SV Sevelen werden bei Bedarf ergänzt oder entfernt,
* `beispieldaten` je Jahreszeit: `{"sommer": false, "winter": true}`.

Überschneiden sich zwei Mannschaften auf demselben Teil, wird das rot
markiert. Darunter stehen die kommenden Spiele auf der eigenen Anlage
(von FUSSBALL.DE). Geöffnet wird die Jahreszeit, die laut `saisons.*.ab`
gerade gilt.

### FAQ

`faq.html` zeigt häufige Fragen, nach Seiten gegliedert, mit Suche. Der
Inhalt steht in `config/faq.json` (Gruppen mit Fragen und Antworten;
`**fett**` und `[Text](seite.html)` sind erlaubt).

### Textvorlagen

Auswahl von Mannschaft und Spiel, daraus entsteht ein fertiger Text zum
Absagen, Verlegen oder Weitergeben eines Spiels — mit Spielnummer,
Staffel und Spielstätte bereits eingesetzt. Kopieren und selbst
verschicken. Die Vorlagen liegen als Textdateien unter `templates/` und
sind dort frei änderbar, siehe [`docs/textvorlagen.md`](docs/textvorlagen.md).

## Ablauf

Ein Lauf besteht aus vier Schritten, die aufeinander aufbauen:

```bash
python scripts/fetch_teams.py      # fussball.de  -> data/teams.json
python scripts/fetch_matches.py    # fussball.de  -> data/matches.json
python scripts/build_calendars.py  # data/*.json  -> kalender/*.ics
python scripts/build_qr.py         # Kalender-Adressen -> qr/*.svg
```

Die ersten beiden brauchen Internet und `requests`, `beautifulsoup4`
und `lxml`. Die letzten beiden arbeiten nur mit den JSON-Dateien und
brauchen **keine** zusätzlichen Pakete (der QR-Code-Erzeuger ist
selbst geschrieben). `build_qr.py --pruefen` liest jeden Code zur
Kontrolle wieder ein; dafür wird `opencv-python-headless` benötigt.

Automatisch erledigt das der Workflow
[`.github/workflows/update-data.yml`](.github/workflows/update-data.yml)
alle sechs Stunden. Er committet nur, wenn sich tatsächlich etwas
geändert hat.

**Die Adresse der QR-Codes** stammt aus `base_url` in
`config/club.json`. Zieht die Seite um (eigene Domain), dort ändern und
den Workflow neu starten — die Codes entstehen neu. Bereits gedruckte
Codes führen dann ins Leere.

## Schriften

Die Seite liefert ihre Schriften selbst aus und lädt nichts von Google
nach. Das ist Absicht: eingebettet auf der Vereinsseite würde ein
Zugriff auf Google-Server deren Cookie-Hinweis unterlaufen.

Die Schriftdateien holt ein eigenes Skript, das **einmalig** läuft:

```bash
python scripts/fetch_fonts.py
```

Es lädt die Dateien nach `assets/fonts/` und schreibt
`assets/css/fonts.css`. Beides danach committen.

Ändern sich die Schriften der Vereinsseite, genügt es, oben in
`scripts/fetch_fonts.py` die Liste `SCHRIFTEN` anzupassen und das
Skript erneut auszuführen — und in `assets/css/style.css` die beiden
Variablen `--schrift` und `--schrift-eng` auf die neuen Namen zu setzen.
Sonst ist nirgends etwas zu ändern.

Solange die Dateien fehlen, nutzt die Seite die Systemschrift. Sie
bleibt vollständig lesbar, sieht nur anders aus.

## Lokal ausprobieren

```bash
pip install requests beautifulsoup4 lxml
py scripts\fetch_teams.py        # Windows
python scripts/fetch_teams.py    # Linux/macOS
```

Die Skripte finden ihre Module selbst; `PYTHONPATH` muss nicht gesetzt
werden.

Die Reihenfolge der vier Skripte steht oben unter „Ablauf“. Für die Webseite reicht Doppelklick auf `index.html` **nicht** — der
Browser darf von `file://` aus keine JSON-Dateien nachladen. Stattdessen
einen kleinen Server starten:

```bash
python -m http.server 8000
```

Dann http://localhost:8000 im Browser öffnen.

## Eine neue Mannschaft ist dazugekommen

`fetch_teams.py` erkennt sie selbst und meldet sie am Ende des Laufs mit
einem Vorschlag. Dieser Eintrag gehört nach `config/teams.map.json` — mit
einem Kürzel, das dauerhaft so bleibt.

Warum das wichtig ist: Dateinamen und damit alle Kalender-Abos hängen an
diesem Kürzel, nicht am Mannschaftsnamen. Wird eine Mannschaft auf
fussball.de umbenannt, läuft das Abo trotzdem weiter.

## Neue Saison

In `config/club.json` die `season` hochsetzen (Format `2627` für die
Saison 2026/27) und den Workflow einmal von Hand starten.

## Hinweis

Alle Angaben ohne Gewähr. Verbindlich ist der Spielplan auf
[fussball.de](https://www.fussball.de).
