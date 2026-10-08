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
      if (altName && ln.toLowerCase() === altName.toLowerCase()) continue;
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
      .replace(/à partir de\s+.*/i, '')
      .replace(/\.{3}plus.*/i, '')
      .replace(/\]\([^)]*\)/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/\s+/g, ' ').trim();
    if (alt && s.toLowerCase().startsWith(alt.toLowerCase())) s = s.slice(alt.length).trim();
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

  function parseMarkdown(md, baseUrl) {
    md = String(md || '');
    const linked = parseLinked(md);
    const blocks = parseBlocks(md).filter(b => !linked.some(l => l.pid && l.pid === b.pid));
    const sugg = parseSuggestions(md).filter(s => ![...linked, ...blocks].some(x => x.url === s.url));
    const items = [...linked, ...blocks, ...sugg];
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

  async function list(url) {
    const c = cache[url];
    if (c && (Date.now() - c.t) < TTL && c.md) {
      try { const p = parseMarkdown(c.md, url); return { items: p.items, next: p.next, cached: true }; } catch { /* fall through */ }
    }
    try {
      const md = await queued(() => fetchMd(url));
      if (!md || md.length < 500) throw new Error('empty');
      cache[url] = { t: Date.now(), md: md.slice(0, 400000) };
      persist();
      const p = parseMarkdown(md, url);
      return { items: p.items, next: p.next, cached: false };
    } catch (e) {
      return { items: [], next: null, cached: false, error: String((e && e.message) || e) };
    }
  }

  return { list, parseMarkdown, sortUrl };
})();
