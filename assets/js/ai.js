/* ConfigMaker — parsing/mapping du flux "IA" (logique pure, pas de DOM).
   Perplexity repond "- <type> : <reference>" (une ligne par composant).
   L'app ne peut pas lire l'onglet Perplexity (cross-origin) : l'utilisateur
   colle la reponse, on parse -> slot Idealo -> import direct.
   Marge budget : -15% (frais de port / derive des prix).
   Expose pour harness node. */
'use strict';
const AiParse = (() => {
  const MARGIN = 0.85;

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

  /* lignes "- type : ref [lien]" (puces) OU "Type : ref [lien]" nues :
     les lignes nues ne sont retenues que si le type evoque un composant
     (connu ou ambigu -> on demandera), pour ignorer la prose. */
  function parseResponse(text) {
    const out = [];
    const src = joinBrokenLinks(text);
    for (const ln of src.split('\n')) {
      const m = ln.match(/^\s*(?:[-*•]|\d+\s*[.)])\s*(.+?)\s*:\s*(.+?)\s*$/);
      if (m) {
        const type = m[1].trim(), parts = splitLink(m[2]);
        if (type && parts.ref && parts.ref.length > 1) out.push({ type, ref: parts.ref, link: parts.link });
        continue;
      }
      const b = ln.match(/^\s*([^:\n]{1,40}?)\s*:\s*(.{2,260}?)\s*$/);
      if (b && typeHits(b[1].trim()).length) {
        const parts = splitLink(b[2]);
        if (parts.ref.length > 1) out.push({ type: b[1].trim(), ref: parts.ref, link: parts.link });
      }
    }
    return out;
  }

  function stripParens(ref) { return String(ref || '').replace(/\s*\([^)]*\)/g, '').trim(); }
  /* le lien colle souvent sur les lignes suivantes : " [\nURL\n]" -> "[URL]" */
  function joinBrokenLinks(text) {
    return String(text || '').replace(/\[\s*(https?:\/\/[^\]\s]+)\s*\]/g, '[$1]');
  }
  /* le lien pointe-t-il vraiment le produit demande ? (copier-coller melanges) */
  const LINK_STOP = new Set(['go', 'gb', 'tb', 'pb', 'noir', 'black', 'blanc', 'white', 'kit', 'ddr', 'ddr4', 'ddr5', 'gddr', 'gddr6', 'gddr6x', 'ssd', 'hdd', 'usb', 'hdmi', 'sata', 'nvme', 'pcie', 'rgb', 'oem', 'box', 'boxed', 'version', 'edition']);
  function linkTokens(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length >= 3 && !LINK_STOP.has(w));
  }
  function linkMatchesPage(ref, page) {
    const r = linkTokens(ref), p = new Set(linkTokens(page));
    if (!r.length) return false;
    const shared = r.filter(t => p.has(t));
    return shared.length >= 2 || (r.length === 1 && shared.length === 1);
  }
  function isIdealoLink(link) { return /idealo\./i.test(String(link || '')); }
  function isIdealoPrix(link) { return /idealo\.[a-z]+\/prix\//i.test(String(link || '')); }
  /* lien nu [http...] ou (http...) en fin de reference (Perplexity varie) */
  function splitLink(s) {
    let m = String(s || '').match(/^(.*?)\s*\[(https?:\/\/[^\]\s]+)\]\s*[.,;]?\s*$/);
    if (m) return { ref: m[1].trim(), link: m[2].trim() };
    m = String(s || '').match(/^(.*?)\s*\((https?:\/\/[^)\s]+)\)\s*[.,;]?\s*$/);
    if (m) return { ref: m[1].trim(), link: m[2].trim() };
    return { ref: String(s || '').trim(), link: null };
  }
  function budgetForPrompt(budget) { return Math.round((Number(budget) || 0) * MARGIN); }
  function buildPrompt(budget88, usage) {
    return `Je souhaite me faire une configuration PC avec un budget de ${budget88}€, pour faire :\n${String(usage || '').trim()}\nliste sous la forme : "- <type_composant> : <reference_composant> [<lien>]" les composants sans rien d'autre dans ta reponse. regarde les prix a la date d'aujourd'hui sur idealo. verifie que tu as bien respecte le budget et que tu donnes que des references de produits et non des specifications (en précisant la couleur, le modèle précis etc entre parenthèses). Mets toujours au minimum un ventirad pour le CPU.\n\nAdapte les composants aux usages indiqués :\n- Bureautique / usage quotidien (web, bureautique, streaming) : CPU 6 cœurs suffisant, 16 Go de RAM, SSD NVMe 1 To, GPU d'entrée de gamme ou graphique intégré.\n\nSi l'usage mentionné correspond à une charge lourde parmi les trois cas suivants, applique les specs dédiées ci-dessous tant qu'elles tiennent dans le budget :\n- Montage vidéo / 3D : CPU 8 cœurs / 16 threads minimum, 32 Go de RAM, GPU NVIDIA (CUDA/NVENC) avec le maximum de VRAM, SSD NVMe rapide (≥1 To), écran IPS ou OLED 100% sRGB.\n- Compilation de code : CPU avec beaucoup de cœurs / threads, 32 Go de RAM, SSD NVMe rapide (≥1 To).\n- IA locale : GPU NVIDIA avec au moins 16 Go de VRAM, 32 à 48 Go de RAM, SSD NVMe ≥1 To.\nSi le budget ne permet pas d'atteindre ces specs dédiées, rapproche-t'en le plus possible tout en vérifiant toujours les prix pour respecter le budget.\n\nPour le jeu vidéo, choisis un GPU AMD si son rapport prix/performance est meilleur. Si l'utilisateur mentionne un usage professionnel ou étudiant en montage vidéo ou en IA locale, choisis un GPU NVIDIA, sinon un GPU AMD convient.\n\nSi le budget n'est pas respecté, recommence en choisissant des CPU et GPU jusqu'à 3 générations plus anciens (ex. NVIDIA RTX 40xx → 30xx → 20xx → 16xx ; AMD RX 7xxx → 6xxx → 5xxx) et des références moins chères, jusqu'à rentrer dans le budget. En dernier recours seulement, réduis la RAM à 16 Go.`;
  }

  return { MARGIN, TYPEMAP, norm, typeHits, typeToSlot, parseResponse, stripParens, splitLink, joinBrokenLinks, linkTokens, linkMatchesPage, isIdealoLink, isIdealoPrix, budgetForPrompt, buildPrompt };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = AiParse;
