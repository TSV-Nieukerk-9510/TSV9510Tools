/* Seite "FAQ": haeufige Fragen, nach Seiten der Website gegliedert.
 * Inhalt: config/faq.json. Antworten sind standardmaessig zugeklappt,
 * eine Suche filtert Fragen und Antworten.
 */

(function () {
  "use strict";

  var S = window.Seite;
  var text = S.text;

  /* Einfaches Markup: **fett**, `code`, [Text](Ziel). Erst maskieren,
   * dann ersetzen - Links nur auf eigene Seiten oder https. */
  function markup(wert) {
    return text(wert)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/`(.+?)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\(((?:https:\/\/|[a-z0-9\-\/]+\.html)[^)\s]*)\)/gi,
        '<a href="$2">$1</a>');
  }

  function frageHtml(f) {
    return '<details class="faq-frage"><summary>' + text(f.frage)
      + "</summary><div class=\"faq-antwort\">"
      + (f.antwort || []).map(function (a) {
        return "<p>" + markup(a) + "</p>";
      }).join("") + "</div></details>";
  }

  function suchtext(f) {
    return (f.frage + " " + (f.antwort || []).join(" ")).toLowerCase();
  }

  function zeichne(gruppen, suche) {
    var teile = [];
    var treffer = 0;

    gruppen.forEach(function (g) {
      var fragen = (g.fragen || []).filter(function (f) {
        return !suche || suchtext(f).indexOf(suche) !== -1;
      });

      if (!fragen.length) {
        return;
      }

      treffer += fragen.length;
      teile.push('<section class="faq-gruppe" id="' + text(g.id) + '">'
        + "<h2>" + text(g.titel) + "</h2>"
        + (g.seite ? '<p class="faq-zur-seite"><a href="' + text(g.seite)
          + '">Zur Seite „' + text(g.titel) + "“</a></p>" : "")
        + '<div class="faq-liste">' + fragen.map(frageHtml).join("")
        + "</div></section>");
    });

    return teile.length ? teile.join("")
      : '<p class="leise">Keine Treffer.</p>';
  }

  S.start({
    seite: "faq",
    braucht: ["teams", "faq"],
    fertig: function (daten) {
      var ziel = document.getElementById("faqbereich");

      if (!daten.faq || !daten.faq.gruppen) {
        ziel.innerHTML = '<p class="warnung">Die Datei <code>config/faq.json'
          + "</code> fehlt.</p>";
        return;
      }

      var gruppen = daten.faq.gruppen;
      var sprung = gruppen.map(function (g) {
        return '<a class="chip" href="#' + text(g.id) + '">'
          + text(g.titel) + "</a>";
      }).join("");

      ziel.innerHTML = '<label class="tg-feld faq-suche"><span>Suchen'
        + '</span><input type="search" id="faqsuche" '
        + 'placeholder="z. B. Abo, Winter, KR-H1"></label>'
        + '<div class="segment faq-sprung" id="faqsprung">' + sprung
        + '</div><div id="faqinhalt">' + zeichne(gruppen, "") + "</div>";

      document.getElementById("faqsuche")
        .addEventListener("input", function (e) {
          var suche = e.target.value.trim().toLowerCase();

          document.getElementById("faqsprung").hidden = !!suche;
          document.getElementById("faqinhalt").innerHTML =
            zeichne(gruppen, suche);
        });

      // Sprung von aussen, z. B. faq.html#kalender: Abschnitt scrollen.
      if (location.hash) {
        var ziel2 = document.getElementById(location.hash.slice(1));

        if (ziel2) {
          ziel2.scrollIntoView();
        }
      }
    }
  });
}());
