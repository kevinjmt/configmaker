/* ConfigMaker — moteur "performance brief" (logique pure, pas de DOM).
   Sources :
   - Gaming : formule + tables iobit (snapshot local FpsDb, (c) iObit, credit en UI).
     fps = base * (cpuR*cpuW + gpuR*gpuW*resM*qualM*rtM*upM) * ramM,
     cpuR = cpuPerf/4000, gpuR = gpuPerf/15000.
     Bottleneck d = (cpuR*cpuW)/(gpuR*gpuW*resM) : d<.55 rouge GPU, d<.8
     orange GPU+, d>2 rouge CPU, d>1.4 orange CPU+, sinon equilibre.
   - Daily / Pro : seuils metier fournis par l'utilisateur (voir criteres).
     Chaque critere -> {label, st, detail} ; st in ok|warn|err|unknown.
     Couleur d'une ligne = pire critere (err > warn > unknown > ok).
   - Faits : threads CPU (datasheet cpuThreads > specs "X threads" > inconnu),
     RAM Go (nom), disque principal = 1er stockage (type HDD/SATA/NVMe via nom,
     taille Go du nom), ecran (hauteur resWH).
   - Tiers GPU (series par marque, au plus fidele des seuils "RTX 2xxx / RX 6xxx
     ou equivalent") : NVIDIA GTX10=0 GTX16=1 RTX20=2 RTX30=3 RTX40=4 RTX50=5 ;
     AMD RX500/Vega=0 RX5000=1 RX6000=2 RX7000=3 RX9000=4 ; Intel Arc via perf
     (<=12500 -> 1, <=19000 -> 3, sinon 4). Inconnu -> null (jaune + note).
   Expose pour harness node. */
