/* Seite "Sportanlage": Luftbild, Anschrift, Plaetze und Ausstattung.
 *
 * Alle Texte und Fotos stammen aus config/sportanlage.json, die Anschrift
 * aus den Orten in config/mannschaften.json. Die Seite erfindet nichts:
 * leere Texte und leere Abschnitte werden ausgeblendet, ein fehlendes
 * Foto wird durch einen Platzhalter ersetzt.
 */

(function () {
  "use strict";

  var S = window.Seite;
  var text = S.text;

  function fotoHtml(foto, klein) {
    if (!foto || !foto.datei) {
      return "";
    }

    return '<figure class="anlage-foto' + (klein ? " klein" : "") + '">'
      + '<img src="' + text(foto.datei) + '" alt="' + text(foto.alt || "")
      + '" loading="lazy">'
      + '<div class="anlage-platzhalter" hidden>Foto folgt</div>'
      + (foto.quelle ? "<figcaption>" + text(foto.quelle) + "</figcaption>"
        : "")
      + "</figure>";
  }

  function adresseHtml(ort) {
    var karte = S.kartenLink(ort);

    return '<section class="anlage-adresse"><h2>Adresse</h2>'
      + '<p class="anschrift"><b>TSV 95/10 Nieukerk e.V.</b><br>'
      + text(ort.strasse || "") + "<br>" + text(ort.plz || "") + " "
      + text(ort.ort || "") + "</p>"
      + (karte ? '<p><a class="zeilen-knopf" href="' + text(karte)
        + '" target="_blank" rel="noopener">Auf der Karte öffnen</a></p>'
        : "") + "</section>";
  }

  /* Karte mit Titel, Foto und (falls vorhanden) Beschreibung. */
  function karte(e, titel) {
    return '<article class="mannschaft">'
      + "<h3>" + text(titel || e.titel || "") + "</h3>"
      + fotoHtml(e.foto, true)
      + (e.text ? "<p>" + text(e.text) + "</p>" : "")
      + "</article>";
  }

  function abschnitt(titel, karten) {
    return karten.length
      ? "<h2>" + text(titel) + "</h2>" + '<div class="mannschaft-raster">'
        + karten.join("") + "</div>"
      : "";
  }

  S.start({
    seite: "sportanlage",
    braucht: ["teams", "mannschaften", "sportanlage"],
    fertig: function (daten) {
      var ziel = document.getElementById("anlagebereich");
      var c = daten.sportanlage || {};
      var orte = S.orte();
      var haupt = orte["nieukerk-kunstrasen"]
        || orte[Object.keys(orte)[0]] || {};
      var html = [];

      html.push(fotoHtml(c.foto, false));
      html.push(adresseHtml(haupt));
      html.push(abschnitt("Plätze", (c.plaetze || []).map(function (p) {
        return karte(p, p.titel || (orte[p.ort] || {}).name);
      })));
      html.push(abschnitt("Ausstattung", (c.ausstattung || []).map(
        function (e) { return karte(e); })));
      html.push(abschnitt("Gut zu wissen", (c.hinweise || []).map(
        function (e) { return karte(e); })));
      html.push('<p class="leise">Wer wann auf welchem Platz trainiert, '
        + 'zeigt die <a href="platzbelegung.html">Platzbelegung</a>.</p>');

      ziel.innerHTML = html.join("");

      // Fehlt ein Foto, erscheint der Platzhalter statt eines leeren Rahmens.
      ziel.querySelectorAll(".anlage-foto img").forEach(function (bild) {
        var fehlt = function () {
          bild.hidden = true;
          bild.parentNode.querySelector(".anlage-platzhalter").hidden = false;
        };

        bild.addEventListener("error", fehlt);
        if (bild.complete && bild.naturalWidth === 0) {
          fehlt();
        }
      });
    }
  });
}());
