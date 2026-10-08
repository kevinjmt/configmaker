/* ConfigMaker v2.0 — vanilla JS, 100% local (localStorage), GitHub Pages friendly.
   Idealo: no public API / scraping blocked (CORS, anti-bot, ToS) -> manual "fiche liée Idealo"
   (URL + quick specs pasted from the Idealo page) + deep links. No "add to cart". */
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
  { id: 'cpu', sec: 'pc', icon: 'fa-solid fa-microchip', q: 'processeur', w: 125 },
  { id: 'mb', sec: 'pc', icon: 'fa-solid fa-circuit-board', q: 'carte mere', w: 70 },
  { id: 'ram', sec: 'pc', icon: 'fa-solid fa-memory', q: 'memoire DDR5', w: 15 },
  { id: 'cooler', sec: 'pc', icon: 'fa-solid fa-fan', q: 'ventirad watercooling', w: 10 },
  { id: 'ssd1', sec: 'pc', icon: 'fa-solid fa-hard-drive', q: 'SSD NVMe', w: 8, addMore: 'ssd' },
  { id: 'gpu', sec: 'pc', icon: 'fa-solid fa-gamepad', q: 'carte graphique', w: 250 },
  { id: 'case', sec: 'pc', icon: 'fa-solid fa-computer', q: 'boitier PC', w: 0 },
  { id: 'psu', sec: 'pc', icon: 'fa-solid fa-plug-circle-bolt', q: 'alimentation PC', w: 0 },
  { id: 'os', sec: 'pc', icon: 'fa-brands fa-windows', q: 'Windows 11 licence', w: 0, addMore: 'pcx' },
  { id: 'desk', sec: 'setup', icon: 'fa-solid fa-table', q: 'bureau gaming', w: 0 },
  { id: 'chair', sec: 'setup', icon: 'fa-solid fa-chair', q: 'chaise gaming', w: 0 },
  { id: 'screen1', sec: 'setup', icon: 'fa-solid fa-tv', q: 'ecran PC', w: 45, addMore: 'screen' },
  { id: 'keyboard', sec: 'setup', icon: 'fa-solid fa-keyboard', q: 'clavier', w: 3 },
  { id: 'mouse', sec: 'setup', icon: 'fa-solid fa-computer-mouse', q: 'souris', w: 2 },
  { id: 'pad', sec: 'setup', icon: 'fa-solid fa-tablet-button', q: 'tapis de souris XXL', w: 0 },
  { id: 'headset', sec: 'setup', icon: 'fa-solid fa-headset', q: 'casque gaming', w: 3 },
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
    'hero.load': 'Charger', 'hero.save': 'Sauver', 'hero.history': 'Historique', 'hero.share': 'Partager', 'hero.export': 'Exporter', 'hero.bench': 'Benchmarks',
    'tabs.config': 'Config', 'tabs.bench': 'Benchmarks', 'tabs.prices': 'Prix',
    'picker.search': 'Rechercher une référence…', 'picker.new': 'Nouvelle fiche',
    'picker.hint': "Idealo n'offre pas d'API publique : collez l'URL de la page Idealo + les specs affichées en haut de la fiche, l'app suit prix, remises et livraison.",
    'sum.desc': 'Description', 'sum.charts': 'Graphiques', 'sum.power': 'Conso.', 'sum.fold': 'Résumé', 'sum.powerTitle': 'Consommation (W)',
    'bench.title': 'Benchmarks YouTube', 'bench.open': 'Voir sur YouTube', 'bench.copy': 'Copier la recherche',
    'prices.title': 'Historique des prix', 'prices.total': 'Total config', 'prices.per': 'Par composant', 'prices.hint': 'Un point est ajouté à chaque sauvegarde. Le budget est affiché en ligne pointillée.',
    'dl.title': "Fichiers Excel d'origine", 'footer.tag': 'Prix Idealo, consommation, manuels — 100 % local, sans panier.',
  },
  en: {
    'nav.exportAll': 'Export data', 'nav.install': 'Install',
    'hero.configName': 'Config name', 'hero.budget': 'Budget (€)',
    'hero.load': 'Load', 'hero.save': 'Save', 'hero.history': 'History', 'hero.share': 'Share', 'hero.export': 'Export', 'hero.bench': 'Benchmarks',
    'tabs.config': 'Config', 'tabs.bench': 'Benchmarks', 'tabs.prices': 'Prices',
    'picker.search': 'Search a reference…', 'picker.new': 'New entry',
    'picker.hint': 'Idealo offers no public API: paste the Idealo page URL + the quick specs shown at the top of the listing; the app tracks price, discounts and delivery.',
    'sum.desc': 'Summary', 'sum.charts': 'Charts', 'sum.power': 'Power', 'sum.fold': 'Summary', 'sum.powerTitle': 'Power draw (W)',
    'bench.title': 'YouTube benchmarks', 'bench.open': 'Open on YouTube', 'bench.copy': 'Copy search',
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
let activeSlot = null, pickerFilter = '', phMode = 'total', sumTab = 'desc';
let prefs = load(LS.prefs, {});
function persist() { save(LS.state, state); }

/* ---------- Helpers ---------- */
function defOf(slot) { return SLOT_DEFS.find(d => d.id === slot.defId) || { icon: 'fa-solid fa-box', sec: 'others', q: '' }; }
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
function productQuickSpecs(p) { return String(p.specs || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' · '); }
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
}
function slotCard(id) {
  const s = state.slots[id], d = defOf(s), p = sel(s);
  const el = document.createElement('div');
  el.className = 'slot' + (activeSlot === id ? ' sel' : '');
  const visual = p && p.image ? `<img src="${esc(p.image)}" alt="" onerror="this.remove()">` : `<i class="${d.icon}"></i>`;
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
    <button class="slot-main" data-act="pick">
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
    <div class="slot-alt-tab"><button class="alt-toggle" data-act="alts"><i class="fa-solid fa-layer-group"></i> ${lang === 'en' ? 'Add / compare alternative' : 'Ajouter une alternative'} (${s.products.length}) <i class="fa-solid fa-chevron-down"></i></button>
    <div class="alt-list hidden" data-alts></div></div>` : ''}`;
  el.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    if (b.dataset.act === 'alts') { const l = el.querySelector('[data-alts]'); if (l) l.classList.toggle('hidden'); return; }
    slotAction(id, b.dataset.act);
  }));
  const alts = el.querySelector('[data-alts]');
  if (alts) renderAlts(alts, s);
  return el;
}
function renderAlts(host, s) {
  const cur = sel(s);
  const sorted = [...s.products].sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
  host.innerHTML = sorted.length ? '' : `<p class="hint">${lang === 'en' ? 'No alternatives yet — add fiches from the picker.' : 'Aucune alternative — ajoutez des fiches depuis le sélecteur.'}</p>`;
  sorted.forEach(p => {
    const diff = cur ? (Number(p.price) - Number(cur.price)) * (Number(p.qty) || 1) : 0;
    const cls = !cur || p.id === cur.id ? 'same' : diff > 0 ? 'up' : 'down';
    const lbl = !cur || p.id === cur.id ? (lang === 'en' ? 'current' : 'actuel') : `${diff > 0 ? '+' : ''}${eur(diff)}`;
    const row = document.createElement('div');
    row.className = 'alt-item' + (cur && p.id === cur.id ? ' current' : '');
    row.innerHTML = `<span><strong>${esc(p.name)}</strong><br><small style="color:var(--muted)">${esc(p.vendor || '')} · ${eur(p.price)}</small></span><span class="diff ${cls}">${lbl}</span>`;
    row.style.cursor = 'pointer';
    row.onclick = () => { s.selectedId = p.id; persist(); refresh(); };
    host.appendChild(row);
  });
}
function slotAction(id, act) {
  const s = state.slots[id], p = sel(s);
  if (act === 'pick') openPicker(id);
  else if (act === 'manual') { if (p && p.manual) window.open(p.manual, '_blank', 'noopener'); else openProductForm(id, p || null, { focus: 'manual' }); }
  else if (act === 'idealo') { if (p && p.idealo) window.open(p.idealo, '_blank', 'noopener'); else openPicker(id); }
  else if (act === 'store') openProductForm(id, p, { focus: 'store' });
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
function idealoSearchUrl(q) { return 'https://www.idealo.fr/chercher/' + encodeURIComponent(q || ''); }
function openPicker(id) {
  activeSlot = id; pickerFilter = ''; $('#pickerSearch').value = '';
  $('#pickerPanel').classList.remove('hidden');
  $('#summaryPanel').classList.add('hidden');
  renderSlots(); renderPicker();
  if (window.innerWidth < 960) $('#pickerPanel').scrollIntoView({ behavior: 'smooth' });
}
function closePicker() { activeSlot = null; $('#pickerPanel').classList.add('hidden'); $('#summaryPanel').classList.remove('hidden'); renderSlots(); }
function renderPicker() {
  const s = state.slots[activeSlot]; if (!s) return;
  const d = defOf(s);
  $('#pickerTitle').textContent = slotName(activeSlot);
  $('#pickerIdealoSearch').href = idealoSearchUrl((sel(s) && sel(s).name) || slotName(activeSlot) || d.q);
  const cur = sel(s);
  const list = s.products.filter(p => (p.name + ' ' + p.vendor).toLowerCase().includes(pickerFilter.toLowerCase()));
  const host = $('#pickerList'); host.innerHTML = '';
  if (!list.length) host.innerHTML = `<p class="hint">${lang === 'en' ? 'No entries yet. Create a fiche from the Idealo page (paste URL, quick specs, price).' : 'Aucune fiche. Créez-en une depuis la page Idealo (URL, specs rapides, prix).'}</p>`;
  list.forEach(p => {
    const diff = cur && cur.id !== p.id ? (Number(p.price) - Number(cur.price)) * (Number(p.qty) || 1) : 0;
    const card = document.createElement('div');
    card.className = 'pick-card' + (cur && cur.id === p.id ? ' current' : '');
    card.innerHTML = `${p.image ? `<img src="${esc(p.image)}" alt="" onerror="this.remove()">` : `<img src="./assets/icons/configmakericon.png" alt="">`}
      <div class="pi"><div class="pn">${esc(p.name)}</div><div class="ps">${esc(productQuickSpecs(p))}</div>
      <div class="ps">${esc(p.vendor || '')} · ${lang === 'en' ? 'incl. delivery' : 'livraison incl.'} ${eur(unitTotal(p))}</div></div>
      <div><div class="pp">${hasDiscount(p) ? `<span class="old" style="text-decoration:line-through;color:var(--muted);font-weight:700;font-size:.78rem">${eur(p.oldPrice)}</span> ` : ''}${eur(p.price)}${hasDiscount(p) ? ` <span class="disc-badge"><i class="fa-solid fa-tag"></i> −${discPct(p)}%</span>` : ''}</div>
      ${cur && cur.id !== p.id ? `<div class="pdiff diff ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'}">${diff > 0 ? '+' : ''}${eur(diff)} ${lang === 'en' ? 'vs current' : 'vs actuel'}</div>` : ''}</div>`;
    const selBtn = document.createElement('button');
    selBtn.className = 'mini-btn'; selBtn.innerHTML = `<i class="fa-solid fa-check"></i> ${lang === 'en' ? 'Select' : 'Choisir'}`;
    selBtn.onclick = () => { s.selectedId = p.id; persist(); refresh(); renderPicker(); toast(lang === 'en' ? 'Selected' : 'Sélectionné'); };
    const editBtn = document.createElement('button');
    editBtn.className = 'mini-btn'; editBtn.innerHTML = `<i class="fa-solid fa-pen"></i>`;
    editBtn.title = lang === 'en' ? 'Edit' : 'Modifier';
    editBtn.onclick = () => openProductForm(activeSlot, p);
    const linkBtn = document.createElement('a');
    linkBtn.className = 'mini-btn'; linkBtn.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i>`;
    linkBtn.title = 'Idealo'; linkBtn.target = '_blank'; linkBtn.rel = 'noopener';
    linkBtn.href = p.idealo || idealoSearchUrl(p.name);
    const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.flexDirection = 'column'; wrap.style.gap = '6px';
    wrap.append(selBtn, editBtn, linkBtn);
    card.appendChild(wrap);
    host.appendChild(card);
  });
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
function showBench() {
  const q = benchQuery();
  $('#benchQuery').innerHTML = `${lang === 'en' ? 'Search:' : 'Recherche :'} <code class="k">${esc(q)}</code>`;
  $('#benchOpen').href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  const variants = [q, `${benchParts().cpu} ${benchParts().gpu} test gaming`, `${benchParts().gpu} thermals noise test`];
  $('#benchGrid').innerHTML = variants.map(v => `<a class="list-row" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(v)}"><i class="fa-brands fa-youtube" style="color:#e03131;font-size:1.4rem"></i><span class="grow"><strong>${esc(v)}</strong><br><small style="color:var(--muted)">youtube.com → ${esc(v)}</small></span><i class="fa-solid fa-arrow-up-right-from-square"></i></a>`).join('');
}
function openBenchPopup() {
  const q = benchQuery();
  openModal((lang === 'en' ? 'Benchmarks — ' : 'Benchmarks — ') + q, `
    <p class="hint">${lang === 'en' ? 'Same configuration search on YouTube:' : 'Recherche de la même configuration sur YouTube :'}</p>
    <p><code class="k">${esc(q)}</code></p>
    <div class="btn-row"><a class="btn btn-primary" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}"><i class="fa-brands fa-youtube"></i> YouTube</a>
    <button class="btn" id="bCopy"><i class="fa-solid fa-copy"></i> ${lang === 'en' ? 'Copy' : 'Copier'}</button></div>`);
  $('#bCopy').onclick = () => { navigator.clipboard?.writeText(q); toast(lang === 'en' ? 'Copied' : 'Copié'); };
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
  refresh(); drawPrices();
  toast((lang === 'en' ? 'Saved — v' : 'Enregistré — v') + state.version);
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
    b.onclick = () => { state = JSON.parse(JSON.stringify(last.snapshot)); persist(); closeModal(); refresh(); toast(lang === 'en' ? 'Loaded' : 'Chargée'); };
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
    state = JSON.parse(JSON.stringify(v.snapshot)); state.name = v.name; persist(); closeModal(); refresh(); toast(lang === 'en' ? 'Restored' : 'Restaurée');
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
  persist(); refresh();
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
  openModal('Changelog — v2.0', `
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
  $('#pickerSearch').addEventListener('input', e => { pickerFilter = e.target.value; renderPicker(); });
  $('#pickerNewBtn').onclick = () => openProductForm(activeSlot, null);
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
  }
  applyTheme(); applyLang(); bind(); refresh(); showBench();
})();
