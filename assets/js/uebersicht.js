/* Seite "Spiele": alle Begegnungen nach Spieltagen.
 *
 * Die Seite beginnt beim naechsten Spieltag; vergangene Spieltage
 * liegen darueber hinter einem Knopf und kommen in Schritten dazu.
 * Ein Klick auf die Paarung klappt alle Angaben zum Spiel auf.
 *
 * Adresszusaetze: ?embed=1  ?team=tsv-h1  ?gruppe=jugend
 *                 ?seite=heim|auswaerts  ?frueher=<zahl|alle>
 */

(function () {
  "use strict";

  var ZEILEN = ["senioren", "jugend", "maedchen"];
  var FRUEHER_SCHRITT = 5;

  var S = window.Seite;
  var text = S.text;

  var zustand = {
    spiele: [],
    gruppen: {},
    verein: "",
    auswahl: { art: "alle", wert: "" },
    seite: "alle",
    frueherTage: 0,
    offen: {}
  };

  var el = {};

  function vergangen(spiel) {
    return new Date(spiel.start) < S.heute();
  }

  function kurz(slug) {
    var gefunden = S.team(slug);
    return gefunden ? gefunden.short : slug;
  }

  /* --- Auswahl ---------------------------------------------------- */

  function gefiltert() {
    return zustand.spiele.filter(function (spiel) {
      if (zustand.seite === "heim" && !spiel.isHome) {
        return false;
      }
      if (zustand.seite === "auswaerts" && spiel.isHome) {
        return false;
      }
      if (zustand.auswahl.art === "team") {
        return spiel.teamSlug === zustand.auswahl.wert;
      }
      if (zustand.auswahl.art === "gruppe") {
        var gefunden = S.team(spiel.teamSlug);
        return gefunden && gefunden.group === zustand.auswahl.wert;
      }
      return true;
    });
  }

  function nachTagen(spiele) {
    var tage = [];
    var index = {};

    spiele.forEach(function (spiel) {
      if (!index[spiel.date]) {
        index[spiel.date] = { datum: spiel.date, spiele: [] };
        tage.push(index[spiel.date]);
      }
      index[spiel.date].spiele.push(spiel);
    });

    tage.sort(function (a, b) {
      return a.datum < b.datum ? -1 : 1;
    });

    tage.forEach(function (tag) {
      tag.spiele.sort(function (a, b) {
        var zeitA = a.time || "99:99";
        var zeitB = b.time || "99:99";
        return zeitA !== zeitB
          ? (zeitA < zeitB ? -1 : 1)
          : (a.teamSlug < b.teamSlug ? -1 : 1);
      });
    });

    return tage;
  }

  /* --- Filterzeilen ------------------------------------------------ */

  function chip(beschriftung, art, wert, titel, zusatz) {
    var gewaehlt = zustand.auswahl.art === art
      && zustand.auswahl.wert === wert;

    return '<button type="button" class="chip' + (zusatz || "") + '"'
      + ' data-art="' + text(art) + '" data-wert="' + text(wert) + '"'
      + (titel ? ' title="' + text(titel) + '"' : "")
      + ' aria-pressed="' + gewaehlt + '">' + text(beschriftung)
      + "</button>";
  }

  function seitenChip(beschriftung, wert, titel) {
    return '<button type="button" class="chip" data-seite="' + text(wert)
      + '" title="' + text(titel) + '" aria-pressed="'
      + (zustand.seite === wert) + '">' + text(beschriftung) + "</button>";
  }

  function zeichneFilter() {
    var html = [];

    html.push('<div class="filter-zeile">');
    html.push('<span class="zeilen-titel">Übersicht</span>');
    html.push(chip("Alle Mannschaften", "alle", ""));
    html.push('<span class="seite" role="group"'
      + ' aria-label="Heim- oder Auswärtsspiele">');
    html.push(seitenChip("Alle", "alle", "Heim- und Auswärtsspiele"));
    html.push(seitenChip("H", "heim", "nur Heimspiele"));
    html.push(seitenChip("A", "auswaerts", "nur Auswärtsspiele"));
    html.push("</span>");
    html.push("</div>");

    ZEILEN.forEach(function (schluessel) {
      var mannschaften = S.aktiveTeams().filter(function (eintrag) {
        return eintrag.group === schluessel;
      });

      if (!mannschaften.length) {
        return;
      }

      html.push('<div class="filter-zeile">');
      html.push('<span class="zeilen-titel">'
        + text(zustand.gruppen[schluessel] || schluessel) + "</span>");
      html.push(chip("Alle", "gruppe", schluessel,
        "alle Mannschaften dieser Gruppe", " gruppe"));

      mannschaften.forEach(function (eintrag) {
        html.push(chip(eintrag.short, "team", eintrag.slug, eintrag.name));
      });

      html.push("</div>");
    });

    el.filter.innerHTML = html.join("");
  }

  /* --- Tabelle ------------------------------------------------------ */

  function zeileSpiel(spiel) {
    return Spielzeile.zeile(spiel, zustand.offen[spiel.id], {
      team: kurz(spiel.teamSlug), textKnopf: true
    });
  }

  function frueherKnopf(offen, schonEtwas) {
    var schritt = Math.min(FRUEHER_SCHRITT, offen);
    var beschriftung = schonEtwas
      ? "↑ " + schritt + " weitere Spieltage (noch " + offen + ")"
      : "↑ Frühere Spiele anzeigen";

    return '<p class="frueher" id="frueher">'
      + '<button type="button" id="frueher-knopf">'
      + text(beschriftung) + "</button></p>";
  }

  function zeichneSpiele() {
    var liste = gefiltert();

    var frueherTage = nachTagen(liste.filter(vergangen));
    var kommendTage = nachTagen(liste.filter(function (spiel) {
      return !vergangen(spiel);
    }));

    var gezeigt = frueherTage.slice(
      Math.max(0, frueherTage.length - zustand.frueherTage)
    );

    var tage = gezeigt.concat(kommendTage);
    var offeneTage = frueherTage.length - gezeigt.length;
    var ersterKommender = kommendTage.length ? kommendTage[0].datum : "";

    el.legende.hidden = !tage.some(function (tag) {
      return tag.spiele.some(function (spiel) {
        return spiel.pitchAssumed;
      });
    });

    var html = [];

    if (offeneTage > 0) {
      html.push(frueherKnopf(offeneTage, gezeigt.length > 0));
    }

    if (!tage.length) {
      html.push('<p class="hinweis">Für diese Auswahl ist derzeit kein '
        + "Spiel angesetzt.</p>");
      el.spiele.innerHTML = html.join("");
      return;
    }

    html.push('<table class="spieltage">');

    tage.forEach(function (tag) {
      var anzahl = tag.spiele.length === 1
        ? "1 Spiel" : tag.spiele.length + " Spiele";
      var marke = tag.datum === ersterKommender ? ' id="aktuell"' : "";

      html.push('<tbody data-tag="' + text(tag.datum) + '"' + marke + ">");
      html.push('<tr class="tag"><th colspan="3" scope="colgroup">'
        + text(S.datumLang(tag.datum))
        + '<span class="anzahl">' + anzahl + "</span></th></tr>");

      tag.spiele.forEach(function (spiel) {
        html.push(zeileSpiel(spiel));
      });

      html.push("</tbody>");
    });

    html.push("</table>");
    el.spiele.innerHTML = html.join("");
  }

  function springeZu(element, sanft) {
    if (!element) {
      return;
    }

    var leiste = document.querySelector(".filter");
    var abstand = leiste ? leiste.getBoundingClientRect().height : 0;
    var ziel = element.getBoundingClientRect().top + window.pageYOffset
      - abstand - 8;

    try {
      window.scrollTo({
        top: Math.max(0, ziel),
        behavior: sanft === false ? "auto" : "smooth"
      });
    } catch (fehler) {
      window.scrollTo(0, Math.max(0, ziel));
    }
  }

  function spielZu(id) {
    for (var i = 0; i < zustand.spiele.length; i++) {
      if (String(zustand.spiele[i].id) === id) {
        return zustand.spiele[i];
      }
    }
    return null;
  }

  function verdrahten() {
    document.getElementById("sprungleiste")
      .addEventListener("click", function (ereignis) {
        var verweis = ereignis.target.closest("a[data-ziel]");

        if (!verweis) {
          return;
        }

        ereignis.preventDefault();
        var ziel = verweis.dataset.ziel;

        if (ziel === "oben") {
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        springeZu(document.getElementById(ziel));
      });

    el.filter.addEventListener("click", function (ereignis) {
      var knopf = ereignis.target.closest(".chip");

      if (!knopf) {
        return;
      }

      if (knopf.dataset.seite) {
        zustand.seite = knopf.dataset.seite;
      } else {
        zustand.auswahl = {
          art: knopf.dataset.art, wert: knopf.dataset.wert
        };
      }

      zeichneFilter();
      zeichneSpiele();
    });

    el.spiele.addEventListener("click", function (ereignis) {
      if (ereignis.target.closest("#frueher-knopf")) {
        zustand.frueherTage += FRUEHER_SCHRITT;
        zeichneSpiele();
        springeZu(document.getElementById("aktuell"), false);
        return;
      }

      var aufklapper = ereignis.target.closest(".partie");

      if (aufklapper) {
        var id = aufklapper.dataset.auf;

        if (zustand.offen[id]) {
          delete zustand.offen[id];
        } else {
          zustand.offen[id] = true;
        }

        zeichneSpiele();
        return;
      }

      var textKnopf = ereignis.target.closest(".tg-start");

      if (textKnopf && window.Textgenerator) {
        var spiel = spielZu(textKnopf.dataset.match);

        if (spiel) {
          window.Textgenerator.oeffnen(spiel, zustand.verein);
        }
      }
    });
  }

  function startwerte() {
    var p = S.parameter();

    if (p.get("team")) {
      zustand.auswahl = { art: "team", wert: p.get("team") };
    } else if (p.get("gruppe")) {
      zustand.auswahl = { art: "gruppe", wert: p.get("gruppe") };
    }

    if (["heim", "auswaerts"].indexOf(p.get("seite")) !== -1) {
      zustand.seite = p.get("seite");
    }

    var frueher = p.get("frueher");

    if (frueher === "alle") {
      zustand.frueherTage = 9999;
    } else if (frueher && /^\d+$/.test(frueher)) {
      zustand.frueherTage = Number(frueher);
    }
  }

  S.start({
    seite: "uebersicht",
    braucht: ["teams", "spiele"],
    fertig: function (daten) {
      el.filter = document.getElementById("filterbereich");
      el.spiele = document.getElementById("spiele");
      el.legende = document.getElementById("legende");

      zustand.spiele = daten.spiele.matches;
      zustand.gruppen = daten.teams.groups || {};
      zustand.verein = daten.teams.club.name;

      if (daten.spiele.incomplete) {
        document.getElementById("warnbereich").innerHTML =
          '<p class="warnung">Beim letzten Abruf konnten nicht alle '
          + "Mannschaften geladen werden ("
          + text(daten.spiele.failedTeams.join(", "))
          + "). Für diese wird der letzte bekannte Stand angezeigt.</p>";
      }

      startwerte();
      zeichneFilter();
      zeichneSpiele();
      verdrahten();
    }
  });
}());
