/* Gemeinsame Grundlage aller Unterseiten.
 *
 * Kopfzeile, Navigation und Fusszeile stehen nur hier - sonst muesste
 * jede Aenderung daran in vier HTML-Dateien nachgezogen werden.
 *
 * Jede Seite ruft am Ende ihres eigenen Skripts:
 *
 *   Seite.start({
 *     seite: "uebersicht",          // welcher Navigationspunkt aktiv ist
 *     braucht: ["teams", "spiele"], // welche Daten geladen werden sollen
 *     fertig: function (daten) { ... }
 *   });
 *
 * Adresszusatz ?embed=1 blendet Kopf, Navigation und Fuss aus - fuer
 * das Einbetten per iframe auf der Vereinsseite.
 */

window.Seite = (function () {
  "use strict";

  var NAVIGATION = [
    { schluessel: "uebersicht", titel: "Spielübersicht", datei: "index.html" },
    { schluessel: "kalender", titel: "Kalender", datei: "kalender.html" },
    { schluessel: "training", titel: "Training", datei: "training.html" },
    { schluessel: "texte", titel: "Textbausteine", datei: "textgenerator.html" }
  ];

  var QUELLEN = {
    teams: "data/teams.json",
    spiele: "data/matches.json",
    mannschaften: "config/mannschaften.json"
  };

  var daten = {};

  /* --- Hilfsmittel, die alle Seiten brauchen --------------------- */

  function text(wert) {
    return String(wert == null ? "" : wert).replace(/[&<>"]/g, function (z) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z];
    });
  }

  function datumLang(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
  }

  function datumKurz(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      weekday: "short", day: "2-digit", month: "2-digit", year: "2-digit"
    });
  }

  function heute() {
    var tag = new Date();
    tag.setHours(0, 0, 0, 0);
    return tag;
  }

  function parameter() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (fehler) {
      return new URLSearchParams("");
    }
  }

  function laden(pfad, optional) {
    return fetch(pfad, { cache: "no-cache" }).then(function (antwort) {
      if (!antwort.ok) {
        if (optional) {
          return null;
        }
        throw new Error(pfad + ": HTTP " + antwort.status);
      }
      return antwort.json();
    }).catch(function (fehler) {
      if (optional) {
        return null;
      }
      throw fehler;
    });
  }

  function team(slug) {
    var liste = (daten.teams && daten.teams.teams) || [];

    for (var i = 0; i < liste.length; i++) {
      if (liste[i].slug === slug) {
        return liste[i];
      }
    }
    return null;
  }

  function aktiveTeams() {
    return ((daten.teams && daten.teams.teams) || []).filter(function (t) {
      return t.active;
    });
  }

  /* --- Gerüst --------------------------------------------------- */

  function zeichneKopf(aktiv, untertitel) {
    var kopf = document.getElementById("kopf");
    var nav = document.getElementById("hauptnav");
    var fuss = document.getElementById("fuss");

    var verein = (daten.teams && daten.teams.club && daten.teams.club.name)
      || "TSV Nieukerk 95/10";

    var punkt = NAVIGATION.filter(function (e) {
      return e.schluessel === aktiv;
    })[0] || NAVIGATION[0];

    if (kopf) {
      kopf.innerHTML = '<div class="inhalt">'
        + '<p class="verein">' + text(verein) + "</p>"
        + "<h1>" + text(punkt.titel) + "</h1>"
        + '<p class="stand" id="stand">' + text(untertitel || "") + "</p>"
        + "</div>";
    }

    if (nav) {
      nav.innerHTML = '<div class="inhalt"><div class="hauptnav-leiste">'
        + NAVIGATION.map(function (eintrag) {
          var hier = eintrag.schluessel === aktiv;
          return '<a href="' + eintrag.datei + '"'
            + (hier ? ' class="hier" aria-current="page"' : "")
            + ">" + text(eintrag.titel) + "</a>";
        }).join("")
        + "</div></div>";
    }

    if (fuss) {
      fuss.innerHTML = '<div class="inhalt"><p>'
        + "Spieldaten von FUSSBALL.DE. Automatisch aktualisiert. "
        + "Alle Angaben ohne Gewähr – verbindlich ist der Spielplan auf "
        + '<a href="https://www.fussball.de">fussball.de</a>.</p></div>';
    }

    document.title = verein + " – " + punkt.titel;
  }

  function stand(nachricht) {
    var feld = document.getElementById("stand");

    if (feld) {
      feld.textContent = nachricht;
    }
  }

  function standAusDaten() {
    if (!daten.teams) {
      return "";
    }

    // "2627" -> "26/27"
    var saison = String(daten.teams.season || "");

    if (/^\d{4}$/.test(saison)) {
      saison = saison.slice(0, 2) + "/" + saison.slice(2);
    }

    var zeilen = ["Saison " + saison];

    if (daten.spiele) {
      var zeitpunkt = new Date(daten.spiele.generated)
        .toLocaleString("de-DE", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        });

      zeilen.push(daten.spiele.count + " Spiele");
      zeilen.push("Stand " + zeitpunkt + " Uhr");
    }

    return zeilen.join(" · ");
  }

  function fehlerAnzeigen(fehler) {
    var bereich = document.querySelector("main .inhalt") || document.body;
    bereich.innerHTML = '<p class="warnung">Die Daten konnten nicht '
      + "geladen werden: " + text(fehler.message) + "</p>";
  }

  /* --- Start ------------------------------------------------------ */

  function start(optionen) {
    var p = parameter();

    if (p.get("embed") === "1") {
      document.body.classList.add("eingebettet");
    }

    var noetig = optionen.braucht || ["teams"];

    var auftraege = noetig.map(function (name) {
      return laden(QUELLEN[name], name === "mannschaften");
    });

    Promise.all(auftraege).then(function (ergebnisse) {
      noetig.forEach(function (name, index) {
        daten[name] = ergebnisse[index];
      });

      zeichneKopf(optionen.seite, "");
      stand(standAusDaten());
      optionen.fertig(daten);
    }).catch(function (fehler) {
      zeichneKopf(optionen.seite, "Daten nicht verfügbar");
      fehlerAnzeigen(fehler);
    });
  }

  return {
    start: start,
    text: text,
    datumLang: datumLang,
    datumKurz: datumKurz,
    heute: heute,
    parameter: parameter,
    team: team,
    aktiveTeams: aktiveTeams,
    stand: stand,
    daten: function () { return daten; }
  };
}());
