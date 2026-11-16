/* Seite "Trainingszeiten": je Mannschaft eine Karte mit Orten,
 * Trainingszeiten fuer Sommer und Winter, den naechsten drei Spielen
 * und den Ansprechpartnern.
 *
 * Die Zeiten stammen aus config/trainingsbetrieb.json und werden von Hand
 * gepflegt - FUSSBALL.DE kennt sie nicht. Die Spiele kommen von
 * FUSSBALL.DE (data/matches.json) und klappen wie in der Spielübersicht
 * auf. Die Bausteine liegen in mannschaftskarte.js und werden auch von
 * der Seite "Mannschaften" genutzt.
 */

(function () {
  "use strict";

  var ANZAHL_SPIELE = 3;

  var S = window.Seite;
  var M = window.Mannschaftskarte;
  var text = S.text;
  var offen = {};

  /* --- Karte -------------------------------------------------------- */

  function karte(team, eintrag, aktuell) {
    eintrag = eintrag || {};

    var voll = S.ohneVerein(team.name);
    var jsg = /JSG/.test(team.name);
    var reihenfolge = ["sommer", "winter"];

    return '<article class="mannschaft" id="'
      + text(team.slug.replace(/\W+/g, "-")) + '">'
      + "<h3>" + text(team.short)
      + (jsg ? ' <span class="marke-jsg" title="Spielgemeinschaft">JSG</span>'
        : "") + "</h3>"
      + (jsg ? '<p class="leise voller-name">' + text(voll) + "</p>" : "")
      + "<h4>Ansprechpartner</h4>"
      + M.kontaktHtml(eintrag.kontakt)
      + reihenfolge.map(function (saison) {
        return M.saisonHtml(saison, eintrag, aktuell);
      }).join("")
      + (eintrag.hinweis
        ? '<p class="trainingshinweis">' + text(eintrag.hinweis) + "</p>"
        : "")
      + (eintrag.ohneSpiele ? "" : M.spieleHtml(team.slug, offen, ANZAHL_SPIELE))
      + (eintrag.ohneSpiele ? "" : '<p class="mannschaft-links">'
        + '<a class="zeilen-knopf" href="index.html?team='
        + text(team.slug) + '">Alle Spiele</a>'
        + '<a class="zeilen-knopf" href="kalender/' + text(team.slug)
        + '.ics">Kalender</a>' + "</p>")
      + "</article>";
  }

  S.start({
    seite: "training",
    braucht: ["teams", "spiele", "mannschaften"],
    fertig: function (daten) {
      var ziel = document.getElementById("trainingbereich");
      var pflege = (daten.mannschaften && daten.mannschaften.mannschaften)
        || {};
      var aktuell = S.aktuelleSaison();
      var html = [];

      if (!daten.mannschaften) {
        html.push('<p class="warnung">Die Datei '
          + "<code>config/trainingsbetrieb.json</code> fehlt. Ohne sie kann "
          + "diese Seite nichts anzeigen.</p>");
      }

      var beispiel = Object.keys(S.saisonListe()).filter(S.istBeispiel)
        .map(function (k) { return S.saisonListe()[k].name || k; });

      if (beispiel.length) {
        html.push('<p class="warnung"><b>Beispieldaten.</b> Die Zeiten für '
          + text(beispiel.join(" und ")) + " sind nur Beispiele und noch "
          + "nicht die echten Trainingszeiten.</p>");
      }

      S.bereiche().forEach(function (bereich) {
        html.push("<h2>" + text(bereich.titel) + "</h2>");

        if (bereich.hinweis) {
          html.push('<p class="leise bereich-hinweis">'
            + text(bereich.hinweis) + "</p>");
        }

        html.push('<div class="mannschaft-raster">');
        bereich.teams.forEach(function (team) {
          html.push(karte(team, pflege[team.slug], aktuell));
        });

        // Gruppen ohne Spiele bei FUSSBALL.DE (z. B. Damen, Alte Herren)
        ((daten.mannschaften && daten.mannschaften.weitere) || [])
          .filter(function (g) { return g.bereich === bereich.schluessel; })
          .forEach(function (g) {
            var eintrag = Object.assign({ ohneSpiele: true,
              hauptort: "nieukerk-kunstrasen" }, g);

            html.push(karte({ slug: "w:" + g.name, name: g.name,
              short: g.name }, eintrag, aktuell));
          });
        html.push("</div>");
      });

      ziel.innerHTML = html.join("");

      // Spiele klappen wie in der Spielübersicht auf.
      M.spielKlick(ziel, offen, ANZAHL_SPIELE);
    }
  });
}());
