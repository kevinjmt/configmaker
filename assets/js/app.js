/* ConfigMaker v2.4 — vanilla JS, 100% local (localStorage), GitHub Pages friendly.
   Idealo: native listings via Jina Reader (cached 6h) + manual fiches. No "add to cart". */
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const uid = () => Math.random().toString(36).slice(2, 9);
const LS = { state: 'cmv2.state', configs: 'cmv2.configs', hist: 'cmv2.hist', prefs: 'cmv2.prefs' };
const load = (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const eur = n => (Number(n) || 0).toLocaleString(document.documentElement.lang === 'en' ? 'en-IE' : 'fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
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
  { id: 'ssd1', sec: 'pc', icon: 'lucide:hard-drive', q: 'SSD NVMe', w: 8, addMore: 'ssd' },
  { id: 'gpu', sec: 'pc', icon: 'bi:bi-gpu-card', q: 'carte graphique', w: 250 },
  { id: 'case', sec: 'pc', icon: 'lucide:pc-case', q: 'boitier PC', w: 0 },
  { id: 'psu', sec: 'pc', icon: 'fa-solid fa-plug', q: 'alimentation PC', w: 0 },
  { id: 'os', sec: 'pc', icon: 'fa-brands fa-windows', q: 'Windows 11 licence', w: 0, addMore: 'pcx' },
  { id: 'desk', sec: 'setup', icon: 'ti:ti-desk', q: 'bureau gaming', w: 0 },
  { id: 'chair', sec: 'setup', icon: 'ti:ti-armchair', q: 'chaise gaming', w: 0 },
  { id: 'screen1', sec: 'setup', icon: 'lucide:monitor', q: 'ecran PC', w: 45, addMore: 'screen' },
  { id: 'keyboard', sec: 'setup', icon: 'lucide:keyboard', q: 'clavier', w: 3 },
  { id: 'mouse', sec: 'setup', icon: 'lucide:mouse', q: 'souris', w: 2 },
  { id: 'pad', sec: 'setup', icon: 'lucide:square', q: 'tapis de souris XXL', w: 0 },
  { id: 'headset', sec: 'setup', icon: 'lucide:headset', q: 'casque gaming', w: 3 },
  { id: 'opt1', sec: 'others', icon: 'fa-solid fa-puzzle-piece', q: '', w: 0, addMore: 'opt' },
  { id: 'opt2', sec: 'others', icon: 'fa-solid fa-puzzle-piece', q: '', w: 0 },
  { id: 'opt3', sec: 'others', icon: 'fa-solid fa-puzzle-piece', q: '', w: 0 },
];
const ADD_MORE = { ssd: 'SSD', screen: 'Écran', pcx: 'Composant', opt: 'Option' };

/* ---------- i18n ---------- */
const I18N = {
  fr: {
    'nav.exportAll': 'Export données', 'nav.install': 'Installer',
    'hero.configName': 'Nom de la config', 'hero.budget': 'Budget (€)',
    'hero.new': 'Nouveau', 'hero.load': 'Charger', 'hero.save': 'Sauver', 'hero.history': 'Historique', 'hero.share': 'Partager', 'hero.export': 'Exporter', 'hero.bench': 'Benchmarks',
    'tabs.config': 'Config', 'tabs.bench': 'Benchmarks', 'tabs.prices': 'Prix',
    'picker.search': 'Filtrer mes fiches…', 'picker.new': 'Nouvelle fiche',
    'picker.fiches': 'Mes fiches', 'picker.idealoPh': 'Rechercher sur idealo.fr…', 'picker.filterPh': 'Filtrer les résultats…',
    'picker.urlPh': "Collez l'URL exacte de la fiche /prix/…", 'picker.choose': 'Choisir cette page', 'picker.chooseBtn': 'Choisir',
    'picker.more': 'Charger plus', 'picker.retry': 'Réessayer', 'picker.from': 'à partir de', 'picker.offers': 'offres',
    'picker.sortRel': 'Pertinence', 'picker.sortAsc': 'Prix croissant', 'picker.sortDesc': 'Prix décroissant',
    'picker.loading': 'Chargement des résultats Idealo…', 'picker.cached': 'liste en cache',
    'picker.err': 'Chargement impossible (limite de requêtes ou blocage). Réessayez dans une minute ou ouvrez sur idealo.fr.',
    'alts.see': 'Voir les alternatives',
    'picker.hint': "Listes Idealo chargées dans l'app : choisissez un produit pour pré-remplir sa fiche, ou collez l'URL /prix/ exacte. Listes en cache 6 h.",
    'sum.desc': 'Description', 'sum.charts': 'Graphiques', 'sum.power': 'Conso.', 'sum.fold': 'Résumé', 'sum.powerTitle': 'Consommation (W)',
    'bench.title': 'Benchmarks YouTube', 'bench.open': 'Voir sur YouTube', 'bench.copy': 'Copier la recherche',
    'bench.loading': 'Chargement des vidéos…', 'bench.play': 'Lire',
    'bench.err': 'Vidéos non chargeables pour le moment (limite de requêtes). Utilisez les liens ci-dessous.',
    'prices.title': 'Historique des prix', 'prices.total': 'Total config', 'prices.per': 'Par composant', 'prices.hint': 'Un point est ajouté à chaque sauvegarde. Le budget est affiché en ligne pointillée.',
    'dl.title': "Fichiers Excel d'origine", 'footer.tag': 'Prix Idealo, consommation, manuels — 100 % local, sans panier.',
  },
  en: {
    'nav.exportAll': 'Export data', 'nav.install': 'Install',
    'hero.configName': 'Config name', 'hero.budget': 'Budget (€)',
    'hero.new': 'New', 'hero.load': 'Load', 'hero.save': 'Save', 'hero.history': 'History', 'hero.share': 'Share', 'hero.export': 'Export', 'hero.bench': 'Benchmarks',
    'tabs.config': 'Config', 'tabs.bench': 'Benchmarks', 'tabs.prices': 'Prices',
    'picker.search': 'Filter my entries…', 'picker.new': 'New entry',
    'picker.fiches': 'My entries', 'picker.idealoPh': 'Search on idealo.fr…', 'picker.filterPh': 'Filter results…',
    'picker.urlPh': 'Paste the exact /prix/ listing URL', 'picker.choose': 'Use this page', 'picker.chooseBtn': 'Select',
    'picker.more': 'Load more', 'picker.retry': 'Retry', 'picker.from': 'from', 'picker.offers': 'offers',
    'picker.sortRel': 'Relevance', 'picker.sortAsc': 'Price: low to high', 'picker.sortDesc': 'Price: high to low',
    'picker.loading': 'Loading Idealo results…', 'picker.cached': 'cached list',
    'picker.err': 'Could not load the list (rate limit or block). Retry in a minute or open on idealo.fr.',
    'alts.see': 'See alternatives',
    'picker.hint': 'Idealo listings loaded in-app: pick a product to prefill its fiche, or paste the exact /prix/ URL. Lists cached 6h.',
    'sum.desc': 'Summary', 'sum.charts': 'Charts', 'sum.power': 'Power', 'sum.fold': 'Summary', 'sum.powerTitle': 'Power draw (W)',
    'bench.title': 'YouTube benchmarks', 'bench.open': 'Open on YouTube', 'bench.copy': 'Copy search',
    'bench.loading': 'Loading videos…', 'bench.play': 'Play',
    'bench.err': 'Videos unavailable right now (rate limit). Use the links below.',
    'prices.title': 'Price history', 'prices.total': 'Config total', 'prices.per': 'Per part', 'prices.hint': 'One point is added on each save. Budget is the dotted line.',
    'dl.title': 'Original Excel files', 'footer.tag': 'Idealo prices, power draw, manuals — 100% local, no cart.',
  }
};
const SLOT_NAMES = {
  fr: { cpu: 'Processeur', mb: 'Carte mère', ram: 'RAM', cooler: 'Refroidissement', ssd1: 'SSD', gpu: 'Carte graphique', case: 'Boîtier', psu: 'Alimentation', os: 'OS', desk: 'Bureau', chair: 'Chaise', screen1: 'Écran', keyboard: 'Clavier', mouse: 'Souris', pad: 'Tapis', headset: 'Casque', opt1: 'Option 1', opt2: 'Option 2', opt3: 'Option 3', pc: 'PC', setup: 'Setup', others: 'Autres' },
  en: { cpu: 'CPU', mb: 'Motherboard', ram: 'RAM', cooler: 'Cooling', ssd1: 'SSD', gpu: 'Graphics card', case: 'Case', psu: 'Power supply', os: 'OS', desk: 'Desk', chair: 'Chair', screen1: 'Monitor', keyboard: 'Keyboard', mouse: 'Mouse', pad: 'Mouse pad', headset: 'Headset', opt1: 'Option 1', opt2: 'Option 2', opt3: 'Option 3', pc: 'PC', setup: 'Setup', others: 'Others' },
};
let lang = load(LS.prefs, {}).lang || 'fr';
const t = k => (I18N[lang] && I18N[lang][k]) || I18N.fr[k] || k;
const slotName = id => { const s = state.slots[id]; if (s && s.customLabel) return s.customLabel; return (SLOT_NAMES[lang] && SLOT_NAMES[lang][id]) || (SLOT_NAMES.fr[id]) || id; };
const secName = id => (SLOT_NAMES[lang] && SLOT_NAMES[lang][id]) || SLOT_NAMES.fr[id] || id;

/* ---------- State ---------- */
function blankProduct() { return { id: uid(), name: '', image: '', specs: '', vendor: '', price: 0, oldPrice: 0, delivery: 0, qty: 1, idealo: '', manual: '', store: '', watts: 0, carrier: '', tracking: '', tstatus: '' }; }
function defaultState() {
  const slots = {};
  SLOT_DEFS.forEach(d => { slots[d.id] = { defId: d.id, customLabel: '', products: [], selectedId: null }; });
  return { name: 'Ma Config', budget: 1500, version: '', slots, order: SLOT_DEFS.map(d => d.id) };
}
let state = load(LS.state, null) || defaultState();
if (!state.order) state.order = Object.keys(state.slots);
let activeSlot = null, phMode = 'total', sumTab = 'desc';
const openAlts = new Set();
let prefs = load(LS.prefs, {});
function persist() { save(LS.state, state); }

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
function closeModal() { $('#modalOverlay').classList.add('hidden'); }

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
    const addable = ids.map(id => defOf(state.slots[id]).addMore).find(Boolean);
    if (addable) {
      const b = document.createElement('button');
      b.className = 'add-row-btn';
      b.innerHTML = `<i class="fa-solid fa-plus"></i> ${lang === 'en' ? 'Add' : 'Ajouter'} ${ADD_MORE[addable].toLowerCase()} / ${lang === 'en' ? 'option' : 'option'}`;
      b.onclick = () => addSlot(addable);
      wrap.appendChild(b);
    }
    host.appendChild(wrap);
  });
  updateBenchState();
  refreshIcons();
}
function slotCard(id) {
  const s = state.slots[id], d = defOf(s), p = sel(s);
  const el = document.createElement('div');
  el.className = 'slot' + (activeSlot === id ? ' sel' : '');
  const visual = p && p.image ? `<img src="${esc(p.image)}" alt="" onerror="this.remove()">` : iconHtml(d.icon);
  const title = p ? esc(p.name) : (lang === 'en' ? `Add ${esc(slotName(id))}` : `Ajouter ${esc(slotName(id))}`);
  const specs = p ? esc(productQuickSpecs(p)) : esc(slotName(id));
  let priceHtml = `<div class="slot-price">—</div><div class="slot-vendor">${esc(slotName(id))}</div>`;
  if (p) {
    const old = hasDiscount(p) ? `<span class="old">${eur(p.oldPrice)}</span>` : '';
    const badge = hasDiscount(p) ? `<span class="disc-badge"><i class="fa-solid fa-tag"></i> −${discPct(p)}%</span>` : '';
    priceHtml = `<div class="slot-price">${old}${eur(p.price)}${badge}</div>
      <div class="slot-vendor">${esc(p.vendor || (lang === 'en' ? 'Vendor: —' : 'Vendeur : —'))}</div>
      <div class="slot-deliv">${lang === 'en' ? 'incl. delivery' : 'livraison incl.'} ${eur(unitTotal(p))}</div>`;
  }
  el.innerHTML = `
    <button class="slot-main${p ? '' : ' empty'}" data-act="pick">
      <span class="slot-visual">${visual}</span>
      <span class="slot-info"><span class="slot-type">${esc(slotName(id))}</span><span class-right></span>
        <div class="slot-name">${title}</div><div class="slot-specs">${specs}</div></span>
      <span class="slot-side">${priceHtml}</span>
    </button>
    ${p ? `<div class="slot-actions">
      <button class="mini-btn" data-act="manual" title="${p.manual ? esc(p.manual) : (lang === 'en' ? 'Add manual link' : 'Ajouter le lien du manuel')}"><i class="fa-solid fa-circle-info"></i></button>
      <button class="mini-btn" data-act="idealo" title="Idealo"><i class="fa-solid fa-arrow-up-right-from-square"></i></button>
      <button class="mini-btn" data-act="pick" title="${lang === 'en' ? 'Change part' : 'Changer'}"><i class="fa-solid fa-arrows-rotate"></i></button>
      <button class="mini-btn" data-act="store" title="${lang === 'en' ? 'Change store' : 'Changer de boutique'}"><i class="fa-solid fa-store"></i></button>
      ${d.id === 'mb' || slotName(id).toLowerCase().includes('carte') || slotName(id).toLowerCase().includes('motherboard') ? `<button class="mini-btn" data-act="pcie" title="PCIe Simulator"><i class="fa-solid fa-diagram-project"></i></button>` : ''}
      <button class="mini-btn" data-act="delivery" title="${lang === 'en' ? 'Delivery tracker' : 'Suivi colis'}"><i class="fa-solid fa-truck-fast"></i></button>
      <button class="mini-btn danger" data-act="del" title="${lang === 'en' ? 'Remove' : 'Supprimer'}"><i class="fa-solid fa-trash"></i></button>
    </div>
    ${p.tracking || p.tstatus ? `<div class="delivery-tag"><i class="fa-solid fa-truck-fast"></i> ${esc(p.carrier || '')} ${esc(p.tracking || '')} — ${esc(statusLabel(p.tstatus))}</div>` : ''}
    <div class="slot-alt-tab"><button class="alt-toggle" data-act="alts"><i class="fa-solid fa-layer-group"></i> ${t('alts.see')} (${s.products.length}) <i class="fa-solid fa-chevron-${openAlts.has(id) ? 'up' : 'down'}"></i></button>
    <div class="alt-list${openAlts.has(id) ? '' : ' hidden'}" data-alts></div></div>` : ''}`;
  el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (b.dataset.act === 'alts') { openAlts.has(id) ? openAlts.delete(id) : openAlts.add(id); renderSlots(); return; }
    slotAction(id, b.dataset.act);
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
    row.className = 'alt-item' + (cur && p.id === cur.id ? ' current' : '');
    row.innerHTML = `<span class="grow"><strong>${esc(p.name)}</strong> · ${eur(p.price)}</span><span class="diff ${cls}">${lbl}</span>`;
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
  if (act === 'pick') openPicker(id);
  else if (act === 'manual') { if (p && p.manual) window.open(p.manual, '_blank', 'noopener'); else openProductForm(id, p || null, { focus: 'manual' }); }
  else if (act === 'idealo') { if (p && p.idealo) window.open(p.idealo, '_blank', 'noopener'); else openPicker(id); }
  else if (act === 'store') openMerchants(id);
  else if (act === 'pcie') window.open('https://pcie-simulator.vercel.app/', '_blank', 'noopener');
  else if (act === 'delivery') openDelivery(id);
  else if (act === 'del') { if (confirm(lang === 'en' ? 'Remove selection?' : 'Retirer la sélection ?')) { s.selectedId = null; persist(); refresh(); } }
}
function addSlot(kind) {
  const id = kind + '_' + uid();
  const sec = kind === 'screen' ? 'setup' : kind === 'ssd' ? 'pc' : kind === 'pcx' ? 'pc' : 'others';
  state.slots[id] = { defId: kind === 'screen' ? 'screen1' : kind === 'ssd' ? 'ssd1' : kind === 'pcx' ? 'os' : 'opt1', customLabel: kind === 'opt' ? ((lang === 'en' ? 'Option ' : 'Option ') + (Object.keys(state.slots).length + 1)) : '', products: [], selectedId: null };
  // insert before end of its section
  const ids = state.order.filter(x => defOf(state.slots[x]).sec === sec);
  const last = ids[ids.length - 1];
  state.order.splice(state.order.indexOf(last) + 1, 0, id);
  persist(); refresh(); openPicker(id);
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
];
const SLOT_CAT = { cpu: 'cpu', mb: 'mb', ram: 'ram', cooler: 'cooler', ssd1: 'ssd', gpu: 'gpu', case: 'case', psu: 'psu', os: 'os', desk: 'desk', chair: 'chair', screen1: 'screen', keyboard: 'keyboard', mouse: 'mouse', pad: 'pad', headset: 'headset' };
let currentCatKey = 'root', currentCatLabel = 'Informatique', currentIdealoUrl = IDEALO_CATS[0].url;
let idealBase = '', idealUrl = '', idealPool = [], idealFetched = {}, idealShown = 12, idealNextUrl = null, idealSort = 'rel', idealQ = '', idealBusy = false, idealCached = false, idealErr = '', idealToken = 0;
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
async function loadIdealoList(url, mode = 'fresh') {
  // mode: 'fresh' (new base url) | 'more' (show more / fetch next sort variant)
  const my = ++idealToken;
  if (mode === 'fresh') {
    idealBase = url; idealUrl = url;
    idealPool = []; idealFetched = {}; idealShown = IDEAL_PAGE; idealErr = ''; idealCached = false;
  }
  idealBusy = true; renderIdealo();
  const need = mode === 'fresh' || mode === 'variant' ? [idealSort] : nextVariant();
  if (mode === 'more' && !need.length && idealNextUrl && !idealFetched['next:' + idealNextUrl]) {
    const r2 = await Idealo.list(idealNextUrl);
    if (my !== idealToken) return;
    idealBusy = false;
    if (r2.error) { idealErr = r2.error; }
    else {
      r2.items.forEach(it => { if (it.url && !idealPool.some(x => x.url === it.url)) idealPool.push(it); });
      idealFetched['next:' + idealNextUrl] = true;
      idealNextUrl = r2.next || null;
      if (r2.cached) idealCached = true;
    }
    renderIdealo();
    return;
  }
  for (const v of need) {
    const u = v === 'rel' ? idealBase : Idealo.sortUrl(idealBase, v);
    const r = await Idealo.list(u);
    if (my !== idealToken) return; // stale
    if (r.error) { idealErr = r.error; }
    else {
      r.items.forEach(it => { if (it.url && !idealPool.some(x => x.url === it.url)) idealPool.push(it); });
      idealFetched[v] = true;
      if (r.cached) idealCached = true;
      if (r.next && !idealNextUrl) idealNextUrl = r.next;
    }
  }
  idealBusy = false;
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
  else loadIdealoList(null, 'more');
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
    if (st) st.textContent = `${currentCatLabel} · ${shown.length}/${items.length} ${lang === 'en' ? 'results' : 'résultats'}${idealCached ? ' · ' + t('picker.cached') : ''}`;
  }
  const rw = $('#idealoRetryWrap'); if (rw) rw.style.display = (idealErr && !items.length) ? 'flex' : 'none';
  shown.forEach(it => {
    const card = document.createElement('div');
    card.className = 'pick-card';
    card.innerHTML = `${it.img ? `<img src="${esc(it.img)}" alt="" loading="lazy" onerror="this.remove()">` : `<img src="./assets/icons/configmakericon.png" alt="">`}
      <div class="pi"><div class="pn">${esc(it.name)}</div><div class="ps">${esc(it.specs)}</div>
      <div class="ps">${it.offers ? `${it.offers} ${t('picker.offers')} · ` : ''}${it.price ? `${t('picker.from')} ${eur(it.price)}` : ''}</div></div>
      <div><div class="pp">${it.price ? eur(it.price) : '—'}</div></div>`;
    const choose = document.createElement('button');
    choose.className = 'mini-btn'; choose.innerHTML = `<i class="fa-solid fa-check"></i> ${t('picker.chooseBtn')}`;
    choose.onclick = () => chooseIdealoItem(it);
    const link = document.createElement('a');
    link.className = 'mini-btn'; link.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i>`;
    link.title = 'idealo.fr'; link.target = '_blank'; link.rel = 'noopener'; link.href = it.url;
    const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '6px';
    wrap.append(choose, link);
    card.appendChild(wrap);
    host.appendChild(card);
  });
  const more = $('#idealoMore');
  if (more) {
    const canMore = moreLeft > 0 || (nextVariant().length > 0 && !idealBusy);
    more.classList.toggle('hidden', !canMore);
    const lbl = more.querySelector('span');
    if (lbl) lbl.textContent = moreLeft > 0 ? `${t('picker.more')} (+${Math.min(moreLeft, IDEAL_PAGE)})` : t('picker.more');
  }
}
function chooseIdealoItem(it) {
  if (!activeSlot) return;
  const np = blankProduct();
  np.name = it.name; np.image = it.img; np.idealo = it.url;
  np.price = it.price || 0; np.specs = it.specs; np.vendor = '';
  openProductForm(activeSlot, np);
  // Enrich in background from the /prix/ page ("Aperçu du produit"), only filling untouched fields
  if (!it.url) return;
  const before = { name: np.name, image: np.image, price: String(np.price || ''), specs: np.specs };
  Idealo.product(it.url).then(d => {
    if (!d || d.error) return;
    if (d.specs) np.specs = d.specs;
    if (d.price && !np.price) np.price = d.price;
    if (d.img && !np.image) np.image = d.img;
    if (d.name && !before.name) np.name = d.name;
    if ($('#modalOverlay').classList.contains('hidden')) { persist(); refresh(); return; }
    const fn = $('#f_name'), fi = $('#f_image'), fp = $('#f_price'), fs = $('#f_specs');
    if (!fn || fn.value !== before.name) return; // form closed or switched to another fiche
    let changed = false;
    if (fs && fs.value === before.specs && np.specs !== before.specs) { fs.value = np.specs; changed = true; }
    if (fp && fp.value === before.price && np.price) { fp.value = np.price; changed = true; }
    if (fi && !fi.value.trim() && np.image) { fi.value = np.image; changed = true; }
    if (changed) toast(lang === 'en' ? 'Fiche enriched from Idealo' : 'Fiche enrichie depuis Idealo');
  });
}
function openPicker(id) {
  activeSlot = id;
  const s = state.slots[id], cur = sel(s);
  $('#idealoQuery').value = (cur && cur.name) || slotName(id);
  $('#idealoFilter').value = ''; idealQ = ''; idealSort = 'rel'; $('#idealoSort').value = 'rel';
  const url = (IDEALO_CATS.find(x => x.key === slotCatKey(id)) || IDEALO_CATS[0]).url;
  loadCategory(slotCatKey(id));
  $('#pickerPanel').classList.remove('hidden');
  $('#summaryPanel').classList.add('hidden');
  renderSlots(); renderPicker();
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
  $('#f_save').onclick = () => {
    const v = id => $(id).value.trim();
    p.name = v('#f_name'); if (!p.name) { toast(lang === 'en' ? 'Name required' : 'Nom requis'); return; }
    p.image = v('#f_image'); p.vendor = v('#f_vendor');
    p.price = parseFloat(v('#f_price')) || 0; p.oldPrice = parseFloat(v('#f_old')) || 0;
    p.delivery = parseFloat(v('#f_del')) || 0; p.qty = parseInt(v('#f_qty')) || 1;
    p.watts = parseFloat(v('#f_w')) || 0; p.specs = $('#f_specs').value.trim();
    p.idealo = v('#f_idealo'); p.manual = v('#f_manual'); p.store = v('#f_store');
    const s = state.slots[slotId];
    if (!s.products.find(x => x.id === p.id)) s.products.push(p);
    s.selectedId = p.id;
    persist(); closeModal(); refresh(); renderPicker();
    toast(lang === 'en' ? 'Fiche saved' : 'Fiche enregistrée');
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
  const r = await Idealo.offers(p.idealo);
  if (r.error || !r.offers.length) {
    openModal((lang === 'en' ? 'Merchants — ' : 'Marchands — ') + p.name, `
      <p class="hint">${esc(lang === 'en' ? 'Could not load merchant offers (rate limit or block).' : 'Offres marchandes non chargeables (limite ou blocage).')}</p>
      <div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(p.idealo)}"><i class="fa-solid fa-arrow-up-right-from-square"></i> Idealo</a>
      <button class="btn btn-sm" id="m_manual"><i class="fa-solid fa-pen"></i> ${lang === 'en' ? 'Edit manually' : 'Modifier manuellement'}</button></div>`);
    $('#m_manual').onclick = () => openProductForm(slotId, p, { focus: 'store' });
    return;
  }
  openModal((lang === 'en' ? 'Merchants — ' : 'Marchands — ') + p.name + (r.cached ? ' <small style="color:var(--muted)">· ' + t('picker.cached') + '</small>' : ''), `
    <div id="m_list">${r.offers.map((o, i) => `
      <div class="list-row"><span class="grow"><strong>${esc(o.merchant || (lang === 'en' ? 'Merchant' : 'Marchand'))}</strong>${o.rating ? ` <small style="color:var(--muted)">★ ${esc(o.rating)}</small>` : ''}<br>
      <small style="color:var(--muted)">${esc(o.title).slice(0, 80)}${o.delivery ? ' · ' + esc(o.delivery).slice(0, 60) : ''}</small></span>
      <span style="text-align:right"><strong>${eur(o.price)}</strong>${o.delivered ? `<br><small style="color:var(--muted)">${eur(o.delivered)} ${lang === 'en' ? 'incl. delivery' : 'livr. incl.'}</small>` : ''}<br>
      <button class="mini-btn" data-m="${i}"><i class="fa-solid fa-check"></i> ${lang === 'en' ? 'Select' : 'Choisir'}</button></span></div>`).join('')}</div>
    <div class="btn-row"><button class="btn btn-sm" id="m_manual"><i class="fa-solid fa-pen"></i> ${lang === 'en' ? 'Edit manually' : 'Modifier manuellement'}</button></div>`);
  $$('#modalBody [data-m]').forEach(b => b.onclick = () => {
    const o = r.offers[Number(b.dataset.m)];
    p.vendor = o.merchant || p.vendor;
    p.price = o.price || p.price;
    if (o.delivered > 0) p.delivery = Math.max(0, Math.round((o.delivered - o.price) * 100) / 100);
    p.store = o.url || p.store;
    persist(); closeModal(); refresh();
    toast(lang === 'en' ? 'Merchant selected' : 'Marchand sélectionné');
  });
  $('#m_manual').onclick = () => openProductForm(slotId, p, { focus: 'store' });
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
  ['Desc', 'Charts', 'Power'].forEach(x => $('#sum' + x).classList.toggle('active', x.toLowerCase() === which));
  $('#sumDescPane').classList.toggle('hidden', which !== 'desc');
  $('#sumChartsPane').classList.toggle('hidden', which !== 'charts');
  $('#sumPowerPane').classList.toggle('hidden', which !== 'power');
  if (which !== 'desc') renderSumExtra();
}
function renderSummary() {
  const T = totals();
  const host = $('#sumDescPane'); host.innerHTML = '';
  state.order.forEach(id => {
    const s = state.slots[id], p = sel(s); if (!p) return;
    const row = document.createElement('div');
    row.className = 'sum-line';
    row.innerHTML = `<span class="n">${esc(slotName(id))} — ${esc(p.name)} <small style="color:var(--muted)">×${p.qty || 1}</small></span><span><strong>${eur(unitTotal(p))}</strong></span>`;
    host.appendChild(row);
  });
  if (!host.children.length) host.innerHTML = `<p class="hint">${lang === 'en' ? 'Nothing selected yet — click a component on the left.' : 'Rien de sélectionné — cliquez sur un composant à gauche.'}</p>`;
  const div = document.createElement('div');
  div.className = 'sum-totals';
  div.innerHTML = `<div class="sum-line"><span>${lang === 'en' ? 'Total (excl. delivery details)' : 'Total'} </span><span class="big">${eur(T.total - T.deliv)}</span></div>
    <div class="sum-line"><span>${lang === 'en' ? 'Total incl. delivery' : 'Total livraison incluse'}</span><span class="big">${eur(T.total)}</span></div>
    <div class="sum-line"><span>Budget (${eur(state.budget)})</span><span class="${T.diff >= 0 ? 'badge-ok' : 'badge-ko'}">${T.diff >= 0 ? (lang === 'en' ? 'left' : 'reste') : (lang === 'en' ? 'over' : 'dépassé de')} ${eur(Math.abs(T.diff))}</span></div>`;
  host.appendChild(div);
  if (sumTab !== 'desc') renderSumExtra();
}
function pieSVG(items, size = 150) {
  const total = items.reduce((a, b) => a + b.v, 0) || 1;
  const cols = ['#1a8744', '#2fa968', '#7ed491', '#0ca678', '#94d82d', '#1971c2', '#845ef7', '#e8890c', '#e03131', '#868e96'];
  let a0 = -Math.PI / 2, paths = '';
  items.forEach((it, i) => {
    const a1 = a0 + (it.v / total) * Math.PI * 2;
    const r = size / 2, cx = r, cy = r;
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const big = (a1 - a0) > Math.PI ? 1 : 0;
    if (it.v > 0) paths += `<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${big},1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${cols[i % cols.length]}"/>`;
    a0 = a1;
  });
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img">${paths}<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.22}" fill="var(--surface)"/></svg>`;
}
function renderSumExtra() {
  const T = totals();
  const cols = ['#1a8744', '#2fa968', '#7ed491', '#0ca678', '#94d82d', '#1971c2', '#845ef7', '#e8890c', '#e03131', '#868e96'];
  const secItems = sec => state.order.filter(id => defOf(state.slots[id]).sec === sec).map(id => ({ id, v: slotTotal(state.slots[id]) })).filter(x => x.v > 0);
  const card = (title, items) => {
    const tot = items.reduce((a, b) => a + b.v, 0) || 1;
    return `<div class="chart-card"><h3>${esc(title)} — ${eur(tot)}</h3>${pieSVG(items)}
      <div class="legend">${items.map((it, i) => `<span><i class="dot" style="background:${cols[i % cols.length]}"></i>${esc(slotName(it.id))} (${Math.round(it.v / tot * 100)}%)</span>`).join('')}</div></div>`;
  };
  $('#sumChartsPane').innerHTML = `<div class="charts-row">${card(secName('pc'), secItems('pc'))}${card(secName('setup'), secItems('setup'))}${card(secName('others'), secItems('others'))}</div>`;
  const watts = state.order.filter(id => defOf(state.slots[id]).sec === 'pc').map(id => { const p = sel(state.slots[id]); const w = p ? (Number(p.watts) || 0) * (Number(p.qty) || 1) : 0; return { id, v: w }; }).filter(x => x.v > 0);
  const tot = watts.reduce((a, b) => a + b.v, 0) || 0;
  $('#sumPowerPane').innerHTML = `<h3 style="margin:4px 0">${t('sum.powerTitle')} : <strong>${tot} W</strong></h3>
    <div class="charts-row"><div class="chart-card"><h3>kWh / 4h jour ≈ ${((tot * 4 * 365) / 1000).toFixed(0)} kWh/an</h3>${pieSVG(watts)}
    <div class="legend">${watts.map((x, i) => `<span><i class="dot" style="background:${cols[i % cols.length]}"></i>${esc(slotName(x.id))} — ${x.v} W</span>`).join('') || (lang === 'en' ? 'Add wattage on PC fiches.' : 'Renseignez les watts sur les fiches PC.')}</div></div></div>`;
}

/* ---------- Price history ---------- */
function hist() { return load(LS.hist, {}); }
function pushHistPoint() {
  const T = totals(); const h = hist();
  const k = state.name || 'Ma Config';
  h[k] = h[k] || [];
  h[k].push({ t: Date.now(), total: T.total, deliv: T.total });
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
function updateBenchState() {
  const b = benchParts();
  const ok = !!(b.cpu && b.gpu && b.ram);
  $('#benchBtn').disabled = !ok;
  $('#benchBtn').title = ok ? benchQuery() : (lang === 'en' ? 'Select CPU + GPU + RAM first' : 'Sélectionnez CPU + GPU + RAM d’abord');
}
let benchCacheQ = '', benchBusy = false;
async function showBench() {
  const q = benchQuery();
  $('#benchQuery').innerHTML = `${lang === 'en' ? 'Search:' : 'Recherche :'} <code class="k">${esc(q)}</code>`;
  $('#benchOpen').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const grid = $('#benchGrid');
  const st = $('#benchStatus');
  if (!q || benchParts().cpu === '' && benchParts().gpu === '' && benchParts().ram === '') {
    grid.innerHTML = `<p class="hint">${lang === 'en' ? 'Select CPU + GPU + RAM to load matching benchmark videos.' : 'Sélectionnez CPU + GPU + RAM pour charger les vidéos de benchmark correspondantes.'}</p>`;
    if (st) st.textContent = '';
    return;
  }
  if (q === benchCacheQ && grid.dataset.loaded === '1') return;
  benchCacheQ = q; benchBusy = true;
  grid.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  if (st) st.textContent = t('bench.loading');
  const r = await Tube.search(q);
  benchBusy = false;
  grid.dataset.loaded = '1';
  if (r.error || !r.items.length) {
    if (st) st.textContent = '';
    const variants = [q, `${benchParts().cpu} ${benchParts().gpu} test gaming`, `${benchParts().gpu} thermals noise test`];
    grid.innerHTML = `<p class="hint">${esc(t('bench.err'))}</p>` + variants.map(v => `<a class="list-row" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(v)}"><i class="fa-brands fa-youtube" style="color:#e03131;font-size:1.4rem"></i><span class="grow"><strong>${esc(v)}</strong><br><small style="color:var(--muted)">youtube.com → ${esc(v)}</small></span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`).join('');
    return;
  }
  if (st) st.textContent = `${r.items.length} vidéos${r.cached ? ' · ' + t('picker.cached') : ''}`;
  grid.innerHTML = '';
  r.items.forEach(v => {
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
}
function playVideo(v) {
  openModal(v.title, `
    <div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.id)}" title="${esc(v.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>
    <div class="btn-row"><a class="btn btn-sm" target="_blank" rel="noopener" href="${esc(v.url)}"><i class="fa-brands fa-youtube"></i> ${lang === 'en' ? 'Open on YouTube' : 'Ouvrir sur YouTube'}</a></div>
    <p class="hint">${lang === 'en' ? 'If the player refuses to load, the author disabled embedding — use the YouTube button.' : "Si le lecteur refuse de charger, l'auteur a désactivé l'intégration — utilisez le bouton YouTube."}</p>`);
}
function openBenchPopup() {
  const q = benchQuery();
  openModal((lang === 'en' ? 'Benchmarks — ' : 'Benchmarks — ') + q, `
    <p class="hint">${lang === 'en' ? 'Same configuration search on YouTube:' : 'Recherche de la même configuration sur YouTube :'}</p>
    <p><code class="k">${esc(q)}</code></p>
    <div class="btn-row"><a class="btn btn-primary" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}"><i class="fa-brands fa-youtube"></i> YouTube</a>
    <button class="btn" id="bCopy"><i class="fa-solid fa-copy"></i> ${lang === 'en' ? 'Copy' : 'Copier'}</button></div>
    <div id="bList" style="margin-top:12px"><p class="hint">${t('bench.loading')}</p></div>`);
  $('#bCopy').onclick = () => { navigator.clipboard?.writeText(q); toast(lang === 'en' ? 'Copied' : 'Copié'); };
  Tube.search(q).then(r => {
    const host = $('#bList'); if (!host) return;
    if (!r.items.length) { host.innerHTML = ''; return; }
    host.innerHTML = r.items.slice(0, 6).map(v => `<a class="list-row" href="#" data-vid="${esc(v.id)}"><i class="fa-brands fa-youtube" style="color:#e03131;font-size:1.3rem"></i><span class="grow"><strong>${esc(v.title)}</strong></span><i class="fa-solid fa-play"></i></a>`).join('');
    host.querySelectorAll('[data-vid]').forEach(a => a.onclick = e => {
      e.preventDefault();
      const v = r.items.find(x => x.id === a.dataset.vid);
      if (v) playVideo(v);
    });
  });
}

/* ---------- Save / load / history / share / export ---------- */
function doSave() {
  state.version = stampVersion();
  $('#versionChip').textContent = 'v' + state.version;
  persist(); pushHistPoint();
  const cfgs = load(LS.configs, {});
  cfgs[state.name] = cfgs[state.name] || [];
  cfgs[state.name].push({ version: state.version, savedAt: Date.now(), name: state.name, budget: state.budget, total: totals().total, snapshot: JSON.parse(JSON.stringify(state)) });
  save(LS.configs, cfgs);
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
    b.onclick = () => { state = JSON.parse(JSON.stringify(last.snapshot)); persist(); lastSavedJson = JSON.stringify(state); closeModal(); refresh(); toast(lang === 'en' ? 'Loaded' : 'Chargée'); };
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
    state = JSON.parse(JSON.stringify(v.snapshot)); state.name = v.name; persist(); lastSavedJson = JSON.stringify(state); closeModal(); refresh(); toast(lang === 'en' ? 'Restored' : 'Restaurée');
  });
}
function encodeShare(obj) { return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))); }
function decodeShare(s) {
  const m = String(s).match(/#c=([A-Za-z0-9+/=]+)/) || String(s).match(/[A-Za-z0-9+/=]{40,}/);
  const code = m ? m[1] : s.trim();
  return JSON.parse(decodeURIComponent(escape(atob(code))));
}
function importConfig(obj) {
  if (!obj || !obj.slots) throw new Error('bad');
  state = obj; if (!state.order) state.order = Object.keys(state.slots);
  persist(); lastSavedJson = JSON.stringify(state); refresh();
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
  openModal('Changelog — v2.14', `
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
  $('#configName').value = state.name;
  $('#budgetInput').value = state.budget;
  $('#versionChip').textContent = state.version ? 'v' + state.version : (lang === 'en' ? 'unsaved' : 'non sauvée');
  renderSlots(); renderSummary(); updateBenchState();
  if (!$('#page-prices').classList.contains('hidden')) drawPrices();
}

/* ---------- Events ---------- */
function bind() {
  $('#configName').addEventListener('input', e => { state.name = e.target.value; persist(); });
  $('#budgetInput').addEventListener('input', e => { state.budget = parseFloat(e.target.value) || 0; persist(); renderSummary(); if (!$('#page-prices').classList.contains('hidden')) drawPrices(); });
  $('#saveBtn').onclick = doSave;
  $('#newBtn').onclick = newConfig;
  $('#loadBtn').onclick = openLoad;
  $('#historyBtn').onclick = openHistory;
  $('#shareBtn').onclick = openShare;
  $('#exportBtn').onclick = openExport;
  $('#benchBtn').onclick = openBenchPopup;
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
  $('#summaryFold').onclick = () => $('#summaryBody').classList.toggle('collapsed');
  $('#pickerClose').onclick = closePicker;
  $('#pickerNewBtn').onclick = () => openProductForm(activeSlot, null);
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
  $('#idealoChoose').onclick = () => {
    if (!activeSlot) return;
    const url = $('#idealoUrl').value.trim();
    if (!url || !/idealo\.fr\/prix\//i.test(url)) { toast(lang === 'en' ? 'Paste an exact /prix/ listing URL' : 'Collez une URL exacte de fiche /prix/'); return; }
    const np = blankProduct();
    np.idealo = url;
    try {
      const slug = decodeURIComponent(url.split('?')[0].split('/').filter(Boolean).pop().replace(/\.html?$/i, '').replace(/[-_]+/g, ' ').trim());
      np.name = slug.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
    } catch { np.name = ''; }
    openProductForm(activeSlot, np);
  };
  $('#phTotal').onclick = () => { phMode = 'total'; $('#phTotal').classList.add('active'); $('#phPer').classList.remove('active'); drawPrices(); };
  $('#phPer').onclick = () => { phMode = 'per'; $('#phPer').classList.add('active'); $('#phTotal').classList.remove('active'); drawPrices(); };
  $('#benchCopy').onclick = () => { navigator.clipboard?.writeText(benchQuery()); toast(lang === 'en' ? 'Copied' : 'Copié'); };
  $('#themeBtn').onclick = () => { prefs.theme = prefs.theme === 'light' ? 'dark' : prefs.theme === 'dark' ? 'system' : 'light'; save(LS.prefs, { ...load(LS.prefs, {}), theme: prefs.theme, lang }); applyTheme(); };
  $('#langBtn').onclick = () => { lang = lang === 'fr' ? 'en' : 'fr'; save(LS.prefs, { ...load(LS.prefs, {}), lang, theme: prefs.theme }); applyLang(); refresh(); };
  $('#installBtn').onclick = openInstall;
  $('#modalClose').onclick = closeModal;
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
(function init() {
  prefs = { theme: load(LS.prefs, {}).theme || 'system', lang };
  lang = load(LS.prefs, {}).lang || 'fr';
  // load from share link
  if (location.hash.includes('#c=')) {
    try { importConfig(decodeShare(location.hash)); toast(lang === 'en' ? 'Config loaded from link' : 'Config chargée depuis le lien'); } catch { /* ignore */ }
  } else baselineSaved(); // draft restored as-is; dirty iff different from last save
  window.addEventListener('beforeunload', () => persist()); // belt & braces: draft always restorable
  applyTheme(); applyLang(); bind(); refresh(); showBench();
})();
