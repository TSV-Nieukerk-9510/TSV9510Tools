# Textvorlagen

Auf der Website gibt es dafür die Seite **Textvorlagen** mit Auswahl von Mannschaft und Spiel; in der aufgeklappten Spielzeile der Spielübersicht führt außerdem der Knopf **E-Mail-Text erzeugen** dorthin. Er öffnet ein
Fenster, in dem aus einer Vorlage und den Spieldaten ein fertiger
E-Mail-Text entsteht — zum Prüfen, Anpassen und Kopieren. Verschickt
wird von Hand, aus dem eigenen Mailprogramm.

Alle Vorlagen stehen in **einer Textdatei**: `config/vorlagen.txt`. Sie
lässt sich ohne Programmierkenntnisse ändern.

## Eine Vorlage ändern

Datei öffnen, Text ändern, speichern, committen. Fertig — die Seite lädt
die Datei direkt, es ist kein weiterer Schritt nötig.

## Eine Vorlage anlegen

Am Ende der Datei eine neue Zeile `=== Platzsperre melden ===` anfügen
und darunter den Text schreiben. Der Titel erscheint in der Auswahl.

## Aufbau der Datei

* `=== Titel ===` beginnt eine Vorlage. Der Text reicht bis zur nächsten
  `===`-Zeile.
* `=== felder ===` ist ein besonderer Abschnitt: Beschriftungen für
  Eingabefelder, eine Zeile je Feld, `name = Beschriftung`.
* Zeilen mit `##` am Anfang sind Kommentare.

## Aufbau einer Vorlage

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
| `{{verein}}` | Vereinsname aus `config/spielbetrieb.json` |

**Alles andere** wird auf der Seite automatisch zu einem Eingabefeld.
Schreibst du `{{wetterlage}}` in eine Vorlage, erscheint dort ein Feld
dafür — ohne dass am Programmcode etwas geändert werden muss.

Die Beschriftung dieser Felder steht in `config/vorlagen.txt` im Abschnitt
`=== felder ===`. Fehlt ein Eintrag, wird der Platzhaltername selbst angezeigt.

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
