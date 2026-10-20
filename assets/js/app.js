/* ConfigMaker v2.4 — vanilla JS, 100% local (localStorage), GitHub Pages friendly.
   Idealo: native listings via Jina Reader (cached 6h) + manual fiches. No "add to cart". */
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9);
const LS = { state: 'cmv2.state', configs: 'cmv2.configs', hist: 'cmv2.hist', prefs: 'cmv2.prefs' };
const APP_VERSION = '2.55';
const load = (k, fb) => { try { const v = (typeof StoreDB !== 'undefined' ? StoreDB.getRaw(k) : localStorage.getItem(k)); return v != null ? JSON.parse(v) : fb; } catch { return fb; } };
/* save() reports quota failures instead of swallowing them (callers must check). */
const save = (k, v) => {
  try {
    if (k !== LS.prefs && storeConsent() === 'denied') return true; // memoire seule : ecriture refusee, app fonctionnelle
    if (typeof StoreDB !== 'undefined') return StoreDB.putRaw(k, JSON.stringify(v));
    localStorage.setItem(k, JSON.stringify(v)); return true;
  } catch (e) { return { quota: true, err: e }; }
};
/* ---------- Consentement stockage ---------- */
function storeConsent() { try { return (typeof prefs !== 'undefined' && prefs && prefs.storeConsent) || load(LS.prefs, {}).storeConsent || null; } catch { return null; } }
function setStoreConsent(v) {
  try { prefs = { ...(typeof prefs !== 'undefined' ? prefs : {}), storeConsent: v }; } catch { /* ignore */ }
  try {
    const raw = JSON.stringify(load(LS.prefs, {}));
    const next = { ...JSON.parse(raw || '{}'), storeConsent: v };
    if (typeof StoreDB !== 'undefined') StoreDB.putRaw(LS.prefs, JSON.stringify(next));
    else localStorage.setItem(LS.prefs, JSON.stringify(next));
  } catch { /* ignore */ }
  const bar = $('#consentBar'); if (bar) bar.classList.add('hidden');
}
function showConsentBar() { const bar = $('#consentBar'); if (bar) { bar.classList.remove('hidden'); refreshIcons(); } }
function maybeConsentBar() { try { if (!storeConsent()) showConsentBar(); } catch { /* ignore */ } }
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
  { id: 'multiprise', sec: 'setup', icon: 'lucide:plug', q: 'multiprise parafoudre', w: 0, extra: true },
  { id: 'switch', sec: 'setup', icon: 'lucide:network', q: 'switch réseau', w: 10, extra: true },
  { id: 'router', sec: 'setup', icon: 'lucide:router', q: 'routeur wifi', w: 12, extra: true },
  { id: 'nas', sec: 'setup', icon: 'lucide:server', q: 'NAS stockage réseau', w: 30, extra: true },
  { id: 'graphictab', sec: 'setup', icon: 'lucide:pen-tool', q: 'tablette graphique', w: 5, extra: true },
  { id: 'usbstick', sec: 'setup', icon: 'lucide:usb', q: 'clé USB', w: 0, extra: true },
  { id: 'memcard', sec: 'setup', icon: 'lucide:circuit-board', q: 'carte mémoire SD microSD', w: 0, extra: true },
  { id: 'dock', sec: 'setup', icon: 'lucide:monitor-smartphone', q: "station d'accueil", w: 45, extra: true },
  { id: 'printer', sec: 'setup', icon: 'lucide:printer', q: 'imprimante', w: 30, extra: true },
  { id: 'extstorage', sec: 'setup', icon: 'lucide:database', q: 'disque dur externe', w: 8, extra: true },
  { id: 'extssd', sec: 'setup', icon: 'lucide:hard-drive', q: 'SSD externe', w: 0, extra: true },
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
    'picker.moreFilters': 'Plus de filtres',
    'picker.clearFilters': 'Effacer les filtres',
    'picker.searchOpt': 'Rechercher…',
    'picker.filtersHint': "Filtres Idealo identiques au site. Plusieurs valeurs dans un même filtre = OU ; les filtres se cumulent = ET.",
    'sum.desc': 'Description', 'sum.charts': 'Graphiques', 'sum.power': 'Conso.', 'sum.compat': 'Compat', 'sum.fold': 'Résumé', 'sum.powerTitle': 'Consommation (W)',
    'bench.title': 'Benchmarks', 'bench.open': 'Voir sur YouTube', 'bench.copy': 'Copier la recherche',
    'bench.loading': 'Chargement des vidéos…', 'bench.play': 'Lire',
    'bench.err': 'Vidéos non chargeables pour le moment (limite de requêtes). Utilisez les liens ci-dessous.',
    'bench.brief': "Résumé d'usage", 'bench.daily': 'Quotidien', 'bench.gaming': 'Jeu (FPS iobit)', 'bench.pro': 'Charges lourdes',
    'bench.video': 'Montage / 3D', 'bench.compile': 'Compilation', 'bench.ai': 'IA locale',
    'bench.videos': 'Vidéos', 'bench.extraPh': 'Préciser la recherche… (ex : ray tracing, undervolt)', 'bench.search': 'Chercher',
    'bench.needs': 'Sélectionnez un CPU + un GPU (ou un graphique intégré) pour charger les benchmarks.',
    'bench.needBoth': 'CPU + GPU requis (composants absents ou hors base iobit)', 'bench.needCpu': 'CPU requis.',
    'bench.nodata': 'Pas de données — réessayez plus tard.', 'bench.topruns': 'Médiane des meilleurs runs publics (biais optimiste)',
    'bench.typical': 'médianes par panier', 'bench.tsGpu': 'GPU typique', 'bench.tsCpu': 'CPU typique',
    'bench.single': 'Mono-cœur', 'bench.multi': 'Multi-cœurs',
    'bench.btCpu': 'CPU limite — ce couple obtient moins que la moyenne de ce GPU', 'bench.btGpu': 'Config limitée par le GPU (normal à cette résolution)', 'bench.btOk': 'Couple équilibré',
    'bench.q_low': 'Bas', 'bench.q_medium': 'Moyen', 'bench.q_high': 'Élevé', 'bench.q_ultra': 'Ultra', 'bench.q_max': 'Max',
    'bench.iobit': 'Ouvrir le calculateur iobit', 'bench.retry': 'Réessayer', 'bench.typErr': 'Typiques indisponibles pour le moment.',
    'bench.estSrc': 'iobit, estimations', 'bench.tsOpen': 'Voir sur 3DMark', 'bench.gbOpen': 'Voir sur Geekbench',
    'bench.copied': 'Noms CPU/GPU/jeu copiés — collez-les dans le calculateur iobit',
    'bench.stOk': 'Bon', 'bench.stWarn': 'Moyen', 'bench.stErr': 'Mauvais',
    'bench.tsCombo': 'Combiné',
    'welcome.title': 'Bienvenue sur ConfigMaker', 'welcome.new': 'Nouveau', 'welcome.name': 'Nom', 'welcome.budget': 'Budget (€)',
    'welcome.createAi': 'Créer avec IA', 'welcome.load': 'Charger une config', 'welcome.empty': 'Aucune config enregistrée.',
    'welcome.open': 'Ouvrir', 'welcome.back': 'Retour', 'welcome.usage': 'Utilisation',
    'welcome.usagePh': 'Ex : jeu 1440p, montage vidéo 4K, silencieux…',
    'welcome.sendPplx': 'Envoyer à Perplexity', 'welcome.sentHint': 'Prompt envoyé — copiez la réponse Perplexity ci-dessous.',
    'welcome.pastedHint': 'Collez la réponse Perplexity ci-dessous :', 'welcome.pastePh': 'Processeur : AMD Ryzen 5 7600\n\nCarte graphique : ASUS GeForce RTX 5060 Ti\n\n…',
    'welcome.build': 'Construire la config', 'welcome.searching': 'Recherche…', 'welcome.importing': 'Import…',
    'welcome.skipped': 'Ignoré', 'welcome.skippedN': 'ignoré(s)', 'welcome.notFound': 'Introuvable',
    'welcome.askSlot': 'Type inconnu — choisissez le slot :', 'welcome.askWait': 'En attente…', 'welcome.skip': 'Ignorer',
    'welcome.openConfig': 'Ouvrir la config', 'welcome.needsUsage': 'Décrivez l’utilisation d’abord.', 'welcome.noParse': 'Aucune ligne « type : référence » trouvée.',
    'welcome.feat1': 'Prix Idealo en direct', 'welcome.feat2': 'Compatibilité vérifiée', 'welcome.feat3': 'Benchmarks & conso',
    'welcome.feat4': 'Open source · 100 % local', 'welcome.stop': 'Arrêter', 'welcome.stopped': 'arrêté', 'welcome.results': 'résultats', 'welcome.choose': 'Choisir',
    'welcome.noStore': 'Stockage local non accepté — les configs ne seront pas sauvegardées.', 'welcome.askAgain': 'Redemander',
    'welcome.del': 'Supprimer', 'welcome.delConfirm': 'Supprimer cette config ?', 'welcome.yes': 'Oui', 'welcome.no': 'Non',
    'consent.msg': 'Ce site stocke vos configs localement. Accepter ?', 'consent.accept': 'Accepter', 'consent.deny': 'Refuser',
    'consent.saveBlocked': 'Sauvegarde désactivée (stockage refusé) — JSON exporté en secours.', 'consent.deniedHint': 'Stockage refusé : mode mémoire seule.',
    'prices.title': 'Historique des prix', 'prices.total': 'Total config', 'prices.per': 'Par composant', 'prices.power': 'Consommation', 'prices.perMonth': 'Prix / mois', 'prices.perYear': 'Prix / an', 'prices.hint': 'Un point est ajouté à chaque sauvegarde. Le budget est affiché en ligne pointillée (vue total). Survolez la courbe pour le détail par date.',
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
    'picker.moreFilters': 'More filters',
    'picker.clearFilters': 'Clear filters',
    'picker.searchOpt': 'Search…',
    'picker.filtersHint': 'Idealo filters, identical to the site. Several values in one filter = OR; filters combine = AND.',
    'sum.desc': 'Summary', 'sum.charts': 'Charts', 'sum.power': 'Power', 'sum.compat': 'Compat', 'sum.fold': 'Summary', 'sum.powerTitle': 'Power draw (W)',
    'bench.title': 'Benchmarks', 'bench.open': 'Open on YouTube', 'bench.copy': 'Copy search',
    'bench.loading': 'Loading videos…', 'bench.play': 'Play',
    'bench.err': 'Videos unavailable right now (rate limit). Use the links below.',
    'bench.brief': 'Usage summary', 'bench.daily': 'Daily use', 'bench.gaming': 'Gaming (iobit FPS)', 'bench.pro': 'Heavy workloads',
    'bench.video': 'Editing / 3D', 'bench.compile': 'Compiling', 'bench.ai': 'Local AI',
    'bench.videos': 'Videos', 'bench.extraPh': 'Refine the search… (e.g. ray tracing, undervolt)', 'bench.search': 'Search',
    'bench.needs': 'Select a CPU + GPU (or integrated graphics) to load benchmarks.',
    'bench.needBoth': 'CPU + GPU required (missing parts or outside iobit DB)', 'bench.needCpu': 'CPU required.',
    'bench.nodata': 'No data — retry later.', 'bench.topruns': 'Median of top public runs (optimistic bias)',
    'bench.typical': 'bucket medians', 'bench.tsGpu': 'Typical GPU', 'bench.tsCpu': 'Typical CPU',
    'bench.single': 'Single-core', 'bench.multi': 'Multi-core',
    'bench.btCpu': 'CPU-limited — this combo scores below this GPU average', 'bench.btGpu': 'GPU-bound config (normal at this resolution)', 'bench.btOk': 'Balanced combo',
    'bench.q_low': 'Low', 'bench.q_medium': 'Medium', 'bench.q_high': 'High', 'bench.q_ultra': 'Ultra', 'bench.q_max': 'Max',
    'bench.iobit': 'Open the iobit calculator', 'bench.retry': 'Retry', 'bench.typErr': 'Typical scores unavailable right now.',
    'bench.estSrc': 'iobit, estimates', 'bench.tsOpen': 'View on 3DMark', 'bench.gbOpen': 'View on Geekbench',
    'bench.copied': 'CPU/GPU/game names copied — paste them into the iobit calculator',
    'bench.stOk': 'Good', 'bench.stWarn': 'Fair', 'bench.stErr': 'Poor',
    'bench.tsCombo': 'Combined',
    'welcome.title': 'Welcome to ConfigMaker', 'welcome.new': 'New', 'welcome.name': 'Name', 'welcome.budget': 'Budget (€)',
    'welcome.createAi': 'Create with AI', 'welcome.load': 'Load a config', 'welcome.empty': 'No saved configs yet.',
    'welcome.open': 'Open', 'welcome.back': 'Back', 'welcome.usage': 'Usage',
    'welcome.usagePh': 'E.g. 1440p gaming, 4K video editing, silent…',
    'welcome.sendPplx': 'Send to Perplexity', 'welcome.sentHint': 'Prompt sent — paste the Perplexity answer below.',
    'welcome.pastedHint': 'Paste the Perplexity answer below:', 'welcome.pastePh': 'CPU: AMD Ryzen 5 7600\n\nGPU: ASUS GeForce RTX 5060 Ti\n\n…',
    'welcome.build': 'Build config', 'welcome.searching': 'Searching…', 'welcome.importing': 'Importing…',
    'welcome.skipped': 'Skipped', 'welcome.skippedN': 'skipped', 'welcome.notFound': 'Not found',
    'welcome.askSlot': 'Unknown type — pick a slot:', 'welcome.askWait': 'Waiting…', 'welcome.skip': 'Skip',
    'welcome.openConfig': 'Open config', 'welcome.needsUsage': 'Describe the usage first.', 'welcome.noParse': 'No “type: reference” lines found.',
    'welcome.feat1': 'Live Idealo prices', 'welcome.feat2': 'Checked compatibility', 'welcome.feat3': 'Benchmarks & power',
    'welcome.feat4': 'Open source · 100% local', 'welcome.stop': 'Stop', 'welcome.stopped': 'stopped', 'welcome.results': 'results', 'welcome.choose': 'Choose',
    'welcome.noStore': 'Local storage not accepted — configs will not be saved.', 'welcome.askAgain': 'Ask again',
    'welcome.del': 'Delete', 'welcome.delConfirm': 'Delete this config?', 'welcome.yes': 'Yes', 'welcome.no': 'No',
    'consent.msg': 'This site stores your configs locally. Accept?', 'consent.accept': 'Accept', 'consent.deny': 'Decline',
    'consent.saveBlocked': 'Saving disabled (storage declined) — JSON exported as backup.', 'consent.deniedHint': 'Storage declined: memory-only mode.',
    'prices.title': 'Price history', 'prices.total': 'Config total', 'prices.per': 'Per part', 'prices.power': 'Power draw', 'prices.perMonth': 'Cost / month', 'prices.perYear': 'Cost / year', 'prices.hint': 'One point is added on each save. Budget is the dotted line (total view). Hover the curve for per-date details.',
    'dl.title': 'Original Excel files', 'footer.tag': 'Idealo prices, power draw, manuals — 100% local, no cart.', 'ai.title': 'Ask to Perplexity', 'ai.ph': 'Ask your question…',
  }
};
const SLOT_NAMES = {
  fr: { cpu: 'Processeur', mb: 'Carte mère', ram: 'RAM', cooler: 'Refroidissement', thermal: 'Pâte thermique', ssd1: 'SSD', hdd: 'Disque dur', gpu: 'Carte graphique', case: 'Boîtier', fans: 'Ventilateurs', psu: 'Alimentation', psucables: "Câbles d'alim.", os: 'OS', soft: 'Logiciels', desk: 'Bureau', chair: 'Chaise', screen1: 'Écran', keyboard: 'Clavier', mouse: 'Souris', pad: 'Tapis', headset: 'Casque', gamepad: 'Manette', ups: 'Onduleur', multiprise: 'Multiprise', switch: 'Switch', router: 'Routeur', nas: 'NAS', graphictab: 'Tablette graphique', usbstick: 'Clés USB', memcard: 'Cartes mémoire', hub: 'Hub USB', dock: "Station d'accueil", printer: 'Imprimante', extstorage: 'Disque dur externe', extssd: 'SSD externe', speakers: 'Enceintes', webcam: 'Webcam', soundcard: 'Carte son ext.', capture: "Boîtier d'acquisition", netcard: 'Carte réseau', monitorarm: 'Support écran', opt1: 'Option 1', opt2: 'Option 2', opt3: 'Option 3', pc: 'PC', setup: 'Setup', others: 'Autres' },
  en: { cpu: 'CPU', mb: 'Motherboard', ram: 'RAM', cooler: 'Cooling', thermal: 'Thermal paste', ssd1: 'SSD', hdd: 'HDD', gpu: 'Graphics card', case: 'Case', fans: 'Fans', psu: 'Power supply', psucables: 'PSU cables', os: 'OS', soft: 'Software', desk: 'Desk', chair: 'Chair', screen1: 'Monitor', keyboard: 'Keyboard', mouse: 'Mouse', pad: 'Mouse pad', headset: 'Headset', gamepad: 'Gamepad', ups: 'UPS', multiprise: 'Power strip', switch: 'Switch', router: 'Router', nas: 'NAS', graphictab: 'Drawing tablet', usbstick: 'USB sticks', memcard: 'Memory cards', hub: 'USB hub', dock: 'Docking station', printer: 'Printer', extstorage: 'External hard drive', extssd: 'External SSD', speakers: 'Speakers', webcam: 'Webcam', soundcard: 'Ext. sound card', capture: 'Capture card', netcard: 'Network card', monitorarm: 'Monitor arm', opt1: 'Option 1', opt2: 'Option 2', opt3: 'Option 3', pc: 'PC', setup: 'Setup', others: 'Others' },
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
  return { name: 'Ma Config', budget: 1500, version: '', slots, order: SLOT_DEFS.filter(d => !d.extra).map(d => d.id), usage: defaultUsage() };
}
let state = load(LS.state, null) || defaultState();
if (!state.order) state.order = Object.keys(state.slots);
/* Migration: the PC-usage/tarification config used to live in prefs; move it into the config once. */
if (!state.usage) {
  let seeded = null;
  try { const p = load(LS.prefs, {}); if (p && (p.usage || p.tarif || p.priceHP || p.priceHC)) seeded = p; } catch { /* ignore */ }
  state.usage = normUsage(seeded || {});
}
let activeSlot = null, phMode = 'total', sumTab = 'desc';
let sheetHideTimer = null;
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
function isMobileView() { return window.matchMedia('(max-width:960px)').matches; }
function updateMobileTotalBar() {
  const bar = $('#mobileTotalBar');
  if (!bar) return;
  const T = totals();
  const onConfig = !$('#page-config').classList.contains('hidden');
  const show = isMobileView() && onConfig;
  bar.classList.toggle('hidden', !show);
  const label = $('#mtLabel'), total = $('#mtTotal'), deliv = $('#mtDelivery');
  if (label) label.textContent = 'Total';
  if (total) total.textContent = eur(T.total - T.deliv);
  if (deliv) deliv.textContent = `${eur(T.total)} ${lang === 'en' ? `(incl. ${eur(T.deliv)} delivery)` : `(dont ${eur(T.deliv)} de livraison)`}`;
  if (!show) closeSummarySheet();
}
function showMobileScrim() {
  const s = $('#mobileScrim');
  if (!s || !isMobileView()) return;
  clearTimeout(sheetHideTimer);
  s.classList.remove('hidden');
}
function hideMobileScrim() {
  const s = $('#mobileScrim');
  if (!s) return;
  clearTimeout(sheetHideTimer);
  sheetHideTimer = setTimeout(() => {
    if (!document.body.classList.contains('summary-sheet-open') && !document.body.classList.contains('picker-sheet-open')) s.classList.add('hidden');
  }, 360);
}
function openSummarySheet() {
  if (!isMobileView()) return;
  const panel = $('#summaryPanel');
  if (!panel) return;
  const hadPicker = document.body.classList.contains('picker-sheet-open');
  $('#pickerPanel').classList.add('hidden');
  document.body.classList.remove('picker-sheet-open');
  panel.classList.remove('hidden');
  panel.scrollTop = 0;
  $('#summaryBody').classList.remove('collapsed');
  showMobileScrim();
  void panel.offsetHeight;
  document.body.classList.add('summary-sheet-open');
  $('#mobileTotalBtn')?.setAttribute('aria-expanded', 'true');
  if (hadPicker) { activeSlot = null; renderSlots(); }
}
function closeSummarySheet() {
  if (!document.body.classList.contains('summary-sheet-open')) return;
  document.body.classList.remove('summary-sheet-open');
  $('#mobileTotalBtn')?.setAttribute('aria-expanded', 'false');
  hideMobileScrim();
}
function toggleSummarySheet() {
  document.body.classList.contains('summary-sheet-open') ? closeSummarySheet() : openSummarySheet();
}
function openPickerSheet() {
  if (!isMobileView()) return;
  const panel = $('#pickerPanel');
  if (!panel) return;
  document.body.classList.remove('summary-sheet-open');
  $('#summaryPanel').classList.add('hidden');
  $('#mobileTotalBtn')?.setAttribute('aria-expanded', 'false');
  panel.classList.remove('hidden');
  showMobileScrim();
  void panel.offsetHeight;
  document.body.classList.add('picker-sheet-open');
}
function closePickerSheet() {
  if (!document.body.classList.contains('picker-sheet-open')) return;
  document.body.classList.remove('picker-sheet-open');
  hideMobileScrim();
  setTimeout(() => {
    if (!document.body.classList.contains('picker-sheet-open')) $('#pickerPanel').classList.add('hidden');
  }, 380);
}
function closeMobileSheets() {
  closeSummarySheet();
  closePickerSheet();
}
function stampVersion(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}-${p(d.getHours())}.${p(d.getMinutes())}`;
}
function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.remove('hidden'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 2400); }

/* ---------- Modal ---------- */
const MODAL_SIZES = ['modal-xl', 'modal-wide'];
function openModal(title, html, cls) { $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; const box = $('#modalBox'); if (box) { box.classList.remove(...MODAL_SIZES); if (cls) box.classList.add(cls); } $('#modalOverlay').classList.remove('hidden'); }
function closeModal() { $('#modalOverlay').classList.add('hidden'); const box = $('#modalBox'); if (box) box.classList.remove(...MODAL_SIZES); editingPid = null; }
let editingPid = null;

/* ---------- Compatibility (Compat module) ---------- */
let compatCache = null, compatLastGood = null, compatFold = {};
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
function ensureVariants(slotId) { // background: fiches with an Idealo URL missing variants/datasheet/image
  const s = state.slots[slotId], p = s && sel(s);
  if (!p || !p.idealo || typeof Idealo === 'undefined') return;
  if (p.variants && p.datasheet && p.image && p.specs) return;
  if (idealoAttempted.has(p.id) || variantFetching.has(p.idealo)) return;
  idealoAttempted.add(p.id);
  variantFetching.add(p.idealo);
  dsFetchStart(p);
  Idealo.product(p.idealo).then(d => {
    variantFetching.delete(p.idealo);
    dsFetchEnd(p);
    if (!d || d.error) return;
    const cur = s.products.find(x => x.id === p.id);
    if (!cur) return;
    let changed = false;
    if (d.datasheet && !cur.datasheet) { cur.datasheet = d.datasheet; changed = true; }
    if (d.specs && !cur.specs) { cur.specs = d.specs; changed = true; }
    if (d.img && !cur.image) { cur.image = d.img; changed = true; }
    if (d.variants && d.variants.items && d.variants.items.length && !cur.variants) { cur.variants = d.variants; changed = true; }
    if (!changed) return;
    compatCache = null;
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
    try {
      compatCache = Compat.check({ order: state.order, slots: state.slots, sel, def: defOf, totals: totals(), lang, dsIds: [...dsLoading] });
      compatLastGood = compatCache;
    } catch (e) {
      /* A single bad component must never wipe the whole compatibility result:
         keep the last good one and surface the error for debugging. */
      console.error('Compat.check failed', e);
      compatCache = compatLastGood || { checks: {}, issues: { err: [], warn: [] }, statusOf: {} };
    }
  }
  return compatCache || { checks: {}, issues: { err: [], warn: [] }, statusOf: {} };
}
function updateCompatBadge() {
  const cc = getCompat(), err = cc.issues.err.length, warn = cc.issues.warn.length;
  const pill = $('#sumCompat');
  if (pill) { // red blink if any error, else yellow blink if warnings only
    pill.classList.toggle('has-err', err > 0);
    pill.classList.toggle('has-warn', err === 0 && warn > 0);
  }
  const b = $('#compatCount'); if (!b) return;
  b.innerHTML = (err || warn)
    ? `${err ? `<span class="mini-count err" title="${err} ${lang === 'en' ? 'issue(s)' : 'problème(s)'}"><i class="fa-solid fa-xmark"></i>${err}</span>` : ''}${warn ? `<span class="mini-count warn" title="${warn} ${lang === 'en' ? 'warning(s)' : 'avertissement(s)'}"><i class="fa-solid fa-triangle-exclamation"></i>${warn}</span>` : ''}`
    : '';
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
  if (p && p.idealo) ensureVariants(id);
  const cc = getCompat(), cks = p ? (cc.checks[id] || []) : [], cst = cc.statusOf[id];
  if (cst === 'err') el.classList.add('has-err'); else if (cst === 'warn') el.classList.add('has-warn');
  const visual = p && p.image ? `<img src="${esc(p.image)}" alt="" onerror="this.remove()">` : iconHtml(d.icon);
  const title = p ? esc(p.name) : (lang === 'en' ? `Add ${esc(slotName(id))}` : `Ajouter ${esc(slotName(id))}`);
  const specs = p ? esc(productQuickSpecs(p)) : esc(slotName(id));
  const mlbl = (fr, en) => `<span class="mini-lbl">${esc(lang === 'en' ? en : fr)}</span>`;
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
      <span class="slot-info"><span class="slot-type">${esc(slotName(id))}</span>
        <div class="slot-name">${title}</div><div class="slot-specs">${specs}</div></span>
      <span class="slot-side${stale ? ' stale-side' : ''}">${stale
        ? `<span class="slot-stale-row"><span class="slot-refetch" data-act="refetch" title="${lang === 'en' ? 'Refresh price' : 'Actualiser le prix'}"><i class="fa-solid fa-rotate-right"></i></span>${priceDiv}<span class="slot-warn" title="${lang === 'en' ? 'Price refresh failed' : 'Échec actualisation du prix'}"><i class="fa-solid fa-triangle-exclamation"></i></span></span>${vendorDiv}${delivDiv}`
        : priceHtml}</span>
    </button>
    ${(cks.length || (p && p.idealo && !p.datasheet && dsLoading.has(p.id))) ? `<div class="slot-compat">${p && p.idealo && !p.datasheet && dsLoading.has(p.id) ? `<span class="compat-badge loading" title="${lang === 'en' ? 'Loading datasheet…' : 'Chargement de la fiche technique…'}"><i class="fa-solid fa-circle-notch fa-spin"></i>Datasheet…</span>` : ''}${cks.map(c => { const v = c.status === 'warn' && Array.isArray(p.verified) && p.verified.includes(c.key); const st = v ? 'checked' : c.status; return `<span class="compat-badge ${st}" title="${esc(c.tip)}${v ? ` (${lang === 'en' ? 'verified' : 'vérifié'})` : ''}"><i class="fa-solid fa-${st === 'ok' || st === 'checked' ? 'check' : st === 'warn' ? 'triangle-exclamation' : st === 'err' ? 'xmark' : 'minus'}"></i>${esc(c.label)}</span>`; }).join('')}${cks.length ? `<button class="mini-btn compat-more" data-act="compat" title="${lang === 'en' ? 'Compatibility details' : 'Détails de compatibilité'}">…</button>` : ''}</div>` : ''}
    ${p && p.variants && p.variants.items && p.variants.items.length ? renderVariantRow(id, p) : ''}
    ${p ? `<div class="slot-actions">
      <button class="mini-btn" data-act="edit" title="${lang === 'en' ? 'Edit component data' : 'Modifier les données du composant'}"><i class="fa-solid fa-pen"></i>${mlbl('Modifier', 'Edit')}</button>
      <button class="mini-btn" data-act="idealo" ${hasIdealo ? `title="${lang === 'en' ? 'Open Idealo page' : 'Ouvrir la page Idealo'}"` : `disabled title="${noIdealoTip}"`}><i class="fa-solid fa-arrow-up-right-from-square"></i>${mlbl('Idealo', 'Idealo')}</button>
      <button class="mini-btn" data-act="addalt" title="${lang === 'en' ? 'Add alternative' : 'Ajouter une alternative'}"><span class="fa-layers-plus"><i class="fa-solid fa-layer-group"></i><i class="fa-solid fa-plus"></i></span>${mlbl('Alternative', 'Alternative')}</button>
      <button class="mini-btn" data-act="store" ${hasIdealo ? `title="${lang === 'en' ? 'Change store' : 'Changer de boutique'}"` : `disabled title="${noStoreTip}"`}><i class="fa-solid fa-store"></i>${mlbl('Boutique', 'Store')}</button>
      <button class="mini-btn" data-act="buy" ${hasBuy ? `title="${lang === 'en' ? 'Open this store page' : 'Ouvrir la page de cette boutique'}"` : `disabled title="${buyTip}"`}><i class="fa-solid fa-cart-shopping"></i>${mlbl('Acheter', 'Buy')}</button>
      ${['mb', 'ssd1', 'soundcard', 'capture', 'netcard'].includes(d.id) ? `<button class="mini-btn" data-act="pcie" title="${lang === 'en' ? 'PCIe Simulator — send full config' : 'Simulateur PCIe — envoyer la config complète'}"><i class="fa-solid fa-chart-column"></i>${mlbl('PCIe', 'PCIe')}</button>` : ''}
      ${d.id === 'psu' ? `<button class="mini-btn" data-act="psucompare" title="${lang === 'en' ? 'PSU quality & reliability (tier list 2025)' : 'Qualité & fiabilité alim (tier list 2025)'}"><i class="fa-solid fa-ranking-star"></i>${mlbl('Qualité', 'Tier')}</button>` : ''}
      ${p && p.manual ? `<button class="mini-btn" data-act="manual" title="${lang === 'en' ? 'Open product manual' : 'Ouvrir le manuel'}"><i class="fa-solid fa-book"></i>${mlbl('Manuel', 'Manual')}</button>` : ''}
      <button class="mini-btn" data-act="delivery" title="${lang === 'en' ? 'Delivery tracker' : 'Suivi colis'}"><i class="fa-solid fa-truck-fast"></i>${mlbl('Suivi', 'Track')}</button>
      <button class="mini-btn danger" data-act="del" title="${lang === 'en' ? 'Remove' : 'Supprimer'}"><i class="fa-solid fa-trash"></i>${mlbl('Suppr.', 'Remove')}</button>
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
  else if (act === 'psucompare') openPsuCompare(id);
  else if (act === 'manual') { if (p && p.manual) window.open(p.manual, '_blank', 'noopener'); }
  else if (act === 'delivery') openDelivery(id);
  else if (act === 'refetch') refreshOnePrice(id);
  else if (act === 'compat') openCompatDetail(id);
  else if (act === 'del') { if (confirm(lang === 'en' ? 'Remove selection?' : 'Retirer la sélection ?')) { s.selectedId = null; persist(); refresh(); } }
}