'use strict';
const Perf = (() => {
  const WORST = { err: 3, warn: 2, unknown: 1, ok: 0 };
  const worstOf = rows => rows.reduce((w, r) => (WORST[r.st] > WORST[w] ? r.st : w), 'ok');
  let LANG = 'fr';
  function setLang(l) { LANG = l === 'en' ? 'en' : 'fr'; }
  const EN = () => LANG === 'en';
  const L = (fr, en) => (EN() ? en : fr);
  const U = () => (EN() ? 'GB' : 'Go');

  /* ---------- faits ---------- */
  function threadsFromDatasheet(md) {
    // lignes "label : valeur" du #datasheet (ex. "Nombre de threads : 16")
    const m = String(md || '').match(/threads?\s*(?:\(HIP\)|:|\||-)?\s*(\d{1,3})/i)
      || String(md || '').match(/nombre de (?:threads|fils)\s*\S*\s*(\d{1,3})/i);
    return m ? +m[1] : null;
  }
  function specsThreads(specs) {
    const m = String(specs || '').match(/(\d+)\s*(?:threads?|fils)/i);
    return m ? +m[1] : null;
  }
  function ramGB(name) {
    const s = String(name || '');
    // kit "2x16GB" : pas d'espace apres le x (sinon "VENTUS 2X 12G" = ventilos + 12 Go).
    let m = s.match(/(\d+)\s*[x×](\d+)\s*g[oob]?\b/i);
    if (m) return (+m[1]) * (+m[2]);
    m = s.match(/(\d+)\s*g[oob]?\b/i);
    return m ? +m[1] : null;
  }
  function diskGB(name) {
    const s = String(name || '');
    const m = s.match(/(\d+(?:[.,]\d+)?)\s*(tb|to|gb|go)\b/i);
    if (!m) return null;
    const v = parseFloat(m[1].replace(',', '.'));
    return /t/i.test(m[2]) ? Math.round(v * 1000) : Math.round(v);
  }
  /* type disque : nom + datasheet (ex. "Interface : SATA") + slot d'origine.
     ssd1/addMore-ssd = SSD NVMe par defaut (query du slot), hdd = HDD. */
  function diskType(name, ds, slotId) {
    const s = String(name || '') + ' ' + String(ds || '');
    const slot = String(slotId || '');
    if (/hdd|disque dur|hard\s*disk/i.test(s) && !/ssd|nvme|m\.?\s?2/i.test(s)) return 'hdd';
    if (/^hdd/.test(slot)) return 'hdd';
    if (/nvme/i.test(s)) return 'nvme';
    if (/m\.?\s?2|pcie\s*(gen|\d|x)/i.test(s) && !/sata/i.test(s)) return 'nvme';
    if (/sata|2[.,]5\s?(pouces|inch|"|')|samsung 8[67]0|8[67]0\s*(evo|qvo|pro)|mx500|bx500|su6[35]0|su800|a400|kc600|sandisk\s*(ssd\s*plus|ultra)/i.test(s)) return 'sata';
    if (/^ssd/.test(slot)) return 'nvme';
    if (/ssd/i.test(s)) return 'sata'; // SSD sans precision -> prudent : SATA
    return null;
  }
  function screenH(screenP) {
    try {
      if (screenP && screenP.datasheet && typeof Compat !== 'undefined' && Compat.parseDatasheet) {
        const P = Compat.parseDatasheet(screenP.datasheet);
        const wh = P.maxResWH || P.resWH;
        if (wh && wh.h) return wh.h;
      }
    } catch { /* ignore */ }
    const s = String((screenP && screenP.name) || '');
    if (/4k|uhd|2160/i.test(s)) return 2160;
    if (/1440|qhd|\b2k\b/i.test(s)) return 1440;
    if (/1080|fhd/i.test(s)) return 1080;
    if (/720|hd(?!\D)/i.test(s)) return 720;
    return null;
  }
  /* rang GPU : voir entete */
  function gpuRank(name, perf) {
    const s = String(name || '').toUpperCase();
    let m = s.match(/RTX\s*(\d)/);
    if (m) return { rtx: 1, gen: +m[1] };
    m = s.match(/GTX\s*1(\d)/);
    if (m) return { gtx: 1, gen: m[1] === '6' ? 1 : 0 };
    m = s.match(/RX\s*(\d)(\d{2,3})/);
    if (m) {
      const d = m[1], rest = m[2];
      if (rest.length === 2) return { rx: 1, gen: 0 }; // RX 5xx
      if (d === '5') return { rx: 1, gen: 1 };
      if (d === '6') return { rx: 1, gen: 2 };
      if (d === '7') return { rx: 1, gen: 3 };
      if (d === '9') return { rx: 1, gen: 4 };
      return { rx: 1, gen: 0 };
    }
    if (/ARC\s*A/i.test(s)) {
      if (perf == null) return null;
      return { arc: 1, gen: perf <= 12500 ? 1 : perf <= 19000 ? 3 : 4 };
    }
    if (/BATTLEMAGE|ARC\s*B/i.test(s)) return { arc: 1, gen: 3 };
    return null;
  }
  /* tier pro : red si generation <= refRed, yellow si <= refYel, sinon green */
  function tierRank(info, refRed, refYel) {
    if (!info) return null;
    const g = info.gen;
    if (info.rtx) { if (g <= refRed) return 'err'; if (g <= refYel) return 'warn'; return 'ok'; }
    if (info.rx) { if (g <= refRed) return 'err'; if (g <= refYel) return 'warn'; return 'ok'; }
    if (info.gtx) return 'err'; // pre-RTX
    if (info.arc) { if (g <= refRed) return 'err'; if (g <= refYel) return 'warn'; return 'ok'; }
    return null;
  }

  /* barres a checkpoints : {val, cuts:[finRouge, finJaune], max, unit, noval}.
     Zones : [0..cuts[0]] rouge, [cuts[0]..cuts[1]] jaune, [cuts[1]..max] vert.
     Le statut (st) reste calcule par les seuils metier (cas speciaux : HDD, SATA). */
  function bar(val, redEnd, yelEnd, o) {
    o = o || {};
    const top = Math.max(typeof val === 'number' ? val : 0, yelEnd);
    return { val, cuts: [redEnd, yelEnd], max: o.max || Math.ceil(top * 1.25), unit: o.unit || '', noval: !!o.noval };
  }

  /* ---------- criteres daily (seuils utilisateur) ---------- */
  function dailyCriteria(f) {
    const rows = [];
    rows.push(f.threads == null
      ? { k: 'threads', st: 'unknown', label: L('Threads CPU inconnus', 'Unknown CPU threads'), detail: L('Indiquez-les dans la fiche CPU (ex : "16 threads")', 'Add them in the CPU entry (e.g. "16 threads")') }
      : f.threads <= 8 ? { k: 'threads', st: 'err', label: `${f.threads} threads`, detail: L('≤ 8 threads : limite pour le multitâche', '≤ 8 threads: limiting for multitasking'), bar: bar(f.threads, 8, 12) }
      : f.threads < 12 ? { k: 'threads', st: 'warn', label: `${f.threads} threads`, detail: L('< 12 threads : correct sans plus', '< 12 threads: passable'), bar: bar(f.threads, 8, 12) }
      : { k: 'threads', st: 'ok', label: `${f.threads} threads`, detail: L('≥ 12 threads : confortable', '≥ 12 threads: comfortable'), bar: bar(f.threads, 8, 12) });
    rows.push(f.ramGB == null
      ? { k: 'ram', st: 'unknown', label: L('RAM inconnue', 'Unknown RAM'), detail: L('Capacité introuvable dans le nom (ex : 32GB)', 'Capacity not found in name (e.g. 32GB)') }
      : f.ramGB <= 12 ? { k: 'ram', st: 'err', label: `${f.ramGB} ${U()} RAM`, detail: L(`≤ 12 ${U()} : juste pour un usage moderne`, `≤ 12 ${U()}: tight for modern use`), bar: bar(f.ramGB, 12, 16, { unit: U() }) }
      : f.ramGB < 16 ? { k: 'ram', st: 'warn', label: `${f.ramGB} ${U()} RAM`, detail: L(`< 16 ${U()} : correct sans plus`, `< 16 ${U()}: passable`), bar: bar(f.ramGB, 12, 16, { unit: U() }) }
      : { k: 'ram', st: 'ok', label: `${f.ramGB} ${U()} RAM`, detail: L(`≥ 16 ${U()} : confortable`, `≥ 16 ${U()}: comfortable`), bar: bar(f.ramGB, 12, 16, { unit: U() }) });
    rows.push(diskRow(f, 128, 250));
    rows.push(f.screenH == null
      ? { k: 'screen', st: 'unknown', label: L('Écran inconnu', 'Unknown display'), detail: L('Résolution introuvable', 'Resolution not found') }
      : f.screenH <= 720 ? { k: 'screen', st: 'err', label: `${L('Écran', 'Display')} ${f.screenH}p`, detail: '≤ 720p', bar: bar(f.screenH, 720, 1080, { unit: 'p' }) }
      : f.screenH < 1080 ? { k: 'screen', st: 'warn', label: `${L('Écran', 'Display')} ${f.screenH}p`, detail: '< 1080p', bar: bar(f.screenH, 720, 1080, { unit: 'p' }) }
      : { k: 'screen', st: 'ok', label: `${L('Écran', 'Display')} ${f.screenH}p`, detail: '≥ 1080p', bar: bar(f.screenH, 720, 1080, { unit: 'p' }) });
    return rows;
  }
  function diskRow(f, redGB, yelGB) {
    if (f.diskType === 'hdd') return { k: 'disk', st: 'err', label: `HDD${f.diskGB ? ` ${f.diskGB} ${U()}` : ''}`, detail: L('Disque dur mécanique en principal : lent', 'Mechanical HDD as main drive: slow'), bar: bar(0, redGB, yelGB, { unit: U() }) };
    if (f.diskType == null || f.diskGB == null)
      return { k: 'disk', st: 'unknown', label: L('Disque principal inconnu', 'Unknown main drive'), detail: L('Type ou capacité introuvable (nom du stockage)', 'Type or capacity not found (storage name)') };
    const t = f.diskType === 'nvme' ? 'NVMe' : 'SATA';
    if (f.diskGB <= redGB) return { k: 'disk', st: 'err', label: `SSD ${t} ${f.diskGB} ${U()}`, detail: L(`≤ ${redGB} ${U()} : trop petit`, `≤ ${redGB} ${U()}: too small`), bar: bar(f.diskGB, redGB, yelGB, { unit: U() }) };
    if (f.diskGB < yelGB) return { k: 'disk', st: 'warn', label: `SSD ${t} ${f.diskGB} ${U()}`, detail: L(`< ${yelGB} ${U()} : un peu juste`, `< ${yelGB} ${U()}: a bit tight`), bar: bar(f.diskGB, redGB, yelGB, { unit: U() }) };
    return { k: 'disk', st: 'ok', label: `SSD ${t} ${f.diskGB} ${U()}`, detail: L(`≥ ${yelGB} ${U()} : confortable`, `≥ ${yelGB} ${U()}: comfortable`), bar: bar(f.diskGB, redGB, yelGB, { unit: U() }) };
  }

  /* ---------- criteres pro (seuils utilisateur) ---------- */
  function proCriteria(f, gRank) {
    const blocks = {};
    // commun CPU/RAM/disque/ecran (variantes seuils)
    const thr = (red, yel) => f.threads == null
      ? { k: 'threads', st: 'unknown', label: L('Threads CPU inconnus', 'Unknown CPU threads'), detail: L('Indiquez-les dans la fiche CPU', 'Add them in the CPU entry') }
      : f.threads <= red ? { k: 'threads', st: 'err', label: `${f.threads} threads`, detail: `≤ ${red} threads`, bar: bar(f.threads, red, yel) }
      : f.threads <= yel ? { k: 'threads', st: 'warn', label: `${f.threads} threads`, detail: L(`≤ ${yel} threads (vert au-delà)`, `≤ ${yel} threads (green above)`), bar: bar(f.threads, red, yel) }
      : { k: 'threads', st: 'ok', label: `${f.threads} threads`, detail: `> ${yel} threads`, bar: bar(f.threads, red, yel) };
    const ram = (red, yel, cmp) => f.ramGB == null
      ? { k: 'ram', st: 'unknown', label: L('RAM inconnue', 'Unknown RAM'), detail: L('Capacité introuvable', 'Capacity not found') }
      : (cmp === 'lt' ? f.ramGB < red : f.ramGB <= red) ? { k: 'ram', st: 'err', label: `${f.ramGB} ${U()} RAM`, detail: `${cmp === 'lt' ? '<' : '≤'} ${red} ${U()}`, bar: bar(f.ramGB, red, yel, { unit: U() }) }
      : (cmp === 'le' ? f.ramGB <= yel : f.ramGB < yel) ? { k: 'ram', st: 'warn', label: `${f.ramGB} ${U()} RAM`, detail: `${cmp === 'le' ? '≤' : '<'} ${yel} ${U()}`, bar: bar(f.ramGB, red, yel, { unit: U() }) }
      : { k: 'ram', st: 'ok', label: `${f.ramGB} ${U()} RAM`, detail: 'OK', bar: bar(f.ramGB, red, yel, { unit: U() }) };
    const diskTW = (redGB, yelGB) => {
      if (f.diskType === 'hdd') return { k: 'disk', st: 'err', label: `HDD${f.diskGB ? ` ${f.diskGB} ${U()}` : ''}`, detail: L('Mécanique en principal', 'Mechanical as main drive'), bar: bar(0, redGB, 2000, { unit: U() }) };
      if (f.diskType == null || f.diskGB == null) return { k: 'disk', st: 'unknown', label: L('Disque inconnu', 'Unknown drive'), detail: L('Type/capacité introuvable', 'Type/capacity not found') };
      if (f.diskGB <= redGB) return { k: 'disk', st: 'err', label: `SSD ${f.diskType === 'nvme' ? 'NVMe' : 'SATA'} ${f.diskGB} ${U()}`, detail: `≤ ${redGB} ${U()}`, bar: bar(f.diskGB, redGB, 2000, { unit: U() }) };
      if (f.diskGB <= yelGB) return { k: 'disk', st: 'warn', label: `SSD ${f.diskType === 'nvme' ? 'NVMe' : 'SATA'} ${f.diskGB} ${U()}`, detail: `≤ ${yelGB} ${U()}`, bar: bar(f.diskGB, redGB, 2000, { unit: U() }) };
      if (f.diskType === 'sata' || f.diskGB < 2000) return { k: 'disk', st: 'warn', label: `SSD ${f.diskType === 'nvme' ? 'NVMe' : 'SATA'} ${f.diskGB} ${U()}`, detail: f.diskType === 'sata' ? L('SATA : plafonné vs NVMe', 'SATA: capped vs NVMe') : '< 2000 Go', bar: bar(f.diskGB, redGB, 2000, { unit: U() }) };
      return { k: 'disk', st: 'ok', label: `SSD NVMe ${f.diskGB} ${U()}`, detail: L('NVMe + capacité OK', 'NVMe + capacity OK'), bar: bar(f.diskGB, redGB, 2000, { unit: U() }) };
    };
    const scr = (redH, yelH, greenCmp) => f.screenH == null
      ? { k: 'screen', st: 'unknown', label: L('Écran inconnu', 'Unknown display'), detail: L('Résolution introuvable', 'Resolution not found') }
      : f.screenH <= redH ? { k: 'screen', st: 'err', label: `${L('Écran', 'Display')} ${f.screenH}p`, detail: `≤ ${redH}p`, bar: bar(f.screenH, redH, yelH, { unit: 'p' }) }
      : f.screenH < yelH ? { k: 'screen', st: 'warn', label: `${L('Écran', 'Display')} ${f.screenH}p`, detail: `< ${yelH}p`, bar: bar(f.screenH, redH, yelH, { unit: 'p' }) }
      : (greenCmp === 'ge' ? f.screenH >= yelH : f.screenH > yelH)
        ? { k: 'screen', st: 'ok', label: `${L('Écran', 'Display')} ${f.screenH}p`, detail: 'OK', bar: bar(f.screenH, redH, yelH, { unit: 'p' }) }
        : { k: 'screen', st: 'warn', label: `${L('Écran', 'Display')} ${f.screenH}p`, detail: L('Limite de palier', 'Tier boundary'), bar: bar(f.screenH, redH, yelH, { unit: 'p' }) };
    const gpu = (refRed, refYel, names) => {
      if (gRank == null) return { k: 'gpu', st: 'unknown', label: L('GPU inconnu', 'Unknown GPU'), detail: L('Modèle non reconnu', 'Model not recognized') };
      const r = tierRank(gRank, refRed, refYel);
      const nm = gRank.rtx ? `RTX ${gRank.gen}xxx` : gRank.rx ? `RX ${['5xx', '5xxx', '6xxx', '7xxx', '9xxx'][gRank.gen] || '?'}` : gRank.gtx ? 'GTX' : 'Arc';
      const b = bar(gRank.gen, refRed, refYel, { max: 5, noval: true });
      if (r === 'err') return { k: 'gpu', st: 'err', label: `GPU ${nm}`, detail: L(`En dessous de ${names} (ou équivalent)`, `Below ${names} (or equivalent)`), bar: b };
      if (r === 'warn') return { k: 'gpu', st: 'warn', label: `GPU ${nm}`, detail: L(`En dessous de ${names} (ou équivalent)`, `Below ${names} (or equivalent)`), bar: b };
      return { k: 'gpu', st: 'ok', label: `GPU ${nm}`, detail: L('Palier OK', 'Tier OK'), bar: b };
    };
    // Adobe / DaVinci / Blender : red ≤12T, ≤16Go, <2xxx/6xxx, HDD, ≤500Go, ≤1080p
    //   yellow <16T, <32Go, <3xxx/7xxx, SATA, ≤1000Go, <1440p ; green >16T, ≥32Go, >4xxx/9xxx, NVMe, ≥2000Go, >1440p
    blocks.video = [
      thr(12, 16),
      ram(16, 32, 'le'),
      gpu(2, 3, 'RTX 3xxx / RX 7xxx'),
      diskTW(500, 1000),
      scr(1080, 1440, 'gt'),
    ];
    // Compilation : red ≤12T, ≤16Go, HDD, ≤500Go, ≤1080p ; yellow <16T, <32Go, SATA, ≤1000Go, <1440p ; green >16T, ≥32Go, NVMe, ≥2000Go, ≥1440p
    blocks.compile = [
      thr(12, 16),
      ram(16, 32, 'lt'),
      diskTW(500, 1000),
      scr(1080, 1440, 'ge'),
    ];
    // IA locale : red ≤12T, <32Go, <16Go VRAM, HDD, ≤1000Go ; yellow <16T, ≤48Go, ≤24Go VRAM, SATA, ≤2000Go ; green >16T, >48Go, >24Go VRAM, NVMe, ≥2000Go
    const vram = f.vramGB;
    const vramRow = vram == null
      ? { k: 'vram', st: 'unknown', label: L('VRAM inconnue', 'Unknown VRAM'), detail: L('Capacité GPU introuvable', 'GPU capacity not found') }
      : vram < 16 ? { k: 'vram', st: 'err', label: `${vram} ${U()} VRAM`, detail: L(`< 16 ${U()} : trop juste pour l'IA locale`, `< 16 ${U()}: too tight for local AI`), bar: bar(vram, 16, 24, { unit: U() }) }
      : vram <= 24 ? { k: 'vram', st: 'warn', label: `${vram} ${U()} VRAM`, detail: L(`≤ 24 ${U()} : modèles moyens uniquement`, `≤ 24 ${U()}: mid-size models only`), bar: bar(vram, 16, 24, { unit: U() }) }
      : { k: 'vram', st: 'ok', label: `${vram} ${U()} VRAM`, detail: L(`> 24 ${U()} : gros modèles OK`, `> 24 ${U()}: large models OK`), bar: bar(vram, 16, 24, { unit: U() }) };
    const ramAI = f.ramGB == null
      ? { k: 'ram', st: 'unknown', label: L('RAM inconnue', 'Unknown RAM'), detail: L('Capacité introuvable', 'Capacity not found') }
      : f.ramGB < 32 ? { k: 'ram', st: 'err', label: `${f.ramGB} ${U()} RAM`, detail: `< 32 ${U()}`, bar: bar(f.ramGB, 32, 48, { unit: U() }) }
      : f.ramGB <= 48 ? { k: 'ram', st: 'warn', label: `${f.ramGB} ${U()} RAM`, detail: `≤ 48 ${U()}`, bar: bar(f.ramGB, 32, 48, { unit: U() }) }
      : { k: 'ram', st: 'ok', label: `${f.ramGB} ${U()} RAM`, detail: `> 48 ${U()}`, bar: bar(f.ramGB, 32, 48, { unit: U() }) };
    const diskAI = (() => {
      if (f.diskType === 'hdd') return { k: 'disk', st: 'err', label: `HDD${f.diskGB ? ` ${f.diskGB} ${U()}` : ''}`, detail: L('Mécanique en principal', 'Mechanical as main drive'), bar: bar(0, 1000, 2000, { unit: U() }) };
      if (f.diskType == null || f.diskGB == null) return { k: 'disk', st: 'unknown', label: L('Disque inconnu', 'Unknown drive'), detail: L('Type/capacité introuvable', 'Type/capacity not found') };
      if (f.diskGB <= 1000) return { k: 'disk', st: 'err', label: `SSD ${f.diskGB} ${U()}`, detail: `≤ 1000 ${U()}`, bar: bar(f.diskGB, 1000, 2000, { unit: U() }) };
      if (f.diskGB < 2000 || f.diskType === 'sata') return { k: 'disk', st: 'warn', label: `SSD ${f.diskType === 'nvme' ? 'NVMe' : 'SATA'} ${f.diskGB} ${U()}`, detail: f.diskType === 'sata' ? L('SATA : plafonné', 'SATA: capped') : '< 2000 Go', bar: bar(f.diskGB, 1000, 2000, { unit: U() }) };
      return { k: 'disk', st: 'ok', label: `SSD NVMe ${f.diskGB} ${U()}`, detail: `≥ 2000 ${U()} NVMe`, bar: bar(f.diskGB, 1000, 2000, { unit: U() }) };
    })();
    blocks.ai = [thr(12, 16), ramAI, vramRow, diskAI];
    return blocks;
  }

  /* ---------- gaming (iobit) ---------- */
  function norm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function matchCpu(name) {
    const n = ' ' + norm(name) + ' ';
    let best = null;
    for (const [key, label] of FpsDb.CPU.map(c => [c[0], c[1]])) {
      void key;
      const l = norm(label);
      const core = l.replace(/^(INTEL CORE |INTEL |AMD RYZEN |AMD )/, '').trim();
      if (core.length >= 4 && n.includes(core)) {
        if (!best || core.length > best.core.length) best = { core, entry: FpsDb.CPU.find(c => c[1] === label) };
      }
    }
    return best ? best.entry : null; // [key, name, perf]
  }
  function matchGpu(name) {
    const n = ' ' + norm(name) + ' ';
    let best = null;
    for (const c of FpsDb.GPU) {
      const l = norm(c[1]);
      const core = l.replace(/^(NVIDIA GEFORCE |AMD RADEON |INTEL ARC )/, '').trim();
      if (core.length >= 6 && n.includes(core)) {
        if (!best || core.length > best.core.length) best = { core, entry: c };
      }
    }
    return best ? best.entry : null; // [key, name, vram, perf]
  }
  function ramMult(ramGB) {
    if (ramGB == null) return 1;
    if (ramGB <= 8) return FpsDb.RAMM[8];
    if (ramGB <= 16) return FpsDb.RAMM[16];
    if (ramGB <= 32) return FpsDb.RAMM[32];
    return FpsDb.RAMM[64];
  }
  function fpsFor(o) {
    // o: {cpuPerf, gpuPerf, game, res, quality, rt, up, ramGB, cap}
    const g = FpsDb.GAMES[o.game];
    if (!g) return null;
    const cpuR = o.cpuPerf / 4000, gpuR = o.gpuPerf / 15000;
    const resM = FpsDb.RES[o.res] || 1;
    const p = (cpuR * g.cpuW + gpuR * g.gpuW * resM * (FpsDb.QUALITY[o.quality] || 1) * (FpsDb.RT[o.rt] || 1) * (FpsDb.UP[o.up] || 1)) * ramMult(o.ramGB);
    let fps = Math.round(g.base * p);
    if (o.cap && o.cap !== 'none') fps = Math.min(fps, +o.cap);
    return fps;
  }
  function bottleneck(o) {
    // o: {cpuPerf, gpuPerf, game, res} -> {side:'cpu'|'gpu'|'none', level:'err'|'warn'|null, d}
    const g = FpsDb.GAMES[o.game];
    if (!g) return { side: 'none', level: null, d: null };
    const cpuR = o.cpuPerf / 4000, gpuR = o.gpuPerf / 15000;
    const resM = FpsDb.RES[o.res] || 1;
    const d = (cpuR * g.cpuW) / (gpuR * g.gpuW * resM);
    if (d < 0.55) return { side: 'gpu', level: 'err', d };
    if (d < 0.8) return { side: 'gpu', level: 'warn', d };
    if (d > 2) return { side: 'cpu', level: 'err', d };
    if (d > 1.4) return { side: 'cpu', level: 'warn', d };
    return { side: 'none', level: null, d };
  }
  function fpsColor(f) { return f == null ? '' : f < 30 ? 'r' : f < 60 ? 'y' : f <= 240 ? 'g' : 'b'; }

  /* ---------- 3DMark Time Spy via Jina (verifie live) ----------
     Autocomplete cpu/gpu -> ids ; buckets search2 (combo / gpu seul /
     cpu seul, preset P) -> medianes overallScore (top runs, biais optimiste).
     Bottleneck : rCpu = combo/gpuSeul (<1 = ce CPU bride ce GPU),
     seuils .85 jaune / .70 rouge. Cache session. */
  const TS_API = 'https://www.3dmark.com/proxycon/ajax/';
  const TS_READER = 'https://r.jina.ai/';
  const tsCache = {};
  function tsClear() { for (const k of Object.keys(tsCache)) delete tsCache[k]; }
  let tsChain = Promise.resolve();
  function tsQueued(fn) { const p = tsChain.catch(() => {}).then(fn); tsChain = p.catch(() => {}); return p; }
  function tryParseJson(txt) {
    // Jina enveloppe les API JSON ("Markdown Content:" + payload).
    // Le payload peut etre un objet {...} ou un tableau [...] : on garde
    // le plus long candidat valide (objet pour les buckets, tableau pour l'autocomplete).
    try { return JSON.parse(txt); } catch { /* enveloppe — voir ci-dessous */ }
    let best = null;
    const spans = [];
    const a1 = txt.indexOf('['), b1 = txt.lastIndexOf(']');
    const a2 = txt.indexOf('{'), b2 = txt.lastIndexOf('}');
    if (a1 >= 0 && b1 > a1) spans.push(txt.slice(a1, b1 + 1));
    if (a2 >= 0 && b2 > a2) spans.push(txt.slice(a2, b2 + 1));
    for (const sp of spans) {
      try {
        const o = JSON.parse(sp);
        if (!best || JSON.stringify(o).length > JSON.stringify(best).length) best = o;
      } catch { /* candidat invalide */ }
    }
    if (best != null) return best;
    throw new Error('bad-json');
  }
  async function tsFetchJson(url) {
    return tsQueued(async () => {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 30000);
      try {
        const res = await fetch(TS_READER + url, { signal: ctl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return tryParseJson(await res.text());
      } finally { clearTimeout(to); }
    });
  }
  function tsMedian(a) {
    const v = (a || []).filter(x => typeof x === 'number' && isFinite(x)).sort((x, y) => x - y);
    if (!v.length) return null;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2);
  }
  function tsToken(name, kind) {
    const s = String(name || '');
    if (kind === 'gpu') {
      const m = s.match(/(rtx|rx|gtx|arc)\s*([a-z]?\d{3,4}[a-z]*(?:\s*(?:ti\s*super|super|ti|xtx|xt))?)/i);
      return m ? (m[1] + ' ' + m[2]).toUpperCase().replace(/\s+/g, ' ') : '';
    }
    let m = s.match(/ryzen\s*\d\s*(\d{4}[a-z0-9]*)/i) || s.match(/(?:i[3579]\s*-?\s*(\d{4,5}[a-z]*)|core\s*ultra\s*\d\s*(\d{3}[a-z]*))/i);
    if (m) return (m[1] || m[2] || '').toUpperCase();
    m = s.match(/(\d{4}[a-z]{0,2})\b/i);
    return m ? m[1].toUpperCase() : '';
  }
  async function tsHwId(kind, name) {
    const q = tsToken(name, kind) || String(name || '').trim();
    if (!q) return null;
    const ck = 'id:' + kind + ':' + q;
    if (tsCache[ck]) return tsCache[ck];
    const j = await tsFetchJson(TS_API + 'search/' + kind + 'name?term=' + encodeURIComponent(q)).catch(() => null);
    // NOTE : l'autocomplete renvoie un tableau nu [...], pas {gpus:...}.
    const arr = Array.isArray(j) ? j : (j && (j.gpus || j.cpus));
    if (!Array.isArray(arr) || !arr.length) return null;
    const core = q.replace(/[^0-9A-Z]/gi, '');
    // Plusieurs variantes contiennent le token ("RTX 4070" ⊂ "RTX 4070 Ti") :
    // on prend le libelle le plus court qui le contient (le modele de base).
    const cands = core ? arr.filter(x => String(x.label || '').replace(/[^0-9A-Z]/gi, '').includes(core)) : [];
    cands.sort((a, b) => String(a.label || '').length - String(b.label || '').length);
    const best = cands[0] || arr[0];
    // NOTE: l'autocomplete renvoie {id, label, value=label} : l'identifiant est `id`.
    const v = { id: best.id != null ? best.id : best.value, label: best.label };
    tsCache[ck] = v;
    return v;
  }
  async function tsBucket(url, cap, pages) {
    const out = [];
    let next = url, n = 0, topUri = null;
    cap = cap || 120; pages = pages || 3;
    while (next && n < pages && out.length < cap) {
      const j = await tsFetchJson(next).catch(() => null);
      if (!j || !Array.isArray(j.results)) break;
      for (const r of j.results) {
        if (r && typeof r.overallScore === 'number') {
          out.push(r.overallScore);
          if (!topUri && r.resultDetailsUri) topUri = String(r.resultDetailsUri).replace(/^http:/, 'https:');
        }
      }
      next = j.nextPageLink ? ('https://www.3dmark.com' + j.nextPageLink) : null;
      n++;
    }
    return { scores: out, topUri };
  }
  async function tsCombo(cpuName, gpuName) {
    const c = await tsHwId('cpu', cpuName), g = await tsHwId('gpu', gpuName);
    if (!c || !g) return { median: null, n: 0, cpu: c, gpu: g };
    const ck = 'combo:' + c.id + ':' + g.id;
    if (tsCache[ck]) return { ...tsCache[ck], cpu: c, gpu: g };
    const bk = await tsBucket(TS_API + 'search2/cpugpu/spy/P/' + c.id + '/' + g.id + '/999999?minScore=0');
    const v = { median: tsMedian(bk.scores), n: bk.scores.length, topUri: bk.topUri };
    tsCache[ck] = v;
    return { ...v, cpu: c, gpu: g };
  }
  async function tsSingle(kind, name) {
    const h = await tsHwId(kind, name);
    if (!h) return { median: null, n: 0, hw: h };
    const ck = kind + ':' + h.id;
    if (tsCache[ck]) return { ...tsCache[ck], hw: h };
    // NOTE : les paniers solo sont au singulier (/search2/gpu|/cpu/), pas gpus/cpus (404).
    const bk = await tsBucket(TS_API + 'search2/' + (kind === 'gpu' ? 'gpu' : 'cpu') + '/spy/P/' + h.id + '/999999?minScore=0', 60, 2);
    const v = { median: tsMedian(bk.scores), n: bk.scores.length };
    tsCache[ck] = v;
    return { ...v, hw: h };
  }
  function tsBottleneck(comboMed, gpuMed, cpuMed) {
    if (!comboMed || !gpuMed || !cpuMed) return { side: 'none', level: null, ratio: null };
    const rCpu = comboMed / gpuMed, rGpu = comboMed / cpuMed;
    if (rCpu < rGpu) {
      if (rCpu < 0.70) return { side: 'cpu', level: 'err', ratio: rCpu };
      if (rCpu < 0.85) return { side: 'cpu', level: 'warn', ratio: rCpu };
      return { side: 'none', level: null, ratio: rCpu };
    }
    if (rGpu < 0.85) return { side: 'gpu', level: 'warn', ratio: rGpu };
    return { side: 'none', level: null, ratio: rGpu };
  }
  /* ---------- Geekbench via Jina (verifie live) : medians single/multi ---------- */
  const gbCache = {};
  function gbClear() { for (const k of Object.keys(gbCache)) delete gbCache[k]; }
  async function gbScores(cpuName) {
    const q = String(cpuName || '').trim();
    if (!q) return { single: null, multi: null, n: 0, version: '?' };
    if (gbCache[q]) return gbCache[q];
    const md = await tsQueued(async () => {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 30000);
      try {
        const res = await fetch(TS_READER + 'https://browser.geekbench.com/search?q=' + encodeURIComponent(q), { signal: ctl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return await res.text();
      } finally { clearTimeout(to); }
    }).catch(() => null);
    const v = { single: null, multi: null, n: 0, version: '?' };
    if (md) {
      const vm = md.match(/Geekbench (\d)/);
      if (vm) v.version = 'V' + vm[1];
      const s1 = [...md.matchAll(/Single-Core Score\s*([\d, \u00a0]+)/gi)].map(m => parseInt(m[1].replace(/[^\d]/g, ''), 10)).filter(x => x > 100 && x < 100000);
      const mu = [...md.matchAll(/Multi-Core Score\s*([\d, \u00a0]+)/gi)].map(m => parseInt(m[1].replace(/[^\d]/g, ''), 10)).filter(x => x > 500 && x < 1000000);
      v.single = tsMedian(s1); v.multi = tsMedian(mu); v.n = Math.min(s1.length, mu.length);
    }
    gbCache[q] = v;
    return v;
  }

  return {
    setLang, worstOf, threadsFromDatasheet, specsThreads, ramGB, diskGB, diskType, screenH, gpuRank, tierRank,
    dailyCriteria, diskRow, proCriteria, matchCpu, matchGpu, ramMult, fpsFor,
    bottleneck, fpsColor, tsCombo, tsSingle, tsBottleneck, tsHwId, tsClear, gbScores, gbClear, tryParseJson,
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Perf;
