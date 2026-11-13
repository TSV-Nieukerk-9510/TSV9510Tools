/* Gemeinsame Darstellung einer Spielzeile mit aufklappbaren Angaben.
 * Genutzt von der Spielübersicht und von den Trainingszeiten (naechste
 * Spiele einer Mannschaft).
 *
 *   Spielzeile.zeile(spiel, offen, optionen)
 *     optionen.team   Text der Mannschafts-Spalte (Standard: slug)
 *     optionen.ohneZeit  keine Uhrzeit-Spalte (steht in den Details)
 *     optionen.datum  Text; ist er gesetzt, steht er statt der
 *                     Mannschaft vor der Uhrzeit
 *     optionen.textKnopf  true: Knopf "E-Mail-Text erzeugen"
 */

window.Spielzeile = (function () {
  "use strict";

  var S = window.Seite;
  var text = S.text;

  function platzart(spiel, ausfuehrlich) {
    if (!spiel.pitch) {
      return "";
    }
    if (!spiel.pitchAssumed) {
      return text(spiel.pitch);
    }
    return text(spiel.pitch) + (ausfuehrlich
      ? ' <span class="stern">*</span> <span class="leise">angenommen, '
        + "FUSSBALL.DE nennt keine Platzart</span>"
      : '<span class="stern" title="von uns angenommen, FUSSBALL.DE '
        + 'nennt keine Platzart">*</span>');
  }

  /* fussball.de liefert den Namen verschleiert (Zeichen aus dem privaten
   * Unicode-Bereich, ausgelesen nur Kaestchen) oder gar nicht. */
  function schiedsrichter(spiel) {
    var name = spiel.referee || "";

    if (!name || /[\uE000-\uF8FF]/.test(name)) {
      return "k. A.";
    }
    return text(name);
  }

  /* Kinderfestival: fussball.de nennt den Gastgeber mit dem Zusatz
   * " - Kinderfestival". Statt des Zusatzes steht eine Marke. */
  var FESTIVAL = /\s*-\s*Kinderfestival\s*$/;

  function istFestival(spiel) {
    return FESTIVAL.test(spiel.home || "") || FESTIVAL.test(spiel.opponent || "");
  }

  function ohneFestival(name) {
    return String(name || "").replace(FESTIVAL, "");
  }

  /* Kleines Logo: Ball mit Funken. Heim gefuellt, auswaerts umrandet. */
  var BALL = '<svg viewBox="0 0 28 26" aria-hidden="true" focusable="false">'
    + '<circle cx="11" cy="13" r="9.5" fill="none" stroke="currentColor" '
    + 'stroke-width="2"/>'
    + '<path d="M11.0 9.4 L14.4 11.9 L13.1 15.9 L8.9 15.9 L7.6 11.9z" fill="currentColor"/>'
    + '<path d="M11.0 9.4L11.0 3.5M14.4 11.9L20.0 10.1M13.1 15.9L16.6 20.7M8.9 15.9L5.4 20.7M7.6 11.9L2.0 10.1" fill="none" stroke="currentColor" stroke-width="1.6"/>'
    + '<path d="M23 1l1.2 3.1 3.1 1.2-3.1 1.2L23 9.6l-1.2-3.1-3.1-1.2 3.1-1.2z" '
    + 'fill="currentColor"/></svg>';

  function marke(spiel) {
    if (istFestival(spiel)) {
      return '<span class="marke festival ' + (spiel.isHome ? "h" : "a")
        + '" title="Kinderfestival, '
        + (spiel.isHome ? "Heimspiel" : "Auswärtsspiel") + '">' + BALL
        + "</span>";
    }
    return '<span class="marke ' + (spiel.isHome ? "h" : "a") + '">'
      + (spiel.isHome ? "H" : "A") + "</span>";
  }

  function zeileDetails(spiel, optionen) {
    var reihen = [];

    function reihe(beschriftung, wert) {
      if (wert) {
        reihen.push("<dt>" + text(beschriftung) + "</dt><dd>" + wert
          + "</dd>");
      }
    }

    var wettbewerb = text(spiel.competition || "");

    if (spiel.matchDay) {
      wettbewerb += (wettbewerb ? ", " : "") + text(spiel.matchDay)
        + ". Spieltag";
    }

    reihe("Mannschaft", text(S.ohneVerein(spiel.teamName)));
    reihe("Begegnung", text(spiel.home) + " – " + text(spiel.away));
    reihe("Art", spiel.isHome ? "Heimspiel" : "Auswärtsspiel");
    if (spiel.isHome === false && spiel.ownVenue) {
      reihe("Hinweis", "Laut FUSSBALL.DE hat der Gegner Heimrecht, der "
        + "Spielort ist aber unsere eigene Anlage.");
    }
    reihe("Anstoß", text(S.datumLang(spiel.date))
      + (spiel.time ? ", " + text(spiel.time) + " Uhr"
        : ' <span class="leise">– Zeit steht noch nicht fest</span>'));
    reihe("Wettbewerb", wettbewerb);
    reihe("Spielnummer", text(spiel.matchNumber));
    reihe("Staffel-ID", text(spiel.divisionId));
    reihe("Spielstätte", text(spiel.venue));
    reihe("Anschrift", text(spiel.address));
    reihe("Platzart", platzart(spiel, true));
    reihe("Schiedsrichter", schiedsrichter(spiel));

    var links = [];

    if (spiel.url) {
      links.push('<a class="zeilen-knopf" href="' + text(spiel.url)
        + '" target="_blank" rel="noopener">Spiel auf FUSSBALL.DE</a>');
    }
    if (spiel.mapsUrl) {
      links.push('<a class="zeilen-knopf" href="' + text(spiel.mapsUrl)
        + '" target="_blank" rel="noopener">Sportanlage in Google Maps</a>');
    }
    if (spiel.divisionUrl) {
      links.push('<a class="zeilen-knopf" href="' + text(spiel.divisionUrl)
        + '" target="_blank" rel="noopener">Staffel und Tabelle</a>');
    }

    if (optionen.textKnopf) {
      links.push('<button type="button" class="zeilen-knopf tg-start"'
        + ' data-match="' + text(spiel.id) + '">E-Mail-Text erzeugen</button>');
    }

    return '<tr class="sp-details"><td colspan="3"><dl>'
      + reihen.join("") + "</dl>"
      + '<p class="detail-links">' + links.join("") + "</p></td></tr>";
  }

  function zeile(spiel, auf, optionen) {
    optionen = optionen || {};
    var unten = [];

    if (spiel.competition) {
      unten.push(text(spiel.competition));
    }
    if (spiel.venue) {
      unten.push(text(spiel.venue));
    }

    var belag = platzart(spiel, false);

    if (belag && (spiel.venue || "").indexOf(spiel.pitch) === -1) {
      unten.push(belag);
    }

    var zeit = spiel.allDay || !spiel.time
      ? '<td class="sp-zeit offen">Zeit offen</td>'
      : '<td class="sp-zeit">' + text(spiel.time) + "</td>";

    auf = Boolean(auf);

    var vorne = '<td class="sp-team" title="' + text(spiel.teamName) + '">'
      + text(optionen.datum || optionen.team || spiel.teamSlug) + "</td>";

    // Mit Datum steht es vor der Uhrzeit, sonst folgt die Mannschaft.
    return '<tr class="spiel' + (auf ? " auf" : "") + '">'
      + (optionen.ohneZeit ? vorne : optionen.datum ? vorne + zeit : zeit + vorne)
      + '<td class="sp-paarung">'
      + '<button type="button" class="partie" data-auf="' + text(spiel.id)
      + '" aria-expanded="' + auf + '"'
      + ' title="alle Angaben zum Spiel anzeigen">'
      + marke(spiel)
      + '<span class="sp-name">'
      + (optionen.gegner && spiel.opponent
        ? text(ohneFestival(spiel.opponent))
        : text(ohneFestival(spiel.home)) + " – "
          + text(ohneFestival(spiel.away))) + "</span>"
      + '<span class="pfeil-auf" aria-hidden="true">›</span>'
      + "</button>"
      + (unten.length ? '<span class="ort">' + unten.join(" · ")
        + "</span>" : "")
      + "</td>"
      + "</tr>"
      + (auf ? zeileDetails(spiel, optionen) : "");
  }

  return { zeile: zeile };
}());
