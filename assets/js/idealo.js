/* ConfigMaker — Idealo listing fetcher.
   Source: idealo.fr pages via Jina Reader (anonymous, ~20 req/min shared).
   Cached 6h in localStorage. list() resolves {items,next,cached} or {error}.
   Handles 3 layouts: linked cards (search), unlinked blocks (categories),
   suggestion links (search fallback). Sort variants via ?sortKey=minPrice|maxPrice. */
'use strict';
const Idealo = (() => {
  const READER = 'https://r.jina.ai/';
  const LS_KEY = 'cmv2.idealo';
  const TTL = 6 * 3600 * 1000;
  const GAP_MS = 3000;
  const TIMEOUT_MS = 30000;
  let lastT = 0, chain = Promise.resolve();

  const SORTS = [
    { key: 'rel', param: '' },
    { key: 'asc', param: '?sortKey=minPrice' },
    { key: 'desc', param: '?sortKey=maxPrice' },
  ];
  function sortUrl(base, key) {
    if (!key || key === 'rel') return base;
    const s = SORTS.find(x => x.key === key);
    if (!s) return base;
    return base + (base.includes('?') ? '&' : '?') + s.param.slice(1);
  }

  const cache = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } })();
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); }
    catch {
      try { const ks = Object.keys(cache); if (ks.length) { delete cache[ks[0]]; localStorage.setItem(LS_KEY, JSON.stringify(cache)); } } catch { /* ignore */ }
    }
  }
  /* Drop oldest cached pages, keep newest N (called when storage quota bites). */
  function pruneCache(keep = 3) {
    try {
      const ks = Object.keys(cache).sort((a, b) => ((cache[a] && cache[a].t) || 0) - ((cache[b] && cache[b].t) || 0));
      while (ks.length > keep) { const k = ks.shift(); delete cache[k]; }
      persist();
    } catch { /* ignore */ }
  }

  function parsePrice(s) {
    if (!s) return 0;
    const n = parseFloat(String(s).replace(/[\s]+/g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  function imgProductId(img) {
    let m = String(img || '').match(/\/folder\/Product\/\d+\/\d+\/(\d+)\//);
    if (m) return m[1];
    m = String(img || '').match(/\/images\/product\/(\d+)\//);
    return m ? m[1] : '';
  }
  function imgSlug(img) {
    const m = String(img || '').match(/\/([^/]+)\.(?:jpg|jpeg|png|webp)(?:[?#]|$)/i);
    if (!m) return '';
    const s = m[1].trim();
    return (/[a-zA-Z]/.test(s) && !/^\d+$/.test(s)) ? s : '';
  }
  function listingUrl(img) {
    const id = imgProductId(img);
    if (!id) return '';
    const slug = imgSlug(img);
    return `https://www.idealo.fr/prix/${id}/${slug ? slug + '.html' : ''}`;
  }
  function prettify(s) {
    return String(s || '').split(/[-_\s]+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ').replace(/\s+/g, ' ').trim();
  }
  function cleanSpecs(lines, altName) {
    const out = [];
    for (let ln of lines) {
      ln = ln.trim();
      if (!ln) { if (out.length) break; else continue; }
      if (/^(note\s*∅|détails du produit|d'occasion|n°\d|…|\.\.\.)/i.test(ln)) break;
      if (/^\d+\s+offres?\s*$/i.test(ln)) break;
      if (/^[\d\s]+[.,]\d{2}\s*€\s*$/.test(ln)) break;
      if (/^à partir de\b/i.test(ln)) break;
      if (/^\d+$/.test(ln)) continue;
      if (altName && altName.length > 3) ln = ln.split(altName).join(' ').split(altName.toLowerCase()).join(' ');
      ln = ln.replace(/\s+/g, ' ').trim();
      if (!ln) continue;
      out.push(ln);
      if (out.join(' ').length > 140) break;
    }
    return out.join(' ').replace(/\]\([^)]*\)/g, '').replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  }

  /* Split markdown on product images; parse each following text block. */
  function parseBlocks(md) {
    const items = [];
    const parts = String(md || '').split(/!\[Image \d+: ([^\]]*)\]\(([^)]+)\)/);
    // parts: [pre, alt1, img1, text1, alt2, img2, text2, ...]
    for (let i = 1; i + 2 < parts.length + 1 && i + 1 < parts.length; i += 3) {
      const alt = (parts[i] || '').trim();
      const img = (parts[i + 1] || '').trim();
      const text = parts[i + 2] || '';
      if (!img || !/cdn\.idealo\.com/i.test(img)) continue;
      if (/app_icon|design-system/i.test(img)) continue;
      const id = imgProductId(img);
      if (!id) continue;
      if (items.some(x => x.pid === id)) continue;
      if (/\d+\s+produits\b/i.test(text)) continue; // filter card, not a product
      const lines = text.split('\n');
      let offers = 0, price = 0;
      const mp = text.match(/à partir de\s+([\d\s]+[.,]\d{2})\s*€/i);
      let money = null;
      if (mp) { price = parsePrice(mp[1]); }
      else {
        const all = [...text.matchAll(/([\d\s]+[.,]\d{2})\s*€/g)];
        if (all.length) { money = all[all.length - 1]; price = parsePrice(money[1]); }
      }
      let pre = money ? text.slice(0, money.index) : (mp ? text.slice(0, mp.index) : text);
      const mo = pre.match(/(\d+)\s+offres?\s*$/i);
      if (mo) offers = parseInt(mo[1], 10) || 0;
      if (!price && !offers) continue; // no usable listing data
      const specs = cleanSpecs(lines, alt);
      const slug = imgSlug(img);
      items.push({
        pid: id,
        name: alt || prettify(slug),
        img, specs, offers, price,
        url: `https://www.idealo.fr/prix/${id}/${slug ? slug + '.html' : ''}`,
      });
    }
    return items;
  }

  function cleanBody(b, alt) {
    let s = String(b || ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/\d+\s+Note\s*\u2205\s*\d+\/20/gi, '')
      .replace(/(\d+)\s+offres?\b.*/i, '')
      .replace(/(\d+)\s+à partir de/i, 'à partir de')
      .replace(/à partir de\s+.*/i, '')
      .replace(/[\d\s]+[.,]\d{2}\s*€\s*$/i, '')
      .replace(/\.{3}plus.*/i, '')
      .replace(/\]\([^)]*\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ').trim();
    if (alt && alt.length > 3) s = s.split(alt).join(' ').split(alt.toLowerCase()).join(' ');
    s = s.replace(/\s+/g, ' ').replace(/^[·,;:\-–\s]+/, '').trim();
    return s.slice(0, 160);
  }

  /* Linked cards: [![Image N: ALT](IMG) BODY](https://www.idealo.fr/prix/…) */
  function parseLinked(md) {
    const items = [];
    const re = /\[!\[Image \d+: ([^\]]*)\]\(([^)]+)\)((?:(?!\]\(|\!\[Image)[\s\S])*?)\]\((https:\/\/www\.idealo\.fr\/prix\/[^)\s]+)\)/g;
    let m;
    while ((m = re.exec(md)) !== null) {
      const alt = m[1].trim(), img = m[2].trim(), body = m[3], url = m[4];
      if (items.some(x => x.url === url)) continue;
      const idm = url.match(/\/prix\/(\d+)/);
      const slug = (url.split('?')[0].split('/').filter(Boolean).pop() || '').replace(/\.html?$/i, '');
      let b = body.replace(/\s+/g, ' ').trim();
      let offers = 0, price = 0;
      const mp = b.match(/à partir de\s+([\d\s]+[.,]\d{2})\s*€/i);
      if (mp) price = parsePrice(mp[1]);
      const mo = b.match(/(\d+)\s+offres?\b/i);
      if (mo) offers = parseInt(mo[1], 10) || 0;
      const nm = alt.includes(' ') ? alt : (prettify(slug) || alt);
      items.push({ pid: idm ? idm[1] : '', name: nm, img, specs: cleanBody(body, nm), offers, price, url });
    }
    return items;
  }

  /* Search suggestions: [NAME-dans CAT](https://www.idealo.fr/prix/…) */
  function parseSuggestions(md) {
    const items = [];
    const re = /\[([^\]\n]{2,120})-dans ([^\]\n]{2,60})\]\((https:\/\/www\.idealo\.fr\/prix\/[^)\s]+)[^)]*\)/g;
    let m;
    while ((m = re.exec(md)) !== null) {
      const name = m[1].trim(), cat = m[2].trim(), url = m[3];
      if (/^rech/i.test(name)) continue;
      if (items.some(x => x.url === url)) continue;
      const idm = url.match(/\/prix\/(\d+)/);
      items.push({ pid: idm ? idm[1] : '', name, img: '', specs: cat, offers: 0, price: 0, url });
    }
    return items;
  }

  /* /liste/ pages, product-link variant:
     ![Image N: ALT](IMG) \n\n [NAME](/prix/…) \n\n specs… \n\n N offres \n\n à partir de X € */
  function parseListeProducts(md) {
    const items = [];
    const re = /!\[Image \d+: ([^\]]*)\]\(([^)]+)\)\s*\n\n\[([^\]\n]{2,150})\]\((https:\/\/www\.idealo\.fr\/prix\/[^)\s]+)\)([\s\S]*?)(?=\n!\[Image |\n\[[^\]\n]+\]\(https:\/\/www\.idealo\.fr\/prix\/|$)/g;
    let m;
    while ((m = re.exec(md)) !== null) {
      const alt = m[1].trim(), img = m[2].trim(), name = m[3].trim(), url = m[4], body = m[5] || '';
      if (items.some(x => x.url === url)) continue;
      const idm = url.match(/\/prix\/(\d+)/);
      const b = body.replace(/\s+/g, ' ').trim();
      let offers = 0, price = 0;
      const mp = b.match(/à partir de\s+([\d\s]+[.,]\d{2})\s*€/i);
      if (mp) price = parsePrice(mp[1]);
      const mo = b.match(/(\d+)\s+offres?\b/i);
      if (mo) offers = parseInt(mo[1], 10) || 0;
      const nm = name.includes(' ') ? name : (alt.includes(' ') ? alt : name);
      items.push({ pid: idm ? idm[1] : '', name: nm, img, specs: cleanBody(b, nm), offers, price, url });
    }
    return items;
  }

  /* /liste/ pages, direct-offer variant (no product links).
     Image + optional title line(s), then "Vendu par : SHOP", delivery info,
     shipping ("Frais de port : X €" | "Livraison gratuite"), then "PRICE €TVA…".
     NOTE: the trailing "Nouveau / populaires / Plus de résultats" carousels
     (unrelated products) are cut off by parseMarkdown before calling parsers. */
  function cleanVendor(v) {
    return String(v || '').replace(/^(www\.|fr\.)/i, '').trim();
  }
  function parseListeOffers(md) {
    const items = [];
    const re = /!\[Image \d+: ([^\]]{2,250})\]\(([^)]+)\)([\s\S]{0,600}?)\nVendu par\s*:\s*([^\n]+)\s*\n\n([\s\S]*?)(?=\n!\[Image |\s*$)/g;
    let m;
    while ((m = re.exec(md)) !== null) {
      const alt = m[1].trim(), img = m[2].trim(), gap = m[3] || '';
      if (gap.includes('![Image')) continue;
      const vendor = cleanVendor(m[4]);
      const body = m[5] || '';
      const titleLn = gap.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('!['))[0] || '';
      const name = titleLn.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim() || alt;
      if (items.some(x => x.img === img)) continue;
      let delivery = 0;
      if (/Livraison gratuite/i.test(body)) delivery = 0;
      else {
        const dm = body.match(/Frais de port\s*:\s*([\d\s]+[.,]\d{2})\s*€/i);
        if (dm) delivery = parsePrice(dm[1]);
      }
      const all = [...body.matchAll(/([\d\s]+[.,]\d{2})\s*€/g)];
      const price = all.length ? parsePrice(all[all.length - 1][1]) : 0;
      if (!price) continue;
      items.push({ pid: '', name, img, specs: '', offers: 0, price, delivery, vendor, url: '' });
    }
    return items;
  }

  function parseMarkdown(md, baseUrl) {
    md = String(md || '');
    // cut off trailing "new / popular / more results" carousels (unrelated products);
    // pagination discovery below still uses the full document.
    const cutAt = [
      md.search(/^## Ces résultats de recherche.*$/m),
      md.search(/^### Nouveau dans.*$/m),
      md.search(/^### Produits les plus populaires.*$/m),
      md.search(/^### Plus de résultats.*$/m),
    ].filter(i => i > 0);
    const mainMd = cutAt.length ? md.slice(0, Math.min(...cutAt)) : md;
    const linked = parseLinked(mainMd);
    const byPid = {};
    linked.forEach(l => { if (l.pid) byPid[l.pid] = l; });
    const listeP = parseListeProducts(mainMd).filter(x => ![...linked].some(y => y.url === x.url));
    const listePids = new Set(listeP.map(x => x.pid).filter(Boolean));
    const blocks = parseBlocks(mainMd).filter(b => {
      if (b.pid && listePids.has(b.pid)) return false; // cleaner liste version wins
      const l = b.pid && byPid[b.pid];
      if (l && (!l.price || !l.specs)) { // enrich thin linked cards
        if (!l.price && b.price) l.price = b.price;
        if (!l.specs && b.specs) l.specs = b.specs;
        if (!l.offers && b.offers) l.offers = b.offers;
        if (!l.img && b.img) l.img = b.img;
      }
      return !l;
    });
    const listeO = parseListeOffers(mainMd).filter(x => ![...linked, ...blocks, ...listeP].some(y => (y.img && y.img === x.img) || (y.url && x.url && y.url === x.url)));
    listeO.forEach(x => { x.src = baseUrl; });
    const sugg = parseSuggestions(mainMd).filter(s => ![...linked, ...blocks, ...listeP].some(x => x.url === s.url));
    const items = [...linked, ...blocks, ...listeP, ...listeO, ...sugg];
    let next = null;
    const isList = u => /\/cat\/|prechcat|liste\//i.test(u);
    const seen = [];
    const lr = /\[([^\]]{0,40})\]\((https:\/\/www\.idealo\.fr[^)\s]+)\)/g;
    let l;
    while ((l = lr.exec(md)) !== null) seen.push({ txt: l[1].trim(), u: l[2] });
    const fwd = seen.find(x => /^(suivant|next|suiv\.?|»|>)$/i.test(x.txt) && isList(x.u) && x.u !== baseUrl);
    if (fwd) next = fwd.u;
    return { items, next };
  }

  function queued(fn) {
    const p = chain.catch(() => {}).then(fn);
    chain = p.catch(() => {});
    return p;
  }

  async function fetchMd(url) {
    const wait = Math.max(0, GAP_MS - (Date.now() - lastT));
    if (wait) await new Promise(r => setTimeout(r, wait));
    lastT = Date.now();
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(READER + url, { signal: ctl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } finally { clearTimeout(to); }
  }

  /* Normalized attribute comparison for variant filtering ("2.970 MHz" === "2 970 MHz"). */
  function variantNorm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s.,]/g, '');
  }
  /* Read variant-filter attributes from a variant's own datasheet: for each filter
     dimension of the parent page, take the value of the datasheet line starting
     with that label ("Couleur Blanc", "Fréquence du chip boost 3 010 MHz").
     Returns {label: rawValue} (only dimensions found). */
  function matchVariantAttrs(dsText, filters) {
    const out = {};
    const lines = String(dsText || '').split('\n').map(ln => {
      let s = String(ln || '').trim();
      if (/^\|.*\|$/.test(s)) s = s.replace(/^\||\|$/g, '').split('|').map(x => x.trim()).filter(Boolean).join(' ');
      return s.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
    (filters || []).forEach(f => {
      const lab = String(f.label || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
      if (!lab) return;
      for (const ln of lines) {
        const l = ln.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
        if (l === lab || l.startsWith(lab + ' ') || l.startsWith(lab + ':')) {
          const val = ln.slice(f.label.length).replace(/^[\s:|\-–]+/, '').trim().slice(0, 80);
          if (val) out[f.label] = val;
          return;
        }
      }
    });
    return out;
  }

  /* Variants ("## 5 Variantes à partir de 858,00€"): filter dimensions
     (**Label:** + value lines) and model cards, each with its own /prix/ page.
     Returns null when the page has no variant section. */
  function parseVariants(md) {
    md = String(md || '');
    const mh = md.match(/^##\s*(?:(\d+)\s*)?Variantes?\s*:?\s*(?:à partir de\s*([\d\s]+[.,]\d{2})\s*€)?/mi);
    if (!mh) return null;
    const start = mh.index;
    const rest = md.slice(start);
    const mend = rest.search(/\n## (?!.*Variantes)/);
    const sec = mend > 0 ? rest.slice(0, mend) : rest;
    const filters = [];
    const fre = /\*\*(.+?):\*\*/g;
    let fm, lastIdx = -1, lastLabel = null;
    const flush = (label, body) => {
      const vals = body.split('\n').map(s => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim())
        .filter(s => s && !/^(filtrer|toutes?\b)/i.test(s) && !s.startsWith('!') && !s.startsWith('[') && !/à partir de|^\d[\d\s]*[.,]\d{2}\s*€/.test(s));
      if (label && vals.length) filters.push({ label, values: vals.slice(0, 12) });
    };
    while ((fm = fre.exec(sec)) !== null) {
      if (lastLabel !== null) flush(lastLabel, sec.slice(lastIdx, fm.index));
      lastLabel = fm[1].trim(); lastIdx = fm.index + fm[0].length;
    }
    if (lastLabel !== null) {
      const cardStart = sec.slice(lastIdx).search(/!\[/);
      flush(lastLabel, cardStart >= 0 ? sec.slice(lastIdx, lastIdx + cardStart) : sec.slice(lastIdx));
    }
    const items = [];
    const cre = /\[([^\]]+)\]\((https:\/\/www\.idealo\.fr\/prix\/[^)]+)\)\s*\n\s*!\[Image[^:]*: ([^\]]*)\]\(([^)]+)\)[\s\S]{0,600}?à partir de\s*\n?\s*([\d\s]+[.,]\d{2})\s*€/g;
    let cm;
    while ((cm = cre.exec(sec)) !== null && items.length < 12) {
      const name = (cm[1] || cm[3] || '').trim();
      const url = cm[2].trim();
      if (!name || !url) continue;
      if (items.some(it => it.url === url)) continue;
      items.push({ name, url, img: (cm[4] || '').trim(), price: parsePrice(cm[5]) });
    }
    if (!items.length) return null;
    let fromPrice = 0;
    if (mh[2]) fromPrice = parsePrice(mh[2]);
    return { count: parseInt(mh[1], 10) || items.length, fromPrice, filters, items };
  }

  /* Full product fiche from a /prix/ page: the text next to "Aperçu du produit". */
  function parseProduct(md, url) {
    md = String(md || '');
    const out = { name: '', img: '', specs: '', offers: 0, price: 0, url };
    const mh = md.match(/^# (.+)$/m) || md.match(/^Title: (.+?)(?: au meilleur prix| [|│]|\s*$)/m);
    if (mh) out.name = mh[1].trim();
    const mi = md.match(/!\[[^\]]*\]\((https:\/\/cdn\.idealo\.com\/[^)]*produktbild_gross[^)]*)\)/i)
      || md.match(/!\[[^\]]*\]\((https:\/\/cdn\.idealo\.com\/[^)]*produktbild_mittelgross[^)]*)\)/i);
    if (mi) out.img = mi[1];
    const mp = md.match(/à partir de\s*([\d\s]+[.,]\d{2})\s*€/i);
    if (mp) out.price = parsePrice(mp[1]);
    const mo = md.match(/Comparez\s*(\d+)\s*offres/i) || md.match(/(\d+)\s+offres?\b/i);
    if (mo) out.offers = parseInt(mo[1].replace(/\s/g, ''), 10) || 0;
    let sec = '';
    const ma = md.match(/Aperçu du produit\s*:?\s*([\s\S]*?)(?:\[Détails du produit\]|## |\*\*Produits similaires)/);
    if (ma) sec = ma[1];
    else {
      const md2 = md.match(/## Détails du produit\s*([\s\S]*?)(?:## |\n\*   )/);
      if (md2) sec = md2[1];
    }
    const lines = sec.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .split(/\n| {2,}/).map(s => s.replace(/^[\*_\-–:·\s]+/, '').trim())
      .filter(s => s && !/^(variante|neuf\b|d'occasion)/i.test(s));
    out.specs = lines.slice(0, 40).join('\n');
    /* Raw "## Détails du produit" datasheet section (source of truth for Compat). */
    const mds = md.match(/## Détails du produit\s*([\s\S]*?)(?:\n## |\n\*\*Produits similaires|\n\*   \[)/);
    if (mds) out.datasheet = mds[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').trim().slice(0, 30000);
    out.variants = parseVariants(md);
    return out;
  }

  async function cachedMd(url, force) {
    if (!force) {
      const c = cache[url];
      if (c && (Date.now() - c.t) < TTL && c.md) return { md: c.md, cached: true };
    }
    const md = await queued(() => fetchMd(url));
    if (!md || md.length < 500) throw new Error('empty');
    cache[url] = { t: Date.now(), md: md.slice(0, 400000) };
    persist();
    return { md, cached: false };
  }

  async function list(url) {
    try {
      const { md, cached } = await cachedMd(url);
      const p = parseMarkdown(md, url);
      return { items: p.items, next: p.next, cached };
    } catch (e) {
      return { items: [], next: null, cached: false, error: String((e && e.message) || e) };
    }
  }

  /* Merchant offers from a /prix/ page ("Comparer les prix" table).
     Row: * [TITLE](relocator…) [PRIX€](relocator…) […livraison incl.](…)[Livraison: …]…/marchand/<sid>/<slug>.html… */
  function absUrl(u) {
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/')) return 'https://www.idealo.fr' + u;
    return u;
  }
  function merchantName(slug) {
    return String(slug || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
      .split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : w).join(' ');
  }
  function parseOffers(md) {
    const offers = [];
    const re = /\n\* +\[([^\]\n]{2,200})\]\(((?:https:\/\/www\.idealo\.fr)?\/relocator\/[^)\s]+)\)([\s\S]*?)(?=\n\* +\[|\n## |$)/g;
    let m;
    while ((m = re.exec(md)) !== null) {
      const title = m[1].trim(), relUrl = m[2], body = m[3] || '';
      if (!/relocator/i.test(relUrl)) continue;
      const pm = body.match(/\[([\d\s]+[.,]\d{2})\s*€\]/);
      const price = pm ? parsePrice(pm[1]) : parsePrice((relUrl.match(/[?&]price=([\d.]+)/) || [])[1]);
      if (!price) continue;
      const dm = body.match(/\[([\d\s]+[.,]\d{2})\s*€ livraison incl\.\]/i);
      const delivered = dm ? parsePrice(dm[1]) : 0;
      const mm = body.match(/\/marchand\/(\d+)\/([^/.)\s]+)/);
      let merchant = mm ? merchantName(mm[2]) : '';
      if (!merchant) {
        const tm = body.match(/Marchand:\s*\[([^\]]+)\]/i) || m[0].match(/Marchand:\s*\[([^\]]+)\]/i);
        if (tm) merchant = tm[1].trim();
      }
      const rm = body.match(/\[\*\*([\d,]+)\*\*\]\([^)]*marchand[^)]*\)/);
      const lm = body.match(/\[\*?\s*Livraison:\s*([^\]]+)\]/i);
      const sid = (relUrl.match(/[?&]sid=(\d+)/) || [])[1] || (mm ? mm[1] : '');
      offers.push({
        title, price, delivered, merchant,
        promo: /Code Promo/i.test(body),
        rating: rm ? rm[1] : '',
        delivery: lm ? lm[1].trim() : '',
        sid, url: absUrl(relUrl),
      });
    }
    const seen = new Set();
    return offers.filter(o => {
      const k = o.sid + '|' + o.price + '|' + o.title;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).sort((a, b) => a.price - b.price);
  }

  async function product(url) {
    try {
      let { md } = await cachedMd(url);
      let d = parseProduct(md, url);
      if (!d.specs && !d.price) { // stale/partial render: refetch once, bypassing cache
        md = (await cachedMd(url, true)).md;
        d = parseProduct(md, url);
      }
      if (!d.specs && !d.price) throw new Error('empty');
      return d;
    } catch (e) {
      return { error: String((e && e.message) || e) };
    }
  }

  async function offers(url, force) {
    try {
      let { md, cached } = await cachedMd(url, force);
      let items = parseOffers(md);
      if (!items.length) { // stale/partial render: refetch once, bypassing cache
        md = (await cachedMd(url, true)).md;
        items = parseOffers(md);
        cached = false;
      }
      return { offers: items, cached: !!cached };
    } catch (e) {
      // last chance: one retry (transient 429 / timeout)
      try {
        const { md } = await cachedMd(url, true);
        return { offers: parseOffers(md), cached: false };
      } catch (e2) {
        return { offers: [], error: String((e2 && e2.message) || e2) };
      }
    }
  }

  /* Offer POST tokens from a /liste/ page (raw HTML): each direct offer is a
     <form action=".../ipc/prg" method="POST"> carrying an opaque token that
     redirects straight to the merchant offer. Cached 24h (small map). */
  const PTOK_KEY = 'cmv2.ptokens';
  const PTOK_TTL = 10 * 60 * 1000; // offer tokens may be short-lived: always refetch, cache only dedupes quick repeats
  const ptokCache = (() => { try { return JSON.parse(localStorage.getItem(PTOK_KEY)) || {}; } catch { return {}; } })();
  function ptokPersist() {
    try { localStorage.setItem(PTOK_KEY, JSON.stringify(ptokCache)); }
    catch {
      try { const ks = Object.keys(ptokCache); if (ks.length) { delete ptokCache[ks[0]]; localStorage.setItem(PTOK_KEY, JSON.stringify(ptokCache)); } } catch { /* ignore */ }
    }
  }
  function parseOfferTokens(html) {
    const out = [];
    const re = /<form action="([^"]+)" method="POST"[^>]*><input[^>]*name="value" value="([0-9a-f]+)"[^>]*>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const action = m[1], token = m[2];
      const seg = html.slice(m.index, m.index + 4000);
      const mt = seg.match(/<div class="sr-productSummary__title[^"]*">([^<]+)<\/div>/)
        || seg.match(/<div class="[^"]*productSummary__title[^"]*">([^<]+)<\/div>/);
      const ms = seg.match(/Vendu par\s*:\s*(?:<[^>]+>)?\s*([^<]+?)\s*</);
      out.push({ title: mt ? mt[1].trim() : '', shop: ms ? ms[1].trim() : '', token, action });
    }
    return out;
  }
  function normT(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function matchToken(tokens, title, vendor) {
    const t = normT(title), v = normT(vendor);
    let f = tokens.find(x => normT(x.title) === t && (!v || normT(x.shop) === v));
    if (!f && v) f = tokens.find(x => normT(x.shop) === v && t && normT(x.title).startsWith(t.slice(0, 40)));
    if (!f && t) f = tokens.find(x => normT(x.title).startsWith(t.slice(0, 40)) || (normT(x.title) && t.startsWith(normT(x.title).slice(0, 40))));
    return f || null;
  }
  function peekTokens(listUrl) {
    const c = ptokCache[listUrl];
    if (c && (Date.now() - c.t) < PTOK_TTL && c.map) return c.map;
    return null;
  }
  async function offerTokens(listUrl, force) {
    const c = !force && ptokCache[listUrl];
    if (c && (Date.now() - c.t) < PTOK_TTL && c.map) return { tokens: c.map, cached: true };
    const wait = Math.max(0, GAP_MS - (Date.now() - lastT));
    if (wait) await new Promise(r => setTimeout(r, wait));
    lastT = Date.now();
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), TIMEOUT_MS * 2);
    try {
      const res = await fetch(READER + listUrl, { signal: ctl.signal, headers: { 'X-Respond-With': 'html' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const map = parseOfferTokens(html);
      ptokCache[listUrl] = { t: Date.now(), map };
      ptokPersist();
      return { tokens: map, cached: false };
    } finally { clearTimeout(to); }
  }

  return { list, product, offers, offerTokens, peekTokens, matchToken, parseOfferTokens, parseMarkdown, parseProduct, parseVariants, matchVariantAttrs, variantNorm, parseOffers, sortUrl, pruneCache };
})();
