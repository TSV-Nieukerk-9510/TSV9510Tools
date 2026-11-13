/* Seite "Kalender": die Abos zum Mitnehmen.
 *
 * Gegliedert wie die Spieluebersicht: Sammelkalender, dann die Gruppen.
 * Jeder Eintrag klappt auf Klick auf und zeigt dann die vollstaendige
 * Adresse zum Kopieren, den QR-Code zum Abscannen und die Knoepfe.
 * Erklaerungen sind standardmaessig zugeklappt.
 */

(function () {
  "use strict";

  var ZEILEN = ["senioren", "jugend", "maedchen"];

  var S = window.Seite;
  var text = S.text;

  var zustand = { offen: {}, spiele: null, gruppen: {}, basis: "" };

  function adresse(slug) {
    return zustand.basis + "kalender/" + slug + ".ics";
  }

  function zaehle(pruefung) {
    if (!zustand.spiele) {
      return null;
    }
    return zustand.spiele.matches.filter(pruefung).length;
  }

  /* --- Aufklappbare Bausteine --------------------------------------- */

  function klappe(schluessel, titel, unten, inhalt, zusatz) {
    var auf = Boolean(zustand.offen[schluessel]);

    return '<div class="klapper' + (auf ? " auf" : "")
      + (zusatz ? " " + zusatz : "") + '">'
      + '<button type="button" class="klapp-kopf" data-klapp="'
      + text(schluessel) + '" aria-expanded="' + auf + '">'
      + "<span><b>" + text(titel) + "</b>"
      + (unten ? '<span class="klapp-unten">' + text(unten) + "</span>" : "")
      + "</span>"
      + '<span class="pfeil-auf" aria-hidden="true">›</span>'
      + "</button>"
      + (auf ? '<div class="klapp-inhalt">' + inhalt + "</div>" : "")
      + "</div>";
  }

  function kalenderInhalt(slug) {
    var url = adresse(slug);

    return '<div class="kal-details">'
      + '<div class="kal-text">'
      + '<label class="kal-feld"><span>Adresse des Kalenders</span>'
      + '<input type="text" readonly value="' + text(url) + '"'
      + ' class="kal-adresse" data-slug="' + text(slug) + '"></label>'
      + '<p class="kal-knoepfe">'
      + '<a class="zeilen-knopf" href="kalender/' + text(slug) + '.ics">'
      + "Datei öffnen</a>"
      + '<button type="button" class="zeilen-knopf kal-kopieren"'
      + ' data-slug="' + text(slug) + '">Adresse kopieren</button>'
      + "</p>"
      + "</div>"
      + '<figure class="kal-qr">'
      + '<img src="qr/' + text(slug) + '.svg" alt="QR-Code mit der '
      + 'Adresse des Kalenders" width="150" height="150" loading="lazy">'
      + "<figcaption>Mit dem Handy abscannen</figcaption>"
      + "</figure>"
      + "</div>";
  }

  function eintrag(slug, titel, unten, anzahl) {
    var beschreibung = unten || "";

    if (anzahl != null) {
      beschreibung += (beschreibung ? " · " : "")
        + anzahl + (anzahl === 1 ? " Spiel" : " Spiele");
    }

    return klappe("kal-" + slug, titel, beschreibung,
      kalenderInhalt(slug));
  }

  /* --- Seite ------------------------------------------------------- */

  function zeichne() {
    var ziel = document.getElementById("kalenderbereich");
    var html = [];

    // Erklaerungen: zugeklappt, damit die Liste oben steht
    html.push('<div class="klapp-hinweise">');
    html.push(klappe("hilfe-abo", "Wie funktioniert ein Kalender-Abo?", "",
      "<p>Ein Abo aktualisiert sich von selbst: neue Termine, "
      + "Verlegungen und geänderte Anstoßzeiten landen automatisch im "
      + "Kalender auf dem Handy. Dazu die Adresse des gewünschten "
      + "Kalenders kopieren und im Kalenderprogramm als Abo "
      + "eintragen.</p>"
      + "<p>Ein einmaliger Import der heruntergeladenen Datei geht "
      + "auch, bleibt aber auf dem Stand des Downloads.</p>",
      "hinweis-klapper"));

    html.push(klappe("hilfe-eintrag", "Was steht in einem Termin?", "",
      "<p>Der Termin beginnt beim Anstoß und dauert die Regelspielzeit "
      + "samt Halbzeitpause – je nach Altersklasse zwischen 40 und 105 "
      + "Minuten. Der Betreff nennt nur <b>H</b> oder <b>A</b> und den "
      + "Gegner, damit auf dem Handy das Wesentliche sichtbar "
      + "bleibt. Alle Zeiten gelten für Deutschland; die Umstellung "
      + "zwischen Sommer- und Winterzeit übernimmt der Kalender "
      + "selbst.</p>"
      + "<p>Steht die Anstoßzeit noch nicht fest, wird die übliche "
      + "Zeit der Mannschaft eingetragen und der Termin mit "
      + "<b>?</b> am Anfang des Betreffs gekennzeichnet. In den Einzelheiten "
      + "stehen Spielnummer, Staffel, Spielstätte, Platzart und die "
      + "Verknüpfungen zu FUSSBALL.DE, zur Anfahrt und zu dieser "
      + "Seite.</p>",
      "hinweis-klapper"));
    html.push("</div>");

    html.push("<h2>Sammelkalender</h2>");
    html.push('<div class="kal-zeilen">');
    html.push(eintrag("alle", "Alle Mannschaften", "jedes Spiel des Vereins",
      zaehle(function () { return true; })));

    html.push(eintrag("heim-kunstrasen", "Heimspiele Kunstrasen",
      "Belegung der eigenen Anlage",
      zaehle(function (spiel) {
        return spiel.ownVenue && spiel.pitch === "Kunstrasen";
      })));

    html.push(eintrag("heim-naturrasen", "Heimspiele Naturrasen",
      "Belegung der eigenen Anlage",
      zaehle(function (spiel) {
        return spiel.ownVenue && spiel.pitch === "Naturrasen";
      })));

    html.push("</div>");

    // Gruppen wie in der Spieluebersicht: erst der Sammelkalender der
    // Gruppe, darunter die einzelnen Mannschaften.
    ZEILEN.forEach(function (schluessel) {
      var mannschaften = S.aktiveTeams().filter(function (team) {
        return team.group === schluessel;
      });

      if (!mannschaften.length) {
        return;
      }

      var name = zustand.gruppen[schluessel] || schluessel;

      html.push("<h2>" + text(name) + "</h2>");
      html.push('<div class="kal-zeilen">');

      html.push(eintrag(schluessel, "Alle " + name,
        "Sammelkalender dieser Gruppe",
        zaehle(function (spiel) {
          var team = S.team(spiel.teamSlug);
          return team && team.group === schluessel;
        })));

      mannschaften.forEach(function (team) {
        html.push(eintrag(team.slug, team.short, team.name,
          zaehle(function (spiel) {
            return spiel.teamSlug === team.slug;
          })));
      });

      html.push("</div>");
    });

    ziel.innerHTML = html.join("");
  }

  function kopieren(knopf) {
    var url = adresse(knopf.dataset.slug);
    var feld = knopf.closest(".kal-details").querySelector(".kal-adresse");

    function bestaetige() {
      knopf.textContent = "Adresse kopiert";
      window.setTimeout(function () {
        knopf.textContent = "Adresse kopieren";
      }, 2000);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(bestaetige).catch(function () {
        feld.select();
        knopf.textContent = "Bitte von Hand kopieren";
      });
    } else {
      feld.select();
      knopf.textContent = "Bitte von Hand kopieren";
    }
  }

  S.start({
    seite: "kalender",
    braucht: ["teams", "spiele"],
    fertig: function (daten) {
      zustand.spiele = daten.spiele;
      zustand.gruppen = daten.teams.groups || {};
      zustand.basis = window.location.href.split("?")[0]
        .replace(/[^/]*$/, "");

      zeichne();

      document.getElementById("kalenderbereich")
        .addEventListener("click", function (ereignis) {
          var kopf = ereignis.target.closest(".klapp-kopf");

          if (kopf) {
            var schluessel = kopf.dataset.klapp;

            if (zustand.offen[schluessel]) {
              delete zustand.offen[schluessel];
            } else {
              zustand.offen[schluessel] = true;
            }

            zeichne();
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
