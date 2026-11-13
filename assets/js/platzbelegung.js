/* Seite "Platzbelegung": wie sind die Plaetze zu welcher Zeit aufgeteilt?
 *
 * Im Sommer stehen beide Plaetze zur Verfuegung (Kunstrasen KR und
 * Naturrasen NR) und werden als zwei getrennte Spielfelder gezeichnet. Im
 * Winter ist der Naturrasen gesperrt, es bleibt der Kunstrasen.
 *
 * Zwei Ansichten:
 *  - Tag:   je Zeitspanne eine Zeichnung, in der jede Mannschaft den ihr
 *           zugewiesenen Teil des Feldes einnimmt.
 *  - Woche: Wochenplan je Platz, Tage nebeneinander, Zeit nach unten.
 * Ueberschneiden sich zwei Mannschaften auf demselben Teil, wird das rot
 * markiert und benannt.
 *
 * Quellen:
 *  - Training: config/mannschaften.json (von Hand): Saisons, Orte, Einheiten.
 *    Eine Einheit nennt ihren Platz als Code, z. B. KR-H1 (Kunstrasen,
 *    Haelfte 1) oder NR-G (Naturrasen, ganzes Feld).
 *  - Spiele:   data/matches.json (FUSSBALL.DE), nur Spiele auf der
 *    eigenen Anlage (ownVenue).
 */