/* ---------- PSU quality & reliability (community PSU tier list, 2025) ---------- */
const PSU_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1akCHL7Vhzk_EhrpIGkz8zTEvYfLDcaSpZRB6Xt6JWkc/edit#gid=931697732';
function psuRow(label, status, value) {
  const st = status || 'na';
  const ic = st === 'ok' ? 'check' : st === 'warn' ? 'triangle-exclamation' : st === 'err' ? 'xmark' : 'minus';
  return `<div class="list-row"><strong class="grow">${esc(label)}</strong><span class="compat-badge ${st}"><i class="fa-solid fa-${ic}"></i>${esc(value)}</span></div>`;
}
const PSU_EFF = { G: 'Gold', S: 'Silver', B: 'Bronze', W: 'White', T: 'Titanium', P: 'Platinum', N: 'None' };
function psuVerdict(r) {
  const first = String((r && r.tier) || '').trim().toUpperCase()[0] || '';
  const lc = r && r.lc ? '*' : '';
  if (first === 'A') return { st: 'ok', txt: 'tier ' + r.tier + lc };
  if (first === 'B') return { st: 'ok', txt: 'tier ' + r.tier + lc };
  if (first === 'C') return { st: 'warn', txt: 'tier ' + r.tier + lc };
  if (first === 'D') return { st: 'err', txt: 'tier ' + r.tier + lc };
  if (first === 'E' || first === 'F') return { st: 'err', txt: 'tier ' + r.tier + lc };
  return { st: 'na', txt: r && r.tier ? 'tier ' + r.tier + lc : '—' };
}
function openPsuCompare(slotId) {
  const s = state.slots[slotId], p = sel(s); if (!p) return;
  const capW = (Number(p.capW) || 0) || ((Compat.parse('psu', p.name, p.specs || '') || {}).capW || 0);
  const r = (typeof PsuDb !== 'undefined') ? PsuDb.match(p.name, capW) : null;
  const rows = [];
  if (r) {
    const v = psuVerdict(r);
    const cert = r.cert ? r.cert.toUpperCase() : 'NOT CERT';
    rows.push(psuRow(lang === 'en' ? 'Tier (quality)' : 'Tier (qualité)', v.st, v.txt + (r.lc ? ' *' : '')));
    rows.push(psuRow(lang === 'en' ? '80 Plus' : '80 Plus', cert === 'NOT CERT' ? 'warn' : 'ok', cert));
    rows.push(psuRow(lang === 'en' ? 'Series' : 'Série', 'na', r.series || '?'));
    rows.push(psuRow(lang === 'en' ? 'Wattages' : 'Puissances', 'na', (r.watts || []).join(' / ') + ' W'));
    rows.push(psuRow(lang === 'en' ? 'Efficiency grade' : 'Grade rendement', r.eff ? 'ok' : 'na', r.eff ? (PSU_EFF[r.eff] || r.eff) : '?'));
    rows.push(psuRow(lang === 'en' ? 'Modularity' : 'Modularité', r.mod === 'Full' ? 'ok' : r.mod === 'Semi' ? 'warn' : 'na', r.mod === 'Full' ? (lang === 'en' ? 'Full' : 'Complète') : r.mod === 'Semi' ? (lang === 'en' ? 'Partial' : 'Partielle') : (lang === 'en' ? 'Fixed' : 'Fixe')));
    rows.push(psuRow(lang === 'en' ? 'Made by (ODM)' : 'Fabriqué par (ODM)', r.odm ? 'ok' : 'na', r.odm || '?'));
    rows.push(psuRow(lang === 'en' ? 'Platform / ATX' : 'Plateforme / ATX', /3\./.test(r.atx || '') ? 'ok' : 'na', `${r.plat || '?'} · ATX ${r.atx || '2.x'}`));
    rows.push(psuRow(lang === 'en' ? 'Input range' : 'Plage d’entrée', /full/i.test(r.inp || '') ? 'ok' : 'na', r.inp ? (/full/i.test(r.inp) ? (lang === 'en' ? 'Full range 100-240V' : 'Pleine plage 100-240V') : r.inp) : '?'));
    if (r.topoP || r.topoS || r.reg) rows.push(psuRow(lang === 'en' ? 'Topology' : 'Topologie', 'na', [r.topoP, r.topoS, r.reg].filter(Boolean).join(' / ')));
    rows.push(psuRow(lang === 'en' ? 'Intro year' : 'Année d’intro', 'na', r.yr || '?'));
    if (r.notes) rows.push(`<p class="hint" style="margin-top:8px"><i class="fa-solid fa-circle-info"></i> ${esc(r.notes)}</p>`);
  }
  const nearest = r ? [] : ((typeof PsuDb !== 'undefined') ? PsuDb.nearest(capW || (p.watts || 0), null) : []);
  const pretty = rr => esc(rr.series || '');
  const verdictNote = !r ? '' : psuVerdict(r).st === 'warn'
    ? `<p class="hint">${lang === 'en' ? 'Mid-range unit — budget/gaming OK, prefer better for heavy loads.' : 'Milieu de gamme — budget/jouer OK, viser mieux en forte charge.'}</p>`
    : psuVerdict(r).st === 'err' ? `<p class="hint">${lang === 'en' ? 'Low tier — avoid for a serious build.' : 'Tier bas — à éviter pour une config sérieuse.'}</p>`
      : psuVerdict(r).st === 'ok' ? `<p class="hint">${lang === 'en' ? 'Reviewed as a solid unit.' : 'Testée comme une unité de confiance.'}</p>` : '';
  const matchedHtml = r ? `
      <p class="compat-badge ok"><i class="fa-solid fa-database"></i>${esc(r.brand)} — ${pretty(r)}${r.lc ? ' (*)' : ''}</p>${verdictNote}${rows.join('')}
      <p class="hint" style="margin-top:8px"><i class="fa-solid fa-database"></i> ${lang === 'en' ? 'Community PSU Tier List (2025 revision, 1258 units) · (*) = limited confidence' : 'Tier List PSU communautaire (rév. 2025, 1258 modèles) · (*) = confiance limitée'}</p>`
    : `
      <p class="compat-badge warn"><i class="fa-solid fa-triangle-exclamation"></i>${lang === 'en' ? 'Not listed in the PSU tier list (2025) — quality unknown.' : 'Non listée dans la tier list PSU (2025) — qualité inconnue.'}</p>
      ${capW ? psuRow(lang === 'en' ? 'Detected wattage' : 'Puissance détectée', 'na', capW + ' W') : ''}
      ${nearest.length ? `<p class="hint" style="margin-top:10px">${lang === 'en' ? 'Nearest listed units:' : 'Modèles voisins listés :'}</p>${nearest.map(n => `<div class="list-row"><span class="grow">${esc(n.brand)} — ${pretty(n)}</span><span class="compat-badge na"><i class="fa-solid fa-plug"></i>${(n.watts || []).join('/')} W</span><span class="compat-badge ${psuVerdict(n).st}"><i class="fa-solid fa-ranking-star"></i>${esc(psuVerdict(n).txt)}</span></div>`).join('')}` : ''}`;
  openModal(lang === 'en' ? 'PSU — quality & reliability' : 'Alim — qualité & fiabilité', `
    <p class="hint"><strong>${esc(p.name)}</strong> — ${capW ? capW + ' W' : lang === 'en' ? 'wattage unknown' : 'puissance inconnue'}</p>${matchedHtml}
    <div class="btn-row"><a class="btn btn-sm" href="${r && r.row ? PSU_SHEET_URL + '&range=A' + r.row : PSU_SHEET_URL}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-table-list"></i> ${r && r.row ? (lang === 'en' ? 'Open this unit in the sheet' : 'Ouvrir ce modèle dans la sheet') : (lang === 'en' ? 'Open PSU Tier List sheet' : 'Ouvrir la Google Sheet (tier list PSU)')}</a></div>`);
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
const SETUP_ORDER = ['desk', 'chair', 'webcam', 'screen1', 'keyboard', 'mouse', 'pad', 'headset', 'gamepad', 'ups', 'multiprise', 'switch', 'router', 'nas', 'graphictab', 'usbstick', 'memcard', 'dock', 'printer', 'extssd', 'extstorage', 'speakers', 'soundcard', 'capture', 'monitorarm'];
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
  if (activeSlot === slotId) {
    activeSlot = null;
    if (isMobileView()) closePickerSheet();
    else { $('#pickerPanel').classList.add('hidden'); $('#summaryPanel').classList.remove('hidden'); }
  }
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
  { key: 'cooler', label: 'Refroidissement', url: 'https://www.idealo.fr/cat/5156/ventilateurs-processeurs.html' },
  { key: 'ssd', label: 'SSD', url: 'https://www.idealo.fr/cat/14613/ssd.html' },
  { key: 'gpu', label: 'Cartes graphiques', url: 'https://www.idealo.fr/cat/16073F1311515/cartes-graphiques.html' },
  { key: 'case', label: 'Boîtiers PC', url: 'https://www.idealo.fr/cat/3090/boitiers-pc.html' },
  { key: 'psu', label: 'Alimentations', url: 'https://www.idealo.fr/cat/5432F792071/alimentation-pc.html' },
  { key: 'os', label: "Systèmes d'exploitation", url: 'https://www.idealo.fr/cat/10052/systemes-d-exploitation.html' },
  { key: 'desk', label: 'Bureaux', url: 'https://www.idealo.fr/cat/14953/bureaux.html' },
  { key: 'chair', label: 'Chaises de bureau', url: 'https://www.idealo.fr/cat/14952/chaises-de-bureau.html' },
  { key: 'screen', label: 'Écrans', url: 'https://www.idealo.fr/cat/3832/moniteurs.html' },
  { key: 'keyboard', label: 'Claviers', url: 'https://www.idealo.fr/cat/3047/claviers-ordinateur.html?q=clavier' },
  { key: 'mouse', label: 'Souris', url: 'https://www.idealo.fr/cat/3046/souris-pc.html' },
  { key: 'pad', label: 'Tapis de souris', url: 'https://www.idealo.fr/cat/10472/tapis-de-souris.html' },
  { key: 'headset', label: 'Casques gamer', url: 'https://www.idealo.fr/cat/5172F1160494/casques-gamer.html' },
  { key: 'thermal', label: 'Pâte thermique', url: 'https://www.idealo.fr/liste/122968612/pate-thermique-cpu.html' },
  { key: 'hdd', label: 'Disques durs', url: 'https://www.idealo.fr/cat/3011/disques-durs.html' },
  { key: 'fans', label: 'Ventilateurs PC', url: 'https://www.idealo.fr/cat/5155/ventilateurs-pour-pc.html' },
  { key: 'psucables', label: "Câbles d'alimentation", url: 'https://www.idealo.fr/cat/5694F3384068/cables-adaptateurs-pc.html' },
  { key: 'soft', label: 'Logiciels', url: 'https://www.idealo.fr/scat/3330/logiciels.html' },
  { key: 'ups', label: 'Onduleurs', url: 'https://www.idealo.fr/cat/3107/onduleurs.html' },
  { key: 'multiprise', label: 'Multiprises', url: 'https://www.idealo.fr/cat/12892F104352520/multiprises.html' },
  { key: 'switch', label: 'Switches', url: 'https://www.idealo.fr/cat/3104/switches.html' },
  { key: 'router', label: 'Routeurs', url: 'https://www.idealo.fr/cat/3099/routeurs.html' },
  { key: 'gamepad', label: 'Manettes', url: 'https://www.idealo.fr/cat/3014/manettes-de-jeux.html' },
  { key: 'nas', label: 'Serveurs NAS', url: 'https://www.idealo.fr/cat/9272/serveurs-nas.html' },
  { key: 'graphictab', label: 'Tablettes graphiques', url: 'https://www.idealo.fr/cat/8552/tablettes-graphiques-accessoires.html' },
  { key: 'usbstick', label: 'Clés USB', url: 'https://www.idealo.fr/cat/4312/cles-usb.html' },
  { key: 'memcard', label: 'Cartes mémoire', url: 'https://www.idealo.fr/cat/4734/cartes-memoire.html' },
  { key: 'dock', label: "Stations d'accueil", url: 'https://www.idealo.fr/cat/10792/stations-d-accueil-pour-ordinateurs-portables.html' },
  { key: 'printer', label: 'Imprimantes', url: 'https://www.idealo.fr/cat/3309/imprimantes-multifonctions.html' },
  { key: 'extstorage', label: 'Disques durs externes', url: 'https://www.idealo.fr/cat/7712/disques-durs-externes.html' },
  { key: 'extssd', label: 'SSD externes', url: 'https://www.idealo.fr/cat/14613F1338461/ssd.html' },
  { key: 'speakers', label: 'Enceintes PC', url: 'https://www.idealo.fr/cat/3287/haut-parleurs-pc.html' },
  { key: 'webcam', label: 'Webcams', url: 'https://www.idealo.fr/cat/16313/webcams.html' },
  { key: 'soundcard', label: 'Cartes son', url: 'https://www.idealo.fr/cat/3092/cartes-son.html' },
  { key: 'netcard', label: 'Cartes réseau', url: 'https://www.idealo.fr/cat/3089/cartes-reseau.html' },
  { key: 'capture', label: 'Acquisition vidéo', url: 'https://www.idealo.fr/cat/3208/acquisition-video.html' },
  { key: 'monitorarm', label: 'Supports écran', url: 'https://www.idealo.fr/cat/18457/supports-pour-moniteur.html' },
];
const SLOT_CAT = { cpu: 'cpu', mb: 'mb', ram: 'ram', cooler: 'cooler', ssd1: 'ssd', gpu: 'gpu', case: 'case', psu: 'psu', os: 'os', desk: 'desk', chair: 'chair', screen1: 'screen', keyboard: 'keyboard', mouse: 'mouse', pad: 'pad', headset: 'headset', gamepad: 'gamepad', thermal: 'thermal', hdd: 'hdd', fans: 'fans', psucables: 'psucables', netcard: 'netcard', soft: 'soft', ups: 'ups', multiprise: 'multiprise', switch: 'switch', router: 'router', nas: 'nas', graphictab: 'graphictab', usbstick: 'usbstick', memcard: 'memcard', hub: 'usbstick', dock: 'dock', printer: 'printer', extstorage: 'extstorage', extssd: 'extssd', speakers: 'speakers', webcam: 'webcam', soundcard: 'soundcard', capture: 'capture', monitorarm: 'monitorarm' };
let currentCatKey = 'root', currentCatLabel = 'Informatique', currentIdealoUrl = IDEALO_CATS[0].url;
let pickerSeq = 0; // invalidates a pending dynamic-default resolution when the picker changes
let idealBase = '', idealUrl = '', idealPool = [], idealFetched = {}, idealShown = 12, idealNextUrl = null, idealSort = 'rel', idealQ = '', idealBusy = false, idealCached = false, idealErr = '', idealToken = 0, idealLoadingMore = false;
function slotCatKey(slotId) {
  if (slotId.startsWith('ssd_')) return 'ssd';
  if (slotId.startsWith('screen_')) return 'screen';
  if (slotId.startsWith('pcx_') || slotId.startsWith('opt_')) return 'root';
  const s = state.slots[slotId];
  return (s && SLOT_CAT[s.defId]) || 'root';
}
/* Default Idealo page per category; mb/ram depend on the rest of the build. */
const MB_SOCKET_CATS = {
  AM5: 'https://www.idealo.fr/cat/3018F103797439/cartes-meres.html',
  AM4: 'https://www.idealo.fr/cat/3018F8155199/cartes-meres.html',
  LGA1700: 'https://www.idealo.fr/cat/3018F103797438/cartes-meres.html',
  LGA1770: 'https://www.idealo.fr/cat/3018F103797438/cartes-meres.html',
  LGA1851: 'https://www.idealo.fr/cat/3018F106264935/cartes-meres.html',
  sTR5: 'https://www.idealo.fr/cat/3018F106264936/cartes-meres.html',
};
const RAM_TYPE_CATS = {
  DDR5: 'https://www.idealo.fr/cat/4552F102299808/barrettes-de-ram.html',
  DDR4: 'https://www.idealo.fr/cat/4552F102193212/barrettes-de-ram.html',
};
function catUrl(key) { return (IDEALO_CATS.find(x => x.key === key) || IDEALO_CATS[0]).url; }
function applyCatUrl(key, url) {
  const c = IDEALO_CATS.find(x => x.key === key) || IDEALO_CATS[0];
  currentCatKey = c.key;
  currentCatLabel = c.label;
  currentIdealoUrl = url || c.url;
  const a = $('#pickerIdealoSearch'); if (a) a.href = currentIdealoUrl;
  const f = $('#idealoOpenFallback'); if (f) f.onclick = () => window.open(currentIdealoUrl, '_blank', 'noopener');
}
function loadCategory(key) { applyCatUrl(key, catUrl(key)); }
/* Socket token from a CPU datasheet. Compat covers AM5/AM4/1700/1851; 1770 & sTR5 need a raw scan. */
function cpuSocketToken(md) {
  const s = String(md || '');
  try {
    const so = (Compat.parseDatasheet(s).sockets || []).map(x => x.toUpperCase());
    if (so.includes('AM5')) return 'AM5';
    if (so.includes('AM4')) return 'AM4';
    if (so.includes('1851')) return 'LGA1851';
    if (so.includes('1700')) return 'LGA1700';
  } catch { /* ignore */ }
  if (/\bs?TR5\b/i.test(s)) return 'sTR5';
  if (/\b1770\b/i.test(s)) return 'LGA1770';
  if (/\b1851\b/i.test(s)) return 'LGA1851';
  if (/\b1700\b/i.test(s)) return 'LGA1700';
  return null;
}
/* Wait for a component's datasheet: reuse any in-flight fetch, otherwise fetch it (Idealo caches). */
async function ensureDatasheet(p) {
  if (!p) return '';
  if (p.datasheet) return p.datasheet;
  if (!p.idealo || typeof Idealo === 'undefined') return '';
  try {
    if (dsLoading.has(p.id)) {
      for (let i = 0; i < 60 && dsLoading.has(p.id); i++) await new Promise(r => setTimeout(r, 250));
      if (p.datasheet) return p.datasheet;
    }
    const d = await Idealo.product(p.idealo);
    if (d && !d.error && d.datasheet) { p.datasheet = d.datasheet; persist(); compatCache = null; return p.datasheet; }
  } catch { /* ignore */ }
  return '';
}
async function cpuSocketKey() {
  const s = state.slots.cpu, p = s && sel(s);
  if (!p) return null;
  const md = await ensureDatasheet(p);
  return md ? cpuSocketToken(md) : null;
}
async function mbDdrKey() {
  const s = state.slots.mb, p = s && sel(s);
  if (!p) return null;
  const md = await ensureDatasheet(p);
  if (!md) return null;
  try { return Compat.parseDatasheet(md).ddr || null; } catch { return null; }
}
/* String for plain categories; Promise for mb/ram (needs another component's datasheet first). */
function defaultCatUrl(key) {
  const base = catUrl(key);
  if (key === 'mb') return cpuSocketKey().then(k => MB_SOCKET_CATS[k] || base);
  if (key === 'ram') return mbDdrKey().then(k => RAM_TYPE_CATS[k] || base);
  return base;
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
  if (pickerPriceActive()) items = items.filter(it => !it.price || (it.price >= pickerPrice.from && it.price <= pickerPrice.to));
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
/* Show the loading state while a dynamic default page is resolved. */
function showPickerPending() {
  idealBase = ''; idealUrl = ''; idealPool = []; idealFetched = {}; idealShown = IDEAL_PAGE; idealNextUrl = null;
  idealErr = ''; idealCached = false; idealBusy = true; idealLoadingMore = false;
  renderIdealo();
}
/* Load a category's default page; waits for a dependency (cpu for mb, mb for ram) when needed. */
function resolveDefaultCat(key, seq) {
  const u = defaultCatUrl(key);
  if (typeof u === 'string') { applyCatUrl(key, u); loadIdealoList(u); pickerSetupFilters(u, key); return; }
  showPickerPending();
  u.then(url => { if (seq !== pickerSeq) return; applyCatUrl(key, url); loadIdealoList(url); pickerSetupFilters(url, key); })
   .catch(() => { if (seq !== pickerSeq) return; const b = catUrl(key); applyCatUrl(key, b); loadIdealoList(b); pickerSetupFilters(b, key); });
}
function openPicker(id, mode = 'replace') {
  pickerMode = mode;
  activeSlot = id;
  const s = state.slots[id], cur = sel(s), d = defOf(s);
  const baseLabel = (SLOT_NAMES[lang] && SLOT_NAMES[lang][s.defId]) || SLOT_NAMES.fr[s.defId] || s.defId;
  $('#idealoQuery').value = (cur && cur.name) || `${baseLabel} ${d.q || ''}`.trim();
  $('#idealoClear').classList.toggle('hidden', !$('#idealoQuery').value);
  $('#idealoFilter').value = ''; idealQ = ''; idealSort = 'rel'; $('#idealoSort').value = 'rel';
  const key = slotCatKey(id);
  const remembered = id.includes('_') ? ((load(LS.prefs, {}).idealLastByCat || {})[key] || null) : null;
  const seq = ++pickerSeq;
  loadCategory(key);
  if (remembered) { // same Idealo page as the base slot (e.g. internal SSDs, not portable ones)
    applyCatUrl(key, remembered);
    const mq = remembered.match(/prechcat\.html\?q=([^&]*)/);
    if (mq) { try { $('#idealoQuery').value = decodeURIComponent(mq[1]); } catch { /* ignore */ } $('#idealoClear').classList.toggle('hidden', !$('#idealoQuery').value); }
  }
  $('#pickerPanel').classList.remove('hidden');
  $('#pickerPanel').scrollTop = 0;
  $('#summaryPanel').classList.add('hidden');
  if (isMobileView()) openPickerSheet();
  else document.body.classList.remove('picker-sheet-open', 'summary-sheet-open');
  renderSlots(); renderPicker();
  const chip = $('#pickerModeChip');
  if (chip) {
    chip.classList.toggle('hidden', pickerMode !== 'add');
    if (pickerMode === 'add') $('#pickerModeTxt').textContent = t('picker.addMode');
  }
  if (remembered) { pickerSetupFilters(remembered, key); loadIdealoList(remembered); }
  else resolveDefaultCat(key, seq);
}
function closePicker() {
  activeSlot = null;
  if (isMobileView()) closePickerSheet();
  else { $('#pickerPanel').classList.add('hidden'); $('#summaryPanel').classList.remove('hidden'); }
  renderSlots();
}
function renderPicker() {
  const s = state.slots[activeSlot]; if (!s) return;
  $('#pickerTitle').textContent = slotName(activeSlot);
  $('#pickerIdealoSearch').href = currentIdealoUrl;
}

/* ---------- Picker: Idealo facet filters (quick pills + "more filters") ----------
   Categorical/numeric filters map to Idealo facet URLs (OR within a group, AND
   across groups). Numeric attributes snap to Idealo's own discrete buckets. Price
   is passed as ?priceFrom/&priceTo (honoured by Idealo in the browser) and also
   applied client-side since Jina's snapshot ignores it. */
let pickerCatKey = 'root', pickerFilterBase = '', pickerFilterData = null;
let pickerSel = {}, pickerPrice = { from: null, to: null }, pickerDiscount = false;
let pickerFilterBusy = false, pickerFilterErr = '', pickerMoreOpen = false, filterSeq = 0, pickerRestored = false;
let pickerSocketToken = null;

const ROOT_QUICK_CATS = [
  { key: 'laptop', label: 'Ordinateurs portables', url: 'https://www.idealo.fr/cat/3751/ordinateurs-portables.html' },
  { key: 'desktop', label: 'Ordinateurs de bureau', url: 'https://www.idealo.fr/cat/3020/ordinateurs-de-bureau.html' },
  { key: 'sbc', label: 'Ordinateurs à carte unique', url: 'https://www.idealo.fr/cat/31123/ordinateurs-a-carte-unique.html' },
  { key: 'console', label: 'Consoles de jeux', url: 'https://www.idealo.fr/cat/3189/consoles-de-jeux.html' },
  { key: 'tablet', label: 'Tablettes tactiles', url: 'https://www.idealo.fr/cat/3747/tablettes-tactiles.html' },
];

const BRAND_RE = /fabricant|manufactur|brand|marque|hersteller/i;
const AVAIL_RE = /disponibilit|availability|verf[üu]gbar|lieferzeit|\bstock\b/i;
const RANGE_GROUP_RE = /fr[ée]quence|frequenz|frequency|\btdp\b|puissance|power|watt|capacit|kapazit|volume|taille|diam|dimension|d[ée]bit|speed|vitesse|poids|weight|thread|coeur|cœur|core|\bpouces?\b|\brpm\b|\bbruit\b|noise|sonore|autonomie|batterie|m[ée]moire|\bram\b|r[ée]solution|resolution|\bhz\b|longueur|largeur|profondeur|hauteur|charge|nombre|module|latence|slot|port|cache|rotation|transfert|d[ée]lai|consommation|dpi/i;
const NON_RANGE_RE = /s[ée]rie|type de produit|nom de code|fabricant|adapt[ée]|emballage|couleur|color|puce|graphique|mod[eè]le|brand|marque|hersteller|product type|type de processeur|type de laptop|disponibilit|availability|support|syst[eè]me|interface|entr[ée]e|sortie|codage|standard|protocole|format|dalle|fichier|formats|norme|connexion|alimentation|refroidissement|connecteurs|bo[iî]tier|utilisation|fonction/i;
const UNIT_RE = /(ghz|mhz|watts?|\bw\b|\bto\b|\btb\b|\bgo\b|\bgb\b|\bmm\b|\bcm\b|\bpouces?\b|\brpm\b|\bdb\b|mt\/s|gb\/s|mb\/s|gbps|mbps|\bkg\b|\bhz\b|\bms\b|\bmo\b|dpi|cfm)/i;

/* Curated Idealo filter allow-list, per component type, in display order.
   Each entry resolves to a real Idealo "filterGroups" group by exact FR name.
   quick  → one-click pills (select a named option, or swap a base facet).
   more   → full filter blocks (kind:'range' numeric slider | 'enum' list/slider;
            omitted kind = auto: numeric → slider, enum >10 options → search list). */
const MB_SOCKET_FACETS = [
  { label: 'AM4', facet: '8155199' },
  { label: 'AM5', facet: '103797439' },
  { label: 'LGA 1700', facet: '103797438' },
  { label: 'LGA 1851', facet: '106264935' },
];
const PICKER_SCHEMA = {
  cpu: {
    quick: [
      { label: 'Intel', groups: ['Fabricant'], pick: /^intel\b/i },
      { label: 'AMD', groups: ['Fabricant'], pick: /^amd\b/i },
    ],
    more: [
      { group: 'Nombre de threads', help: 'threads', kind: 'enum', single: true },
      { group: 'Fréquence', help: 'frequency' },
      { group: 'TDP (Thermal Design Power)', help: 'tdp' },
    ],
  },
  mb: {
    quick: MB_SOCKET_FACETS.map(s => ({ ...s, baseFacet: true })),
    more: [
      { group: 'Format', help: 'format' },
      { group: "Nombre d'emplacements RAM", help: 'slots' },
      { group: 'Standard Ethernet', help: 'ethernet', kind: 'enum' },
      { group: 'Nombre de slots PCIe x16', help: 'pcie' },
      { group: 'Nombre de slots PCIe x1', help: 'pcie' },
    ],
  },
  ram: {
    quick: [
      { label: 'EXPO', groups: ['Profil OC'], pick: /expo/i },
      { label: 'XMP', groups: ['Profil OC'], pick: /xmp/i },
      { label: '16 Go', groups: ['Capacité mémoire'], pick: /^16\s*go/i },
      { label: '32 Go', groups: ['Capacité mémoire'], pick: /^32\s*go/i },
      { label: '48 Go', groups: ['Capacité mémoire'], pick: /^48\s*go/i },
      { label: '64 Go', groups: ['Capacité mémoire'], pick: /^64\s*go/i },
    ],
    more: [
      { group: 'Nombre de modules', help: 'modules', single: true },
      { group: 'Capacité mémoire', help: 'capacity', single: true },
      { group: 'Taux de transfert', help: 'speed', single: true },
      { group: 'Temps de latence', help: 'latency' },
      { group: 'Type ECC', help: 'ecc', kind: 'enum' },
    ],
  },
  cooler: {
    quick: [
      { label: 'Aircooler', groups: ['Type de produit'], pick: /ventirad|refroidisseur|tower|top.?blow|air/i },
      { label: 'AIO', groups: ['Type de produit'], pick: /watercool|aio|liquide|kit/i },
    ],
    more: [],
  },
  ssd: {
    quick: [
      { label: 'M.2', groups: ['Facteur de forme'], pick: /m\.?2/i },
      { label: 'SATA', groups: ['Protocole', 'Bus', 'Interface'], pick: /sata/i },
      { label: '1 To', groups: ['Capacité en Go', 'Capacité de stockage'], pick: /^1\s*(?:to\b|[-–])/i },
      { label: '2 To', groups: ['Capacité en Go', 'Capacité de stockage'], pick: /^2\s*to/i },
    ],
    more: [
      { group: 'Capacité en Go', help: 'capacity' },
      { group: 'Vitesse de transfert (lecture)', help: 'read' },
      { group: 'Vitesse de transfert (écriture)', help: 'write' },
      { group: 'Volume d\u2019écriture (nombre total d\u2019octets écrits)', help: 'tbw' },
    ],
  },
  gpu: {
    quick: [],
    more: [
      { group: 'Série', help: 'series' },
      { group: 'Capacité de mémoire', help: 'memory' },
      { group: 'Total Board Power', help: 'power' },
      { group: 'Version PCIe', help: 'pcie', kind: 'enum' },
    ],
  },
  case: {
    quick: [
      { label: 'Boîtier Mini-ITX', groups: ['Type de produit'], pick: /bo[iî]tier mini.?itx/i },
      { label: 'Mini-tour', groups: ['Type de produit'], pick: /^mini\s*tour/i },
      { label: 'Moyen tour', groups: ['Type de produit'], pick: /^moyenne?\s*tour/i },
      { label: 'Grand tour', groups: ['Type de produit'], pick: /^grande?\s*tour/i },
    ],
    more: [
      { group: 'Type de produit', help: 'caseType' },
      { group: 'Format de carte mère supporté', help: 'format' },
      { group: 'Ventilateurs préinstallés', help: 'fansIncluded' },
      { group: 'Nombre max. de ventilateurs', help: 'fansTotal' },
      { group: 'Baie 2,5" internes', help: 'bays25' },
      { group: 'Baies 3,5" internes', help: 'bays35' },
      { group: 'Connecteurs sur façade avant', help: 'connectivity', kind: 'enum' },
      { group: 'Longueur max. de la carte graphique', help: 'gpuLength' },
      { group: 'Hauteur max. du ventilateur de processeur', help: 'cpuCoolerHeight' },
    ],
  },
  psu: {
    quick: [
      { label: '850 W', groups: ['Puissance continue'], pick: /^850\s*w/i },
      { label: '1000 W', groups: ['Puissance continue'], pick: /^1000\s*w/i },
    ],
    more: [
      { group: 'Puissance continue', help: 'power' },
      { group: "Certificat d'efficacité", help: 'certification', kind: 'enum' },
      { group: 'Facteur de forme', help: 'psuForm', kind: 'enum' },
    ],
  },
  hdd: {
    quick: [2, 4, 6, 8, 10].map(n => ({ label: n + ' To', groups: ['Capacité de stockage', 'Capacité en Go'], pick: new RegExp('^' + n + '\\s*to', 'i') })),
    more: [
      { group: 'Capacité de stockage', help: 'capacity' },
      { group: 'Format', help: 'hddForm', kind: 'enum' },
      { group: 'Mémoire cache', help: 'cache' },
      { group: 'Vitesse de rotation', help: 'rotation' },
    ],
  },
  netcard: {
    quick: [
      { label: 'SFP+', groups: ['Connexion LAN', 'Type de produit', 'Protocole LAN'], pick: /sfp/i },
      { label: 'Ethernet 10 Gb/s', groups: ['Standard Ethernet', 'Protocole LAN'], pick: /\b10\s*g(?:b|igabit)/i },
      { label: 'Wi-Fi', groups: ['Type de produit', 'Fonction Wi-Fi', 'Standard Wi-Fi'], pick: /wi.?fi|wlan/i },
    ],
    more: [
      { group: 'Bus', help: 'bus', kind: 'enum' },
      { group: 'Fonction Wi-Fi', help: 'wifiFunc', kind: 'enum' },
      { group: 'Standard Wi-Fi', help: 'wifiStd', kind: 'enum' },
      { group: 'Vitesse de transfert', help: 'speed' },
    ],
  },
  fans: {
    quick: [
      { label: '120 mm', groups: ['Dimensions (Lxhxl)', 'Type de produit'], pick: /^120/i },
      { label: '140 mm', groups: ['Dimensions (Lxhxl)', 'Type de produit'], pick: /^140/i },
      { label: 'Normal', groups: ["Direction du flux d'air"], pick: /normal|standard|souffl|blowing/i },
      { label: 'Reversed', groups: ["Direction du flux d'air"], pick: /invers|reverse|aspir|sucking|retourn/i },
    ],
    more: [
      { group: "Débit d'air", help: 'airflow' },
      { group: "Flux d'air", help: 'airFlux', kind: 'enum' },
      { group: 'Niveau sonore max.', help: 'noise' },
      { group: 'Vitesse de rotation', help: 'rotation' },
    ],
  },
  desk: {
    quick: [],
    more: [
      { group: 'Hauteur', help: 'height' },
      { group: 'Largeur', help: 'width' },
      { group: 'Profondeur', help: 'depth' },
    ],
  },
  screen: {
    quick: [
      { label: '1080p', groups: ['Résolution'], pick: /1080|full hd|fhd/i },
      { label: '1440p', groups: ['Résolution'], pick: /1440|wqhd|qhd/i },
      { label: '4K', groups: ['Résolution'], pick: /2160|4k|uhd/i },
      { label: '24"', groups: ['Taille de l\u2019écran', "Taille de l'écran"], pick: /^24/i },
      { label: '27"', groups: ['Taille de l\u2019écran', "Taille de l'écran"], pick: /^27/i },
      { label: 'OLED', groups: ['Dalle'], pick: /oled/i },
      { label: 'IPS', groups: ['Dalle'], pick: /ips/i },
    ],
    more: [
      { group: 'Type de produit', help: 'screenType' },
      { group: 'Taille de l\u2019écran', help: 'screenSize' },
      { group: 'Résolution', help: 'resolution', kind: 'enum' },
      { group: 'Caractéristiques ergonomiques', help: 'ergonomics', kind: 'enum' },
      { group: 'Dalle', help: 'panel', kind: 'enum' },
      { group: 'Entrée vidéo', help: 'videoIn', kind: 'enum' },
      { group: 'Format de l\u2019écran', help: 'screenFormat', kind: 'enum' },
      { group: 'Multi Mode', help: 'multimode', kind: 'enum' },
      { group: 'Rayon de courbure', help: 'curvature' },
      { group: 'Synchronisation', help: 'sync', kind: 'enum' },
      { group: 'Taux de rafraîchissement', help: 'refresh' },
      { group: 'Temps de réponse', help: 'response' },
    ],
  },
  keyboard: {
    quick: [
      { label: 'AZERTY', groups: ['Langue du clavier'], pick: /azerty|fran[cç]ais|^fr\b/i },
      { label: 'QWERTY (US)', groups: ['Langue du clavier'], pick: /qwerty|anglais|^us\b/i },
    ],
    more: [
      { group: 'Design', help: 'design', kind: 'enum' },
      { group: 'Interface', help: 'interface', kind: 'enum' },
    ],
  },
  mouse: {
    quick: [
      { label: 'Wired', groups: ['Alimentation', 'Interface'], pick: /fil|câble|cable|usb/i },
      { label: 'Wireless', groups: ['Alimentation', 'Interface'], pick: /sans fil|wireless|radio|bluetooth|batterie|accu/i },
    ],
    more: [
      { group: 'Résolution max.', help: 'dpi' },
      { group: 'Style', help: 'style', kind: 'enum' },
      { group: 'Interface', help: 'interface', kind: 'enum' },
      { group: 'Alimentation', help: 'power', kind: 'enum' },
      { group: 'Fonctions gamer', help: 'gamer', kind: 'enum' },
      { group: 'Nombre de touches', help: 'buttons' },
    ],
  },
  pad: {
    quick: [
      { label: 'Gaming', groups: ['Type de produit'], pick: /gaming|gamer|jeu/i },
      { label: 'Standard', groups: ['Type de produit'], pick: /standard|classique|normal/i },
      { label: 'USB', groups: ['Équipement', 'Adapté pour', 'Type de produit'], pick: /usb/i },
    ],
    more: [
      { group: 'Longueur', help: 'length' },
      { group: 'Largeur', help: 'width' },
      { group: 'Équipement', help: 'equipment', kind: 'enum' },
      { group: 'Matière', help: 'material', kind: 'enum' },
      { group: 'Propriétés', help: 'properties', kind: 'enum' },
    ],
  },
  headset: {
    quick: [
      { label: 'Wired', groups: ['Mode de transmission', 'Type de connexion'], pick: /fil|câble|jack|usb/i },
      { label: 'Bluetooth', groups: ['Mode de transmission', 'Type de connexion'], pick: /bluetooth|\bbt\b/i },
      { label: 'Radio', groups: ['Mode de transmission'], pick: /radio|sans fil|wireless|2[,.]4/i },
    ],
    more: [
      { group: 'Format', help: 'format', kind: 'enum' },
      { group: 'Équipement', help: 'equipment', kind: 'enum' },
      { group: 'Propriétés microphone', help: 'microphone', kind: 'enum' },
      { group: 'Type de connexion', help: 'connection', kind: 'enum' },
    ],
  },
  webcam: {
    quick: [
      { label: '1080p', groups: ['Résolution'], pick: /1080|full hd|fhd/i },
      { label: '4K', groups: ['Résolution'], pick: /2160|4k|uhd/i },
      { label: '60 fps', groups: ['Cadence rafale'], pick: /^60/i },
    ],
    more: [
      { group: 'Résolution', help: 'resolution' },
      { group: 'Cadence rafale', help: 'fps' },
      { group: 'Mise au point', help: 'focus', kind: 'enum' },
      { group: 'Résolution mode Photo', help: 'photoRes' },
      { group: 'Support', help: 'support', kind: 'enum' },
      { group: "Version de l'interface USB", help: 'usbVersion', kind: 'enum' },
    ],
  },
  gamepad: {
    quick: [
      { label: 'Wired', groups: ['Type de connexion', 'Connectique'], pick: /fil|câble|usb/i },
      { label: 'Wireless', groups: ['Type de connexion', 'Connectique'], pick: /sans fil|wireless|radio|2[,.]4/i },
      { label: 'Bluetooth', groups: ['Type de connexion', 'Connectique'], pick: /bluetooth|\bbt\b/i },
      { label: 'USB', groups: ['Type de connexion', 'Connectique'], pick: /usb/i },
      { label: 'USB-C', groups: ['Type de connexion', 'Connectique'], pick: /usb.?c/i },
    ],
    more: [],
  },
  ups: {
    quick: [],
    more: [
      { group: 'Puissance effective', help: 'power' },
      { group: 'Autonomie', help: 'batteryLife' },
      { group: 'Boîtier', help: 'enclosure', kind: 'enum' },
      { group: 'Dispositif de protection', help: 'protection', kind: 'enum' },
    ],
  },
  multiprise: {
    quick: [],
    more: [
      { group: 'Nombre de prises', help: 'plugs' },
      { group: 'Longueur de câble', help: 'cableLength' },
      { group: 'Avec interrupteur', help: 'switch', kind: 'enum' },
      { group: 'Puissance max.', help: 'power' },
      { group: 'Protection contre les surtensions', help: 'surge' },
    ],
  },
  switch: {
    quick: [],
    more: [
      { group: 'Type de produit', help: 'switchType', kind: 'enum' },
      { group: 'Débit de transfert de données', help: 'speed' },
      { group: 'Port PoE', help: 'poe' },
      { group: 'Ports de commutation', help: 'ports' },
      { group: 'Puissance totale PoE', help: 'poePower' },
      { group: 'Taux de transfert de paquets', help: 'pps' },
    ],
  },
  router: {
    quick: [
      { label: 'Wi-Fi 7', groups: ['Standard Wi-Fi'], pick: /wi.?fi ?7|\bbe\b/i },
      { label: 'Wi-Fi 6/6E', groups: ['Standard Wi-Fi'], pick: /wi.?fi ?6|\bax\b/i },
    ],
    more: [
      { group: 'Débit Wi-Fi', help: 'wifiSpeed' },
      { group: 'Bande de fréquence Wi-Fi', help: 'wifiBand', kind: 'enum' },
      { group: 'Codage', help: 'codage', kind: 'enum' },
      { group: 'Standard Ethernet', help: 'ethernet', kind: 'enum' },
      { group: 'Vitesse de téléchargement max.', help: 'speed' },
    ],
  },
  nas: {
    quick: [1, 2, 4, 6, 8].map(n => ({ label: n + ' baie' + (n > 1 ? 's' : ''), groups: ['Emplacements pour disques durs', 'Type de produit'], pick: new RegExp('^' + n + '\\b', 'i') })),
    more: [
      { group: 'Type de produit', help: 'nasType', kind: 'enum' },
      { group: 'Mémoire vive (RAM)', help: 'ram' },
      { group: 'Capacité de stockage', help: 'capacity' },
      { group: 'Cœur de processeur', help: 'cores' },
      { group: 'Emplacements pour disques durs', help: 'bays' },
      { group: 'Format disque dur', help: 'hddForm', kind: 'enum' },
      { group: 'Type de disque dur', help: 'hddType', kind: 'enum' },
      { group: 'Type de RAID', help: 'raid', kind: 'enum' },
    ],
  },
  graphictab: {
    quick: [
      { label: 'Stylus', groups: ['Accessoires & outil de commande'], pick: /crayon|stylus|pen/i },
      { label: 'Finger', groups: ['Accessoires & outil de commande'], pick: /doigt|finger/i },
      { label: 'Mouse', groups: ['Accessoires & outil de commande'], pick: /souris|mouse/i },
      { label: 'Wired', groups: ['Interface'], pick: /fil|usb|câble/i },
      { label: 'Wireless', groups: ['Interface'], pick: /sans fil|wireless|bluetooth/i },
    ],
    more: [
      { group: 'Résolution', help: 'resolution' },
      { group: 'Accessoires & outil de commande', help: 'accessory', kind: 'enum' },
      { group: 'Conçu pour', help: 'designedFor', kind: 'enum' },
      { group: 'Interface', help: 'interface', kind: 'enum' },
      { group: 'Sensibilité à la pression', help: 'pressure' },
    ],
  },
  usbstick: {
    quick: [
      { label: 'USB-C', groups: ['Type de produit', 'Interface supplémentaire'], pick: /usb.?c/i },
      ...[32, 64, 128, 256].map(n => ({ label: n + ' Go', groups: ['Capacité de mémoire'], pick: new RegExp('^' + n + '\\s*go', 'i') })),
    ],
    more: [
      { group: 'Capacité de mémoire', help: 'capacity' },
      { group: 'Type de produit', help: 'usbType', kind: 'enum' },
      { group: 'Vitesse de transfert (lecture)', help: 'read' },
      { group: 'Vitesse de transfert (écriture)', help: 'write' },
      { group: 'Fermeture', help: 'closure', kind: 'enum' },
    ],
  },
  memcard: {
    quick: [
      { label: 'SD', groups: ['Type de produit'], pick: /carte sd|^sd/i },
      { label: 'micro-SD', groups: ['Type de produit'], pick: /micro/i },
      ...[32, 64, 128, 256].map(n => ({ label: n + ' Go', groups: ['Capacité de mémoire'], pick: new RegExp('^' + n + '\\s*go', 'i') })),
    ],
    more: [
      { group: 'Type de produit', help: 'cardType', kind: 'enum' },
      { group: 'Capacité de mémoire', help: 'capacity' },
      { group: 'Classe de vitesse vidéo', help: 'videoClass' },
      { group: 'Classe de vitesse UHS', help: 'uhsClass', kind: 'enum' },
      { group: 'Classe SD', help: 'sdClass', kind: 'enum' },
      { group: 'Standard UHS', help: 'uhsStd', kind: 'enum' },
      { group: 'Vitesse de lecture', help: 'read' },
      { group: "Vitesse d'écriture", help: 'write' },
    ],
  },
  dock: {
    quick: [
      { label: 'Thunderbolt', groups: ['Type de produit', 'Interface externe'], pick: /thunderbolt|usb ?4/i },
    ],
    more: [
      { group: 'Interface externe', help: 'extInterface', kind: 'enum' },
      { group: 'Type de produit', help: 'dockType', kind: 'enum' },
      { group: 'Sortie vidéo', help: 'videoOut', kind: 'enum' },
      { group: 'Connexion USB 3.0', help: 'usb3' },
      { group: 'Nombre de ports USB-C', help: 'usbCPorts' },
    ],
  },
  printer: {
    quick: [
      { label: 'A4', groups: ["Format d'impression DIN"], pick: /a4/i },
      { label: 'A3', groups: ["Format d'impression DIN"], pick: /a3/i },
      { label: 'Cartouches indiv.', groups: ['Type de cartouche', 'Type de produit'], pick: /individuel|séparé|separ/i },
      { label: 'Multi-couleur', groups: ['Type de cartouche', 'Type de produit'], pick: /multi|tricolore|3 couleurs/i },
      { label: "Réservoir d'encre", groups: ['Type de cartouche', 'Type de produit'], pick: /réservoir|reservoir|ecotank|encre/i },
    ],
    more: [
      { group: 'Type de produit', help: 'printerType', kind: 'enum' },
      { group: 'Type de cartouche', help: 'cartridge', kind: 'enum' },
      { group: 'Capacité papier max.', help: 'paper' },
      { group: 'Connectique', help: 'connectivity', kind: 'enum' },
      { group: "Fonction d'impression", help: 'printFunc', kind: 'enum' },
      { group: 'Fonction scanner', help: 'scanFunc', kind: 'enum' },
      { group: "Format d'impression DIN", help: 'printFormat', kind: 'enum' },
      { group: 'Photocopieur', help: 'copier', kind: 'enum' },
      { group: "Vitesse d'impression max. (noir & blanc)", help: 'printSpeed' },
    ],
  },
  extssd: {
    quick: [
      { label: 'USB4', groups: ['Interface'], pick: /usb4/i },
      { label: 'USB-C 3.2 Gen2', groups: ['Interface'], pick: /gen2 type-c|3\.2 gen2(?!x2)/i },
      { label: 'USB-C 3.2 Gen2x2', groups: ['Interface'], pick: /gen2x2/i },
      { label: 'USB-C 3.2 Gen1', groups: ['Interface'], pick: /gen1/i },
    ],
    more: [
      { group: 'Capacité en Go', help: 'capacity' },
      { group: 'Vitesse de transfert (lecture)', help: 'read' },
      { group: 'Vitesse de transfert (écriture)', help: 'write' },
      { group: 'Interface', help: 'interface', kind: 'enum' },
    ],
  },
  extstorage: {
    quick: [2, 4, 6, 8, 10].map(n => ({ label: n + ' To', groups: ['Capacité de stockage', 'Capacité en Go'], pick: new RegExp('^' + n + '\\s*to', 'i') })),
    more: [
      { group: 'Capacité de stockage', help: 'capacity' },
      { group: 'Mémoire cache', help: 'cache' },
      { group: 'Vitesse de rotation', help: 'rotation' },
      { group: 'Interface', help: 'interface', kind: 'enum' },
    ],
  },
  speakers: {
    quick: [
      { label: '2.1', groups: ['Système de haut-parleurs', 'Système'], pick: /2[.,]?1/i },
      { label: '5.1', groups: ['Système de haut-parleurs', 'Système'], pick: /5[.,]?1/i },
    ],
    more: [
      { group: 'Type de produit', help: 'speakerType', kind: 'enum' },
      { group: 'Mode de transmission', help: 'transmission', kind: 'enum' },
      { group: 'Système de haut-parleurs', help: 'speakerSystem', kind: 'enum' },
      { group: 'Adapté pour', help: 'adaptedFor', kind: 'enum' },
      { group: 'Commande haut-parleurs', help: 'control', kind: 'enum' },
      { group: 'Entrées analogiques', help: 'analogIn', kind: 'enum' },
      { group: 'Entrées numériques', help: 'digitalIn', kind: 'enum' },
      { group: 'Puissance PMPO', help: 'pmpo' },
      { group: 'Puissance RMS', help: 'rms' },
      { group: 'Système', help: 'system', kind: 'enum' },
    ],
  },
  soundcard: {
    quick: [],
    more: [
      { group: 'Type de produit', help: 'soundType', kind: 'enum' },
      { group: 'Utilisation', help: 'usage', kind: 'enum' },
      { group: 'Interface', help: 'interface', kind: 'enum' },
      { group: 'Système supporté', help: 'supportedOS', kind: 'enum' },
      { group: 'Bittiefe', help: 'bitDepth' },
      { group: 'Construction', help: 'build', kind: 'enum' },
      { group: 'Entrée', help: 'input', kind: 'enum' },
      { group: 'Entrée ligne', help: 'lineIn', kind: 'enum' },
      { group: 'Format Dolby', help: 'dolby', kind: 'enum' },
      { group: "Fréquence d'échantillonnage max.", help: 'sampleRate' },
      { group: 'Rapport signal/bruit', help: 'snr' },
      { group: 'Sortie', help: 'output', kind: 'enum' },
      { group: 'Sortie ligne', help: 'lineOut', kind: 'enum' },
    ],
  },
  capture: {
    quick: [
      { label: 'Boîtier', groups: ['Type de produit'], pick: /bo[iî]tier|externe|external/i },
      { label: 'Carte', groups: ['Type de produit'], pick: /carte|card|interne|internal/i },
    ],
    more: [
      { group: 'Type de produit', help: 'captureType', kind: 'enum' },
      { group: "Formats d'image", help: 'imageFormats', kind: 'enum' },
      { group: 'Formats vidéo', help: 'videoFormats', kind: 'enum' },
      { group: "Interface d'entrée", help: 'inputIface', kind: 'enum' },
      { group: 'Interface de sortie', help: 'outputIface', kind: 'enum' },
      { group: 'Bus', help: 'bus', kind: 'enum' },
      { group: 'Compatible vidéo analogique', help: 'analogVideo', kind: 'enum' },
    ],
  },
  monitorarm: {
    quick: [
      { label: 'VESA 100×100', groups: ['Norme de fixation'], pick: /100/i },
      { label: 'VESA 75×75', groups: ['Norme de fixation'], pick: /75/i },
      { label: '2 écrans', groups: ['Nombre maximal de moniteurs'], pick: /^2/i },
      { label: '3 écrans', groups: ['Nombre maximal de moniteurs'], pick: /^3/i },
    ],
    more: [
      { group: 'Type de produit', help: 'armType', kind: 'enum' },
      { group: 'Nombre maximal de moniteurs', help: 'maxMonitors' },
      { group: 'Adapté pour écran de', help: 'screenRange' },
      { group: 'Charge max.', help: 'maxLoad' },
      { group: 'Norme de fixation', help: 'vesa', kind: 'enum' },
      { group: 'Inclinable', help: 'tilt', kind: 'enum' },
      { group: 'Pivotant', help: 'swivel', kind: 'enum' },
    ],
  },
};

const W = 'https://fr.wikipedia.org/wiki/';
const FILTER_HELP = {
  tdp: { fr: "TDP (enveloppe thermique) : chaleur maximale dissipée par le composant. Plus il est bas, plus le refroidissement est simple et silencieux.", en: "TDP (thermal design power): the maximum heat the part dissipates. Lower means easier, quieter cooling.", wiki: W + 'Thermal_Design_Power' },
  threads: { fr: "Nombre de threads (cœurs logiques) : au-delà des cœurs physiques, il aide les charges parallèles (rendu, compilation, IA).", en: "Thread count (logical cores): beyond physical cores, it helps parallel workloads (rendering, compiling, AI).", wiki: W + 'Simultaneous_multithreading' },
  frequency: { fr: "Fréquence d'horloge : nombre de cycles par seconde. Une fréquence plus haute accélère les tâches légères/mono-cœur.", en: "Clock frequency: cycles per second. Higher clock speeds up light/single-core tasks.", wiki: W + 'Fr%C3%A9quence_d%27horloge' },
  cores: { fr: "Cœurs : unités de calcul indépendantes. Plus de cœurs = meilleures performances en charge parallèle.", en: "Cores: independent compute units. More cores means better parallel performance.", wiki: W + 'Processeur_multic%C5%93ur' },
  socket: { fr: "Socket : le support physique du processeur sur la carte mère. Le CPU et la carte mère doivent partager le même socket.", en: "Socket: the physical CPU mount on the motherboard. CPU and motherboard must share the same socket.", wiki: W + 'Socket_de_processeur' },
  capacity: { fr: "Capacité de stockage : espace disponible. Prévoyez de la marge pour l'OS, les jeux et les médias.", en: "Storage capacity: available space. Leave headroom for the OS, games and media.", wiki: W + 'Capacit%C3%A9_de_stockage' },
  memory: { fr: "Mémoire (VRAM) : mémoire de la carte graphique. Plus de VRAM = textures et hautes résolutions plus confortables.", en: "Video memory (VRAM): graphics card memory. More VRAM means higher resolutions and textures.", wiki: W + 'M%C3%A9moire_vid%C3%A9o' },
  ram: { fr: "Mémoire vive (RAM) : mémoire de travail du système. Trop peu entraîne des ralentissements.", en: "System RAM: the working memory. Too little causes slowdowns.", wiki: W + 'M%C3%A9moire_vive' },
  modules: { fr: "Nombre de modules (barrettes) : plus de barrettes (ex. 2×16 Go) activent le double canal et améliorent les débits.", en: "Module count: more sticks (e.g. 2×16 GB) enable dual-channel and improve throughput.", wiki: W + 'Dual_channel' },
  latency: { fr: "Latence CAS (CL) : délai avant que la mémoire ne réponde. Plus bas = plus rapide à fréquence égale.", en: "CAS latency (CL): delay before memory responds. Lower is faster at equal frequency.", wiki: W + 'CAS_latency' },
  ecc: { fr: "ECC : mémoire à correction d'erreurs, fiabilise les données (serveurs/station).", en: "ECC: error-correcting memory that improves data reliability (servers/workstations).", wiki: W + 'Code_correcteur_d%27erreur' },
  speed: { fr: "Débit/Vitesse : données transférées par seconde. Plus élevé = transferts plus rapides.", en: "Speed/throughput: data transferred per second. Higher means faster transfers.", wiki: W + 'D%C3%A9bit_binaire' },
  tbw: { fr: "TBW (endurance) : volume total de données que le SSD peut écrire avant usure. Plus élevé = durée de vie plus longue.", en: "TBW (endurance): total bytes a SSD can write before wear-out. Higher means longer life.", wiki: W + 'Endurance_(informatique)' },
  read: { fr: "Vitesse de lecture : débit en lecture séquentielle. Accélère les chargements.", en: "Read speed: sequential read throughput. Speeds up loading.", wiki: W + 'Solid-state_drive' },
  write: { fr: "Vitesse d'écriture : débit en écriture séquentielle. Compte pour les gros transferts.", en: "Write speed: sequential write throughput. Matters for large transfers.", wiki: W + 'Solid-state_drive' },
  cache: { fr: "Mémoire cache : mémoire tampon rapide intégrée au disque/CPU.", en: "Cache: fast buffer memory built into the drive/CPU.", wiki: W + 'M%C3%A9moire_cache' },
  rotation: { fr: "Vitesse de rotation : tours par minute d'un disque dur mécanique (rpm). Plus élevé = accès plus rapide.", en: "Rotation speed: RPM of a mechanical hard drive. Higher means faster access.", wiki: W + 'Disque_dur' },
  format: { fr: "Format : dimensions/standard physique. Il doit être compatible avec le boîtier ou la carte mère.", en: "Form factor: physical size/standard. Must match the case or motherboard.", wiki: '' },
  certification: { fr: "Certification 80 Plus : rendement de l'alimentation (Bronze < Argent < Or < Platine < Titane). Plus c'est haut, moins il y a de pertes.", en: "80 Plus rating: PSU efficiency (Bronze < Silver < Gold < Platinum < Titanium). Higher means fewer losses.", wiki: W + '80_PLUS' },
  psuForm: { fr: "Facteur de forme d'alimentation (ATX, SFX…) : doit correspondre à l'emplacement du boîtier.", en: "PSU form factor (ATX, SFX…): must match the case bay.", wiki: W + 'Alimentation_ATX' },
  slots: { fr: "Nombre d'emplacements : quantité de modules que l'on peut installer.", en: "Slot count: how many modules can be installed.", wiki: '' },
  pcie: { fr: "PCI Express : bus interne pour cartes d'extension. La version (3.0/4.0/5.0) définit le débit par voie.", en: "PCI Express: internal bus for expansion cards. The version (3.0/4.0/5.0) sets per-lane bandwidth.", wiki: W + 'PCI_Express' },
  bus: { fr: "Bus : type de connecteur/transport utilisé (PCIe, USB…).", en: "Bus: connector/transport type used (PCIe, USB…).", wiki: '' },
  interface: { fr: "Interface : type de connexion du périphérique (USB, SATA, NVMe, jack…).", en: "Interface: the peripheral connection type (USB, SATA, NVMe, jack…).", wiki: '' },
  ethernet: { fr: "Ethernet : réseau filaire. Le débit (1 Gb/s, 2,5, 5, 10 Gb/s) fixe la vitesse réseau locale.", en: "Ethernet: wired networking. The rate (1 Gb/s, 2.5, 5, 10 Gb/s) sets LAN speed.", wiki: W + 'Ethernet' },
  series: { fr: "Série/GPU : gamme du processeur graphique (ex. RTX 40, RX 7000). Détermine les performances.", en: "Series/GPU: graphics chip family (e.g. RTX 40, RX 7000). Sets performance.", wiki: W + 'Carte_graphique' },
  power: { fr: "Puissance : consommation/énergie. Doit rester dans les limites de l'alimentation et du refroidissement.", en: "Power: energy draw. Must stay within PSU and cooling limits.", wiki: W + 'Puissance_%C3%A9lectrique' },
  panel: { fr: "Dalle : technologie de l'écran (IPS, VA, OLED…). Influence couleurs, contraste et angles de vision.", en: "Panel: screen technology (IPS, VA, OLED…). Affects colors, contrast and viewing angles.", wiki: W + '%C3%89cran_%C3%A0_cristaux_liquides' },
  resolution: { fr: "Résolution : nombre de pixels (1080p, 1440p, 4K). Plus élevée = image plus nette, plus exigeante pour le GPU.", en: "Resolution: pixel count (1080p, 1440p, 4K). Higher means sharper but heavier on the GPU.", wiki: W + 'R%C3%A9solution_d%27affichage' },
  screenSize: { fr: "Taille de l'écran : diagonale en pouces.", en: "Screen size: diagonal in inches.", wiki: W + 'Pouce_(unit%C3%A9_de_longueur)' },
  refresh: { fr: "Taux de rafraîchissement : images par seconde affichables (Hz). Plus élevé = jeu plus fluide.", en: "Refresh rate: images per second (Hz). Higher means smoother gaming.", wiki: W + 'Fr%C3%A9quence_de_rafra%C3%AEchissement' },
  response: { fr: "Temps de réponse : délai de changement de couleur (ms). Plus bas = moins de rémanence.", en: "Response time: color-change delay (ms). Lower means less ghosting.", wiki: W + 'Temps_de_r%C3%A9ponse' },
  sync: { fr: "Synchronisation : FreeSync/G-Sync adapte le rafraîchissement pour éviter le tearing.", en: "Sync: FreeSync/G-Sync adapts refresh to avoid tearing.", wiki: W + 'FreeSync' },
  curvature: { fr: "Rayon de courbure : plus il est petit, plus l'écran est incurvé.", en: "Curvature radius: the smaller, the more curved the screen.", wiki: '' },
  videoIn: { fr: "Entrée vidéo : connecteurs disponibles (HDMI, DisplayPort, USB-C…).", en: "Video input: available connectors (HDMI, DisplayPort, USB-C…).", wiki: '' },
  dpi: { fr: "Résolution/Dpi : sensibilité de la souris (points par pouce). Plus élevé = mouvement plus précis.", en: "DPI: mouse sensitivity (dots per inch). Higher means finer tracking.", wiki: W + 'Points_par_pouce' },
  ergonomics: { fr: "Ergonomie : réglages du support (hauteur, inclinaison, pivot).", en: "Ergonomics: stand adjustments (height, tilt, pivot).", wiki: '' },
  buttons: { fr: "Nombre de touches/boutons additionnels programmables.", en: "Number of extra programmable buttons.", wiki: '' },
  microphone: { fr: "Microphone : caractéristiques du micro intégré (réducteur de bruit, détachable…).", en: "Microphone: built-in mic features (noise cancelling, detachable…).", wiki: W + 'Microphone' },
  connection: { fr: "Type de connexion : jack 3,5 mm, USB, USB-C, Bluetooth, XLR…", en: "Connection type: 3.5 mm jack, USB, USB-C, Bluetooth, XLR…", wiki: '' },
  wifi: { fr: "Wi-Fi : réseau sans fil. Les générations (Wi-Fi 6/6E/7) augmentent débit et stabilité.", en: "Wi-Fi: wireless networking. Generations (Wi-Fi 6/6E/7) raise speed and stability.", wiki: W + 'Wi-Fi' },
  wifiStd: { fr: "Standard Wi-Fi : génération du sans-fil (802.11ax = Wi-Fi 6, 802.11be = Wi-Fi 7).", en: "Wi-Fi standard: wireless generation (802.11ax = Wi-Fi 6, 802.11be = Wi-Fi 7).", wiki: W + 'IEEE_802.11' },
  poe: { fr: "PoE : alimentation par le câble réseau. Pratique pour bornes et caméras.", en: "PoE: power over the network cable. Handy for access points and cameras.", wiki: W + 'Power_over_Ethernet' },
  raid: { fr: "RAID : combinaison de disques pour la performance ou la redondance (RAID 0/1/5…).", en: "RAID: combining disks for performance or redundancy (RAID 0/1/5…).", wiki: W + 'RAID_(informatique)' },
  batteryLife: { fr: "Autonomie : durée de fonctionnement sur batterie.", en: "Battery life: runtime on battery.", wiki: W + 'Batterie_d%27accumulateurs' },
  protection: { fr: "Protection : parafoudre/surtension protégeant les appareils connectés.", en: "Protection: surge protection for connected devices.", wiki: W + 'Parafoudre' },
  plugs: { fr: "Nombre de prises : nombre d'appareils pouvant être branchés.", en: "Number of outlets: how many devices can be plugged in.", wiki: '' },
  cableLength: { fr: "Longueur de câble : portée de l'alimentation.", en: "Cable length: reach of the power strip.", wiki: '' },
  surge: { fr: "Protection contre les surtensions : absorbe les pics de tension.", en: "Surge protection: absorbs voltage spikes.", wiki: W + 'Parafoudre' },
  vesa: { fr: "Norme VESA : écartement des fixations (ex. 100×100 mm) au dos de l'écran.", en: "VESA standard: mounting hole spacing (e.g. 100×100 mm) on the monitor back.", wiki: W + 'VESA_Mounting_Interface' },
  uhsClass: { fr: "Classe de vitesse UHS (U1/U3) : débit minimal garanti de la carte mémoire.", en: "UHS Speed Class (U1/U3): guaranteed minimum card write speed.", wiki: W + 'Carte_SD#Classes_de_vitesse' },
  sdClass: { fr: "Classe SD (2/4/6/10) : débit minimal garanti.", en: "SD Speed Class (2/4/6/10): guaranteed minimum speed.", wiki: W + 'Carte_SD' },
  uhsStd: { fr: "Standard UHS (I/II) : génération du bus de la carte mémoire.", en: "UHS standard (I/II): card bus generation.", wiki: W + 'Carte_SD' },
  videoClass: { fr: "Classe vidéo (V6/V10/V30/V60/V90) : débit minimal pour l'enregistrement vidéo.", en: "Video Speed Class (V6/V10/V30/V60/V90): minimum write speed for video recording.", wiki: W + 'Carte_SD#Classes_de_vitesse' },
  connector: { fr: "Connecteur : type de prise physique.", en: "Connector: physical plug type.", wiki: '' },
  brand: { fr: "Fabricant : marque qui conçoit le produit (influe sur la garantie et la qualité).", en: "Manufacturer: the brand that designs the product (affects warranty and quality).", wiki: '' },
  price: { fr: "Prix : budget minimal et maximal. Le curseur à deux poignées ne garde que les produits de cette fourchette.", en: "Price: minimum and maximum budget. The dual-handle slider keeps only products within that range.", wiki: '' },
  deal: { fr: "Bon plan : n'affiche que les produits actuellement en promotion (remise ≥ 5 %).", en: "Deals: show only products currently discounted (≥ 5% off).", wiki: '' },
};
const HELP_MATCH = [
  [/tdp|thermal/, 'tdp'], [/thread/, 'threads'], [/frequen|fr[ée]quence/, 'frequency'], [/coeur|cœur|\bcore|processeur/, 'cores'],
  [/socket|sockel|support de processeur|prise/, 'socket'], [/capacit|kapazit/, 'capacity'], [/m[ée]moire vid|vram|board power|total board/, 'memory'],
  [/\bram\b|m[ée]moire vive/, 'ram'], [/module/, 'modules'], [/latence|cas/, 'latency'], [/\becc\b/, 'ecc'],
  [/vitesse|d[ée]bit|d[ée]lai|t[ée]l[ée]chargement|impression|rafra/, 'speed'], [/volume d.[ée]criture|tbw/, 'tbw'],
  [/lecture|read/, 'read'], [/[ée]criture|write/, 'write'], [/cache/, 'cache'], [/rotation|\brpm\b/, 'rotation'],
  [/format de carte|facteur de forme|form factor/, 'format'], [/certificat|efficacit|80 plus/, 'certification'],
  [/alimentation|facteur|psu/, 'psuForm'], [/emplacement/, 'slots'], [/pcie|pci express/, 'pcie'], [/\bbus\b/, 'bus'],
  [/interface/, 'interface'], [/ethernet|\blan\b/, 'ethernet'], [/s[ée]rie|gpu|graphique/, 'series'], [/puissance|\bpower\b|watt|pmpo|\brms\b/, 'power'],
  [/dalle|panel|oled|ips/, 'panel'], [/r[ée]solution/, 'resolution'], [/taille/, 'screenSize'], [/rafra|refresh/, 'refresh'],
  [/r[ée]ponse|latence/, 'response'], [/synchronisation|sync|freesync|g-sync/, 'sync'], [/courbure/, 'curvature'], [/entr[ée]e vid/, 'videoIn'],
  [/\bdpi\b|r[ée]solution max/, 'dpi'], [/ergonom/, 'ergonomics'], [/touches|bouton/, 'buttons'], [/micro/, 'microphone'],
  [/connexion/, 'connection'], [/wi.?fi|wlan/, 'wifiStd'], [/poe/, 'poe'], [/raid/, 'raid'], [/autonomie|batterie/, 'batteryLife'],
  [/protection|surtension|parafoudre/, 'protection'], [/prise/, 'plugs'], [/c[âa]ble/, 'cableLength'], [/vesa|fixation/, 'vesa'],
  [/uhs/, 'uhsClass'], [/classe sd/, 'sdClass'], [/vid[ée]o/, 'videoClass'],
];
function normName(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u2019/g, "'").replace(/\s+/g, ' ').trim();
}
function filterHelpKey(name) {
  const s = normName(name);
  for (const [re, key] of HELP_MATCH) if (re.test(s)) return key;
  return null;
}
function filterHelp(name) { const k = filterHelpKey(name); return k ? FILTER_HELP[k] : null; }
function infoBtn(name, entry) {
  let h = null;
  if (entry && entry.help && FILTER_HELP[entry.help]) h = FILTER_HELP[entry.help];
  if (!h && entry && entry.tip) h = { fr: entry.tip, en: entry.tip, wiki: entry.wiki || '' };
  if (!h) h = filterHelp(name);
  let tip = h ? (h[lang] || h.fr || '') : '';
  const wiki = (h && h.wiki) || (entry && entry.wiki) || '';
  if (!tip) tip = lang === 'en' ? `${name}: Idealo filter criterion. Use the slider/list to narrow the results.` : `${name} : critère de filtrage Idealo. Utilisez le curseur/la liste pour restreindre les résultats.`;
  return `<button type="button" class="f-info" data-tip="${esc(tip)}" data-wiki="${esc(wiki)}" aria-label="Aide"><i class="fa-solid fa-circle-info"></i></button>`;
}

