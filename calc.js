/* Reine Berechnungslogik für den Lohnrechner Schweiz 2026.
   Keine DOM-Abhängigkeiten — direkt mit Node.js testbar.
   Alle Angaben: vereinfachte Berechnung, keine Steuerberatung. */
'use strict';

/* Vereinfachte durchschnittliche Quellensteuer-Sätze pro Kanton (in % des Bruttolohns),
   Tarif A0 (ledig, ohne Kinder). VORLÄUFIG / vereinfacht — echte Tarife sind
   monatsweise gestaffelt und in den ESTV-Dokumenten zu prüfen. */
const KANTON_QS = {
  AG: 8.5, AI: 7.0, AR: 7.5, BE: 9.0, BL: 9.0, BS: 9.0, FR: 9.5,
  GE: 10.5, GL: 8.5, GR: 7.5, JU: 10.0, LU: 8.5, NE: 10.0, NW: 6.5,
  OW: 6.5, SG: 8.5, SH: 8.5, SO: 9.5, SZ: 6.0, TG: 8.0, TI: 8.0,
  UR: 7.0, VD: 10.0, VS: 9.0, ZG: 6.0, ZH: 8.5
};

const KANTON_NAMEN = {
  AG: 'Aargau', AI: 'Appenzell Innerrhoden', AR: 'Appenzell Ausserrhoden',
  BE: 'Bern', BL: 'Basel-Landschaft', BS: 'Basel-Stadt', FR: 'Freiburg',
  GE: 'Genf', GL: 'Glarus', GR: 'Graubünden', JU: 'Jura', LU: 'Luzern',
  NE: 'Neuenburg', NW: 'Nidwalden', OW: 'Obwalden', SG: 'St. Gallen',
  SH: 'Schaffhausen', SO: 'Solothurn', SZ: 'Schwyz', TG: 'Thurgau',
  TI: 'Tessin', UR: 'Uri', VD: 'Waadt', VS: 'Wallis', ZG: 'Zug', ZH: 'Zürich'
};

const SAETZE = {
  AHV_IV_EO: 0.053,   // Arbeitnehmeranteil 2026
  ALV: 0.011,         // bis 148'200 CHF
  ALV_MAX: 148200,
  NBU: 0.015          // Annahme: ca. 1,5 %
};

/* Standard-Annahme BVG-Arbeitnehmeranteil nach Alter (in % des Lohns).
   Ab 25 obligatorisch; als Annahme klar gekennzeichnet. */
function bvgStandard(alter) {
  if (alter < 25) return 0;
  if (alter < 35) return 7;
  if (alter < 45) return 10;
  if (alter < 55) return 15;
  return 18;
}

/* d = { brutto, bruttoTyp:'monat'|'jahr', alter, zivilstand:'ledig'|'verheiratet',
        kinder, bewilligung:'CH'|'C'|'B'|'G', kanton:'ZH', kirche:bool, monate:12|13, bvgSatz }
   Liefert alle Jahreswerte plus abgeleitete Monatswerte. */
function berechneLohn(d) {
  const jahresbrutto = d.bruttoTyp === 'monat' ? d.brutto * d.monate : d.brutto;
  const ahv = jahresbrutto * SAETZE.AHV_IV_EO;
  const alv = Math.min(jahresbrutto, SAETZE.ALV_MAX) * SAETZE.ALV;
  const nbu = jahresbrutto * SAETZE.NBU;
  const bvgSatz = (typeof d.bvgSatz === 'number') ? d.bvgSatz : bvgStandard(d.alter);
  const bvg = d.alter < 25 ? 0 : jahresbrutto * (bvgSatz / 100);

  let quellensteuer = 0;
  let qsSatz = 0;
  let qsHinweis = '';
  if (d.bewilligung === 'B' || d.bewilligung === 'G') {
    qsSatz = KANTON_QS[d.kanton] || 8.5;
    if (d.zivilstand === 'verheiratet') qsSatz *= 0.75;          // Tarif B0 ca.
    qsSatz -= Math.min(Math.max(d.kinder || 0, 0), 4) * 0.5;   // Kinderabzug ca.
    if (d.kirche) qsSatz += 1.2;                                // Kirchensteuer ca.
    qsSatz = Math.max(qsSatz, 0);
    quellensteuer = jahresbrutto * (qsSatz / 100);
  } else {
    qsHinweis = 'Als Schweizerin/Schweizer bzw. mit C-Bewilligung zahlen Sie die ordentliche Steuer (Bund, Kanton, Gemeinde, Kirche) – die Quellensteuer gilt nicht für Sie.';
  }

  const abzuege = ahv + alv + nbu + bvg + quellensteuer;
  const nettoJahr = jahresbrutto - abzuege;
  const nettoMonat = nettoJahr / d.monate;
  const quote = jahresbrutto > 0 ? (nettoJahr / jahresbrutto) * 100 : 0;

  return {
    jahresbrutto, ahv, alv, nbu, bvg, bvgSatz,
    quellensteuer, qsSatz, qsHinweis,
    abzuege, nettoJahr, nettoMonat, quote
  };
}

/* Schweizer Zahlenformat: 148'200.35 */
function chf(n) {
  const neg = n < 0;
  const abs = Math.abs(Math.round(n * 100) / 100);
  const teile = abs.toFixed(2).split('.');
  teile[0] = teile[0].replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return (neg ? '-' : '') + teile.join('.');
}

function prozent(n) {
  return n.toFixed(1).replace('.', ',') + ' %';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { berechneLohn, bvgStandard, chf, prozent, KANTON_QS, KANTON_NAMEN, SAETZE };
}
