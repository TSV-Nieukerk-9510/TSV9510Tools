/* Textgenerator: erzeugt aus einer Vorlage und den Spieldaten einen
 * fertigen E-Mail-Text zum Kopieren.
 *
 * Die Vorlagen liegen als einfache Textdateien unter templates/ und
 * koennen dort ohne Programmierkenntnisse geaendert werden. Platzhalter
 * stehen in doppelten geschweiften Klammern: {{spielnummer}}.
 *
 * Bekannte Platzhalter werden aus dem Spiel gefuellt. Jeder andere wird
 * automatisch zu einem Eingabefeld - eine neue Vorlage mit einem neuen
 * Platzhalter braucht also keine Aenderung an diesem Code.
 */

window.Textgenerator = (function () {
  "use strict";

  var SPEICHER = "tsv9510.textgenerator";

  var manifest = null;
  var vorlagen = {};
  var aktuell = null;
  var knoten = null;

  /* --- Hilfsmittel ---------------------------------------------- */

  function text(wert) {
    return String(wert == null ? "" : wert).replace(/[&<>"]/g, function (z) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z];
    });
  }

  function gemerkt() {
    try {
      return JSON.parse(localStorage.getItem(SPEICHER) || "{}");
    } catch (fehler) {
      return {};
    }
  }

  function merken(werte) {
    try {
      localStorage.setItem(SPEICHER, JSON.stringify(werte));
    } catch (fehler) {
      /* Kein Speicher verfuegbar - nicht schlimm, nur unbequem. */
    }
  }

  function datumLang(iso) {
    return new Date(iso + "T12:00:00").toLocaleDateString("de-DE", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric"
    });
  }

  /* --- Platzhalter aus den Spieldaten --------------------------- */

  function ausSpiel(spiel, verein) {
    return {
      spielnummer: spiel.matchNumber || "(nicht bekannt)",
      spieltag: spiel.matchDay ? spiel.matchDay + ". Spieltag" : "",
      staffelid: spiel.divisionId || "",
      wettbewerb: spiel.competition || "",
      mannschaft: spiel.teamName || "",
      heim: spiel.home || "",
      gast: spiel.away || "",
      gegner: spiel.opponent || "",
      heimauswaerts: spiel.isHome ? "Heimspiel" : "Auswärtsspiel",
      datum: datumLang(spiel.date),
      uhrzeit: spiel.time || "noch offen",
      spielort: spiel.venue || "(noch nicht bekannt)",
      anlage: spiel.venueName || "",
      adresse: spiel.address || "",
      anfahrt: spiel.mapsUrl || "",
      schiedsrichter: spiel.referee || "",
      spielseite: spiel.url || "",
      staffelseite: spiel.divisionUrl || "",
      verein: verein || ""
    };
  }

  function platzhalter(vorlage) {
    var gefunden = [];
    var muster = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;
    var treffer;

    while ((treffer = muster.exec(vorlage)) !== null) {
      if (gefunden.indexOf(treffer[1]) === -1) {
        gefunden.push(treffer[1]);
      }
    }

    return gefunden;
  }

  function einsetzen(vorlage, werte) {
    return vorlage.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
      function (ganzes, name) {
        return werte[name] == null ? "" : werte[name];
      });
  }

  /* --- Laden ----------------------------------------------------- */

  function ladeManifest() {
    if (manifest) {
      return Promise.resolve(manifest);
    }

    return fetch("templates/manifest.json", { cache: "no-cache" })
      .then(function (antwort) {
        if (!antwort.ok) {
          throw new Error("templates/manifest.json nicht gefunden");
        }
        return antwort.json();
      })
      .then(function (geladen) {
        manifest = geladen;
        return manifest;
      });
  }

  function ladeVorlage(datei) {
    if (vorlagen[datei]) {
      return Promise.resolve(vorlagen[datei]);
    }

    return fetch("templates/" + datei, { cache: "no-cache" })
      .then(function (antwort) {
        if (!antwort.ok) {
          throw new Error("Vorlage " + datei + " nicht gefunden");
        }
        return antwort.text();
      })
      .then(function (inhalt) {
        vorlagen[datei] = inhalt;
        return inhalt;
      });
  }

  /* --- Aufbau des Fensters --------------------------------------- */

  function aufbauen() {
    if (knoten) {
      return knoten;
    }

    var huelle = document.createElement("div");
    huelle.className = "tg-huelle";
    huelle.hidden = true;
    huelle.innerHTML =
      '<div class="tg-fenster" role="dialog" aria-modal="true"'
      + ' aria-labelledby="tg-titel">'
      + '<div class="tg-kopf">'
      + '<h3 id="tg-titel">E-Mail-Text erzeugen</h3>'
      + '<button type="button" class="tg-schliessen" aria-label="Schließen">'
      + "×</button>"
      + "</div>"
      + '<p class="tg-spiel"></p>'
      + '<div class="tg-steuerung">'
      + '<label class="tg-feld"><span>Vorlage</span>'
      + '<select class="tg-vorlage"></select></label>'
      + '<div class="tg-felder"></div>'
      + "</div>"
      + '<label class="tg-feld"><span>Betreff</span>'
      + '<input type="text" class="tg-betreff"></label>'
      + '<label class="tg-feld"><span>Text — vor dem Kopieren noch '
      + 'änderbar</span>'
      + '<textarea class="tg-text" rows="16"></textarea></label>'
      + '<div class="tg-fuss">'
      + '<span class="tg-meldung" role="status"></span>'
      + '<button type="button" class="tg-knopf tg-kopiere-betreff">'
      + "Betreff kopieren</button>"
      + '<button type="button" class="tg-knopf tg-haupt tg-kopiere-text">'
      + "Text kopieren</button>"
      + "</div>"
      + "</div>";

    document.body.appendChild(huelle);
    knoten = huelle;

    huelle.addEventListener("click", function (ereignis) {
      if (ereignis.target === huelle
          || ereignis.target.closest(".tg-schliessen")) {
        schliessen();
      }
    });

    document.addEventListener("keydown", function (ereignis) {
      if (ereignis.key === "Escape" && !huelle.hidden) {
        schliessen();
      }
    });

    huelle.querySelector(".tg-vorlage")
      .addEventListener("change", vorlageWechseln);

    huelle.querySelector(".tg-kopiere-text")
      .addEventListener("click", function () {
        kopieren(huelle.querySelector(".tg-text").value, "Text kopiert.");
      });

    huelle.querySelector(".tg-kopiere-betreff")
      .addEventListener("click", function () {
        kopieren(huelle.querySelector(".tg-betreff").value,
          "Betreff kopiert.");
      });

    return huelle;
  }

  function melden(nachricht) {
    var feld = knoten.querySelector(".tg-meldung");
    feld.textContent = nachricht;

    window.setTimeout(function () {
      if (feld.textContent === nachricht) {
        feld.textContent = "";
      }
    }, 2500);
  }

  function kopieren(inhalt, erfolg) {
    if (!inhalt) {
      melden("Nichts zu kopieren.");
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inhalt).then(function () {
        melden(erfolg);
      }).catch(function () {
        melden("Kopieren nicht möglich — bitte von Hand markieren.");
      });
      return;
    }

    melden("Kopieren nicht möglich — bitte von Hand markieren.");
  }

  /* --- Erzeugen --------------------------------------------------- */

  function freieFelder(namen) {
    var bereich = knoten.querySelector(".tg-felder");
    var beschriftungen = (manifest && manifest.felder) || {};
    var werte = gemerkt();
    var html = [];

    namen.forEach(function (name) {
      var beschriftung = beschriftungen[name]
        || name.charAt(0).toUpperCase() + name.slice(1);

      html.push('<label class="tg-feld"><span>' + text(beschriftung)
        + '</span><input type="text" data-feld="' + text(name)
        + '" value="' + text(werte[name] || "") + '"></label>');
    });

    bereich.innerHTML = html.join("");

    Array.prototype.forEach.call(
      bereich.querySelectorAll("input"),
      function (eingabe) {
        eingabe.addEventListener("input", zeichnen);
      }
    );
  }

  function zeichnen() {
    var rohtext = aktuell.rohtext;
    var werte = aktuell.daten;
    var eigene = {};

    Array.prototype.forEach.call(
      knoten.querySelectorAll(".tg-felder input"),
      function (eingabe) {
        eigene[eingabe.dataset.feld] = eingabe.value;
      }
    );

    merken(eigene);

    var alle = Object.assign({}, werte, eigene);
    var fertig = einsetzen(rohtext, alle);

    var zeilen = fertig.split("\n");
    var betreff = "";

    if (/^Betreff:/i.test(zeilen[0])) {
      betreff = zeilen.shift().replace(/^Betreff:\s*/i, "");

      while (zeilen.length && !zeilen[0].trim()) {
        zeilen.shift();
      }
    }

    knoten.querySelector(".tg-betreff").value = betreff;
    knoten.querySelector(".tg-text").value = zeilen.join("\n").trim() + "\n";
  }

  function vorlageWechseln() {
    var datei = knoten.querySelector(".tg-vorlage").value;

    ladeVorlage(datei).then(function (rohtext) {
      aktuell.rohtext = rohtext;

      var unbekannt = platzhalter(rohtext).filter(function (name) {
        return !(name in aktuell.daten);
      });

      freieFelder(unbekannt);
      zeichnen();
    }).catch(function (fehler) {
      knoten.querySelector(".tg-text").value = fehler.message;
    });
  }

  function schliessen() {
    if (knoten) {
      knoten.hidden = true;
    }
  }

  function oeffnen(spiel, verein) {
    var huelle = aufbauen();

    huelle.hidden = false;
    huelle.querySelector(".tg-spiel").textContent =
      spiel.home + " – " + spiel.away + " · " + datumLang(spiel.date)
      + (spiel.time ? ", " + spiel.time + " Uhr" : "");

    aktuell = { spiel: spiel, daten: ausSpiel(spiel, verein), rohtext: "" };

    ladeManifest().then(function (geladen) {
      var auswahl = huelle.querySelector(".tg-vorlage");

      auswahl.innerHTML = geladen.vorlagen.map(function (eintrag) {
        return '<option value="' + text(eintrag.datei) + '">'
          + text(eintrag.titel) + "</option>";
      }).join("");

      vorlageWechseln();
    }).catch(function (fehler) {
      huelle.querySelector(".tg-text").value =
        "Vorlagen konnten nicht geladen werden: " + fehler.message;
    });
  }

  return { oeffnen: oeffnen, schliessen: schliessen };
}());
