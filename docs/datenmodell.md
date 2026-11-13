# Datenmodell

Dieses Dokument beschreibt die Dateien unter `data/`. Sie sind die
Schnittstelle des Projekts: Website, Kalenderdateien und später die
Android-App lesen ausschließlich daraus und sprechen nie selbst mit
fussball.de.

Wer etwas Neues auf diese Daten aufsetzt, braucht nur dieses Dokument.

## Grundsätze

1. **Die `team-id` von fussball.de ist der Anker.** Sie bleibt gleich,
   auch wenn eine Mannschaft umbenannt wird.
2. **Der `slug` ist dauerhaft.** Er bestimmt Dateinamen und öffentliche
   URLs. Einmal veröffentlicht, wird er nie wieder geändert — sonst
   laufen bestehende Kalender-Abos still ins Leere. Festgelegt wird er
   von Hand in `config/teams.map.json`.
3. **Namen sind Anzeigetext, nie Schlüssel.** Nichts im Code darf sich
   auf einen Mannschaftsnamen verlassen.
4. **Ein fehlgeschlagener Abruf löscht nichts.** Lässt sich eine
   Mannschaft nicht laden, bleibt ihr letzter bekannter Stand erhalten
   und die Datei wird als `incomplete` markiert.

## Öffentliche URLs

Alles unter `data/` wird von GitHub Pages ausgeliefert und ist damit
direkt abrufbar:

```
https://tsv-nieukerk-9510.github.io/TSV9510Tools/data/teams.json
https://tsv-nieukerk-9510.github.io/TSV9510Tools/data/matches.json
https://tsv-nieukerk-9510.github.io/TSV9510Tools/kalender/<slug>.ics
```

Das ist die Adresse, die die Android-App später abfragt.

## data/teams.json

```json
{
  "generated": "2026-11-12T20:15:00+00:00",
  "season": "2627",
  "club": { "id": "00ES…", "name": "TSV Nieukerk 95/10", "short_name": "TSV Nieukerk" },
  "groups": { "senioren": "Senioren", "jugend": "Junioren", "maedchen": "Juniorinnen" },
  "teams": [
    {
      "id": "011MIE0NA8000000VTVG0001VTR8C1K7",
      "slug": "tsv-h1",
      "name": "Herren - TSV Nieukerk",
      "short": "Herren 1",
      "group": "senioren",
      "order": 10,
      "url": "https://www.fussball.de/mannschaft/…",
      "active": true,
      "mapped": true,
      "calendar": "kalender/tsv-h1.ics",
      "duration": 105,
      "kickoff": "15:00"
    }
  ]
}
```

| Feld | Bedeutung |
|---|---|
| `id` | team-id von fussball.de, dauerhaft |
| `slug` | dauerhaftes Kürzel, bestimmt Datei- und URL-Namen |
| `name` | Anzeigename von fussball.de, kann sich ändern |
| `short` | Kurzform für enge Darstellungen, z. B. „Herren 1" |
| `group` | Schlüssel aus `groups`, für Gruppierung und Sammelkalender |
| `order` | Sortierreihenfolge in Listen |
| `active` | `false`, sobald die Mannschaft nicht mehr gemeldet ist |
| `mapped` | `false`, wenn der Slug nur vorläufig erzeugt wurde |
| `duration` | Regelspielzeit **inklusive Halbzeitpause** in Minuten — Dauer des Kalendereintrags |
| `kickoff` | übliche Anstoßzeit der Mannschaft — Ersatz, wenn fussball.de noch keine Zeit nennt |

## data/matches.json

```json
{
  "generated": "2026-11-12T20:15:00+00:00",
  "season": "2627",
  "count": 312,
  "incomplete": false,
  "failedTeams": [],
  "matches": [
    {
      "id": "031JH22060000000VS5489BUVVKNMR0J",

      "teamId": "011MIE0NA8000000VTVG0001VTR8C1K7",
      "teamSlug": "tsv-h1",
      "teamName": "Herren - TSV Nieukerk",

      "date": "2026-12-06",
      "time": "15:30",
      "startTime": "15:30",
      "timeAssumed": false,
      "duration": 105,
      "start": "2026-12-06T15:30:00+01:00",

      "matchNumber": "220545113",
      "matchDay": "15",
      "divisionId": "220545",
      "divisionUrl": "https://www.fussball.de/spieltag/…",
      "competition": "Kreisliga A",

      "home": "TSV Nieukerk",
      "away": "SV Walbeck",
      "isHome": true,
      "opponent": "SV Walbeck",
      "homeTeamId": "011MIE0NA8000000VTVG0001VTR8C1K7",
      "awayTeamId": "011MIE876K000000VTVG0001VTR8C1K7",
      "homeClubUrl": "https://www.fussball.de/verein/…",
      "awayClubUrl": "https://www.fussball.de/verein/…",

      "venue": "Kunstrasenplatz, Kunstrasen TSV Nieukerk, Am Aermen Düwel 16, 47647 Kerken",
      "venueName": "Kunstrasenplatz, Kunstrasen TSV Nieukerk",
      "address": "Am Aermen Düwel 16, 47647 Kerken",
      "mapsUrl": "https://www.google.de/maps?q=…",
      "pitch": "Kunstrasen",

      "referee": "",
      "result": null,
      "url": "https://www.fussball.de/spiel/…"
    }
  ]
}
```

