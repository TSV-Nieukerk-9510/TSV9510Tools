/* Seite "Einstellungen": Uebersicht aller Werte, die ueber die
 * Konfigurationsdateien geaendert werden koennen.
 *
 * Der Katalog steht in config/einstellungen.json (Beschreibung, Datei,
 * Wirkung). Den aktuellen Wert liest die Seite live aus der jeweiligen
 * Konfigurationsdatei. Die Seite aendert nichts - geaendert wird in der
 * Datei, siehe README.
 */

(function () {
  "use strict";

  var S = window.Seite;
  var text = S.text;

  function holen(wurzel, pfad) {
    var teile = pfad.split(".");
    var wert = wurzel;

    for (var i = 0; i < teile.length; i++) {
      if (wert == null || typeof wert !== "object") {
        return undefined;
      }
      wert = wert[teile[i]];
    }
    return wert;
  }

  /* Kurze, lesbare Darstellung eines Wertes. */
  function wertHtml(wert) {
    if (wert === undefined) {
      return '<span class="leise">nicht gesetzt</span>';
    }
    if (wert === null || wert === "") {
      return '<span class="leise">leer</span>';
    }
    if (typeof wert === "boolean") {
      return wert ? "ja" : "nein";
    }
    if (Array.isArray(wert)) {
      if (!wert.length) {
        return '<span class="leise">leer</span>';
      }
      if (wert.every(function (w) { return typeof w !== "object"; })) {
        return text(wert.join(", "));
      }
      return wert.length + (wert.length === 1 ? " Eintrag" : " Einträge");
    }
    if (typeof wert === "object") {
      var schluessel = Object.keys(wert);

      if (schluessel.every(function (k) {
        return typeof wert[k] !== "object";
      })) {
        return text(schluessel.map(function (k) {
          return k + ": " + (wert[k] === true ? "ja"
            : wert[k] === false ? "nein" : wert[k]);
        }).join(", "));
      }
      return schluessel.length + (schluessel.length === 1
        ? " Eintrag" : " Einträge");
    }
    return text(wert);
  }

  function zeileHtml(eintrag, quelle) {
    var anzeigen = quelle && !/[*\/]/.test(eintrag.pfad);
    var wert = anzeigen ? wertHtml(holen(quelle, eintrag.pfad))
      : '<span class="leise">siehe Datei</span>';

    return "<tr><th scope=\"row\">" + text(eintrag.titel)
      + '<code class="einst-pfad">' + text(eintrag.pfad) + "</code>"
      + '<span class="einst-text">' + text(eintrag.beschreibung)
      + "</span></th><td>" + wert + "</td><td>" + text(eintrag.wirkt)
      + "</td></tr>";
  }

  function einheiten(liste) {
    return (liste || []).length;
  }

  /* Aktuelle Mannschaften als Tabelle - die Werte, die man am
   * haeufigsten aendert. */
  function mannschaftsTabelle(daten) {
    var m = daten.mannschaften;

    if (!m || !m.mannschaften) {
      return "";
    }

    var zeilen = Object.keys(m.mannschaften).map(function (slug) {
      var t = m.mannschaften[slug];
      var team = S.team(slug);
      var orte = m.orte || {};
      var haupt = orte[t.hauptort] ? orte[t.hauptort].name : t.hauptort;
      var neben = t.nebenort && orte[t.nebenort]
        ? orte[t.nebenort].name : (t.nebenort || "");

      return "<tr><th scope=\"row\">" + text(team ? team.short : slug)
        + '<code class="einst-pfad">' + text(slug) + "</code></th><td>"
        + text(haupt || "") + "</td><td>" + text(neben) + "</td><td>"
        + einheiten(t.training && t.training.sommer) + " / "
        + einheiten(t.training && t.training.winter) + "</td><td>"
        + ((t.kontakt || []).filter(function (k) {
          return k.name || k.email || k.telefon;
        }).length) + "</td></tr>";
    }).join("");

    return '<h3>Mannschaften im Überblick</h3><div class="wt-rahmen">'
      + '<table class="wochentabelle einst-tabelle"><thead><tr>'
      + "<th>Mannschaft</th><th>Hauptort</th><th>Nebenort</th>"
      + "<th>Einheiten Sommer / Winter</th><th>Ansprechpartner</th>"
      + "</tr></thead><tbody>" + zeilen + "</tbody></table></div>";
  }

  function teamsTabelle(daten) {
    var karte = daten.teamsmap && daten.teamsmap.teams;

    if (!karte) {
      return "";
    }

    var zeilen = Object.keys(karte).map(function (id) {
      return karte[id];
    }).sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    }).map(function (t) {
      return "<tr><th scope=\"row\">" + text(t.short)
        + '<code class="einst-pfad">' + text(t.slug) + "</code></th><td>"
        + text(t.group || "") + "</td><td>" + text(t.spielzeit || "")
        + "</td><td>" + text(t.anstoss || "") + "</td></tr>";
    }).join("");

    return '<h3>Mannschaften im Überblick</h3><div class="wt-rahmen">'
      + '<table class="wochentabelle einst-tabelle"><thead><tr>'
      + "<th>Mannschaft</th><th>Gruppe</th><th>Spielzeit (min)</th>"
      + "<th>Übliche Anstoßzeit</th></tr></thead><tbody>" + zeilen
      + "</tbody></table></div>";
  }

  function gruppeHtml(g, index, daten) {
    var quelle = g.quelle ? daten[g.quelle] : null;
    var kopf = '<section class="einst-gruppe" id="e' + index + '"><h2>'
      + text(g.titel) + '</h2><p class="einst-datei">Datei: <code>'
      + text(g.datei) + "</code></p>"
      + (g.intro ? '<p class="leise">' + text(g.intro) + "</p>" : "");
    var tabelle = "";

    if (g.eintraege && g.eintraege.length) {
      tabelle = '<div class="wt-rahmen"><table class="wochentabelle '
        + 'einst-tabelle"><thead><tr><th>Einstellung</th>'
        + "<th>Aktueller Wert</th><th>Wirkt auf</th></tr></thead><tbody>"
        + g.eintraege.map(function (e) {
          return zeileHtml(e, quelle);
        }).join("") + "</tbody></table></div>";
    }

    if (g.tabelle === "mannschaften") {
      tabelle += mannschaftsTabelle(daten);
    } else if (g.tabelle === "teamsmap") {
      tabelle += teamsTabelle(daten);
    }

    return kopf + tabelle + "</section>";
  }

  S.start({
    seite: "einstellungen",
    braucht: ["teams", "mannschaften", "club", "teamsmap", "sportanlage",
      "einstellungen"],
    fertig: function (daten) {
      var ziel = document.getElementById("einstellbereich");
      var katalog = daten.einstellungen;

      if (!katalog || !katalog.gruppen) {
        ziel.innerHTML = '<p class="warnung">Die Datei <code>config/'
          + "einstellungen.json</code> fehlt.</p>";
        return;
      }

      var sprung = katalog.gruppen.map(function (g, i) {
        return '<a class="chip" href="#e' + i + '">' + text(g.titel)
          + "</a>";
      }).join("");

      ziel.innerHTML = '<p class="leise">Diese Werte lassen sich über die '
        + "Konfigurationsdateien ändern. Die Seite zeigt den jeweils "
        + "aktuellen Wert. Geändert wird in der Datei selbst, nicht hier."
        + '</p><div class="segment faq-sprung">' + sprung + "</div>"
        + katalog.gruppen.map(function (g, i) {
          return gruppeHtml(g, i, daten);
        }).join("");
    }
  });
}());
