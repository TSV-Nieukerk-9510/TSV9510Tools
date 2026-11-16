/* Gemeinsame Bausteine fuer Mannschaftsdarstellungen: Trainingszeiten
 * (Sommer/Winter), naechste Spiele und Ansprechpartner.
 *
 * Genutzt von der Seite "Trainingszeiten" (Karten aller Mannschaften) und
 * der Seite "Mannschaften" (eine Mannschaft nach Auswahl). Beide zeigen
 * so dieselbe Darstellung. Die Zeiten stammen aus
 * config/trainingsbetrieb.json, die Spiele aus data/matches.json.
 */

window.Mannschaftskarte = (function () {
  "use strict";

  var WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag",
    "Freitag", "Samstag", "Sonntag"];

  var S = window.Seite;
  var text = S.text;

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

  /* limit: Anzahl der Spiele; ohne Angabe alle kommenden. */
  function naechsteSpiele(slug, limit) {
    var heute = S.heute();
    var liste = ((S.daten().spiele && S.daten().spiele.matches) || [])
      .filter(function (spiel) {
        return spiel.teamSlug === slug && new Date(spiel.start) >= heute;
      })
      .sort(function (a, b) {
        return new Date(a.start) - new Date(b.start);
      });

    return limit ? liste.slice(0, limit) : liste;
  }

  function kurzesDatum(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      weekday: "short", day: "2-digit", month: "2-digit"
    });
  }

  function spieleZeilen(slug, offen, limit) {
    return naechsteSpiele(slug, limit).map(function (spiel) {
      return Spielzeile.zeile(spiel, offen[spiel.id], {
        datum: kurzesDatum(spiel.date), gegner: true, ohneZeit: true
      });
    }).join("");
  }

  function spieleHtml(slug, offen, limit, ueberschrift) {
    var zeilen = spieleZeilen(slug, offen, limit);

    var titel = ueberschrift === undefined ? "Nächste Spiele" : ueberschrift;

    return (titel ? "<h4>" + text(titel) + "</h4>" : "")
      + (zeilen
        ? '<table class="spieltage kompakt" data-team="' + text(slug)
          + '"><tbody>' + zeilen + "</tbody></table>"
        : '<p class="leise">Derzeit kein Spiel angesetzt.</p>');
  }

  /* Klick auf eine Paarung klappt die Details auf und zu. */
  function spielKlick(ziel, offen, limit) {
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
        spieleZeilen(tabelle.dataset.team, offen, limit);
    });
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

  /* --- Tabelle -------------------------------------------------------- */

  function staffel(slug) {
    var liste = (S.daten().spiele && S.daten().spiele.matches) || [];

    for (var i = 0; i < liste.length; i++) {
      if (liste[i].teamSlug === slug && liste[i].competition) {
        return liste[i].competition;
      }
    }
    return "";
  }

  /* Ligatabelle einer Mannschaft aus data/tables.json. mitKopf: grosse
   * Ueberschrift mit Mannschaftsname (Seite Tabelle) statt der kleinen
   * (Seite Mannschaften). */
  function tabelleHtml(slug, mitKopf) {
    var alle = (S.daten().tabellen && S.daten().tabellen.tables) || {};
    var t = alle[slug];
    var team = S.team(slug);
    var liga = staffel(slug);
    var titel = mitKopf ? "<h2>" + text(team ? team.name : slug) + "</h2>"
      : "<h4>Tabelle</h4>";

    if (!t) {
      return (mitKopf ? "" : titel) + '<p class="leise">Für diese '
        + "Mannschaft gibt es keine Tabelle.</p>";
    }

    var spalten = t.columns || [];
    var kopf = spalten.length
      ? "<thead><tr>" + spalten.map(function (sp, i) {
        return '<th class="' + (i > 1 ? "zahl" : "") + '">' + text(sp)
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

    return titel + (liga ? '<p class="leise">' + text(liga) + "</p>" : "")
      + '<div class="wt-rahmen"><table class="wochentabelle liga">' + kopf
      + "<tbody>" + zeilen + "</tbody></table></div>"
      + (t.source ? '<p class="leise"><a href="' + text(t.source)
        + '" target="_blank" rel="noopener">Tabelle bei FUSSBALL.DE</a></p>'
        : "");
  }

  return {
    saisonHtml: saisonHtml,
    tabelleHtml: tabelleHtml,
    kontaktHtml: kontaktHtml,
    spieleHtml: spieleHtml,
    spielKlick: spielKlick
  };
}());
