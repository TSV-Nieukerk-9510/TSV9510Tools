/* Seite "Training": Trainingszeiten und Ansprechpartner je Mannschaft.
 *
 * Die Angaben stammen aus config/mannschaften.json und werden von Hand
 * gepflegt - FUSSBALL.DE kennt sie nicht. Fehlt etwas, sagt die Seite
 * das offen, statt eine Luecke zu kaschieren.
 */

(function () {
  "use strict";

  var ZEILEN = ["senioren", "jugend", "maedchen"];
  var WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag",
    "Freitag", "Samstag", "Sonntag"];

  var S = window.Seite;
  var text = S.text;

  function sortiereEinheiten(einheiten) {
    return einheiten.slice().sort(function (a, b) {
      var tagA = WOCHENTAGE.indexOf(a.tag);
      var tagB = WOCHENTAGE.indexOf(b.tag);

      if (tagA !== tagB) {
        return tagA - tagB;
      }
      return (a.von || "") < (b.von || "") ? -1 : 1;
    });
  }

  function trainingHtml(einheiten) {
    if (!einheiten || !einheiten.length) {
      return '<p class="leise">Trainingszeiten noch nicht hinterlegt.</p>';
    }

    var zeilen = sortiereEinheiten(einheiten).map(function (e) {
      var zeit = e.von && e.bis ? e.von + " – " + e.bis + " Uhr"
        : (e.von ? "ab " + e.von + " Uhr" : "");

      return "<tr><th>" + text(e.tag || "") + "</th>"
        + "<td>" + text(zeit) + "</td>"
        + '<td class="leise">' + text(e.ort || "") + "</td></tr>";
    });

    return '<table class="training">' + zeilen.join("") + "</table>";
  }

  function kontaktHtml(kontakte) {
    var gepflegt = (kontakte || []).filter(function (k) {
      return k.name || k.email || k.telefon;
    });

    if (!gepflegt.length) {
      return '<p class="leise">Ansprechpartner noch nicht hinterlegt.</p>';
    }

    var zeilen = gepflegt.map(function (k) {
      var wege = [];

      if (k.email) {
        wege.push('<a href="mailto:' + text(k.email) + '">'
          + text(k.email) + "</a>");
      }
      if (k.telefon) {
        wege.push(text(k.telefon));
      }

      return "<li><b>" + text(k.name || k.rolle || "") + "</b>"
        + (k.rolle && k.name ? ' <span class="leise">' + text(k.rolle)
          + "</span>" : "")
        + (wege.length ? '<span class="kontaktweg">' + wege.join(" · ")
          + "</span>" : "")
        + "</li>";
    });

    return '<ul class="kontakte">' + zeilen.join("") + "</ul>";
  }

  function karte(team, eintrag) {
    eintrag = eintrag || {};

    return '<article class="mannschaft" id="' + text(team.slug) + '">'
      + "<h3>" + text(team.short) + "</h3>"
      + '<p class="leise voller-name">' + text(team.name) + "</p>"
      + trainingHtml(eintrag.training)
      + (eintrag.hinweis
        ? '<p class="trainingshinweis">' + text(eintrag.hinweis) + "</p>"
        : "")
      + "<h4>Ansprechpartner</h4>"
      + kontaktHtml(eintrag.kontakt)
      + '<p class="mannschaft-links">'
      + '<a class="zeilen-knopf" href="index.html?team='
      + text(team.slug) + '">Spiele</a>'
      + '<a class="zeilen-knopf" href="kalender/' + text(team.slug)
      + '.ics">Kalender</a>'
      + "</p></article>";
  }

  S.start({
    seite: "training",
    braucht: ["teams", "mannschaften"],
    fertig: function (daten) {
      var ziel = document.getElementById("trainingbereich");
      var gruppen = daten.teams.groups || {};
      var pflege = (daten.mannschaften && daten.mannschaften.mannschaften)
        || {};
      var html = [];

      var gepflegt = Object.keys(pflege).filter(function (slug) {
        var e = pflege[slug];
        return e && ((e.training && e.training.length)
          || (e.kontakt || []).some(function (k) {
            return k.name || k.email || k.telefon;
          }));
      }).length;

      if (!daten.mannschaften) {
        html.push('<p class="warnung">Die Datei '
          + "<code>config/mannschaften.json</code> fehlt. Ohne sie kann "
          + "diese Seite nichts anzeigen.</p>");
      } else if (!gepflegt) {
        html.push('<p class="warnung">Für noch keine Mannschaft sind '
          + "Trainingszeiten hinterlegt. Die Angaben werden in "
          + "<code>config/mannschaften.json</code> gepflegt.</p>");
      }

      ZEILEN.forEach(function (schluessel) {
        var mannschaften = S.aktiveTeams().filter(function (team) {
          return team.group === schluessel;
        });

        if (!mannschaften.length) {
          return;
        }

        html.push("<h2>" + text(gruppen[schluessel] || schluessel)
          + "</h2>");
        html.push('<div class="mannschaft-raster">');

        mannschaften.forEach(function (team) {
          html.push(karte(team, pflege[team.slug]));
        });

        html.push("</div>");
      });

      ziel.innerHTML = html.join("");
    }
  });
}());
