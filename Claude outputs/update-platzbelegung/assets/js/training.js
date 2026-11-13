/* Seiten "Trainingszeiten Sommer" und "Trainingszeiten Winter":
 * Trainingszeiten und Ansprechpartner je Mannschaft. Dieselbe Datei
 * bedient beide Seiten; welche Jahreszeit gilt, steht im Attribut
 * data-saison am body-Element der jeweiligen HTML-Seite.
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

  var SAISON = document.body.getAttribute("data-saison") === "winter"
    ? "winter" : "sommer";
  var SAISON_NAME = SAISON === "winter" ? "Winter" : "Sommer";

  /* Eine Mannschaft kann Zeiten je Jahreszeit haben. Aeltere Eintraege
   * (eine einfache Liste) gelten als Sommerzeiten. */
  function einheitenFuer(eintrag) {
    var t = eintrag && eintrag.training;

    if (Array.isArray(t)) {
      return SAISON === "sommer" ? t : [];
    }
    return (t && t[SAISON]) || [];
  }

  /* Ort als Zeile mit Anschrift und Kartenlink. */
  function ortZeile(titel, ort) {
    var anschrift = S.adresse(ort);
    var karte = S.kartenLink(ort);

    return "<li><b>" + titel + ":</b> " + text(ort.name)
      + (karte ? ' <a href="' + text(karte)
        + '" target="_blank" rel="noopener">Karte</a>' : "")
      + (anschrift ? '<span class="kontaktweg">' + text(anschrift)
        + "</span>" : "")
      + "</li>";
  }

  /* Haupt- und Nebenort der Mannschaft mit Kartenlink. */
  function orteHtml(eintrag) {
    var orte = S.orte();
    var zeilen = [];

    [["Hauptort", eintrag.hauptort], ["Nebenort", eintrag.nebenort]]
      .forEach(function (paar) {
        if (orte[paar[1]]) {
          zeilen.push(ortZeile(paar[0], orte[paar[1]]));
        }
      });

    return zeilen.length
      ? '<ul class="kontakte orte">' + zeilen.join("") + "</ul>" : "";
  }

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

  function trainingHtml(einheiten, eintrag) {
    if (!einheiten || !einheiten.length) {
      return '<p class="leise">Trainingszeiten ' + SAISON_NAME
        + " noch nicht hinterlegt.</p>";
    }

    var zeilen = sortiereEinheiten(einheiten).map(function (e) {
      var zeit = e.von && e.bis ? e.von + " – " + e.bis + " Uhr"
        : (e.von ? "ab " + e.von + " Uhr" : "");

      // Wo? Eigener Platz mit Feldteil, sonst der Ort. Was dem Hauptort
      // entspricht und keinen Feldteil hat, braucht keine Angabe.
      var r = S.aufloesen(e, eintrag);
      var wo = "";

      if (r.fehler) {
        wo = "? " + r.fehler;
      } else if (r.kuerzel) {
        wo = r.ort.name.replace(/ Nieukerk$/, "")
          + (r.feld && r.feld !== "G" ? ", " + S.felder[r.feld].name : "");
      } else if (r.ortKey !== eintrag.hauptort) {
        wo = r.ort.name;
      }

      return "<tr><th>" + text(e.tag || "") + "</th>"
        + "<td>" + text(zeit) + "</td>"
        + '<td class="leise">' + text(wo)
        + (e.hinweis ? (wo ? " · " : "") + text(e.hinweis) : "")
        + "</td></tr>";
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
      + orteHtml(eintrag)
      + trainingHtml(einheitenFuer(eintrag), eintrag)
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
    seite: "training-" + SAISON,
    braucht: ["teams", "spiele", "mannschaften"],
    fertig: function (daten) {
      var ziel = document.getElementById("trainingbereich");
      var gruppen = daten.teams.groups || {};
      var pflege = (daten.mannschaften && daten.mannschaften.mannschaften)
        || {};
      var html = [S.beispielHinweis(SAISON)];

      var gepflegt = Object.keys(pflege).filter(function (slug) {
        var e = pflege[slug];
        return e && einheitenFuer(e).length;
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
