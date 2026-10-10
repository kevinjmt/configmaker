/* ConfigMaker → PCIe Simulator bridge.
   Builds a share URL (https://pcie-simulator.vercel.app/#cfg=<b64url>) with the
   chosen motherboard, CPU, GPU and SSDs, fuzzy-matched against a baked catalog
   (assets/js/pcie-catalog.js). No network needed. Falls back to the plain URL. */
'use strict';
const PCIe = (() => {
  const BASE = 'https://pcie-simulator.vercel.app/';
  const BRANDS = ['asus', 'msi', 'gigabyte', 'asrock', 'colorful', 'nzxt', 'amd', 'intel', 'nvidia', 'kingston', 'samsung', 'crucial', 'corsair', 'seagate', 'western', 'digital', 'wd', 'lexar', 'sabrent', 'pny', 'patriot', 'adata', 'xpg', 'teamgroup', 'team'];
  const STOP = new Set(['rog', 'tuf', 'strix', 'gaming', 'wifi', 'wifi6e', 'wifi7', 'plus', 'pro', 'd4', 'd5', 'ddr4', 'ddr5', 'atx', 'matx', 'itx', 'eatx', 'ii', 'iii', 'the', 'de', 'la', 'le', 'box', 'boxed', 'tray', 'weng', 'wof', 'mpk', 'oem', 'bulk', 'kit', 'gen4', 'gen5', 'pcie', 'nvme', 'ssd', 'gb', 'to', 'tb', 'go', 'mp600', 'series']);

  function toks(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w && !STOP.has(w) && !BRANDS.includes(w));
  }
  function brandOf(s) {
    const t = String(s || '').toLowerCase();
    return BRANDS.find(b => new RegExp(`(^|[^a-z])${b}([^a-z]|$)`).test(t)) || '';
  }
  function chipOf(s) {
    const m = String(s || '').toLowerCase().match(/[a-z]*\d{3,4}[a-z]*/);
    return m ? m[0] : '';
  }
  function b64url(obj) {
    return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  function matchBoard(mbName) {
    const cats = (typeof PCIECAT !== 'undefined' && PCIECAT.b) || [];
    if (!mbName || !cats.length) return null;
    const chip = chipOf(mbName), brand = brandOf(mbName), tw = toks(mbName);
    let best = null, bestScore = -1;
    for (const b of cats) {
      const bn = b.n, bchip = chipOf(bn);
      if (chip && bchip !== chip) continue;
      let score = (chip && bchip === chip) ? 4 : 0;
      if (brand && brandOf(bn) === brand) score += 3;
      const btw = toks(bn);
      const overlap = tw.filter(w => btw.includes(w)).length;
      score += overlap * 2 - Math.abs(tw.length - btw.length) * 0.2;
      if (score > bestScore) { bestScore = score; best = b; }
    }
    return bestScore >= 3 ? best : null;
  }

  function matchCpu(cpuName, socket) {
    const cats = (typeof PCIECAT !== 'undefined' && PCIECAT.c) || {};
    if (!cpuName) return null;
    const toks = String(cpuName).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
    let model = '';
    for (let i = 0; i < toks.length; i++) {
      if (/^I[3579]$/.test(toks[i]) && /^\d{4,5}[A-Z]*$/.test(toks[i + 1] || '')) { model = `${toks[i]}-${toks[i + 1]}`; break; }
      if (/^\d\d/.test(toks[i]) && toks[i].length >= 4 && /[A-Z0-9]/.test(toks[i])) { model = toks[i]; break; }
    }
    if (!model) return null;
    const flat = model.replace(/[\s-]+/g, '');
    const pools = socket && cats[socket] ? [cats[socket]] : Object.values(cats);
    let best = null;
    for (const pool of pools) {
      for (const c of pool) {
        const cn = String(c.n).toUpperCase().replace(/[\s-]+/g, '');
        if (!cn.includes(flat)) continue;
        const score = flat.length * 2 + (socket ? 5 : 0) - Math.abs(cn.length - flat.length) * 0.1;
        if (!best || score > best.score) best = { id: c.i, score };
      }
    }
    return best ? best.id : null;
  }

  function normDev(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  /* Max sequential read speed in MB/s from name+specs ("7 450 Mo/s", "7450 MB/s", "7,45 Go/s"). */
  function readSpeedMBs(name, specs) {
    const txt = `${name || ''}\n${specs || ''}`;
    let best = 0;
    const re = /(\d+(?:\s?\d{3})*(?:[.,]\d+)?)\s*(Mo\/s|MB\/s|MBs|Go\/s|GB\/s)\b/gi;
    let m;
    while ((m = re.exec(txt)) !== null) {
      let v = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
      if (isNaN(v)) continue;
      if (/^(Go|GB)/i.test(m[2])) v *= 1000;
      if (v > best) best = v;
    }
    return best;
  }
  /* SSD → sim device: exact catalog match first, else generic by speed.
     User rule: >6000 MB/s = Gen5, >=3500 = Gen4, else Gen3. */
  function matchSsd(name, specs) {
    const text = `${name || ''} ${specs || ''}`;
    if (/sata/i.test(text) && !/nvme|m\.2|pci[\s-]?e/i.test(text)) return null; // SATA: not PCIe
    const exact = matchNvme(name);
    if (exact) return { id: exact, generic: false };
    const speed = readSpeedMBs(name, specs);
    const gen = speed <= 0 ? 4 : speed >= 6000 ? 5 : speed >= 3500 ? 4 : 3;
    return { id: gen === 5 ? 'nvme_x4_gen5' : gen === 4 ? 'nvme_x4' : 'nvme_x4_gen3', generic: true, speed };
  }
  function isUsbOnly(name, specs) {
    const text = `${name || ''} ${specs || ''}`;
    return /\busb\b/i.test(text) && !/pci[\s-]?e(xpress)?|\bpcie\b/i.test(text);
  }
  /* Capture card: exact catalog match, else generic PCIe capture (USB ones skipped). */
  function matchCapture(name, specs) {
    if (!name) return null;
    if (isUsbOnly(name, specs)) return null;
    const devs = ((typeof PCIECAT !== 'undefined' && PCIECAT.d) || []).filter(d => d.t === 'capture');
    const tw = normDev(name).split(' ').filter(w => w.length > 1);
    let best = null;
    for (const d of devs) {
      const dn = new Set(normDev(d.n).split(' ').filter(w => w.length > 1));
      const hit = tw.filter(w => [...dn].some(x => x === w || ((x.includes(w) || w.includes(x)) && Math.min(x.length, w.length) >= 4)));
      if (hit.length < 2) continue;
      const score = hit.length * 2;
      if (!best || score > best.score) best = { id: d.i, score };
    }
    if (best) return { id: best.id, generic: false };
    if (/pci[\s-]?e(xpress)?|\bpcie\b/i.test(`${name} ${specs}`)) return { id: 'capture_x4', generic: true };
    return null;
  }
  /* Sound card: PCIe only (USB externals skipped) → generic PCIe x1 sound. */
  function matchSound(name, specs) {
    if (!name) return null;
    if (isUsbOnly(name, specs)) return null;
    if (/pci[\s-]?e(xpress)?|\bpcie\b|\bpci\b/i.test(`${name} ${specs}`)) return { id: 'sound_x1', generic: false };
    return null;
  }
  function matchGpu(gpuName) {
    const devs = ((typeof PCIECAT !== 'undefined' && PCIECAT.d) || []).filter(d => d.t === 'gpu');
    if (!gpuName || !devs.length) return null;
    const t = normDev(gpuName);
    const m = t.match(/\b(rtx|rx|arc)\s*([a-z]?\d{3,4})\s*(ti\s*super|super|ti|xtx|xt)?\b/);
    if (!m) return null;
    const fam = m[1], num = m[2], suf = (m[3] || '').replace(/\s+/g, ' ');
    let best = null;
    for (const d of devs) {
      const dn = normDev(d.n);
      if (!dn.includes(fam) || !dn.includes(num)) continue;
      const dSuf = dn.includes('ti super') ? 'ti super' : dn.includes('super') ? 'super' : dn.includes('ti') ? 'ti' : dn.includes('xtx') ? 'xtx' : dn.includes('xt') ? 'xt' : '';
      if (dSuf !== suf) continue;
      const score = dn.length;
      if (!best || score < best.score) best = { id: d.i, score };
    }
    return best ? best.id : null;
  }

  function matchNvme(ssdName) {
    const devs = ((typeof PCIECAT !== 'undefined' && PCIECAT.d) || []).filter(d => d.t === 'nvme');
    if (!ssdName || !devs.length) return null;
    const tw = normDev(ssdName).split(' ').filter(w => w.length > 1);
    let best = null;
    for (const d of devs) {
      const dn = new Set(normDev(d.n).split(' ').filter(w => w.length > 1));
      const sameish = (a, b) => a === b || ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 4);
      const hit = tw.filter(w => [...dn].some(x => sameish(w, x)));
      if (!hit.length) continue;
      if (hit.length < 2 && !(hit[0].length >= 5 && /\d/.test(hit[0]))) continue;
      const score = hit.length * 2 - Math.abs(dn.size - tw.length) * 0.3 + (hit.length >= 2 ? 3 : 0);
      if (!best || score > best.score) best = { id: d.i, score };
    }
    return best && best.score >= 2 ? best.id : null;
  }

  function selectedProduct(slotId) {
    try {
      const s = (typeof state !== 'undefined' && state.slots) ? state.slots[slotId] : null;
      return (s && s.products.find(p => p.id === s.selectedId)) || null;
    } catch { return null; }
  }
  function productsOf(...defIds) {
    try {
      const out = [];
      for (const id of state.order) {
        const s = state.slots[id];
        if (!s || !defIds.includes(s.defId)) continue;
        const p = s.products.find(x => x.id === s.selectedId);
        if (p && p.name) out.push(p);
      }
      return out;
    } catch { return []; }
  }
  function buildUrl() {
    const missing = [];
    const mb = selectedProduct('mb'), cpu = selectedProduct('cpu'), gpu = selectedProduct('gpu');
    const ssds = productsOf('ssd1');
    const captures = productsOf('capture');
    const sounds = productsOf('soundcard');
    const board = mb && mb.name ? matchBoard(mb.name) : null;
    if (!board) return { url: BASE, matched: {}, missing: ['motherboard'], fallback: true };
    const cpuId = cpu && cpu.name ? matchCpu(cpu.name, board.o) : null;
    if (cpu && cpu.name && !cpuId) missing.push('CPU');
    const gpuId = gpu && gpu.name ? matchGpu(gpu.name) : null;
    if (gpu && gpu.name && !gpuId) missing.push('GPU');
    const comps = {};
    const used = new Set();
    if (gpuId && board.g) { comps[board.g] = gpuId; used.add(board.g); }
    const m2 = board.m || [];
    let mi = 0, ssdCount = 0;
    const ssdTotal = ssds.length;
    for (const p of ssds) {
      const dev = matchSsd(p.name, p.specs);
      if (dev && mi < m2.length) { comps[m2[mi]] = dev.id; mi++; ssdCount++; }
    }
    if (ssdTotal && ssdCount < ssdTotal) missing.push('SSD');
    const xslots = (board.x || []).filter(s => !used.has(s));
    let xi = 0, capCount = 0, sndCount = 0, capTotal = captures.length, sndTotal = sounds.length;
    for (const p of captures) {
      const dev = matchCapture(p.name, p.specs);
      if (dev && xi < xslots.length) { comps[xslots[xi]] = dev.id; xi++; capCount++; }
    }
    for (const p of sounds) {
      const dev = matchSound(p.name, p.specs);
      if (dev && xi < xslots.length) { comps[xslots[xi]] = dev.id; xi++; sndCount++; }
    }
    if (capTotal && !capCount) missing.push('capture');
    if (sndTotal && !sndCount) missing.push('sound');
    const payload = { m: board.k };
    if (cpuId) payload.c = cpuId;
    if (Object.keys(comps).length) payload.s = comps;
    return { url: BASE + '#cfg=' + b64url(payload), matched: { mb: board.n, cpu: cpuId, gpu: gpuId, ssds: ssdCount, captures: capCount, sounds: sndCount }, missing, fallback: false };
  }

  function open() {
    const r = buildUrl();
    try { window.open(r.url, '_blank', 'noopener'); } catch { location.href = r.url; }
    return r;
  }

  return { buildUrl, open, matchBoard, matchCpu, matchGpu, matchNvme, matchSsd, matchCapture, matchSound };
})();
