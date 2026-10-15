/* ConfigMaker v2.4 — vanilla JS, 100% local (localStorage), GitHub Pages friendly.
   Idealo: native listings via Jina Reader (cached 6h) + manual fiches. No "add to cart". */
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9);
const LS = { state: 'cmv2.state', configs: 'cmv2.configs', hist: 'cmv2.hist', prefs: 'cmv2.prefs' };
const load = (k, fb) => { try { const v = (typeof StoreDB !== 'undefined' ? StoreDB.getRaw(k) : localStorage.getItem(k)); return v != null ? JSON.parse(v) : fb; } catch { return fb; } };
/* save() reports quota failures instead of swallowing them (callers must check). */
const save = (k, v) => {
  try {
    if (typeof StoreDB !== 'undefined') return StoreDB.putRaw(k, JSON.stringify(v));
    localStorage.setItem(k, JSON.stringify(v)); return true;
  } catch (e) { return { quota: true, err: e }; }
};
const isQuotaErr = r => !!(r && typeof r === 'object' && r.quota);
const eur = n => (Number(n) || 0).toLocaleString(document.documentElement.lang === 'en' ? 'en-IE' : 'fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Slot catalogue (from Excel) ---------- */
const SECTIONS = [
  { id: 'pc', icon: 'fa-solid fa-computer' },
  { id: 'setup', icon: 'fa-solid fa-display' },
  { id: 'others', icon: 'fa-solid fa-box-open' },
];
const SLOT_DEFS = [
  { id: 'cpu', sec: 'pc', icon: 'lucide:cpu', q: 'processeur', w: 125 },
  { id: 'mb', sec: 'pc', icon: 'bi:bi-motherboard', q: 'carte mere', w: 70 },
  { id: 'ram', sec: 'pc', icon: 'lucide:memory-stick', q: 'memoire DDR5', w: 15 },
  { id: 'cooler', sec: 'pc', icon: 'lucide:fan', q: 'ventirad watercooling', w: 10 },
  { id: 'thermal', sec: 'pc', icon: 'lucide:syringe', q: 'pâte thermique', w: 0, extra: true },
  { id: 'ssd1', sec: 'pc', icon: 'lucide:hard-drive', q: 'SSD NVMe', w: 8, addMore: 'ssd' },
  { id: 'hdd', sec: 'pc', icon: 'lucide:disc-3', q: 'disque dur interne HDD', w: 8, extra: true },
  { id: 'gpu', sec: 'pc', icon: 'bi:bi-gpu-card', q: 'carte graphique', w: 250 },
  { id: 'case', sec: 'pc', icon: 'lucide:pc-case', q: 'boitier PC', w: 0 },
  { id: 'fans', sec: 'pc', icon: 'lucide:loader-pinwheel', q: 'ventilateur boîtier PC', w: 3, extra: true },
  { id: 'psu', sec: 'pc', icon: 'fa-solid fa-plug', q: 'alimentation PC', w: 0 },
  { id: 'psucables', sec: 'pc', icon: 'lucide:cable', q: "câble d'alimentation modulaire PC", w: 0, extra: true },
  { id: 'netcard', sec: 'pc', icon: 'bi:bi-hdd-network', q: 'carte réseau', w: 5, extra: true },
  { id: 'os', sec: 'pc', icon: 'fa-brands fa-windows', q: 'Windows 11 licence', w: 0, addMore: 'pcx' },
  { id: 'soft', sec: 'pc', icon: 'lucide:package', q: 'logiciel', w: 0, extra: true },
  { id: 'desk', sec: 'setup', icon: 'ti:ti-desk', q: 'bureau gaming', w: 0 },
  { id: 'chair', sec: 'setup', icon: 'ti:ti-armchair', q: 'chaise gaming', w: 0 },
  { id: 'screen1', sec: 'setup', icon: 'lucide:monitor', q: 'ecran PC', w: 45, addMore: 'screen' },
  { id: 'keyboard', sec: 'setup', icon: 'lucide:keyboard', q: 'clavier', w: 3 },
  { id: 'mouse', sec: 'setup', icon: 'lucide:mouse', q: 'souris', w: 2 },
  { id: 'pad', sec: 'setup', icon: 'lucide:square', q: 'tapis de souris XXL', w: 0 },
  { id: 'headset', sec: 'setup', icon: 'lucide:headset', q: 'casque gaming', w: 3 },
  { id: 'gamepad', sec: 'setup', icon: 'lucide:gamepad-2', q: 'manette jeu', w: 3, extra: true },
  { id: 'ups', sec: 'setup', icon: 'lucide:battery-charging', q: 'onduleur', w: 0, extra: true },
  { id: 'switch', sec: 'setup', icon: 'lucide:network', q: 'switch réseau', w: 10, extra: true },
  { id: 'router', sec: 'setup', icon: 'lucide:router', q: 'routeur wifi', w: 12, extra: true },
  { id: 'nas', sec: 'setup', icon: 'lucide:server', q: 'NAS stockage réseau', w: 30, extra: true },
  { id: 'graphictab', sec: 'setup', icon: 'lucide:pen-tool', q: 'tablette graphique', w: 5, extra: true },
  { id: 'usbstick', sec: 'setup', icon: 'lucide:usb', q: 'clé USB', w: 0, extra: true },
  { id: 'memcard', sec: 'setup', icon: 'lucide:circuit-board', q: 'carte mémoire SD microSD', w: 0, extra: true },
  { id: 'dock', sec: 'setup', icon: 'lucide:monitor-smartphone', q: "station d'accueil", w: 45, extra: true },
  { id: 'printer', sec: 'setup', icon: 'lucide:printer', q: 'imprimante', w: 30, extra: true },
  { id: 'extstorage', sec: 'setup', icon: 'lucide:database', q: 'disque dur externe', w: 8, extra: true },
  { id: 'speakers', sec: 'setup', icon: 'lucide:speaker', q: 'enceintes PC', w: 20, extra: true },
  { id: 'webcam', sec: 'setup', icon: 'lucide:webcam', q: 'webcam', w: 3, extra: true },
  { id: 'soundcard', sec: 'setup', icon: 'lucide:audio-lines', q: 'carte son externe USB', w: 3, extra: true },
  { id: 'capture', sec: 'setup', icon: 'lucide:video', q: "boîtier d'acquisition vidéo", w: 5, extra: true },
  { id: 'monitorarm', sec: 'setup', icon: 'lucide:move', q: 'support écran', w: 0, extra: true },
  { id: 'opt1', sec: 'others', icon: 'fa-solid fa-puzzle-piece', q: '', w: 0, addMore: 'opt' },
  { id: 'opt2', sec: 'others', icon: 'fa-solid fa-puzzle-piece', q: '', w: 0 },
  { id: 'opt3', sec: 'others', icon: 'fa-solid fa-puzzle-piece', q: '', w: 0 },
];
/* ---------- i18n ---------- */
const I18N = {
  fr: {
    'nav.exportAll': 'Export données', 'nav.install': 'Installer',
    'hero.configName': 'Nom de la config', 'hero.budget': 'Budget (€)',
    'hero.new': 'Nouveau', 'hero.load': 'Charger', 'hero.save': 'Sauver', 'hero.history': 'Historique', 'hero.share': 'Partager', 'hero.export': 'Exporter', 'hero.bench': 'Benchmarks',
    'tabs.config': 'Config', 'tabs.bench': 'Benchmarks', 'tabs.prices': 'Prix',
    'picker.search': 'Filtrer mes fiches…', 'picker.new': 'Nouvelle fiche',
    'picker.fiches': 'Mes fiches', 'picker.idealoPh': 'Rechercher sur idealo.fr…', 'picker.filterPh': 'Filtrer les résultats…',
    'picker.urlPh': "Collez l'URL exacte de la fiche /prix/…", 'picker.choose': 'Choisir ce composant', 'picker.chooseBtn': 'Choisir', 'picker.addMode': "Ajout d'une alternative",
    'picker.more': 'Charger plus', 'picker.retry': 'Réessayer', 'picker.from': 'à partir de', 'picker.offers': 'offres',
    'picker.sortRel': 'Pertinence', 'picker.sortAsc': 'Prix croissant', 'picker.sortDesc': 'Prix décroissant',
    'picker.loading': 'Chargement des résultats Idealo…', 'picker.cached': 'liste en cache',
    'picker.err': 'Chargement impossible (limite de requêtes ou blocage). Réessayez dans une minute ou ouvrez sur idealo.fr.',
    'alts.see': 'Voir les alternatives',
    'picker.hint': "Listes Idealo chargées dans l'app : choisissez un produit pour pré-remplir sa fiche, ou collez l'URL /prix/ exacte. Listes en cache 6 h.",
    'sum.desc': 'Description', 'sum.charts': 'Graphiques', 'sum.power': 'Conso.', 'sum.compat': 'Compat', 'sum.fold': 'Résumé', 'sum.powerTitle': 'Consommation (W)',
    'bench.title': 'Benchmarks', 'bench.open': 'Voir sur YouTube', 'bench.copy': 'Copier la recherche',
    'bench.loading': 'Chargement des vidéos…', 'bench.play': 'Lire',
    'bench.err': 'Vidéos non chargeables pour le moment (limite de requêtes). Utilisez les liens ci-dessous.',
    'bench.brief': "Résumé d'usage", 'bench.daily': 'Quotidien', 'bench.gaming': 'Jeu (FPS iobit)', 'bench.pro': 'Charges lourdes',
    'bench.video': 'Montage / 3D', 'bench.compile': 'Compilation', 'bench.ai': 'IA locale',
    'bench.videos': 'Vidéos', 'bench.extraPh': 'Préciser la recherche… (ex : ray tracing, undervolt)', 'bench.search': 'Chercher',
    'bench.needs': 'Sélectionnez CPU + GPU + RAM pour charger les benchmarks.',
    'bench.needBoth': 'CPU + GPU requis (composants absents ou hors base iobit)', 'bench.needCpu': 'CPU requis.',
    'bench.nodata': 'Pas de données — réessayez plus tard.', 'bench.topruns': 'Médiane des meilleurs runs publics (biais optimiste)',
    'bench.typical': 'médianes par panier', 'bench.tsGpu': 'GPU typique', 'bench.tsCpu': 'CPU typique',
    'bench.single': 'Mono-cœur', 'bench.multi': 'Multi-cœurs',
    'bench.btCpu': 'CPU limite — ce couple obtient moins que la moyenne de ce GPU', 'bench.btGpu': 'Config limitée par le GPU (normal à cette résolution)', 'bench.btOk': 'Couple équilibré',
    'bench.q_low': 'Bas', 'bench.q_medium': 'Moyen', 'bench.q_high': 'Élevé', 'bench.q_ultra': 'Ultra', 'bench.q_max': 'Max',
    'bench.iobit': 'Ouvrir le calculateur iobit', 'bench.retry': 'Réessayer', 'bench.typErr': 'Typiques indisponibles pour le moment.',
    'bench.estSrc': 'iobit, estimations', 'bench.tsOpen': 'Voir sur 3DMark', 'bench.gbOpen': 'Voir sur Geekbench',
    'bench.copied': 'Noms CPU/GPU/jeu copiés — collez-les dans le calculateur iobit',
    'prices.title': 'Historique des prix', 'prices.total': 'Total config', 'prices.per': 'Par composant', 'prices.hint': 'Un point est ajouté à chaque sauvegarde. Le budget est affiché en ligne pointillée.',
    'dl.title': "Fichiers Excel d'origine", 'footer.tag': 'Prix Idealo, consommation, manuels — 100 % local, sans panier.', 'ai.title': 'Demander à Perplexity', 'ai.ph': 'Posez votre question…',
  },
  en: {
    'nav.exportAll': 'Export data', 'nav.install': 'Install',
    'hero.configName': 'Config name', 'hero.budget': 'Budget (€)',
    'hero.new': 'New', 'hero.load': 'Load', 'hero.save': 'Save', 'hero.history': 'History', 'hero.share': 'Share', 'hero.export': 'Export', 'hero.bench': 'Benchmarks',
    'tabs.config': 'Config', 'tabs.bench': 'Benchmarks', 'tabs.prices': 'Prices',
    'picker.search': 'Filter my entries…', 'picker.new': 'New entry',
    'picker.fiches': 'My entries', 'picker.idealoPh': 'Search on idealo.fr…', 'picker.filterPh': 'Filter results…',
    'picker.urlPh': 'Paste the exact /prix/ listing URL', 'picker.choose': 'Use this component', 'picker.chooseBtn': 'Select', 'picker.addMode': 'Adding an alternative',
    'picker.more': 'Load more', 'picker.retry': 'Retry', 'picker.from': 'from', 'picker.offers': 'offers',
    'picker.sortRel': 'Relevance', 'picker.sortAsc': 'Price: low to high', 'picker.sortDesc': 'Price: high to low',
    'picker.loading': 'Loading Idealo results…', 'picker.cached': 'cached list',
    'picker.err': 'Could not load the list (rate limit or block). Retry in a minute or open on idealo.fr.',
    'alts.see': 'See alternatives',
    'picker.hint': 'Idealo listings loaded in-app: pick a product to prefill its fiche, or paste the exact /prix/ URL. Lists cached 6h.',
    'sum.desc': 'Summary', 'sum.charts': 'Charts', 'sum.power': 'Power', 'sum.compat': 'Compat', 'sum.fold': 'Summary', 'sum.powerTitle': 'Power draw (W)',
    'bench.title': 'Benchmarks', 'bench.open': 'Open on YouTube', 'bench.copy': 'Copy search',
    'bench.loading': 'Loading videos…', 'bench.play': 'Play',
    'bench.err': 'Videos unavailable right now (rate limit). Use the links below.',
    'bench.brief': 'Usage summary', 'bench.daily': 'Daily use', 'bench.gaming': 'Gaming (iobit FPS)', 'bench.pro': 'Heavy workloads',
    'bench.video': 'Editing / 3D', 'bench.compile': 'Compiling', 'bench.ai': 'Local AI',
    'bench.videos': 'Videos', 'bench.extraPh': 'Refine the search… (e.g. ray tracing, undervolt)', 'bench.search': 'Search',
    'bench.needs': 'Select CPU + GPU + RAM to load benchmarks.',
    'bench.needBoth': 'CPU + GPU required (missing parts or outside iobit DB)', 'bench.needCpu': 'CPU required.',
    'bench.nodata': 'No data — retry later.', 'bench.topruns': 'Median of top public runs (optimistic bias)',
    'bench.typical': 'bucket medians', 'bench.tsGpu': 'Typical GPU', 'bench.tsCpu': 'Typical CPU',
    'bench.single': 'Single-core', 'bench.multi': 'Multi-core',
    'bench.btCpu': 'CPU-limited — this combo scores below this GPU average', 'bench.btGpu': 'GPU-bound config (normal at this resolution)', 'bench.btOk': 'Balanced combo',
    'bench.q_low': 'Low', 'bench.q_medium': 'Medium', 'bench.q_high': 'High', 'bench.q_ultra': 'Ultra', 'bench.q_max': 'Max',
    'bench.iobit': 'Open the iobit calculator', 'bench.retry': 'Retry', 'bench.typErr': 'Typical scores unavailable right now.',
    'bench.estSrc': 'iobit, estimates', 'bench.tsOpen': 'View on 3DMark', 'bench.gbOpen': 'View on Geekbench',
    'bench.copied': 'CPU/GPU/game names copied — paste them into the iobit calculator',
    'prices.title': 'Price history', 'prices.total': 'Config total', 'prices.per': 'Per part', 'prices.hint': 'One point is added on each save. Budget is the dotted line.',
    'dl.title': 'Original Excel files', 'footer.tag': 'Idealo prices, power draw, manuals — 100% local, no cart.', 'ai.title': 'Ask to Perplexity', 'ai.ph': 'Ask your question…',
  }
};
const SLOT_NAMES = {
  fr: { cpu: 'Processeur', mb: 'Carte mère', ram: 'RAM', cooler: 'Refroidissement', thermal: 'Pâte thermique', ssd1: 'SSD', hdd: 'Disque dur', gpu: 'Carte graphique', case: 'Boîtier', fans: 'Ventilateurs', psu: 'Alimentation', psucables: "Câbles d'alim.", os: 'OS', soft: 'Logiciels', desk: 'Bureau', chair: 'Chaise', screen1: 'Écran', keyboard: 'Clavier', mouse: 'Souris', pad: 'Tapis', headset: 'Casque', gamepad: 'Manette', ups: 'Onduleur', switch: 'Switch', router: 'Routeur', nas: 'NAS', graphictab: 'Tablette graphique', usbstick: 'Clés USB', memcard: 'Cartes mémoire', hub: 'Hub USB', dock: "Station d'accueil", printer: 'Imprimante', extstorage: 'Stockage externe', speakers: 'Enceintes', webcam: 'Webcam', soundcard: 'Carte son ext.', capture: "Boîtier d'acquisition", netcard: 'Carte réseau', monitorarm: 'Support écran', opt1: 'Option 1', opt2: 'Option 2', opt3: 'Option 3', pc: 'PC', setup: 'Setup', others: 'Autres' },
  en: { cpu: 'CPU', mb: 'Motherboard', ram: 'RAM', cooler: 'Cooling', thermal: 'Thermal paste', ssd1: 'SSD', hdd: 'HDD', gpu: 'Graphics card', case: 'Case', fans: 'Fans', psu: 'Power supply', psucables: 'PSU cables', os: 'OS', soft: 'Software', desk: 'Desk', chair: 'Chair', screen1: 'Monitor', keyboard: 'Keyboard', mouse: 'Mouse', pad: 'Mouse pad', headset: 'Headset', gamepad: 'Gamepad', ups: 'UPS', switch: 'Switch', router: 'Router', nas: 'NAS', graphictab: 'Drawing tablet', usbstick: 'USB sticks', memcard: 'Memory cards', hub: 'USB hub', dock: 'Docking station', printer: 'Printer', extstorage: 'External storage', speakers: 'Speakers', webcam: 'Webcam', soundcard: 'Ext. sound card', capture: 'Capture card', netcard: 'Network card', monitorarm: 'Monitor arm', opt1: 'Option 1', opt2: 'Option 2', opt3: 'Option 3', pc: 'PC', setup: 'Setup', others: 'Others' },
};
let lang = load(LS.prefs, {}).lang || 'fr';
const t = k => (I18N[lang] && I18N[lang][k]) || I18N.fr[k] || k;
const slotName = id => { const s = state.slots[id]; if (s && s.customLabel) return s.customLabel; return (SLOT_NAMES[lang] && SLOT_NAMES[lang][id]) || (SLOT_NAMES.fr[id]) || id; };
const secName = id => (SLOT_NAMES[lang] && SLOT_NAMES[lang][id]) || SLOT_NAMES.fr[id] || id;

/* ---------- State ---------- */
function blankProduct() { return { id: uid(), name: '', image: '', specs: '', datasheet: '', variants: null, verified: [], vendor: '', price: 0, oldPrice: 0, delivery: 0, qty: 1, idealo: '', manual: '', store: '', watts: 0, capW: 0, carrier: '', tracking: '', tstatus: '', best: null, promo: false, isBest: false, src: '', offerToken: '' }; }
function defaultState() {
  const slots = {};
  SLOT_DEFS.filter(d => !d.extra).forEach(d => { slots[d.id] = { defId: d.id, customLabel: '', products: [], selectedId: null }; });
  return { name: 'Ma Config', budget: 1500, version: '', slots, order: SLOT_DEFS.filter(d => !d.extra).map(d => d.id) };
}
let state = load(LS.state, null) || defaultState();
if (!state.order) state.order = Object.keys(state.slots);
let activeSlot = null, phMode = 'total', sumTab = 'desc';
const openAlts = new Set();
const openVariants = new Set(); // slotIds with expanded variant selector
const variantFilters = {}; // slotId -> {dimIdx: valIdx} (-1 = all)
const variantPending = {}; // slotId -> url being loaded (optimistic selected state)
const variantAttrsLoading = new Set(); // slotIds whose variant attributes are being fetched
const variantAttrsFetching = new Set(); // fiche urls with attribute fetch in flight
let variantLoading = null; // global lock: one variant fetch at a time (Idealo rate limit)
/* Fetch missing variant attributes from each model's own /prix/ datasheet
   (serialized through Idealo.product's queue + 6h cache). */
function ensureVariantAttrs(slotId) {
  const s = state.slots[slotId], p = s && sel(s);
  const v = p && p.variants;
  if (!v || !v.items || !v.items.length || typeof Idealo === 'undefined' || !Idealo.matchVariantAttrs) return;
  const missing = v.items.filter(it => !it.attrs);
  if (!missing.length || variantAttrsFetching.has(slotId)) return;
  variantAttrsFetching.add(slotId);
  variantAttrsLoading.add(slotId);
  renderSlots();
  (async () => {
    try {
      for (const it of missing) {
        try {
          const d = await Idealo.product(it.url);
          if (d && !d.error && d.datasheet) it.attrs = Idealo.matchVariantAttrs(d.datasheet, v.filters || []);
        } catch { /* keep unknown */ }
      }
      const cur = s.products.find(x => x.id === p.id);
      if (cur && cur.variants) persist();
    } finally {
      variantAttrsFetching.delete(slotId);
      variantAttrsLoading.delete(slotId);
      persist(); renderSlots();
    }
  })();
}
const foldedSecs = new Set();
const foldedCharts = new Set();
const foldedPower = new Set();
let prefs = load(LS.prefs, {});
function persist() { return save(LS.state, state) === true; }
/* Free space for user data when the quota bites: shrink volatile caches first
   (Idealo pages, price history tail) — never configs or the draft itself. */
function freeStorageForState() {
  try {
    if (typeof Idealo !== 'undefined' && Idealo.pruneCache) Idealo.pruneCache(3);
  } catch { /* ignore */ }
  try {
    const h = load(LS.hist, {});
    let changed = false;
    Object.keys(h).forEach(k => { if (Array.isArray(h[k]) && h[k].length > 200) { h[k] = h[k].slice(-200); changed = true; } });
    if (changed) save(LS.hist, h);
  } catch { /* ignore */ }
}
function persistRetry() {
  if (persist()) return true;
  freeStorageForState();
  return persist();
}

/* ---------- Helpers ---------- */
function defOf(slot) { return SLOT_DEFS.find(d => d.id === slot.defId) || { icon: 'fa-solid fa-box', sec: 'others', q: '' }; }
/* Multi-provider icons: 'lucide:cpu' | 'bi:bi-motherboard' | 'fa-solid fa-...' */
function iconHtml(ic) {
  if (ic.startsWith('lucide:')) return `<i data-lucide="${ic.slice(7)}"></i>`;
  if (ic.startsWith('bi:')) return `<i class="bi ${ic.slice(3)}"></i>`;
  if (ic.startsWith('ti:')) return `<i class="ti ${ic.slice(3)}"></i>`;
  return `<i class="${ic}"></i>`;
}
function refreshIcons(root) {
  const scope = root || document;
  if (window.lucide && lucide.createIcons) { lucide.createIcons(); return; }
  scope.querySelectorAll('i[data-lucide]').forEach(e => { e.className = 'fa-solid fa-microchip'; e.removeAttribute('data-lucide'); });
}
function sel(slot) { return slot.products.find(p => p.id === slot.selectedId) || null; }
function unitTotal(p) { return (Number(p.price) || 0) * (Number(p.qty) || 1) + (Number(p.delivery) || 0); }
function slotTotal(slot) { const p = sel(slot); return p ? unitTotal(p) : 0; }
function hasDiscount(p) { return Number(p.oldPrice) > Number(p.price) && Number(p.price) > 0; }
function discPct(p) { return Math.round((1 - Number(p.price) / Number(p.oldPrice)) * 100); }
function totals() {
  let pc = 0, setup = 0, others = 0, deliv = 0, watts = 0;
  state.order.forEach(id => {
    const s = state.slots[id]; const st = slotTotal(s); const sec = defOf(s).sec;
    if (sec === 'pc') pc += st; else if (sec === 'setup') setup += st; else others += st;
    const p = sel(s);
    if (p) { deliv += Number(p.delivery) || 0; if (sec === 'pc') watts += (Number(p.watts) || 0) * (Number(p.qty) || 1); }
  });
  const total = pc + setup + others;
  return { pc, setup, others, total, deliv, watts, diff: (Number(state.budget) || 0) - total };
}
function stampVersion(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}-${p(d.getHours())}.${p(d.getMinutes())}`;
}
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 2400); }

/* ---------- Modal ---------- */
function openModal(title, html) { $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; $('#modalOverlay').classList.remove('hidden'); }
function closeModal() { $('#modalOverlay').classList.add('hidden'); editingPid = null; }
let editingPid = null;

/* ---------- Compatibility (Compat module) ---------- */
let compatCache = null, compatFold = {};
const variantFetching = new Set();
const idealoAttempted = new Set(); // product ids already enriched this session: render→fetch→render loops impossible
const dsLoading = new Set(); // product ids with a datasheet fetch in flight
let rsScheduled = false;
function scheduleRenderSlots() { // deferred + deduped: never re-enters renderSlots synchronously
  if (rsScheduled) return;
  rsScheduled = true;
  setTimeout(() => { rsScheduled = false; try { renderSlots(); } catch { /* ignore */ } }, 0);
}
function dsFetchStart(p) { if (p && p.id && !dsLoading.has(p.id)) { dsLoading.add(p.id); scheduleRenderSlots(); } }
function dsFetchEnd(p) { if (p && p.id && dsLoading.delete(p.id)) scheduleRenderSlots(); }
function ensureVariants(slotId) { // background: old fiches have an Idealo URL but no variants yet
  const s = state.slots[slotId], p = s && sel(s);
  if (!p || p.variants || !p.idealo || typeof Idealo === 'undefined') return;
  if (idealoAttempted.has(p.id) || variantFetching.has(p.idealo)) return;
  idealoAttempted.add(p.id);
  variantFetching.add(p.idealo);
  dsFetchStart(p);
  Idealo.product(p.idealo).then(d => {
    variantFetching.delete(p.idealo);
    dsFetchEnd(p);
    if (!d || d.error || !d.variants || !d.variants.items || !d.variants.items.length) return;
    const cur = s.products.find(x => x.id === p.id);
    if (!cur) return;
    cur.variants = d.variants;
    persist(); renderSlots();
  }).catch(() => { variantFetching.delete(p.idealo); dsFetchEnd(p); });
}
const altAttempted = new Set(); // alternative fiche ids enriched this session
let altEnrichChain = Promise.resolve(); // serialize alternative enrichment across slots
function queueAlternativeData(slotId) { // fire-and-forget, never called from render
  altEnrichChain = altEnrichChain.catch(() => {}).then(() => ensureAlternativeData(slotId));
  return altEnrichChain;
}
async function ensureAlternativeData(slotId) {
  // Ordered per non-selected fiche: offers (price) first, then product (datasheet).
  // Missing fields only, session-once per fiche. Loading states reuse
  // refreshingPids (row shimmer) and dsLoading (grey datasheet pill).
  const s = state.slots[slotId];
  if (!s || typeof Idealo === 'undefined') return;
  const targets = (s.products || []).filter(x => x.id !== s.selectedId
    && /idealo\.fr\/prix\//i.test(x.idealo || '')
    && (!x.price || !x.datasheet)
    && !(editingPid && editingPid === x.id));
  for (const t of targets) {
    const cur = s.products.find(x => x.id === t.id);
    if (!cur || altAttempted.has(cur.id)) continue;
    altAttempted.add(cur.id);
    if (!cur.price) {
      refreshingPids.add(cur.id); renderSlots();
      try {
        const r = await Idealo.offers(cur.idealo, true);
        const c2 = s.products.find(x => x.id === cur.id);
        if (c2 && r && !r.error && r.offers.length) {
          const o = r.offers[0];
          if (o.merchant && !c2.vendor) c2.vendor = o.merchant;
          if (o.price) c2.price = o.price;
          if (o.delivered > 0 && o.price) c2.delivery = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
          if (o.url && !c2.store) c2.store = o.url;
          refreshFailed.delete(cur.id);
        } else refreshFailed.add(cur.id);
      } catch { refreshFailed.add(cur.id); }
      refreshingPids.delete(cur.id);
      persist(); renderSlots();
    }
    if (!cur.datasheet) {
      dsFetchStart(cur);
      try {
        const d = await Idealo.product(cur.idealo);
        dsFetchEnd(cur);
        const c3 = s.products.find(x => x.id === cur.id);
        if (c3 && d && !d.error) {
          if (d.datasheet) c3.datasheet = d.datasheet;
          if (d.specs && !c3.specs) c3.specs = d.specs;
          if (d.img && !c3.image) c3.image = d.img;
          if (d.variants && d.variants.items && d.variants.items.length && !c3.variants) c3.variants = d.variants;
          persist(); compatCache = null; refresh();
        }
      } catch { dsFetchEnd(cur); }
    }
  }
}
function getCompat() {
  if (!compatCache && typeof Compat !== 'undefined') {
    try { compatCache = Compat.check({ order: state.order, slots: state.slots, sel, def: defOf, totals: totals(), lang, dsIds: [...dsLoading] }); }
    catch { compatCache = { checks: {}, issues: { err: [], warn: [] }, statusOf: {} }; }
  }
  return compatCache || { checks: {}, issues: { err: [], warn: [] }, statusOf: {} };
}
function updateCompatBadge() {
  const cc = getCompat(), n = cc.issues.err.length + cc.issues.warn.length;
  const b = $('#compatCount'); if (b) b.textContent = n ? ` (${n})` : '';
}
/* Pure helper: {err, warn} issue counts per section (pc/setup/others). Testable. */
function compatCountsBySec(cc, slotsMap, secOf) {
  const out = { pc: { err: 0, warn: 0 }, setup: { err: 0, warn: 0 }, others: { err: 0, warn: 0 } };
  const bump = (level, sec) => { const k = sec === 'setup' ? 'setup' : sec === 'others' ? 'others' : 'pc'; if (level === 'err') out[k].err++; else if (level === 'warn') out[k].warn++; };
  (cc.issues.err || []).forEach(it => (it.slots || []).forEach(sid => { const s = slotsMap[sid]; if (s) bump('err', secOf(s)); }));
  (cc.issues.warn || []).forEach(it => (it.slots || []).forEach(sid => { const s = slotsMap[sid]; if (s) bump('warn', secOf(s)); }));
  return out;
}
function renderCompat() {
  const cc = getCompat();
  const host = $('#sumCompatPane'); if (!host) return;
  host.innerHTML = '';
  updateCompatBadge();
  const abHtml = (slot, key) => {
    const c = (cc.checks[slot] || []).find(x => x.key === key);
    if (!c || (!c.a && !c.b)) return '';
    return `<span class="di-ab">${c.a ? `<span class="di-a"><b>${esc(c.a.label)}</b> ${esc(c.a.value)}</span>` : ''}${(c.a && c.b) ? '<span class="di-vs">↔</span>' : ''}${c.b ? `<span class="di-b"><b>${esc(c.b.label)}</b> ${esc(c.b.value)}</span>` : ''}</span>`;
  };
  const verifyBtn = (it) => {
    if (it.level !== 'warn' || !it.slot || !it.key) return null;
    const b = document.createElement('button');
    b.className = 'mini-btn verify-btn';
    b.innerHTML = `<i class="fa-solid fa-check"></i> ${lang === 'en' ? 'Verified' : 'Vérifié'}`;
    b.title = lang === 'en' ? 'Mark as verified (I checked this myself)' : 'Marquer comme vérifié (je l’ai contrôlé moi-même)';
    b.onclick = () => toggleVerified(it.slot, it.key);
    return b;
  };
  const sec = (title, list, cls) => {
    const d = document.createElement('div');
    d.className = 'dsec dsec-' + cls + (compatFold[cls] ? ' collapsed' : '');
    d.innerHTML = `<div class="dsec-head" role="button" tabindex="0"><i class="fa-solid fa-${cls === 'err' ? 'xmark' : 'triangle-exclamation'}"></i><span>${esc(title)}</span><span class="dsec-total">${list.length}</span><i class="fa-solid fa-chevron-down foldchev"></i></div>`;
    d.querySelector('.dsec-head').onclick = () => { compatFold[cls] = !compatFold[cls]; d.classList.toggle('collapsed', compatFold[cls]); };
    list.forEach(it => {
      const row = document.createElement('div');
      row.className = 'ditem pill-item';
      row.setAttribute('role', 'button'); row.tabIndex = 0;
      const target = it.slot || (it.slots || [])[0];
      const go = () => { if (target) focusComponent(target); };
      row.onclick = e => { if (e.target.closest('button')) return; go(); };
      row.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      row.innerHTML = `<span class="di-btns"></span><span class="di-txt"><span class="di-name">${esc(it.msg)}</span>${abHtml(it.slot, it.key)}</span>`;
      const btns = row.querySelector('.di-btns');
      const vb = verifyBtn(it);
      if (vb) btns.appendChild(vb);
      d.appendChild(row);
    });
    host.appendChild(d);
  };
  const verifiedList = [];
  state.order.forEach(id => {
    const s = state.slots[id], p = s && sel(s);
    if (!p || !Array.isArray(p.verified) || !p.verified.length) return;
    (cc.checks[id] || []).filter(c => c.status === 'warn' && p.verified.includes(c.key)).forEach(c => verifiedList.push({ slot: id, key: c.key, label: c.label, tip: c.tip, a: c.a, b: c.b }));
  });
  if (!cc.issues.err.length && !cc.issues.warn.length && !verifiedList.length) {
    host.innerHTML = `<p class="hint">${lang === 'en' ? 'No compatibility issue detected.' : 'Aucun problème de compatibilité détecté.'}</p>`;
    return;
  }
  if (cc.issues.err.length) sec(lang === 'en' ? 'Issues' : 'Problèmes', cc.issues.err, 'err');
  if (cc.issues.warn.length) {
    if (cc.issues.err.length) { const s = document.createElement('div'); s.className = 'dsec-sep'; host.appendChild(s); }
    sec(lang === 'en' ? 'Warnings' : 'Avertissements', cc.issues.warn, 'warn');
  }
  if (verifiedList.length) {
    if (cc.issues.err.length || cc.issues.warn.length) { const s = document.createElement('div'); s.className = 'dsec-sep'; host.appendChild(s); }
    const d = document.createElement('div');
    d.className = 'dsec dsec-checked' + (compatFold.checked ? ' collapsed' : '');
    d.innerHTML = `<div class="dsec-head" role="button" tabindex="0"><i class="fa-solid fa-check"></i><span>${lang === 'en' ? 'Verified by you' : 'Vérifié par vous'}</span><span class="dsec-total">${verifiedList.length}</span><i class="fa-solid fa-chevron-down foldchev"></i></div>`;
    d.querySelector('.dsec-head').onclick = () => { compatFold.checked = !compatFold.checked; d.classList.toggle('collapsed', compatFold.checked); };
    verifiedList.forEach(v => {
      const row = document.createElement('div');
      row.className = 'ditem checked-item pill-item';
      row.setAttribute('role', 'button'); row.tabIndex = 0;
      const go = () => focusComponent(v.slot);
      row.onclick = e => { if (e.target.closest('button')) return; go(); };
      row.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      row.innerHTML = `<span class="di-btns"></span><span class="di-txt"><span class="di-name">${esc(v.label)} — ${esc(v.tip)}</span>${(v.a || v.b) ? `<span class="di-ab">${v.a ? `<span class="di-a"><b>${esc(v.a.label)}</b> ${esc(v.a.value)}</span>` : ''}${(v.a && v.b) ? '<span class="di-vs">↔</span>' : ''}${v.b ? `<span class="di-b"><b>${esc(v.b.label)}</b> ${esc(v.b.value)}</span>` : ''}</span>` : ''}</span>`;
      const btns = row.querySelector('.di-btns');
      const ub = document.createElement('button');
      ub.className = 'mini-btn'; ub.textContent = lang === 'en' ? 'Unverify' : 'Annuler';
      ub.onclick = () => toggleVerified(v.slot, v.key);
      btns.appendChild(ub);
      d.appendChild(row);
    });
    host.appendChild(d);
  }
}

/* Toggle "verified" on a warning: hides it from issues, slot turns light green. */
function toggleVerified(slotId, key) {
  const s = state.slots[slotId], p = s && sel(s);
  if (!p || !key) return;
  if (!Array.isArray(p.verified)) p.verified = [];
  const i = p.verified.indexOf(key);
  if (i >= 0) p.verified.splice(i, 1); else p.verified.push(key);
  persist(); compatCache = null; refresh();
  if ($('#modalOverlay') && !$('#modalOverlay').classList.contains('hidden') && openCompatDetail._slot === slotId) openCompatDetail(slotId, true);
  if (sumTab === 'compat') renderCompat();
}

/* "…" popup after the pills: every check with explanation + compared specs a/b. */
function openCompatDetail(slotId, keepOpen) {
  const s = state.slots[slotId], p = s && sel(s);
  if (!p) return;
  openCompatDetail._slot = slotId;
  const cc = getCompat(), cks = cc.checks[slotId] || [];
  const sic = iconHtml(defOf(s).icon || 'lucide:cpu');
  const sideIcon = sd => {
    try {
      const sid = (sd && sd.slot) || slotId;
      const st = sid && state.slots[sid];
      return iconHtml((st && defOf(st).icon) || 'lucide:cpu');
    } catch { return sic; }
  };
  const rows = cks.length ? cks.map(c => {
    const isV = c.status === 'warn' && Array.isArray(p.verified) && p.verified.includes(c.key);
    return `<div class="cd-row ${c.status}${isV ? ' is-verified' : ''}">
      <span class="cd-title ${isV ? 'checked' : c.status}">${esc(c.label)}</span>
      <div class="cd-tip">${esc(c.tip)}</div>
      ${(c.a || c.b) ? `<div class="cd-vs">${c.a ? `<div class="cd-side"><span class="cd-ico">${sideIcon(c.a)}</span><span class="cd-side-lbl">${esc(c.a.label)}</span><span class="cd-side-val">${esc(c.a.value)}</span></div>` : ''}<span class="cd-vs-badge">VS</span>${c.b ? `<div class="cd-side"><span class="cd-ico">${sideIcon(c.b)}</span><span class="cd-side-lbl">${esc(c.b.label)}</span><span class="cd-side-val">${esc(c.b.value)}</span></div>` : ''}</div>` : ''}
      ${c.status === 'warn' ? `<button class="mini-btn verify-btn" data-vkey="${esc(c.key)}"><i class="fa-solid fa-check"></i> ${isV ? (lang === 'en' ? 'Unverify' : 'Annuler') : (lang === 'en' ? 'Verified' : 'Vérifié')}</button>` : ''}
    </div>`;
  }).join('') : `<p class="hint">${lang === 'en' ? 'No checks for this component.' : 'Aucune vérification pour ce composant.'}</p>`;
  openModal((lang === 'en' ? 'Compatibility — ' : 'Compatibilité — ') + slotName(slotId), `<div class="compat-detail">${rows}</div>`);
  document.querySelectorAll('[data-vkey]').forEach(b => b.addEventListener('click', () => toggleVerified(slotId, b.getAttribute('data-vkey'))));
  refreshIcons(); // hydrate lucide <i data-lucide> instantly, same frame as popup open
}

/* ---------- Slot rendering ---------- */
function productQuickSpecs(p) {
  let spec = String(p.specs || '').split('\n').map(s => s.trim()).filter(Boolean).join(', ');
  const nm = String(p.name || '').trim();
  if (nm.length > 3) {
    const escRe = nm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    spec = spec.replace(new RegExp(escRe, 'ig'), '').replace(/[\d\s ]+[.,]\d{2}\s*€/g, '');
    spec = spec.replace(/\s+/g, ' ').replace(/^[·,;:\-–\s]+/, '').replace(/(\s*[·,;:]){2,}/g, ' ').trim();
  }
  return spec;
}
function renderSlots() {
  const host = $('#slotSections'); host.innerHTML = '';
  ['pc', 'setup', 'others'].forEach(sec => {
    const ids = state.order.filter(id => defOf(state.slots[id]).sec === sec);
    if (!ids.length) return;
    const wrap = document.createElement('div');
    const done = ids.filter(id => sel(state.slots[id])).length;
    wrap.innerHTML = `<div class="sec-title"><h2><i class="${SECTIONS.find(s => s.id === sec).icon}"></i> ${esc(secName(sec))}</h2><span class="count">${done}/${ids.length}</span></div>`;
    ids.forEach(id => wrap.appendChild(slotCard(id)));
    {
      const b = document.createElement('button');
      b.className = 'add-row-btn';
      b.innerHTML = `<i class="fa-solid fa-plus"></i> ${sec === 'pc' ? (lang === 'en' ? 'Add PC part' : 'Ajouter un composant PC') : sec === 'setup' ? (lang === 'en' ? 'Add setup item' : 'Ajouter un élément setup') : (lang === 'en' ? 'Add another item' : 'Ajouter un autre élément')}`;
      b.onclick = () => openAddPopup(sec);
      wrap.appendChild(b);
    }
    host.appendChild(wrap);
  });
  refreshIcons();
}
/* Merchant homepage guessed from a vendor label ("amazon-marketplace.fr" → https).
   Used for the buy button when the fiche has no offer/Idealo link. */
function merchantHomepage(vendor) {
  const v = String(vendor || '').replace(/\s*\(.*?\)\s*/g, ' ').trim().toLowerCase();
  const m = v.match(/([a-z0-9-]+\.)+[a-z]{2,}/);
  return m ? 'https://' + m[0] : '';
}
/* Submits an Idealo offer token (POST form like the site does): the new tab
   lands straight on the merchant offer. Standard form navigation, no CORS issue. */
function submitOfferToken(token, target) {
  const f = document.createElement('form');
  f.method = 'POST'; f.action = 'https://www.idealo.fr/ipc/prg'; f.target = target || '_blank';
  const inp = document.createElement('input');
  inp.type = 'hidden'; inp.name = 'value'; inp.value = token;
  f.appendChild(inp); document.body.appendChild(f); f.submit();
  setTimeout(() => f.remove(), 1500);
}
/* Opens a direct merchant offer (no /prix/ page): resolves the offer token
   from the source list page, submits it, optionally persists it via saveToken.
   Falls back to the merchant homepage, never to a search.
   NOTE: the tab is opened synchronously (click gesture alive) because popup
   blockers kill _blank navigations issued after async work. */
async function buyDirectOffer({ src, title, vendor, saveToken }) {
  const matchNow = map => (map && typeof Idealo !== 'undefined' && Idealo.matchToken ? Idealo.matchToken(map, title, vendor) : null);
  try {
    if (src && typeof Idealo !== 'undefined' && Idealo.peekTokens) {
      const hit = matchNow(Idealo.peekTokens(src));
      if (hit && hit.token) {
        if (saveToken) { try { saveToken(hit.token); } catch { /* ignore */ } }
        submitOfferToken(hit.token);
        return true;
      }
    }
  } catch { /* fall through */ }
  const tabName = 'cm_offer_' + Date.now().toString(36);
  let tab = null;
  try { tab = window.open('about:blank', tabName); } catch { tab = null; }
  if (tab) { try { tab.document.write('<p style="font-family:sans-serif">Ouverture de l’offre marchand…</p>'); } catch { /* ignore */ } }
  toast(lang === 'en' ? 'Opening merchant offer…' : 'Ouverture de l’offre marchand…');
  let hit = null, fetchFailed = false;
  try {
    if (src && typeof Idealo !== 'undefined' && Idealo.offerTokens) {
      const r = await Idealo.offerTokens(src, true); // always fresh: tokens may expire
      hit = (r.tokens && Idealo.matchToken(r.tokens, title, vendor)) || null;
      if (!hit && r.error) fetchFailed = true;
    } else fetchFailed = true;
  } catch { hit = null; fetchFailed = true; }
  if (hit && hit.token) {
    if (saveToken) { try { saveToken(hit.token); } catch { /* ignore */ } }
    submitOfferToken(hit.token, tab ? tabName : '_blank');
    return true;
  }
  if (fetchFailed) {
    try { if (tab && !tab.closed) tab.close(); } catch { /* ignore */ }
    toast(lang === 'en' ? 'Idealo unreachable (limit/network) — retry later' : 'Idealo injoignable (limite/réseau) — réessayez plus tard');
    return false;
  }
  if (hit && hit.token) {
    if (saveToken) { try { saveToken(hit.token); } catch { /* ignore */ } }
    submitOfferToken(hit.token, tab ? tabName : '_blank');
    return true;
  }
  const home = merchantHomepage(vendor);
  if (home) {
    try {
      if (tab && !tab.closed) tab.location.href = home;
      else window.open(home, '_blank', 'noopener');
    } catch { try { window.open(home, '_blank', 'noopener'); } catch { /* ignore */ } }
    toast(lang === 'en' ? 'Offer unreachable — opening shop homepage' : 'Offre injoignable — page d’accueil du marchand');
    return true;
  }
  try { if (tab && !tab.closed) tab.close(); } catch { /* ignore */ }
  toast(lang === 'en' ? 'No merchant link available' : 'Aucun lien marchand disponible');
  return false;
}
/* Resolves where the buy button leads: stored offer link, Idealo page,
   else empty (direct-offer token flow handled separately). */
function buyUrlFor(p) {
  if (!p) return '';
  if (p.store) return p.store;
  if (p.idealo && /idealo\.fr/i.test(p.idealo)) return p.idealo;
  return '';
}
/* ---------- Idealo variants on slot cards ---------- */
const normTxt = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
/* Variant attribute equality (delegates to Idealo.variantNorm when available). */
function variantAttrEq(a, b) {
  if (typeof Idealo !== 'undefined' && Idealo.variantNorm) {
    const x = Idealo.variantNorm(a), y = Idealo.variantNorm(b);
    return !!x && x === y;
  }
  const sa = String(a ?? '').trim(), sb = String(b ?? '').trim();
  return sa !== '' && sa === sb;
}
function variantCurIdx(p) {
  const items = (p.variants && p.variants.items) || [];
  const cur = normTxt(p.idealo || '').replace(/\/$/, '');
  if (!cur) return items.length ? 0 : -1;
  const i = items.findIndex(it => normTxt(it.url || '').replace(/\/$/, '') === cur);
  return i >= 0 ? i : -1;
}
function renderVariantRow(id, p) {
  const v = p.variants;
  if (!v || !v.items || !v.items.length) return '';
  const items = v.items;
  const curIdx = variantCurIdx(p);
  const curLbl = curIdx >= 0 ? items[curIdx].name : `${v.count || items.length} ${lang === 'en' ? 'variants' : 'variantes'}`;
  const fsel = variantFilters[id] || {};
  const filters = v.filters || [];
  const active = {}; // dimIdx -> valIdx or -1 (single-select per dimension, like Idealo)
  filters.forEach((f, fi) => {
    const vi = fsel[fi];
    active[fi] = (vi >= 0 && vi < (f.values || []).length) ? vi : -1;
  });
  /* Models matching all active dimensions (unknown attribute never matches a selection). */
  const matchCount = over => items.filter(it => filters.every((f, fi) => {
    const vi = (over && over[fi] !== undefined) ? over[fi] : active[fi];
    if (vi < 0) return true;
    const av = it.attrs && it.attrs[f.label];
    return !!av && variantAttrEq(av, f.values[vi]);
  })).length;
  /* Price colors: black by default, lowest green, ≥25% below max orange (huge promotion). */
  const vprices = items.map(it => Number(it.price) || 0).filter(Boolean);
  const pMin = vprices.length ? Math.min(...vprices) : 0;
  const pMax = vprices.length ? Math.max(...vprices) : 0;
  const priceCls = pr => {
    if (!(pr > 0) || !pMax) return '';
    if (pr <= pMin) return ' best';
    if ((pMax - pr) / pMax >= 0.25) return ' promo';
    return '';
  };
  /* Price difference vs the current variant (like alternatives): +/−€ under each other model. */
  const curPrice = curIdx >= 0 ? (Number(items[curIdx].price) || 0) : 0;
  const diffHtml = (it, ii) => {
    const pr = Number(it.price) || 0;
    if (ii === curIdx || !(pr > 0) || !(curPrice > 0)) return '';
    const d = Math.round((pr - curPrice) * 100) / 100;
    if (!d) return '';
    const cls = d > 0 ? 'up' : 'down';
    return `<span class="variant-diff diff ${cls}">${d > 0 ? '+' : ''}${eur(d)}</span>`;
  };
  const loading = !!variantLoading, pendingUrl = variantPending[id];
  const attrsLoading = variantAttrsLoading.has(id);
  const vLocked = loading || attrsLoading; // nothing selectable anywhere in the dropdown while loading
  const visible = it => filters.every((f, fi) => {
    if (active[fi] < 0) return true;
    const av = it.attrs && it.attrs[f.label];
    return !!av && variantAttrEq(av, f.values[active[fi]]);
  });
  let body = '';
  if (openVariants.has(id)) {
    const dims = filters.map((f, fi) => {
      const chips = (f.values || []).map((val, vi) => {
        const n = matchCount({ ...active, [fi]: vi });
        const dis = vLocked || n === 0;
        return `<button class="mini-btn vchip${active[fi] === vi ? ' sel' : ''}" data-act="variantchip" data-f="${fi}" data-v="${vi}"${dis ? ' disabled' : ''} title="${n} ${lang === 'en' ? 'model(s)' : 'modèle(s)'}">${esc(val)}</button>`;
      }).join('');
      return `<div class="variant-dim"><span class="variant-dim-lbl">${esc(f.label)} :</span>${chips}</div>`;
    }).join('');
    const loadHint = attrsLoading ? `<div class="variant-loading"><i class="fa-solid fa-circle-notch fa-spin"></i> ${lang === 'en' ? 'Loading options…' : 'Chargement des options…'}</div>` : '';
    const cards = items.map((it, ii) => {
      if (!visible(it)) return '';
      const pend = pendingUrl && normTxt(it.url || '').replace(/\/$/, '') === normTxt(pendingUrl).replace(/\/$/, '');
      return `<button class="variant-card${ii === curIdx ? ' sel' : ''}${pend ? ' pending' : ''}${vLocked ? ' loading' : ''}" data-act="variantpick" data-url="${esc(it.url)}" data-price="${it.price || 0}" title="${esc(it.name)} — ${eur(it.price)}"${vLocked ? ' disabled' : ''}>${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" onerror="this.remove()">` : `<span class="variant-noimg"><i class="fa-solid fa-microchip"></i></span>`}<span class="variant-name">${esc(it.name)}</span><span class="variant-price${priceCls(it.price)}">${eur(it.price)}</span>${diffHtml(it, ii)}<span class="variant-acts"><span class="mini-btn vact" role="button" tabindex="0" data-act="variantopen" data-url="${esc(it.url)}" title="${lang === 'en' ? 'Open in Idealo' : 'Ouvrir dans Idealo'}"><i class="fa-solid fa-arrow-up-right-from-square"></i></span><span class="mini-btn vact" role="button" tabindex="0" data-act="variantadd" data-url="${esc(it.url)}" data-price="${it.price || 0}" data-name="${esc(it.name)}" data-img="${esc(it.img || '')}" title="${lang === 'en' ? 'Add as alternative' : 'Ajouter en alternative'}"><span class="fa-layers-plus"><i class="fa-solid fa-layer-group"></i><i class="fa-solid fa-plus"></i></span></span></span></button>`;
    }).join('');
    body = `<div class="variant-body">${loadHint}${dims}<div class="variant-models">${cards || `<p class="hint">${lang === 'en' ? 'No model matches these filters.' : 'Aucun modèle pour ces filtres.'}</p>`}</div></div>`;
  }
  return `<div class="slot-variants${openVariants.has(id) ? ' open' : ''}${(loading || attrsLoading) ? ' loading' : ''}"><button class="variant-toggle" data-act="variants" title="${lang === 'en' ? 'Choose a variant' : 'Choisir une variante'}"><i class="fa-solid fa-shuffle"></i><span class="variant-cur">${esc(curLbl)}</span><span class="variant-count">${items.length}</span><i class="fa-solid fa-chevron-${openVariants.has(id) ? 'up' : 'down'}"></i></button>${body}</div>`;
}
async function selectVariant(slotId, url, cardPrice) {
  const s = state.slots[slotId], p = s && sel(s);
  if (!p || !url || typeof Idealo === 'undefined') return;
  if (variantLoading) { toast(lang === 'en' ? 'A variant is already loading — please wait' : 'Une variante charge déjà — patientez'); return; }
  variantLoading = url; variantPending[slotId] = url; dsFetchStart(p); idealoAttempted.add(p.id); renderSlots(); // instant feedback
  showProgress(lang === 'en' ? 'Loading variant…' : 'Chargement de la variante…');
  try {
    const [d, r] = await Promise.all([Idealo.product(url), Idealo.offers(url)]);
    const cur = s.products.find(x => x.id === p.id);
    if (!cur) return;
    if (d && !d.error) {
      if (d.name) cur.name = d.name;
      if (d.img) cur.image = d.img;
      if (d.specs) cur.specs = d.specs;
      if (d.datasheet) cur.datasheet = d.datasheet;
      if (d.variants && d.variants.items && d.variants.items.length) cur.variants = d.variants;
    }
    cur.idealo = url;
    if (r && !r.error && r.offers.length) {
      const o = r.offers[0];
      if (o.merchant) cur.vendor = o.merchant;
      if (o.price) cur.price = o.price;
      if (o.delivered > 0 && o.price) cur.delivery = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
      if (o.url) cur.store = o.url;
      if (o.promo) cur.promo = true;
    } else if (cardPrice > 0) cur.price = cardPrice;
    cur.verified = [];
    persist(); compatCache = null; refresh();
    toast(lang === 'en' ? 'Variant loaded — prices and compatibility updated' : 'Variante chargée — prix et compatibilité actualisés');
    queueAlternativeData(slotId);
  } catch {
    toast(lang === 'en' ? 'Variant unavailable — retry later' : 'Variante indisponible — réessayez plus tard');
  } finally { variantLoading = null; delete variantPending[slotId]; dsFetchEnd(p); hideProgress(); }
}
async function addVariantAsAlt(slotId, url, cardPrice, cardName, cardImg) {
  const s = state.slots[slotId], p = s && sel(s);
  if (!s || !url || typeof Idealo === 'undefined') return;
  if (variantLoading) { toast(lang === 'en' ? 'A variant is already loading — please wait' : 'Une variante charge déjà — patientez'); return; }
  const norm = u => normTxt(u || '').replace(/\/$/, '');
  if (s.products.some(x => norm(x.idealo) === norm(url))) {
    toast(lang === 'en' ? 'Already in alternatives' : 'Déjà dans les alternatives');
    openAlts.add(slotId); renderSlots(); return;
  }
  const np = blankProduct();
  np.name = cardName || (lang === 'en' ? 'Variant' : 'Variante');
  np.image = cardImg || '';
  np.idealo = url;
  np.price = cardPrice || 0;
  if (p && p.variants && p.variants.items && p.variants.items.length) np.variants = p.variants;
  s.products.push(np);
  persist(); renderSlots();
  toast(lang === 'en' ? 'Alternative added — enriching…' : 'Alternative ajoutée — enrichissement…');
  variantLoading = url; dsFetchStart(np); idealoAttempted.add(np.id);
  try {
    const [d, r] = await Promise.all([Idealo.product(url), Idealo.offers(url)]);
    const cur = s.products.find(x => x.id === np.id);
    if (!cur) return;
    if (d && !d.error) {
      if (d.name) cur.name = d.name;
      if (d.img && !cur.image) cur.image = d.img;
      if (d.specs) cur.specs = d.specs;
      if (d.datasheet) cur.datasheet = d.datasheet;
      if (d.variants && d.variants.items && d.variants.items.length) cur.variants = d.variants;
      if (d.price && !cur.price) cur.price = d.price;
    }
    if (r && !r.error && r.offers.length) {
      const o = r.offers[0];
      if (o.merchant) cur.vendor = o.merchant;
      if (o.price) cur.price = o.price;
      if (o.delivered > 0 && o.price) cur.delivery = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
      if (o.url) cur.store = o.url;
      if (o.promo) cur.promo = true;
    }
    persist(); compatCache = null; refresh();
  } catch { /* keep card-level fiche */ } finally { variantLoading = null; dsFetchEnd(np); }
  queueAlternativeData(slotId);
}
function slotCard(id) {
  const s = state.slots[id], d = defOf(s), p = sel(s);
  const el = document.createElement('div');
  const isRefreshing = !!(p && refreshingPids.has(p.id));
  const altRefreshing = s.products.some(x => (!p || x.id !== p.id) && refreshingPids.has(x.id));
  const stale = !!(p && refreshFailed.has(p.id));
  el.className = 'slot' + (activeSlot === id ? ' sel' : '') + (stale ? ' stale' : '');
  el.dataset.slot = id;
  if (p && p.idealo && !p.variants) ensureVariants(id);
  const cc = getCompat(), cks = p ? (cc.checks[id] || []) : [], cst = cc.statusOf[id];
  if (cst === 'err') el.classList.add('has-err'); else if (cst === 'warn') el.classList.add('has-warn');
  const visual = p && p.image ? `<img src="${esc(p.image)}" alt="" onerror="this.remove()">` : iconHtml(d.icon);
  const title = p ? esc(p.name) : (lang === 'en' ? `Add ${esc(slotName(id))}` : `Ajouter ${esc(slotName(id))}`);
  const specs = p ? esc(productQuickSpecs(p)) : esc(slotName(id));
  let priceDiv = `<div class="slot-price">—</div>`, vendorDiv = `<div class="slot-vendor">${esc(slotName(id))}</div>`, delivDiv = '';
  if (p) {
    const old = hasDiscount(p) ? `<span class="old">${eur(p.oldPrice)}</span>` : '';
    const badge = hasDiscount(p) ? `<span class="disc-badge"><i class="fa-solid fa-tag"></i> −${discPct(p)}%</span>` : '';
    const discounted = !!(p.promo || hasDiscount(p));
    const bestPrice = !!p.isBest;
    const betterTip = lang === 'en' ? 'A better price is available' : 'Un meilleur prix est disponible';
    const promoTip = lang === 'en' ? 'Idealo deal' : 'Bon plan Idealo';
    priceDiv = `<div class="slot-price${bestPrice ? ' best' : (discounted ? ' promo' : '')}">${old}${eur(p.price)}${badge}${discounted ? ` <span class="promo-badge" title="${promoTip}">%</span>` : ''}${p.best ? ` <span class="better-badge" title="${betterTip}">€</span>` : ''}</div>`;
    vendorDiv = `<div class="slot-vendor">${esc(p.vendor || (lang === 'en' ? 'Vendor: —' : 'Vendeur : —'))}</div>`;
    delivDiv = `<div class="slot-deliv">${lang === 'en' ? 'incl. delivery' : 'livraison incl.'} ${eur(unitTotal(p))}</div>`;
  }
  const priceHtml = priceDiv + vendorDiv + delivDiv;
  const hasIdealo = !!(p && p.idealo && /idealo\.fr/i.test(p.idealo));
  const buyUrl = buyUrlFor(p);
  const hasBuy = !!buyUrl;
  const noIdealoTip = lang === 'en' ? 'No Idealo page for this part (offer without listing)' : 'Pas de page Idealo pour ce composant (offre sans fiche)';
  const noStoreTip = lang === 'en' ? 'Merchant choice needs an Idealo /prix/ page' : 'Choix du marchand impossible sans page Idealo /prix/';
  const noBuyTip = lang === 'en' ? 'No store page available' : 'Pas de page boutique disponible';
  const knownIssueTip = 'issue is known, i am trying to fix it :)';
  const buyTip = !hasBuy && p && p.src ? knownIssueTip : noBuyTip;
  el.innerHTML = `
    ${id.includes('_') ? `<button class="slot-remove" data-act="rmslot" title="${lang === 'en' ? 'Remove this component' : 'Supprimer ce composant'}"><i class="fa-solid fa-xmark"></i></button>` : ''}
    <div class="slot-sweep${isRefreshing ? ' refreshing-sel' : ''}">
    <button class="slot-main${p ? '' : ' empty'}" data-act="pick">
      <span class="slot-visual">${visual}</span>
      <span class="slot-info"><span class="slot-type">${esc(slotName(id))}</span><span class-right></span>
        <div class="slot-name">${title}</div><div class="slot-specs">${specs}</div></span>
      <span class="slot-side${stale ? ' stale-side' : ''}">${stale
        ? `<span class="slot-stale-row"><span class="slot-refetch" data-act="refetch" title="${lang === 'en' ? 'Refresh price' : 'Actualiser le prix'}"><i class="fa-solid fa-rotate-right"></i></span>${priceDiv}<span class="slot-warn" title="${lang === 'en' ? 'Price refresh failed' : 'Échec actualisation du prix'}"><i class="fa-solid fa-triangle-exclamation"></i></span></span>${vendorDiv}${delivDiv}`
        : priceHtml}</span>
    </button>
    ${(cks.length || (p && p.idealo && !p.datasheet && dsLoading.has(p.id))) ? `<div class="slot-compat">${p && p.idealo && !p.datasheet && dsLoading.has(p.id) ? `<span class="compat-badge loading" title="${lang === 'en' ? 'Loading datasheet…' : 'Chargement de la fiche technique…'}"><i class="fa-solid fa-circle-notch fa-spin"></i>Datasheet…</span>` : ''}${cks.map(c => { const v = c.status === 'warn' && Array.isArray(p.verified) && p.verified.includes(c.key); const st = v ? 'checked' : c.status; return `<span class="compat-badge ${st}" title="${esc(c.tip)}${v ? ` (${lang === 'en' ? 'verified' : 'vérifié'})` : ''}"><i class="fa-solid fa-${st === 'ok' || st === 'checked' ? 'check' : st === 'warn' ? 'triangle-exclamation' : st === 'err' ? 'xmark' : 'minus'}"></i>${esc(c.label)}</span>`; }).join('')}${cks.length ? `<button class="mini-btn compat-more" data-act="compat" title="${lang === 'en' ? 'Compatibility details' : 'Détails de compatibilité'}">…</button>` : ''}</div>` : ''}
    ${p && p.variants && p.variants.items && p.variants.items.length ? renderVariantRow(id, p) : ''}
    ${p ? `<div class="slot-actions">
      <button class="mini-btn" data-act="edit" title="${lang === 'en' ? 'Edit component data' : 'Modifier les données du composant'}"><i class="fa-solid fa-pen"></i></button>
      <button class="mini-btn" data-act="idealo" ${hasIdealo ? `title="${lang === 'en' ? 'Open Idealo page' : 'Ouvrir la page Idealo'}"` : `disabled title="${noIdealoTip}"`}><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
      <button class="mini-btn" data-act="addalt" title="${lang === 'en' ? 'Add alternative' : 'Ajouter une alternative'}"><span class="fa-layers-plus"><i class="fa-solid fa-layer-group"></i><i class="fa-solid fa-plus"></i></span></button>
      <button class="mini-btn" data-act="store" ${hasIdealo ? `title="${lang === 'en' ? 'Change store' : 'Changer de boutique'}"` : `disabled title="${noStoreTip}"`}><i class="fa-solid fa-store"></i></button>
      <button class="mini-btn" data-act="buy" ${hasBuy ? `title="${lang === 'en' ? 'Open this store page' : 'Ouvrir la page de cette boutique'}"` : `disabled title="${buyTip}"`}><i class="fa-solid fa-cart-shopping"></i></button>
      ${['mb', 'ssd1', 'soundcard', 'capture', 'netcard'].includes(d.id) ? `<button class="mini-btn" data-act="pcie" title="${lang === 'en' ? 'PCIe Simulator — send full config' : 'Simulateur PCIe — envoyer la config complète'}"><i class="fa-solid fa-chart-column"></i></button>` : ''}
      <button class="mini-btn" data-act="delivery" title="${lang === 'en' ? 'Delivery tracker' : 'Suivi colis'}"><i class="fa-solid fa-truck-fast"></i></button>
      <button class="mini-btn danger" data-act="del" title="${lang === 'en' ? 'Remove' : 'Supprimer'}"><i class="fa-solid fa-trash"></i></button>
    </div>
    ${p.tracking || p.tstatus ? `<div class="delivery-tag"><i class="fa-solid fa-truck-fast"></i> ${esc(p.carrier || '')} ${esc(p.tracking || '')} — ${esc(statusLabel(p.tstatus))}</div>` : ''}` : ''}
    </div>
    ${p ? `<div class="slot-alt-tab"><button class="alt-toggle${altRefreshing ? ' refreshing-alt' : ''}" data-act="alts"><i class="fa-solid fa-layer-group"></i> ${t('alts.see')} (${s.products.length}) <i class="fa-solid fa-chevron-${openAlts.has(id) ? 'up' : 'down'}"></i></button>
    <div class="alt-list${openAlts.has(id) ? '' : ' hidden'}" data-alts></div></div>` : ''}`;
  el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (b.dataset.act === 'alts') { const opening = !openAlts.has(id); opening ? openAlts.add(id) : openAlts.delete(id); renderSlots(); if (opening) queueAlternativeData(id); return; }
    if (b.dataset.act === 'rmslot') { removeSlot(id); return; }
    if (b.dataset.act === 'variants') { openVariants.has(id) ? openVariants.delete(id) : openVariants.add(id); if (openVariants.has(id)) ensureVariantAttrs(id); renderSlots(); return; }
    if (b.dataset.act === 'variantchip') {
      const f = parseInt(b.dataset.f, 10), v = parseInt(b.dataset.v, 10);
      const cur = (variantFilters[id] || {})[f];
      variantFilters[id] = { ...(variantFilters[id] || {}) };
      if (cur === v) delete variantFilters[id][f]; else variantFilters[id][f] = v;
      renderSlots(); return;
    }
    if (b.dataset.act === 'variantpick') { selectVariant(id, b.dataset.url, parseFloat(b.dataset.price) || 0); return; }
    if (b.dataset.act === 'variantopen') { if (b.dataset.url) window.open(b.dataset.url, '_blank', 'noopener'); return; }
    if (b.dataset.act === 'variantadd') { addVariantAsAlt(id, b.dataset.url, parseFloat(b.dataset.price) || 0, b.dataset.name || '', b.dataset.img || ''); return; }
    slotAction(id, b.dataset.act);
  }));
  el.querySelectorAll('[data-act][role="button"]').forEach(b => b.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (b.closest('[disabled]')) return; // locked dropdown: keyboard must not bypass it
    b.click();
  }));
  const alts = el.querySelector('[data-alts]');
  if (alts) renderAlts(alts, s, id);
  return el;
}
function renderAlts(host, s, slotId) {
  const cur = sel(s);
  const sorted = [...s.products].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  host.innerHTML = sorted.length ? '' : `<p class="hint">${lang === 'en' ? 'No alternatives yet — pick one from the Idealo results or create a fiche.' : 'Aucune alternative — choisissez-en une depuis les résultats Idealo ou créez une fiche.'}</p>`;
  sorted.forEach(p => {
    const diff = cur ? (Number(p.price) - Number(cur.price)) * (Number(p.qty) || 1) : 0;
    const cls = !cur || p.id === cur.id ? 'same' : diff > 0 ? 'up' : 'down';
    const lbl = !cur || p.id === cur.id ? (lang === 'en' ? 'current' : 'actuel') : `${diff > 0 ? '+' : ''}${eur(diff)}`;
    const row = document.createElement('div');
    const rowSpin = refreshingPids.has(p.id) && (!cur || p.id !== cur.id);
    row.className = 'alt-item' + (cur && p.id === cur.id ? ' current' : '') + (rowSpin ? ' refreshing' : '');
    row.innerHTML = `<span class="grow"><strong>${esc(p.name)}</strong>${dsLoading.has(p.id) ? ` <span class="alt-ds-spin" title="${lang === 'en' ? 'Loading datasheet…' : 'Chargement de la fiche technique…'}"><i class="fa-solid fa-circle-notch fa-spin"></i></span>` : ''} · ${eur(p.price)}</span><span class="diff ${cls}">${lbl}</span>`;
    row.style.cursor = 'pointer';
    row.onclick = () => { s.selectedId = p.id; persist(); refresh(); };
    const acts = document.createElement('div');
    acts.style.display = 'flex'; acts.style.gap = '4px'; acts.style.justifyContent = 'center';
    const open = document.createElement('button');
    open.className = 'mini-btn'; open.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i>`;
    open.title = 'Idealo';
    open.onclick = e => { e.stopPropagation(); window.open(p.idealo || idealoSearchUrl(p.name), '_blank', 'noopener'); };
    const edit = document.createElement('button');
    edit.className = 'mini-btn'; edit.innerHTML = `<i class="fa-solid fa-pen"></i>`;
    edit.title = lang === 'en' ? 'Edit' : 'Modifier';
    edit.onclick = e => { e.stopPropagation(); openProductForm(slotId, p); };
    const del = document.createElement('button');
    del.className = 'mini-btn danger'; del.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    del.title = lang === 'en' ? 'Remove' : 'Supprimer';
    del.onclick = e => { e.stopPropagation(); altRemove(slotId, p.id); };
    acts.append(open, edit, del);
    row.appendChild(acts);
    host.appendChild(row);
  });
}
function altRemove(slotId, pid) {
  const s = state.slots[slotId]; if (!s) return;
  if (!confirm(lang === 'en' ? 'Delete this entry?' : 'Supprimer cette fiche ?')) return;
  s.products = s.products.filter(x => x.id !== pid);
  if (s.selectedId === pid) s.selectedId = s.products[0]?.id || null;
  if (!s.products.length) openAlts.delete(slotId);
  persist(); refresh();
}
function slotAction(id, act) {
  const s = state.slots[id], p = sel(s);
  if (act === 'pick') openPicker(id, 'replace');
  else if (act === 'edit') openProductForm(id, p);
  else if (act === 'addalt') openPicker(id, 'add');
  else if (act === 'idealo') { if (p && p.idealo && /idealo\.fr/i.test(p.idealo)) window.open(p.idealo, '_blank', 'noopener'); else openPicker(id); }
  else if (act === 'store') openMerchants(id);
  else if (act === 'buy') {
    const u = buyUrlFor(p);
    if (u) { window.open(u, '_blank', 'noopener'); return; }
    toast('issue is known, i am trying to fix it :)');
  }
  else if (act === 'pcie') openPcieSim();
  else if (act === 'delivery') openDelivery(id);
  else if (act === 'refetch') refreshOnePrice(id);
  else if (act === 'compat') openCompatDetail(id);
  else if (act === 'del') { if (confirm(lang === 'en' ? 'Remove selection?' : 'Retirer la sélection ?')) { s.selectedId = null; persist(); refresh(); } }
}
async function refreshOnePrice(slotId) {
  const s = state.slots[slotId]; const p = s && sel(s); if (!p) return;
  if (!/idealo\.fr\/prix\//i.test(p.idealo || '') || typeof Idealo === 'undefined') return;
  if (editingPid && editingPid === p.id) return;
  refreshingPids.add(p.id); renderSlots(); renderSummary();
  showProgress(lang === 'en' ? 'Refreshing price…' : 'Actualisation du prix…');
  try {
    const r = await Idealo.offers(p.idealo, true);
    const cur = s.products.find(x => x.id === p.id);
    if (cur && !r.error && r.offers.length) {
      const changed = applyOfferRefresh(cur, r.offers, true);
      refreshFailed.delete(cur.id);
      toast(changed
        ? (lang === 'en' ? 'Price updated' : 'Prix actualisé')
        : (lang === 'en' ? 'Price already up to date' : 'Prix déjà à jour'));
    } else {
      refreshFailed.add(p.id);
      toast(lang === 'en' ? 'Price refresh failed — retry later' : 'Échec actualisation — réessayez plus tard');
    }
  } catch {
    refreshFailed.add(p.id);
    toast(lang === 'en' ? 'Price refresh failed — retry later' : 'Échec actualisation — réessayez plus tard');
  }
  refreshingPids.delete(p.id);
  persist(); refresh(); hideProgress();
}
const PC_ORDER = ['cpu', 'mb', 'ram', 'cooler', 'thermal', 'ssd1', 'hdd', 'gpu', 'case', 'fans', 'psu', 'psucables', 'netcard', 'os', 'soft'];
const SETUP_ORDER = ['desk', 'chair', 'webcam', 'screen1', 'keyboard', 'mouse', 'pad', 'headset', 'gamepad', 'ups', 'switch', 'router', 'nas', 'graphictab', 'usbstick', 'memcard', 'dock', 'printer', 'extstorage', 'speakers', 'soundcard', 'capture', 'monitorarm'];
function openAddPopup(sec) {
  const order = sec === 'pc' ? PC_ORDER : sec === 'setup' ? SETUP_ORDER : ['opt1'];
  const byId = Object.fromEntries(SLOT_DEFS.map(d => [d.id, d]));
  const types = order.filter(id => byId[id]).map(id => {
    const d = byId[id];
    const label = d.sec === 'others' ? (lang === 'en' ? 'Option' : 'Option') : ((SLOT_NAMES[lang] && SLOT_NAMES[lang][d.id]) || SLOT_NAMES.fr[d.id] || d.id);
    return { defId: d.id, icon: d.icon, label };
  });
  openModal(lang === 'en' ? 'Select component type' : 'Choisir le type de composant', `
    <div class="type-grid">${types.map(t => `<button class="type-btn" data-def="${t.defId}">${iconHtml(t.icon)}<span>${esc(t.label)}</span></button>`).join('')}</div>`);
  refreshIcons();
  $$('#modalBody .type-btn').forEach(b => b.onclick = () => { closeModal(); addSlotByDef(b.dataset.def); });
}
function addSlotByDef(defId) {
  const d = SLOT_DEFS.find(x => x.id === defId); if (!d) return;
  const prefix = { ssd1: 'ssd', screen1: 'screen', os: 'pcx' }[defId] || (d.sec === 'others' ? 'opt' : defId);
  let n = 1;
  while (state.slots[`${prefix}_${n}`]) n++;
  const id = `${prefix}_${n}`;
  state.slots[id] = { defId, customLabel: id, products: [], selectedId: null };
  // insert below the concerned component type
  const ORDER = d.sec === 'pc' ? PC_ORDER : d.sec === 'setup' ? SETUP_ORDER : null;
  let anchorPos = -1;
  if (ORDER) {
    const selfIdx = ORDER.indexOf(defId);
    for (let i = selfIdx - 1; i >= 0; i--) {
      const ids = state.order.filter(sid => state.slots[sid].defId === ORDER[i]);
      if (ids.length) { anchorPos = state.order.indexOf(ids[ids.length - 1]); break; }
    }
    const same = state.order.filter(sid => state.slots[sid].defId === defId);
    if (same.length) anchorPos = state.order.indexOf(same[same.length - 1]);
  } else {
    const group = state.order.filter(sid => { const dd = state.slots[sid].defId; return dd === defId || dd.startsWith('opt'); });
    if (group.length) anchorPos = state.order.indexOf(group[group.length - 1]);
  }
  if (anchorPos >= 0) state.order.splice(anchorPos + 1, 0, id);
  else {
    const ids = state.order.filter(x => defOf(state.slots[x]).sec === d.sec);
    const last = ids[ids.length - 1];
    state.order.splice(last ? state.order.indexOf(last) + 1 : state.order.length, 0, id);
  }
  if (defId === 'netcard') { // PCIe card: keep it right below the graphics card
    const gids = state.order.filter(sid => sid !== id && state.slots[sid].defId === 'gpu');
    if (gids.length) {
      state.order = state.order.filter(sid => sid !== id);
      state.order.splice(state.order.indexOf(gids[gids.length - 1]) + 1, 0, id);
    }
  }
  persist(); refresh(); openPicker(id);
}
function removeSlot(slotId) {
  if (!state.slots[slotId] || !slotId.includes('_')) return;
  if (!confirm(lang === 'en' ? 'Remove this component?' : 'Supprimer ce composant ?')) return;
  delete state.slots[slotId];
  state.order = state.order.filter(x => x !== slotId);
  openAlts.delete(slotId);
  if (activeSlot === slotId) { activeSlot = null; $('#pickerPanel').classList.add('hidden'); $('#summaryPanel').classList.remove('hidden'); }
  persist(); refresh();
}

/* ---------- Picker ---------- */
function idealoSearchUrl(q) { return 'https://www.idealo.fr/prechcat.html?q=' + encodeURIComponent(q || ''); }
/* Real categories from https://www.idealo.fr/scat/1342/informatique.html (+ Composants PC) */
const IDEALO_CATS = [
  { key: 'root', label: 'Informatique', url: 'https://www.idealo.fr/scat/1342/informatique.html' },
  { key: 'cpu', label: 'Processeurs', url: 'https://www.idealo.fr/cat/3019/processeurs.html' },
  { key: 'mb', label: 'Cartes mères', url: 'https://www.idealo.fr/cat/3018/cartes-meres.html' },
  { key: 'ram', label: 'Barrettes RAM', url: 'https://www.idealo.fr/cat/4552/barrettes-de-ram.html' },
  { key: 'cooler', label: 'Refroidissement', url: 'https://www.idealo.fr/scat/3206/refroidisseurs-ventilateurs.html' },
  { key: 'ssd', label: 'SSD', url: 'https://www.idealo.fr/cat/14613/ssd.html' },
  { key: 'gpu', label: 'Cartes graphiques', url: 'https://www.idealo.fr/cat/16073/cartes-graphiques.html' },
  { key: 'case', label: 'Boîtiers PC', url: 'https://www.idealo.fr/cat/3090/boitiers-pc.html' },
  { key: 'psu', label: 'Alimentations', url: 'https://www.idealo.fr/cat/5432/alimentation-pc.html' },
  { key: 'os', label: "Systèmes d'exploitation", url: 'https://www.idealo.fr/cat/10052/systemes-d-exploitation.html' },
  { key: 'desk', label: 'Bureaux', url: 'https://www.idealo.fr/cat/14953/bureaux.html' },
  { key: 'chair', label: 'Fauteuils gamer', url: 'https://www.idealo.fr/cat/26049/fauteuils-gamer.html' },
  { key: 'screen', label: 'Écrans', url: 'https://www.idealo.fr/cat/3832/moniteurs.html' },
  { key: 'keyboard', label: 'Claviers', url: 'https://www.idealo.fr/cat/3047/claviers-ordinateur.html' },
  { key: 'mouse', label: 'Souris', url: 'https://www.idealo.fr/cat/3046/souris-pc.html' },
  { key: 'pad', label: 'Tapis de souris', url: 'https://www.idealo.fr/cat/10472/tapis-de-souris.html' },
  { key: 'headset', label: 'Casques gamer', url: 'https://www.idealo.fr/cat/5172/casques-gamer.html' },
  { key: 'thermal', label: 'Pâte thermique', url: 'https://www.idealo.fr/liste/122968612/pate-thermique-cpu.html' },
  { key: 'hdd', label: 'Disques durs', url: 'https://www.idealo.fr/cat/3011/disques-durs.html' },
  { key: 'fans', label: 'Ventilateurs PC', url: 'https://www.idealo.fr/cat/5155/ventilateurs-pour-pc.html' },
  { key: 'psucables', label: "Câbles d'alimentation", url: 'https://www.idealo.fr/cat/5694F3384068/cables-adaptateurs-pc.html' },
  { key: 'soft', label: 'Logiciels', url: 'https://www.idealo.fr/scat/3330/logiciels.html' },
  { key: 'ups', label: 'Onduleurs', url: 'https://www.idealo.fr/cat/3107/onduleurs.html' },
  { key: 'switch', label: 'Switches', url: 'https://www.idealo.fr/cat/3104/switches.html' },
  { key: 'router', label: 'Routeurs', url: 'https://www.idealo.fr/cat/3099/routeurs.html' },
  { key: 'gamepad', label: 'Manettes', url: 'https://www.idealo.fr/cat/3014/manettes-de-jeux.html' },
  { key: 'nas', label: 'Serveurs NAS', url: 'https://www.idealo.fr/cat/9272/serveurs-nas.html' },
  { key: 'graphictab', label: 'Tablettes graphiques', url: 'https://www.idealo.fr/prechcat.html?q=tablette%20graphique' },
  { key: 'usbstick', label: 'Clés USB', url: 'https://www.idealo.fr/cat/4312/cles-usb.html' },
  { key: 'memcard', label: 'Cartes mémoire', url: 'https://www.idealo.fr/cat/4734/cartes-memoire.html' },
  { key: 'dock', label: "Stations d'accueil", url: 'https://www.idealo.fr/cat/10792/stations-d-accueil-pour-ordinateurs-portables.html' },
  { key: 'printer', label: 'Imprimantes', url: 'https://www.idealo.fr/cat/3309/imprimantes-multifonctions.html' },
  { key: 'extstorage', label: 'Stockage externe', url: 'https://www.idealo.fr/cat/7712/disques-durs-externes.html' },
  { key: 'speakers', label: 'Enceintes PC', url: 'https://www.idealo.fr/cat/3287/haut-parleurs-pc.html' },
  { key: 'webcam', label: 'Webcams', url: 'https://www.idealo.fr/cat/16313/webcams.html' },
  { key: 'soundcard', label: 'Cartes son', url: 'https://www.idealo.fr/cat/3092/cartes-son.html' },
  { key: 'netcard', label: 'Cartes réseau', url: 'https://www.idealo.fr/cat/3089/cartes-reseau.html' },
  { key: 'capture', label: 'Acquisition vidéo', url: 'https://www.idealo.fr/cat/3208/acquisition-video.html' },
  { key: 'monitorarm', label: 'Supports écran', url: 'https://www.idealo.fr/cat/18457/supports-pour-moniteur.html' },
];
const SLOT_CAT = { cpu: 'cpu', mb: 'mb', ram: 'ram', cooler: 'cooler', ssd1: 'ssd', gpu: 'gpu', case: 'case', psu: 'psu', os: 'os', desk: 'desk', chair: 'chair', screen1: 'screen', keyboard: 'keyboard', mouse: 'mouse', pad: 'pad', headset: 'headset', gamepad: 'gamepad', thermal: 'thermal', hdd: 'hdd', fans: 'fans', psucables: 'psucables', netcard: 'netcard', soft: 'soft', ups: 'ups', switch: 'switch', router: 'router', nas: 'nas', graphictab: 'graphictab', usbstick: 'usbstick', memcard: 'memcard', hub: 'usbstick', dock: 'dock', printer: 'printer', extstorage: 'extstorage', speakers: 'speakers', webcam: 'webcam', soundcard: 'soundcard', capture: 'capture', monitorarm: 'monitorarm' };
let currentCatKey = 'root', currentCatLabel = 'Informatique', currentIdealoUrl = IDEALO_CATS[0].url;
let idealBase = '', idealUrl = '', idealPool = [], idealFetched = {}, idealShown = 12, idealNextUrl = null, idealSort = 'rel', idealQ = '', idealBusy = false, idealCached = false, idealErr = '', idealToken = 0, idealLoadingMore = false;
function slotCatKey(slotId) {
  if (slotId.startsWith('ssd_')) return 'ssd';
  if (slotId.startsWith('screen_')) return 'screen';
  if (slotId.startsWith('pcx_') || slotId.startsWith('opt_')) return 'root';
  const s = state.slots[slotId];
  return (s && SLOT_CAT[s.defId]) || 'root';
}
function loadCategory(key) {
  const c = IDEALO_CATS.find(x => x.key === key) || IDEALO_CATS[0];
  currentCatKey = c.key;
  currentCatLabel = c.label;
  currentIdealoUrl = c.url;
  const a = $('#pickerIdealoSearch'); if (a) a.href = c.url;
  const f = $('#idealoOpenFallback'); if (f) f.onclick = () => window.open(c.url, '_blank', 'noopener');
}
const IDEAL_PAGE = 12;
function idealKey(it) { return (it.url || it.img || ((it.name || '') + '|' + (it.price || 0))) + ''; }
async function loadIdealoList(url, mode = 'fresh') {
  // mode: 'fresh' (new base url) | 'more' (show more / fetch next sort variant)
  const my = ++idealToken;
  if (mode === 'fresh') {
    idealBase = url; idealUrl = url;
    idealPool = []; idealFetched = {}; idealShown = IDEAL_PAGE; idealErr = ''; idealCached = false;
    try { // remember last listing per category: extra slots reopen the same page as the base slot
      if (url && currentCatKey) {
        const all = load(LS.prefs, {});
        save(LS.prefs, { ...all, idealLastByCat: { ...(all.idealLastByCat || {}), [currentCatKey]: url } });
      }
    } catch { /* ignore */ }
  }
  idealBusy = true;
  idealLoadingMore = (mode !== 'fresh'); // trailing skeletons + greyed button until new content arrives
  renderIdealo();
  if (idealLoadingMore) await new Promise(r => setTimeout(r, 30)); // let the skeleton paint (cached fetches resolve within one frame)
  const need = mode === 'fresh' || mode === 'variant' ? [idealSort] : nextVariant();
  if (mode === 'more' && !need.length && idealNextUrl && !idealFetched['next:' + idealNextUrl]) {
    const r2 = await Idealo.list(idealNextUrl);
    if (my !== idealToken) return;
    idealBusy = false;
    if (r2.error) { idealErr = r2.error; }
    else {
      r2.items.forEach(it => { const k = idealKey(it); if (k && !idealPool.some(x => idealKey(x) === k)) idealPool.push(it); });
      idealFetched['next:' + idealNextUrl] = true;
      idealNextUrl = r2.next || null;
      if (r2.cached) idealCached = true;
    }
    renderIdealo();
    idealLoadingMore = false;
    return;
  }
  for (const v of need) {
    const u = v === 'rel' ? idealBase : Idealo.sortUrl(idealBase, v);
    const r = await Idealo.list(u);
    if (my !== idealToken) return; // stale
    if (r.error) { idealErr = r.error; }
    else {
      r.items.forEach(it => { const k = idealKey(it); if (k && !idealPool.some(x => idealKey(x) === k)) idealPool.push(it); });
      idealFetched[v] = true;
      if (r.cached) idealCached = true;
      if (r.next && !idealNextUrl) idealNextUrl = r.next;
    }
  }
  idealBusy = false;
  idealLoadingMore = false;
  renderIdealo();
}
function nextVariant() {
  for (const v of ['rel', 'asc', 'desc']) if (!idealFetched[v]) return [v];
  return [];
}
function idealMore() {
  const q = idealQ.trim().toLowerCase();
  const len = idealPool.filter(it => !q || (it.name + ' ' + it.specs).toLowerCase().includes(q)).length;
  if (idealShown < len) { idealShown += IDEAL_PAGE; renderIdealo(); }
  else if (!idealLoadingMore) loadIdealoList(null, 'more'); // ignore while a fetch is in flight
}
function renderIdealo() {
  const host = $('#idealoList'); if (!host) return;
  const st = $('#idealoStatus');
  const q = idealQ.trim().toLowerCase();
  let items = idealPool.filter(it => !q || (it.name + ' ' + it.specs).toLowerCase().includes(q));
  if (idealSort === 'asc') items = [...items].sort((a, b) => (a.price || 1e12) - (b.price || 1e12));
  if (idealSort === 'desc') items = [...items].sort((a, b) => (b.price || 0) - (a.price || 0));
  const shown = items.slice(0, idealShown);
  const moreLeft = items.length - shown.length;
  host.innerHTML = '';
  if (idealBusy && !items.length) {
    host.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
    if (st) st.textContent = t('picker.loading');
  } else if (idealErr && !items.length) {
    host.innerHTML = `<p class="hint">${esc(t('picker.err'))}<br><code class="k">${esc(idealErr)}</code></p>`;
    if (st) st.textContent = '';
  } else if (!items.length) {
    host.innerHTML = `<p class="hint">${lang === 'en' ? 'No results.' : 'Aucun résultat.'}</p>`;
    if (st) st.textContent = '';
  } else {
    if (st) st.textContent = idealLoadingMore ? t('picker.loading') : `${currentCatLabel} · ${shown.length}/${items.length} ${lang === 'en' ? 'results' : 'résultats'}${idealCached ? ' · ' + t('picker.cached') : ''}`;
    if (idealLoadingMore) host.insertAdjacentHTML('beforeend', '<div class="skel"></div><div class="skel"></div>');
  }
  const rw = $('#idealoRetryWrap'); if (rw) rw.style.display = (idealErr && !items.length) ? 'flex' : 'none';
  shown.forEach(it => {
    const card = document.createElement('div');
    card.className = 'pick-card';
    const directTip = lang === 'en' ? 'No dedicated Idealo page — links directly to the merchant offer' : "Pas de page Idealo dédiée — redirige directement vers l'offre marchand";
    const noPage = !it.url;
    card.innerHTML = `${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" onerror="this.remove()">` : `<img src="./assets/icons/configmakericon.png" alt="">`}
      <div class="pi"><div class="pn">${esc(it.name)}${noPage ? ` <i class="fa-solid fa-store direct-badge" title="${directTip}"></i>` : ''}</div><div class="ps">${esc(it.specs)}</div>
      <div class="ps">${it.offers ? `${it.offers} ${t('picker.offers')} · ` : ''}${it.price ? `${t('picker.from')} ${eur(it.price)}` : ''}</div></div>
      <div><div class="pp">${it.price ? eur(it.price) : '—'}</div></div>`;
    const choose = document.createElement('button');
    choose.className = 'mini-btn'; choose.innerHTML = `<i class="fa-solid fa-check"></i> ${t('picker.chooseBtn')}`;
    choose.onclick = () => chooseIdealoItem(it);
    const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '6px';
    wrap.append(choose);
    if (noPage && it.src) {
      const show = document.createElement('button');
      show.className = 'mini-btn'; show.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> ${lang === 'en' ? "Show offer" : "Voir l'offre"}`;
      show.title = 'issue is known, i am trying to fix it :)';
      show.disabled = true;
      wrap.append(show);
    } else if (it.url) {
      const link = document.createElement('a');
      link.className = 'mini-btn'; link.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> Idealo`;
      link.title = 'idealo.fr'; link.target = '_blank'; link.rel = 'noopener'; link.href = it.url;
      wrap.append(link);
    }
    card.appendChild(wrap);
    host.appendChild(card);
  });
  const more = $('#idealoMore');
  if (more) {
    const canMore = moreLeft > 0 || (nextVariant().length > 0 && !idealBusy);
    more.classList.toggle('hidden', !canMore && !idealLoadingMore); // stay visible while loading
    more.disabled = idealLoadingMore; // greyed out + unclickable until new content arrives
    const lbl = more.querySelector('span');
    const ico = more.querySelector('i');
    if (idealLoadingMore) {
      if (lbl) lbl.textContent = lang === 'en' ? 'Loading more items…' : 'Chargement de plus d’éléments…';
      if (ico) ico.className = 'fa-solid fa-circle-notch fa-spin';
    } else {
      if (lbl) lbl.textContent = moreLeft > 0 ? `${t('picker.more')} (+${Math.min(moreLeft, IDEAL_PAGE)})` : t('picker.more');
      if (ico) ico.className = 'fa-solid fa-plus';
    }
  }
}
function chooseIdealoItem(it, opts = {}) {
  if (!activeSlot) return;
  const enrichSlot = activeSlot; // captured: activeSlot may change before fetches settle
  const np = blankProduct();
  np.name = it.name; np.image = it.img; np.idealo = it.url;
  np.price = it.price || 0; np.specs = it.specs; np.vendor = it.vendor || '';
  np.delivery = it.delivery || 0;
  np.src = it.src || '';
  openProductForm(activeSlot, np, pickerMode === 'add' ? { addOnly: true } : {});
  // Enrich in background from the /prix/ page: "Aperçu du produit" + cheapest merchant.
  // Only untouched fields are filled; user input always wins.
  if (!it.url) return;
  const before = { name: np.name, image: np.image, price: String(np.price || ''), specs: np.specs, vendor: np.vendor, store: np.store, delivery: String(np.delivery || '') };
  const syncEnrich = () => {
    if ($('#modalOverlay').classList.contains('hidden')) { persist(); refresh(); return; }
    const fn = $('#f_name');
    if (!fn || fn.value !== before.name) return; // form closed or switched to another fiche
    let changed = false;
    const setIf = (id, key, val) => {
      const f = $(id);
      const v = val === undefined || val === null ? '' : String(val);
      if (!f || !v || f.value !== before[key] || v === before[key]) return;
      f.value = v; before[key] = v; changed = true;
    };
    setIf('#f_specs', 'specs', np.specs);
    setIf('#f_price', 'price', np.price ? String(np.price) : '');
    setIf('#f_image', 'image', np.image);
    setIf('#f_vendor', 'vendor', np.vendor);
    setIf('#f_store', 'store', np.store);
    setIf('#f_del', 'delivery', np.delivery ? String(np.delivery) : '');
    if (changed) toast(lang === 'en' ? 'Fiche enriched from Idealo' : 'Fiche enrichie depuis Idealo');
  };
  dsFetchStart(np); idealoAttempted.add(np.id);
  const enrichments = [];
  enrichments.push(Idealo.product(it.url).then(d => {
    dsFetchEnd(np);
    if (!d || d.error) return;
    if (d.specs) np.specs = d.specs;
    if (d.datasheet) np.datasheet = d.datasheet;
    if (d.variants && d.variants.items && d.variants.items.length) np.variants = d.variants;
    if (d.price && !np.price) np.price = d.price;
    if (d.img && !np.image) np.image = d.img;
    if (d.name && !before.name) np.name = d.name;
    syncEnrich();
  }).catch(() => dsFetchEnd(np)));
  enrichments.push(Idealo.offers(it.url).then(r => {
    if (!r || r.error || !r.offers.length) {
      if (!$('#modalOverlay').classList.contains('hidden')) {
        const fn = $('#f_name');
        if (fn && fn.value === before.name) toast(lang === 'en' ? 'Auto merchant unavailable — use the store button' : 'Marchand auto indisponible — utilisez le bouton boutique');
      }
      return;
    }
    const o = r.offers[0]; // parser sorts ascending: cheapest first
    if (!o) return;
    if (o.merchant && !np.vendor) np.vendor = o.merchant;
    if (o.price) np.price = o.price;
    if (o.delivered > 0 && o.price) np.delivery = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
    if (o.url && !np.store) np.store = o.url;
    if (o.promo) np.promo = true;
    np.isBest = o.price <= (it.price || o.price);
    syncEnrich();
    queueAlternativeData(enrichSlot);
  }));
  Promise.allSettled(enrichments).then(() => { try { if (opts.onDone) opts.onDone(); } catch { /* ignore */ } });
}
let pickerMode = 'replace'; // 'replace' (component click) or 'add' (add-alternative button)
function openPicker(id, mode = 'replace') {
  pickerMode = mode;
  activeSlot = id;
  const s = state.slots[id], cur = sel(s), d = defOf(s);
  const baseLabel = (SLOT_NAMES[lang] && SLOT_NAMES[lang][s.defId]) || SLOT_NAMES.fr[s.defId] || s.defId;
  $('#idealoQuery').value = (cur && cur.name) || `${baseLabel} ${d.q || ''}`.trim();
  $('#idealoFilter').value = ''; idealQ = ''; idealSort = 'rel'; $('#idealoSort').value = 'rel';
  const key = slotCatKey(id);
  const remembered = id.includes('_') ? ((load(LS.prefs, {}).idealLastByCat || {})[key] || null) : null;
  const url = remembered || (IDEALO_CATS.find(x => x.key === key) || IDEALO_CATS[0]).url;
  loadCategory(key);
  if (remembered) { // same Idealo page as the base slot (e.g. internal SSDs, not portable ones)
    currentIdealoUrl = remembered;
    const a = $('#pickerIdealoSearch'); if (a) a.href = remembered;
    const f = $('#idealoOpenFallback'); if (f) f.onclick = () => window.open(remembered, '_blank', 'noopener');
    const mq = remembered.match(/prechcat\.html\?q=([^&]*)/);
    if (mq) { try { $('#idealoQuery').value = decodeURIComponent(mq[1]); } catch { /* ignore */ } }
  }
  $('#pickerPanel').classList.remove('hidden');
  $('#summaryPanel').classList.add('hidden');
  renderSlots(); renderPicker();
  const chip = $('#pickerModeChip');
  if (chip) {
    chip.classList.toggle('hidden', pickerMode !== 'add');
    if (pickerMode === 'add') $('#pickerModeTxt').textContent = t('picker.addMode');
  }
  loadIdealoList(url);
  if (window.innerWidth < 960) $('#pickerPanel').scrollIntoView({ behavior: 'smooth' });
}
function closePicker() { activeSlot = null; $('#pickerPanel').classList.add('hidden'); $('#summaryPanel').classList.remove('hidden'); renderSlots(); }
function renderPicker() {
  const s = state.slots[activeSlot]; if (!s) return;
  $('#pickerTitle').textContent = slotName(activeSlot);
  $('#pickerIdealoSearch').href = currentIdealoUrl;
}

/* ---------- Product form ---------- */
function openProductForm(slotId, p, opts = {}) {
  const isNew = !p;
  p = p || blankProduct();
  editingPid = p.id;
  const prevSelected = state.slots[slotId].selectedId;
  const alreadyListed = !!state.slots[slotId].products.some(x => x.id === p.id);
  const d = defOf(state.slots[slotId]);
  openModal(isNew ? (lang === 'en' ? 'New fiche — ' : 'Nouvelle fiche — ') + slotName(slotId) : (lang === 'en' ? 'Edit fiche' : 'Modifier la fiche'), `
    <div class="form-grid">
      <div class="fld full"><label>${lang === 'en' ? 'Name *' : 'Nom *'}</label><input id="f_name" value="${esc(p.name)}" placeholder="Ryzen 7 7800X3D"></div>
      <div class="fld"><label>${lang === 'en' ? 'Image URL' : 'Image (URL)'}</label><input id="f_image" value="${esc(p.image)}" placeholder="https://…"></div>
      <div class="fld"><label>${lang === 'en' ? 'Vendor' : 'Vendeur'}</label><input id="f_vendor" value="${esc(p.vendor)}" placeholder="Amazon, LDLC…"></div>
      <div class="fld"><label>${lang === 'en' ? 'Price (€) *' : 'Prix (€) *'}</label><input id="f_price" type="number" min="0" step="0.01" value="${p.price || ''}"></div>
      <div class="fld"><label>${lang === 'en' ? 'Old price (€, discount)' : 'Ancien prix (€, remise)'}</label><input id="f_old" type="number" min="0" step="0.01" value="${p.oldPrice || ''}"></div>
      <div class="fld"><label>${lang === 'en' ? 'Delivery (€)' : 'Livraison (€)'}</label><input id="f_del" type="number" min="0" step="0.01" value="${p.delivery || ''}"></div>
      <div class="fld"><label>${lang === 'en' ? 'Qty' : 'Quantité'}</label><input id="f_qty" type="number" min="1" step="1" value="${p.qty || 1}"></div>
      <div class="fld"><label>${lang === 'en' ? 'Power (W, PC parts)' : 'Puissance (W, pièces PC)'}</label><input id="f_w" type="number" min="0" step="1" value="${p.watts ?? d.w ?? 0}"></div>
      <div class="fld"><label>${lang === 'en' ? 'PSU/UPS capacity (W, 0=auto)' : 'Puissance alim/onduleur (W, 0=auto)'}</label><input id="f_capW" type="number" min="0" step="1" value="${p.capW || ''}" placeholder="750"><div class="hint" id="f_capHint"></div></div>
      <div class="fld full"><label>${lang === 'en' ? 'Quick specs (one per line — paste from Idealo top)' : 'Specs rapides (une par ligne — copiées du haut de la fiche Idealo)'}</label><textarea id="f_specs" rows="3" placeholder="8 cœurs / 16 threads&#10;5,0 GHz boost, AM5">${esc(p.specs)}</textarea></div>
      <div class="fld full"><label>URL Idealo</label><input id="f_idealo" value="${esc(p.idealo)}" placeholder="https://www.idealo.fr/…"></div>
      <div class="fld full"><label>${lang === 'en' ? 'Manual URL' : 'URL du manuel'}</label><input id="f_manual" value="${esc(p.manual)}" placeholder="https://…pdf"></div>
      <div class="fld full"><label>${lang === 'en' ? 'Store URL (offer link)' : 'URL boutique (lien de l’offre)'}</label><input id="f_store" value="${esc(p.store)}" placeholder="https://…"></div>
    </div>
    <div class="btn-row"><button class="btn btn-primary" id="f_save"><i class="fa-solid fa-check"></i> ${lang === 'en' ? 'Save fiche' : 'Enregistrer'}</button>
    ${!isNew ? `<button class="btn" id="f_delP" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>` : ''}</div>`);
  if (opts.focus === 'manual') setTimeout(() => $('#f_manual').focus(), 50);
  if (opts.focus === 'store') setTimeout(() => $('#f_store').focus(), 50);
  if (opts.focus === 'idealo') setTimeout(() => $('#f_idealo').focus(), 50);
  try {
    const hint = $('#f_capHint');
    if (hint && typeof Compat !== 'undefined') {
      const parsed = Compat.parse(state.slots[slotId].defId, p.name, p.specs || '');
      if (parsed.capW) hint.textContent = (lang === 'en' ? 'Detected: ' : 'Détecté : ') + parsed.capW + ' W';
    }
  } catch { /* ignore */ }
  $('#f_save').onclick = () => {
    const v = id => $(id).value.trim();
    p.name = v('#f_name'); if (!p.name) { toast(lang === 'en' ? 'Name required' : 'Nom requis'); return; }
    p.image = v('#f_image'); p.vendor = v('#f_vendor');
    p.price = parseFloat(v('#f_price')) || 0; p.oldPrice = parseFloat(v('#f_old')) || 0;
    p.delivery = parseFloat(v('#f_del')) || 0; p.qty = parseInt(v('#f_qty')) || 1;
    p.watts = parseFloat(v('#f_w')) || 0; p.specs = $('#f_specs').value.trim();
    p.capW = parseFloat(v('#f_capW')) || 0;
    p.idealo = v('#f_idealo'); p.manual = v('#f_manual'); p.store = v('#f_store');
    const s = state.slots[slotId];
    if (!s.products.find(x => x.id === p.id)) s.products.push(p);
    if (!opts.addOnly || !s.selectedId) s.selectedId = p.id;
    if (!alreadyListed && !opts.addOnly && prevSelected && prevSelected !== p.id) {
      s.products = s.products.filter(x => x.id !== prevSelected); // replace mode: drop the previous fiche
    }
    persist(); closeModal(); refresh(); renderPicker();
    toast(lang === 'en' ? (opts.addOnly ? 'Alternative added' : 'Fiche saved') : (opts.addOnly ? 'Alternative ajoutée' : 'Fiche enregistrée'));
  };
  const dp = $('#f_delP');
  if (dp) dp.onclick = () => { const s = state.slots[slotId]; s.products = s.products.filter(x => x.id !== p.id); if (s.selectedId === p.id) s.selectedId = s.products[0]?.id || null; persist(); closeModal(); refresh(); renderPicker(); };
}

/* ---------- Merchants (from the Idealo /prix/ page, like picking the component) ---------- */
async function openMerchants(slotId) {
  const s = state.slots[slotId], p = sel(s); if (!p) return;
  if (!p.idealo || !/idealo\.fr\/prix\//i.test(p.idealo)) {
    toast(lang === 'en' ? 'Add an Idealo /prix/ link to the fiche first' : "Ajoutez d'abord un lien Idealo /prix/ à la fiche");
    openProductForm(slotId, p, { focus: 'idealo' });
    return;
  }
  openModal((lang === 'en' ? 'Merchants — ' : 'Marchands — ') + p.name, `<p class="hint">${t('picker.loading')}</p>`);
  if (p.best || p.isBest) { p.best = null; p.isBest = false; persist(); refresh(); }
  const r = await Idealo.offers(p.idealo);
  if (r.error || !r.offers.length) {
    openModal((lang === 'en' ? 'Merchants — ' : 'Marchands — ') + p.name, `
      <p class="hint">${esc(lang === 'en' ? 'Could not load merchant offers (rate limit or block).' : 'Offres marchandes non chargeables (limite ou blocage).')}</p>
      <div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(p.idealo)}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Idealo</a>
      <button class="btn btn-sm" id="m_manual"><i class="fa-solid fa-pen"></i> ${lang === 'en' ? 'Edit manually' : 'Modifier manuellement'}</button></div>`);
    $('#m_manual').onclick = () => openProductForm(slotId, p, { focus: 'store' });
    return;
  }
  openModal((lang === 'en' ? 'Merchants — ' : 'Marchands — ') + p.name, `
    ${r.cached ? `<p class="hint">· ${t('picker.cached')}</p>` : ''}
    <div id="m_list">${(() => {
    const ship = o => Math.max(0, ((o.delivered > 0 ? o.delivered : o.price) - o.price));
    const bestTotal = Math.min(...r.offers.map(o => o.price + ship(o)));
    return r.offers.map((o, i) => {
    const tot = o.price + ship(o);
    return `
      <div class="list-row merchant-row" data-i="${i}"><span class="grow"><strong>${tot === bestTotal ? `<span class="better-badge" title="${lang === 'en' ? 'Best total price' : 'Meilleur prix total'}">€</span> ` : ''}${o.promo ? `<span class="promo-badge" title="${lang === 'en' ? 'Idealo deal' : 'Bon plan Idealo'}">%</span> ` : ''}${esc(o.merchant || (lang === 'en' ? 'Merchant' : 'Marchand'))}</strong>${o.rating ? ` <small style="color:var(--muted)">★ ${esc(o.rating)}</small>` : ''}<br>
      <small style="color:var(--muted)">${esc(o.title).slice(0, 80)}${o.delivery ? ' · ' + esc(o.delivery).slice(0, 60) : ''}</small></span>
      <span style="text-align:right"><strong>${eur(o.price)}</strong>${o.delivered ? `<br><small style="color:var(--muted)">${eur(o.delivered)} ${lang === 'en' ? 'incl. delivery' : 'livr. incl.'}</small>` : ''}</span></div>`; }).join('')})()}</div>
    <div class="btn-row"><button class="btn btn-sm" id="m_manual"><i class="fa-solid fa-pen"></i> ${lang === 'en' ? 'Edit manually' : 'Modifier manuellement'}</button></div>`);
  $$('#modalBody .merchant-row').forEach(row => row.onclick = () => {
    const o = r.offers[Number(row.dataset.i)];
    p.vendor = o.merchant || p.vendor;
    p.price = o.price || p.price;
    if (o.delivered > 0) p.delivery = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
    p.store = o.url || p.store;
    p.promo = !!o.promo;
    const ship = x => Math.max(0, ((x.delivered > 0 ? x.delivered : x.price) - x.price));
    const minTotal = Math.min(...r.offers.filter(x => x.price).map(x => x.price + ship(x)));
    p.isBest = (o.price + ship(o)) <= minTotal + 1e-9;
    persist(); closeModal(); refresh();
    toast(lang === 'en' ? 'Merchant selected' : 'Marchand sélectionné');
  });
  $('#m_manual').onclick = () => openProductForm(slotId, p, { focus: 'store' });
}

/* ---------- PCIe Simulator (prefilled share URL) ---------- */
function openPcieSim() {
  let r = null;
  try { r = (typeof PCIe !== 'undefined') ? PCIe.open() : null; } catch { r = null; }
  if (!r) { window.open('https://pcie-simulator.vercel.app/', '_blank', 'noopener'); return; }
  const m = [];
  if (r.matched && r.matched.mb) m.push('CM ✓');
  if (r.matched && r.matched.cpu) m.push('CPU ✓');
  if (r.matched && r.matched.gpu) m.push('GPU ✓');
  if (r.matched && r.matched.ssds) m.push(`SSD ×${r.matched.ssds}`);
  if (r.matched && r.matched.captures) m.push(`Capture ×${r.matched.captures}`);
  if (r.matched && r.matched.sounds) m.push(`Son ×${r.matched.sounds}`);
  if (r.matched && r.matched.nics) m.push(`NIC ×${r.matched.nics}`);
  if (r.fallback) {
    try {
      const txt = ['ConfigMaker', state.name, 'MB: ' + ((state.slots.mb && sel(state.slots.mb) || {}).name || '—'), 'CPU: ' + ((state.slots.cpu && sel(state.slots.cpu) || {}).name || '—')].join(' · ');
      if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {});
    } catch { /* ignore */ }
    toast(lang === 'en' ? 'Board not found — pick it in the simulator (config copied)' : 'Carte non trouvée — choisissez-la dans le simulateur (config copiée)');
  } else if (r.missing && r.missing.length) {
    toast((lang === 'en' ? 'Sent to simulator' : 'Envoyé au simulateur') + ` (${m.join(' ')}) — ${lang === 'en' ? 'missing' : 'manquant'} : ${r.missing.join(', ')}`);
  } else {
    toast((lang === 'en' ? 'Sent to simulator' : 'Envoyé au simulateur') + ` (${m.join(' ')})`);
  }
}

/* ---------- Delivery ---------- */
const CARRIERS = ['Chronopost', 'Colissimo', 'DHL', 'UPS', 'FedEx', 'Mondial Relay', 'Relais Colis', 'Amazon Logistics', 'Autre'];
const STATUSES = ['', 'ordered', 'preparing', 'shipped', 'transit', 'out', 'delivered', 'issue'];
function statusLabel(s) { return { ordered: lang === 'en' ? 'Ordered' : 'Commandé', preparing: lang === 'en' ? 'Preparing' : 'En préparation', shipped: lang === 'en' ? 'Shipped' : 'Expédié', transit: lang === 'en' ? 'In transit' : 'En transit', out: lang === 'en' ? 'Out for delivery' : 'En livraison', delivered: lang === 'en' ? 'Delivered' : 'Livré', issue: lang === 'en' ? 'Issue' : 'Problème' }[s] || (lang === 'en' ? 'No tracking' : 'Pas de suivi'); }
function openDelivery(slotId) {
  const s = state.slots[slotId], p = sel(s); if (!p) return;
  openModal((lang === 'en' ? 'Delivery tracker — ' : 'Suivi colis — ') + p.name, `
    <div class="form-grid">
      <div class="fld"><label>${lang === 'en' ? 'Carrier' : 'Transporteur'}</label><select id="d_car">${CARRIERS.map(c => `<option ${p.carrier === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="fld"><label>${lang === 'en' ? 'Tracking number' : 'N° de suivi'}</label><input id="d_tr" value="${esc(p.tracking || '')}"></div>
      <div class="fld full"><label>Status</label><select id="d_st">${STATUSES.map(x => `<option value="${x}" ${p.tstatus === x ? 'selected' : ''}>${x ? statusLabel(x) : '—'}</option>`).join('')}</select></div>
    </div>
    <div class="btn-row"><button class="btn btn-primary" id="d_save"><i class="fa-solid fa-check"></i> OK</button>
    ${p.tracking ? `<a class="btn" target="_blank" rel="noopener" href="https://t.17track.net/#nums=${encodeURIComponent(p.tracking)}"><i class="fa-solid fa-truck-fast"></i> 17track</a>` : ''}</div>`);
  $('#d_save').onclick = () => { p.carrier = $('#d_car').value; p.tracking = $('#d_tr').value.trim(); p.tstatus = $('#d_st').value; persist(); closeModal(); refresh(); };
}

/* ---------- Summary ---------- */
function switchSum(which) {
  sumTab = which;
  ['Desc', 'Charts', 'Power', 'Compat'].forEach(x => $('#sum' + x).classList.toggle('active', x.toLowerCase() === which));
  $('#sumDescPane').classList.toggle('hidden', which !== 'desc');
  $('#sumChartsPane').classList.toggle('hidden', which !== 'charts');
  $('#sumPowerPane').classList.toggle('hidden', which !== 'power');
  $('#sumCompatPane').classList.toggle('hidden', which !== 'compat');
  if (which !== 'desc') renderSumExtra();
  if (which === 'compat') renderCompat();
}
function renderSummary() {
  const T = totals();
  const host = $('#sumDescPane'); host.innerHTML = '';
  const secs = [['pc', T.pc], ['setup', T.setup], ['others', T.others]];
  const cc = getCompat(), cnt = compatCountsBySec(cc, state.slots, s => defOf(s).sec);
  let any = false;
  secs.forEach(([sec, sub], si) => {
    const ids = state.order.filter(id => { const s = state.slots[id]; return s && defOf(s).sec === sec && sel(s); });
    if (!ids.length) return;
    any = true;
    const secEl = document.createElement('div');
    secEl.className = 'dsec';
    const icons = { pc: 'fa-solid fa-computer', setup: 'fa-solid fa-display', others: 'fa-solid fa-box-open' };
    const ce = cnt[sec].err, cw = cnt[sec].warn;
    const flags = (ce || cw) ? `<span class="sum-compat-flags">${ce ? `<span class="mini-count err" title="${ce} ${lang === 'en' ? 'issue(s)' : 'problème(s)'}"><i class="fa-solid fa-xmark"></i>${ce}</span>` : ''}${cw ? `<span class="mini-count warn" title="${cw} ${lang === 'en' ? 'warning(s)' : 'avertissement(s)'}"><i class="fa-solid fa-triangle-exclamation"></i>${cw}</span>` : ''}</span>` : '';
    secEl.innerHTML = `<div class="dsec-head" data-sec="${sec}"><i class="${icons[sec]}"></i><span>${esc(secName(sec))}</span>${flags}<span class="dsec-total">${eur(sub)}</span><i class="fa-solid fa-chevron-down foldchev"></i></div><div class="dsec-dots"></div>`;
    if (foldedSecs.has(sec)) secEl.classList.add('collapsed');
    ids.forEach(id => {
      const s = state.slots[id], p = sel(s);
      const row = document.createElement('div');
      const cst = getCompat().statusOf[id];
      row.className = 'ditem' + (cst === 'err' ? ' has-err' : cst === 'warn' ? ' has-warn' : '') + (refreshingPids.has(p.id) ? ' refreshing' : '');
      row.innerHTML = `<span class="di-ico">${iconHtml(defOf(s).icon)}</span><span class="di-txt"><span class="di-type">${esc(slotName(id))}</span><span class="di-name">${esc(p.name)}${(p.qty || 1) > 1 ? ` <small style="color:var(--muted)">×${p.qty}</small>` : ''}</span></span><span class="di-price"><strong>${eur(unitTotal(p))}</strong></span>`;
      row.style.cursor = 'pointer';
      row.title = lang === 'en' ? 'Show in page' : 'Voir dans la page';
      row.onclick = () => focusComponent(id);
      secEl.appendChild(row);
    });
    host.appendChild(secEl);
    secEl.querySelector('.dsec-head').onclick = () => {
      foldedSecs.has(sec) ? foldedSecs.delete(sec) : foldedSecs.add(sec);
      renderSummary();
    };
    secEl.querySelectorAll('.mini-count').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); switchSum('compat'); }));
    const sep = document.createElement('div');
    sep.className = 'dsec-sep';
    host.appendChild(sep);
  });
  if (!any) host.innerHTML = `<p class="hint">${lang === 'en' ? 'Nothing selected yet — click a component on the left.' : 'Rien de sélectionné — cliquez sur un composant à gauche.'}</p>`;
  const div = document.createElement('div');
  div.className = 'sum-totals';
  const mkDiff = (d, excl) => {
    const over = d < 0, abs = eur(Math.abs(d));
    const sign = over ? '-' : '+';
    const sent = over
      ? (lang === 'en' ? `You are ${abs} over your ${eur(state.budget)} budget${excl ? ' (excl. delivery)' : ''}` : `Vous dépassez de ${abs} votre budget de ${eur(state.budget)}${excl ? ' (hors livraison)' : ''}`)
      : (lang === 'en' ? `You are ${abs} under your ${eur(state.budget)} budget${excl ? ' (excl. delivery)' : ''}` : `Il vous reste ${abs} sur ${eur(state.budget)} de budget${excl ? ' (hors livraison)' : ''}`);
    return `<span class="diff-mini ${over ? 'ko' : 'ok'}" title="${esc(sent)}">(${sign}${abs})</span>`;
  };
  const d1 = state.budget - (T.total - T.deliv), d2 = T.diff;
  div.innerHTML = `<div class="sum-line"><span>${lang === 'en' ? 'Total (excl. delivery details)' : 'Total'} </span><span class="tot-right">${mkDiff(d1, true)}<span class="big">${eur(T.total - T.deliv)}</span></span></div>
    <div class="sum-line"><span>${lang === 'en' ? 'Total incl. delivery' : 'Total livraison incluse'}</span><span class="tot-right">${mkDiff(d2, false)}<span class="big">${eur(T.total)}</span></span></div>`;
  host.appendChild(div);
  if (sumTab !== 'desc') renderSumExtra();
  refreshIcons();
}
function focusComponent(id) {
  const card = document.querySelector(`[data-slot="${id}"]`);
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), 1400);
}
function pieSVG(items, size = 150) {
  const total = items.reduce((a, b) => a + b.v, 0) || 1;
  const cols = ['#1a8744', '#2fa968', '#7ed491', '#0ca678', '#94d82d', '#1971c2', '#845ef7', '#e8890c', '#e03131', '#868e96'];
  let a0 = -Math.PI / 2, paths = '';
  items.forEach((it, i) => {
    const a1 = a0 + (it.v / total) * Math.PI * 2;
    const r = size / 2, cx = r, cy = r;
    const col = cols[i % cols.length];
    if (it.v <= 0) { return; }
    if ((a1 - a0) >= Math.PI * 2 - 1e-6) {
      // single slice: explicit full circle (coincident-endpoint arcs are degenerate)
      paths += `<circle data-i="${i}" cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>`;
    } else {
      const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
      const big = (a1 - a0) > Math.PI ? 1 : 0;
      paths += `<path data-i="${i}" d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${big},1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${col}"/>`;
    }
    a0 = a1;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">${paths}<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.22}" fill="var(--surface)"/></svg>`;
}
function renderSumExtra() {
  const T = totals();
  const cols = ['#1a8744', '#2fa968', '#7ed491', '#0ca678', '#94d82d', '#1971c2', '#845ef7', '#e8890c', '#e03131', '#868e96'];
  const secItems = sec => state.order.filter(id => defOf(state.slots[id]).sec === sec).map(id => ({ id, v: slotTotal(state.slots[id]) })).filter(x => x.v > 0);
  const sumIcons = { pc: 'fa-solid fa-computer', setup: 'fa-solid fa-display', others: 'fa-solid fa-box-open' };
  const chartSecs = ['pc', 'setup', 'others'].map(sec => {
    const items = secItems(sec);
    if (!items.length) return '';
    const tot = items.reduce((a, b) => a + b.v, 0);
    const rows = items.map((it, i) => {
      const s = state.slots[it.id], p = sel(s);
      const color = cols[i % cols.length];
      return `<div class="ditem chart-row" data-ci="${i}" data-sid="${it.id}" style="cursor:pointer" title="${lang === 'en' ? 'Show in page' : 'Voir dans la page'}"><i class="dot" style="background:${color}"></i><span class="di-ico">${iconHtml(defOf(s).icon)}</span><span class="di-txt"><span class="di-type">${esc(slotName(it.id))}</span><span class="di-name">${esc(p.name)} (${Math.round(it.v / tot * 100)}%)</span></span><span class="di-price"><strong>${eur(it.v)}</strong></span></div>`;
    }).join('');
    return `<div class="dsec chart-dsec${foldedCharts.has(sec) ? ' collapsed' : ''}" data-sec="${sec}"><div class="dsec-head" data-chead="${sec}"><i class="${sumIcons[sec]}"></i><span>${esc(secName(sec))}</span><span class="dsec-total">${eur(tot)}</span><i class="fa-solid fa-chevron-down foldchev"></i></div><div class="dsec-dots"></div><div class="chart-card"><h3>${esc(secName(sec))} — ${eur(tot)}</h3>${pieSVG(items)}</div><div class="chart-list">${rows}</div></div>`;
  }).join('');
  $('#sumChartsPane').innerHTML = chartSecs || `<p class="hint">${lang === 'en' ? 'Nothing selected yet.' : 'Rien de sélectionné.'}</p>`;
  const budget = Number(state.budget) || 0;
  if (budget > 0 && (T.pc + T.setup + T.others) > 0) {
    const spent = T.pc + T.setup + T.others;
    const rest = Math.round((budget - spent) * 100) / 100;
    const alloc = [{ key: 'pc', label: secName('pc'), v: T.pc }, { key: 'setup', label: secName('setup'), v: T.setup }, { key: 'others', label: secName('others'), v: T.others }];
    const allocItems = alloc.filter(a => a.v > 0);
    const allocTot = allocItems.reduce((a, b) => a + b.v, 0);
    if (rest >= 0) { allocItems.push({ key: 'rest', label: lang === 'en' ? 'Remaining' : 'Reste', v: rest }); }
    const allocAll = rest >= 0 ? allocTot + rest : allocTot;
    const arows = allocItems.map((a, i) => `<div class="ditem chart-row" data-ci="${i}"><i class="dot" style="background:${cols[i % cols.length]}"></i><span class="di-txt"><span class="di-name">${esc(a.label)} (${Math.round(a.v / allocAll * 100)}%)</span></span><span class="di-price"><strong>${eur(a.v)}</strong></span></div>`).join('')
      + (rest < 0 ? `<div class="ditem"><i class="dot" style="background:#e03131"></i><span class="di-txt"><span class="di-name">${lang === 'en' ? 'Over budget' : 'Dépassement'} (${eur(-rest)})</span></span><span class="di-price"><strong style="color:var(--danger)">${eur(spent)} / ${eur(budget)}</strong></span></div>` : '');
    $('#sumChartsPane').insertAdjacentHTML('beforeend', `<div class="dsec chart-dsec"><div class="dsec-head"><i class="fa-solid fa-chart-pie"></i><span>${lang === 'en' ? 'Budget allocation' : 'Allocation budget'}</span><span class="dsec-total">${eur(budget)}</span></div><div class="dsec-dots"></div><div class="chart-card"><h3>${lang === 'en' ? 'Budget allocation' : 'Allocation budget'} — ${eur(budget)}</h3>${pieSVG(allocItems.map(a => ({ v: a.v })))}</div><div class="chart-list">${arows}</div></div>`);
  }
  function wireChartRows(dsec) {
    const paths = [...dsec.querySelectorAll('svg [data-i]')];
    const rows = [...dsec.querySelectorAll('.chart-row[data-ci]')];
    const sidOf = idx => { const r = rows.find(x => x.dataset.ci === idx); return r ? (r.dataset.sid || null) : null; };
    rows.forEach(row => {
      const idx = row.dataset.ci;
      if (row.dataset.sid) { row.style.cursor = 'pointer'; row.onclick = () => focusComponent(row.dataset.sid); }
      row.onmouseenter = () => {
        paths.forEach(p => { p.style.opacity = p.dataset.i === idx ? '1' : '.25'; });
        row.classList.add('hl');
      };
      row.onmouseleave = () => { paths.forEach(p => { p.style.opacity = ''; }); row.classList.remove('hl'); };
    });
    paths.forEach(p => {
      const sid = sidOf(p.dataset.i);
      if (sid) p.style.cursor = 'pointer';
      p.onmouseenter = () => {
        paths.forEach(q => { q.style.opacity = q === p ? '1' : '.25'; });
        rows.forEach(r => r.classList.toggle('hl', r.dataset.ci === p.dataset.i));
      };
      p.onmouseleave = () => { paths.forEach(q => { q.style.opacity = ''; }); rows.forEach(r => r.classList.remove('hl')); };
      p.onclick = () => { if (sid) focusComponent(sid); };
    });
  }
  $('#sumChartsPane').querySelectorAll('.chart-dsec').forEach(dsec => {
    const sec = dsec.dataset.sec;
    const head = dsec.querySelector('[data-chead]');
    if (head && sec) head.onclick = () => {
      foldedCharts.has(sec) ? foldedCharts.delete(sec) : foldedCharts.add(sec);
      renderSumExtra();
    };
    wireChartRows(dsec);
  });
  const watts = state.order.filter(id => defOf(state.slots[id]).sec === 'pc').map(id => { const p = sel(state.slots[id]); const w = p ? (Number(p.watts) || 0) * (Number(p.qty) || 1) : 0; return { id, v: w }; }).filter(x => x.v > 0);
  const tot = watts.reduce((a, b) => a + b.v, 0) || 0;
  let powerHtml = '';
  try {
    if (typeof Compat !== 'undefined' && Compat.powerBreakdown) {
      const pw = Compat.powerBreakdown({ order: state.order, slots: state.slots, sel, def: defOf, totals: totals(), lang });
      const list = pw.items.filter(i => i.w > 0);
      const totP = pw.psuTotal, totU = pw.upsTotal;
      const kwh = totU * pw.hoursDay * 365 / 1000;
      const eurY = kwh * pw.kwhPrice, eurM = eurY / 12;
      const secOf = id => { const s = state.slots[id]; return s ? defOf(s).sec : 'others'; };
      const pwSecs = ['pc', 'setup', 'others'].map(sec => {
        const items = list.filter(i => secOf(i.id) === sec);
        if (!items.length) return '';
        const tot = Math.round(items.reduce((a, b) => a + b.w, 0) * 10) / 10;
        const rows = items.map((it, i) => {
          const s = state.slots[it.id];
          const color = cols[i % cols.length];
          return `<div class="ditem chart-row" data-ci="${i}" data-sid="${it.id}" style="cursor:pointer" title="${(it.parts || []).map(x => `${x.label} : ${x.w}W`).join(' · ') || (lang === 'en' ? 'Show in page' : 'Voir dans la page')}"><i class="dot" style="background:${color}"></i><span class="di-ico">${iconHtml(defOf(s).icon)}</span><span class="di-txt"><span class="di-type">${esc(slotName(it.id))}</span><span class="di-name">${esc(it.name)} (${Math.round(it.w / tot * 100)}%)${it.psu ? '' : ` <small style="color:var(--muted)">(${lang === 'en' ? 'UPS only' : 'onduleur seul.'})</small>`}</span></span><span class="di-price"><strong>${it.w} W</strong></span></div>`;
        }).join('');
        return `<div class="dsec chart-dsec${foldedPower.has(sec) ? ' collapsed' : ''}" data-sec="${sec}"><div class="dsec-head" data-phead="${sec}"><i class="${sumIcons[sec]}"></i><span>${esc(secName(sec))}</span><span class="dsec-total">${tot} W</span><i class="fa-solid fa-chevron-down foldchev"></i></div><div class="dsec-dots"></div><div class="chart-card"><h3>${esc(secName(sec))} — ${tot} W</h3>${pieSVG(items.map(a => ({ v: a.w })))}</div><div class="chart-list">${rows}</div></div>`;
      }).join('');
      let allocHtml = '';
      if (pw.psu.usableW > 0 && totP > 0) {
        const used = ['pc', 'setup', 'others'].map(sec => ({ key: sec, label: secName(sec), v: Math.round(list.filter(i => secOf(i.id) === sec && i.psu).reduce((a, b) => a + b.w, 0) * 10) / 10 })).filter(a => a.v > 0);
        const usedTot = used.reduce((a, b) => a + b.v, 0);
        const rest = Math.round((pw.psu.usableW - usedTot) * 10) / 10;
        const alloTitle = lang === 'en' ? 'PSU headroom' : 'Marge alim';
        if (rest >= 0) {
          const all = [...used, { key: 'rest', label: lang === 'en' ? 'Remaining' : 'Reste', v: rest }];
          const allTot = usedTot + rest;
          allocHtml = `<div class="dsec chart-dsec"><div class="dsec-head"><i class="fa-solid fa-plug-circle-bolt"></i><span>${alloTitle}</span><span class="dsec-total">${pw.psu.usableW} W</span></div><div class="dsec-dots"></div><div class="chart-card"><h3>${alloTitle} — ${pw.psu.usableW} W</h3>${pieSVG(all.map(a => ({ v: a.v })))}</div><div class="chart-list">${all.map((a, i) => `<div class="ditem chart-row" data-ci="${i}"><i class="dot" style="background:${cols[i % cols.length]}"></i><span class="di-txt"><span class="di-name">${esc(a.label)} (${Math.round(a.v / allTot * 100)}%)</span></span><span class="di-price"><strong>${a.v} W</strong></span></div>`).join('')}</div></div>`;
        } else {
          allocHtml = `<div class="dsec chart-dsec"><div class="dsec-head"><i class="fa-solid fa-plug-circle-bolt"></i><span>${alloTitle}</span><span class="dsec-total">${pw.psu.usableW} W</span></div><div class="dsec-dots"></div><div class="chart-card"><h3>${alloTitle} — ${pw.psu.usableW} W</h3>${pieSVG(used.map(a => ({ v: a.v })))}</div><div class="chart-list">${used.map((a, i) => `<div class="ditem chart-row" data-ci="${i}"><i class="dot" style="background:${cols[i % cols.length]}"></i><span class="di-txt"><span class="di-name">${esc(a.label)}</span></span><span class="di-price"><strong>${a.v} W</strong></span></div>`).join('')}<div class="ditem"><i class="dot" style="background:#e03131"></i><span class="di-txt"><span class="di-name">${lang === 'en' ? 'Overload' : 'Surcharge'} (${-rest} W)</span></span><span class="di-price"><strong style="color:var(--danger)">${usedTot} / ${pw.psu.usableW} W</strong></span></div></div></div>`;
        }
      }
      powerHtml = `<h3 style="margin:4px 0">${t('sum.powerTitle')} : <strong>${totP} W</strong></h3>
      ${pwSecs}
      ${allocHtml}
      <div class="sum-totals">
        <div class="sum-line"><span><strong>Total PC</strong></span><span class="tot-right"><span class="big">${totP} W</span></span></div>
        <div class="sum-line"><span>${lang === 'en' ? 'UPS load (PC+screens)' : 'Charge onduleur (PC+écrans)'} · ${pw.plugs} ${lang === 'en' ? 'plug(s)' : 'prise(s)'}</span><span class="tot-right"><strong>${totU} W</strong></span></div>
        <div class="sum-line"><span>kWh / ${pw.hoursDay}h ${lang === 'en' ? 'day' : 'jour'} ≈ ${kwh.toFixed(0)} kWh/an</span><span class="tot-right">${eur(eurY)}/an</span></div>
        <div class="sum-line"><span>${lang === 'en' ? 'Cost' : 'Coût'} (${pw.kwhPrice.toFixed(4)} €/kWh)</span><span class="tot-right"><span class="big">${eur(eurM)}/mois</span></span></div>
      </div>
      <p class="hint">${lang === 'en' ? 'Peak model: CPU TDP×1.35, GPU datasheet TBP, flat per-device rules. Screens excluded from PSU.' : 'Modèle pic : CPU TDP×1,35, TBP datasheet GPU, forfaits par appareil. Écrans hors PSU.'}</p>`;
    }
  } catch { /* fall through to legacy display */ }
  if (!powerHtml) powerHtml = `<h3 style="margin:4px 0">${t('sum.powerTitle')} : <strong>${tot} W</strong></h3>
    <div class="charts-row"><div class="chart-card"><h3>kWh / 4h jour ≈ ${((tot * 4 * 365) / 1000).toFixed(0)} kWh/an</h3>${pieSVG(watts)}
    <div class="legend">${watts.map((x, i) => `<span><i class="dot" style="background:${cols[i % cols.length]}"></i>${esc(slotName(x.id))} — ${x.v} W</span>`).join('') || (lang === 'en' ? 'Add wattage on PC fiches.' : 'Renseignez les watts sur les fiches PC.')}</div></div></div>`;
  $('#sumPowerPane').innerHTML = powerHtml;
  $('#sumPowerPane').querySelectorAll('.chart-dsec').forEach(dsec => {
    const sec = dsec.dataset.sec;
    const head = dsec.querySelector('[data-phead]');
    if (head && sec) head.onclick = () => {
      foldedPower.has(sec) ? foldedPower.delete(sec) : foldedPower.add(sec);
      renderSumExtra();
    };
    wireChartRows(dsec);
  });
  refreshIcons();
}

/* ---------- Price history ---------- */
function hist() { return load(LS.hist, {}); }
function pushHistPoint() {
  const T = totals(); const h = hist();
  const k = state.name || 'Ma Config';
  h[k] = h[k] || [];
  h[k].push({ t: Date.now(), total: T.total, deliv: T.total });
  if (h[k].length > 200) h[k] = h[k].slice(-200); // bound price history per config
  save(LS.hist, h);
}
function drawPrices() {
  const cv = $('#priceChart'), ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  ctx.strokeStyle = dark ? '#333' : '#e3e8e3';
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(40, (H - 20) * i / 5); ctx.lineTo(W - 10, (H - 20) * i / 5); ctx.stroke(); }
  const h = hist()[state.name] || [];
  const leg = $('#priceLegend'); leg.innerHTML = '';
  const series = phMode === 'total'
    ? [{ label: 'Total', color: '#1a8744', pts: h.map(x => ({ t: x.t, v: x.total })) }]
    : state.order.filter(id => sel(state.slots[id])).map((id, i) => ({ label: slotName(id), color: ['#1a8744', '#1971c2', '#845ef7', '#e8890c', '#e03131', '#0ca678', '#94d82d', '#5c7cfa', '#f06595', '#868e96'][i % 10], pts: seriesForSlot(id) }));
  const allV = series.flatMap(s => s.pts.map(p => p.v)).concat([Number(state.budget) || 0]);
  const max = Math.max(...allV, 10), min = 0;
  const X = i => 40 + (W - 55) * (series[0] && series[0].pts.length > 1 ? i / (series[0].pts.length - 1) : 0.5);
  // per-slot mode: x by index within each series (aligned on save order) — reuse global index
  series.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.beginPath();
    s.pts.forEach((p, i) => { const x = 40 + (W - 55) * (s.pts.length > 1 ? i / (s.pts.length - 1) : 0.5); const y = H - 20 - (H - 40) * ((p.v - min) / (max - min || 1)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = s.color;
    s.pts.forEach((p, i) => { const x = 40 + (W - 55) * (s.pts.length > 1 ? i / (s.pts.length - 1) : 0.5); const y = H - 20 - (H - 40) * ((p.v - min) / (max - min || 1)); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); });
    leg.innerHTML += `<span><i class="dot" style="background:${s.color}"></i>${esc(s.label)}</span>`;
  });
  // budget line
  const by = H - 20 - (H - 40) * (((Number(state.budget) || 0) - min) / (max - min || 1));
  ctx.setLineDash([6, 5]); ctx.strokeStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(40, by); ctx.lineTo(W - 10, by); ctx.stroke(); ctx.setLineDash([]);
  leg.innerHTML += `<span><i class="dot" style="background:#e03131"></i>Budget (${eur(state.budget)})</span>`;
  if (!series.length || !series[0].pts.length) leg.innerHTML += `<span style="color:var(--muted)">${lang === 'en' ? 'Save the config to start the history.' : 'Sauvegardez la config pour démarrer l’historique.'}</span>`;
}
function seriesForSlot(id) { // per-component: slot totals read back from saved version snapshots
  const cfgs = load(LS.configs, {})[state.name] || [];
  return cfgs.map(v => {
    try {
      const s = v.snapshot.slots[id];
      const p = s && s.products.find(x => x.id === s.selectedId);
      return { t: v.savedAt, v: p ? unitTotal(p) : 0 };
    } catch { return { t: v.savedAt, v: 0 }; }
  });
}

/* ---------- Benchmarks ---------- */
function benchParts() {
  const g = id => { const s = state.slots[id]; const p = s && sel(s); return p ? p.name : ''; };
  return { cpu: g('cpu'), gpu: g('gpu'), ram: g('ram') };
}
function benchQuery() { const b = benchParts(); return `${b.cpu} ${b.gpu} ${b.ram} benchmark`.trim(); }
let benchCacheQ = '', benchBusy = false;
/* ---------- Benchmarks : brief + gaming iobit + pro + Geekbench + 3DMark + YT ---------- */
let benchGame = 'cp2077';
let benchGameEntries = null;
const benchFold = {};
const benchOpenRows = new Set();
let benchKey = '', benchRun = 0, benchYtKey = '';
let bench3d = null, bench3dKey = '', benchGb = null, benchGbKey = '';
const tipReg = {}; let tipSeq = 0;

function benchProd(id) { const s = state.slots[id]; return (s && sel(s)) || null; }
function benchSlotProd(id) { const s = state.slots[id]; const p = s && sel(s); return p ? { p, defId: s.defId } : null; }
function benchScan(prefix) {
  for (const sid of state.order) { const sl = state.slots[sid]; if (sl && sl.defId.indexOf(prefix) === 0) { const p = sel(sl); if (p) return p; } }
  return null;
}
function benchScanSlot(prefix) {
  for (const sid of state.order) { const sl = state.slots[sid]; if (sl && sl.defId.indexOf(prefix) === 0) { const p = sel(sl); if (p) return { p, defId: sl.defId }; } }
  return null;
}
function benchFacts() {
  const cpuP = benchProd('cpu'), gpuP = benchProd('gpu'), ramP = benchProd('ram');
  const stor = benchSlotProd('ssd1') || benchSlotProd('hdd') || benchScanSlot('ssd') || benchScanSlot('hdd');
  const storP = stor ? stor.p : null;
  const storDef = stor ? stor.defId : '';
  const scrP = benchProd('screen1') || benchScan('screen');
  const threads = (cpuP && (Perf.threadsFromDatasheet(cpuP.datasheet) || Perf.specsThreads(cpuP.specs))) || null;
  const ramGB = ramP ? Perf.ramGB(ramP.name) : null;
  const vramGB = gpuP ? Perf.ramGB(gpuP.name) : null;
  const cpuEntry = cpuP ? Perf.matchCpu(cpuP.name) : null;
  const gpuEntry = gpuP ? Perf.matchGpu(gpuP.name) : null;
  const screenH = scrP ? Perf.screenH(scrP) : null;
  // defaut 1080p sans ecran ; sinon palier iobit le plus proche en dessous
  const res = screenH == null ? 1080 : screenH >= 2000 ? '4k' : screenH >= 1300 ? 1440 : screenH >= 900 ? 1080 : 720;
  return {
    cpuP, gpuP, ramP, storP, scrP, threads, ramGB, vramGB, cpuEntry, gpuEntry, screenH, res,
    diskType: storP ? Perf.diskType(storP.name, storP.datasheet, storDef) : null, diskGB: storP ? Perf.diskGB(storP.name) : null,
    gRank: gpuP ? Perf.gpuRank(gpuP.name, gpuEntry ? gpuEntry[3] : null) : null,
  };
}
/* ----- tooltip flottant (suit le curseur) ----- */
function regTip(rows) { const id = 'tip' + (++tipSeq); tipReg[id] = rows; return id; }
function critHtml(r) {
  const disp = r.st === 'unknown' ? 'warn' : r.st;
  const icon = disp === 'ok' ? 'check' : disp === 'warn' ? 'triangle-exclamation' : 'xmark';
  const id = regTip([r]);
  return `<span class="pcrit st-${disp}" data-tip="${id}"><i class="fa-solid fa-${icon}"></i><strong>${esc(r.label)}</strong></span>`;
}
function bindPerfTip() {
  if (bindPerfTip.done) return;
  bindPerfTip.done = true;
  let tip = null;
  const show = (id, x, y) => {
    const rows = tipReg[id];
    if (!rows) return;
    if (!tip) { tip = document.createElement('div'); tip.id = 'perfTip'; tip.className = 'perf-tip'; document.body.appendChild(tip); }
    tip.innerHTML = rows.map(r => {
      const disp = r.st === 'unknown' ? 'warn' : r.st;
      const icon = disp === 'ok' ? 'check' : disp === 'warn' ? 'triangle-exclamation' : r.st === 'unknown' ? 'question' : 'xmark';
      return `<div class="ptip-row st-${disp}"><i class="fa-solid fa-${icon}"></i><span><strong>${esc(r.label)}</strong><br><small>${esc(r.detail)}</small></span></div>`;
    }).join('');
    tip.classList.remove('hidden');
    move(x, y);
  };
  const move = (x, y) => {
    if (!tip || tip.classList.contains('hidden')) return;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(x + 16, window.innerWidth - w - 8) + 'px';
    tip.style.top = Math.min(y + 18, window.innerHeight - h - 8) + 'px';
  };
  const hide = () => { if (tip) tip.classList.add('hidden'); };
  document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el) show(el.dataset.tip, e.clientX, e.clientY); else hide(); });
  document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('[data-tip]')) hide(); });
}
function bindBenchFold() {
  ['bsecBrief', 'bsecGame', 'bsecPro', 'bsecGb', 'bsec3d', 'bsecYt'].forEach(id => {
    const sec = document.getElementById(id);
    if (!sec || sec.dataset.bound) return;
    sec.dataset.bound = '1';
    if (benchFold[id]) sec.classList.add('collapsed');
    sec.querySelector('.dsec-head').onclick = () => { benchFold[id] = !benchFold[id]; sec.classList.toggle('collapsed', benchFold[id]); };
  });
}
/* ----- brief ----- */
function briefCatHtml(id, icon, title, color, value, rows) {
  const open = benchOpenRows.has(id);
  return `<div class="ditem pill-item bench-cat" data-bcat="${id}" role="button" tabindex="0">
    <span class="di-txt"><span class="di-name"><i class="${icon}"></i> ${esc(title)}</span>
    ${open && rows ? `<span class="bench-sub">${rows.map(critHtml).join('')}</span>` : ''}</span>
    <span class="di-price"><strong class="dot-${color}">●</strong>${value ? ` <span>${esc(value)}</span>` : ''}</span></div>`;
}
function renderBriefFacts(f) {
  const host = $('#briefBody');
  if (!host) return;
  Perf.setLang(lang);
  const daily = Perf.dailyCriteria(f);
  const blocks = Perf.proCriteria(f, f.gRank);
  const proWorst = Perf.worstOf([...blocks.video, ...blocks.compile, ...blocks.ai]);
  // tuile jeu = Cyberpunk 2077 @ resolution courante (1080p par defaut)
  const cb = (f.cpuEntry && f.gpuEntry) ? Perf.fpsFor({ cpuPerf: f.cpuEntry[2], gpuPerf: f.gpuEntry[3], game: 'cp2077', res: f.res, quality: 'high', rt: 'off', up: 'none', ramGB: f.ramGB }) : null;
  const cbSt = cb == null ? 'unknown' : { r: 'err', y: 'warn', g: 'ok', b: 'ok' }[Perf.fpsColor(cb)];
  const resLbl = f.res === '4k' ? '4K' : f.res + 'p';
  const gRows = cb == null ? [] : [{ k: 'cb2077', st: cbSt, label: `Cyberpunk 2077 — ${resLbl} (High)`, detail: `${cb} FPS (${t('bench.estSrc')})` }];
  const dc = Perf.worstOf(daily), gc = cbSt, pc = proWorst === 'unknown' ? 'warn' : proWorst;
  $('#briefScore').innerHTML = `<span class="dot-${dc}">●</span> <span class="dot-${gc === 'unknown' ? 'warn' : gc}">●</span> <span class="dot-${pc}">●</span>`;
  host.innerHTML =
    briefCatHtml('daily', 'fa-solid fa-house-laptop', t('bench.daily'), dc, '', daily) +
    briefCatHtml('gaming', 'fa-solid fa-gamepad', t('bench.gaming'), gc === 'unknown' ? 'warn' : gc, cb == null ? '—' : cb + ' FPS', gRows) +
    briefCatHtml('pro', 'fa-solid fa-compass-drafting', t('bench.pro'), pc, '', [...blocks.video.map(r => ({ ...r, label: '[Video] ' + r.label })), ...blocks.compile.map(r => ({ ...r, label: '[Code] ' + r.label })), ...blocks.ai.map(r => ({ ...r, label: '[IA] ' + r.label }))]);
  host.querySelectorAll('[data-bcat]').forEach(el => {
    const go = () => { benchOpenRows.has(el.dataset.bcat) ? benchOpenRows.delete(el.dataset.bcat) : benchOpenRows.add(el.dataset.bcat); renderBriefFacts(f); };
    el.onclick = go;
    el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
}
/* ----- gaming iobit ----- */
function fillGameSelect() {
  const s = $('#benchGame');
  if (!s || s.options.length) return;
  Object.keys(FpsDb.GAMES).forEach(k => {
    const o = document.createElement('option');
    o.value = k; o.textContent = FpsDb.GAMES[k].name;
    s.appendChild(o);
  });
  s.value = benchGame;
  s.onchange = () => { benchGame = s.value; const f = benchFacts(); renderGaming(f); renderBriefFacts(f); };
}
function gameFpsOf(f, quality) {
  if (!f.cpuEntry || !f.gpuEntry) return null;
  return Perf.fpsFor({ cpuPerf: f.cpuEntry[2], gpuPerf: f.gpuEntry[3], game: benchGame, res: f.res, quality: quality || 'high', rt: 'off', up: 'none', ramGB: f.ramGB });
}
function renderGaming(f) {
  const host = $('#gameBody');
  if (!host) return;
  fillGameSelect();
  const gname = FpsDb.GAMES[benchGame] ? FpsDb.GAMES[benchGame].name : benchGame;
  if (!f.cpuEntry || !f.gpuEntry) {
    $('#gameScore').textContent = '—';
    host.innerHTML = `<p class="hint">${esc(t('bench.needBoth'))} (${esc(f.cpuP ? f.cpuP.name : '—')} / ${esc(f.gpuP ? f.gpuP.name : '—')})</p>`;
    $('#gameBars').innerHTML = '';
    const oldBtn = $('#gameBars').parentElement.querySelector('.iobit-open');
    if (oldBtn) oldBtn.remove();
    return;
  }
  const cur = gameFpsOf(f);
  const r1080 = Perf.fpsFor({ cpuPerf: f.cpuEntry[2], gpuPerf: f.gpuEntry[3], game: benchGame, res: 1080, quality: 'high', rt: 'off', up: 'none', ramGB: f.ramGB });
  const r1440 = Perf.fpsFor({ cpuPerf: f.cpuEntry[2], gpuPerf: f.gpuEntry[3], game: benchGame, res: 1440, quality: 'high', rt: 'off', up: 'none', ramGB: f.ramGB });
  const r4k = Perf.fpsFor({ cpuPerf: f.cpuEntry[2], gpuPerf: f.gpuEntry[3], game: benchGame, res: '4k', quality: 'high', rt: 'off', up: 'none', ramGB: f.ramGB });
  $('#gameScore').innerHTML = `<strong class="fps-${Perf.fpsColor(cur)}">${cur} FPS</strong>`;
  const bt = Perf.bottleneck({ cpuPerf: f.cpuEntry[2], gpuPerf: f.gpuEntry[3], game: benchGame, res: f.res });
  const btCard = bt.level == null ? `<div class="ditem"><span class="di-txt"><span class="di-name">✓ ${esc(t('bench.btOk'))}</span></span></div>`
    : `<div class="ditem"><span class="di-txt"><span class="di-name"><i class="fa-solid fa-scale-balanced"></i> ${esc(bt.side === 'cpu' ? (f.cpuP ? f.cpuP.name : 'CPU') : (f.gpuP ? f.gpuP.name : 'GPU'))}</span><br><small style="color:var(--muted)">${esc(bt.side === 'cpu' ? t('bench.btCpu') : t('bench.btGpu'))}</small></span><span class="di-price"><strong class="fps-${bt.level === 'err' ? 'r' : 'y'}">●</strong></span></div>`;
  const resLbl = f.res === '4k' ? '4K' : f.res + 'p';
  const row = (sub, v) => `<div class="ditem"><span class="di-txt"><span class="di-name">${esc(sub)}</span></span><span class="di-price"><strong class="fps-${Perf.fpsColor(v)}">${v} FPS</strong></span></div>`;
  host.innerHTML =
    `<div class="iobit-grid2"><div class="ditem"><span class="di-txt"><span class="di-name">${esc(gname)}</span><span class="di-sub">${esc(resLbl)} · High</span><span class="di-specs"><span>${esc(f.cpuEntry[1])}</span><span>${esc(f.gpuEntry[1])}</span></span></span><span class="di-price"><strong class="fps-${Perf.fpsColor(cur)}" style="font-size:1.3rem">${cur} FPS</strong></span></div>`
    + btCard + `</div>`
    + `<div class="iobit-grid3">` + row('1080p', r1080) + row('1440p', r1440) + row('4K', r4k) + `</div>`;
  // barres par preset @ resolution courante
  const quals = ['low', 'medium', 'high', 'ultra', 'max'];
  const vals = quals.map(q => gameFpsOf(f, q));
  const max = Math.max(...vals, 1);
  $('#gameBars').innerHTML = '<div class="preset-bars">' + quals.map((q, i) => {
    const v = vals[i], c = Perf.fpsColor(v);
    const w = Math.max(3, Math.round(v / max * 100));
    return `<div class="pbar"><span class="pbar-lbl">${esc(t('bench.q_' + q))}</span><span class="pbar-track"><span class="pbar-fill fpsbg-${c}" style="width:${w}%"></span></span><span class="pbar-val fps-${c}">${v}</span></div>`;
  }).join('') + '</div>';
  $('#gameCredit').innerHTML = `FPS : <a href="${esc(FpsDb.SOURCE)}" target="_blank" rel="noopener">iobit.com (${esc(FpsDb.SNAPSHOT)})</a> — estimations.`;
  // iobit ne permet pas la preselection par URL : on copie les noms exacts
  // (CPU/GPU/jeu tels que reconnus) pour les coller dans ses champs, puis on ouvre.
  benchGameEntries = { cpu: f.cpuEntry[1], gpu: f.gpuEntry[1], game: gname };
  if (!$('#gameBars').parentElement.querySelector('.iobit-open')) {
    $('#gameBars').insertAdjacentHTML('afterend', `<div class="btn-row iobit-open"><button class="btn" id="iobitGo"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(t('bench.iobit'))}</button></div>`);
  } else {
    const a = $('#gameBars').parentElement.querySelector('.iobit-open #iobitGo');
    if (a) a.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(t('bench.iobit'))}`;
  }
  $('#iobitGo').onclick = () => {
    const txt = `CPU: ${benchGameEntries.cpu}\nGPU: ${benchGameEntries.gpu}\nGame: ${benchGameEntries.game}`;
    try { navigator.clipboard?.writeText(txt); } catch { /* ignore */ }
    toast(t('bench.copied'));
    window.open(FpsDb.SOURCE, '_blank', 'noopener');
  };
}
/* ----- pro ----- */
function renderPro(f) {
  const host = $('#proBody');
  if (!host) return;
  Perf.setLang(lang);
  const blocks = Perf.proCriteria(f, f.gRank);
  const defs = [['video', 'fa-solid fa-clapperboard', t('bench.video')], ['compile', 'fa-solid fa-code', t('bench.compile')], ['ai', 'fa-solid fa-brain', t('bench.ai')]];
  $('#proScore').innerHTML = defs.map(([k]) => { const w = Perf.worstOf(blocks[k]); return `<span class="dot-${w === 'unknown' ? 'warn' : w}">●</span>`; }).join(' ');
  host.innerHTML = defs.map(([k, icon, title]) => {
    const open = benchOpenRows.has('pro_' + k);
    const w = Perf.worstOf(blocks[k]);
    return `<div class="ditem pill-item bench-cat${open ? ' open' : ''}" data-pro="${k}" role="button" tabindex="0">
      <span class="di-txt"><span class="di-name"><i class="${icon}"></i> ${esc(title)}</span>
      ${open ? `<span class="bench-sub">${blocks[k].map(critHtml).join('')}</span>` : ''}</span>
      <span class="di-price"><strong class="dot-${w === 'unknown' ? 'warn' : w}">●</strong></span></div>`;
  }).join('');
  host.querySelectorAll('[data-pro]').forEach(el => {
    const go = () => { benchOpenRows.has('pro_' + el.dataset.pro) ? benchOpenRows.delete('pro_' + el.dataset.pro) : benchOpenRows.add('pro_' + el.dataset.pro); renderPro(benchFacts()); };
    el.onclick = go;
    el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
}
/* ----- Geekbench ----- */
async function loadBenchGb(f) {
  const key = f.cpuP ? f.cpuP.name : '', run = benchRun;
  if (!key) { $('#gbBody').innerHTML = `<p class="hint">${esc(t('bench.needCpu'))}</p>`; $('#gbScore').textContent = '—'; return; }
  if (key === benchGbKey && benchGb) { renderGb(); return; }
  benchGbKey = key; benchGb = null;
  $('#gbBody').innerHTML = '<div class="skel"></div>';
  $('#gbScore').textContent = '…';
  const v = await Perf.gbScores(key).catch(() => ({ single: null, multi: null, n: 0, version: '?' }));
  if (run !== benchRun) return;
  benchGb = { ...v, q: key };
  renderGb();
}
function renderGb() {
  if (!benchGb) return;
  if (benchGb.single == null && benchGb.multi == null) {
    $('#gbScore').textContent = '—';
    $('#gbBody').innerHTML = `<p class="hint">${esc(t('bench.nodata'))}</p>`;
    return;
  }
  const loc = n => n == null ? '—' : n.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR');
  $('#gbScore').textContent = (benchGb.version !== '?' ? benchGb.version + ' · ' : '') + loc(benchGb.multi);
  $('#gbBody').innerHTML =
    `<div class="ditem"><span class="di-txt"><span class="di-name">${esc(t('bench.single'))}</span></span><span class="di-price"><strong>${loc(benchGb.single)}</strong></span></div>`
    + `<div class="ditem"><span class="di-txt"><span class="di-name">${esc(t('bench.multi'))}</span></span><span class="di-price"><strong>${loc(benchGb.multi)}</strong></span></div>`
    + `<p class="hint">${esc(benchGb.version)} · n=${benchGb.n} · browser.geekbench.com</p>`
    + `<div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="https://browser.geekbench.com/search?q=${encodeURIComponent(benchGb.q || '')}"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(t('bench.gbOpen'))}</a></div>`;
}
/* ----- 3DMark ----- */
async function loadBench3d(f) {
  const key = (f.cpuP ? f.cpuP.name : '') + '|' + (f.gpuP ? f.gpuP.name : ''), run = benchRun;
  if (!f.cpuP || !f.gpuP) { $('#tsBody').innerHTML = `<p class="hint">${esc(t('bench.needBoth'))}</p>`; $('#tsScore').textContent = '—'; return; }
  if (key === bench3dKey && bench3d) { render3d(); return; }
  bench3dKey = key; bench3d = null;
  $('#tsBody').innerHTML = '<div class="skel"></div>';
  $('#tsScore').textContent = '…';
  try {
    const combo = await Perf.tsCombo(f.cpuP.name, f.gpuP.name);
    if (run !== benchRun) return;
    bench3d = { combo, gpuOnly: null, cpuOnly: null, singlesErr: false };
    render3d();
  } catch (e) { if (run === benchRun) { bench3d = { combo: { median: null, n: 0 }, err: String((e && e.message) || e) }; render3d(); } return; }
  // Les typiques ne doivent jamais masquer un combine reussi.
  try {
    const [g, c] = await Promise.all([Perf.tsSingle('gpu', f.gpuP.name), Perf.tsSingle('cpu', f.cpuP.name)]);
    if (run !== benchRun) return;
    bench3d.gpuOnly = g; bench3d.cpuOnly = c;
    render3d();
  } catch { if (run === benchRun && bench3d) { bench3d.singlesErr = true; render3d(); } }
}
function bindTsRetry() {
  const rb = $('#tsRetry');
  if (rb) rb.onclick = () => { Perf.tsClear(); bench3dKey = ''; bench3d = null; loadBench3d(benchFacts()); };
}
function render3d() {
  if (!bench3d) return;
  const { combo } = bench3d;
  const loc = n => n == null ? '—' : n.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR');
  const retry = `<div class="btn-row"><button class="mini-btn" id="tsRetry"><i class="fa-solid fa-rotate-right"></i> ${esc(t('bench.retry'))}</button></div>`;
  if (bench3d.err) {
    $('#tsScore').textContent = '—';
    $('#tsBody').innerHTML = `<p class="hint">${esc(t('bench.err'))}<br><small>${esc(bench3d.err)}</small></p>` + retry;
    bindTsRetry();
    return;
  }
  if (combo.median == null) {
    $('#tsScore').textContent = '—';
    $('#tsBody').innerHTML = `<p class="hint">${esc(t('bench.nodata'))} (${esc((combo.gpu && combo.gpu.label) || '')} + ${esc((combo.cpu && combo.cpu.label) || '')})</p>` + retry;
    bindTsRetry();
    return;
  }
  $('#tsScore').textContent = loc(combo.median);
  let sub = `<p class="hint"><i class="fa-solid fa-circle-notch fa-spin"></i></p>`;
  if (bench3d.gpuOnly && bench3d.cpuOnly && bench3d.gpuOnly.median && bench3d.cpuOnly.median) {
    const v = Perf.tsBottleneck(combo.median, bench3d.gpuOnly.median, bench3d.cpuOnly.median);
    const cls = v.level === 'err' ? 'r' : v.level === 'warn' ? 'y' : 'g';
    const msg = v.side === 'cpu' ? t('bench.btCpu') : v.side === 'gpu' ? t('bench.btGpu') : t('bench.btOk');
    sub = `<div class="ts-grid2"><div class="ditem"><span class="di-txt"><span class="di-name">${esc(t('bench.tsGpu'))}</span></span><span class="di-price"><strong>${loc(bench3d.gpuOnly.median)}</strong></span></div><div class="ditem"><span class="di-txt"><span class="di-name">${esc(t('bench.tsCpu'))}</span></span><span class="di-price"><strong>${loc(bench3d.cpuOnly.median)}</strong></span></div></div><p class="hint"><strong class="fps-${cls}">●</strong> ${esc(msg)}${v.ratio ? ` (${Math.round(v.ratio * 100)} %)` : ''} · ${esc(t('bench.typical'))}</p>`;
  } else if (bench3d.singlesErr) {
    sub = `<p class="hint">${esc(t('bench.typErr'))}</p>` + retry;
  }
  $('#tsBody').innerHTML =
    `<div class="ditem"><span class="di-txt"><span class="di-name">${esc((combo.cpu && combo.cpu.label) || '')} + ${esc((combo.gpu && combo.gpu.label) || '')}</span><br><small style="color:var(--muted)">${esc(t('bench.topruns'))} · n=${combo.n}</small></span><span class="di-price"><strong>${loc(combo.median)}</strong></span></div>` + sub
    + `<div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(combo.topUri || 'https://www.3dmark.com/search')}"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(t('bench.tsOpen'))}</a></div>`;
  bindTsRetry();
}
/* ----- YouTube (existant + champ extra) ----- */
function paintVideos(items, cached) {
  const grid = $('#benchGrid');
  grid.innerHTML = '';
  items.forEach(v => {
    const card = document.createElement('div');
    card.className = 'video-card';
    card.innerHTML = `<button class="vthumb" aria-label="Play"><img src="${esc(v.thumb)}" alt="" loading="lazy" onerror="this.remove()"><span class="play"><i class="fa-solid fa-play"></i></span></button>
      <div class="vt"><strong>${esc(v.title)}</strong></div>
      <div class="vbtns"><button class="mini-btn" data-play><i class="fa-solid fa-play"></i> ${t('bench.play')}</button>
      <a class="mini-btn" target="_blank" rel="noopener" href="${esc(v.url)}"><i class="fa-brands fa-youtube"></i> YouTube</a></div>`;
    card.querySelector('[data-play]').onclick = () => playVideo(v);
    card.querySelector('.vthumb').onclick = () => playVideo(v);
    grid.appendChild(card);
  });
  $('#benchStatus').textContent = `${items.length} vidéos${cached ? ' · ' + t('picker.cached') : ''}`;
}
async function loadBenchYt(baseQ, run) {
  const extra = ($('#benchExtra') && $('#benchExtra').value || '').trim();
  const q = (baseQ + (extra ? ' ' + extra : '')).trim();
  $('#benchOpen').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  if (q === benchYtKey && $('#benchGrid').dataset.loaded === '1') return;
  benchYtKey = q;
  $('#benchGrid').innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  $('#benchGrid').dataset.loaded = '';
  $('#benchStatus').textContent = t('bench.loading');
  const r = await Tube.search(q);
  if (run !== benchRun) return;
  $('#benchGrid').dataset.loaded = '1';
  if (r.error || !r.items.length) {
    $('#benchStatus').textContent = '';
    const variants = [q, `${benchParts().cpu} ${benchParts().gpu} test gaming`, `${benchParts().gpu} thermals noise test`];
    $('#benchGrid').innerHTML = `<p class="hint">${esc(t('bench.err'))}</p>` + variants.map(v => `<a class="list-row" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(v)}"><i class="fa-brands fa-youtube" style="color:#e03131;font-size:1.4rem"></i><span class="grow"><strong>${esc(v)}</strong><br><small style="color:var(--muted)">youtube.com → ${esc(v)}</small></span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`).join('');
    return;
  }
  paintVideos(r.items, r.cached);
}
async function showBench() {
  const b = benchParts();
  const has = !!(b.cpu && b.gpu && b.ram);
  const q = benchQuery();
  $('#benchQuery').innerHTML = `${lang === 'en' ? 'Search:' : 'Recherche :'} <code class="k">${esc(q)}</code>`;
  bindBenchFold();
  bindPerfTip();
  if (!has) {
    benchKey = ''; benchRun++;
    for (const id of ['briefBody', 'gameBody', 'proBody', 'gbBody', 'tsBody']) { const el = document.getElementById(id); if (el) el.innerHTML = `<p class="hint">${esc(t('bench.needs'))}</p>`; }
    for (const id of ['briefScore', 'gameScore', 'proScore', 'gbScore', 'tsScore']) { const el = document.getElementById(id); if (el) el.textContent = '—'; }
    $('#gameBars').innerHTML = '';
    $('#benchGrid').innerHTML = '';
    $('#benchStatus').textContent = '';
    return;
  }
  const key = [b.cpu, b.gpu, b.ram, benchGame].join('|');
  if (key !== benchKey) { benchKey = key; benchRun++; }
  const run = benchRun;
  for (const k of Object.keys(tipReg)) delete tipReg[k];
  const f = benchFacts();
  Perf.setLang(lang);
  renderBriefFacts(f);
  renderGaming(f);
  renderPro(f);
  loadBenchGb(f);
  loadBench3d(f);
  loadBenchYt(q, run);
}
function playVideo(v) {
  openModal(v.title, `
    <div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.id)}" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
    <div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(v.url)}"><i class="fa-brands fa-youtube"></i> ${lang === 'en' ? 'Open on YouTube' : 'Ouvrir sur YouTube'}</a></div>
    <p class="hint">${lang === 'en' ? 'If the player refuses to load, the author disabled embedding — use the YouTube button.' : "Si le lecteur refuse de charger, l'auteur a désactivé l'intégration — utilisez le bouton YouTube."}</p>`);
}
/* ---------- Save / load / history / share / export ---------- */
function doSave() {
  state.name = String(state.name || '').trim() || 'Ma Config';
  const nameInput = $('#configName'); if (nameInput) nameInput.value = state.name;
  state.version = stampVersion();
  $('#versionChip').textContent = 'v' + state.version;
  if (!persistRetry()) {
    toast(lang === 'en' ? 'Storage full — config NOT saved (export JSON as backup)' : 'Stockage plein — config NON sauvegardée (exportez en JSON)');
    try { download(state.name + '.configmaker.json', JSON.stringify({ state, exportedAt: new Date().toISOString() }, null, 2), 'application/json'); } catch { /* ignore */ }
    return;
  }
  pushHistPoint();
  const cfgs = load(LS.configs, {});
  cfgs[state.name] = cfgs[state.name] || [];
  if (cfgs[state.name].length >= 100) cfgs[state.name] = cfgs[state.name].slice(-99); // bound per-config history
  cfgs[state.name].push({ version: state.version, savedAt: Date.now(), name: state.name, budget: state.budget, total: totals().total, snapshot: JSON.parse(JSON.stringify(state)) });
  if (save(LS.configs, cfgs) !== true) {
    toast(lang === 'en' ? 'Storage full — snapshot NOT saved (draft is safe)' : 'Stockage plein — instantané NON sauvegardé (brouillon à jour)');
    try { download(state.name + '.configmaker.json', JSON.stringify({ state, exportedAt: new Date().toISOString() }, null, 2), 'application/json'); } catch { /* ignore */ }
    refresh(); drawPrices();
    return;
  }
  lastSavedJson = JSON.stringify(state);
  refresh(); drawPrices();
  toast((lang === 'en' ? 'Saved — v' : 'Enregistré — v') + state.version);
}
/* ---------- New config + draft tracking ---------- */
let lastSavedJson = '';
function baselineSaved() {
  // Draft restored from storage counts as saved iff it matches the last snapshot
  try {
    const arr = (load(LS.configs, {})[state.name]) || [];
    if (!arr.length) return;
    if (JSON.stringify(arr[arr.length - 1].snapshot) === JSON.stringify(state)) lastSavedJson = JSON.stringify(state);
  } catch { /* ignore */ }
}
function isDirty() { return JSON.stringify(state) !== lastSavedJson; }
function wipeToNew() {
  state = defaultState();
  persist();
  lastSavedJson = JSON.stringify(state);
  activeSlot = null; idealToken++; idealPool = []; idealFetched = {}; idealShown = IDEAL_PAGE;
  benchCacheQ = '';
  closeModal(); showPage('config');
  $('#pickerPanel').classList.add('hidden');
  $('#summaryPanel').classList.remove('hidden');
  refresh();
  toast(lang === 'en' ? 'New config' : 'Nouvelle config');
}
function newConfig() {
  const pristine = JSON.stringify(state) === JSON.stringify(defaultState());
  if (!isDirty() || pristine) { wipeToNew(); return; }
  const t = totals();
  openModal(lang === 'en' ? 'Start a new config?' : 'Nouvelle configuration ?', `
    <p>${lang === 'en' ? 'Unsaved changes to' : 'Modifications non sauvées de'} <strong>${esc(state.name)}</strong>
    (${eur(t.total)}${state.version ? ' · v' + esc(state.version) : ''}) ${lang === 'en' ? 'will be lost.' : 'seront perdues.'}</p>
    <p class="hint">${lang === 'en' ? 'Saved configs and history are kept — only the current draft is wiped.' : 'Les configs sauvées et l’historique sont conservés — seul le brouillon courant est effacé.'}</p>
    <div class="btn-row"><button class="btn" id="n_cancel">${lang === 'en' ? 'Cancel' : 'Annuler'}</button>
    <button class="btn btn-primary" id="n_wipe"><i class="fa-solid fa-file-circle-plus"></i> ${lang === 'en' ? 'Erase & new' : 'Effacer & nouveau'}</button></div>`);
  $('#n_cancel').onclick = closeModal;
  $('#n_wipe').onclick = wipeToNew;
}
function openLoad() {
  const cfgs = load(LS.configs, {});
  const names = Object.keys(cfgs);
  openModal(lang === 'en' ? 'Load config' : 'Charger une config', `
    <div class="btn-row" style="justify-content:start"><button class="btn btn-sm" id="l_file"><i class="fa-solid fa-file-import"></i> ${lang === 'en' ? 'Load from file' : 'Depuis un fichier'}</button>
    <button class="btn btn-sm" id="l_link"><i class="fa-solid fa-link"></i> ${lang === 'en' ? 'Load from link' : 'Depuis un lien'}</button></div>
    <div id="l_list" style="margin-top:12px">${names.length ? '' : `<p class="hint">${lang === 'en' ? 'No saved configs yet.' : 'Aucune config enregistrée.'}</p>`}</div>
    <input type="file" id="l_fileIn" accept=".json" class="hidden">`);
  const host = $('#l_list');
  names.forEach(n => {
    const arr = cfgs[n];
    const last = arr[arr.length - 1];
    const row = document.createElement('div');
    row.className = 'list-row';
    row.innerHTML = `<span class="grow"><strong>${esc(n)}</strong><br><small style="color:var(--muted)">${arr.length} save(s) · v${esc(last.version)} · ${eur(last.total)}</small></span>`;
    const b = document.createElement('button'); b.className = 'mini-btn'; b.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${lang === 'en' ? 'Load' : 'Charger'}`;
    b.onclick = () => { state = JSON.parse(JSON.stringify(last.snapshot)); persist(); lastSavedJson = JSON.stringify(state); closeModal(); refresh(); schedulePriceRefresh(); toast(lang === 'en' ? 'Loaded' : 'Chargée'); };
    row.appendChild(b); host.appendChild(row);
  });
  $('#l_file').onclick = () => $('#l_fileIn').click();
  $('#l_fileIn').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { importConfig(JSON.parse(r.result)); closeModal(); } catch { toast('JSON invalide'); } };
    r.readAsText(f);
  };
  $('#l_link').onclick = () => {
    const v = prompt(lang === 'en' ? 'Paste share link or code:' : 'Collez le lien ou le code de partage :');
    if (v) { try { importConfig(decodeShare(v)); closeModal(); } catch { toast('Lien invalide'); } }
  };
}
function openHistory() {
  const cfgs = load(LS.configs, {})[state.name] || [];
  openModal((lang === 'en' ? 'History — ' : 'Historique — ') + state.name, cfgs.length ? [...cfgs].reverse().map((v, i) => `
    <div class="list-row"><span class="grow"><strong>v${esc(v.version)}</strong><br><small style="color:var(--muted)">${new Date(v.savedAt).toLocaleString()} · ${eur(v.total)} · budget ${eur(v.budget)}</small></span>
    <button class="mini-btn" data-r="${cfgs.length - 1 - i}"><i class="fa-solid fa-rotate-left"></i> ${lang === 'en' ? 'Restore' : 'Restaurer'}</button></div>`).join('')
    : `<p class="hint">${lang === 'en' ? 'No saves yet for this config.' : 'Aucune sauvegarde pour cette config.'}</p>`);
  $$('#modalBody [data-r]').forEach(b => b.onclick = () => {
    const v = cfgs[Number(b.dataset.r)];
    state = JSON.parse(JSON.stringify(v.snapshot)); state.name = v.name; persist(); lastSavedJson = JSON.stringify(state); closeModal(); refresh(); schedulePriceRefresh(); toast(lang === 'en' ? 'Restored' : 'Restaurée');
  });
}
function encodeShare(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function decodeShare(s) {
  const m = String(s).match(/#c=([A-Za-z0-9+/=]+)/) || String(s).match(/[A-Za-z0-9+/=]{40,}/);
  const code = m ? m[1] : s.trim();
  return JSON.parse(decodeURIComponent(escape(atob(code))));
}
function importConfig(obj) {
  const st = (obj && obj.slots) ? obj : (obj && obj.state && obj.state.slots ? obj.state : null);
  if (!st) throw new Error('bad');
  state = st;
  if (!state.order) state.order = Object.keys(state.slots);
  if (!state.name) state.name = 'Ma Config';
  if (typeof state.budget !== 'number') state.budget = parseFloat(state.budget) || 0;
  Object.values(state.slots).forEach(s => {
    if (!s || typeof s !== 'object') return;
    if (!Array.isArray(s.products)) s.products = [];
    if (!(s.selectedId && s.products.some(p => p.id === s.selectedId))) s.selectedId = s.products[0]?.id || null;
  });
  try { openAlts.clear(); } catch { /* ignore */ }
  try { openVariants.clear(); } catch { /* ignore */ }
  compatCache = null;
  if (persistRetry()) {
    lastSavedJson = JSON.stringify(state);
    toast(lang === 'en' ? 'Config imported and saved' : 'Config importée et sauvegardée');
  } else {
    toast(lang === 'en' ? 'Config loaded in memory but storage full — export JSON!' : 'Config chargée en mémoire mais stockage plein — exportez en JSON !');
  }
  refresh();
  schedulePriceRefresh();
}
/* ---------- Background price refresh (same vendor, else cheapest) ---------- */
let priceRefreshRunning = false, priceRefreshTimer = null;
const refreshingPids = new Set();
const refreshFailed = new Set();
function schedulePriceRefresh(delay = 1200) {
  clearTimeout(priceRefreshTimer);
  priceRefreshTimer = setTimeout(() => refreshPrices(), delay);
}
function showProgress(txt) {
  const pp = $('#progressPop'); if (!pp) return;
  $('#progressTxt').textContent = txt;
  pp.classList.remove('hidden');
}
function hideProgress() { const pp = $('#progressPop'); if (pp) pp.classList.add('hidden'); }
/* Apply listing offers to one fiche. Returns true if anything changed.
   Same vendor matched, else cheapest when no vendor. Flags only for the selected fiche. */
function applyOfferRefresh(cur, offers, withFlags) {
  let o = null;
  if (cur.vendor) o = offers.find(x => x.merchant && x.merchant.toLowerCase() === cur.vendor.toLowerCase()) || null;
  else o = offers[0] || null;
  let ch = false;
  const qty = cur.qty || 1;
  const shipOf = x => Math.max(0, ((x.delivered > 0 ? x.delivered : x.price) - x.price));
  if (!o) {
    // chosen vendor gone from listing: keep coherent old data, but still evaluate flags
  } else {
    if (o.price && o.price !== cur.price) { cur.price = o.price; ch = true; }
    if (!cur.vendor && o.merchant) { cur.vendor = o.merchant; ch = true; }
    if (o.delivered > 0 && o.price) {
      const d = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
      if (d !== cur.delivery) { cur.delivery = d; ch = true; }
    }
    if (!cur.store && o.url) { cur.store = o.url; ch = true; }
  }
  if (withFlags) {
    const curTotal = unitTotal(cur);
    let best = null;
    offers.forEach(x => {
      if (!x.price) return;
      const t = x.price * qty + shipOf(x);
      if (!best || t < best.total - 1e-9) best = { price: x.price, delivered: x.delivered, merchant: x.merchant, url: x.url, promo: !!x.promo, total: t };
    });
    if (best && best.total < curTotal - 0.005) {
      if (!cur.best || cur.best.total !== best.total || cur.best.merchant !== best.merchant) { cur.best = best; ch = true; }
    } else if (cur.best) { cur.best = null; ch = true; }
    const noBetter = !best || best.total >= curTotal - 0.005;
    if (!!cur.isBest !== noBetter) { cur.isBest = noBetter; ch = true; }
    const ref = o;
    const promo = !!(ref && ref.promo);
    if (!!cur.promo !== promo) { cur.promo = promo; ch = true; }
  }
  return ch;
}
async function refreshPrices() {
  if (priceRefreshRunning) return;
  // every fiche (selected + alternatives), fetches deduplicated by /prix/ URL
  const byUrl = new Map();
  state.order.forEach(id => {
    const s = state.slots[id]; if (!s) return;
    (s.products || []).forEach(p => {
      if (p && /idealo\.fr\/prix\//i.test(p.idealo || '')) {
        if (!byUrl.has(p.idealo)) byUrl.set(p.idealo, []);
        byUrl.get(p.idealo).push({ id, pid: p.id });
      }
    });
  });
  const urls = [...byUrl.keys()];
  if (!urls.length || typeof Idealo === 'undefined') return;
  priceRefreshRunning = true;
  const prog = lang === 'en' ? 'Refreshing prices' : 'Actualisation des prix';
  showProgress(`${prog} (0/${urls.length})…`);
  let updated = 0, failed = 0;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const entries = byUrl.get(url).filter(e => {
      const s = state.slots[e.id];
      return s && s.products.some(x => x.id === e.pid);
    });
    if (!entries.length) continue;
    entries.forEach(e => refreshingPids.add(e.pid));
    renderSlots(); renderSummary();
    showProgress(`${prog} (${i + 1}/${urls.length})…`);
    try {
      const r = await Idealo.offers(url, true);
      if (r.error || !r.offers.length) { failed++; entries.forEach(e => refreshFailed.add(e.pid)); }
      else {
        entries.forEach(({ id, pid }) => {
          const s = state.slots[id];
          const cur = s && s.products.find(x => x.id === pid);
          if (!cur || (editingPid && editingPid === pid)) return;
          refreshFailed.delete(pid);
          if (applyOfferRefresh(cur, r.offers, sel(s) === cur)) updated++;
        });
      }
    } catch { failed++; entries.forEach(e => refreshFailed.add(e.pid)); }
    entries.forEach(e => refreshingPids.delete(e.pid));
  }
  refreshingPids.clear();
  persist(); refresh(); hideProgress();
  priceRefreshRunning = false;
  for (const id of state.order) queueAlternativeData(id); // then datasheets for alternatives still missing them
  toast(updated
    ? `${lang === 'en' ? 'Prices updated' : 'Prix actualisés'} (${updated})${failed ? ' · ' + failed + (lang === 'en' ? ' failed' : ' en échec') : ''}`
    : (failed ? (lang === 'en' ? 'Price refresh failed — retry later' : 'Échec actualisation — réessayez plus tard') : (lang === 'en' ? 'Prices already up to date' : 'Prix déjà à jour')));
}
function openShare() {
  const code = encodeShare(state);
  const link = location.origin + location.pathname + '#c=' + code;
  openModal(lang === 'en' ? 'Share config' : 'Partager la config', `
    <div class="fld"><label>${lang === 'en' ? 'Link (prefilled)' : 'Lien (pré-rempli)'}</label><input id="s_link" readonly value="${esc(link)}"></div>
    <div class="btn-row"><button class="btn btn-sm btn-primary" id="s_copy"><i class="fa-solid fa-copy"></i> ${lang === 'en' ? 'Copy link' : 'Copier le lien'}</button>
    <button class="btn btn-sm" id="s_json"><i class="fa-solid fa-file-arrow-down"></i> JSON</button></div>`);
  $('#s_copy').onclick = () => { navigator.clipboard?.writeText(link); toast(lang === 'en' ? 'Link copied' : 'Lien copié'); };
  $('#s_json').onclick = () => download(state.name + '.configmaker.json', JSON.stringify(state, null, 2), 'application/json');
}
function openExport() {
  openModal(lang === 'en' ? 'Export config' : 'Exporter la config', `
    <p class="hint">${lang === 'en' ? 'Beautiful PDF = print view (browser print → save as PDF). JSON = full re-importable config.' : 'Beau PDF = vue d’impression (imprimer → enregistrer en PDF). JSON = config complète réimportable.'}</p>
    <div class="btn-row"><button class="btn btn-primary" id="e_pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button>
    <button class="btn" id="e_json"><i class="fa-solid fa-file-code"></i> JSON</button></div>`);
  $('#e_pdf').onclick = () => { closeModal(); window.print(); };
  $('#e_json').onclick = () => download(state.name + '.configmaker.json', JSON.stringify(state, null, 2), 'application/json');
}
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function exportAll() {
  download('configmaker-all-data.json', JSON.stringify({ state, configs: load(LS.configs, {}), hist: load(LS.hist, {}), exportedAt: new Date().toISOString() }, null, 2), 'application/json');
}
function openChangelog() {
  openModal('Changelog — v2.50', `
    <div class="chlog"><h3>v2.50 — Carte réseau + réseau complet</h3><p class="hint">Nouveau composant carte réseau (slot PCIe sous la carte graphique, simulateur PCIe, RJ45/SFP+/WiFi), switch vs routeur vs lien PC, prises ventilateurs CM, stockage externe/dock/webcam (débits USB), lecteur SD, tablette graphique.</p></div>
    <div class="chlog"><h3>v2.49 — Compatibilité via datasheets</h3><p class="hint">Vérification basée uniquement sur les fiches techniques Idealo (## Détails du produit) : bouton … avec popup détaillée et comparaisons de specs façon VS, bouton Vérifié (pastille vert clair,une seule coche), vitesse/capacité RAM max depuis la datasheet CM, watercooling (taille radiateur), M.2 2230/2242/2260/2280/22110, connectique écrans/clavier/souris/casque/dock (HDMI/DP/USB-C/USB-A/Bluetooth/Jack).</p></div>
    <div class="chlog"><h3>v2.48 — Vérification de compatibilité</h3><p class="hint">Pastilles vertes/jaunes/rouges par composant (socket, chipset, format, RAM, PCIe…), boutons et résumé surlignés en cas de souci, onglet Compat avec problèmes et avertissements cliquables, champ puissance alim/onduleur.</p></div>
    <div class="chlog"><h3>v2.47 — Offres directes en pause</h3><p class="hint">Le flux d'offre directe est grisé partout avec mention du problème connu pendant la correction.</p></div>
    <div class="chlog"><h3>v2.46 — Tokens toujours frais</h3><p class="hint">Le token d'offre est re-récupéré à chaque clic (fini les tokens périmés en cache) et les échecs réseau affichent un message précis au lieu d'une page d'accueil silencieuse.</p></div>
    <div class="chlog"><h3>v2.45 — Correctif bloqueur de popups</h3><p class="hint">L'onglet s'ouvrait après la requête réseau, donc bloqué en silence : token en cache soumis aussitôt, sinon onglet réservé au clic puis réutilisé pour l'offre.</p></div>
    <div class="chlog"><h3>v2.44 — Offres directes via Idealo</h3><p class="hint">Fini la recherche marchand : le bouton boutique/« Voir l'offre » soumet le formulaire d'offre Idealo qui redirige directement chez le marchand. Badge « sans page Idealo » sur les cartes concernées.</p></div>
    <div class="chlog"><h3>v2.43 — Offres directes marchand</h3><p class="hint">Sans page Idealo, le panier ouvre la recherche de l'offre sur le site marchand (Amazon, AliExpress, Cdiscount) et les cartes du sélecteur affichent un badge avec bouton « Voir l'offre » au lieu d'« Idealo ».</p></div>
    <div class="chlog"><h3>v2.42 — Boutons boutique corrigés</h3><p class="hint">Sans page Idealo : seul le choix du marchand est grisé (popup impossible) ; le panier reste actif et ouvre directement le site du marchand connu. Avec page : tout actif comme avant.</p></div>
    <div class="chlog"><h3>v2.41 — Boutons grisés sans page</h3><p class="hint">Sans page Idealo dédiée, les boutons Idealo et boutique sont grisés avec infobulle explicative au lieu d'être inopérants.</p></div>
    <div class="chlog"><h3>v2.40 — Correctif offres sans lien</h3><p class="hint">Les offres sans lien fiche (ex. pâte thermique : vendeur + port directs) étaient jetées par le dédoublonnage et la liste restait vide. Clé de repli sur image/nom+prix, bouton Idealo masqué quand il n'y a pas d'URL.</p></div>
    <div class="chlog"><h3>v2.39 — Correctif listes Idealo</h3><p class="hint">Pages listes : offres directes reconnues (nom + vendeur + port), carrousels « nouveautés » exclus, pagination préservée. La pâte thermique affiche ses vraies offres.</p></div>
    <div class="chlog"><h3>v2.38 — Bouton Idealo repositionné</h3><p class="hint">Le bouton Idealo du panneau passe en en-tête à droite du type de composant, et chaque carte résultat affiche son lien « Idealo » en toutes lettres.</p></div>
    <div class="chlog"><h3>v2.37 — Bouton PCIe sur son & capture</h3><p class="hint">Le bouton simulateur PCIe (histogramme) apparaît aussi sur les cartes son et d'acquisition PCIe, avec envoi de la config complète comme depuis la carte mère et le SSD.</p></div>
    <div class="chlog"><h3>v2.36 — SSD et cartes PCIe envoyés aussi</h3><p class="hint">SSD classés par débit (>6000 Gen5, ≥3500 Gen4, sinon Gen3, SATA ignorés), cartes de capture et son PCIe ajoutées (USB ignorées), placement sans collision de slots.</p></div>
    <div class="chlog"><h3>v2.35 — Simulateur PCIe pré-rempli</h3><p class="hint">Icône histogramme, bouton aussi sur le SSD : ouvre le simulateur avec carte mère, CPU, GPU et SSD reconnus et branchés aux bons slots (recherche floue sur catalogue local, repli propre si introuvable).</p></div>
    <div class="chlog"><h3>v2.34 — Correctif remplacement réel</h3><p class="hint">Le remplacement supprimait seulement dans un cas de test : la condition se basait sur un mauvais drapeau et ne se déclenchait jamais depuis le sélecteur. Maintenant la fiche précédente est bien supprimée à la sauvegarde (testé sur le vrai chemin).</p></div>
    <div class="chlog"><h3>v2.33 — Remplacement net</h3><p class="hint">En mode remplacement (clic direct), l'ancienne fiche est supprimée et remplacée par la nouvelle ; les autres alternatives sont conservées. Le mode ajout n'écrase toujours rien.</p></div>
    <div class="chlog"><h3>v2.32 — Picker ajout vs remplacement</h3><p class="hint">Bouton flèches supprimé (le clic direct remplace déjà). Bouton + en calques : ouvre le choix Idealo et ajoute la fiche aux alternatives sans toucher à la sélection. Pastille de mode dans le panneau.</p></div>
    <div class="chlog"><h3>v2.31 — Barre d'actions pleine largeur</h3><p class="hint">Mini-boutons en pleine largeur aux coins arrondis assortis, animation de refresh aussi dessus. Crayon = modifier la fiche, libellés précisés (page Idealo, changer de X, ajouter une alternative qui n'écrase plus la sélection).</p></div>
    <div class="chlog"><h3>v2.30 — Échec refresh visible</h3><p class="hint">Prix non actualisé : composant surligné jaune pâle, bouton re-actualiser à gauche du prix, icône d'avertissement à droite. Le drapeau s'efface au succès ou à la modification manuelle.</p></div>
    <div class="chlog"><h3>v2.29 — Correctif icônes résumé</h3><p class="hint">Les icônes du résumé ne clignotent plus : conversion Lucide appliquée à chaque rendu du panneau.</p></div>
    <div class="chlog"><h3>v2.28 — Prix à 2 décimales et écarts intégrés</h3><p class="hint">Tous les prix à 2 décimales façon Idealo, libellés des totaux à la même taille que les montants, et ligne budget remplacée par l'écart affiché à gauche de chaque total (infobulle explicative au survol).</p></div>
    <div class="chlog"><h3>v2.27 — Listes Idealo + clés USB & cartes mémoire</h3><p class="hint">Pâte thermique et câbles d'alim. sur leurs vraies pages listes Idealo (avec vendeur et port inclus), hub remplacé par clés USB + cartes mémoire, webcam avant l'écran. Correctif : rechargement qui rangeait les ajouts ailleurs (vieux cache JS).</p></div>
    <div class="chlog"><h3>v2.26 — Nouveaux types ajoutables</h3><p class="hint">Popup d'ajout enrichie : pâte thermique, HDD, ventilateurs, câbles d'alim., logiciels, onduleur, switch, routeur, tablette graphique, hub, dock, imprimante, stockage externe, enceintes, webcam, carte son, acquisition, support écran — chacun avec sa catégorie Idealo, sans encombrer le menu de gauche.</p></div>
    <div class="chlog"><h3>v2.25 — Couleurs meilleur prix & promo</h3><p class="hint">Prix en vert quand c'est le meilleur, orange + % quand une remise est disponible (bon plan Idealo ou remise saisie), € vert quand mieux existe ailleurs. Le % reste affiché tant qu'une remise existe.</p></div>
    <div class="chlog"><h3>v2.24 — Sections repliables</h3><p class="hint">PC / Setup / Autres repliables (titre + total conservés, pointillés repliés avec le contenu), textes agrandis, ligne budget réduite à l'écart avec phrase explicative au survol.</p></div>
    <div class="chlog"><h3>v2.23 — Résumé enrichi</h3><p class="hint">Petite icône par composant dans le résumé, lignes pointillées sous chaque section, et clic sur une ligne pour retrouver et surligner le composant à gauche.</p></div>
    <div class="chlog"><h3>v2.22 — Refresh visible et complet</h3><p class="hint">Popup « Actualisation des prix » persistante avec compteur, composants en cours grisés avec animation de chargement, et prix des alternatives aussi actualisés (requêtes dédupliquées par page).</p></div>
    <div class="chlog"><h3>v2.21 — Pastilles bon prix & bon plan</h3><p class="hint">Refresh : pastille verte € si un meilleur prix existe (info-bulle), pastille orange % si le marchand est un bon plan Idealo (prix affiché en orange). Les deux s'effacent à l'ouverture des marchands, où la meilleure offre totale porte le € et les promos le %.</p></div>
    <div class="chlog"><h3>v2.20 — Prix actualisés auto</h3><p class="hint">Au démarrage, chargement, import ou restauration : les prix des fiches liées sont re-fetchés en arrière-plan (offre du même vendeur, sinon moins cher ; fiches en cours d'édition épargnées).</p></div>
    <div class="chlog"><h3>v2.19 — Marchand auto fiabilisé</h3><p class="hint">Sélection auto du moins cher avec double reprise (rendu partiel rechargé sans cache, 429/timeout réessayé) et message visible avec repli vers le bouton boutique en cas d'échec.</p></div>
    <div class="chlog"><h3>v2.18 — Détails d'affichage</h3><p class="hint">Bouton de suppression plus grand, marges entre les sections, emplacements ajoutés nommés ssd_1, opt_2… au lieu d'identifiants aléatoires.</p></div>
    <div class="chlog"><h3>v2.17 — Ajout ciblé de composants</h3><p class="hint">Les boutons d'ajout (« composant PC », « élément setup », « autre élément ») ouvrent une popup de choix du type, inséré sous le même type. Les emplacements ajoutés ont un bouton de suppression (×).</p></div>
    <div class="chlog"><h3>v2.16 — Achat + marchand le moins cher</h3><p class="hint">Bouton panier déplacé sur le bouton composant (ouvre la boutique de la fiche). À la sélection d'un composant, le marchand le moins cher est appliqué par défaut (vendeur, prix, port, lien), sans écraser vos saisies.</p></div>
    <div class="chlog"><h3>v2.15 — Marchands au clic</h3><p class="hint">Sélection du marchand au clic sur sa ligne (sans bouton), bouton panier vers la page de l'offre, et titre de popup corrigé.</p></div>
    <div class="chlog"><h3>v2.14 — Choix du marchand</h3><p class="hint">Le bouton boutique ouvre la liste des marchands lue sur la page Idealo (prix croissants, note, livraison) : un clic applique vendeur, prix, frais de port et lien de l'offre. Repli manuel si la liste est inaccessible.</p></div>
    <div class="chlog"><h3>v2.13 — Bureau, chaise, alimentation</h3><p class="hint">Bureau : vrai bureau de travail (Tabler desk, vérifié visuellement) ; chaise : fauteuil de bureau (Tabler armchair) ; alimentation : bloc + éclair (Lucide battery-charging).</p></div>
    <div class="chlog"><h3>v2.12 — Icônes affinées</h3><p class="hint">Refroidissement : ventilateur ; boîtier : vraie tour PC (pc-case) ; alimentation : éclair (wattage) ; bureau : mallette/espace de travail ; chaise : dossier haut (rocking-chair).</p></div>
    <div class="chlog"><h3>v2.11 — Vraies icônes composants</h3><p class="hint">Font Awesome Free n'a ni carte mère ni GPU : les visuels composants passent sur Lucide + Bootstrap Icons (gratuits) — cpu, motherboard, memory-stick, snowflake, hard-drive, gpu-card, box, plug-zap, lamp-desk, armchair, monitor, keyboard, mouse, square, headset. Repli automatique si un CDN est injoignable.</p></div>
    <div class="chlog"><h3>v2.10 — Vrai « Aperçu du produit »</h3><p class="hint">« Choisir » récupère désormais les specs exactes de la page produit Idealo (section Aperçu, une info par ligne, sans troncature) : la fiche s'ouvre aussitôt puis s'enrichit en arrière-plan sans écraser vos saisies.</p></div>
    <div class="chlog"><h3>v2.9 — Correctif specs rapides</h3><p class="hint">Les specs rapides ne répètent plus le nom du produit ni le prix (ni les faux produits « N produits »). Nettoyage aussi appliqué à l'affichage des fiches déjà enregistrées.</p></div>
    <div class="chlog"><h3>v2.8 — Alternatives unifiées</h3><p class="hint">« Ajouter une alternative » devient « Voir les alternatives » (texte et prix centrés). La section « Mes fiches » disparaît du panneau : chaque ligne d'alternative porte ses boutons ouvrir-sur-Idealo, modifier et supprimer. Le menu reste ouvert après vos actions.</p></div>
    <div class="chlog"><h3>v2.6 — Nouveau & brouillon auto</h3><p class="hint">Bouton Nouveau (avec confirmation si modifications non sauvées ; l’historique est conservé). Le brouillon courant est restauré tel quel au rechargement de la page.</p></div>
    <div class="chlog"><h3>v2.5 — Benchmarks YouTube natifs</h3><p class="hint">Vraies vidéos de benchmark chargées dans l'app pour votre trio CPU+GPU+RAM (miniatures, lecture intégrée, repli YouTube si l'auteur bloque l'intégration). Cache 24 h.</p></div>
    <div class="chlog"><h3>v2.4 — Catalogue Idealo natif</h3><p class="hint">Listes Idealo affichées directement dans l'app par catégorie (17 catégories réelles) : image, specs, prix « à partir de », offres, tri, filtre, pagination « charger plus », recherche. « Choisir » pré-remplit la fiche (nom, image, prix, lien). Cache 6 h, repli onglet en cas de limite.</p></div>
    <div class="chlog"><h3>v2.0 — Webapp (2026)</h3><p class="hint">Nouvelle webapp façon configomatic : fiches liées Idealo (specs rapides, vendeur, prix, remise, livraison incluse), manuels, changement boutique, alternatives triées avec écarts, suivi colis, historique des prix + budget, conso (W), benchmarks YouTube (CPU+GPU+RAM), simulateur PCIe, FR/EN, light/dark/système, PWA installable, 100 % local.</p></div>
    <div class="chlog"><h3>2025.08.09 — Excel FR/EN</h3><p class="hint">Config Maker tableur : PC + setup + options, quantités, livraison, totaux, manuel intégré.</p></div>`);
}

/* ---------- Tabs / pages ---------- */
function showPage(which) {
  ['config', 'bench', 'prices'].forEach(x => {
    $('#page-' + x).classList.toggle('hidden', x !== which);
    $('#tab' + x[0].toUpperCase() + x.slice(1)).classList.toggle('active', x === which);
  });
  if (which === 'bench') showBench();
  if (which === 'prices') drawPrices();
}

/* ---------- Theme / lang ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = prefs.theme || 'system';
  const ic = $('#themeBtn i');
  ic.className = prefs.theme === 'light' ? 'fa-solid fa-sun' : prefs.theme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-circle-half-stroke';
  $('#themeBtn').title = 'Thème : ' + (prefs.theme || 'système');
}
function applyLang() {
  document.documentElement.lang = lang;
  $$('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  $$('[data-i18n-ph]').forEach(el => el.placeholder = t(el.dataset.i18nPh));
  $$('[data-i18n-title]').forEach(el => el.title = t(el.dataset.i18nTitle));
  $('#langFlag').src = lang === 'fr' ? './assets/icons/uk.png' : './assets/icons/fr.png';
  $('#langBtn').title = lang === 'fr' ? 'Switch to English' : 'Passer en français';
}

/* ---------- PWA install ---------- */
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; });
function openInstall() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  openModal(lang === 'en' ? 'Install ConfigMaker' : 'Installer ConfigMaker', `
    <p class="hint">${lang === 'en'
      ? 'The site is an installable app (manifest + offline cache). Once added to the home screen it opens as a standalone app, not a browser tab.'
      : 'Le site est une app installable (manifest + cache hors-ligne). Une fois ajoutée à l’écran d’accueil, elle s’ouvre comme une vraie app, pas un onglet.'}</p>
    ${ios
      ? `<p>① <i class="fa-solid fa-share"></i> Partager → ② <strong>${lang === 'en' ? 'Add to Home Screen' : 'Sur l’écran d’accueil'}</strong> → ③ ${lang === 'en' ? 'Open from the icon' : 'Ouvrir depuis l’icône'}.</p>`
      : `<p>Chrome/Edge : menu ⋮ → <strong>${lang === 'en' ? 'Install app / Add to Home screen' : 'Installer l’application / Ajouter à l’écran d’accueil'}</strong>.</p>`}
    <div class="btn-row"><button class="btn btn-primary" id="i_go"><i class="fa-solid fa-mobile-screen-button"></i> ${lang === 'en' ? 'Install' : 'Installer'}</button></div>`);
  $('#i_go').onclick = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; closeModal(); }
    else toast(lang === 'en' ? 'Use the browser menu: Add to Home Screen' : 'Menu navigateur : Ajouter à l’écran d’accueil');
  };
}

/* ---------- Refresh ---------- */
function refresh() {
  compatCache = null;
  $('#configName').value = state.name;
  $('#budgetInput').value = state.budget;
  $('#versionChip').textContent = state.version ? 'v' + state.version : (lang === 'en' ? 'unsaved' : 'non sauvée');
  $('#sumConfigName').textContent = state.name || '';
  $('#sumVersionChip').textContent = state.version ? 'v' + state.version : (lang === 'en' ? 'unsaved' : 'non sauvée');
  renderSlots(); renderSummary();
  updateCompatBadge();
  if (sumTab === 'compat') renderCompat();
  if (!$('#page-prices').classList.contains('hidden')) drawPrices();
}

/* ---------- Events ---------- */
function bind() {
  $('#configName').addEventListener('input', e => { state.name = e.target.value; persist(); });
  $('#budgetInput').addEventListener('input', e => { state.budget = parseFloat(e.target.value) || 0; persist(); renderSummary(); if (!$('#page-prices').classList.contains('hidden')) drawPrices(); });
  $('#saveBtn').onclick = doSave;
  $('#sumSaveBtn').onclick = doSave;
  $('#newBtn').onclick = newConfig;
  $('#loadBtn').onclick = openLoad;
  $('#historyBtn').onclick = openHistory;
  $('#shareBtn').onclick = openShare;
  $('#exportBtn').onclick = openExport;
  $('#exportAllBtn').onclick = exportAll;
  $('#footExport').onclick = e => { e.preventDefault(); exportAll(); };
  $('#versionBtn').onclick = openChangelog;
  $('#footChangelog').onclick = e => { e.preventDefault(); openChangelog(); };
  $('#tabConfig').onclick = () => showPage('config');
  $('#tabBench').onclick = () => showPage('bench');
  $('#tabPrices').onclick = () => showPage('prices');
  $('#sumDesc').onclick = () => switchSum('desc');
  $('#sumCharts').onclick = () => switchSum('charts');
  $('#sumPower').onclick = () => switchSum('power');
  $('#sumCompat').onclick = () => switchSum('compat');
  $('#summaryFold').onclick = () => $('#summaryBody').classList.toggle('collapsed');
  $('#pickerClose').onclick = closePicker;
  $('#pickerNewBtn').onclick = () => openProductForm(activeSlot, null, pickerMode === 'add' ? { addOnly: true } : {});
  const goIdealo = () => {
    const q = $('#idealoQuery').value.trim() || slotName(activeSlot);
    const url = idealoSearchUrl(q);
    currentIdealoUrl = url;
    $('#pickerIdealoSearch').href = url;
    const f = $('#idealoOpenFallback'); if (f) f.onclick = () => window.open(url, '_blank', 'noopener');
    currentCatLabel = `“${q}”`;
    loadIdealoList(url);
  };
  $('#idealoGo').onclick = goIdealo;
  $('#idealoQuery').addEventListener('keydown', e => { if (e.key === 'Enter') goIdealo(); });
  $('#idealoFilter').addEventListener('input', e => { idealQ = e.target.value; idealShown = IDEAL_PAGE; renderIdealo(); });
  $('#idealoSort').addEventListener('change', e => {
    idealSort = e.target.value; idealShown = IDEAL_PAGE;
    if (!idealBase || idealFetched[idealSort]) renderIdealo();
    else loadIdealoList(null, 'variant');
  });
  $('#idealoMore').onclick = () => idealMore();
  $('#idealoRetry').onclick = () => loadIdealoList(idealBase || currentIdealoUrl, 'fresh');
  $('#idealoChoose').onclick = async () => {
    if (!activeSlot) return;
    const url = $('#idealoUrl').value.trim();
    if (!url || !/idealo\.fr\/prix\//i.test(url)) { toast(lang === 'en' ? 'Paste an exact /prix/ listing URL' : 'Collez une URL exacte de fiche /prix/'); return; }
    const slotId = activeSlot, addOnly = pickerMode === 'add';
    const btn = $('#idealoChoose');
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> <span>${lang === 'en' ? 'Adding item…' : 'Ajout de l’élément…'}</span>`;
    const np = blankProduct();
    np.idealo = url;
    dsFetchStart(np); idealoAttempted.add(np.id);
    try {
      const [d, r] = await Promise.all([Idealo.product(url), Idealo.offers(url)]);
      if ((!d || d.error) && (!r || r.error || !r.offers.length)) {
        toast(lang === 'en' ? 'Idealo page unreachable — retry later' : 'Page Idealo injoignable — réessayez plus tard');
        return;
      }
      if (d && !d.error) {
        if (d.name) np.name = d.name;
        if (d.img) np.image = d.img;
        if (d.specs) np.specs = d.specs;
        if (d.datasheet) np.datasheet = d.datasheet;
        if (d.variants && d.variants.items && d.variants.items.length) np.variants = d.variants;
        if (d.price && !np.price) np.price = d.price;
      }
      if (r && !r.error && r.offers.length) {
        const o = r.offers[0]; // cheapest first
        if (o.merchant && !np.vendor) np.vendor = o.merchant;
        if (o.price) np.price = o.price;
        if (o.delivered > 0 && o.price) np.delivery = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
        if (o.url && !np.store) np.store = o.url;
        if (o.promo) np.promo = true;
      }
      if (!np.name) { // fallback: prettified URL slug
        try {
          const slug = decodeURIComponent(url.split('?')[0].split('/').filter(Boolean).pop().replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').trim());
          np.name = slug.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
        } catch { /* ignore */ }
      }
      if (!np.name) { toast(lang === 'en' ? 'Could not read this page' : 'Lecture de la page impossible'); return; }
      const s = state.slots[slotId];
      if (!s) return;
      const prevSelected = s.selectedId;
      s.products.push(np);
      if (!addOnly || !s.selectedId) s.selectedId = np.id;
      if (!addOnly && prevSelected && prevSelected !== np.id) s.products = s.products.filter(x => x.id !== prevSelected); // replace mode
      persist(); compatCache = null; refresh(); renderPicker();
      queueAlternativeData(slotId);
      toast(lang === 'en' ? 'Component imported from Idealo' : 'Composant importé depuis Idealo');
    } finally {
      dsFetchEnd(np);
      btn.disabled = false;
      btn.innerHTML = orig;
    }
  };
  $('#phTotal').onclick = () => { phMode = 'total'; $('#phTotal').classList.add('active'); $('#phPer').classList.remove('active'); drawPrices(); };
  $('#phPer').onclick = () => { phMode = 'per'; $('#phPer').classList.add('active'); $('#phTotal').classList.remove('active'); drawPrices(); };
  $('#benchCopy').onclick = () => { navigator.clipboard?.writeText(benchQuery()); toast(lang === 'en' ? 'Copied' : 'Copié'); };
  $('#benchExtraGo').onclick = () => { benchYtKey = ''; loadBenchYt(benchQuery(), benchRun); };
  $('#benchExtra').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); benchYtKey = ''; loadBenchYt(benchQuery(), benchRun); } };
  $('#themeBtn').onclick = () => { prefs.theme = prefs.theme === 'light' ? 'dark' : prefs.theme === 'dark' ? 'system' : 'light'; save(LS.prefs, { ...load(LS.prefs, {}), theme: prefs.theme, lang }); applyTheme(); };
  $('#langBtn').onclick = () => { lang = lang === 'fr' ? 'en' : 'fr'; save(LS.prefs, { ...load(LS.prefs, {}), lang, theme: prefs.theme }); applyLang(); refresh(); };
  $('#installBtn').onclick = openInstall;
  $('#modalClose').onclick = closeModal;
  const aiPop = $('#aiPopup'), aiInput = $('#aiInput');
  const aiToggle = () => { if (aiPop) { aiPop.classList.toggle('hidden'); if (!aiPop.classList.contains('hidden') && aiInput) setTimeout(() => aiInput.focus(), 50); } };
  const aiSend = () => {
    const q = (aiInput && aiInput.value.trim()) || '';
    if (!q) { if (aiInput) aiInput.focus(); return; }
    window.open('https://www.perplexity.ai/search?q=' + encodeURIComponent(q), '_blank', 'noopener');
  };
  const aiBubble = $('#aiBubble');
  if (aiBubble) {
    aiBubble.onclick = aiToggle;
    aiBubble.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); aiToggle(); } };
  }
  const aiClose = $('#aiClose');
  if (aiClose) aiClose.onclick = () => aiPop && aiPop.classList.add('hidden');
  const aiSendBtn = $('#aiSend');
  if (aiSendBtn) aiSendBtn.onclick = aiSend;
  if (aiInput) aiInput.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') aiSend(); });
  $('#modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  const burger = $('#burger'), menu = $('#menu');
  const toggle = () => { menu.classList.toggle('show'); $('.q').classList.toggle('a'); $('.w').classList.toggle('b'); $('.e').classList.toggle('c'); };
  burger.addEventListener('click', toggle);
  $('#burgerClose').onclick = toggle;
  window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 10), { passive: true });
  document.body.classList.toggle('scrolled', scrollY > 10);
  // parallax orbs
  const orbs = $$('[data-bg-parallax]');
  window.addEventListener('scroll', () => { orbs.forEach(o => { o.style.transform = `translateY(${scrollY * parseFloat(o.dataset.bgParallax)}px)`; }); }, { passive: true });
}

/* ---------- Init ---------- */
(async function init() {
  try { // adopt IndexedDB data when strictly newer, then read prefs/lang fresh
    const r = await Promise.race([
      (typeof StoreDB !== 'undefined' ? StoreDB.ready : Promise.resolve(null)),
      new Promise(res => setTimeout(() => res(null), 2000)),
    ]);
    if (r && r.adopted) state = load(LS.state, null) || state;
  } catch { /* LS seed already rendered below */ }
  prefs = { theme: load(LS.prefs, {}).theme || 'system', lang };
  lang = load(LS.prefs, {}).lang || 'fr';
  // load from share link
  if (location.hash.includes('#c=')) {
    try { importConfig(decodeShare(location.hash)); toast(lang === 'en' ? 'Config loaded from link' : 'Config chargée depuis le lien'); } catch { /* ignore */ }
  } else baselineSaved(); // draft restored as-is; dirty iff different from last save
  window.addEventListener('beforeunload', () => { persist(); try { if (typeof StoreDB !== 'undefined') StoreDB.flush(); } catch {} }); // belt & braces: draft always restorable
  applyTheme(); applyLang(); bind(); refresh(); showBench();
  schedulePriceRefresh(2500); // refresh stored prices shortly after (draft restored)
})();
