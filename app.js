/* LohnRechner Schweiz 2026 — UI-Logik (DOM), Cookie-Banner, Kontaktformular */
(function () {
  'use strict';

  /* ---------- Mobile Navigation ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var offen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
  }

  /* ---------- Cookie-Banner ---------- */
  var banner = document.getElementById('cookie-banner');
  try {
    if (banner && !localStorage.getItem('lr-ch-cookie')) {
      banner.classList.add('show');
    }
  } catch (e) { if (banner) banner.classList.add('show'); }
  var okBtn = document.getElementById('cookie-ok');
  if (okBtn) {
    okBtn.addEventListener('click', function () {
      try { localStorage.setItem('lr-ch-cookie', 'ja'); } catch (e) {}
      banner.classList.remove('show');
    });
  }

  /* ---------- Footer-Jahr ---------- */
  document.querySelectorAll('[data-jahr]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Rechner (nur auf index.html) ---------- */
  var form = document.getElementById('lohnrechner');
  if (!form || typeof berechneLohn === 'undefined') return;

  var alterEl = document.getElementById('alter');
  var bvgEl = document.getElementById('bvg');
  var bvgWert = document.getElementById('bvg-wert');

  function bvgDefaultSetzen() {
    var alter = parseInt(alterEl.value, 10);
    if (isNaN(alter)) alter = 35;
    var std = (typeof bvgStandard === 'function') ? bvgStandard(alter) : 10;
    bvgEl.value = std;
    bvgWert.textContent = String(std).replace('.', ',') + ' %';
  }
  alterEl.addEventListener('change', bvgDefaultSetzen);
  bvgEl.addEventListener('input', function () {
    bvgWert.textContent = String(bvgEl.value).replace('.', ',') + ' %';
  });
  bvgDefaultSetzen();

  function gelesen(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }
  function radio(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = {
      brutto: Math.max(parseFloat(gelesen('brutto')) || 0, 0),
      bruttoTyp: radio('bruttotyp'),
      alter: parseInt(gelesen('alter'), 10) || 35,
      zivilstand: radio('zivilstand'),
      kinder: Math.max(parseInt(gelesen('kinder'), 10) || 0, 0),
      bewilligung: gelesen('bewilligung'),
      kanton: gelesen('kanton'),
      kirche: document.getElementById('kirche').checked,
      monate: parseInt(radio('monate'), 10) || 12,
      bvgSatz: parseFloat(bvgEl.value)
    };
    if (d.brutto <= 0) {
      alert('Bitte geben Sie einen Bruttolohn über 0 CHF ein.');
      return;
    }
    var r = berechneLohn(d);
    var box = document.getElementById('ergebnis');
    var j = Math.round(r.nettoJahr), m = Math.round(r.nettoMonat);

    var zeilen = [
      ['AHV / IV / EO (5,3 %)', r.ahv],
      ['ALV (1,10 %, bis 148\'200 CHF)', r.alv],
      ['NBU – Nichtberufsunfall (~1,5 %)', r.nbu],
      ['BVG / Pensionskasse (' + prozent(r.bvgSatz) + ' Annahme)', r.bvg]
    ];
    var html = '';
    zeilen.forEach(function (z) {
      var p = r.jahresbrutto > 0 ? (z[1] / r.jahresbrutto) * 100 : 0;
      html += '<tr><td>' + z[0] + '</td><td class="num">CHF ' + chf(z[1]) + '</td><td class="num">' + prozent(p) + '</td></tr>';
    });
    if (r.quellensteuer > 0) {
      var pq = r.jahresbrutto > 0 ? (r.quellensteuer / r.jahresbrutto) * 100 : 0;
      html += '<tr><td>Quellensteuer (' + prozent(r.qsSatz) + ' vereinfacht)</td><td class="num">CHF ' + chf(r.quellensteuer) + '</td><td class="num">' + prozent(pq) + '</td></tr>';
    }
    html += '<tr class="total"><td>Abzüge total (Jahr)</td><td class="num">CHF ' + chf(r.abzuege) + '</td><td class="num">' + prozent(100 - r.quote) + '</td></tr>';

    document.getElementById('netto-monat').textContent = 'CHF ' + chf(m);
    document.getElementById('netto-jahr').textContent = 'CHF ' + chf(j) + ' pro Jahr';
    document.getElementById('aufstellung-body').innerHTML = html;
    document.getElementById('quote-balken').style.width = Math.min(Math.max(r.quote, 0), 100) + '%';
    document.getElementById('quote-text').textContent =
      'Ihr Nettolohn beträgt ' + prozent(r.quote) + ' Ihres Bruttolohns. Faustregel: In der Schweiz bleiben inklusive Pensionskasse meist 65–80 % des Bruttolohns übrig.';

    var hinweis = document.getElementById('qs-hinweis');
    if (r.qsHinweis) {
      hinweis.innerHTML = '<div class="kasten">' + r.qsHinweis + '</div>';
    } else if (d.bewilligung === 'G') {
      hinweis.innerHTML = '<div class="note"><strong>Hinweis Grenzgänger:</strong> Als Grenzgängerin/Grenzgänger mit G-Bewilligung wird die Quellensteuer in der Schweiz abgezogen. Die definitive Besteuerung erfolgt im Wohnsitzstaat.</div>';
    } else {
      hinweis.innerHTML = '<div class="note"><strong>Hinweis:</strong> Die Quellensteuer-Sätze sind vereinfachte Durchschnittswerte (Stand Oktober 2026, vorläufig). Die echten Tarife sind monatsweise gestaffelt – massgebend sind die ESTV-Dokumente Ihres Kantons.</div>';
    }

    box.classList.add('show');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- Kontaktformular (Frontend only → mailto) ---------- */
  var kform = document.getElementById('kontaktformular');
  if (kform) {
    kform.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('k-name').value.trim();
      var mail = document.getElementById('k-mail').value.trim();
      var betreff = document.getElementById('k-betreff').value.trim();
      var nachricht = document.getElementById('k-nachricht').value.trim();
      var body = 'Name: ' + name + '\nE-Mail: ' + mail + '\n\n' + nachricht;
      window.location.href = 'mailto:CONTACT-EMAIL-PLACEHOLDER?subject=' +
        encodeURIComponent('[LohnRechner Schweiz] ' + betreff) + '&body=' + encodeURIComponent(body);
      document.getElementById('kontakt-danke').style.display = 'block';
    });
  }
})();