function numOf(name) {
  const s = String(name).toLowerCase().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const unit = (s.match(UNIT_RE) || [])[1] || '';
  return { n: parseFloat(m[1].replace(',', '.')), unit: unit.toLowerCase() };
}
function prettyUnit(u) {
  const s = String(u || '');
  const map = { go: 'Go', to: 'To', mo: 'Mo', gb: 'GB', tb: 'TB', w: 'W', kw: 'kW', ghz: 'GHz', mhz: 'MHz', hz: 'Hz', khz: 'kHz', db: 'dB', 'mt/s': 'MT/s', 'gb/s': 'GB/s', 'mb/s': 'MB/s', gbps: 'Gbps', mbps: 'Mbps' };
  return map[s] || s;
}
function rangeStops(g) {
  const byNum = g.options.map(o => { const p = numOf(o.name); return p ? { n: p.n, id: o.id, unit: p.unit } : null; });
  if (byNum.some(x => !x)) return null;
  const stops = [...new Set(byNum.map(x => x.n))].sort((a, b) => a - b);
  if (stops.length < 2) return null;
  const unit = (byNum.find(x => x.unit) || {}).unit || '';
  return { unit, stops, byNum };
}
function isRangeGroup(g) {
  if (NON_RANGE_RE.test(g.name) || !RANGE_GROUP_RE.test(g.name)) return false;
  return !!rangeStops(g);
}
/* Ordered options of a group for a slider: numeric (sorted by value) or enum (original order). */
function modelOf(g, numeric) {
  const items = g.options.map((o, i) => ({ id: o.id, name: o.name, n: (numOf(o.name) || {}).n || 0, idx: i }));
  if (numeric) items.sort((a, b) => a.n - b.n);
  return { numeric: !!numeric, unit: (numeric && (rangeStops(g) || {}).unit) || '', items };
}
function findGroup(d, names) {
  if (!d || !d.groups) return null;
  const list = (Array.isArray(names) ? names : [names]).map(normName);
  for (const nm of list) {
    if (!nm) continue;
    let g = d.groups.find(x => normName(x.name) === nm) || d.groups.find(x => normName(x.name).includes(nm));
    if (g) return g;
  }
  return null;
}
function pickForms(name) {
  const raw = String(name || '');
  return [raw, normName(raw), raw.replace(/[\s\u00a0\u202f.,]/g, '')];
}
function resolveQuick(def, d) {
  for (const nm of (def.groups || [def.group])) {
    const g = findGroup(d, [nm]);
    if (!g) continue;
    for (const o of g.options) {
      const forms = pickForms(o.name);
      if (forms.some(f => def.pick.test(f))) return { gid: g.id, oid: o.id };
    }
  }
  return null;
}
function dynamicQuick(key, d) {
  if (key !== 'cooler' || !pickerSocketToken || !d) return [];
  return [{ label: pickerSocketToken, groups: ['Support de processeur compatible'], pick: new RegExp(pickerSocketToken.replace(/[^a-z0-9]/gi, '.?'), 'i') }];
}
function priceChanged() {
  const p = pickerFilterData && pickerFilterData.price;
  if (!p || p.min == null || p.max == null) return false;
  return String(pickerPrice.from) !== String(p.min) || String(pickerPrice.to) !== String(p.max);
}
function filterActive() { return Object.keys(pickerSel).some(g => (pickerSel[g] || []).length) || pickerDiscount || priceChanged(); }
function activeCount() {
  let n = Object.keys(pickerSel).filter(g => (pickerSel[g] || []).length).length;
  if (priceChanged()) n++;
  if (pickerDiscount) n++;
  return n;
}
function toggleFacet(gid, oid, on) {
  const cur = pickerSel[gid] || [];
  const has = cur.includes(oid);
  const want = on === undefined ? !has : !!on;
  let next = want ? (has ? cur : [...cur, oid]) : cur.filter(x => x !== oid);
  if (next.length) pickerSel[gid] = next; else delete pickerSel[gid];
}

