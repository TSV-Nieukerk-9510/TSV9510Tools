/* Seite "Textbausteine": Spiel über Auswahllisten wählen, Text erzeugen.
 *
 * Die eigentliche Arbeit macht textgenerator.js - hier wird nur das
 * Spiel ausgesucht und an dessen Fenster übergeben.
 *
 * Adresszusatz ?team=tsv-h1 wählt die Mannschaft vor.
 */

(function () {
  "use strict";

  var S = window.Seite;
  var text = S.text;

  var zustand = { spiele: [], verein: "", mannschaft: "" };

  function vergangen(spiel) {
    return new Date(spiel.start) < S.heute();
  }

  function spieleDerMannschaft(slug) {
    var liste = zustand.spiele.filter(function (spiel) {
      return !slug || spiel.teamSlug === slug;
    });

    // Kommende zuerst - die werden abgesagt oder verlegt. Vergangene
    // bleiben erreichbar, etwa um einen Spielbericht nachzureichen.
    var kommend = liste.filter(function (s) { return !vergangen(s); });
    var frueher = liste.filter(vergangen).reverse();

    return { kommend: kommend, frueher: frueher };
  }

  function beschriftung(spiel) {
    var teil = S.datumKurz(spiel.date)
      + (spiel.time ? ", " + spiel.time : ", Zeit offen")
      + " · " + spiel.home + " – " + spiel.away;

    if (!zustand.mannschaft) {
      var team = S.team(spiel.teamSlug);
      teil = (team ? team.short + " · " : "") + teil;
    }

    return teil;
  }

  function zeichneSpielliste() {
    var auswahl = document.getElementById("spielauswahl");
    var gruppen = spieleDerMannschaft(zustand.mannschaft);
    var html = [];

    function block(titel, liste) {
      if (!liste.length) {
        return;
      }

      html.push('<optgroup label="' + text(titel) + '">');
      liste.forEach(function (spiel) {
        html.push('<option value="' + text(spiel.id) + '">'
          + text(beschriftung(spiel)) + "</option>");
      });
      html.push("</optgroup>");
    }

    block("Kommende Spiele", gruppen.kommend);
    block("Bereits gespielt", gruppen.frueher);

    if (!html.length) {
      html.push('<option value="">Für diese Mannschaft ist kein Spiel '
        + "angesetzt</option>");
    }

    auswahl.innerHTML = html.join("");
    zeigeVorschau();
  }

  function gewaehltesSpiel() {
    var id = document.getElementById("spielauswahl").value;

    for (var i = 0; i < zustand.spiele.length; i++) {
      if (String(zustand.spiele[i].id) === id) {
        return zustand.spiele[i];
      }
    }
    return null;
  }

  /* Kurze Zusammenfassung unter der Auswahl, damit man vor dem Erzeugen
     sieht, ob das richtige Spiel gewählt ist. */
  function zeigeVorschau() {
    var bereich = document.getElementById("spielvorschau");
    var spiel = gewaehltesSpiel();
    var knopf = document.getElementById("text-erzeugen");

    if (!spiel) {
      bereich.innerHTML = "";
      knopf.disabled = true;
      return;
    }

    knopf.disabled = false;

    var zeilen = [];

    function zeile(beschrift, wert) {
      if (wert) {
        zeilen.push("<dt>" + text(beschrift) + "</dt><dd>" + text(wert)
          + "</dd>");
      }
    }

    zeile("Begegnung", spiel.home + " – " + spiel.away);
    zeile("Anstoß", S.datumLang(spiel.date)
      + (spiel.time ? ", " + spiel.time + " Uhr"
        : " – Zeit steht noch nicht fest"));
    zeile("Wettbewerb", spiel.competition
      + (spiel.matchDay ? ", " + spiel.matchDay + ". Spieltag" : ""));
    zeile("Spielnummer", spiel.matchNumber);
    zeile("Staffel-ID", spiel.divisionId);
    zeile("Spielstätte", spiel.venue);

    bereich.innerHTML = "<dl>" + zeilen.join("") + "</dl>";
  }

  S.start({
    seite: "texte",
    braucht: ["teams", "spiele"],
    fertig: function (daten) {
      zustand.spiele = daten.spiele.matches;
      zustand.verein = daten.teams.club.name;

      var vorgabe = S.parameter().get("team") || "";
      var mannschaftswahl = document.getElementById("mannschaftswahl");

      var html = ['<option value="">Alle Mannschaften</option>'];

      S.aktiveTeams().forEach(function (team) {
        html.push('<option value="' + text(team.slug) + '"'
          + (team.slug === vorgabe ? " selected" : "") + ">"
          + text(team.short + " – " + team.name) + "</option>");
      });

      mannschaftswahl.innerHTML = html.join("");
      zustand.mannschaft = vorgabe;

      mannschaftswahl.addEventListener("change", function () {
        zustand.mannschaft = mannschaftswahl.value;
        zeichneSpielliste();
      });

      document.getElementById("spielauswahl")
        .addEventListener("change", zeigeVorschau);

      document.getElementById("text-erzeugen")
        .addEventListener("click", function () {
          var spiel = gewaehltesSpiel();

          if (spiel && window.Textgenerator) {
            window.Textgenerator.oeffnen(spiel, zustand.verein);
          }
        });

      zeichneSpielliste();
    }
  });
}());
