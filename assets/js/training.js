/* Seite "Trainingszeiten": je Mannschaft eine Karte mit Orten,
 * Trainingszeiten fuer Sommer und Winter, den naechsten drei Spielen
 * und den Ansprechpartnern.
 *
 * Die Zeiten stammen aus config/mannschaften.json und werden von Hand
 * gepflegt - FUSSBALL.DE kennt sie nicht. Die Spiele kommen von
 * FUSSBALL.DE (data/matches.json) und klappen wie in der Spielübersicht
 * auf. Fehlt etwas, sagt die Seite das offen, statt eine Luecke zu
 * kaschieren.
 */

(function () {
  "use strict";

  var WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag",
    "Freitag", "Samstag", "Sonntag"];
  var ANZAHL_SPIELE = 3;

  var S = window.Seite;
  var text = S.text;
  var offen = {};

  /* Eine Mannschaft kann Zeiten je Jahreszeit haben. Aeltere Eintraege
   * (eine einfache Liste) gelten als Sommerzeiten. */
  function einheitenFuer(eintrag, saison) {
    var t = eintrag && eintrag.training;

    if (Array.isArray(t)) {
      return saison === "sommer" ? t : [];
    }
    return (t && t[saison]) || [];
  }

  function datumDe(iso) {
    var t = String(iso || "").split("-");
    return t.length === 3 ? t[2] + "." + t[1] + "." + t[0] : "";
  }

  /* --- Orte --------------------------------------------------------- */

  function ortKurz(ort) {
    return ort.abk || ort.name;
  }

  /* --- Trainingszeiten ---------------------------------------------- */

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

  /* Liegt die Einheit an einem anderen Ort als dem Hauptort (z. B. FCA)? */
  function nebenOrt(e, eintrag) {
    var r = S.aufloesen(e, eintrag);
    var haupt = S.orte()[eintrag.hauptort];

    if (r.fehler || !r.ort || !haupt || ortKurz(haupt) === ortKurz(r.ort)) {
      return null;
    }
    return r.ort;
  }

  function zeitText(e) {
    return e.von && e.bis ? e.von + " – " + e.bis + " Uhr"
      : (e.von ? "ab " + e.von + " Uhr" : "");
  }

  /* Zwei Zeilen je Einheit: Tag und Zeit, darunter Platz und Platzteil. */
  function zeileTraining(e, eintrag) {
    var r = S.aufloesen(e, eintrag);
    var wo = "";

    if (r.fehler) {
      wo = "? " + r.fehler;
    } else if (r.kuerzel) {
      wo = r.ort.name + (r.feld && r.feld !== "G"
        ? " · " + S.felder[r.feld].name : "");
    }

    var unten = wo + (e.hinweis ? (wo ? " · " : "") + e.hinweis : "");

    return '<tr class="einheit"><th>' + text(e.tag || "") + "</th><td>"
      + text(zeitText(e)) + "</td></tr>"
      + (unten ? '<tr class="platzzeile"><td colspan="2" class="leise">'
        + text(unten) + "</td></tr>" : "");
  }

  var KURZTAG = { Montag: "Mo", Dienstag: "Di", Mittwoch: "Mi",
    Donnerstag: "Do", Freitag: "Fr", Samstag: "Sa", Sonntag: "So" };

  /* Kleine Info unter der Tabelle: Einheiten an anderen Orten. */
  function nebenInfo(einheiten, eintrag) {
    var gruppen = {};
    var reihe = [];

    sortiereEinheiten(einheiten).forEach(function (e) {
      var ort = nebenOrt(e, eintrag);

      if (!ort) {
        return;
      }

      var k = ortKurz(ort);

      if (!gruppen[k]) {
        gruppen[k] = { ort: ort, teile: [] };
        reihe.push(k);
      }
      gruppen[k].teile.push((KURZTAG[e.tag] || e.tag) + " "
        + zeitText(e).replace(" Uhr", "")
        + (e.hinweis ? " (" + e.hinweis + ")" : ""));
    });

    return reihe.map(function (k) {
      var g = gruppen[k];
      return '<p class="leise neben-info"><b>'
        + text(g.ort.anzeige || ortKurz(g.ort)) + "</b>: "
        + text(g.teile.join(" · ")) + " Uhr</p>";
    }).join("");
  }

  function saisonHtml(saison, eintrag, aktuell) {
    var def = S.saisonListe()[saison] || {};
    var einheiten = einheitenFuer(eintrag, saison);
    var kopf = '<h4 class="saison-kopf' + (saison === aktuell ? " aktuell"
      : "") + '">' + text(def.name || saison) + "</h4>";

    if (!einheiten.length) {
      return '<section class="saison-box">' + kopf
        + '<p class="leise">Noch nicht hinterlegt.</p></section>';
    }

    var haupt = einheiten.filter(function (e) {
      return !nebenOrt(e, eintrag);
    });

    return '<section class="saison-box' + (saison === aktuell ? " aktuell" : "")
      + '">' + kopf + (haupt.length
      ? '<table class="training">' + sortiereEinheiten(haupt)
        .map(function (e) { return zeileTraining(e, eintrag); }).join("")
        + "</table>"
      : "") + nebenInfo(einheiten, eintrag) + "</section>";
  }

  /* --- Naechste Spiele ---------------------------------------------- */

  function naechsteSpiele(slug) {
    var heute = S.heute();

    return ((S.daten().spiele && S.daten().spiele.matches) || [])
      .filter(function (spiel) {
        return spiel.teamSlug === slug && new Date(spiel.start) >= heute;
      })
      .sort(function (a, b) {
        return new Date(a.start) - new Date(b.start);
      })
      .slice(0, ANZAHL_SPIELE);
  }

  function kurzesDatum(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      weekday: "short", day: "2-digit", month: "2-digit"
    });
  }

  function spieleZeilen(slug) {
    return naechsteSpiele(slug).map(function (spiel) {
      return Spielzeile.zeile(spiel, offen[spiel.id], {
        datum: kurzesDatum(spiel.date), gegner: true, ohneZeit: true
      });
    }).join("");
  }

  function spieleHtml(slug) {
    var zeilen = spieleZeilen(slug);

    return "<h4>Nächste Spiele</h4>" + (zeilen
      ? '<table class="spieltage kompakt" data-team="' + text(slug)
        + '"><tbody>' + zeilen + "</tbody></table>"
      : '<p class="leise">Derzeit kein Spiel angesetzt.</p>');
  }

  /* --- Ansprechpartner ---------------------------------------------- */

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
      + kontaktHtml(eintrag.kontakt)
      + reihenfolge.map(function (saison) {
        return saisonHtml(saison, eintrag, aktuell);
      }).join("")
      + (eintrag.hinweis
        ? '<p class="trainingshinweis">' + text(eintrag.hinweis) + "</p>"
        : "")
      + (eintrag.ohneSpiele ? "" : spieleHtml(team.slug))
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
          + "<code>config/mannschaften.json</code> fehlt. Ohne sie kann "
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
      ziel.addEventListener("click", function (ereignis) {
        var knopf = ereignis.target.closest(".partie");

        if (!knopf) {
          return;
        }

        var tabelle = knopf.closest("table[data-team]");
        var id = knopf.dataset.auf;

        if (offen[id]) {
          delete offen[id];
        } else {
          offen[id] = true;
        }

        tabelle.querySelector("tbody").innerHTML =
          spieleZeilen(tabelle.dataset.team);
      });
    }
  });
}());
