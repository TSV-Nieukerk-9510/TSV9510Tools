/* Seite "Mannschaften": eine Mannschaft waehlen, dann in festem Aufbau
 *
 *   1. Trainingszeiten (wie auf der Seite Trainingszeiten)
 *   2. Naechste Spiele (alle kommenden, nicht auf drei begrenzt)
 *   3. Tabelle
 *   4. Kalender (Abo-Adresse und QR-Code)
 *
 * Die Bausteine kommen aus mannschaftskarte.js. Gruppen ohne Spiele bei
 * FUSSBALL.DE (z. B. Damen, Alte Herren) zeigen nur die Trainingszeiten.
 * Aufruf mit ?team=<kuerzel> waehlt eine Mannschaft vor.
 */

(function () {
  "use strict";

  var S = window.Seite;
  var M = window.Mannschaftskarte;
  var text = S.text;

  var auswahlListe = [];      // {slug, short, name, eintrag, ohneSpiele}
  var zustand = { slug: "" };
  var offen = {};
  var basis = "";
  var daten = null;

  function eintragFuer(slug) {
    for (var i = 0; i < auswahlListe.length; i++) {
      if (auswahlListe[i].slug === slug) {
        return auswahlListe[i];
      }
    }
    return null;
  }

  /* --- Auswahl ------------------------------------------------------ */

  function chip(e) {
    return '<button type="button" class="chip" data-team="' + text(e.slug)
      + '" title="' + text(e.name) + '" aria-pressed="'
      + (e.slug === zustand.slug) + '">' + text(e.short) + "</button>";
  }

  function auswahlHtml() {
    var gruppen = {};

    auswahlListe.forEach(function (e) {
      (gruppen[e.bereich] = gruppen[e.bereich] || []).push(e);
    });

    return '<div class="mannschaftswahl">' + S.bereiche().map(function (b) {
      var liste = gruppen[b.schluessel];

      return liste ? '<div class="wahl-gruppe"><span class="wahl-name">'
        + text(b.titel) + '</span><div class="segment">'
        + liste.map(chip).join("") + "</div></div>" : "";
    }).join("") + "</div>";
  }

  /* --- Abschnitte --------------------------------------------------- */

  function kalenderHtml(slug) {
    var url = basis + "kalender/" + slug + ".ics";

    return "<h4>Kalender</h4>"
      + '<p class="leise">Alle Spiele der Mannschaft als Abo im '
      + "Handykalender. Das Abo aktualisiert sich von selbst.</p>"
      + '<div class="kal-details"><div class="kal-text">'
      + '<label class="kal-feld"><span>Adresse des Kalenders</span>'
      + '<input type="text" readonly value="' + text(url)
      + '" class="kal-adresse"></label>'
      + '<p class="kal-knoepfe">'
      + '<a class="zeilen-knopf" href="kalender/' + text(slug)
      + '.ics">Datei öffnen</a>'
      + '<button type="button" class="zeilen-knopf kal-kopieren" '
      + 'data-slug="' + text(slug) + '">Adresse kopieren</button>'
      + '<a class="zeilen-knopf" href="kalender.html">Alle Kalender</a>'
      + "</p></div>"
      + '<figure class="kal-qr"><img src="qr/' + text(slug) + '.svg" '
      + 'alt="QR-Code mit der Adresse des Kalenders" width="150" '
      + 'height="150" loading="lazy"><figcaption>Mit dem Handy '
      + "abscannen</figcaption></figure></div>";
  }

  function trainingHtml(e) {
    var aktuell = S.aktuelleSaison();
    var eintrag = e.eintrag;

    return "<h4>Ansprechpartner</h4>" + M.kontaktHtml(eintrag.kontakt)
      + ["sommer", "winter"].map(function (saison) {
        return M.saisonHtml(saison, eintrag, aktuell);
      }).join("")
      + (eintrag.hinweis ? '<p class="trainingshinweis">'
        + text(eintrag.hinweis) + "</p>" : "");
  }

  function abschnitt(nummer, titel, inhalt) {
    return '<section class="ma-abschnitt"><h2><span class="ma-nr">'
      + nummer + "</span>" + text(titel) + "</h2>" + inhalt + "</section>";
  }

  function inhaltHtml() {
    var e = eintragFuer(zustand.slug);
    var jsg = /JSG/.test(e.name);
    var html = ['<div id="mannschaftsinhalt"><h2 class="ma-name">'
      + text(e.short) + (jsg ? ' <span class="marke-jsg" '
        + 'title="Spielgemeinschaft">JSG</span>' : "") + "</h2>"
      + (jsg ? '<p class="leise voller-name">' + text(S.ohneVerein(e.name))
        + "</p>" : "")];

    // Ueberschriften der Abschnitte stehen in abschnitt(); die kleinen
    // Ueberschriften der Bausteine werden hier ersetzt.
    html.push(abschnitt(1, "Trainingszeiten", trainingHtml(e)));

    if (!e.ohneSpiele) {
      html.push(abschnitt(2, "Nächste Spiele",
        M.spieleHtml(e.slug, offen, 0, "")));
      html.push(abschnitt(3, "Tabelle",
        M.tabelleHtml(e.slug, false).replace("<h4>Tabelle</h4>", "")));
      html.push(abschnitt(4, "Kalender",
        kalenderHtml(e.slug).replace("<h4>Kalender</h4>", "")));
    }

    html.push("</div>");
    return html.join("");
  }

  function zeichne() {
    document.getElementById("mannschaftsbereich").innerHTML =
      auswahlHtml() + inhaltHtml();
  }

  function waehle(slug) {
    zustand.slug = slug;
    offen = {};

    try {
      var url = new URL(window.location.href);
      url.searchParams.set("team", slug);
      window.history.replaceState(null, "", url.toString());
    } catch (fehler) {
      /* Adresszeile nicht aenderbar - nicht schlimm. */
    }
    zeichne();
  }

  function kopieren(knopf) {
    var feld = knopf.closest(".kal-details").querySelector(".kal-adresse");

    function bestaetige() {
      knopf.textContent = "Adresse kopiert";
      window.setTimeout(function () {
        knopf.textContent = "Adresse kopieren";
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(feld.value).then(bestaetige)
        .catch(function () {
          feld.select();
          knopf.textContent = "Bitte von Hand kopieren";
        });
    } else {
      feld.select();
      knopf.textContent = "Bitte von Hand kopieren";
    }
  }

  S.start({
    seite: "mannschaften",
    braucht: ["teams", "spiele", "mannschaften", "tabellen"],
    fertig: function (geladen) {
      var ziel = document.getElementById("mannschaftsbereich");
      var pflege = (geladen.mannschaften && geladen.mannschaften.mannschaften)
        || {};

      daten = geladen;
      basis = window.location.href.split("?")[0].replace(/[^/]*$/, "");

      S.bereiche().forEach(function (bereich) {
        bereich.teams.forEach(function (team) {
          auswahlListe.push({ slug: team.slug, short: team.short,
            name: team.name, bereich: bereich.schluessel,
            eintrag: Object.assign({}, pflege[team.slug] || {}) });
        });

        ((geladen.mannschaften && geladen.mannschaften.weitere) || [])
          .filter(function (g) { return g.bereich === bereich.schluessel; })
          .forEach(function (g) {
            auswahlListe.push({ slug: "w:" + g.name, short: g.name,
              name: g.name, bereich: bereich.schluessel, ohneSpiele: true,
              eintrag: Object.assign({ hauptort: "nieukerk-kunstrasen" },
                g) });
          });
      });

      if (!auswahlListe.length) {
        ziel.innerHTML = '<p class="warnung">Keine Mannschaften '
          + "gefunden.</p>";
        return;
      }

      var gewuenscht = S.parameter().get("team");

      zustand.slug = eintragFuer(gewuenscht) ? gewuenscht
        : auswahlListe[0].slug;
      zeichne();

      M.spielKlick(ziel, offen, 0);

      ziel.addEventListener("click", function (ereignis) {
        var wahl = ereignis.target.closest("[data-team]");

        if (wahl && wahl.classList.contains("chip")) {
          waehle(wahl.dataset.team);
          return;
        }

        var knopf = ereignis.target.closest(".kal-kopieren");

        if (knopf) {
          kopieren(knopf);
        }
      });
    }
  });
}());
