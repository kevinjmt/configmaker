/* ConfigMaker — YouTube benchmark search.
   Source: youtube.com search pages via Jina Reader (anonymous, shared quota).
   Thumbnails rebuilt as https://i.ytimg.com/vi/<id>/hqdefault.jpg (no scrape needed).
   Cached 24h in localStorage. search() resolves {items} or {error}. */
'use strict';
const Tube = (() => {
  const READER = 'https://r.jina.ai/';
  const LS_KEY = 'cmv2.yt';
  const TTL = 24 * 3600 * 1000;
  const GAP_MS = 3000;
  const TIMEOUT_MS = 30000;
  let lastT = 0, chain = Promise.resolve();

  const cache = (() => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } })();
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); }
    catch {
      try { const ks = Object.keys(cache); if (ks.length) { delete cache[ks[0]]; localStorage.setItem(LS_KEY, JSON.stringify(cache)); } } catch { /* ignore */ }
    }
  }

  /* Video entries look like: ### [TITLE](https://www.youtube.com/watch?v=ID[&…]) */
  function parseMarkdown(md) {
    const items = [];
    const re = /### \[([^\]]{3,150})\]\((https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})[^)]*)\)/g;
    let m;
    while ((m = re.exec(md)) !== null) {
      const title = m[1].trim(), url = m[2], id = m[3];
      if (/[?&]list=/.test(url)) continue; // skip playlist entries
      if (items.some(x => x.id === id)) continue;
      if (/^home$|^shorts$/i.test(title)) continue;
      items.push({ id, title, url: 'https://www.youtube.com/watch?v=' + id, thumb: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg' });
      if (items.length >= 24) break;
    }
    return items;
  }

  function queued(fn) {
    const p = chain.catch(() => {}).then(fn);
    chain = p.catch(() => {});
    return p;
  }

  async function search(query) {
    const q = String(query || '').trim();
    if (!q) return { items: [] };
    const c = cache[q];
    if (c && (Date.now() - c.t) < TTL && c.items) return { items: c.items, cached: true };
    try {
      const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
      const wait = Math.max(0, GAP_MS - (Date.now() - lastT));
      if (wait) await new Promise(r => setTimeout(r, wait));
      lastT = Date.now();
      const md = await queued(async () => {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), TIMEOUT_MS);
        try {
          const res = await fetch(READER + url, { signal: ctl.signal });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return await res.text();
        } finally { clearTimeout(to); }
      });
      const items = parseMarkdown(md || '');
      cache[q] = { t: Date.now(), items };
      persist();
      return { items, cached: false };
    } catch (e) {
      return { items: [], error: String((e && e.message) || e) };
    }
  }

  return { search, parseMarkdown };
})();
