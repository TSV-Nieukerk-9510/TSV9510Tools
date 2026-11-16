/* Seite "Tabelle": aktuelle Ligatabelle je Mannschaft.
 *
 * Die Daten holt scripts/fetch_tables.py von FUSSBALL.DE nach
 * data/tables.json. Einstellungen (an/aus, Mannschaften ohne Tabelle):
 * Abschnitt "tabellen" in config/spielbetrieb.json.
 */

(function () {
  "use strict";

  var S = window.Seite;
  var M = window.Mannschaftskarte;
  var text = S.text;

  var zustand = { team: "" };
  var tabellen = {};
  var teams = [];

  function auswahl() {
    return '<div class="segment tabelle-wahl" id="tabellenwahl">'
      + teams.map(function (t) {
        return '<button type="button" class="chip"'
          + ' aria-pressed="' + (t.slug === zustand.team) + '"'
          + ' data-team="' + text(t.slug) + '" title="' + text(t.name)
          + '">' + text(t.short) + "</button>";
      }).join("") + "</div>";
  }

  function zeichne() {
    var ziel = document.getElementById("tabellenbereich");

    ziel.innerHTML = auswahl()
      + '<div id="tabelleninhalt">' + M.tabelleHtml(zustand.team, true) + "</div>";
  }

  S.start({
    seite: "tabelle",
    braucht: ["teams", "spiele", "tabellen"],
    fertig: function (daten) {
      var ziel = document.getElementById("tabellenbereich");

      tabellen = (daten.tabellen && daten.tabellen.tables) || {};
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