| Feld | Bedeutung |
|---|---|
| `id` | Spiel-ID aus der URL; wird als UID im Kalender verwendet |
| `time` | Anstoßzeit **wie von fussball.de geliefert**; leer, wenn noch keine feststeht |
| `startTime` | Anstoßzeit, mit der gerechnet wird — `time` oder ersatzweise `kickoff` der Mannschaft |
| `timeAssumed` | `true`, wenn `time` leer war und `startTime` nur angenommen ist |
| `duration` | Regelspielzeit samt Pause in Minuten |
| `start` | Anstoß (`startTime`) mit Zeitzonen-Angabe `Europe/Berlin` — das Feld für Programme |
| `matchNumber` | amtliche Spielnummer — **das**, was der Staffelleiter braucht |
| `matchDay` | Spieltag als blanke Zahl, z. B. `"15"` |
| `divisionId` | Staffel-ID aus dem DFBnet |
| `isHome` | eigene Mannschaft ist Heimmannschaft |
| `opponent` | Gegner, unabhängig von Heim oder Auswärts |
| `venue` | vollständige Angabe zur Spielstätte, wie fussball.de sie nennt |
| `venueName` / `address` | dieselbe Angabe aufgeteilt; `address` beginnt mit der Straße |
| `mapsUrl` | fertiger Kartenlink von fussball.de |
| `pitch` | `Kunstrasen`, `Naturrasen`, `Hartplatz`, `Halle` oder leer |
| `pitchAssumed` | `true`, wenn die Platzart **angenommen** wurde — siehe unten |
| `ownVenue` | Spiel findet auf eigener Anlage statt — Grundlage für den Platzbelegungsplan |
| `referee` | Schiedsrichter, meist erst kurz vor dem Spiel gefüllt |
| `result` | **immer `null`** — siehe unten |
| `incomplete` | `true`, wenn beim letzten Lauf Mannschaften fehlten |

### Warum `result` leer bleibt

Ergebnis und Anstoßzeit stehen auf der Spielseite nicht im Klartext.
fussball.de setzt dort eine Verschleierung ein: die Ziffern werden als
Zeichen aus dem privaten Unicode-Bereich ausgeliefert
(`<span data-obfuscation="…">&#xEB29;&#xEC94;…</span>`) und erst durch
eine mitgelieferte Schriftart lesbar. Wer den Text ausliest, bekommt
Platzhalterzeichen.

Für die **Anstoßzeit** ist das folgenlos: die holen wir aus dem
Spielplan-Endpunkt, dort steht sie im Klartext. Für **Ergebnisse** gibt
es keinen solchen Ausweichweg. Sie bleiben deshalb vorerst außen vor.
Das Feld ist trotzdem vorhanden, damit später nichts umgebaut werden
muss. Geplantes Format:

```json
"result": { "home": 2, "away": 1, "status": "final" }
```

### Anstoßzeit, Sommer- und Winterzeit

Es gibt keine ganztägigen Spiele. Steht auf fussball.de noch keine Zeit
(bei Jugendspielen häufig), setzt `fetch_matches.py` die übliche
Anstoßzeit der Mannschaft (`anstoss` in `config/teams.map.json`) ein und
setzt `timeAssumed: true`. Der Kalendereintrag trägt dann ein `?` vor
dem Betreff und einen Hinweis ganz oben in der Beschreibung.

`start` wird mit `zoneinfo` (`Europe/Berlin`) gebildet und kennt die
Umstellung zwischen Sommer- und Winterzeit: `…T15:00:00+02:00` im
Sommer, `…T15:00:00+01:00` im Winter. Die Kalenderdateien rechnen auf
UTC um; das Kalenderprogramm zeigt die Ortszeit richtig an.

### Platzart und Platzbelegungsplan

`pitch` wird aus dem Text der Spielstätte abgeleitet. Die CSS-Klasse des
Kopfbereichs auf fussball.de (`stage match grass`) taugt **nicht** als
Ersatz: sie stand im geprüften Beispiel auf `grass`, obwohl die Anlage
ein Kunstrasenplatz ist. Sie ist reine Gestaltung.

Viele Jugendspiele nennen gar keine Platzart. Dann gilt:

* **Heimspiel ohne Angabe** → `pitch` wird auf `default_home_pitch` aus
  `config/club.json` gesetzt (derzeit `Kunstrasen`) und
  `pitchAssumed: true` gesetzt. Auf der Seite erscheint ein `*`, in
  der Beschreibung des Kalenders derselbe Hinweis.
* **Auswärtsspiel ohne Angabe** → `pitch` bleibt leer. Über fremde
  Anlagen lässt sich nichts annehmen.

`ownVenue` ist davon unabhängig und sagt, ob das Spiel auf einer
eigenen Anlage stattfindet: die Spielstätte enthält einen der Orte aus
`home_venues`, oder es ist ein Heimspiel ohne Ortsangabe. Dieses Feld —
nicht `isHome` — ist die richtige Grundlage für einen
Platzbelegungsplan: Spielgemeinschaften tragen ihre Heimspiele teils auf
fremden Plätzen aus.

## Erweitern

Neue Daten kommen als **eigene Datei** unter `data/` dazu, bestehende
Felder werden nicht umbenannt. Beispiele für später: `data/tables.json`
für Tabellenstände, `data/venues.json` für Sportanlagen mit Adresse und
Koordinaten, `data/news.json` für Vereinsmeldungen.

So kann eine ältere App-Version weiterlaufen, während die Website schon
neue Felder nutzt.
