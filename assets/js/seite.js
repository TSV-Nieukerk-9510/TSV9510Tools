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

  // Zwei Ebenen: oben die Bereiche, darunter die Seiten des gerade
  // geoeffneten Bereichs. Eine zweite Zeile statt eines Aufklappmenues,
  // weil sich Aufklappmenues auf dem Handy nicht zuverlaessig bedienen
  // lassen und in der waagerecht scrollenden Leiste abgeschnitten wuerden.
  // Ein Bereich mit "kinder" fuehrt beim Anklicken auf seine erste Seite.
  var NAVIGATION = [
    { schluessel: "uebersicht", titel: "Spielübersicht", datei: "index.html" },
    { schluessel: "trainingsplan", titel: "Trainingsplan",
      datei: "training.html", kinder: [
        { schluessel: "training", titel: "Trainingszeiten",
          datei: "training.html" },
        { schluessel: "platzbelegung", titel: "Platzbelegung",
          datei: "platzbelegung.html" },
        { schluessel: "sportanlage", titel: "Sportanlage",
          datei: "sportanlage.html" }
      ] },
    { schluessel: "tools", titel: "Tools", datei: "kalender.html", kinder: [
      { schluessel: "kalender", titel: "Kalender", datei: "kalender.html" },
      { schluessel: "texte", titel: "Textvorlagen",
        datei: "textgenerator.html" }
    ] },
    { schluessel: "faq", titel: "FAQ", datei: "faq.html" }
  ];

  /* Findet Bereich und (falls vorhanden) Unterseite zu einem Schluessel. */
  function suchePunkt(schluessel) {
    for (var i = 0; i < NAVIGATION.length; i++) {
      var bereich = NAVIGATION[i];

      if (bereich.schluessel === schluessel) {
        return { bereich: bereich, seite: bereich };
      }

      var kinder = bereich.kinder || [];

      for (var k = 0; k < kinder.length; k++) {
        if (kinder[k].schluessel === schluessel) {
          return { bereich: bereich, seite: kinder[k] };
        }
      }
    }

    return { bereich: NAVIGATION[0], seite: NAVIGATION[0] };
  }

  var QUELLEN = {
    teams: "data/teams.json",
    spiele: "data/matches.json",
    mannschaften: "config/mannschaften.json",
    faq: "config/faq.json",
    sportanlage: "config/sportanlage.json"
  };

  // Offizieller Vereinsname (Kopfzeile, Titel, Anschrift)
  var VEREINSNAME = "TSV 95/10 Nieukerk e.V.";

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

  /* --- Jahreszeiten, Bereiche, Namen ------------------------------- */

  function saisonListe() {
    var m = daten.mannschaften;

    return (m && m.saisons) || {
      sommer: { name: "Sommer" }, winter: { name: "Winter" }
    };
  }

  /* Welche Jahreszeit gerade gilt: die mit dem juengsten Beginn ("ab"),
   * der nicht in der Zukunft liegt. Ohne Datum: nach Monat. */
  function aktuelleSaison() {
    var liste = saisonListe();
    var heuteIso = new Date().toISOString().slice(0, 10);
    var beste = null;

    Object.keys(liste).forEach(function (k) {
      var ab = liste[k].ab;

      if (ab && ab <= heuteIso && (!beste || ab > liste[beste].ab)) {
        beste = k;
      }
    });

    if (!beste) {
      Object.keys(liste).forEach(function (k) {
        if (liste[k].ab && (!beste || liste[k].ab > liste[beste].ab)) {
          beste = k;
        }
      });
    }

    if (beste) {
      return beste;
    }

    var monat = new Date().getMonth() + 1;
    return (monat >= 11 || monat <= 3) ? "winter" : "sommer";
  }

  /* Sind die Zeiten dieser Jahreszeit nur Beispiele? */
  function istBeispiel(saison) {
    var m = daten.mannschaften;
    var b = m && m.beispieldaten;

    return b && typeof b === "object" ? !!b[saison] : !!b;
  }

  /* Bereiche der Mannschaften fuer Trainingsseiten: aus der Config
   * ("bereiche"), sonst die Gruppen aus data/teams.json. Mannschaften,
   * die in keinem Bereich stehen, kommen unten dazu. */
  function bereiche() {
    var m = daten.mannschaften;
    var aktive = aktiveTeams();
    var gruppen = (daten.teams && daten.teams.groups) || {};
    var ergebnis = [];
    var vergeben = {};

    if (m && m.bereiche && m.bereiche.length) {
      m.bereiche.forEach(function (b) {
        var teams = (b.teams || []).map(team).filter(function (t) {
          return t && t.active !== false;
        });

        teams.forEach(function (t) { vergeben[t.slug] = true; });
        ergebnis.push({ schluessel: b.schluessel, titel: b.titel,
          hinweis: b.hinweis || "", teams: teams });
      });

      var rest = aktive.filter(function (t) { return !vergeben[t.slug]; });

      if (rest.length) {
        ergebnis.push({ schluessel: "weitere", titel: "Weitere",
          hinweis: "", teams: rest });
      }
      return ergebnis.filter(function (b) { return b.teams.length; });
    }

    ["senioren", "jugend", "maedchen"].forEach(function (k) {
      var teams = aktive.filter(function (t) { return t.group === k; });

      if (teams.length) {
        ergebnis.push({ schluessel: k, titel: gruppen[k] || k, hinweis: "",
          teams: teams });
      }
    });
    return ergebnis;
  }

  /* Vollstaendiger Mannschaftsname ohne den Vereinsnamen: die Seite
   * gehoert dem TSV Nieukerk, das muss nicht ueberall stehen.
   * "Herren - TSV Nieukerk II" -> "Herren II". */
  function ohneVerein(name) {
    return String(name || "").replace(/\s*-\s*TSV Nieukerk( II)?$/,
      function (alles, zwei) { return zwei || ""; });
  }

  /* Hinweis, solange config/mannschaften.json fuer die Jahreszeit
   * Beispielzeiten enthaelt. "beispieldaten" ist true/false oder je
   * Jahreszeit {"sommer": false, "winter": true}. */
  function beispielHinweis(saison) {
    var m = daten.mannschaften;
    var b = m && m.beispieldaten;
    var an = b && typeof b === "object" ? !!b[saison] : !!b;

    if (an) {
      return '<p class="warnung"><b>Beispieldaten.</b> Die Zeiten auf '
        + "dieser Seite sind nur Beispiele und noch nicht die echten "
        + "Trainingszeiten.</p>";
    }
    return "";
  }

  /* --- Orte und Plaetze -------------------------------------------- */

  /* Teile des Platzes. rect = [links, oben, rechts, unten] in Anteilen
   * von Laenge und Breite; Ueberschneidungen werden aus der Geometrie
   * berechnet. Kuerzel wie in der Konfiguration: G, H1-H2, D1-D3, V1-V4.
   * V1 links oben, V2 links unten, V3 rechts oben, V4 rechts unten. */
  var FELDER = {
    G:  { rect: [0, 0, 1, 1],         name: "ganzes Feld", art: "G" },
    H1: { rect: [0, 0, .5, 1],        name: "Hälfte 1", art: "H" },
    H2: { rect: [.5, 0, 1, 1],        name: "Hälfte 2", art: "H" },
    D1: { rect: [0, 0, 1 / 3, 1],     name: "Drittel 1", art: "D" },
    D2: { rect: [1 / 3, 0, 2 / 3, 1], name: "Drittel 2", art: "D" },
    D3: { rect: [2 / 3, 0, 1, 1],     name: "Drittel 3", art: "D" },
    V1: { rect: [0, 0, .5, .5],       name: "Viertel 1", art: "V" },
    V2: { rect: [0, .5, .5, 1],       name: "Viertel 2", art: "V" },
    V3: { rect: [.5, 0, 1, .5],       name: "Viertel 3", art: "V" },
    V4: { rect: [.5, .5, 1, 1],       name: "Viertel 4", art: "V" }
  };

  function orteListe() {
    return (daten.mannschaften && daten.mannschaften.orte) || {};
  }

  /* Anschrift eines Ortes aus strasse, plz und ort. */
  function adresse(ort) {
    if (!ort) {
      return "";
    }

    var stadt = [ort.plz, ort.ort].filter(Boolean).join(" ");
    return [ort.strasse, stadt].filter(Boolean).join(", ");
  }

  /* Kartenlink: ein hinterlegter Link gilt, sonst wird er aus der
   * Anschrift gebaut. Ohne beides gibt es keinen. */
  function kartenLink(ort) {
    if (!ort) {
      return "";
    }
    if (ort.karte) {
      return ort.karte;
    }

    var anschrift = adresse(ort);

    return anschrift
      ? "https://www.google.de/maps?q=" + encodeURIComponent(anschrift)
      : "";
  }

  /* Ort einer Trainingseinheit. Zwei Schreibweisen:
   *   platz: "KR-H1"   eigener Platz (Kuerzel) und Teil des Platzes
   *   ort:   "neben"   Hauptort ("haupt", Standard), Nebenort ("neben")
   *                    oder ein Schluessel aus "orte"
   * Hat der Ort ein Kuerzel (eigener Platz) und fehlt der Teil, gilt das
   * ganze Feld. */
  function aufloesen(einheit, eintrag) {
    var orte = orteListe();
    var ergebnis = { ortKey: null, ort: null, kuerzel: "", feld: "",
      fehler: "" };
    var code = String(einheit.platz || "").trim();

    if (code) {
      var teile = code.toUpperCase().split("-");
      var kuerzel = teile[0];
      var feld = teile[1] || "G";

      Object.keys(orte).forEach(function (k) {
        if (String(orte[k].kuerzel || "").toUpperCase() === kuerzel) {
          ergebnis.ortKey = k;
        }
      });

      if (!ergebnis.ortKey) {
        ergebnis.fehler = "Platzkürzel „" + kuerzel + "“ unbekannt";
        return ergebnis;
      }
      if (!FELDER[feld]) {
        ergebnis.fehler = "Feldteil „" + feld + "“ unbekannt";
        return ergebnis;
      }

      ergebnis.ort = orte[ergebnis.ortKey];
      ergebnis.kuerzel = kuerzel;
      ergebnis.feld = feld;
      return ergebnis;
    }

    var schluessel = einheit.ort || "haupt";

    if (schluessel === "haupt") {
      schluessel = eintrag && eintrag.hauptort;
    } else if (schluessel === "neben") {
      schluessel = eintrag && eintrag.nebenort;
    }

    if (!orte[schluessel]) {
      ergebnis.fehler = "Ort „" + (einheit.ort || "haupt") + "“ unbekannt";
      return ergebnis;
    }

    ergebnis.ortKey = schluessel;
    ergebnis.ort = orte[schluessel];

    if (ergebnis.ort.kuerzel) {
      ergebnis.kuerzel = String(ergebnis.ort.kuerzel).toUpperCase();
      ergebnis.feld = "G";
    }

    return ergebnis;
  }

  /* --- Gerüst --------------------------------------------------- */

  function zeichneKopf(aktiv, untertitel) {
    var kopf = document.getElementById("kopf");
    var nav = document.getElementById("hauptnav");
    var fuss = document.getElementById("fuss");

    var verein = VEREINSNAME;

    var fundort = suchePunkt(aktiv);
    var punkt = fundort.seite;

    if (kopf) {
      kopf.innerHTML = '<div class="inhalt">'
        + '<p class="verein">' + text(verein) + "</p>"
        + "<h1>" + text(punkt.titel) + "</h1>"
        + '<p class="stand" id="stand">' + text(untertitel || "") + "</p>"
        + "</div>";
    }

    if (nav) {
      var unterzeile = "";

      if (fundort.bereich.kinder) {
        unterzeile = '<div class="unternav"><div class="inhalt">'
          + '<div class="unternav-leiste">'
          + fundort.bereich.kinder.map(function (eintrag) {
            var hier = eintrag.schluessel === punkt.schluessel;
            return '<a href="' + eintrag.datei + '"'
              + (hier ? ' class="hier" aria-current="page"' : "")
              + ">" + text(eintrag.titel) + "</a>";
          }).join("")
          + "</div></div></div>";
      }

      nav.innerHTML = '<div class="inhalt"><div class="hauptnav-leiste">'
        + NAVIGATION.map(function (eintrag) {
          var hier = eintrag === fundort.bereich;
          return '<a href="' + eintrag.datei + '"'
            + (hier ? ' class="hier"' : "")
            + (hier && !fundort.bereich.kinder ? ' aria-current="page"' : "")
            + ">" + text(eintrag.titel) + "</a>";
        }).join("")
        + "</div></div>" + unterzeile;
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

  function datumDe(wert) {
    var d = new Date(wert);

    if (isNaN(d.getTime())) {
      return String(wert);
    }

    var nurTag = String(wert).indexOf("T") === -1;
    var optionen = { day: "2-digit", month: "2-digit", year: "numeric" };

    if (!nurTag) {
      optionen.hour = "2-digit";
      optionen.minute = "2-digit";
    }
    return d.toLocaleString("de-DE", optionen) + (nurTag ? "" : " Uhr");
  }

  function standAusDaten(aktiv) {
    if (!daten.teams) {
      return "";
    }

    // "2627" -> "26/27"
    var saison = String(daten.teams.season || "");

    if (/^\d{4}$/.test(saison)) {
      saison = saison.slice(0, 2) + "/" + saison.slice(2);
    }

    var zeilen = ["Saison " + saison];

    // Trainingsplan: massgeblich ist der Stand der von Hand gepflegten
    // Zeiten, nicht der des letzten Datenabrufs.
    if (/^training$|^platzbelegung$/.test(aktiv)) {
      var stand = daten.mannschaften
        && daten.mannschaften.stand_trainingszeiten;

      if (stand) {
        zeilen.push("Trainingszeiten Stand " + datumDe(stand));
      }
      return zeilen.join(" · ");
    }

    if (daten.spiele) {
      var zeitpunkt = new Date(daten.spiele.generated)
        .toLocaleString("de-DE", {
          day: "2-digit", month: "2-digit", year: "numeric",
          hour: "2-digit", minute: "2-digit"
        });

      // Die Anzahl der Spiele gehoert nur auf die Spielübersicht.
      if (aktiv === "uebersicht") {
        zeilen.push(daten.spiele.count + " Spiele");
      }
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
      return laden(QUELLEN[name], name === "mannschaften" || name === "faq");
    });

    Promise.all(auftraege).then(function (ergebnisse) {
      noetig.forEach(function (name, index) {
        daten[name] = ergebnisse[index];
      });

      zeichneKopf(optionen.seite, "");
      stand(standAusDaten(optionen.seite));
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
    beispielHinweis: beispielHinweis,
    saisonListe: saisonListe,
    aktuelleSaison: aktuelleSaison,
    istBeispiel: istBeispiel,
    bereiche: bereiche,
    ohneVerein: ohneVerein,
    felder: FELDER,
    aufloesen: aufloesen,
    adresse: adresse,
    kartenLink: kartenLink,
    orte: orteListe,
    stand: stand,
    daten: function () { return daten; }
  };
}());