(function () {
  "use strict";

  var WOCHENTAGE = ["Montag", "Dienstag", "Mittwoch", "Donnerstag",
    "Freitag", "Samstag", "Sonntag"];
  var KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  var ERSTE_SPIELE = 10;
  var ROT = "#b3261e";
  var PX_JE_MINUTE = 1.05;

  var FARBEN = ["#1c3a78", "#b5472b", "#7b3fa0", "#a87400", "#00796b",
    "#ad1457", "#455a64", "#5d4037", "#2e5fa8", "#6a1b9a", "#37474f",
    "#8a5a00"];

  var RASEN = { KR: "#2f7a4a", NR: "#5d9a3c" };

  var S = window.Seite;
  var text = S.text;
  var FELDER = S.felder;

  var heuteTag = (new Date().getDay() + 6) % 7;

  var zustand = {
    saison: null,
    ansicht: "tag",
    tag: null,
    alleSpiele: false,
    daten: null
  };

  function minuten(uhr) {
    var t = String(uhr || "").split(":");
    return (parseInt(t[0], 10) || 0) * 60 + (parseInt(t[1], 10) || 0);
  }

  function uhr(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  function zahl(wert) {
    return Math.round(wert * 100) / 100;
  }

  function config() {
    return zustand.daten.mannschaften;
  }

  function saisons() {
    return config().saisons || {
      sommer: { name: "Sommer", plaetze: ["KR", "NR"],
        felder: ["G", "H", "V"] },
      winter: { name: "Winter", plaetze: ["KR"],
        felder: ["G", "H", "D", "V"] }
    };
  }

  /* Welche Jahreszeit gerade gilt: die mit dem juengsten Beginn ("ab"),
   * der nicht in der Zukunft liegt. Ohne Datum: nach Monat. */
  function aktuelleSaison() {
    var liste = saisons();
    var heute = new Date().toISOString().slice(0, 10);
    var beste = null;

    Object.keys(liste).forEach(function (k) {
      var ab = liste[k].ab;

      if (ab && ab <= heute && (!beste || ab > liste[beste].ab)) {
        beste = k;
      }
    });

    if (!beste) {
      // Noch vor jedem Beginn: es gilt die zuletzt begonnene des Vorjahres.
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

  function datumDe(iso) {
    var t = String(iso || "").split("-");
    return t.length === 3 ? t[2] + "." + t[1] + "." + t[0] : "";
  }

  /* Mannschaftsfarbe: Position in der Mannschaftsliste. */
  function teamNummer(slug) {
    var liste = (zustand.daten.teams && zustand.daten.teams.teams) || [];

    for (var i = 0; i < liste.length; i++) {
      if (liste[i].slug === slug) {
        return i;
      }
    }
    return 0;
  }

  function farbe(slug) {
    return FARBEN[teamNummer(slug) % FARBEN.length];
  }

  function kurzname(slug) {
    var t = S.team(slug);
    return t ? t.short : slug;
  }

  /* --- Einheiten der Saison ----------------------------------------- */

  /* Alle Einheiten der Jahreszeit auf eigenen Plaetzen, mit Position.
   * Dazu eine Liste von Hinweisen auf Angaben, die nicht zur Jahreszeit
   * passen (z. B. Drittel im Sommer, Naturrasen im Winter). */
  function einheitenDerSaison() {
    var def = saisons()[zustand.saison];
    var pflege = config().mannschaften || {};
    var erlaubtePlaetze = def.plaetze || [];
    var erlaubteFelder = def.felder || [];
    var einheiten = [];
    var hinweise = [];

    Object.keys(pflege).forEach(function (slug) {
      var eintrag = pflege[slug] || {};
      var t = eintrag.training;
      var liste = Array.isArray(t) ? (zustand.saison === "sommer" ? t : [])
        : ((t && t[zustand.saison]) || []);

      liste.forEach(function (e) {
        var r = S.aufloesen(e, eintrag);
        var name = kurzname(slug) + " " + (e.tag || "");

        if (r.fehler) {
          hinweise.push(name + ": " + r.fehler);
          return;
        }
        if (!r.kuerzel) {
          return; // anderer Ort, nicht auf unseren Plaetzen
        }
        if (erlaubtePlaetze.indexOf(r.kuerzel) === -1) {
          hinweise.push(name + ": " + r.kuerzel + " steht im "
            + def.name + " nicht zur Verfügung");
          return;
        }
        if (erlaubteFelder.indexOf(FELDER[r.feld].art) === -1) {
          hinweise.push(name + ": " + FELDER[r.feld].name
            + " ist im " + def.name + " nicht vorgesehen");
        }

        var tag = WOCHENTAGE.indexOf(e.tag);

        if (tag === -1 || !e.von || !e.bis) {
          hinweise.push(name + ": Tag oder Uhrzeit unvollständig");
          return;
        }

        einheiten.push({
          slug: slug, tag: tag, von: minuten(e.von), bis: minuten(e.bis),
          kuerzel: r.kuerzel, feld: r.feld
        });
      });
    });

    return { einheiten: einheiten, hinweise: hinweise, plaetze:
      erlaubtePlaetze };
  }

  function ueberschneiden(a, b) {
    var x = FELDER[a.feld].rect;
    var y = FELDER[b.feld].rect;

    return Math.min(x[2], y[2]) - Math.max(x[0], y[0]) > 1e-6
      && Math.min(x[3], y[3]) - Math.max(x[1], y[1]) > 1e-6;
  }

  function zeitGleich(a, b) {
    return a.von < b.bis && b.von < a.bis;
  }

  function inKonflikt(a, b) {
    return a !== b && a.kuerzel === b.kuerzel && zeitGleich(a, b)
      && ueberschneiden(a, b);
  }

  /* --- Zeichnung eines Platzes -------------------------------------- */

  /* Gruppen sich ueberschneidender Einheiten auf einem Platz. */
  function gruppen(einheiten) {
    var rest = einheiten.slice();
    var ergebnis = [];

    while (rest.length) {
      var gruppe = [rest.shift()];
      var geaendert = true;

      while (geaendert) {
        geaendert = false;

        for (var i = rest.length - 1; i >= 0; i--) {
          var trifft = gruppe.some(function (g) {
            return ueberschneiden(g, rest[i]);
          });

          if (trifft) {
            gruppe.push(rest.splice(i, 1)[0]);
            geaendert = true;
          }
        }
      }
      ergebnis.push(gruppe);
    }
    return ergebnis;
  }

  function spielfeld(kuerzel, einheiten) {
    var B = 200;
    var H = 120;
    var linie = 'stroke="#fff" stroke-opacity=".75" stroke-width="1.2" '
      + 'fill="none"';
    var svg = ['<svg class="platz-bild" viewBox="0 0 ' + B + " " + H
      + '" role="img" aria-label="' + text(kuerzel) + '">',
      '<rect width="' + B + '" height="' + H + '" rx="4" fill="'
      + RASEN[kuerzel] + '"/>',
      '<rect x="4" y="4" width="' + (B - 8) + '" height="' + (H - 8) + '" '
      + linie + "/>",
      '<line x1="' + B / 2 + '" y1="4" x2="' + B / 2 + '" y2="' + (H - 4)
      + '" ' + linie + "/>",
      '<circle cx="' + B / 2 + '" cy="' + H / 2 + '" r="14" ' + linie + "/>"];

    gruppen(einheiten).forEach(function (gruppe) {
      var konflikt = gruppe.length > 1;
      var l = 99;
      var o = 99;
      var r = 0;
      var u = 0;

      gruppe.forEach(function (e) {
        var rc = FELDER[e.feld].rect;
        l = Math.min(l, rc[0]); o = Math.min(o, rc[1]);
        r = Math.max(r, rc[2]); u = Math.max(u, rc[3]);
      });

      var x = 4 + l * (B - 8);
      var y = 4 + o * (H - 8);
      var w = (r - l) * (B - 8);
      var h = (u - o) * (H - 8);
      var name = konflikt
        ? "! " + gruppe.map(function (e) { return kurzname(e.slug); })
          .join(" + ")
        : kurzname(gruppe[0].slug);
      var fuell = konflikt ? ROT : farbe(gruppe[0].slug);
      var schrift = Math.max(6, Math.min(13, w / (name.length * .62)));

      svg.push('<rect x="' + zahl(x + 1) + '" y="' + zahl(y + 1)
        + '" width="' + zahl(w - 2) + '" height="' + zahl(h - 2)
        + '" rx="3" fill="' + fuell + '" fill-opacity=".9" stroke="#fff" '
        + 'stroke-width="1"/>');
      svg.push('<text x="' + zahl(x + w / 2) + '" y="' + zahl(y + h / 2)
        + '" text-anchor="middle" dominant-baseline="central" fill="#fff" '
        + 'font-size="' + zahl(schrift) + '" font-weight="700">'
        + text(name) + "</text>");
    });

    svg.push("</svg>");
    return svg.join("");
  }

  /* --- Tagesansicht ------------------------------------------------- */

  function zeitspannen(einheiten) {
    var marken = {};

    einheiten.forEach(function (e) {
      marken[e.von] = true;
      marken[e.bis] = true;
    });

    var punkte = Object.keys(marken).map(Number).sort(function (a, b) {
      return a - b;
    });
    var spannen = [];

    for (var i = 0; i < punkte.length - 1; i++) {
      var von = punkte[i];
      var bis = punkte[i + 1];
      var aktiv = einheiten.filter(function (e) {
        return e.von <= von && e.bis >= bis;
      });

      if (!aktiv.length) {
        continue;
      }

      var signatur = aktiv.map(function (e) {
        return e.slug + e.kuerzel + e.feld;
      }).sort().join("|");
      var letzte = spannen[spannen.length - 1];

      if (letzte && letzte.signatur === signatur && letzte.bis === von) {
        letzte.bis = bis;
      } else {
        spannen.push({ von: von, bis: bis, signatur: signatur,
          aktiv: aktiv });
      }
    }
    return spannen;
  }

  function legende(aktiv) {
    var zeilen = aktiv.slice().sort(function (a, b) {
      return a.kuerzel < b.kuerzel ? -1 : (a.kuerzel > b.kuerzel ? 1
        : (a.feld < b.feld ? -1 : 1));
    }).map(function (e) {
      var streit = aktiv.some(function (f) { return inKonflikt(e, f); });

      return '<li><span class="punkt" style="background:'
        + (streit ? ROT : farbe(e.slug)) + '"></span>'
        + text(kurzname(e.slug)) + ' <span class="leise">'
        + text(e.kuerzel + "-" + e.feld + " · " + FELDER[e.feld].name)
        + "</span></li>";
    });

    return '<ul class="platz-liste">' + zeilen.join("") + "</ul>";
  }

  function konfliktText(aktiv) {
    var paare = [];

    aktiv.forEach(function (a, i) {
      aktiv.slice(i + 1).forEach(function (b) {
        if (inKonflikt(a, b)) {
          paare.push(kurzname(a.slug) + " und " + kurzname(b.slug) + " ("
            + a.kuerzel + ")");
        }
      });
    });

    return paare.length
      ? '<p class="platz-konflikt">Doppelt belegt: ' + text(paare.join(", "))
        + "</p>" : "";
  }

  function tagesansicht(ergebnis) {
    var einheiten = ergebnis.einheiten.filter(function (e) {
      return e.tag === zustand.tag;
    });

    if (!einheiten.length) {
      return '<p class="leise">Am ' + WOCHENTAGE[zustand.tag]
        + " ist kein Training auf diesen Plätzen eingetragen.</p>";
    }

    var html = [];

    zeitspannen(einheiten).forEach(function (spanne) {
      var bilder = ergebnis.plaetze.map(function (kz) {
        var hier = spanne.aktiv.filter(function (e) {
          return e.kuerzel === kz;
        });

        return '<figure class="platz-eins"><figcaption>'
          + text(plaetzeNamen()[kz] || kz) + "</figcaption>"
          + spielfeld(kz, hier)
          + (hier.length ? "" : '<p class="leise platz-frei">frei</p>')
          + "</figure>";
      }).join("");

      html.push('<section class="platz-karte"><h3>' + uhr(spanne.von)
        + " – " + uhr(spanne.bis) + " Uhr</h3>"
        + '<div class="platz-paar platz-paar-' + ergebnis.plaetze.length
        + '">' + bilder + "</div>"
        + legende(spanne.aktiv) + konfliktText(spanne.aktiv)
        + "</section>");
    });

    return '<div class="platz-raster">' + html.join("") + "</div>";
  }

  /* --- Wochenansicht ------------------------------------------------ */

  /* Einheiten eines Tages nebeneinander anordnen, wenn sie sich zeitlich
   * ueberschneiden (wie in einem Kalender). */
  function spuren(einheiten) {
    var sortiert = einheiten.slice().sort(function (a, b) {
      return a.von - b.von || a.bis - b.bis;
    });
    var ergebnis = [];
    var haufen = [];
    var ende = -1;

    function abschliessen() {
      var anzahl = 0;

      haufen.forEach(function (h) { anzahl = Math.max(anzahl, h.spur + 1); });
      haufen.forEach(function (h) { h.spuren = anzahl; ergebnis.push(h); });
      haufen = [];
    }

    sortiert.forEach(function (e) {
      if (haufen.length && e.von >= ende) {
        abschliessen();
        ende = -1;
      }

      var belegt = {};

      haufen.forEach(function (h) {
        if (h.bis > e.von) {
          belegt[h.spur] = true;
        }
      });

      var spur = 0;

      while (belegt[spur]) {
        spur++;
      }

      haufen.push({ e: e, spur: spur });
      ende = Math.max(ende, e.bis);
    });

    abschliessen();
    return ergebnis;
  }

  function wochenplatz(kz, alle) {
    var hier = alle.filter(function (e) { return e.kuerzel === kz; });

    if (!hier.length) {
      return '<p class="leise">Kein Training auf diesem Platz.</p>';
    }

    var frueh = Math.floor(Math.min.apply(null, hier.map(function (e) {
      return e.von;
    })) / 60) * 60;
    var spaet = Math.ceil(Math.max.apply(null, hier.map(function (e) {
      return e.bis;
    })) / 60) * 60;
    var hoehe = (spaet - frueh) * PX_JE_MINUTE;
    var tage = [0, 1, 2, 3, 4, 5, 6].filter(function (t) {
      return t < 5 || hier.some(function (e) { return e.tag === t; });
    });

    var achse = [];

    for (var m = frueh; m <= spaet; m += 60) {
      achse.push('<span style="top:' + zahl((m - frueh) * PX_JE_MINUTE)
        + 'px">' + uhr(m) + "</span>");
    }

    var spaltenHtml = tage.map(function (t) {
      var tagesEinheiten = hier.filter(function (e) { return e.tag === t; });
      var bloecke = spuren(tagesEinheiten).map(function (p) {
        var e = p.e;
        var streit = tagesEinheiten.some(function (f) {
          return inKonflikt(e, f);
        });
        var breite = 100 / p.spuren;

        return '<div class="platz-block' + (streit ? " streit" : "")
          + '" style="top:' + zahl((e.von - frueh) * PX_JE_MINUTE)
          + "px;height:" + zahl((e.bis - e.von) * PX_JE_MINUTE - 2)
          + "px;left:" + zahl(p.spur * breite) + "%;width:"
          + zahl(breite) + "%;background:" + (streit ? ROT : farbe(e.slug))
          + '" title="' + text(kurzname(e.slug) + " · " + uhr(e.von)
          + " – " + uhr(e.bis) + " · " + e.kuerzel + "-" + e.feld
          + (streit ? " · doppelt belegt" : "")) + '"><b>'
          + text(kurzname(e.slug)) + "</b><span>" + e.feld
          + "</span></div>";
      }).join("");

      return '<div class="platz-tag"><div class="platz-tagkopf'
        + (t === heuteTag ? " heute" : "") + '">' + KURZ[t] + "</div>"
        + '<div class="platz-tagfeld" style="height:' + zahl(hoehe)
        + 'px">' + bloecke + "</div></div>";
    }).join("");

    return '<div class="platz-woche"><div class="platz-achse">'
      + '<div class="platz-tagkopf">&nbsp;</div>'
      + '<div class="platz-tagfeld" style="height:' + zahl(hoehe) + 'px">'
      + achse.join("") + "</div></div>" + spaltenHtml + "</div>";
  }

  function wochenansicht(ergebnis) {
    var html = ergebnis.plaetze.map(function (kz) {
      return '<section class="platz-wochenkarte"><h3>'
        + text(plaetzeNamen()[kz] || kz) + "</h3>"
        + '<div class="platz-scroll">' + wochenplatz(kz, ergebnis.einheiten)
        + "</div></section>";
    });

    return html.join("")
      + '<p class="leise platz-hinweis">Das Kürzel im Block nennt den Teil des '
      + "Platzes (G ganz, H Hälfte, D Drittel, V Viertel). Rot: derselbe "
      + "Teil ist doppelt belegt.</p>";
  }

  /* Anzeigenamen der eigenen Plaetze nach Kuerzel. */
  function plaetzeNamen() {
    var orte = S.orte();
    var namen = {};

    Object.keys(orte).forEach(function (k) {
      if (orte[k].kuerzel) {
        namen[String(orte[k].kuerzel).toUpperCase()] = orte[k].name;
      }
    });
    return namen;
  }

  /* --- Spiele ------------------------------------------------------- */

  function spieleHtml() {
    var kuerzelNachRasen = {};
    var orte = S.orte();

    Object.keys(orte).forEach(function (k) {
      if (orte[k].kuerzel && orte[k].rasen) {
        kuerzelNachRasen[orte[k].rasen] = String(orte[k].kuerzel)
          .toUpperCase();
      }
    });

    var heute = S.heute();
    var spiele = ((zustand.daten.spiele && zustand.daten.spiele.matches)
      || []).filter(function (spiel) {
      return spiel.ownVenue && kuerzelNachRasen[spiel.pitch]
        && new Date(spiel.date + "T12:00:00") >= heute;
    });

    if (!spiele.length) {
      return '<p class="leise">Keine kommenden Spiele auf unseren '
        + "Plätzen.</p>";
    }

    var gezeigt = zustand.alleSpiele ? spiele : spiele.slice(0, ERSTE_SPIELE);

    var zeilen = gezeigt.map(function (spiel) {
      var stern = spiel.pitchAssumed
        ? ' <span class="stern" title="Platzart angenommen, FUSSBALL.DE '
          + 'nennt keine">*</span>' : "";

      return "<tr><th>" + text(S.datumKurz(spiel.date)) + "</th>"
        + "<td>" + text(spiel.time || "offen") + "</td>"
        + "<td>" + text(kuerzelNachRasen[spiel.pitch]) + stern + "</td>"
        + "<td>" + text(kurzname(spiel.teamSlug)) + "</td>"
        + '<td class="leise">' + text(spiel.home) + " – "
        + text(spiel.away) + "</td></tr>";
    });

    var mehr = "";

    if (spiele.length > ERSTE_SPIELE) {
      mehr = '<p><button type="button" class="zeilen-knopf platz-mehr">'
        + (zustand.alleSpiele ? "Weniger anzeigen"
          : "Alle " + spiele.length + " Spiele anzeigen") + "</button></p>";
    }

    return '<table class="training platz-spiele">' + zeilen.join("")
      + "</table>" + mehr
      + '<p class="leise platz-hinweis">Spiele von FUSSBALL.DE, nur auf der '
      + "eigenen Anlage und ab heute. Ein "
      + '<span class="stern">*</span> bedeutet: Platzart angenommen, '
      + "FUSSBALL.DE nennt keine.</p>";
  }

  /* --- Seite -------------------------------------------------------- */

  function chip(klasse, wert, beschriftung, an, zusatz) {
    return '<button type="button" class="chip ' + klasse + '" data-wert="'
      + text(wert) + '" aria-pressed="' + an + '"' + (zusatz || "") + ">"
      + text(beschriftung) + "</button>";
  }

  function zeichne() {
    var ziel = document.getElementById("belegungbereich");
    var liste = saisons();
    var def = liste[zustand.saison];
    var ergebnis = einheitenDerSaison();
    var aktuell = aktuelleSaison();
    var html = [S.beispielHinweis()];
    var namen = plaetzeNamen();

    var jahreszeiten = Object.keys(liste).map(function (k) {
      return chip("saison", k, liste[k].name || k, k === zustand.saison);
    }).join("");

    var ansichten = chip("ansicht", "tag", "Tag", zustand.ansicht === "tag")
      + chip("ansicht", "woche", "Woche", zustand.ansicht === "woche");

    html.push('<div class="schalter"><div class="segment" role="group" '
      + 'aria-label="Jahreszeit">' + jahreszeiten + "</div>"
      + '<div class="segment" role="group" aria-label="Ansicht">'
      + ansichten + "</div></div>");

    if (zustand.ansicht === "tag") {
      html.push('<div class="segment" role="group" aria-label="Wochentag">'
        + WOCHENTAGE.map(function (name, i) {
          var hat = ergebnis.einheiten.some(function (e) {
            return e.tag === i;
          });

          return chip("tag", i, KURZ[i], i === zustand.tag,
            hat ? "" : ' data-leer="1"');
        }).join("") + "</div>");
    }

    html.push('<p class="leise platz-hinweis">'
      + text(def.name || zustand.saison) + ": "
      + text((def.plaetze || []).map(function (k) {
        return namen[k] || k;
      }).join(" und ")) + (def.ab ? " · gilt ab " + datumDe(def.ab) : "")
      + (zustand.saison !== aktuell
        ? " · <b>aktuell gilt " + text((liste[aktuell] || {}).name
          || aktuell) + "</b>" : "") + "</p>");

    if (ergebnis.hinweise.length) {
      html.push('<p class="warnung"><b>Unstimmigkeiten in den Zeiten:</b> '
        + text(ergebnis.hinweise.join("; ")) + "</p>");
    }

    html.push(zustand.ansicht === "tag" ? tagesansicht(ergebnis)
      : wochenansicht(ergebnis));

    html.push("<h2>Kommende Spiele auf unseren Plätzen</h2>");
    html.push(spieleHtml());

    ziel.innerHTML = html.join("");
  }

  S.start({
    seite: "platzbelegung",
    braucht: ["teams", "spiele", "mannschaften"],
    fertig: function (daten) {
      var ziel = document.getElementById("belegungbereich");

      zustand.daten = daten;

      if (!daten.mannschaften) {
        ziel.innerHTML = '<p class="warnung">Die Datei <code>config/'
          + "mannschaften.json</code> fehlt.</p>";
        return;
      }

      zustand.saison = aktuelleSaison();
      zustand.tag = heuteTag > 4 ? 0 : heuteTag;
      zeichne();

      ziel.addEventListener("click", function (ereignis) {
        var knopf = ereignis.target.closest(".chip");

        if (knopf) {
          var wert = knopf.dataset.wert;

          if (knopf.classList.contains("saison")) {
            zustand.saison = wert;
          } else if (knopf.classList.contains("ansicht")) {
            zustand.ansicht = wert;
          } else {
            zustand.tag = parseInt(wert, 10);
          }

          zeichne();
          return;
        }

        if (ereignis.target.closest(".platz-mehr")) {
          zustand.alleSpiele = !zustand.alleSpiele;
          zeichne();
        }
      });
    }
  });
}());
