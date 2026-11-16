/* Seite "Tabelle": aktuelle Ligatabelle je Mannschaft.
 *
 * Die Daten holt scripts/fetch_tables.py von FUSSBALL.DE nach
 * data/tables.json. Einstellungen (an/aus, Mannschaften ohne Tabelle):
 * Abschnitt "tabellen" in config/spielbetrieb.json.
 */

(function () {
  "use strict";

  var S = window.Seite;
  var text = S.text;

  var zustand = { team: "" };
  var tabellen = {};
  var teams = [];
  var spiele = [];

  function staffel(slug) {
    for (var i = 0; i < spiele.length; i++) {
      if (spiele[i].teamSlug === slug && spiele[i].competition) {
        return spiele[i].competition;
      }
    }
    return "";
  }

  function auswahl() {
    return '<div class="segment tabelle-wahl" id="tabellenwahl">'
      + teams.map(function (t) {
        return '<button type="button" class="chip"'
          + ' aria-pressed="' + (t.slug === zustand.team) + '"'
          + ' data-team="' + text(t.slug) + '" title="' + text(t.name)
          + '">' + text(t.short) + "</button>";
      }).join("") + "</div>";
  }

  function tabelleHtml(slug) {
    var t = tabellen[slug];
    var team = S.team(slug);

    if (!t) {
      return '<p class="leise">Für diese Mannschaft gibt es keine '
        + "Tabelle.</p>";
    }

    var spalten = t.columns || [];
    var kopf = spalten.length
      ? "<thead><tr>" + spalten.map(function (s, i) {
        return '<th class="' + (i > 1 ? "zahl" : "") + '">' + text(s)
          + "</th>";
      }).join("") + "</tr></thead>" : "";

    var zeilen = t.rows.map(function (z) {
      return '<tr class="' + (z.own ? "eigen" : "") + '">'
        + z.cells.map(function (c, i) {
          return (i === 0 ? '<th scope="row">' : '<td class="'
            + (i > 1 ? "zahl" : "") + '">') + text(c)
            + (i === 0 ? "</th>" : "</td>");
        }).join("") + "</tr>";
    }).join("");

    var liga = staffel(slug);

    return "<h2>" + text(team ? team.name : slug) + "</h2>"
      + (liga ? '<p class="leise">' + text(liga) + "</p>" : "")
      + '<div class="wt-rahmen"><table class="wochentabelle liga">' + kopf
      + "<tbody>" + zeilen + "</tbody></table></div>"
      + (t.source ? '<p class="leise"><a href="' + text(t.source)
        + '" target="_blank" rel="noopener">Tabelle bei FUSSBALL.DE</a></p>'
        : "");
  }

  function zeichne() {
    var ziel = document.getElementById("tabellenbereich");

    ziel.innerHTML = auswahl()
      + '<div id="tabelleninhalt">' + tabelleHtml(zustand.team) + "</div>";
  }

  S.start({
    seite: "tabelle",
    braucht: ["teams", "spiele", "tabellen"],
    fertig: function (daten) {
      var ziel = document.getElementById("tabellenbereich");

      tabellen = (daten.tabellen && daten.tabellen.tables) || {};
      spiele = (daten.spiele && daten.spiele.matches) || [];
      teams = S.aktiveTeams().filter(function (t) {
        return tabellen[t.slug];
      }).sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
      });

      if (daten.tabellen && daten.tabellen.generated) {
        S.stand("Saison " + String(daten.tabellen.season || "")
          .replace(/^(\d\d)(\d\d)$/, "$1/$2") + " · Stand "
          + new Date(daten.tabellen.generated).toLocaleString("de-DE", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          }) + " Uhr");
      }

      if (!teams.length) {
        ziel.innerHTML = '<p class="hinweis">Noch keine Tabellen '
          + "vorhanden. Sie werden mit dem nächsten Datenabruf von "
          + "FUSSBALL.DE geholt, sobald dort eine Tabelle zur Verfügung "
          + "steht.</p>";
        return;
      }

      var gewuenscht = S.parameter().get("team");

      zustand.team = teams.some(function (t) { return t.slug === gewuenscht; })
        ? gewuenscht : teams[0].slug;
      zeichne();

      ziel.addEventListener("click", function (ereignis) {
        var knopf = ereignis.target.closest("[data-team]");

        if (knopf) {
          zustand.team = knopf.dataset.team;
          zeichne();
        }
      });
    }
  });
}());
