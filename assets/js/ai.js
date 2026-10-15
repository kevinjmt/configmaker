/* ConfigMaker — parsing/mapping du flux "IA" (logique pure, pas de DOM).
   Perplexity repond "- <type> : <reference>" (une ligne par composant).
   L'app ne peut pas lire l'onglet Perplexity (cross-origin) : l'utilisateur
   colle la reponse, on parse -> slot Idealo -> import direct.
   Marge budget : -12% (frais de port / derive des prix).
   Expose pour harness node. */
'use strict';
const AiParse = (() => {
  const MARGIN = 0.88;

  /* type (lowercase, ordonne du plus specifique) -> slot defId */
  const TYPEMAP = [
    [['carte mère', 'motherboard', 'mainboard'], 'mb'],
    [['carte graphique', 'graphics card', ' gpu'], 'gpu'],
    [['mémoire vive', 'memoire vive', ' ram ', ' ram', 'memory', 'mémoire', 'memoire', 'ddr5', 'ddr4'], 'ram'],
    [['processeur', 'processor', ' cpu', 'ryzen'], 'cpu'],
    [['disque dur', 'hard drive', ' hdd'], 'hdd'],
    [['ssd', 'nvme', 'stockage', 'storage', 'disque ssd'], 'ssd1'],
    [['alimentation', 'power supply', ' psu'], 'psu'],
    [['boîtier', 'boitier', 'case', 'tower'], 'case'],
    [['refroidissement', 'cooling', 'ventirad', 'watercooling', 'aio', 'cooler'], 'cooler'],
    [['écran', 'ecran', 'moniteur', 'monitor', 'display'], 'screen1'],
    [['clavier', 'keyboard'], 'keyboard'],
    [['souris', 'mouse'], 'mouse'],
    [['casque', 'headset', 'headphone'], 'headset'],
    [['windows', 'os ', 'système d', 'systeme d', 'operating system'], 'os'],
    [['onduleur', 'ups'], 'ups'],
    [['pâte thermique', 'pate thermique', 'thermal paste'], 'thermal'],
    [['ventilateur', ' fan', 'fans'], 'fans'],
    [['carte réseau', 'carte reseau', 'network card', 'wifi'], 'netcard'],
    [['enceinte', 'speaker'], 'speakers'],
    [['webcam'], 'webcam'],
  ];

  function norm(s) { return ' ' + String(s || '').toLowerCase().replace(/\s+/g, ' ').trim() + ' '; }
  /* tous les slots correspondants (pour distinguer inconnu vs ambigu) */
  function typeHits(type) {
    const t = norm(type);
    const hits = [];
    for (const [keys, slot] of TYPEMAP) {
      if (keys.some(k => t.includes(k))) hits.push(slot);
    }
    return [...new Set(hits)];
  }
  /* -> slotId | null (null = demander a l'utilisateur) */
  function typeToSlot(type) {
    const uniq = typeHits(type);
    return uniq.length === 1 ? uniq[0] : null;
  }

  /* lignes "- type : ref" (puces) OU "Type : ref" nues (format Perplexity) :
     les lignes nues ne sont retenues que si le type evoque un composant
     (connu ou ambigu -> on demandera), pour ignorer la prose ("Budget : ..."). */
  function parseResponse(text) {
    const out = [];
    for (const ln of String(text || '').split('\n')) {
      const m = ln.match(/^\s*(?:[-*•]|\d+\s*[.)])\s*(.+?)\s*:\s*(.+?)\s*$/);
      if (m) {
        const type = m[1].trim(), ref = m[2].trim();
        if (type && ref && ref.length > 1) out.push({ type, ref });
        continue;
      }
      const b = ln.match(/^\s*([^:\n]{1,40}?)\s*:\s*(.{2,120}?)\s*$/);
      if (b && typeHits(b[1].trim()).length) out.push({ type: b[1].trim(), ref: b[2].trim() });
    }
    return out;
  }

  function stripParens(ref) { return String(ref || '').replace(/\s*\([^)]*\)/g, '').trim(); }
  function budgetForPrompt(budget) { return Math.round((Number(budget) || 0) * MARGIN); }
  function buildPrompt(budget88, usage) {
    return `Je souhaite me faire une configuration PC avec un budget de ${budget88}€, pour faire :\n${String(usage || '').trim()}\nliste sous la forme : "- <type_composant> : <reference_composant>" les composants sans rien d'autre dans ta reponse. regarde les prix a la date d'aujourd'hui sur idealo. verifie que tu as bien respecte le budget et que tu donnes que des references de produits et non des specifications (en précisant la couleur, le modèle précis etc entre parenthèses).`;
  }

  return { MARGIN, TYPEMAP, norm, typeHits, typeToSlot, parseResponse, stripParens, budgetForPrompt, buildPrompt };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AiParse;