/* ---------- render ---------- */
function buildListBlock(g, entry, cls) {
  const single = !!entry.single;
  const sel = pickerSel[g.id] || [];
  const opts = g.options.map(o => {
    const checked = sel.includes(o.id) ? ' checked' : '';
    const input = single
      ? `<input type="radio" name="pf-${g.id}" data-gid="${g.id}" data-oid="${o.id}" data-single="1"${checked}>`
      : `<input type="checkbox" data-gid="${g.id}" data-oid="${o.id}"${checked}>`;
    return `<label class="f-opt" data-name="${esc(normName(o.name))}">${input} <span>${esc(o.name)}</span>${o.hits ? `<em>${o.hits}</em>` : ''}</label>`;
  }).join('');
  return `<div class="f-grp ${cls || ''}" data-gid="${g.id}"><div class="f-head"><span class="f-name">${esc(g.name)}</span>${infoBtn(g.name, entry)}</div><div class="f-searchrow"><i class="fa-solid fa-magnifying-glass"></i><input type="search" class="f-search" data-gid="${g.id}" placeholder="${esc(t('picker.searchOpt'))}"></div><div class="f-opts f-scroll">${opts}</div></div>`;
}
function sliderFmt(m) {
  return i => { const it = m.items[i] || {}; return m.numeric ? ((Math.round((it.n || 0) * 100) / 100) + (m.unit ? ' ' + prettyUnit(m.unit) : '')) : it.name; };
}
function buildSingleSliderBlock(g, entry, cls, numeric) {
  const m = modelOf(g, numeric);
  if (m.items.length < 2) return buildListBlock(g, entry, cls);
  const sel = pickerSel[g.id] || [];
  const found = sel.length ? m.items.findIndex(x => x.id === sel[0]) : 0;
  const val = found >= 0 ? found : 0;
  const fmt = sliderFmt(m);
  return `<div class="f-grp ${cls || ''}" data-gid="${g.id}"><div class="f-head"><span class="f-name">${esc(g.name)}</span>${infoBtn(g.name, entry)}</div>` +
    `<div class="f-range" data-gid="${g.id}" data-single="1"${m.numeric ? ' data-numeric="1"' : ''}>` +
    `<div class="dslider"><div class="dtrack"></div><input type="range" class="f-rsingle" min="0" max="${m.items.length - 1}" step="1" value="${val}" aria-label="${esc(g.name)}"></div>` +
    `<span class="f-rlbl">${esc(fmt(val))}</span></div></div>`;
}
function buildSliderBlock(g, entry, cls, numeric) {
  const m = modelOf(g, numeric);
  if (m.items.length < 2) return buildListBlock(g, entry, cls);
  const sel = pickerSel[g.id] || [];
  const idxs = sel.map(id => m.items.findIndex(x => x.id === id)).filter(i => i >= 0);
  const lo = idxs.length ? Math.min(...idxs) : 0;
  const hi = idxs.length ? Math.max(...idxs) : m.items.length - 1;
  const fmt = sliderFmt(m);
  return `<div class="f-grp ${cls || ''}" data-gid="${g.id}"><div class="f-head"><span class="f-name">${esc(g.name)}</span>${infoBtn(g.name, entry)}</div>` +
    `<div class="f-range" data-gid="${g.id}"${m.numeric ? ' data-numeric="1"' : ''}>` +
    `<div class="dslider"><div class="dtrack"></div><input type="range" class="f-rlo" min="0" max="${m.items.length - 1}" step="1" value="${lo}" aria-label="min"><input type="range" class="f-rhi" min="0" max="${m.items.length - 1}" step="1" value="${hi}" aria-label="max"></div>` +
    `<span class="f-rlbl">${esc(fmt(lo))} – ${esc(fmt(hi))}</span></div></div>`;
}
function renderGroupBlock(g, entry, cls) {
  entry = entry || {};
  const big = g.options.length > 10;
  if (entry.kind === 'enum') return (entry.single || big) ? buildListBlock(g, entry, cls) : buildSliderBlock(g, entry, cls, false);
  if (entry.kind === 'range') return entry.single ? buildSingleSliderBlock(g, entry, cls, true) : buildSliderBlock(g, entry, cls, true);
  if (rangeStops(g)) return entry.single ? buildSingleSliderBlock(g, entry, cls, true) : buildSliderBlock(g, entry, cls, true);
  if (entry.single) return buildListBlock(g, entry, cls);
  return big ? buildListBlock(g, entry, cls) : buildSliderBlock(g, entry, cls, false);
}
function buildMoreHtml(d) {
  const parts = [`<p class="hint f-hint">${esc(t('picker.filtersHint'))}</p>`];
  const consumed = new Set();
  if (d.price && d.price.min != null && d.price.max != null && d.price.max > d.price.min) {
    const lo = pickerPrice.from == null ? d.price.min : pickerPrice.from;
    const hi = pickerPrice.to == null ? d.price.max : pickerPrice.to;
    parts.push(`<div class="f-grp f-always" data-gid="__price"><div class="f-head"><span class="f-name">${lang === 'en' ? 'Price' : 'Prix'}</span>${infoBtn('price', { help: 'price' })}</div>` +
      `<div class="f-range" data-gid="__price" data-kind="price" data-numeric="1"><div class="dslider"><div class="dtrack"></div><input type="range" class="f-rlo" min="${d.price.min}" max="${d.price.max}" step="1" value="${lo}" aria-label="min"><input type="range" class="f-rhi" min="${d.price.min}" max="${d.price.max}" step="1" value="${hi}" aria-label="max"></div><span class="f-rlbl">${esc(eur(lo))} – ${esc(eur(hi))}</span></div></div>`);
  }
  const brand = d.groups.find(g => BRAND_RE.test(g.name));
  if (brand) { consumed.add(brand.id); parts.push(buildListBlock(brand, { help: 'brand' }, 'f-always')); }
  parts.push(`<div class="f-grp f-always"><div class="f-head"><span class="f-name">${lang === 'en' ? 'Deals' : 'Bon plan'}</span>${infoBtn('deal', { help: 'deal' })}</div><label class="f-opt"><input type="checkbox" data-special="deal"${pickerDiscount ? ' checked' : ''}> <span>${lang === 'en' ? 'Discounted (≥ 5%)' : 'En promotion (≥ 5 %)'}</span></label></div>`);
  const schema = PICKER_SCHEMA[pickerCatKey];
  if (schema) {
    (schema.more || []).forEach(entry => {
      const g = findGroup(d, entry.group || entry.groups);
      if (!g || consumed.has(g.id)) return;
      consumed.add(g.id);
      parts.push(renderGroupBlock(g, entry, 'f-more'));
    });
  } else {
    d.groups.forEach(g => {
      if (consumed.has(g.id) || BRAND_RE.test(g.name) || AVAIL_RE.test(g.name)) return;
      consumed.add(g.id);
      parts.push(renderGroupBlock(g, {}, ''));
    });
  }
  return parts.join('');
}
function renderRootQuick(host) {
  ROOT_QUICK_CATS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'qf-pill' + (pickerCatKey === c.key ? ' active' : '');
    b.textContent = c.label;
    b.onclick = () => selectRootQuick(pickerCatKey === c.key ? null : c);
    host.appendChild(b);
  });
  host.classList.remove('hidden');
}
function renderQuickPills(host) {
  const d = pickerFilterData;
  const schema = PICKER_SCHEMA[pickerCatKey];
  const defs = [...((schema && schema.quick) || []), ...dynamicQuick(pickerCatKey, d)];
  const seen = new Set();
  defs.forEach(def => {
    if (seen.has(def.label)) return; seen.add(def.label);
    let active = false, onclick = null;
    if (def.baseFacet) {
      active = baseHasFacet(def.facet);
      onclick = () => switchBaseFacet(def.facet);
    } else {
      if (!d) return;
      const r = resolveQuick(def, d);
      if (!r) return;
      active = (pickerSel[r.gid] || []).includes(r.oid);
      onclick = () => { toggleFacet(r.gid, r.oid); applyPickerFilters(); renderPickerFilters(); };
    }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'qf-pill' + (active ? ' active' : ''); b.textContent = def.label;
    b.onclick = onclick;
    host.appendChild(b);
  });
  host.classList.toggle('hidden', !host.children.length);
}
function pickerToolsHost() { const p = $('#pickerFilters'); return p && p.closest('.picker-tools'); }
function renderPickerFilters() {
  const quickHost = $('#pickerQuick'), moreWrap = $('#pickerMoreWrap'), panel = $('#pickerFilters');
  if (!quickHost || !panel) return;
  quickHost.innerHTML = '';
  if (pickerCatKey === 'root') renderRootQuick(quickHost);
  else renderQuickPills(quickHost);
  const d = pickerFilterData;
  const has = !!(d && d.groups && d.groups.length);
  if (moreWrap) moreWrap.classList.toggle('hidden', !has && !(pickerFilterBusy && pickerCatKey !== 'root'));
  const badge = $('#pickerMoreCount');
  if (badge) { const n = activeCount(); badge.textContent = n ? String(n) : ''; badge.classList.toggle('hidden', !n); }
  const btn = $('#pickerMoreBtn'); if (btn) btn.classList.toggle('active', pickerMoreOpen);
  const clearBtn = $('#pickerClearFilters');
  if (clearBtn) clearBtn.classList.toggle('hidden', !filterActive());
  const open = pickerMoreOpen && has;
  const host = pickerToolsHost(); if (host) host.classList.toggle('filters-open', open); // hide component results while filtering
  if (pickerFilterBusy && !has) {
    panel.classList.remove('hidden');
    panel.innerHTML = `<p class="hint">${lang === 'en' ? 'Loading filters…' : 'Chargement des filtres…'}</p>`;
    return;
  }
  panel.classList.toggle('hidden', !open);
  if (!open) return;
  panel.innerHTML = buildMoreHtml(d);
}
function setIdealoTarget(url, label, key) {
  currentIdealoUrl = url;
  if (label) currentCatLabel = label;
  if (key) currentCatKey = key;
  const a = $('#pickerIdealoSearch'); if (a) a.href = url;
  const f = $('#idealoOpenFallback'); if (f) f.onclick = () => window.open(url, '_blank', 'noopener');
}
function baseHasFacet(fid) {
  const p = Imm_parseCat(pickerFilterBase);
  return !!(p && p.facets.includes(String(fid)));
}
function Imm_parseCat(url) { try { return Idealo.parseCatUrl(url); } catch { return null; } }
function switchBaseFacet(fid) {
  const p = Imm_parseCat(pickerFilterBase) || Imm_parseCat(catUrl(pickerCatKey));
  if (!p) return;
  const url = `${p.origin}/cat/${p.catId}F${fid}/${p.slug}`;
  ++pickerSeq;
  applyCatUrl(pickerCatKey, url);
  loadIdealoList(url, 'fresh');
  pickerSetupFilters(url, pickerCatKey);
}
function selectRootQuick(c) {
  if (!c) {
    const root = IDEALO_CATS[0];
    setIdealoTarget(root.url, root.label, 'root');
    loadIdealoList(root.url);
    pickerSetupFilters(root.url, 'root');
    return;
  }
  setIdealoTarget(c.url, c.label, c.key);
  loadIdealoList(c.url);
  pickerSetupFilters(c.url, c.key);
}
function applyPickerFilters() {
  if (!pickerFilterBase) return;
  const d = pickerFilterData || { byFacet: {} };
  const pa = priceChanged();
  const url = Idealo.composeUrl(pickerFilterBase, {
    selected: pickerSel, byFacet: d.byFacet,
    priceFrom: pa ? pickerPrice.from : '', priceTo: pa ? pickerPrice.to : '',
    discountFrom: pickerDiscount ? 5 : '',
  });
  setIdealoTarget(url, null, null);
  savePickerFilters();
  loadIdealoList(url);
}
function savePickerFilters() {
  if (!pickerFilterBase) return;
  try {
    const all = load(LS.prefs, {});
    const store = { ...(all.idealFilters || {}) };
    if (filterActive()) store[pickerCatKey] = { sel: pickerSel, price: pickerPrice, discount: pickerDiscount };
    else delete store[pickerCatKey];
    save(LS.prefs, { ...all, idealFilters: store });
  } catch { /* ignore */ }
}
function pickerResetFilters(url, key) {
  pickerCatKey = key; pickerFilterBase = url;
  pickerFilterData = null; pickerSel = {}; pickerPrice = { from: null, to: null }; pickerDiscount = false;
  pickerFilterBusy = false; pickerFilterErr = ''; pickerRestored = false; pickerSocketToken = null;
  renderPickerFilters();
}
function pickerClearFilters() {
  const p = pickerFilterData && pickerFilterData.price;
  pickerSel = {}; pickerDiscount = false;
  pickerPrice = { from: p ? p.min : null, to: p ? p.max : null };
  savePickerFilters();
  renderPickerFilters();
  loadIdealoList(pickerFilterBase || currentIdealoUrl);
  applyAutoQuick(pickerCatKey);
}
async function pickerSetupFilters(url, key) {
  pickerResetFilters(url, key);
  if (key === 'root' || !Idealo.filters || !Idealo.parseCatUrl || !Idealo.parseCatUrl(url)) { renderPickerFilters(); return; }
  const my = ++filterSeq;
  pickerFilterBusy = true; renderPickerFilters();
  const data = await Idealo.filters(url);
  if (my !== filterSeq) return;
  pickerFilterBusy = false;
  pickerFilterData = data;
  pickerFilterErr = data.error || '';
  pickerPrice = { from: data.price ? data.price.min : null, to: data.price ? data.price.max : null };
  const saved = ((load(LS.prefs, {}) || {}).idealFilters || {})[key];
  if (saved && (Object.keys(saved.sel || {}).length || saved.discount)) {
    pickerSel = saved.sel || {};
    pickerPrice = saved.price || pickerPrice;
    pickerDiscount = !!saved.discount;
    pickerRestored = true;
    renderPickerFilters();
    if (filterActive()) applyPickerFilters();
    else renderPickerFilters();
    return;
  }
  renderPickerFilters();
  applyAutoQuick(key);
}
function applyAutoQuick(key) {
  const d = pickerFilterData; if (!d || !d.groups.length) return;
  const my = filterSeq;
  const ok = () => my === filterSeq && pickerFilterData === d;
  const pick = (gid, oid) => { toggleFacet(gid, oid, true); };
  const byOpt = (groupRe, optRe) => { const g = d.groups.find(x => groupRe.test(x.name)); const o = g && g.options.find(x => optRe.test(x.name)); return o ? { gid: g.id, oid: o.id } : null; };
  const done = () => { if (!ok()) return; renderPickerFilters(); applyPickerFilters(); };
  const socketLabel = { AM4: /am4/i, AM5: /am5/i, LGA1700: /17[07]0/i, LGA1770: /17[07]0/i, LGA1851: /185[01]/i, sTR5: /tr5/i };
  if (key === 'keyboard') { const r = byOpt(/langue du clavier|type.*clavier|disposition|layout/i, /azerty|fr/i); if (r) { pick(r.gid, r.oid); done(); } return; }
  if (key === 'multiprise') { const r = byOpt(/type de prise|prise|socket|stecker/i, /schuko|type f|type e/i); if (r) { pick(r.gid, r.oid); done(); } return; }
  if (key === 'mb' || key === 'cooler') {
    cpuSocketKey().then(tok => {
      if (!ok()) return;
      if (tok) pickerSocketToken = tok === 'LGA1700' ? '1700' : tok === 'LGA1770' ? '1770' : tok === 'LGA1851' ? '1851' : tok;
      const re = socketLabel[tok] || new RegExp(tok, 'i');
      const r = byOpt(/support de processeur|socket|sockel|prise/i, re);
      if (r) { pick(r.gid, r.oid); done(); }
      else renderPickerFilters();
    }).catch(() => { /* ignore */ });
    return;
  }
}
function onFilterChange(e) {
  const t = e.target;
  if (t.dataset && t.dataset.special === 'deal') { pickerDiscount = t.checked; applyPickerFilters(); renderPickerFilters(); return; }
  if (t.dataset && t.dataset.gid && t.dataset.oid) {
    if (t.dataset.single) {
      if (t.checked) pickerSel[t.dataset.gid] = [t.dataset.oid]; else delete pickerSel[t.dataset.gid];
    } else {
      toggleFacet(t.dataset.gid, t.dataset.oid, t.checked);
    }
    applyPickerFilters(); renderPickerFilters(); return;
  }
  if (t.classList && t.classList.contains('f-rsingle')) {
    commitSingle(t); applyPickerFilters(); renderPickerFilters(); return;
  }
  if (t.classList && (t.classList.contains('f-rlo') || t.classList.contains('f-rhi'))) {
    commitRange(t); applyPickerFilters(); renderPickerFilters(); return;
  }
}
function onFilterInput(e) {
  const t = e.target;
  if (!t.classList) return;
  if (t.classList.contains('f-search')) {
    const q = normName(t.value);
    const grp = t.closest('.f-grp'); if (!grp) return;
    grp.querySelectorAll('.f-opt').forEach(l => { l.style.display = (!q || (l.dataset.name || '').includes(q)) ? '' : 'none'; });
    return;
  }
  if (t.classList.contains('f-rsingle')) { updateSingleLabel(t); return; }
  if (t.classList.contains('f-rlo') || t.classList.contains('f-rhi')) {
    t.style.zIndex = t.classList.contains('f-rhi') ? '4' : '5';
    updateRangeLabel(t, true);
  }
}
function onFilterClick(e) {
  const info = e.target.closest && e.target.closest('.f-info');
  if (info) { showFilterTip(info); }
}
function rangeFmt(box, g, i) {
  if (box.dataset.kind === 'price') return eur(i);
  const m = modelOf(g, box.dataset.numeric === '1');
  const it = m.items[i] || {};
  return m.numeric ? ((Math.round((it.n || 0) * 100) / 100) + (m.unit ? ' ' + prettyUnit(m.unit) : '')) : (it.name || '');
}
function updateRangeLabel(input, clamp) {
  const box = input.closest('.f-range'); if (!box) return;
  const lo = box.querySelector('.f-rlo'), hi = box.querySelector('.f-rhi');
  let a = +lo.value, b = +hi.value;
  if (clamp) { if (a > b) { if (input === lo) { b = a; hi.value = b; } else { a = b; lo.value = a; } } }
  const lbl = box.querySelector('.f-rlbl'); if (!lbl) return;
  const isPrice = box.dataset.kind === 'price';
  const g = isPrice ? null : (pickerFilterData && pickerFilterData.groups.find(x => x.id === box.dataset.gid));
  lbl.textContent = rangeFmt(box, g, a) + ' – ' + rangeFmt(box, g, b);
}
function commitRange(input) {
  const box = input.closest('.f-range'); if (!box) return;
  const lo = box.querySelector('.f-rlo'), hi = box.querySelector('.f-rhi');
  let a = +lo.value, b = +hi.value; if (a > b) { const t = a; a = b; b = t; lo.value = a; hi.value = b; }
  if (box.dataset.kind === 'price') { pickerPrice = { from: a, to: b }; return; }
  const g = pickerFilterData && pickerFilterData.groups.find(x => x.id === box.dataset.gid);
  if (!g) return;
  const m = modelOf(g, box.dataset.numeric === '1');
  const ids = m.items.slice(a, b + 1).map(x => x.id);
  if (ids.length) pickerSel[g.id] = ids; else delete pickerSel[g.id];
}
function singleModel(box) {
  const g = pickerFilterData && pickerFilterData.groups.find(x => x.id === box.dataset.gid);
  if (!g) return {};
  return { g, m: modelOf(g, box.dataset.numeric === '1') };
}
function updateSingleLabel(input) {
  const box = input.closest('.f-range'); if (!box) return;
  const lbl = box.querySelector('.f-rlbl'); if (!lbl) return;
  const { g, m } = singleModel(box);
  if (!m || !m.items) return;
  lbl.textContent = rangeFmt(box, g, +input.value);
}
function commitSingle(input) {
  const box = input.closest('.f-range'); if (!box) return;
  const { g, m } = singleModel(box);
  if (!g || !m || !m.items) return;
  const it = m.items[+input.value];
  if (it) pickerSel[g.id] = [it.id];
}
function showFilterTip(btn) {
  const tip = $('#pickerTip'); if (!tip) return;
  const txt = btn.dataset.tip || '';
  const wiki = btn.dataset.wiki || '';
  tip.innerHTML = `${esc(txt)}${wiki ? ` <a href="${esc(wiki)}" target="_blank" rel="noopener">${lang === 'en' ? 'Learn more' : 'En savoir plus'} <i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}`;
  tip.classList.remove('hidden');
  const r = btn.getBoundingClientRect();
  tip.style.top = (r.bottom + 8) + 'px';
  tip.style.left = Math.max(8, Math.min(r.left, window.innerWidth - tip.offsetWidth - 12)) + 'px';
}
function hideFilterTip() { const tip = $('#pickerTip'); if (tip) tip.classList.add('hidden'); }
function pickerPriceActive() { return !!(pickerFilterData && pickerFilterBase) && priceChanged(); }

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
      <div class="fld full"><label>${lang === 'en' ? 'Manual URL' : 'URL du manuel'} <button type="button" class="mini-btn" id="f_manualOpen" title="${lang === 'en' ? 'Open manual in new tab' : 'Ouvrir le manuel dans un nouvel onglet'}" ${p.manual ? '' : 'disabled'}><i class="fa-solid fa-arrow-up-right-from-square"></i></button></label><input id="f_manual" value="${esc(p.manual)}" placeholder="https://…pdf"></div>
      <div class="fld full"><label>${lang === 'en' ? 'Store URL (offer link)' : 'URL boutique (lien de l’offre)'}</label><input id="f_store" value="${esc(p.store)}" placeholder="https://…"></div>
    </div>
    <div class="btn-row"><button class="btn btn-primary" id="f_save"><i class="fa-solid fa-check"></i> ${lang === 'en' ? 'Save fiche' : 'Enregistrer'}</button>
    ${!isNew ? `<button class="btn" id="f_delP" style="color:var(--danger)"><i class="fa-solid fa-trash"></i></button>` : ''}</div>`, 'modal-wide');
  if (opts.focus === 'manual') setTimeout(() => $('#f_manual').focus(), 50);
  $('#f_manualOpen').onclick = () => { const u = $('#f_manual').value.trim(); if (u) window.open(u, '_blank', 'noopener'); };
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
  updateMobileTotalBar();
  refreshIcons();
}
function focusComponent(id) {
  const card = document.querySelector(`[data-slot="${id}"]`);
  if (!card) return;
  closeSummarySheet();
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), 1400);
}
/* ---------- Pie colors: adjacent slices get highly contrasted colors; duplicate types darkened ---------- */
const PIE_COLORS = ['#8b5cf6', '#eab308', '#22c55e', '#92400e', '#14b8a6', '#ec4899', '#2563eb', '#f97316', '#65a30d', '#4f46e5', '#dc2626', '#0d9488', '#c026d3', '#0ea5e9', '#a16207', '#e11d48', '#7c3aed', '#0891b2', '#d97706', '#059669', '#475569', '#a21caf'];
function shade(hex, k) {
  if (!k) return hex;
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  const f = Math.max(0.28, 1 - 0.17 * k);
  const hx = v => Math.round(v * f).toString(16).padStart(2, '0');
  return '#' + hx(r) + hx(g) + hx(b);
}
function buildColors(items) { // items in render order: consecutive types take consecutive (very different) palette colors; duplicates darkened
  const base = {}, seen = {}, map = {};
  items.forEach(it => {
    if (!(it.defId in base)) base[it.defId] = PIE_COLORS[Object.keys(base).length % PIE_COLORS.length];
    const k = seen[it.defId] || 0;
    map[it.id] = shade(base[it.defId], k); seen[it.defId] = k + 1;
  });
  return map;
}
function pieSVG(items, size = 150) {
  const total = items.reduce((a, b) => a + b.v, 0) || 1;
  const cols = ['#1a8744', '#2fa968', '#7ed491', '#0ca678', '#94d82d', '#1971c2', '#845ef7', '#e8890c', '#e03131', '#868e96'];
  let a0 = -Math.PI / 2, paths = '';
  items.forEach((it, i) => {
    const a1 = a0 + (it.v / total) * Math.PI * 2;
    const r = size / 2, cx = r, cy = r;
    const col = it.color || cols[i % cols.length];
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
/* ---------- Usage & tarification (weekly 7×24 grids, index = day*24 + hour) ---------- */
const WEEK_DAYS = { fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
/* The PC-usage/tarification config is part of the saved config (state.usage):
   it is saved/exported with the config and reset when a new config is created. */
function defaultUsage() {
  const usage = Array(168).fill(0);
  for (let d = 0; d < 7; d++) for (let h = 18; h <= 21; h++) usage[d * 24 + h] = 1;
  return { usage, tarif: Array(168).fill(1), priceHP: 0.2146, priceHC: 0.1696 };
}
function normUsage(u) {
  const norm = (arr, fillFn) => {
    if (Array.isArray(arr) && arr.length === 168) return arr.map(x => (x ? 1 : 0));
    if (Array.isArray(arr) && arr.length === 24) { const o = []; for (let d = 0; d < 7; d++) o.push(...arr.map(x => (x ? 1 : 0))); return o; }
    return fillFn();
  };
  const d = defaultUsage();
  return {
    usage: norm(u && u.usage, () => d.usage),
    tarif: norm(u && u.tarif, () => d.tarif),
    priceHP: (u && Number(u.priceHP) > 0) ? Number(u.priceHP) : d.priceHP,
    priceHC: (u && Number(u.priceHC) > 0) ? Number(u.priceHC) : d.priceHC,
  };
}
function usagePrefs() {
  if (!state.usage) state.usage = defaultUsage(); // lazy init (fresh/legacy drafts)
  state.usage = normUsage(state.usage);
  return state.usage;
}
function saveUsagePrefs(u) {
  state.usage = normUsage(u);
  persist();
}
function usageWeeklyHours(st) { return st.usage.reduce((a, b) => a + (b ? 1 : 0), 0); }
function usageDailyHours(st) { return usageWeeklyHours(st) / 7; }
function usageAnnualKwh(powerW, st) { return powerW * usageDailyHours(st) * 365 / 1000; }
function usageAnnualCost(powerW, st) {
  let cost = 0;
  const occ = 365 / 7; // each weekday recurs ~52.14 times per year
  for (let i = 0; i < 168; i++) if (st.usage[i]) cost += powerW * occ / 1000 * (st.tarif[i] ? st.priceHP : st.priceHC);
  return cost;
}
function openUsageEditor() {
  const st = JSON.parse(JSON.stringify(usagePrefs())); // detached copy; committed on Save
  let tab = 'usage';
  const days = WEEK_DAYS[lang] || WEEK_DAYS.fr;
  const hh = i => String(i).padStart(2, '0');
  const cal = kind => {
    const head = `<span class="wk-corner"></span>` + days.map(d => `<span class="wk-dayh">${d}</span>`).join('');
    const rows = Array.from({ length: 24 }, (_, h) => `<span class="wk-hour">${hh(h)}h</span>` + days.map((_, di) => {
      const i = di * 24 + h; const v = kind === 'tarif' ? st.tarif[i] : st.usage[i];
      return `<button type="button" class="day-sq ${kind === 'tarif' ? (v ? 'hp' : 'hc') : (v ? 'on' : '')}" data-i="${i}" title="${days[di]} ${hh(h)}h"></button>`;
    }).join('')).join('');
    return `<div class="wk" data-kind="${kind}">${head}${rows}</div>`;
  };
  const paneUsage = () => `
    <p class="hint">${lang === 'en' ? 'Click the hours the PC is used, for each day of the week (on/off).' : 'Cliquez les heures d’utilisation du PC, pour chaque jour de la semaine (marche/arrêt).'}</p>
    ${cal('usage')}
    <p class="hint" style="margin-top:8px"><span id="u_usageCount">${usageWeeklyHours(st)}</span> ${lang === 'en' ? 'h/week' : 'h/semaine'} · <span id="u_usageDaily">${usageDailyHours(st).toFixed(1)}</span> ${lang === 'en' ? 'h/day avg' : 'h/jour moy.'}</p>`;
  const paneTarif = () => `
    <p class="hint">${lang === 'en' ? 'Toggle each hour: light orange = peak (HP), green = off-peak (HC).' : 'Basculez chaque heure : orange clair = heures pleines (HP), vert = heures creuses (HC).'}</p>
    ${cal('tarif')}
    <div class="form-grid" style="margin-top:10px">
      <div class="fld"><label>${lang === 'en' ? 'Peak price (€/kWh)' : 'Heures pleines (€/kWh)'}</label><input id="u_hp" type="number" min="0" step="0.0001" value="${st.priceHP}"></div>
      <div class="fld"><label>${lang === 'en' ? 'Off-peak price (€/kWh)' : 'Heures creuses (€/kWh)'}</label><input id="u_hc" type="number" min="0" step="0.0001" value="${st.priceHC}"></div>
    </div>
    <p class="hint" style="margin-top:8px"><span id="u_tarifCount">${st.tarif.filter(Boolean).length} HP · ${168 - st.tarif.filter(Boolean).length} HC</span></p>`;
  openModal(lang === 'en' ? 'PC usage & pricing' : 'Usage & tarification PC', `
    <div class="usage-tabs">
      <button type="button" class="usage-tab active" data-tab="usage">${lang === 'en' ? 'Usage' : 'Utilisation'}</button>
      <button type="button" class="usage-tab" data-tab="tarif">${lang === 'en' ? 'Pricing' : 'Tarification'}</button>
    </div>
    <div class="usage-pane" data-pane="usage">${paneUsage()}</div>
    <div class="usage-pane" data-pane="tarif" style="display:none">${paneTarif()}</div>
    <div class="btn-row"><button class="btn btn-primary" id="u_save"><i class="fa-solid fa-check"></i> ${lang === 'en' ? 'Save' : 'Enregistrer'}</button></div>`, 'modal-wide');
  const host = $('#modalBody');
  const updCounts = () => {
    const uc = $('#u_usageCount'); if (uc) uc.textContent = usageWeeklyHours(st);
    const ud = $('#u_usageDaily'); if (ud) ud.textContent = usageDailyHours(st).toFixed(1);
    const tc = $('#u_tarifCount'); if (tc) tc.textContent = `${st.tarif.filter(Boolean).length} HP · ${168 - st.tarif.filter(Boolean).length} HC`;
  };
  host.querySelectorAll('.usage-tab').forEach(b => b.onclick = () => {
    tab = b.dataset.tab;
    host.querySelectorAll('.usage-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
    host.querySelectorAll('.usage-pane').forEach(p => { p.style.display = p.dataset.pane === tab ? '' : 'none'; });
  });
  /* Click or click-and-drag to paint hours under the cursor. */
  let painting = false, paintVal = 1, paintKind = null;
  const valOf = b => { const i = Number(b.dataset.i); return b.closest('.wk').dataset.kind === 'tarif' ? st.tarif[i] : st.usage[i]; };
  const setCell = (b, v) => {
    const i = Number(b.dataset.i); const kind = b.closest('.wk').dataset.kind;
    if (kind === 'usage') { st.usage[i] = v; b.classList.toggle('on', !!v); }
    else { st.tarif[i] = v; b.classList.toggle('hp', !!v); b.classList.toggle('hc', !v); }
  };
  const cellAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.day-sq') : null; };
  host.addEventListener('pointerdown', e => {
    const b = e.target.closest('.day-sq'); if (!b) return;
    e.preventDefault();
    paintKind = b.closest('.wk').dataset.kind;
    paintVal = valOf(b) ? 0 : 1;
    painting = true;
    setCell(b, paintVal); updCounts();
    const end = () => { painting = false; window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  });
  host.addEventListener('pointermove', e => {
    if (!painting) return;
    const b = cellAt(e.clientX, e.clientY);
    if (!b || b.closest('.wk').dataset.kind !== paintKind) return;
    setCell(b, paintVal); updCounts();
  });
  $('#u_save').onclick = () => {
    st.priceHP = parseFloat($('#u_hp').value) || st.priceHP;
    st.priceHC = parseFloat($('#u_hc').value) || st.priceHC;
    saveUsagePrefs(st);
    closeModal();
    renderSumExtra();
    toast(lang === 'en' ? 'Usage & pricing saved' : 'Usage & tarification enregistrés');
  };
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
    const cmap = buildColors(items.map(it => ({ id: it.id, defId: defOf(state.slots[it.id]).id })));
    const rows = items.map((it, i) => {
      const s = state.slots[it.id], p = sel(s);
      const color = cmap[it.id];
      return `<div class="ditem chart-row" data-ci="${i}" data-sid="${it.id}" style="cursor:pointer" title="${lang === 'en' ? 'Show in page' : 'Voir dans la page'}"><i class="dot" style="background:${color}"></i><span class="di-ico">${iconHtml(defOf(s).icon)}</span><span class="di-txt"><span class="di-type">${esc(slotName(it.id))}</span><span class="di-name">${esc(p.name)} (${Math.round(it.v / tot * 100)}%)</span></span><span class="di-price"><strong>${eur(it.v)}</strong></span></div>`;
    }).join('');
    return `<div class="dsec chart-dsec${foldedCharts.has(sec) ? ' collapsed' : ''}" data-sec="${sec}"><div class="dsec-head" data-chead="${sec}"><i class="${sumIcons[sec]}"></i><span>${esc(secName(sec))}</span><span class="dsec-total">${eur(tot)}</span><i class="fa-solid fa-chevron-down foldchev"></i></div><div class="dsec-dots"></div><div class="chart-card"><h3>${esc(secName(sec))} — ${eur(tot)}</h3>${pieSVG(items.map(it => ({ v: it.v, color: cmap[it.id] })))}</div><div class="chart-list">${rows}</div></div>`;
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
      const UP = usagePrefs();
      const usedHours = usageDailyHours(UP);
      const kwh = usageAnnualKwh(totU, UP);
      const eurY = usageAnnualCost(totU, UP), eurM = eurY / 12;
      const secOf = id => { const s = state.slots[id]; return s ? defOf(s).sec : 'others'; };
      const pwSecs = ['pc', 'setup', 'others'].map(sec => {
        const items = list.filter(i => secOf(i.id) === sec);
        if (!items.length) return '';
        const tot = Math.round(items.reduce((a, b) => a + b.w, 0) * 10) / 10;
        const cmap = buildColors(items.map(it => ({ id: it.id, defId: it.defId })));
        const rows = items.map((it, i) => {
          const s = state.slots[it.id];
          const color = cmap[it.id];
          return `<div class="ditem chart-row" data-ci="${i}" data-sid="${it.id}" style="cursor:pointer" title="${(it.parts || []).map(x => `${x.label} : ${x.w}W`).join(' · ') || (lang === 'en' ? 'Show in page' : 'Voir dans la page')}"><i class="dot" style="background:${color}"></i><span class="di-ico">${iconHtml(defOf(s).icon)}</span><span class="di-txt"><span class="di-type">${esc(slotName(it.id))}</span><span class="di-name">${esc(it.name)} (${Math.round(it.w / tot * 100)}%)${it.psu ? '' : ` <small style="color:var(--muted)">(${lang === 'en' ? 'UPS only' : 'onduleur seul.'})</small>`}</span></span><span class="di-price"><strong>${it.w} W</strong></span></div>`;
        }).join('');
        return `<div class="dsec chart-dsec${foldedPower.has(sec) ? ' collapsed' : ''}" data-sec="${sec}"><div class="dsec-head" data-phead="${sec}"><i class="${sumIcons[sec]}"></i><span>${esc(secName(sec))}</span><span class="dsec-total">${tot} W</span><i class="fa-solid fa-chevron-down foldchev"></i></div><div class="dsec-dots"></div><div class="chart-card"><h3>${esc(secName(sec))} — ${tot} W</h3>${pieSVG(items.map(a => ({ v: a.w, color: cmap[a.id] })))}</div><div class="chart-list">${rows}</div></div>`;
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
        <div class="sum-line"><span>${lang === 'en' ? 'UPS load (PC+screens+consoles)' : 'Charge onduleur (PC+écrans+consoles)'} · ${pw.plugs} ${lang === 'en' ? 'plug(s)' : 'prise(s)'}</span><span class="tot-right"><strong>${totU} W</strong></span></div>
        <div class="sum-line"><span>kWh / ${usedHours.toFixed(1)}h ${lang === 'en' ? 'day' : 'jour'} ≈ ${kwh.toFixed(0)} kWh/an</span><span class="tot-right">${eur(eurY)}/an</span></div>
        <div class="sum-line"><span>${lang === 'en' ? 'Cost' : 'Coût'} (HP ${UP.priceHP.toFixed(4)} / HC ${UP.priceHC.toFixed(4)} €/kWh)</span><span class="tot-right"><span class="big">${eur(eurM)}/mois</span></span></div>
      </div>
      <p class="hint">${lang === 'en' ? 'Peak model: CPU TDP×1.35, GPU datasheet TBP, flat per-device rules. Screens excluded from PSU.' : 'Modèle pic : CPU TDP×1,35, TBP datasheet GPU, forfaits par appareil. Écrans hors PSU.'}</p>`;
    }
  } catch { /* fall through to legacy display */ }
  if (!powerHtml) {
    const UPf = usagePrefs();
    const uh = UPf.usage.reduce((a, b) => a + (b ? 1 : 0), 0);
    const wmap = buildColors(watts.map(x => ({ id: x.id, defId: defOf(state.slots[x.id]).id })));
    powerHtml = `<h3 style="margin:4px 0">${t('sum.powerTitle')} : <strong>${tot} W</strong></h3>
    <div class="charts-row"><div class="chart-card"><h3>kWh / ${uh}h ${lang === 'en' ? 'day' : 'jour'} ≈ ${((tot * uh * 365) / 1000).toFixed(0)} kWh/an</h3>${pieSVG(watts.map(x => ({ v: x.v, color: wmap[x.id] })))}
    <div class="legend">${watts.map(x => `<span><i class="dot" style="background:${wmap[x.id]}"></i>${esc(slotName(x.id))} — ${x.v} W</span>`).join('') || (lang === 'en' ? 'Add wattage on PC fiches.' : 'Renseignez les watts sur les fiches PC.')}</div></div></div>`;
  }
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
  const ub = document.createElement('button');
  ub.className = 'btn btn-sm usage-edit-btn';
  ub.id = 'openUsageBtn';
  ub.innerHTML = `<i class="fa-solid fa-sliders"></i> ${lang === 'en' ? 'Edit PC usage & pricing' : 'Modifier usage & tarification'}`;
  ub.onclick = openUsageEditor;
  $('#sumPowerPane').appendChild(ub);
  refreshIcons();
}

/* ---------- Price history ---------- */
function hist() { return load(LS.hist, {}); }
function pushHistPoint() {
  const T = totals(); const h = hist();
  const k = state.name || 'Ma Config';
  h[k] = h[k] || [];
  h[k].push({ t: Date.now(), total: T.total, deliv: T.total, watts: wattsOfState(state) });
  if (h[k].length > 200) h[k] = h[k].slice(-200); // bound price history per config
  save(LS.hist, h);
}
/* Power draw (W) for a given state/snapshot — used for the consumption history. */
function wattsOfState(st) {
  try {
    if (typeof Compat !== 'undefined' && Compat.powerBreakdown) {
      const pw = Compat.powerBreakdown({ order: st.order, slots: st.slots, sel, def: defOf, lang });
      return Math.round(pw.psuTotal);
    }
  } catch { /* ignore */ }
  let w = 0;
  (st.order || []).forEach(id => { const s = st.slots[id]; if (!s) return; const p = (s.products || []).find(y => y.id === s.selectedId); if (p && defOf(s).sec === 'pc') w += (Number(p.watts) || 0) * (Number(p.qty) || 1); });
  return Math.round(w);
}
function wattsBackfill(h) { // older points (no stored watts) recomputed from matching snapshots, loaded once
  const cfgs = load(LS.configs, {})[state.name] || [];
  const snaps = cfgs.map(v => ({ t: v.savedAt || 0, w: null, snap: v.snapshot }));
  const wattsOf = t0 => {
    let best = null, bd = 2000;
    snaps.forEach(s => { const d = Math.abs(s.t - t0); if (d < bd) { bd = d; best = s; } });
    if (!best) return 0;
    if (best.w == null) best.w = wattsOfState(best.snap);
    return best.w;
  };
  return h.map(x => ({ t: x.t, v: Number.isFinite(x.watts) ? x.watts : wattsOf(x.t) }));
}
let wattsCache = { key: '', arr: null };
function wattsForHist(h) { // cached power array aligned with the history points
  const key = (state.name || '') + ':' + h.length + ':' + (h.length ? h[h.length - 1].t : 0);
  if (wattsCache.key === key && wattsCache.arr) return wattsCache.arr;
  const arr = wattsBackfill(h);
  wattsCache = { key, arr };
  return arr;
}
function fmtAxisVal(v) {
  if (phMode === 'power') return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k W' : Math.round(v) + ' W';
  return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k €' : Math.round(v) + ' €';
}
let priceHover = null, priceGeom = null, priceBound = false, priceHidden = new Set(), priceLegBound = false, priceGroupIds = { all: [], pc: [], setup: [], others: [] };
let priceResizeBound = false, priceDrawTimer = null;
function schedulePriceDraw() {
  clearTimeout(priceDrawTimer);
  priceDrawTimer = setTimeout(() => {
    if (!$('#page-prices').classList.contains('hidden')) drawPrices();
  }, 140);
}
function bindPriceResize() {
  if (priceResizeBound) return;
  priceResizeBound = true;
  window.addEventListener('resize', schedulePriceDraw, { passive: true });
  window.addEventListener('orientationchange', schedulePriceDraw, { passive: true });
}
function bindPriceLegend() {
  if (priceLegBound) return; priceLegBound = true;
  const leg = $('#priceLegend'); if (!leg) return;
  leg.addEventListener('click', e => {
    const f = e.target.closest('[data-filter]');
    if (f) { // toggle the whole group: on -> off, otherwise -> on
      const ids = priceGroupIds[f.dataset.filter] || [];
      const allOn = ids.length > 0 && ids.every(id => !priceHidden.has(id));
      ids.forEach(id => allOn ? priceHidden.add(id) : priceHidden.delete(id));
      priceHover = null; drawPrices(); return;
    }
    const el = e.target.closest('[data-slot]'); if (!el) return;
    const id = el.dataset.slot;
    priceHidden.has(id) ? priceHidden.delete(id) : priceHidden.add(id);
    priceHover = null; drawPrices();
  });
}
function bindPriceHover() {
  if (priceBound) return; priceBound = true;
  const cv = $('#priceChart'); if (!cv) return;
  const move = e => {
    const g = priceGeom; if (!g || !g.count) return;
    const rect = cv.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    let idx = null, bd = 1e9;
    for (let i = 0; i < g.count; i++) { const d = Math.abs(g.xOf(i, g.count) - px); if (d < bd) { bd = d; idx = i; } }
    if (idx == null) return;
    let sIdx = null;
    if (phMode === 'per' && g.series.length > 1) { // nearest line to the cursor
      let sb = 1e9;
      g.series.forEach((s, k) => { if (!s.pts[idx]) return; const d = Math.abs(g.yOf(s.pts[idx].v) - py); if (d < sb) { sb = d; sIdx = k; } });
    }
    if (!priceHover || priceHover.idx !== idx || priceHover.sIdx !== sIdx) { priceHover = { idx, sIdx }; drawPrices(); }
  };
  const leave = () => { if (priceHover) { priceHover = null; drawPrices(); } };
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerdown', move);
  cv.addEventListener('pointerleave', leave);
  cv.addEventListener('pointercancel', leave);
}
function drawPrices() {
  const cv = $('#priceChart'); if (!cv) return;
  bindPriceHover(); bindPriceLegend(); bindPriceResize();
  const ctx = cv.getContext('2d');
  // HiDPI: render at device pixel ratio so the chart stays crisp when scaled to the container.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = Math.max(260, Math.round(cv.getBoundingClientRect().width) || 800);
  const cssH = Math.max(220, Math.min(340, Math.round(cssW * 0.42)));
  const bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; cv.style.height = cssH + 'px'; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = cssW, H = cssH;
  ctx.clearRect(0, 0, W, H);
  const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  const grid = dark ? '#333' : '#e3e8e3', axis = dark ? '#9aa0a6' : '#666';
  const h = hist()[state.name] || [];
  const leg = $('#priceLegend'); leg.className = 'legend' + (phMode === 'per' ? ' groups' : ''); leg.innerHTML = '';
  const budgetOn = phMode === 'total';
  const budget = Number(state.budget) || 0;
  let series;
  if (phMode === 'total') {
    series = [{ label: lang === 'en' ? 'Total' : 'Total', color: '#1a8744', pts: h.map(x => ({ t: x.t, v: x.total })) }];
  } else if (phMode === 'power') {
    series = [{ label: t('prices.power'), color: '#0891b2', pts: wattsForHist(h) }];
  } else {
    const perItems = state.order.filter(id => sel(state.slots[id])).map(id => { const d = defOf(state.slots[id]); return { id, defId: d.id, sec: d.sec }; });
    const cmap = buildColors(perItems);
    const cfgs = load(LS.configs, {})[state.name] || [];
    series = perItems.map(it => ({ id: it.id, sec: it.sec, label: slotName(it.id), color: cmap[it.id], pts: seriesForSlot(it.id, cfgs) }));
  }
  const vis = series.filter(s => !s.id || !priceHidden.has(s.id)); // component toggled off in the legend
  const compact = W < 520;
  const plotL = compact ? 42 : 60, plotR = compact ? 8 : 16, plotT = 14, plotB = compact ? 34 : 40;
  const plotW = W - plotL - plotR, plotH = H - plotT - plotB;
  const points = series.length ? series[0].pts : [];
  const count = points.length;
  const allV = vis.flatMap(s => s.pts.map(p => p.v)).concat(budgetOn ? [budget] : []);
  const max = Math.max(...allV, phMode === 'power' ? 50 : 10);
  const xOf = (i, n = count) => plotL + plotW * (n > 1 ? i / (n - 1) : 0.5);
  const yOf = v => plotT + plotH - plotH * ((v) / (max || 1));
  priceGeom = { xOf, yOf, count, series: vis };
  // vertical scale (values)
  ctx.font = (compact ? 10 : 11) + 'px system-ui, sans-serif'; ctx.lineWidth = 1;
  const ticks = compact ? 3 : 4;
  for (let k = 0; k <= ticks; k++) {
    const v = max * k / ticks, y = yOf(v);
    ctx.strokeStyle = grid; ctx.beginPath(); ctx.moveTo(plotL, y); ctx.lineTo(W - plotR, y); ctx.stroke();
    ctx.fillStyle = axis; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(fmtAxisVal(v), plotL - 6, y);
  }
  // horizontal scale (dates)
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  if (count) {
    const step = Math.max(1, Math.ceil(count / (compact ? 4 : 8)));
    for (let i = 0; i < count; i += step) {
      const d = new Date(points[i].t);
      ctx.fillStyle = axis; ctx.fillText(d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', { day: '2-digit', month: '2-digit' }), xOf(i), plotT + plotH + 6);
    }
  }
  ctx.strokeStyle = axis; ctx.beginPath(); ctx.moveTo(plotL, plotT); ctx.lineTo(plotL, plotT + plotH); ctx.lineTo(W - plotR, plotT + plotH); ctx.stroke();
  // series (only visible ones drawn)
  vis.forEach(s => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.5; ctx.beginPath();
    s.pts.forEach((p, i) => { const x = xOf(i, s.pts.length), y = yOf(p.v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    ctx.fillStyle = s.color;
    s.pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(xOf(i, s.pts.length), yOf(p.v), 3, 0, 7); ctx.fill(); });
  });
  // legend (clickable per-component toggles, grouped by category in per view)
  const legTitle = lang === 'en' ? 'Show / hide' : 'Afficher / masquer';
  if (phMode === 'per' && series.length) {
    const cats = [['pc', 'PC'], ['setup', 'Setup'], ['others', 'Options']];
    priceGroupIds = { all: series.map(s => s.id), pc: [], setup: [], others: [] };
    series.forEach(s => { if (priceGroupIds[s.sec]) priceGroupIds[s.sec].push(s.id); });
    const groupOn = k => { const ids = priceGroupIds[k] || []; return ids.length > 0 && ids.every(id => !priceHidden.has(id)); };
    const tools = ['all', ...cats.map(c => c[0])].map(k => {
      const lab = k === 'all' ? (lang === 'en' ? 'All' : 'Tout') : (cats.find(c => c[0] === k) || [])[1];
      return `<button type="button" data-filter="${k}" class="${groupOn(k) ? 'on' : ''}">${esc(lab)}</button>`;
    }).join('');
    const col = ([k, lab]) => {
      const items = series.filter(s => s.sec === k);
      const body = items.length ? items.map(s => {
        const off = priceHidden.has(s.id) ? ' off' : '';
        return `<span class="leg${off}" data-slot="${esc(s.id)}" title="${legTitle}"><i class="dot" style="background:${s.color}"></i>${esc(s.label)}</span>`;
      }).join('') : `<span class="leg-empty">${lang === 'en' ? 'none' : 'aucun'}</span>`;
      return `<div class="leg-col"><h4>${esc(lab)}</h4>${body}</div>`;
    };
    leg.innerHTML = `<div class="leg-tools">${tools}</div>` + cats.map(col).join('');
  } else {
    series.forEach(s => { leg.innerHTML += `<span><i class="dot" style="background:${s.color}"></i>${esc(s.label)}</span>`; });
  }
  // budget line — total mode only
  if (budgetOn && budget > 0) {
    const by = yOf(budget);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = '#e03131'; ctx.beginPath(); ctx.moveTo(plotL, by); ctx.lineTo(W - plotR, by); ctx.stroke(); ctx.setLineDash([]);
    leg.innerHTML += `<span><i class="dot" style="background:#e03131"></i>${lang === 'en' ? 'Budget' : 'Budget'} (${eur(budget)})</span>`;
  }
  // hover crosshair + tooltip
  const tip = $('#priceTip');
  if (priceHover && priceHover.idx < count) {
    const idx = priceHover.idx, x = xOf(idx);
    ctx.setLineDash([4, 4]); ctx.strokeStyle = axis; ctx.beginPath(); ctx.moveTo(x, plotT); ctx.lineTo(x, plotT + plotH); ctx.stroke(); ctx.setLineDash([]);
    const mark = s => { if (!s.pts[idx]) return; const px = xOf(idx, s.pts.length), py = yOf(s.pts[idx].v); ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill(); ctx.strokeStyle = dark ? '#111' : '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); };
    if (phMode === 'per' && priceHover.sIdx != null && vis[priceHover.sIdx]) mark(vis[priceHover.sIdx]);
    else vis.forEach(mark);
    if (tip) {
      const d = new Date(points[idx].t);
      const ds = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR') + ' ' + d.toLocaleTimeString(lang === 'en' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
      const row = (label, color, val) => `<div class="ptip-row"><i class="dot" style="background:${color}"></i><span>${esc(label)}</span><strong>${val}</strong></div>`;
      let rows = '';
      if (phMode === 'per') {
        const s = vis[priceHover.sIdx] || vis[0];
        if (s && s.pts[idx]) rows = row(s.label, s.color, eur(s.pts[idx].v));
      } else if (phMode === 'total') {
        rows = row(vis[0].label, vis[0].color, eur(vis[0].pts[idx].v));
      } else {
        const w = vis[0].pts[idx].v, st = usagePrefs(), yr = usageAnnualCost(w, st);
        rows = row(vis[0].label, vis[0].color, Math.round(w) + ' W');
        rows += row(t('prices.perMonth'), '#0891b2', eur(yr / 12));
        rows += row(t('prices.perYear'), '#0891b2', eur(yr));
      }
      tip.innerHTML = `<div class="ptip-date">${ds}</div>${rows}`;
      tip.classList.remove('hidden');
      tip.style.left = Math.max(8, Math.min(92, x / W * 100)) + '%';
    }
  } else if (tip) tip.classList.add('hidden');
  if (!count) leg.innerHTML += `<span style="color:var(--muted)">${lang === 'en' ? 'Save the config to start the history.' : 'Sauvegardez la config pour démarrer l’historique.'}</span>`;
}
function seriesForSlot(id, cfgs) { // per-component: slot totals read back from saved version snapshots
  cfgs = cfgs || load(LS.configs, {})[state.name] || [];
  return cfgs.map(v => {
    try {
      const s = v.snapshot.slots[id];
      const p = s && s.products.find(x => x.id === s.selectedId);
      return { t: v.savedAt, v: p ? unitTotal(p) : 0 };
    } catch { return { t: v.savedAt, v: 0 }; }
  });
}

/* ---------- Benchmarks ---------- */
function cpuIgpuName() {
  const s = state.slots.cpu; const p = s && sel(s);
  if (!p || !p.datasheet || typeof Compat === 'undefined') return '';
  try { const C = Compat.parseDatasheet(p.datasheet); if (C && C.igpuName) return String(C.igpuName).trim(); } catch { /* ignore */ }
  return '';
}
function gpuSeriesName() {
  const s = state.slots.gpu; const p = s && sel(s);
  if (!p) return '';
  if (p.datasheet && typeof Compat !== 'undefined') {
    try { const G = Compat.parseDatasheet(p.datasheet); if (G && G.gpuSeries) return String(G.gpuSeries).trim(); } catch { /* ignore */ }
  }
  return '';
}
function benchParts() {
  const g = id => { const s = state.slots[id]; const p = s && sel(s); return p ? p.name : ''; };
  const cpu = g('cpu'), ram = g('ram');
  let gpu = g('gpu'), iGpu = false;
  if (!gpu) { const ig = cpuIgpuName(); if (ig) { gpu = ig; iGpu = true; } }
  const gpuSeries = gpu ? (iGpu ? gpu : (gpuSeriesName() || gpu)) : '';
  return { cpu, gpu, gpuSeries, ram, iGpu };
}
function benchQuery() { const b = benchParts(); return `${b.cpu} ${b.gpuSeries}`.trim(); }
let benchCacheQ = '', benchBusy = false;
/* ---------- Benchmarks : brief + gaming iobit + pro + Geekbench + 3DMark + YT ---------- */
let benchGame = 'cp2077';
let benchGameEntries = null;
const benchFold = {};
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
  const cpuP = benchProd('cpu'), ramP = benchProd('ram');
  let gpuP = benchProd('gpu'), igpu = false;
  if (!gpuP) { // no dedicated GPU: fall back to the CPU's integrated graphics
    const ig = cpuIgpuName();
    const e = ig ? Perf.igpuEntry(ig) : null;
    if (e) { gpuP = { name: e[1], qty: 1, syntheticIgpu: true }; igpu = true; }
  }
  // stockage : total de tous les SSD/HDD internes ; le type = disque le plus rapide present
  const storParts = [];
  for (const sid of state.order) {
    const sl = state.slots[sid]; if (!sl || !/^(ssd|hdd)/.test(sl.defId)) continue;
    const p = sel(sl); if (!p) continue;
    storParts.push({ p, gb: Perf.diskGB(p.name), ty: Perf.diskType(p.name, p.datasheet, sl.defId) });
  }
  const storP = storParts.length ? storParts[0].p : null;
  const kb = storParts.map(x => x.gb).filter(g => typeof g === 'number');
  const diskGB = kb.length ? kb.reduce((a, b) => a + b, 0) : null;
  const hasTy = t => storParts.some(x => x.ty === t);
  const diskType = !storParts.length ? null : hasTy('nvme') ? 'nvme' : hasTy('sata') ? 'sata' : hasTy('hdd') ? 'hdd' : null;
  const scrP = benchProd('screen1') || benchScan('screen');
  const threads = (cpuP && (Perf.threadsFromDatasheet(cpuP.datasheet) || Perf.specsThreads(cpuP.specs))) || null;
  const ramGB = ramP ? Perf.ramGB(ramP.name) : null;
  // VRAM : nom d'abord, puis repli sur le datasheet ( Capacite memoire : 12 Go ).
  let vramGB = gpuP ? Perf.ramGB(gpuP.name) : null;
  if (vramGB == null && gpuP && gpuP.datasheet) {
    try {
      const P = Compat.parseDatasheet(gpuP.datasheet);
      if (P && P.ramCap) vramGB = Math.round(P.ramCap);
    } catch { /* ignore */ }
  }
  const cpuEntry = cpuP ? Perf.matchCpu(cpuP.name) : null;
  let gpuEntry = gpuP ? Perf.matchGpu(gpuP.name) : null;
  if (!gpuEntry && igpu && gpuP) gpuEntry = Perf.igpuEntry(gpuP.name);
  const screenH = scrP ? Perf.screenH(scrP) : null;
  const panel = scrP ? Perf.screenPanel(scrP) : '';
  // defaut 1080p sans ecran ; sinon palier iobit le plus proche en dessous
  const res = screenH == null ? 1080 : screenH >= 2000 ? '4k' : screenH >= 1300 ? 1440 : screenH >= 900 ? 1080 : 720;
  return {
    cpuP, gpuP, ramP, storP, scrP, threads, ramGB, vramGB, cpuEntry, gpuEntry, screenH, res, panel,
    diskType, diskGB, igpu,
    gRank: gpuP ? (igpu ? { igpu: 1 } : Perf.gpuRank(gpuP.name, gpuEntry ? gpuEntry[3] : null)) : null,
  };
}
/* ----- tooltip flottant (suit le curseur) ----- */
function regTip(rows) { const id = 'tip' + (++tipSeq); tipReg[id] = rows; return id; }
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
function bindBenchFold() { /* pliage supprime : sections bench toujours ouvertes */ }
/* ----- brief ----- */
/* brief = 5 tuiles (1/5 chacune) : statut seul, details au survol */
function briefStatusWord(st) {
  const s = st === 'unknown' ? 'warn' : st;
  return { cls: s === 'ok' ? 'g' : s === 'warn' ? 'y' : 'r', txt: s === 'ok' ? t('bench.stOk') : s === 'warn' ? t('bench.stWarn') : t('bench.stErr') };
}
function renderBriefFacts(f) {
  const host = $('#briefBody');
  if (!host) return;
  Perf.setLang(lang);
  const daily = Perf.dailyCriteria(f);
  const blocks = Perf.proCriteria(f, f.gRank);
  const cb = (f.cpuEntry && f.gpuEntry) ? Perf.fpsFor({ cpuPerf: f.cpuEntry[2], gpuPerf: f.gpuEntry[3], game: 'cp2077', res: f.res, quality: 'high', rt: 'off', up: 'none', ramGB: f.ramGB }) : null;
  const cbSt = cb == null ? 'unknown' : { r: 'err', y: 'warn', g: 'ok', b: 'ok' }[Perf.fpsColor(cb)];
  const resLbl = f.res === '4k' ? '4K' : f.res + 'p';
  const gRows = cb == null
    ? [{ k: 'cb0', st: 'unknown', label: 'Cyberpunk 2077', detail: t('bench.needBoth') }]
    : [{ k: 'cb2077', st: cbSt, label: `Cyberpunk 2077 — ${resLbl} (High)`, detail: `${cb} FPS (${t('bench.estSrc')})` },
       { k: 'cbhw', st: 'ok', label: f.cpuEntry[1], detail: f.gpuEntry[1] }];
  const dc = Perf.worstOf(daily);
  const proWorst = Perf.worstOf([...blocks.video, ...blocks.compile, ...blocks.ai]);
  $('#briefScore').innerHTML = `<span class="dot-${dc}">●</span> <span class="dot-${cbSt === 'unknown' ? 'warn' : cbSt}">●</span> <span class="dot-${proWorst === 'unknown' ? 'warn' : proWorst}">●</span>`;
  const tileCls = st => st === 'ok' ? 'st-ok' : st === 'err' ? 'st-err' : 'st-warn';
  const tile = (icon, title, inner, rows, st) => `<div class="brief-tile ${tileCls(st === 'unknown' ? 'warn' : st)}" data-tip="${regTip(rows)}"><i class="${icon} bt-icon"></i><span class="bt-title">${esc(title)}</span>${inner}</div>`;
  const stTile = (icon, title, st, rows) => { const w = briefStatusWord(st); return tile(icon, title, `<strong class="bt-status fps-${w.cls}">${esc(w.txt)}</strong>`, rows, st); };
  host.innerHTML =
    stTile('fa-solid fa-house-laptop', t('bench.daily'), dc, daily) +
    tile('fa-solid fa-gamepad', 'Cyberpunk 2077', `<span class="bt-res">${esc(resLbl)} · High</span><strong class="bt-fps fps-${cb == null ? 'y' : Perf.fpsColor(cb)}">${cb == null ? '—' : cb + ' FPS'}</strong>`, gRows, cbSt) +
    stTile('fa-solid fa-clapperboard', t('bench.video'), Perf.worstOf(blocks.video), blocks.video) +
    stTile('fa-solid fa-code', t('bench.compile'), Perf.worstOf(blocks.compile), blocks.compile) +
    stTile('fa-solid fa-brain', t('bench.ai'), Perf.worstOf(blocks.ai), blocks.ai)
    + (f.igpu ? `<p class="hint">${lang === 'en' ? 'No dedicated GPU — estimates use the CPU integrated graphics (approximate).' : 'Aucun GPU dédié — estimations basées sur le graphique intégré du CPU (approximatif).'}</p>` : '');
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
/* ----- barres a checkpoints (rouge|jaune|vert + aiguille valeur) ----- */
function barHtml(r) {
  const id = regTip([r]);
  if (!r.bar) return `<div class="cbar cbar-unknown" data-tip="${id}"><div class="cbar-top"><strong>${esc(r.label)}</strong><span>?</span></div><div class="cbar-track"><span class="zone z-u"></span></div><small>${esc(r.detail)}</small></div>`;
  const b = r.bar, max = b.max || 1;
  const pct = x => Math.max(0, Math.min(100, x / max * 100));
  const wR = pct(b.cuts[0]), wY = pct(b.cuts[1]) - wR, wG = 100 - pct(b.cuts[1]);
  const v = typeof b.val === 'number' ? pct(b.val) : null;
  const vc = v == null ? null : Math.max(3, Math.min(97, v)); // garde le cercle visible aux bords
  const zcls = typeof b.val !== 'number' ? '' : r.st === 'err' ? 'r' : (r.st === 'warn' || r.st === 'unknown') ? 'y' : 'g'; // status-driven: matches the criterion at threshold boundaries
  const u = b.unit || '';
  const ztip = zi => regTip([{ k: 'z' + zi, st: zi === 0 ? 'err' : zi === 1 ? 'warn' : 'ok', label: r.label,
    detail: zi === 0 ? `≤ ${b.cuts[0]}${u}` : zi === 1 ? `${b.cuts[0]} – ${b.cuts[1]}${u}` : `> ${b.cuts[1]}${u}` }]);
  return `<div class="cbar" data-tip="${id}">
    <div class="cbar-top"><strong>${esc(r.label)}</strong>${b.noval ? '' : `<span>${esc(String(b.val) + u)}</span>`}</div>
    <div class="cbar-track"><div class="cbar-zones"><span class="zone z-r" data-tip="${ztip(0)}" style="width:${wR}%"></span><span class="zone z-y" data-tip="${ztip(1)}" style="width:${wY}%"></span><span class="zone z-g" data-tip="${ztip(2)}" style="width:${wG}%"></span></div><span class="ckpt" style="left:${pct(b.cuts[0])}%"></span><span class="ckpt" style="left:${pct(b.cuts[1])}%"></span>${v == null ? '' : `<span class="needle n-${zcls}" data-tip="${id}" style="left:${vc}%"></span>`}</div>
    <small>${esc(r.detail)}</small></div>`;
}
function barsHtml(rows) { return `<div class="cbars">${rows.map(barHtml).join('')}</div>`; }
/* ----- daily use (nouvelle section) ----- */
function renderDaily(f) {
  const host = $('#dailyBody');
  if (!host) return;
  Perf.setLang(lang);
  const rows = Perf.dailyCriteria(f);
  const w = Perf.worstOf(rows);
  $('#dailyScore').innerHTML = `<span class="dot-${w === 'unknown' ? 'warn' : w}">●</span>`;
  host.innerHTML = barsHtml(rows);
}
function renderPro(f) {
  const host = $('#proBody');
  if (!host) return;
  Perf.setLang(lang);
  const blocks = Perf.proCriteria(f, f.gRank);
  const defs = [['video', 'fa-solid fa-clapperboard', t('bench.video')], ['compile', 'fa-solid fa-code', t('bench.compile')], ['ai', 'fa-solid fa-brain', t('bench.ai')]];
  $('#proScore').innerHTML = defs.map(([k]) => { const w = Perf.worstOf(blocks[k]); return `<span class="dot-${w === 'unknown' ? 'warn' : w}">●</span>`; }).join(' ');
  host.innerHTML = defs.map(([k, icon, title]) => {
    const w = Perf.worstOf(blocks[k]);
    return `<div class="pro-block"><div class="pro-head"><i class="${icon}"></i><span>${esc(title)}</span><strong class="dot-${w === 'unknown' ? 'warn' : w}">●</strong></div>${barsHtml(blocks[k])}</div>`;
  }).join('');
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
    $('#gbBody').innerHTML = `<p class="hint">${esc(t('bench.nodata'))}</p><div class="btn-row"><button class="mini-btn" id="gbRetry"><i class="fa-solid fa-rotate-right"></i> ${esc(t('bench.retry'))}</button><a class="btn btn-sm" target="_blank" rel="noopener" href="https://browser.geekbench.com/search?q=${encodeURIComponent(benchGb.q || '')}"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(t('bench.gbOpen'))}</a></div>`;
    bindGbRetry();
    return;
  }
  const loc = n => n == null ? '—' : n.toLocaleString(lang === 'en' ? 'en-US' : 'fr-FR');
  $('#gbScore').textContent = (benchGb.version !== '?' ? benchGb.version + ' · ' : '') + loc(benchGb.multi);
  $('#gbBody').innerHTML =
    `<div class="gb-tiles"><div class="brief-tile static"><i class="fa-solid fa-square bt-icon"></i><span class="bt-title">${esc(t('bench.single'))}</span><strong class="bt-fps">${loc(benchGb.single)}</strong></div>`
    + `<div class="brief-tile static"><i class="fa-solid fa-layer-group bt-icon"></i><span class="bt-title">${esc(t('bench.multi'))}</span><strong class="bt-fps">${loc(benchGb.multi)}</strong></div></div>`
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
function bindGbRetry() {
  const rb = $('#gbRetry');
  if (rb) rb.onclick = () => { Perf.gbClear(); benchGbKey = ''; benchGb = null; loadBenchGb(benchFacts()); };
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
    $('#tsBody').innerHTML = `<p class="hint">${esc(t('bench.err'))}<br><small>${esc(bench3d.err)}</small></p>` + retry
      + `<div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="https://www.3dmark.com/search"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(t('bench.tsOpen'))}</a></div>`;
    bindTsRetry();
    return;
  }
  if (combo.median == null) {
    $('#tsScore').textContent = '—';
    $('#tsBody').innerHTML = `<p class="hint">${esc(t('bench.nodata'))} (${esc((combo.gpu && combo.gpu.label) || '')} + ${esc((combo.cpu && combo.cpu.label) || '')})</p>` + retry
      + `<div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="https://www.3dmark.com/search"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${esc(t('bench.tsOpen'))}</a></div>`;
    bindTsRetry();
    return;
  }
  $('#tsScore').textContent = loc(combo.median);
  const comboTile = `<div class="brief-tile static ts-combo"><i class="fa-solid fa-trophy bt-icon"></i><span class="bt-title">${esc(t('bench.tsCombo'))}</span><strong class="bt-fps">${loc(combo.median)}</strong></div>`;
  let tiles = comboTile, sub = `<p class="hint"><i class="fa-solid fa-circle-notch fa-spin"></i></p>`;
  if (bench3d.gpuOnly && bench3d.cpuOnly && bench3d.gpuOnly.median && bench3d.cpuOnly.median) {
    const v = Perf.tsBottleneck(combo.median, bench3d.gpuOnly.median, bench3d.cpuOnly.median);
    const cls = v.level === 'err' ? 'r' : v.level === 'warn' ? 'y' : 'g';
    const msg = v.side === 'cpu' ? t('bench.btCpu') : v.side === 'gpu' ? t('bench.btGpu') : t('bench.btOk');
    tiles += `<div class="brief-tile static"><i class="fa-solid fa-microchip bt-icon"></i><span class="bt-title">${esc((combo.cpu && combo.cpu.label) || t('bench.tsCpu'))}</span><strong class="bt-fps">${loc(bench3d.cpuOnly.median)}</strong></div>`
      + `<div class="brief-tile static"><span class="bt-icon">${iconHtml('bi:bi-gpu-card')}</span><span class="bt-title">${esc((combo.gpu && combo.gpu.label) || t('bench.tsGpu'))}</span><strong class="bt-fps">${loc(bench3d.gpuOnly.median)}</strong></div>`;
    sub = `<p class="hint"><strong class="fps-${cls}">●</strong> ${esc(msg)}${v.ratio ? ` (${Math.round(v.ratio * 100)} %)` : ''} · ${esc(t('bench.typical'))}</p>`;
  } else if (bench3d.singlesErr) {
    sub = `<p class="hint">${esc(t('bench.typErr'))}</p>` + retry;
  }
  $('#tsBody').innerHTML =
    `<div class="ts-tiles">${tiles}</div>`
    + `<p class="hint">${esc((combo.cpu && combo.cpu.label) || '')} + ${esc((combo.gpu && combo.gpu.label) || '')} · ${esc(t('bench.topruns'))} · n=${combo.n}</p>` + sub
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
  const has = !!(b.cpu && b.gpu);
  const q = benchQuery();
  $('#benchQuery').innerHTML = `${lang === 'en' ? 'Search:' : 'Recherche :'} <code class="k">${esc(q)}</code>`;
  bindBenchFold();
  bindPerfTip();
  if (!has) {
    benchKey = ''; benchRun++;
    for (const id of ['briefBody', 'gameBody', 'dailyBody', 'proBody', 'gbBody', 'tsBody']) { const el = document.getElementById(id); if (el) el.innerHTML = `<p class="hint">${esc(t('bench.needs'))}</p>`; }
    for (const id of ['briefScore', 'gameScore', 'dailyScore', 'proScore', 'gbScore', 'tsScore']) { const el = document.getElementById(id); if (el) el.textContent = '—'; }
    $('#gameBars').innerHTML = '';
    $('#benchGrid').innerHTML = '';
    $('#benchStatus').textContent = '';
    return;
  }
  const key = [b.cpu, b.gpuSeries, b.ram, benchGame].join('|');
  if (key !== benchKey) { benchKey = key; benchRun++; }
  const run = benchRun;
  for (const k of Object.keys(tipReg)) delete tipReg[k];
  const f = benchFacts();
  Perf.setLang(lang);
  renderBriefFacts(f);
  renderGaming(f);
  renderDaily(f);
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
  if (storeConsent() === 'denied') {
    toast(t('consent.saveBlocked'));
    try { download((state.name || 'config') + '.configmaker.json', JSON.stringify({ state, exportedAt: new Date().toISOString() }, null, 2), 'application/json'); } catch { /* ignore */ }
    return;
  }
  state.name = String(state.name || '').trim() || 'Ma Config';
  const nameInput = $('#configName'); if (nameInput) nameInput.value = state.name;
  const def = stampVersion();
  openModal(lang === 'en' ? 'Save this config' : 'Enregistrer cette config', `
    <p class="hint">${lang === 'en' ? 'Name this saved version (kept in history, default = date & time):' : 'Nom de cette version sauvegardée (gardée dans l’historique, par défaut date & heure) :'}</p>
    <div class="fld"><input id="s_ver" value="${esc(def)}" autocomplete="off" spellcheck="false"></div>
    <div class="btn-row"><button class="btn" id="s_cancel">${lang === 'en' ? 'Cancel' : 'Annuler'}</button>
    <button class="btn btn-primary" id="s_go"><i class="fa-solid fa-check"></i> ${lang === 'en' ? 'Save' : 'Enregistrer'}</button></div>`);
  $('#s_cancel').onclick = closeModal;
  $('#s_ver').focus(); $('#s_ver').select();
  $('#s_ver').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#s_go').click(); } };
  $('#s_go').onclick = () => {
    const label = $('#s_ver').value.trim() || def;
    closeModal();
    saveSnapshot(label);
  };
}
function saveSnapshot(label) {
  state.version = label;
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
  cfgs[state.name].push({ version: state.version, label, savedAt: Date.now(), name: state.name, budget: state.budget, total: totals().total, snapshot: JSON.parse(JSON.stringify(state)) });
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
  // (the PC-usage config is ignored here: legacy snapshots predate state.usage).
  try {
    const arr = (load(LS.configs, {})[state.name]) || [];
    if (!arr.length) return;
    const snap = arr[arr.length - 1].snapshot;
    const strip = o => { const c = JSON.parse(JSON.stringify(o)); delete c.usage; return JSON.stringify(c); };
    if (strip(snap) === strip(state)) lastSavedJson = JSON.stringify(state);
  } catch { /* ignore */ }
}
function isDirty() { return JSON.stringify(state) !== lastSavedJson; }
function wipeToNew() {
  state = defaultState();
  persist();
  lastSavedJson = JSON.stringify(state);
  activeSlot = null; idealToken++; idealPool = []; idealFetched = {}; idealShown = IDEAL_PAGE;
  benchCacheQ = '';
  closeModal(); showPage('config'); closeMobileSheets();
  $('#pickerPanel').classList.add('hidden');
  $('#summaryPanel').classList.remove('hidden');
  refresh();
  toast(lang === 'en' ? 'New config' : 'Nouvelle config');
}
/* Reset the draft in place (keeps the welcome modal open) — used by the AI build. */
function resetDraftForBuild() {
  state = defaultState();
  activeSlot = null; idealToken++; idealPool = []; idealFetched = {}; idealShown = IDEAL_PAGE;
  benchCacheQ = '';
  try { openAlts.clear(); openVariants.clear(); } catch { /* ignore */ }
  compatCache = null;
  lastSavedJson = ''; // fresh, unsaved
  persist();
}
/* Replace the draft with a stored snapshot. */
function restoreSnapshot(snap, name, enMsg, frMsg) {
  state = JSON.parse(JSON.stringify(snap));
  if (name) state.name = name;
  state.usage = normUsage(state.usage || {});
  persist(); lastSavedJson = JSON.stringify(state); closeModal(); refresh(); schedulePriceRefresh();
  toast(lang === 'en' ? enMsg : frMsg);
}
/* True when the current draft holds work that would be lost by a wipe/replace. */
function hasUnsavedWork() {
  if (!isDirty()) return false;
  try { if (JSON.stringify(state) === JSON.stringify(defaultState())) return false; } catch { /* ignore */ }
  return true;
}
/* Human-readable list of what differs between the current draft and the last save. */
function describeChanges() {
  const out = [];
  let prev = null;
  try { prev = lastSavedJson ? JSON.parse(lastSavedJson) : null; } catch { prev = null; }
  const order = st => (st && st.order) ? st.order : Object.keys((st && st.slots) || {});
  const labelOf = (id, st) => {
    const s = st && st.slots && st.slots[id];
    return (s && s.customLabel) || (SLOT_NAMES[lang] && SLOT_NAMES[lang][id]) || SLOT_NAMES.fr[id] || id;
  };
  const chosen = (id, st) => {
    const s = st && st.slots && st.slots[id];
    if (!s) return null;
    return (s.products || []).find(x => x.id === s.selectedId) || null;
  };
  const title = p => {
    if (!p) return null;
    return String(p.name || p.manual || p.idealo || '…').trim() || '…';
  };
  if (!prev) {
    // Never saved: everything currently chosen is unsaved.
    order(state).forEach(id => { const p = chosen(id, state); if (p) out.push({ k: 'add', txt: `${labelOf(id, state)} : ${title(p)}` }); });
    return out;
  }
  if ((prev.name || '') !== (state.name || '')) out.push({ k: 'meta', txt: `${lang === 'en' ? 'Name' : 'Nom'} : ${prev.name || '—'} → ${state.name || '—'}` });
  if ((Number(prev.budget) || 0) !== (Number(state.budget) || 0)) out.push({ k: 'meta', txt: `${lang === 'en' ? 'Budget' : 'Budget'} : ${eur(prev.budget)} → ${eur(state.budget)}` });
  const ids = new Set([...order(prev), ...order(state)]);
  ids.forEach(id => {
    const before = chosen(id, prev), after = chosen(id, state);
    const bl = labelOf(id, prev), al = labelOf(id, state);
    if (bl !== al && before && after) out.push({ k: 'meta', txt: `${lang === 'en' ? 'Label' : 'Libellé'} : ${bl} → ${al}` });
    if (!before && !after) return;
    if (!before && after) { out.push({ k: 'add', txt: `${al} : ${title(after)}` }); return; }
    if (before && !after) { out.push({ k: 'del', txt: `${bl} : ${title(before)}` }); return; }
    const bt = title(before), at = title(after);
    if (bt !== at) { out.push({ k: 'chg', txt: `${al} : ${bt} → ${at}` }); return; }
    const bq = Number(before.qty) || 1, aq = Number(after.qty) || 1;
    if (bq !== aq) { out.push({ k: 'chg', txt: `${al} : ${lang === 'en' ? 'qty' : 'qté'} ${bq} → ${aq}` }); return; }
    const bu = unitTotal(before), au = unitTotal(after);
    if (Math.abs(bu - au) > 0.005) out.push({ k: 'chg', txt: `${al} : ${eur(bu)} → ${eur(au)}` });
  });
  return out;
}
/* Save gate: before any action that replaces/wipes the draft, offer to save it first.
   run() executes after Save or Discard; onCancel (default: close) restores the current UI. */
function guardUnsaved(run, onCancel) {
  onCancel = onCancel || closeModal;
  if (!hasUnsavedWork()) { run(); return; }
  state.name = String(state.name || '').trim() || 'Ma Config';
  const total = totals().total;
  const nParts = state.order.filter(id => { const s = state.slots[id]; return s && sel(s); }).length;
  const def = stampVersion();
  const CHG_ICON = { add: 'fa-solid fa-circle-plus', del: 'fa-solid fa-circle-minus', chg: 'fa-solid fa-pen-to-square', meta: 'fa-solid fa-sliders' };
  let changes = [];
  try { changes = describeChanges(); } catch { changes = []; }
  const changeHtml = changes.length
    ? `<ul class="chglist">${changes.map(c => `<li class="c-${c.k}"><i class="${CHG_ICON[c.k] || 'fa-solid fa-circle'}"></i><span>${esc(c.txt)}</span></li>`).join('')}</ul>`
    : `<p class="hint">${lang === 'en' ? 'No detailed diff (prices or metadata were updated in the background).' : 'Pas de détail (prix ou métadonnées actualisés en arrière-plan).'}</p>`;
  openModal(lang === 'en' ? 'Unsaved changes' : 'Modifications non sauvegardées', `
    <p>${lang === 'en' ? 'Your current config is not saved — these changes will be lost:' : 'Votre config actuelle n’est pas sauvegardée — ces modifications seront perdues :'}</p>
    <div class="list-row"><span class="grow"><strong>${esc(state.name)}</strong><br><small style="color:var(--muted)">${state.version ? 'v' + esc(state.version) : (lang === 'en' ? 'unsaved' : 'non sauvée')} · ${eur(total)} · ${nParts} ${lang === 'en' ? 'part(s)' : 'composant(s)'}</small></span></div>
    ${changeHtml}
    <p class="hint">${lang === 'en' ? 'Save it (kept in history) or discard it to continue.' : 'Sauvegardez-la (gardée dans l’historique) ou abandonnez pour continuer.'}</p>
    <div class="fld"><label>${lang === 'en' ? 'Save as' : 'Enregistrer sous'}</label><input id="g_ver" value="${esc(def)}" autocomplete="off" spellcheck="false"></div>
    <div class="btn-row"><button class="btn" id="g_cancel">${lang === 'en' ? 'Cancel' : 'Annuler'}</button>
    <button class="btn" id="g_discard"><i class="fa-solid fa-trash-can"></i> ${lang === 'en' ? 'Discard' : 'Abandonner'}</button>
    <button class="btn btn-primary" id="g_save"><i class="fa-solid fa-floppy-disk"></i> ${lang === 'en' ? 'Save & continue' : 'Sauver & continuer'}</button></div>`);
  const inp = $('#g_ver');
  if (inp) { inp.focus(); inp.select(); inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); $('#g_save').click(); } }; }
  $('#g_cancel').onclick = onCancel;
  $('#g_discard').onclick = () => { closeModal(); run(); };
  $('#g_save').onclick = () => {
    const label = ($('#g_ver') && $('#g_ver').value.trim()) || def;
    closeModal();
    saveSnapshot(label);
    run();
  };
}
function newConfig() { guardUnsaved(wipeToNew); }
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
    b.onclick = () => guardUnsaved(() => restoreSnapshot(last.snapshot, null, 'Loaded', 'Chargée'));
    row.appendChild(b); host.appendChild(row);
  });
  $('#l_file').onclick = () => $('#l_fileIn').click();
  $('#l_fileIn').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let obj; try { obj = JSON.parse(r.result); } catch { toast('JSON invalide'); return; }
      guardUnsaved(() => { try { importConfig(obj); closeModal(); } catch { toast('JSON invalide'); } });
    };
    r.readAsText(f);
  };
  $('#l_link').onclick = () => {
    const v = prompt(lang === 'en' ? 'Paste share link or code:' : 'Collez le lien ou le code de partage :');
    if (!v) return;
    let obj; try { obj = decodeShare(v); } catch { toast('Lien invalide'); return; }
    guardUnsaved(() => { try { importConfig(obj, { share: true }); closeModal(); } catch { toast('Lien invalide'); } });
  };
}
function openHistory() {
  const cfgs = load(LS.configs, {})[state.name] || [];
  const render = arr => {
    return arr.length ? arr.map(([v, i]) => `
    <div class="list-row"><span class="grow"><strong>v${esc(v.label || v.version)}</strong><br><small style="color:var(--muted)">${new Date(v.savedAt).toLocaleString()} · ${eur(v.total)} · budget ${eur(v.budget)}</small></span>
    <button class="mini-btn" data-r="${i}"><i class="fa-solid fa-rotate-left"></i> ${lang === 'en' ? 'Restore' : 'Restaurer'}</button>
    <button class="mini-btn danger" data-d="${i}" title="${lang === 'en' ? 'Remove this save' : 'Supprimer cette sauvegarde'}"><i class="fa-solid fa-trash"></i></button></div>`).join('')
    : `<p class="hint">${lang === 'en' ? 'No saves yet for this config.' : 'Aucune sauvegarde pour cette config.'}</p>`;
  };
  const rev = [...cfgs].reverse().map((v, i) => [v, cfgs.length - 1 - i]);
  openModal((lang === 'en' ? 'History — ' : 'Historique — ') + state.name, render(rev));
  $$('#modalBody [data-r]').forEach(b => b.onclick = () => {
    const v = cfgs[Number(b.dataset.r)];
    if (!v) return;
    guardUnsaved(() => restoreSnapshot(v.snapshot, v.name, 'Restored', 'Restaurée'));
  });
  // remove one save from history: 2-step inline confirm (same pattern as welcome recents)
  const armDel = b => {
    if (b.dataset.arm !== '1') {
      b.dataset.arm = '1';
      b.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${lang === 'en' ? 'Confirm?' : 'Sûr ?'}`;
      b.title = lang === 'en' ? 'Click again to confirm deletion' : 'Cliquez encore pour confirmer';
      setTimeout(() => { if (b.isConnected && b.dataset.arm === '1') { b.dataset.arm = ''; b.innerHTML = '<i class="fa-solid fa-trash"></i>'; } }, 3500);
      return;
    }
    const idx = Number(b.dataset.d);
    const cfgsAll = load(LS.configs, {});
    const arr = cfgsAll[state.name];
    if (Array.isArray(arr) && arr[idx]) {
      arr.splice(idx, 1);
      const saveOk = save(LS.configs, cfgsAll) !== false;
      const rev2 = [...arr].reverse().map((v, i) => [v, arr.length - 1 - i]);
      $('#modalBody').innerHTML = render(rev2);
      wire();
      toast(saveOk ? (lang === 'en' ? 'Save removed from history' : 'Sauvegarde supprimée de l\u2019historique') : (lang === 'en' ? 'Deletion failed' : 'Suppression échouée'));
    }
  };
  const wire = () => {
    $$('#modalBody [data-r]').forEach(b => b.onclick = () => {
      const arrNow = (load(LS.configs, {})[state.name]) || [];
      const v = arrNow[Number(b.dataset.r)];
      if (!v) return;
      guardUnsaved(() => restoreSnapshot(v.snapshot, v.name, 'Restored', 'Restaurée'));
    });
    $$('#modalBody [data-d]').forEach(b => { b.onclick = () => armDel(b); });
  };
  wire();
}
/* ---------- Welcome popup : creer / charger / construire avec IA ---------- */
function aiSlotOptions() {
  return SLOT_DEFS.filter(d => !d.extra).map(d => `<option value="${d.id}">${esc((SLOT_NAMES[lang] && SLOT_NAMES[lang][d.id]) || SLOT_NAMES.fr[d.id] || d.id)}</option>`).join('');
}
function openWelcome() {
  openModal(t('welcome.title'), `
    <div id="wMain" class="wpage">
      <div class="wcols">
        <div class="wleft">
          <img class="wlogo" src="./assets/icons/configmakericon.png" alt="ConfigMaker">
          <div class="wtitle">ConfigMaker by <a href="https://kevinjmt.github.io/" target="_blank" rel="noopener">KJ</a></div>
          <p class="hint wslogan">${esc(t('footer.tag'))}</p>
          <div class="wfeats">
            <div class="glass wfeat"><i class="fa-solid fa-tag"></i><span>${esc(t('welcome.feat1'))}</span></div>
            <div class="glass wfeat"><i class="fa-solid fa-shield-halved"></i><span>${esc(t('welcome.feat2'))}</span></div>
            <div class="glass wfeat"><i class="fa-solid fa-gauge-high"></i><span>${esc(t('welcome.feat3'))}</span></div>
            <div class="glass wfeat"><i class="fa-solid fa-code-branch"></i><span>${esc(t('welcome.feat4'))}</span></div>
          </div>
          <h3>${esc(t('welcome.new'))}</h3>
          <div class="wgrid"><label>${esc(t('welcome.name'))}<input id="wName" maxlength="60" value="${esc(state.name)}"></label>
          <label>${esc(t('welcome.budget'))}<input id="wBudget" type="number" min="0" step="1" value="${esc(String(state.budget))}"></label></div>
          <div class="btn-row"><button class="btn btn-primary" id="wNew"><i class="fa-solid fa-file-circle-plus"></i> ${esc(t('welcome.new'))}</button>
          <button class="btn bubble-btn" id="wAiGo"><i class="fa-solid fa-wand-magic-sparkles"></i> ${esc(t('welcome.createAi'))}</button></div>
        </div>
        <div class="wright">
          <h3>${esc(t('welcome.load'))}</h3>
          <div id="wConsentWarn"></div>
          <div id="wRecents" class="wrecents"></div>
        </div>
      </div>
    </div>
    <div id="wAi" class="wpage hidden">
      <div class="btn-row" style="justify-content:start"><button class="btn btn-sm" id="wBack"><i class="fa-solid fa-arrow-left"></i> ${esc(t('welcome.back'))}</button></div>
      <h3>${esc(t('welcome.createAi'))}</h3>
      <div class="wslide pre" id="wSlide">
        <div class="wai-left">
          <div id="wAiForm">
            <div class="wgrid"><label>${esc(t('welcome.budget'))}<input id="wAiBudget" type="number" min="0" step="1" value="${esc(String(state.budget))}"></label></div>
            <label class="wfld">${esc(t('welcome.usage'))}<textarea id="wUsage" rows="4" placeholder="${esc(t('welcome.usagePh'))}"></textarea></label>
            <div class="btn-row"><button class="btn bubble-btn" id="wSend"><i class="fa-solid fa-paper-plane"></i> ${esc(t('welcome.sendPplx'))}</button></div>
          </div>
          <div id="wAiComps" class="hidden"></div>
        </div>
        <div class="wai-right" id="wAiRight">
          <label class="wfld" id="wPasteWrap">${esc(t('welcome.pastedHint'))}<textarea id="wPaste" rows="8" placeholder="${esc(t('welcome.pastePh'))}"></textarea></label>
          <div class="btn-row" id="wBuildRow"><button class="btn bubble-btn" id="wBuild"><i class="fa-solid fa-gears"></i> ${esc(t('welcome.build'))}</button></div>
          <div id="wProgs"></div>
          <div id="wResults" class="hidden"></div>
        </div>
      </div>
    </div>`);
  $('#modalBox').classList.add('modal-wide');
  $('#wNew').onclick = () => {
    const n = $('#wName') ? $('#wName').value.trim() : '';
    const b = $('#wBudget') ? parseFloat($('#wBudget').value) || 0 : 0;
    guardUnsaved(() => {
      wipeToNew(); // ferme le modal : on applique nom/budget sur la config vierge
      if (n) state.name = n;
      if (b > 0) state.budget = b;
      persist(); refresh();
    });
  };
  $('#wAiGo').onclick = () => {
    $('#wMain').classList.add('hidden');
    const ai = $('#wAi');
    ai.classList.remove('hidden');
    const slide = $('#wSlide');
    if (slide) { slide.classList.add('pre'); requestAnimationFrame(() => requestAnimationFrame(() => slide.classList.remove('pre'))); }
    refreshIcons();
  };
  $('#wBack').onclick = () => { $('#wAi').classList.add('hidden'); $('#wMain').classList.remove('hidden'); };
  $('#wAiBudget').onchange = e => { const v = parseFloat(e.target.value) || 0; if (v > 0) { state.budget = v; persist(); refresh(); } };
  // recents (+ warning consent + suppression inline en 2 temps)
  const renderRecents = () => {
    const cfgs = load(LS.configs, {});
    const warn = $('#wConsentWarn');
    if (warn) {
      warn.innerHTML = storeConsent() === 'granted' ? '' : `<div class="wconsentwarn"><i class="fa-solid fa-triangle-exclamation"></i><span>${esc(t('welcome.noStore'))}</span><button class="mini-btn" id="wAskAgain">${esc(t('welcome.askAgain'))}</button></div>`;
      const again = $('#wAskAgain');
      if (again) again.onclick = () => showConsentBar();
    }
    const host = $('#wRecents');
    if (!host) return;
    const names = Object.keys(cfgs).sort((a, b) => (cfgs[b][cfgs[b].length - 1].savedAt || 0) - (cfgs[a][cfgs[a].length - 1].savedAt || 0));
    host.innerHTML = names.length ? '' : `<p class="hint">${esc(t('welcome.empty'))}</p>`;
    names.forEach(n => {
      const arr = cfgs[n], last = arr[arr.length - 1];
      const row = document.createElement('div');
      row.className = 'list-row';
      const paint = () => {
        row.innerHTML = `<span class="grow"><strong>${esc(n)}</strong><br><small style="color:var(--muted)">${new Date(last.savedAt).toLocaleString()} · ${eur(last.total)}</small></span>`;
        const b = document.createElement('button'); b.className = 'mini-btn'; b.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${esc(t('welcome.open'))}`;
        b.onclick = () => guardUnsaved(() => restoreSnapshot(last.snapshot, null, 'Loaded', 'Chargée'));
        const del = document.createElement('button'); del.className = 'mini-btn danger'; del.innerHTML = `<i class="fa-solid fa-trash"></i>`;
        del.title = t('welcome.del');
        del.onclick = () => {
          row.innerHTML = `<span class="grow"><strong>${esc(t('welcome.delConfirm'))}</strong></span>`;
          const yes = document.createElement('button'); yes.className = 'mini-btn danger'; yes.textContent = t('welcome.yes');
          const no = document.createElement('button'); no.className = 'mini-btn'; no.textContent = t('welcome.no');
          yes.onclick = () => { const c2 = load(LS.configs, {}); delete c2[n]; save(LS.configs, c2); renderRecents(); };
          no.onclick = paint;
          row.appendChild(yes); row.appendChild(no);
        };
        row.appendChild(b); row.appendChild(del);
      };
      paint();
      host.appendChild(row);
    });
  };
  renderRecents();
  $('#wSend').onclick = () => {
    const usage = $('#wUsage').value.trim();
    if (!usage) { toast(t('welcome.needsUsage')); return; }
    const b88 = AiParse.budgetForPrompt(parseFloat($('#wAiBudget').value) || state.budget);
    window.open('https://www.perplexity.ai/search?q=' + encodeURIComponent(AiParse.buildPrompt(b88, usage)), '_blank', 'noopener');
    toast(t('welcome.sentHint'));
  };
  $('#wBuild').onclick = () => {
    if (aiBuilding) { aiRunId++; return; } // stop : la boucle s'arrete apres l'item en cours
    const paste = $('#wPaste').value;
    const items = AiParse.parseResponse(paste);
    if (!items.length) { toast(t('welcome.noParse')); return; }
    const bud = $('#wAiBudget') ? parseFloat($('#wAiBudget').value) || 0 : 0;
    // "Creer avec IA" construit une NOUVELLE config : sauvegarder/abandonner le brouillon d'abord.
    const start = () => {
      resetDraftForBuild();
      if (bud > 0) state.budget = bud;
      if (!$('#wProgs')) reopenWelcomeAi(paste, bud); // le modal a ete remplace par la garde
      aiBuild(items);
    };
    guardUnsaved(start, () => reopenWelcomeAi(paste, bud));
  };
}
/* Re-rend le popup de bienvenue sur la page IA (apres un passsage par la garde "non sauvegarde"). */
function reopenWelcomeAi(paste, budget) {
  openWelcome();
  const main = $('#wMain'), ai = $('#wAi');
  if (main) main.classList.add('hidden');
  if (ai) ai.classList.remove('hidden');
  const p = $('#wPaste'); if (p) p.value = paste || '';
  const b = $('#wAiBudget'); if (b && budget > 0) b.value = String(budget);
  refreshIcons();
}
function aiAskSlot(host, it) {
  return new Promise(resolve => {
    const row = document.createElement('div');
    row.className = 'wrow wrow-ask';
    row.innerHTML = `<span class="grow"><strong>${esc(it.type)} : ${esc(it.ref)}</strong><br><small>${esc(t('welcome.askSlot'))}</small></span>
      <select class="wslot">${aiSlotOptions()}</select>
      <button class="mini-btn" data-ok>OK</button><button class="mini-btn" data-skip>${esc(t('welcome.skip'))}</button>`;
    host.appendChild(row);
    row.querySelector('[data-ok]').onclick = () => { const v = row.querySelector('.wslot').value; row.remove(); resolve(v); };
    row.querySelector('[data-skip]').onclick = () => { row.remove(); resolve(null); };
  });
}
async function aiFindRef(it) {
  const ref = typeof it === 'string' ? it : it.ref;
  const link = typeof it === 'string' ? null : it.link;
  // lien idealo direct (tous TLD/chemins) : import sans recherche, repli nom sinon.
  // Le lien est ignore si la page ne correspond pas a la ref (copier-coller melanges).
  if (link && AiParse.isIdealoLink(link)) {
    try {
      const d = await Idealo.product(link);
      if (d && !d.error && (d.datasheet || d.name) && AiParse.linkMatchesPage(ref, d.name || '')) {
        return { item: { name: d.name || ref, img: d.image || '', url: link, price: d.price || 0, specs: d.specs || '', vendor: '', delivery: 0, src: 'ai-link' }, stripped: false, direct: true, link };
      }
    } catch { /* repli recherche */ }
  }
  const tries = [ref];
  const stripped = AiParse.stripParens(ref);
  if (stripped && stripped !== ref) tries.push(stripped);
  for (const q of tries) {
    try {
      const r = await Idealo.list(idealoSearchUrl(q));
      if (r && !r.error && r.items && r.items.length) return { item: r.items[0], stripped: q !== ref, direct: false, link };
    } catch { /* ignore */ }
  }
  return null;
}
async function importAiProduct(slotId, it, link) {
  const np = blankProduct();
  np.name = it.name; np.image = it.img || ''; np.idealo = it.url || '';
  np.price = it.price || 0; np.specs = it.specs || ''; np.vendor = it.vendor || '';
  np.delivery = it.delivery || 0; np.src = it.src || '';
  if (link && !/idealo\.fr/i.test(link)) np.store = link; // lien marchand fourni par l'IA
  if (it.url) {
    try {
      const d = await Idealo.product(it.url);
      if (d && !d.error) {
        if (d.datasheet) np.datasheet = d.datasheet;
        if (d.specs && !np.specs) np.specs = d.specs;
        if (d.name && !np.name) np.name = d.name;
        if (d.image && !np.image) np.image = d.image;
        if (d.price && !np.price) np.price = d.price;
      }
    } catch { /* ignore */ }
  }
  const s = state.slots[slotId];
  if (!s) return false;
  s.products.push(np); s.selectedId = np.id;
  return true;
}
let aiRunId = 0, aiBuilding = false;
function aiSlotLabel(slot) { return (SLOT_NAMES[lang] && SLOT_NAMES[lang][slot]) || SLOT_NAMES.fr[slot] || slot; }
function aiSlotIcon(slot) { const d = SLOT_DEFS.find(x => x.id === slot); return iconHtml(d ? d.icon : 'fa-solid fa-question'); }
/* boutons composants a gauche (style slots non selectionnes, sans image ni specs) */
function aiRenderComps(items, slots) {
  const host = $('#wAiComps'); if (!host) return [];
  host.classList.remove('hidden');
  const form = $('#wAiForm'); if (form) form.classList.add('hidden');
  host.innerHTML = '';
  const list = items.map((it, i) => {
    const slot = slots[i];
    const d = document.createElement('div');
    d.className = 'wcomp';
    d.innerHTML = `<span class="wcomp-ic">${slot ? aiSlotIcon(slot) : '<i class="fa-solid fa-question"></i>'}</span><span class="wcomp-tx"><strong>${esc(slot ? aiSlotLabel(slot) : it.type)}</strong>${esc(it.ref)}</span><span class="wcomp-st"><i class="fa-solid fa-circle"></i></span>`;
    host.appendChild(d);
    return d;
  });
  refreshIcons(host); // lucide/bi injectes dynamiquement sinon invisibles
  return list;
}
function aiSetComp(comp, st) {
  if (!comp) return;
  comp.classList.remove('st-search', 'st-import', 'st-done', 'st-warn');
  const ic = comp.querySelector('.wcomp-st i');
  if (st === 'search') { comp.classList.add('st-search'); if (ic) ic.className = 'fa-solid fa-magnifying-glass'; }
  else if (st === 'import') { comp.classList.add('st-import'); if (ic) ic.className = 'fa-solid fa-download'; }
  else if (st === 'done') { comp.classList.add('st-done'); if (ic) ic.className = 'fa-solid fa-check'; }
}
function aiPhoto(comp, url) { const ic = comp && comp.querySelector('.wcomp-ic'); if (ic && url) ic.innerHTML = `<img src="${esc(url)}" alt="" loading="lazy">`; }
/* resultats Idealo complets dans le panneau droit (choix manuel) */
function aiManualPick(slot, query, link) {
  return new Promise(async resolve => {
    const res = $('#wResults'), paste = $('#wPasteWrap'), brow = $('#wBuildRow');
    if (!res) { resolve(null); return; }
    if (paste) paste.classList.add('hidden');
    if (brow) brow.classList.add('hidden');
    res.classList.remove('hidden');
    res.innerHTML = `<p class="hint"><i class="fa-solid fa-circle-notch fa-spin"></i> ${esc(query)}</p>`;
    let r = null;
    try { r = await Idealo.list(idealoSearchUrl(query)); } catch { /* ignore */ }
    const items = (r && !r.error && r.items) || [];
    if (!items.length) {
      res.innerHTML = `<p class="hint">${esc(t('welcome.notFound'))} : ${esc(query)}</p><div class="btn-row"><button class="mini-btn" id="wSkip">${esc(t('welcome.skip'))}</button></div>`;
      $('#wSkip').onclick = () => { aiRestoreRight(); resolve(null); };
      return;
    }
    res.innerHTML = `<p class="hint">${esc(query)} — ${items.length} ${esc(t('welcome.results'))}</p>` +
      items.slice(0, 12).map((it, i) => `<div class="pick-card">${it.img ? `<img class="pick-img" src="${esc(it.img)}" alt="" loading="lazy">` : ''}<div class="pi"><div class="pn">${esc(it.name)}</div><div class="ps">${esc(it.specs || '')}</div></div><span class="pp">${it.price ? eur(it.price) : ''}</span><button class="mini-btn" data-pick="${i}">${esc(t('welcome.choose'))}</button></div>`).join('') +
      `<div class="btn-row"><button class="mini-btn" id="wSkip">${esc(t('welcome.skip'))}</button></div>`;
    res.querySelectorAll('[data-pick]').forEach(b => b.onclick = async () => {
      const it = items[Number(b.dataset.pick)];
      b.disabled = true;
      await importAiProduct(slot, it, link);
      aiRestoreRight(); resolve(it);
    });
    $('#wSkip').onclick = () => { aiRestoreRight(); resolve(null); };
  });
}
function aiRestoreRight() {
  const res = $('#wResults'); if (res) { res.classList.add('hidden'); res.innerHTML = ''; }
  const paste = $('#wPasteWrap'); if (paste) paste.classList.remove('hidden');
  const brow = $('#wBuildRow'); if (brow) brow.classList.remove('hidden');
}
async function aiBuild(items) {
  const host = $('#wProgs'); if (!host) return;
  host.innerHTML = '';
  const btn = $('#wBuild');
  const baseLbl = btn.innerHTML;
  const my = ++aiRunId;
  aiBuilding = true;
  const stopLbl = `<i class="fa-solid fa-stop"></i> ${esc(t('welcome.stop'))}`;
  btn.innerHTML = stopLbl;
  // pre-mapping connue + boutons a gauche
  const slots = items.map(it => AiParse.typeToSlot(it.type));
  const comps = aiRenderComps(items, slots);
  let ok = 0; const skipped = []; let stopped = false;
  for (let i = 0; i < items.length; i++) {
    if (my !== aiRunId) { stopped = true; break; }
    const it = items[i];
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i + 1}/${items.length} — ${esc(it.ref.slice(0, 24))} · ${esc(t('welcome.stop'))}`;
    aiSetComp(comps[i], 'search');
    let slot = slots[i];
    if (!slot) {
      slot = await aiAskSlot(host, it);
      if (my !== aiRunId) { stopped = true; break; }
      slots[i] = slot;
      if (slot && comps[i]) {
        comps[i].querySelector('.wcomp-ic').innerHTML = aiSlotIcon(slot);
        comps[i].querySelector('.wcomp-tx strong').textContent = aiSlotLabel(slot);
        refreshIcons(comps[i]);
      }
    }
    if (!slot) { aiSetComp(comps[i], 'warn'); skipped.push(it); continue; }
    const found = await aiFindRef(it);
    if (my !== aiRunId) { stopped = true; break; }
    if (!found) {
      aiSetComp(comps[i], 'warn');
      const picked = await aiManualPick(slot, it.ref, it.link);
      if (my !== aiRunId) { stopped = true; break; }
      if (!picked) { skipped.push(it); continue; }
      aiSetComp(comps[i], 'done'); aiPhoto(comps[i], (sel(state.slots[slot]) || {}).image); ok++;
      continue;
    }
    aiSetComp(comps[i], 'import');
    await importAiProduct(slot, found.item, found.link);
    if (my !== aiRunId) { stopped = true; break; }
    aiSetComp(comps[i], 'done'); aiPhoto(comps[i], found.item.img || (sel(state.slots[slot]) || {}).image || ''); ok++;
  }
  aiBuilding = false;
  persist(); refresh();
  host.insertAdjacentHTML('beforeend', `<p class="hint">${ok} ✓${stopped ? ' · ' + esc(t('welcome.stopped')) : ''}${skipped.length ? ` · ${skipped.length} ${esc(t('welcome.skippedN'))} : ${esc(skipped.map(s => s.type + ' : ' + s.ref).join(' | '))}` : ''}</p>
    <div class="btn-row"><button class="btn btn-primary" id="wOpen"><i class="fa-solid fa-computer"></i> ${esc(t('welcome.openConfig'))}</button></div>`);
  btn.innerHTML = baseLbl;
  const go = $('#wOpen');
  if (go) go.onclick = () => { closeModal(); showPage('config'); refresh(); };
}
function maybeWelcome() {
  try {
    if (state.order.every(id => !(state.slots[id].products || []).length)) openWelcome();
  } catch { /* ignore */ }
}
/* Share link — human-readable URL arguments:
   #cfg=1&name=<config>&budget=<n>&<slotId>=<name>|<price>|<linkid>&…
   Only the config name, the budget and, per component, its name, price and
   Idealo link id are carried (everything else is dropped). */
const SHARE_SLOT_PREFIX = { ssd: 'ssd1', screen: 'screen1', pcx: 'os', opt: 'opt1' };
function idealoLinkId(p) {
  const m = (p && String(p.idealo || '')).match(/idealo\.fr\/prix\/([^/?#]+)/i);
  return m ? m[1].replace(/\.html$/i, '') : '';
}
function buildShareLink() {
  const parts = ['cfg=1', 'name=' + encodeURIComponent(state.name || 'Ma Config'), 'budget=' + (Number(state.budget) || 0)];
  (state.order || []).forEach(id => {
    const s = state.slots[id]; if (!s) return;
    const p = sel(s); if (!p) return;
    parts.push(encodeURIComponent(id) + '=' + encodeURIComponent(p.name || '') + '|' + (Number(p.price) || 0) + '|' + idealoLinkId(p));
  });
  return location.origin + location.pathname + '#' + parts.join('&');
}
function shareDefIdFor(key) {
  if (SLOT_DEFS.some(d => d.id === key)) return key;
  const m = String(key).match(/^([a-z0-9]+)_\d+$/);
  if (!m) return null;
  const base = m[1];
  if (SHARE_SLOT_PREFIX[base]) return SHARE_SLOT_PREFIX[base];
  return SLOT_DEFS.some(d => d.id === base) ? base : null;
}
/* Rebuild a state from the readable share arguments (null if not ours).
   Starts from the full default configurator (every component button is kept)
   and fills the shared components into their slots. */
function tryReadableShare(str) {
  const s = String(str || '');
  const hash = s.includes('#') ? s.slice(s.indexOf('#') + 1) : s;
  if (!/(^|&)cfg=1(&|$)/.test(hash)) return null;
  const params = {};
  hash.split('&').forEach(kv => { const i = kv.indexOf('='); if (i < 0) return; try { params[decodeURIComponent(kv.slice(0, i))] = kv.slice(i + 1); } catch { /* skip bad pair */ } });
  if (!('name' in params)) return null;
  const base = defaultState();
  const st = { name: decodeURIComponent(params.name || 'Ma Config'), budget: parseFloat(params.budget) || 0, version: '', slots: base.slots, order: base.order, usage: defaultUsage() };
  // Insert a recreated dynamic slot right below the last slot of the same type.
  const insertSlot = (key, defId) => {
    const same = st.order.filter(sid => st.slots[sid] && st.slots[sid].defId === defId);
    if (same.length) { st.order.splice(st.order.indexOf(same[same.length - 1]) + 1, 0, key); return; }
    const def = SLOT_DEFS.find(d => d.id === defId);
    const sec = def ? def.sec : 'others';
    const secIds = st.order.filter(sid => st.slots[sid] && defOf(st.slots[sid]).sec === sec);
    const last = secIds[secIds.length - 1];
    st.order.splice(last ? st.order.indexOf(last) + 1 : st.order.length, 0, key);
  };
  Object.keys(params).forEach(key => {
    if (key === 'cfg' || key === 'name' || key === 'budget') return;
    const seg = String(params[key]).split('|');
    const pname = decodeURIComponent(seg[0] || '');
    if (!pname) return;
    const defId = shareDefIdFor(key);
    if (!defId) return;
    let slot = st.slots[key];
    if (!slot) {
      const isDefault = SLOT_DEFS.some(d => d.id === key);
      slot = st.slots[key] = { defId, customLabel: isDefault ? '' : key, products: [], selectedId: null };
      insertSlot(key, defId);
    }
    const p = blankProduct();
    p.name = pname;
    p.price = parseFloat(seg[1]) || 0;
    const lid = String(seg[2] || '').replace(/[?#].*$/, '');
    p.idealo = lid ? 'https://www.idealo.fr/prix/' + lid + '.html' : '';
    slot.products.push(p); slot.selectedId = p.id;
  });
  return st;
}
function decodeShare(s) {
  const readable = tryReadableShare(s);
  if (readable) return readable;
  const m = String(s).match(/#c=([A-Za-z0-9+/=]+)/) || String(s).match(/[A-Za-z0-9+/=]{40,}/);
  const code = m ? m[1] : String(s).trim();
  return JSON.parse(decodeURIComponent(escape(atob(code))));
}
function importConfig(obj, opts) {
  const st = (obj && obj.slots) ? obj : (obj && obj.config && obj.config.slots ? obj.config : (obj && obj.state && obj.state.slots ? obj.state : null));
  if (!st) throw new Error('bad');
  state = st;
  if (!state.order) state.order = Object.keys(state.slots);
  if (!state.name) state.name = 'Ma Config';
  state.usage = normUsage(state.usage || {});
  if (typeof state.budget !== 'number') state.budget = parseFloat(state.budget) || 0;
  Object.values(state.slots).forEach(s => {
    if (!s || typeof s !== 'object') return;
    if (!Array.isArray(s.products)) s.products = [];
    if (!(s.selectedId && s.products.some(p => p.id === s.selectedId))) s.selectedId = s.products[0]?.id || null;
  });
  try { openAlts.clear(); } catch { /* ignore */ }
  try { openVariants.clear(); } catch { /* ignore */ }
  compatCache = null;
  /* Restore bundled history when importing a full-config export (history/prices)
     or an all-data backup (configs/hist), without wiping other stored configs. */
  try {
    const name = state.name || 'Ma Config';
    if (obj && Array.isArray(obj.history) && obj.history.length) { const c = load(LS.configs, {}); c[name] = obj.history; save(LS.configs, c); }
    if (obj && Array.isArray(obj.prices) && obj.prices.length) { const h = load(LS.hist, {}); h[name] = obj.prices; save(LS.hist, h); }
    if (obj && obj.configs && typeof obj.configs === 'object' && !Array.isArray(obj.configs)) { const c = load(LS.configs, {}); Object.keys(obj.configs).forEach(k => { c[k] = obj.configs[k]; }); save(LS.configs, c); }
    if (obj && obj.hist && typeof obj.hist === 'object' && !Array.isArray(obj.hist)) { const h = load(LS.hist, {}); Object.keys(obj.hist).forEach(k => { h[k] = obj.hist[k]; }); save(LS.hist, h); }
  } catch { /* ignore */ }
  if (persistRetry()) {
    lastSavedJson = JSON.stringify(state);
    toast(lang === 'en' ? 'Config imported and saved' : 'Config importée et sauvegardée');
  } else {
    toast(lang === 'en' ? 'Config loaded in memory but storage full — export JSON!' : 'Config chargée en mémoire mais stockage plein — exportez en JSON !');
  }
  refresh();
  // Sharing strips everything but name/price/Idealo link: enrich quietly
  // (background fetches fill specs, image, datasheet, vendor) and drop the
  // share hash so a reload reuses the enriched draft instead of re-importing.
  if (opts && opts.share) {
    try { if (/^#(c=|cfg=1\b)/.test(location.hash)) history.replaceState(null, '', location.href.split('#')[0]); } catch { /* ignore */ }
    schedulePriceRefresh(600, true);
  } else schedulePriceRefresh();
}
/* ---------- Background price refresh (same vendor, else cheapest) ---------- */
let priceRefreshRunning = false, priceRefreshTimer = null;
const refreshingPids = new Set();
const refreshFailed = new Set();
function schedulePriceRefresh(delay = 1200, quiet = false) {
  clearTimeout(priceRefreshTimer);
  priceRefreshTimer = setTimeout(() => refreshPrices(quiet), delay);
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
async function refreshPrices(quiet) {
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
  if (!quiet) showProgress(`${prog} (0/${urls.length})…`);
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
    if (!quiet) showProgress(`${prog} (${i + 1}/${urls.length})…`);
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
/* ---------- Share / Export (one mutual popup, pill-switched) ---------- */
function openShareExport(pill) {
  pill = pill === 'export' ? 'export' : 'share';
  const T = (en, fr) => (lang === 'en' ? en : fr);
  const link = buildShareLink();
  const both = [
    T('Config name', 'Nom de la config'),
    T('Budget', 'Budget'),
    T('Each component: name, price, Idealo link', 'Chaque composant : nom, prix, lien Idealo'),
  ];
  const onlyExport = [
    T('Manual & merchant links, vendor, delivery', 'Liens manuel & marchand, vendeur, livraison'),
    T('Quantities, power (W), PSU/UPS capacity', 'Quantités, puissance (W), capacité alim/onduleur'),
    T('Specs, datasheets, verification, notes', 'Specs, fiches techniques, vérification, notes'),
    T('Variants, carrier & tracking, custom labels', 'Variantes, transporteur & suivi, libellés perso'),
    T('PC usage & pricing schedule', 'Utilisation & tarification du PC'),
    T('Price history & saved snapshots', 'Historique des prix & sauvegardes'),
    T('Full PDF report (description, charts, benchmarks)', 'Rapport PDF complet (description, graphiques, benchmarks)'),
  ];
  const li = a => a.map(x => `<li>${esc(x)}</li>`).join('');
  const cmp = `<div class="cmp">
    <div class="cmp-col"><h4><i class="fa-solid fa-share-nodes"></i> ${T('Share &amp; Export', 'Partage &amp; export')}</h4><ul>${li(both)}</ul></div>
    <div class="cmp-col"><h4><i class="fa-solid fa-file-arrow-down"></i> ${T('Export only', 'Export uniquement')}</h4><ul>${li(onlyExport)}</ul></div>
  </div>`;
  const sharePane = `
    <p class="hint">${T('Scan the QR code or copy the link to share this configuration.', 'Scannez le QR code ou copiez le lien pour partager cette configuration.')}</p>
    <div class="qr-img" id="s_qr"></div>
    <div class="fld"><label>${T('Link (prefilled)', 'Lien (pré-rempli)')}</label><input id="s_link" readonly value="${esc(link)}"></div>
    <div class="btn-row"><button class="btn btn-sm btn-primary" id="s_copy"><i class="fa-solid fa-copy"></i> ${T('Copy link', 'Copier le lien')}</button></div>`;
  const exportPane = `
    <p class="hint">${T('PDF = full report (name, budget, description, components with manual / Idealo / merchant links, power draw, benchmarks, price history). JSON = this config with all its history, re-importable.', 'PDF = rapport complet (nom, budget, description, composants avec liens manuel / Idealo / marchand, consommation, benchmarks, historique des prix). JSON = cette config avec tout son historique, réimportable.')}</p>
    <p class="hint">${T('Tip: in the print window pick the “Save as PDF” destination (not a system/network printer). A system printer rasterizes the page — text then can’t be selected and links stop working. The preview pane itself never allows selecting text or clicking links.', 'Astuce : dans la fenêtre d’impression, choisissez la destination « Enregistrer au format PDF » (pas une imprimante système/réseau). Une imprimante système rastérise la page : le texte n’est alors plus sélectionnable et les liens deviennent inactifs. L’aperçu, lui, ne permet jamais de sélectionner le texte ni de cliquer les liens.')}</p>
    <div class="btn-row"><button class="btn btn-primary" id="e_pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button>
    <button class="btn" id="e_json"><i class="fa-solid fa-file-code"></i> JSON</button></div>`;
  openModal(T('Share / Export', 'Partager / Exporter'), `
    <div class="usage-tabs">
      <button type="button" class="usage-tab${pill === 'share' ? ' active' : ''}" data-tab="share">${T('Share', 'Partager')}</button>
      <button type="button" class="usage-tab${pill === 'export' ? ' active' : ''}" data-tab="export">${T('Export', 'Exporter')}</button>
    </div>
    ${cmp}
    <div class="usage-pane" data-pane="share"${pill === 'share' ? '' : ' style="display:none"'}>${sharePane}</div>
    <div class="usage-pane" data-pane="export"${pill === 'export' ? '' : ' style="display:none"'}>${exportPane}</div>`, 'modal-wide');
  const host = $('#modalBody');
  host.querySelectorAll('.usage-tab').forEach(b => b.onclick = () => {
    const tab = b.dataset.tab;
    host.querySelectorAll('.usage-tab').forEach(x => x.classList.toggle('active', x.dataset.tab === tab));
    host.querySelectorAll('.usage-pane').forEach(p => { p.style.display = p.dataset.pane === tab ? '' : 'none'; });
  });
  const qrEl = $('#s_qr');
  if (qrEl && typeof qrcode === 'function') {
    try { const q = qrcode(0, 'L'); q.addData(link); q.make(); qrEl.innerHTML = q.createSvgTag({ cellSize: 4, margin: 8, scalable: true }); }
    catch { qrEl.innerHTML = ''; }
  }
  $('#s_copy').onclick = () => { navigator.clipboard?.writeText(link); toast(T('Link copied', 'Lien copié')); };
  $('#e_pdf').onclick = () => { closeModal(); exportPdf(); };
  $('#e_json').onclick = () => exportConfigJson();
}
/* ---------- Print / PDF report ----------
   The printed PDF is a dedicated report (name+budget, description, components
   with real manual / Idealo / merchant links, consumption, benchmarks, price
   history), built into #printRoot and shown only while printing. */
function printRoot() {
  let r = document.getElementById('printRoot');
  if (!r) { r = document.createElement('div'); r.id = 'printRoot'; document.body.appendChild(r); }
  return r;
}
function prSection(root, title, icon) {
  const sec = document.createElement('section');
  sec.className = 'pr-sec';
  if (title) sec.innerHTML = `<h2 class="pr-h2">${icon ? `<i class="${icon}"></i> ` : ''}${esc(title)}</h2>`;
  root.appendChild(sec);
  return sec;
}
/* Drop id attributes from a cloned subtree so the report never duplicates
   ids that already exist on screen (getElementById lookups must stay unique). */
function prStripIds(node) {
  if (node.removeAttribute) node.removeAttribute('id');
  if (node.querySelectorAll) node.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  return node;
}
/* Clean a cloned summary pane: drop ids and interactive-only bits
   (fold chevrons, mini buttons) so the printed pane is purely static. */
function prCleanPane(node) {
  /* the cloned pane keeps the on-screen tab/fold state (.hidden/.collapsed);
     clear it so the printed report shows every pane fully expanded */
  node.classList.remove('hidden', 'collapsed');
  node.querySelectorAll('.hidden, .collapsed').forEach(n => n.classList.remove('hidden', 'collapsed'));
  node.querySelectorAll('.foldchev, .mini-btn, .verify-btn').forEach(n => n.remove());
  return prStripIds(node);
}
/* Clone a left-column component card and turn its action row into real
   manual / Idealo / merchant links so they stay clickable in the PDF. */
function prComponentCard(id) {
  const src = document.getElementById('slotSections');
  let srcEl = null;
  if (src) srcEl = src.querySelector('.slot[data-slot="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  const node = prStripIds(srcEl ? srcEl.cloneNode(true) : document.createElement('div'));
  node.classList.add('pr-slot');
  node.querySelectorAll('.slot-remove, .slot-refetch, .slot-alt-tab, .compat-more').forEach(n => n.remove());
  const s = state.slots[id], p = s ? sel(s) : null;
  const acts = node.querySelector('.slot-actions');
  if (acts) {
    acts.textContent = '';
    const idealoOk = !!(p && p.idealo && /idealo\.fr/i.test(p.idealo));
    const links = p ? [
      { href: String(p.manual || '').trim(), icon: 'fa-solid fa-book', label: lang === 'en' ? 'Manual' : 'Manuel' },
      { href: idealoOk ? p.idealo : '', icon: 'fa-solid fa-arrow-up-right-from-square', label: 'Idealo' },
      { href: buyUrlFor(p) || '', icon: 'fa-solid fa-cart-shopping', label: lang === 'en' ? 'Merchant' : 'Marchand' },
    ] : [];
    links.forEach(l => {
      const el = document.createElement(l.href ? 'a' : 'span');
      el.className = 'mini-btn pr-link' + (l.href ? '' : ' pr-link-off');
      if (l.href) { el.href = l.href; el.target = '_blank'; el.rel = 'noopener'; }
      el.innerHTML = `<i class="${l.icon}"></i><span>${esc(l.label)}</span>`;
      acts.appendChild(el);
    });
  }
  return node;
}
/* Draw the price chart for one mode, copy it onto a white background as a PNG
   (so it prints whole and stays readable), then restore the on-screen chart. */
function prChartImage(mode) {
  const cv = document.getElementById('priceChart');
  if (!cv) return null;
  const savedMode = phMode, savedHidden = priceHidden;
  phMode = mode; priceHidden = new Set();
  try {
    drawPrices();
    const leg = document.getElementById('priceLegend');
    const legend = leg ? leg.innerHTML : '';
    const out = document.createElement('canvas');
    out.width = cv.width || 800; out.height = cv.height || 320;
    const octx = out.getContext('2d');
    octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, out.width, out.height);
    octx.drawImage(cv, 0, 0);
    return { url: out.toDataURL('image/png'), legend };
  } catch { return null; }
  finally {
    phMode = savedMode; priceHidden = savedHidden;
    try { drawPrices(); } catch { /* ignore */ }
  }
}
/* PC case product used as the report cover image (first selected case slot). */
function prCaseProduct() {
  const s = state.slots.case; if (s) { const p = sel(s); if (p) return p; }
  for (const id of state.order) { const sl = state.slots[id]; if (sl && sl.defId === 'case') { const p = sel(sl); if (p) return p; } }
  return null;
}
/* Static (non-interactive) copy of the "usage & tarification" 7x24 grids. */
function prUsageConfig() {
  const st = usagePrefs();
  const days = WEEK_DAYS[lang] || WEEK_DAYS.fr;
  const hh = i => String(i).padStart(2, '0');
  const cal = kind => {
    const head = `<span class="wk-corner"></span>` + days.map(d => `<span class="wk-dayh">${esc(d)}</span>`).join('');
    const rows = Array.from({ length: 24 }, (_, h) => `<span class="wk-hour">${hh(h)}h</span>` + days.map((_, di) => {
      const i = di * 24 + h;
      const v = kind === 'tarif' ? st.tarif[i] : st.usage[i];
      const cls = kind === 'tarif' ? (v ? 'hp' : 'hc') : (v ? 'on' : '');
      return `<span class="day-sq ${cls}"></span>`;
    }).join('')).join('');
    return `<div class="wk" data-kind="${kind}">${head}${rows}</div>`;
  };
  const hp = st.tarif.filter(Boolean).length;
  return `<div class="pr-usage"><div class="pr-usage-grid">
    <div><h3 class="pr-h3">${esc(lang === 'en' ? 'PC usage (on/off)' : 'Utilisation du PC (marche/arrêt)')}</h3>${cal('usage')}<p class="hint">${usageWeeklyHours(st)} ${lang === 'en' ? 'h/week' : 'h/semaine'} · ${usageDailyHours(st).toFixed(1)} ${lang === 'en' ? 'h/day avg' : 'h/jour moy.'}</p></div>
    <div><h3 class="pr-h3">${esc(lang === 'en' ? 'Pricing (peak / off-peak)' : 'Tarification (HP / HC)')}</h3>${cal('tarif')}<p class="hint">${hp} HP · ${168 - hp} HC · ${lang === 'en' ? 'peak' : 'HP'} ${st.priceHP.toFixed(4)} €/kWh · ${lang === 'en' ? 'off-peak' : 'HC'} ${st.priceHC.toFixed(4)} €/kWh</p></div>
  </div></div>`;
}
function buildPrintReport() {
  renderSummary();
  renderSumExtra();
  renderCompat();
  const root = printRoot();
  root.innerHTML = '';
  const T = totals();
  const budget = Number(state.budget) || 0;
  const L = (en, fr) => (lang === 'en' ? en : fr);
  const appUrl = location.href.split('#')[0];
  const verBtn = document.getElementById('versionBtn');
  const appVer = verBtn ? String(verBtn.textContent || '').trim() : '';
  const exportDate = new Date().toLocaleString(lang === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const badge = txt => (txt ? `<span class="pr-badge">${esc(txt)}</span>` : '');

  /* 1 — cover: hero card (case image + title + budget/totals/diffs) + main menu */
  const cover = prSection(root, null);
  cover.classList.add('pr-cover');
  const caseP = prCaseProduct();
  const visual = caseP && caseP.image
    ? `<img class="pr-hero-img" src="${esc(caseP.image)}" alt="">`
    : `<span class="pr-hero-icon">${iconHtml('lucide:pc-case')}</span>`;
  const d1 = budget - (T.total - T.deliv), d2 = T.diff;
  const mkDelta = d => {
    const over = d < 0, abs = eur(Math.abs(d));
    const txt = over ? L(`${abs} over budget`, `${abs} de dépassement`) : L(`${abs} remaining`, `${abs} restants`);
    return `<span class="pr-v ${over ? 'ko' : 'ok'}">${esc(txt)}</span>`;
  };
  cover.innerHTML = `<div class="pr-hero">${visual}
    <div class="pr-hero-main">
      <div class="pr-hero-name">${esc(state.name || 'Ma Config')}</div>
      <div class="pr-hero-badges">${badge(state.version ? 'config v' + state.version : '')}${badge(appVer)}${badge(exportDate)}</div>
      <div class="pr-hero-stats">
        <span class="pr-kv"><span class="pr-k">${esc(L('Budget', 'Budget'))}</span><span class="pr-v">${eur(budget)}</span></span>
        <span class="pr-kv"><span class="pr-k">${esc(L('Total', 'Total'))}</span><span class="pr-v">${eur(T.total - T.deliv)}</span></span>
        <span class="pr-kv"><span class="pr-k">${esc(L('Total incl. delivery', 'Total livraison incluse'))}</span><span class="pr-v">${eur(T.total)}</span></span>
        <span class="pr-kv"><span class="pr-k">${esc(L('Delivery', 'Livraison'))}</span><span class="pr-v">${eur(T.deliv)}</span></span>
      </div>
      <div class="pr-hero-diffs">
        <span class="pr-kv"><span class="pr-k">${esc(L('Budget gap (excl. delivery)', 'Écart budget (hors livraison)'))}</span>${mkDelta(d1)}</span>
        <span class="pr-kv"><span class="pr-k">${esc(L('Budget gap (incl. delivery)', 'Écart budget (livraison incluse)'))}</span>${mkDelta(d2)}</span>
      </div>
    </div>
  </div>
  <div class="pr-menu">
    <img class="pr-menu-logo" src="./assets/icons/configmakericon.png" alt="ConfigMaker">
    <div class="pr-menu-main">
      <div class="pr-menu-title"><a href="${esc(appUrl)}">ConfigMaker</a> by <a href="https://kevinjmt.github.io/" target="_blank" rel="noopener">KJ</a></div>
      <p class="hint">${esc(t('footer.tag'))}</p>
      <div class="pr-menu-feats">
        <span class="pr-menu-feat"><i class="fa-solid fa-tag"></i>${esc(t('welcome.feat1'))}</span>
        <span class="pr-menu-feat"><i class="fa-solid fa-shield-halved"></i>${esc(t('welcome.feat2'))}</span>
        <span class="pr-menu-feat"><i class="fa-solid fa-gauge-high"></i>${esc(t('welcome.feat3'))}</span>
        <span class="pr-menu-feat"><i class="fa-solid fa-code-branch"></i>${esc(t('welcome.feat4'))}</span>
      </div>
      <p class="pr-menu-ver">${esc(L('Webapp version', 'Version webapp'))} : ${esc(appVer || '—')}</p>
      <a class="pr-menu-cta" href="${esc(appUrl)}">${esc(L('Create your configuration with ConfigMaker', 'Créez votre configuration avec ConfigMaker'))}</a>
    </div>
  </div>`;

  /* 2 — description */
  const desc = prSection(root, L('Summary', 'Description'), 'fa-solid fa-list');
  const descSrc = document.getElementById('sumDescPane');
  if (descSrc && descSrc.children.length) desc.appendChild(prCleanPane(descSrc.cloneNode(true)));
  else desc.insertAdjacentHTML('beforeend', `<p class="hint">${esc(L('Nothing selected.', 'Rien de sélectionné.'))}</p>`);

  /* 3 — graphs (budget allocation + per-section pies) */
  const graphs = prSection(root, L('Graphs', 'Graphiques'), 'fa-solid fa-chart-pie');
  const chartsSrc = document.getElementById('sumChartsPane');
  if (chartsSrc && chartsSrc.children.length) graphs.appendChild(prCleanPane(chartsSrc.cloneNode(true)));
  else graphs.insertAdjacentHTML('beforeend', `<p class="hint">${esc(L('Nothing selected.', 'Rien de sélectionné.'))}</p>`);

  /* 4 — components (grouped PC / Setup / Options) with real links */
  const comps = prSection(root, L('Components', 'Composants'), 'fa-solid fa-computer');
  let anyComp = false;
  ['pc', 'setup', 'others'].forEach(secId => {
    const ids = state.order.filter(id => { const s = state.slots[id]; return s && defOf(s).sec === secId && sel(s); });
    if (!ids.length) return;
    anyComp = true;
    const grp = document.createElement('div');
    grp.className = 'pr-group';
    const sub = secId === 'pc' ? T.pc : secId === 'setup' ? T.setup : T.others;
    grp.innerHTML = `<h3 class="pr-h3"><i class="${SECTIONS.find(x => x.id === secId).icon}"></i> ${esc(secName(secId))}<span class="pr-grp-total">${eur(sub)}</span></h3>`;
    ids.forEach(id => grp.appendChild(prComponentCard(id)));
    comps.appendChild(grp);
  });
  if (!anyComp) comps.insertAdjacentHTML('beforeend', `<p class="hint">${esc(L('Nothing selected.', 'Rien de sélectionné.'))}</p>`);

  /* 5 — consumption: usage & pricing config + power charts/totals */
  const power = prSection(root, L('Power draw', 'Consommation'), 'fa-solid fa-bolt');
  const usageWrap = document.createElement('div');
  usageWrap.innerHTML = prUsageConfig();
  power.appendChild(usageWrap);
  const powerSrc = document.getElementById('sumPowerPane');
  if (powerSrc && powerSrc.children.length) {
    const c = powerSrc.cloneNode(true);
    const ub = c.querySelector('#openUsageBtn'); if (ub) ub.remove();
    power.appendChild(prCleanPane(c));
  }

  /* 6 — compatibility */
  const compat = prSection(root, L('Compatibility', 'Compatibilité'), 'fa-solid fa-shield-halved');
  const compatSrc = document.getElementById('sumCompatPane');
  if (compatSrc && compatSrc.children.length) compat.appendChild(prCleanPane(compatSrc.cloneNode(true)));
  else compat.insertAdjacentHTML('beforeend', `<p class="hint">${esc(L('No checks.', 'Aucune vérification.'))}</p>`);

  /* 7 — benchmarks */
  const bench = prSection(root, 'Benchmarks', 'fa-solid fa-gauge-high');
  const benchSrc = document.getElementById('page-bench');
  if (benchSrc) {
    const c = benchSrc.cloneNode(true);
    c.className = 'pr-bench';
    c.querySelectorAll('h2, .btn-row, .bench-gamerow, #benchGrid, #benchStatus, #benchQuery, .search-row').forEach(n => n.remove());
    prStripIds(c);
    const q = benchQuery();
    if (q) {
      const p = document.createElement('p');
      p.className = 'pr-yt';
      p.innerHTML = `<i class="fa-brands fa-youtube"></i> <a href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">${esc(q)}</a>`;
      c.insertBefore(p, c.firstChild);
    }
    bench.appendChild(c);
  }

  /* 8 — price history (three charts as images) */
  const prices = prSection(root, L('Price history', 'Historique des prix'), 'fa-solid fa-chart-line');
  const h = hist()[state.name] || [];
  if (!h.length) {
    prices.insertAdjacentHTML('beforeend', `<p class="hint">${esc(L('No price points yet — a point is added on each save.', 'Aucun point de prix — un point est ajouté à chaque sauvegarde.'))}</p>`);
  } else {
    [['total', L('Total config', 'Total config')], ['per', L('Per component', 'Par composant')], ['power', L('Power', 'Consommation')]].forEach(([m, title]) => {
      const cap = prChartImage(m);
      if (!cap) return;
      const box = document.createElement('div');
      box.className = 'pr-chart';
      box.innerHTML = `<h3 class="pr-h3">${esc(title)}</h3><img class="pr-chart-img" src="${cap.url}" alt=""><div class="legend">${cap.legend}</div>`;
      prices.appendChild(box);
    });
  }

  refreshIcons(root);
}
function prCleanup() {
  document.body.classList.remove('printing');
  const r = document.getElementById('printRoot'); if (r) r.innerHTML = '';
}
function exportPdf() {
  try { showBench(); } catch { /* ignore */ } // refresh live scores first (sync part)
  try { buildPrintReport(); document.body.classList.add('printing'); } catch { /* fall back to on-screen print */ }
  window.print();
}
window.addEventListener('beforeprint', () => {
  try { buildPrintReport(); document.body.classList.add('printing'); } catch { /* ignore */ }
});
window.addEventListener('afterprint', prCleanup);
function download(name, content, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
/* JSON export of the currently selected config — absolutely everything about it
   (the config itself, its saved snapshots and its price history). */
function exportConfigJson() {
  const name = state.name || 'Ma Config';
  download(name + '.configmaker.json', JSON.stringify({
    app: 'ConfigMaker', version: APP_VERSION, kind: 'config',
    exportedAt: new Date().toISOString(),
    config: state,
    history: load(LS.configs, {})[name] || [],
    prices: load(LS.hist, {})[name] || [],
  }, null, 2), 'application/json');
}
/* JSON export of everything stored (all configs, all history, prefs). */
function exportAll() {
  download('configmaker-all-data.json', JSON.stringify({
    app: 'ConfigMaker', version: APP_VERSION, kind: 'all',
    exportedAt: new Date().toISOString(),
    state, configs: load(LS.configs, {}), hist: load(LS.hist, {}), prefs: load(LS.prefs, {}),
  }, null, 2), 'application/json');
}
function openChangelog() {
  openModal('Changelog — v' + APP_VERSION, `
    <div class="chlog"><h3>v2.55 — Ouverture d’un lien de partage</h3><p class="hint">Charger une config depuis un lien partagé reconstruit désormais tout le configurateur (toutes les sections et tous les composants restent visibles et éditables) et y place les composants partagés. Les fiches réduites du lien (nom, prix, lien Idealo) sont réenrichies en arrière-plan — image, specs, fiche technique et compatibilité — sans le popup bloquant « Actualisation des prix ». L’adresse est nettoyée après l’import pour qu’un rechargement réutilise la config enrichie.</p></div>
    <div class="chlog"><h3>v2.54 — Partage &amp; export repensés</h3><p class="hint">Popup « Partager / Exporter » unique avec bascule Partager ⇄ Exporter : code QR + lien lisible pour partager, PDF et JSON pour exporter, et un comparatif de ce que chaque option contient. Le lien de partage devient lisible (arguments d’URL : nom, budget, et pour chaque composant nom, prix et identifiant du lien Idealo) — l’ancien lien encodé reste accepté. Le JSON d’une config contient désormais tout son historique (sauvegardes et courbe des prix) et le réimport le restaure ; « Export données » de la barre de navigation exporte l’intégralité du stockage (toutes les configs, tout l’historique, préférences).</p></div>
    <div class="chlog"><h3>v2.53 — Graphiques &amp; historique de conso</h3><p class="hint">Graphiques en camembert : une couleur par composant, choisie pour que les tranches voisines soient très contrastées (violet, jaune, vert, marron, turquoise, rose…), les exemplaires supplémentaires d’un même type prenant une teinte plus foncée. Historique des prix repensé : échelles horizontale (dates) et verticale (valeurs), rendu net (HiDPI), survol de la courbe avec info-bulle par date, ligne de budget limitée à la vue total, et nouvelle catégorie « Consommation » qui conserve la puissance (W) à chaque sauvegarde. En vue « par composant », l’info-bulle n’affiche que le composant survolé, la légende est rangée en trois catégories (PC, setup, options) et chaque composant peut être activé/désactivé en cliquant son entrée ; des boutons « Tout / PC / Setup / Options » au-dessus activent/désactivent toute la catégorie d’un clic ; le survol de la consommation affiche aussi le coût estimé par mois et par an.</p></div>
    <div class="chlog"><h3>v2.52 — Prises Schuko &amp; calendrier hebdo</h3><p class="hint">Routage des prises Schuko corrigé : sans onduleur, PC/écrans/consoles vont sur la multiprise ; avec onduleur, PC + écrans + consoles (détectées par nom) sur l’onduleur et les autres périphériques sur la multiprise. Popup « usage &amp; tarification » désormais un calendrier hebdomadaire 7×24 (heures indépendantes par jour, moyennes h/semaine et h/jour).</p></div>
    <div class="chlog"><h3>v2.51 — Tier list PSU 2025, multiprises &amp; tarification</h3><p class="hint">Qualité alim basée sur la PSU Tier List communautaire (rév. 2025, tiers A–F avec confiance limitée, ODM, topologie, ATX 3.x) ; nouvelle catégorie multiprise (compatibilité prises Schuko avec l’onduleur, UPS branché sur la multiprise) ; popup « usage &amp; tarification » (grille horaire 24 h marche/arrêt, heures pleines/creuses, prix HP/HC personnalisés) au bas de l’onglet Conso.</p></div>
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
  const page = $('#page-' + which);
  if (page) { page.classList.remove('page-enter'); void page.offsetWidth; page.classList.add('page-enter'); }
  if (which !== 'config') {
    closeMobileSheets();
    if (activeSlot) closePicker();
  }
  updateMobileTotalBar();
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
  updateMobileTotalBar();
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
  $('#shareBtn').onclick = () => openShareExport('share');
  $('#exportBtn').onclick = () => openShareExport('export');
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
  $('#mobileTotalBtn').onclick = toggleSummarySheet;
  $('#mobileScrim').onclick = () => {
    if (document.body.classList.contains('picker-sheet-open')) closePicker(); else closeSummarySheet();
  };
  $('#sumClose').onclick = closeSummarySheet;
  $('#pickerClose').onclick = closePicker;
  $('#pickerNewBtn').onclick = () => openProductForm(activeSlot, null, pickerMode === 'add' ? { addOnly: true } : {});
  const goIdealo = () => {
    const q = $('#idealoQuery').value.trim() || slotName(activeSlot);
    const url = idealoSearchUrl(q);
    ++pickerSeq; // cancel any pending dynamic-default resolution
    currentIdealoUrl = url;
    $('#pickerIdealoSearch').href = url;
    const f = $('#idealoOpenFallback'); if (f) f.onclick = () => window.open(url, '_blank', 'noopener');
    currentCatLabel = `“${q}”`;
    pickerResetFilters('', ''); pickerMoreOpen = false; renderPickerFilters();
    loadIdealoList(url);
  };
  $('#idealoGo').onclick = goIdealo;
  $('#idealoClear').onclick = () => {
    $('#idealoQuery').value = '';
    $('#idealoClear').classList.add('hidden');
    $('#idealoQuery').focus();
    if (!activeSlot) return;
    const key = slotCatKey(activeSlot);
    loadCategory(key);
    resolveDefaultCat(key, ++pickerSeq); // back to the component's default page
  };
  $('#idealoQuery').addEventListener('input', e => $('#idealoClear').classList.toggle('hidden', !e.target.value));
  $('#idealoQuery').addEventListener('keydown', e => { if (e.key === 'Enter') goIdealo(); });
  $('#idealoFilter').addEventListener('input', e => { idealQ = e.target.value; idealShown = IDEAL_PAGE; renderIdealo(); });
  $('#idealoSort').addEventListener('change', e => {
    idealSort = e.target.value; idealShown = IDEAL_PAGE;
    if (!idealBase || idealFetched[idealSort]) renderIdealo();
    else loadIdealoList(null, 'variant');
  });
  $('#idealoMore').onclick = () => idealMore();
  const moreBtn = $('#pickerMoreBtn');
  if (moreBtn) moreBtn.onclick = () => { pickerMoreOpen = !pickerMoreOpen; renderPickerFilters(); };
  const clearBtn = $('#pickerClearFilters');
  if (clearBtn) clearBtn.onclick = () => pickerClearFilters();
  const fpanel = $('#pickerFilters');
  if (fpanel) {
    fpanel.addEventListener('change', onFilterChange);
    fpanel.addEventListener('input', onFilterInput);
    fpanel.addEventListener('click', onFilterClick);
  }
  document.addEventListener('mouseover', e => { const b = e.target.closest && e.target.closest('.f-info'); if (b) showFilterTip(b); });
  document.addEventListener('mouseout', e => { const b = e.target.closest && e.target.closest('.f-info'); if (b) hideFilterTip(); });
  document.addEventListener('click', e => { if (!e.target.closest || !e.target.closest('.f-info')) hideFilterTip(); });
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
  const phSet = m => { phMode = m; priceHover = null; ['total', 'per', 'power'].forEach(k => { const b = $('#ph' + k[0].toUpperCase() + k.slice(1)); if (b) b.classList.toggle('active', k === m); }); drawPrices(); };
  $('#phTotal').onclick = () => phSet('total');
  $('#phPer').onclick = () => phSet('per');
  $('#phPower').onclick = () => phSet('power');
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
  const brandHome = $('#brandHome');
  if (brandHome) brandHome.onclick = e => { e.preventDefault(); openWelcome(); };
  const consentAccept = $('#consentAccept');
  if (consentAccept) consentAccept.onclick = () => setStoreConsent('granted');
  const consentDeny = $('#consentDeny');
  if (consentDeny) consentDeny.onclick = () => { setStoreConsent('denied'); toast(t('consent.deniedHint')); };
  if (aiInput) aiInput.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') aiSend(); });
  $('#modalOverlay').addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    closeModal();
    if (document.body.classList.contains('picker-sheet-open')) closePicker(); else closeSummarySheet();
  });
  const burger = $('#burger'), menu = $('#menu');
  const toggle = () => { menu.classList.toggle('show'); $('.q').classList.toggle('a'); $('.w').classList.toggle('b'); $('.e').classList.toggle('c'); };
  burger.addEventListener('click', toggle);
  $('#burgerClose').onclick = toggle;
  window.addEventListener('resize', () => {
    const mobile = isMobileView();
    updateMobileTotalBar();
    if (!mobile) {
      document.body.classList.remove('summary-sheet-open', 'picker-sheet-open');
      $('#mobileScrim').classList.add('hidden');
      if (activeSlot) { $('#pickerPanel').classList.remove('hidden'); $('#summaryPanel').classList.add('hidden'); }
      else $('#summaryPanel').classList.remove('hidden');
    } else if (activeSlot && !$('#pickerPanel').classList.contains('hidden') && !document.body.classList.contains('picker-sheet-open')) {
      openPickerSheet();
    }
    schedulePriceDraw();
  }, { passive: true });
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
  baselineSaved(); // draft restored as-is; dirty iff different from last save
  window.addEventListener('beforeunload', () => { persist(); try { if (typeof StoreDB !== 'undefined') StoreDB.flush(); } catch {} }); // belt & braces: draft always restorable
  applyTheme(); applyLang(); bind(); refresh(); showBench();
  const shareObj = (location.hash.includes('#c=') || location.hash.includes('cfg=1')) ? (() => { try { return decodeShare(location.hash); } catch { return null; } })() : null;
  if (shareObj) {
    // gate: a share link replaces the current draft — don't lose unsaved work silently
    guardUnsaved(() => { try { importConfig(shareObj, { share: true }); toast(lang === 'en' ? 'Config loaded from link' : 'Config chargée depuis le lien'); } catch { /* ignore */ } });
  } else {
    maybeWelcome();
    schedulePriceRefresh(2500); // refresh stored prices shortly after (draft restored)
  }
  maybeConsentBar();
})();
