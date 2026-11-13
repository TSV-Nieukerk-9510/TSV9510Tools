# Textvorlagen

Auf der Website gibt es dafür die Seite **Textbausteine** mit Auswahl von Mannschaft und Spiel; in der aufgeklappten Spielzeile der Spielübersicht führt außerdem der Knopf **E-Mail-Text erzeugen** dorthin. Er öffnet ein
Fenster, in dem aus einer Vorlage und den Spieldaten ein fertiger
E-Mail-Text entsteht — zum Prüfen, Anpassen und Kopieren. Verschickt
wird von Hand, aus dem eigenen Mailprogramm.

Die Vorlagen liegen unter `templates/` als **einfache Textdateien** und
lassen sich ohne Programmierkenntnisse ändern.

## Eine Vorlage ändern

Datei öffnen, Text ändern, speichern, committen. Fertig — die Seite lädt
die Vorlage direkt, es ist kein weiterer Schritt nötig.

## Eine Vorlage anlegen

1. Neue Textdatei unter `templates/` anlegen, z. B. `platzsperre.txt`.
2. In `templates/manifest.json` unter `vorlagen` eintragen:

```json
{ "datei": "platzsperre.txt", "titel": "Platzsperre melden" }
```

## Aufbau einer Vorlagendatei

Die **erste Zeile** darf mit `Betreff:` beginnen — dieser Teil wird auf
der Seite als eigenes Feld mit eigenem Kopierknopf angezeigt. Alles
darunter ist der Text.

```
Betreff: Spielabsage – Spiel {{spielnummer}} – {{heim}} gegen {{gast}}

Sehr geehrte Damen und Herren,

hiermit sagen wir die Begegnung {{heim}} – {{gast}}
am {{datum}} um {{uhrzeit}} Uhr ab.

Grund: {{grund}}

Mit freundlichen Grüßen
{{absender}}
```

## Platzhalter

Alles in doppelten geschweiften Klammern wird ersetzt.

**Aus den Spieldaten** — werden automatisch gefüllt:

| Platzhalter | Inhalt |
|---|---|
| `{{spielnummer}}` | amtliche Spielnummer, z. B. 220545113 |
| `{{spieltag}}` | z. B. „15. Spieltag" |
| `{{staffelid}}` | Staffel-ID aus dem DFBnet |
| `{{wettbewerb}}` | z. B. „Kreisliga A" |
| `{{mannschaft}}` | eigene Mannschaft |
| `{{heim}}` / `{{gast}}` | die beiden Mannschaften |
| `{{gegner}}` | der Gegner, egal ob Heim oder Auswärts |
| `{{heimauswaerts}}` | „Heimspiel" oder „Auswärtsspiel" |
| `{{datum}}` | z. B. „Sonntag, 06. Dezember 2026" |
| `{{uhrzeit}}` | z. B. „15:30", sonst „noch offen" |
| `{{spielort}}` | vollständige Spielstätte |
| `{{anlage}}` / `{{adresse}}` | dasselbe aufgeteilt |
| `{{anfahrt}}` | Kartenlink |
| `{{schiedsrichter}}` | sofern schon angesetzt |
| `{{spielseite}}` | Link zum Spiel auf FUSSBALL.DE |
| `{{staffelseite}}` | Link zur Staffel |
| `{{verein}}` | Vereinsname aus `config/club.json` |

**Alles andere** wird auf der Seite automatisch zu einem Eingabefeld.
Schreibst du `{{wetterlage}}` in eine Vorlage, erscheint dort ein Feld
dafür — ohne dass am Programmcode etwas geändert werden muss.

Die Beschriftung dieser Felder steht in `templates/manifest.json` unter
`felder`. Fehlt ein Eintrag, wird der Platzhaltername selbst angezeigt.

Was der Benutzer in solche Felder tippt, merkt sich der Browser für das
nächste Mal — Name, Funktion und Telefonnummer sind damit nur einmal
einzugeben. Das bleibt auf dem jeweiligen Gerät und wird nirgends
hochgeladen.

## Was bewusst fehlt

**Empfängeradressen.** Die Vorlagen erzeugen nur den Text. Wer die Mail
bekommt — Staffelleiter, Gegner, Schiedsrichter — entscheidet der
Benutzer beim Verschicken. Solche Kontaktdaten liefert fussball.de
nicht, und sie gehören auch nicht in ein öffentliches Repository.

**Automatischer Versand.** Bewusst nicht vorgesehen: eine Absage sollte
jemand gelesen haben, bevor sie rausgeht.
