/* ConfigMaker — compatibility checking (100% local, no dependency).
   Layer 1: parseSpecs() extracts structured data from Idealo FR/EN free text.
   Layer 2: check() runs pairwise rules → per-slot bubbles + global issues.
   Statuses: ok (green) | warn (yellow: missing data or degraded) | err (red) | na (grey: counterpart absent). */
'use strict';
const Compat = (() => {
  const OK = 'ok', WARN = 'warn', ERR = 'err', NA = 'na';
  const T = (lang, fr, en) => (lang === 'en' ? en : fr);

  function allNums(s, re) {
    const out = [];
    const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    let m;
    while ((m = rx.exec(String(s || ''))) !== null) out.push(m);
    return out;
  }
  function fnum(s) {
    const m = String(s || '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : 0;
  }

  /* ---------------- Layer 1: spec parsing ---------------- */
  function parse(defId, name, specs) {
    const text = `${name || ''}\n${specs || ''}`;
    const P = { raw: text };
    // sockets
    P.sockets = [...new Set(allNums(text, /\b(AM5|AM4|1700|1851|1200|1151)\b/gi).map(m => m[1].toUpperCase()))];
    // chipset
    const cm = text.match(/\b(B850|B650E?|X870E?|X670E?|B550|X570S?|Z790|Z690|B760|B660|H610|H670|Z590|B560|H510|A520|A320|X470|B450)\b/i);
    P.chipset = cm ? cm[1].toUpperCase() : '';
    // board format (own) — E-ATX before ATX to avoid substring issues
    P.form = '';
    if (/E-?\s?ATX/i.test(text)) P.form = 'EATX';
    else if (/MICRO\s?-?\s?ATX/i.test(text)) P.form = 'MATX';
    else if (/MINI[ -]?ITX/i.test(text)) P.form = 'ITX';
    else if (/\bATX\b/.test(text) && !/ATX12V/i.test(text.replace(/\bATX\b/, ''))) P.form = /ATX12V/.test(text) && !/format|Format|supporté|Supported/i.test(text) ? '' : (/\bATX\b/.test(text) ? 'ATX' : '');
    if (/ATX12V/i.test(text) && !/format|Format|supporté|Supported|tour|Tower|boîtier|Boîtier|Case|case/i.test(text)) P.form = '';
    // case supported formats
    P.caseForms = [];
    if (/E-?\s?ATX/i.test(text)) P.caseForms.push('EATX');
    if (/MICRO\s?-?\s?ATX/i.test(text)) P.caseForms.push('MATX');
    if (/MINI[ -]?ITX/i.test(text)) P.caseForms.push('ITX');
    if (/(supporté|support|Formats?|compatibles?)[^.:\n]{0,60}\bATX\b/i.test(text) || /ATX\s*,\s*(Micro|Mini)/i.test(text)) P.caseForms.push('ATX');
    // DDR type
    const dm = text.match(/DDR\s?([45])\b/i);
    P.ddr = dm ? 'DDR' + dm[1] : '';
    // RAM slots / sticks / speed
    let     m = text.match(/Nombre d['\u2019]emplacements RAM\s*(\d+)|(\d+)\s*(?:emplacements?|slots?)\s*(?:de\s*)?(?:RAM|DIMM|mémoire|memory)/i);
    P.ramSlots = m ? parseInt(m[1] || m[2], 10) : 0;
    m = text.match(/Nombre de modules?\s*(\d+)/i) || text.match(/(\d+)\s*x\s*\d+\s*Go/i);
    P.ramSticks = m ? parseInt(m[1], 10) : 0;
    const speeds = allNums(text, /(\d[\d\s]*)\s*(MT\/s|MHz)/gi).map(x => parseInt(x[1].replace(/\s/g, ''), 10)).filter(x => x > 100);
    P.ramSpeed = speeds.length ? Math.max(...speeds) : 0;
    // PCIe gen/lanes (own device: GPU/SSD)
    P.pcie = allNums(text, /PCIe?\s*(\d)(?:\.0)?\s*x\s*(\d+)/gi).map(x => ({ gen: parseInt(x[1], 10), lanes: parseInt(x[2], 10) }));
    const pg = text.match(/PCI(?:-E|e| Express)?\s*(\d)(?:\.0)?\s*x\s*(\d+)/i);
    P.pcieGen = pg ? parseInt(pg[1], 10) : (P.pcie.length ? Math.max(...P.pcie.map(x => x.gen)) : 0);
    P.pcieLanes = pg ? parseInt(pg[2], 10) : (P.pcie.length ? Math.max(...P.pcie.map(x => x.lanes)) : 0);
    // MB PCIe x16 slot count
    m = text.match(/Nombre de slots PCIe x(\d+)\s*(\d+)/i);
    P.slotX16 = m ? { lanes: parseInt(m[1], 10), count: parseInt(m[2], 10) } : null;
    // M.2 / SATA
    P.m2 = /M\.?\s?2/i.test(text);
    if (!P.m2 && P.chipset) P.m2 = true; // tout chipset moderne embarque du M.2 NVMe
    m = text.match(/(\d+)\s*x\s*M\.?\s?2/i);
    P.m2count = m ? parseInt(m[1], 10) : 0;
    P.sata = /SATA/i.test(text);
    m = text.match(/(\d+)\s*x\s*S-?ATA/i);
    P.sataCount = m ? parseInt(m[1], 10) : 0;
    // dimensions (mm)
    m = text.match(/Longueur max[^\d\n]{0,40}(\d+)\s*mm/i);
    P.caseGpuMax = m ? parseInt(m[1], 10) : 0;
    m = text.match(/Hauteur max[^\d\n]{0,40}(\d+)\s*(?:mm)?(?=[,.\s]|$)/i);
    P.caseCoolerMax = m ? parseInt(m[1], 10) : 0;
    m = text.match(/(?:longueur|length|long)\D{0,20}(\d+)\s*mm/i);
    P.gpuLen = /carte graphique|GPU|graphics card|GeForce|Radeon|Arc /i.test(text) && m ? parseInt(m[1], 10) : 0;
    // TDP
    m = text.match(/TDP\D{0,25}(\d+)\s*(?:watts|W)\b/i);
    P.tdp = m ? parseInt(m[1], 10) : 0;
    // PSU/UPS capacity
    m = text.match(/Puissance continue\D{0,10}(\d+)\s*W/i);
    if (m) P.capW = parseInt(m[1], 10);
    else {
      m = text.match(/(\d+)\s*VA\b/i);
      if (m) P.capW = Math.round(parseInt(m[1], 10) * 0.6);
      else {
        const cands = allNums(text, /(\d{3,4})\s*W\b/g).map(x => parseInt(x[1], 10)).filter(x => x >= 300);
        P.capW = cands.length ? Math.max(...cands) : 0;
      }
    }
    // PSU format
    P.psuFormat = /SFX/i.test(text) ? 'SFX' : (/ATX/i.test(text) ? 'ATX' : '');
    // PSU cables / GPU needs
    const c8 = allNums(text, /(\d+)\s*[x×]\s*8\s*(?:broches|pins?)/gi).map(x => parseInt(x[1], 10));
    const c8b = allNums(text, /(\d+)\s*x\s*PCI-?E\b/gi).map(x => parseInt(x[1], 10));
    P.pcie8 = Math.max(0, ...c8, ...c8b);
    P.hpwr = /12VHPWR/i.test(text);
    // USB backpanel counts
    P.usbC = 0; P.usbA = 0; P.usbUnknown = false;
    const uc = allNums(text, /(\d+)\s*x\s*[^,\n]{0,30}USB[-\s]?C/gi).map(x => parseInt(x[1], 10));
    const ua = allNums(text, /(\d+)\s*x\s*USB(?![-\s]?C)/gi).map(x => parseInt(x[1], 10));
    P.usbC = uc.length ? Math.max(...uc) : (/USB[-\s]?C/i.test(text) ? -1 : 0);
    P.usbA = ua.length ? ua.reduce((a, b) => a + b, 0) : (/USB(?![-\s]?C)/i.test(text) ? -1 : 0);
    if ((/USB/i.test(text)) && P.usbC === 0 && P.usbA === 0) P.usbUnknown = true;
    // LAN speed (GbE)
    m = text.match(/(?:LAN|Ethernet|RJ-?45|réseau|network)[^\d\n]{0,50}(\d+(?:[.,]\d+)?)\s*Gb/i) || text.match(/(\d+(?:[.,]\d+)?)\s*GbE/i);
    P.lan = m ? parseFloat(m[1].replace(',', '.')) : 0;
    // drive bays
    m = text.match(/(\d+)\s*(?:x|×|baies?)\s*2[.,]5/i);
    P.bays25 = m ? parseInt(m[1], 10) : 0;
    m = text.match(/(\d+)\s*(?:x|×|baies?)\s*3[.,]5/i);
    P.bays35 = m ? parseInt(m[1], 10) : 0;
    // fans
    const fz = allNums(text, /(\d{2,3})\s*mm/gi).map(x => parseInt(x[1], 10)).filter(x => x >= 80 && x <= 250);
    P.fanSizes = [...new Set(fz)];
    P.fanSize = P.fanSizes.length ? P.fanSizes[0] : 0;
    // drive kind
    P.isNvme = /NVMe|M\.?\s?2|PCIe/i.test(text);
    P.sataOnly = /SATA/i.test(text) && !P.isNvme;
    const sz = text.match(/22(80|110)\b/);
    P.m2size = sz ? '22' + sz[1] : (P.isNvme ? '2280' : '');
    P.isHdd35 = /3[.,]5\s*(pouces|"|inch)/i.test(text);
    return P;
  }

  function isCaseFan(text) {
    const t = String(text || '');
    if (!/ventilateur|fan/i.test(t)) return false;
    if (/processeur|ventirad|watercooling|AIO|refroidissement liquide|CPU/i.test(t) && !/châssis|chassis|boîtier|boitier|\bPC\b/i.test(t)) return false;
    return /châssis|chassis|boîtier|boitier|\bPC\b|RGB|ARGB|\b120\b|\b140\b|\b200\b|fan/i.test(t);
  }
  function isUsbDevice(text) {
    return /\bUSB\b/i.test(String(text || ''));
  }
  function eraM2gen(sockets, chipset) {
    const c = String(chipset || '').toUpperCase();
    if (/X870|B850/.test(c)) return 5;
    if (/^(AM5)/.test((sockets || [])[0] || '') || /B650|X670|Z790|Z690|B760/.test(c)) return 4;
    if (/AM4|1700|1200/.test((sockets || []).join(',')) || /B550|X570|B560|Z590/.test(c)) return 4;
    return 0;
  }

  /* ---------------- Layer 2: rules engine ---------------- */
  // ctx: {order, slots, sel(id)->product|null, def(id)->def, totals:{watts}, lang}
  function check(ctx) {
    const { order, slots, sel, def, totals, lang } = ctx;
    const L = (fr, en) => (lang === 'en' ? en : fr);
    const prod = id => { const s = slots[id]; return s ? sel(s) : null; };
    const P = {}; // slotId -> {slot, p, parsed, defId}
    order.forEach(id => {
      const s = slots[id]; if (!s) return;
      const p = sel(s); if (!p) return;
      P[id] = { slot: s, p, parsed: parse(s.defId, p.name, p.specs || ''), defId: s.defId, watts: (Number(p.watts) || 0) * (Number(p.qty) || 1), capW: Number(p.capW) || 0 };
    });
    const byDef = want => order.filter(id => P[id] && (Array.isArray(want) ? want.includes(P[id].defId) : P[id].defId === want));
    const checks = {}; const flatIssues = [];
    const add = (slot, key, label, status, tip, level) => {
      (checks[slot] = checks[slot] || []).push({ key, label, status, tip });
      if (level === 'err' || status === ERR) flatIssues.push({ level: 'err', msg: `${label} — ${tip}`, slots: [slot] });
      else if (level === 'warn' || status === WARN) flatIssues.push({ level: 'warn', msg: `${label} — ${tip}`, slots: [slot] });
    };
    const mbId = byDef('mb')[0], cpuId = byDef('cpu')[0], ramId = byDef('ram')[0],
      coolerId = byDef('cooler')[0], gpuId = byDef('gpu')[0], caseId = byDef('case')[0], psuId = byDef('psu')[0];
    const MB = mbId ? P[mbId].parsed : null, CPU = cpuId ? P[cpuId].parsed : null;

    // CPU: socket + chipset vs motherboard
    if (cpuId) {
      const C = P[cpuId].parsed;
      if (!mbId) { add(cpuId, 'socket', L('Socket', 'Socket'), NA, L('Carte mère absente', 'No motherboard')); add(cpuId, 'chipset', 'Chipset', NA, L('Carte mère absente', 'No motherboard')); }
      else {
        if (!C.sockets.length || !MB.sockets.length) add(cpuId, 'socket', L('Socket', 'Socket'), WARN, L('Socket CPU ou CM non détecté — vérifiez', 'CPU or board socket not detected — verify'));
        else if (C.sockets.some(s => MB.sockets.includes(s))) add(cpuId, 'socket', L('Socket', 'Socket'), OK, L(`Socket ${C.sockets.join('/')} sur les deux`, `Socket ${C.sockets.join('/')} on both`));
        else { add(cpuId, 'socket', L('Socket', 'Socket'), ERR, L(`CPU ${C.sockets.join('/')} ≠ CM ${MB.sockets.join('/')}`, `CPU ${C.sockets.join('/')} ≠ board ${MB.sockets.join('/')}`)); }
        if (!MB.chipset) add(cpuId, 'chipset', 'Chipset', WARN, L('Chipset CM non détecté — vérifiez', 'Board chipset not detected — verify'));
        else if (C.sockets.some(s => MB.sockets.includes(s))) add(cpuId, 'chipset', 'Chipset', OK, L(`Chipset ${MB.chipset} compatible (même socket)`, `Chipset ${MB.chipset} compatible (same socket)`));
        else add(cpuId, 'chipset', 'Chipset', ERR, L('Incompatible (voir socket)', 'Incompatible (see socket)'));
      }
    }
    // MB format vs case
    if (mbId) {
      const M = P[mbId].parsed;
      const caseIds = byDef('case');
      if (!caseIds.length) add(mbId, 'format', L('Format', 'Form factor'), NA, L('Boîtier absent', 'No case'));
      else {
        const C = P[caseIds[0]].parsed;
        if (!M.form || !C.caseForms.length) add(mbId, 'format', L('Format', 'Form factor'), WARN, L(`Format CM ${M.form || '?'} / boîtier ${C.caseForms.join('/') || '?'} — vérifiez`, `Board ${M.form || '?'} / case ${C.caseForms.join('/') || '?'} — verify`));
        else if (C.caseForms.includes(M.form)) add(mbId, 'format', L('Format', 'Form factor'), OK, L(`${M.form} supporté par le boîtier`, `${M.form} supported by the case`));
        else add(mbId, 'format', L('Format', 'Form factor'), ERR, L(`${M.form} non supporté (${C.caseForms.join('/')})`, `${M.form} not supported (${C.caseForms.join('/')})`));
      }
    }
    // RAM vs motherboard
    if (ramId) {
      const R = P[ramId].parsed, rp = P[ramId];
      if (!mbId) { ['type', 'speed', 'sticks'].forEach(k => add(ramId, k, k === 'type' ? L('Type', 'Type') : k === 'speed' ? L('Vitesse', 'Speed') : L('Barrettes', 'Sticks'), NA, L('Carte mère absente', 'No motherboard'))); }
      else {
        if (!R.ddr || !MB.ddr) add(ramId, 'type', L('Type', 'Type'), WARN, L(`RAM ${R.ddr || '?'} / CM ${MB.ddr || '?'} — vérifiez`, `RAM ${R.ddr || '?'} / board ${MB.ddr || '?'} — verify`));
        else if (R.ddr === MB.ddr) add(ramId, 'type', L('Type', 'Type'), OK, L(`DDR commune : ${R.ddr}`, `Common DDR: ${R.ddr}`));
        else add(ramId, 'type', L('Type', 'Type'), ERR, L(`RAM ${R.ddr} ≠ CM ${MB.ddr}`, `RAM ${R.ddr} ≠ board ${MB.ddr}`));
        const sticks = R.ramSticks || (Number(rp.p.qty) || 1);
        if (!R.ramSpeed || !MB.ramSpeed) add(ramId, 'speed', L('Vitesse', 'Speed'), WARN, L(`RAM ${R.ramSpeed || '?'} / max CM ${MB.ramSpeed || '?'} — vérifiez (XMP/EXPO ?)`, `RAM ${R.ramSpeed || '?'} / board max ${MB.ramSpeed || '?'} — verify (XMP/EXPO?)`));
        else if (R.ramSpeed <= MB.ramSpeed) add(ramId, 'speed', L('Vitesse', 'Speed'), OK, L(`${R.ramSpeed} ≤ max ${MB.ramSpeed} MT/s`, `${R.ramSpeed} ≤ max ${MB.ramSpeed} MT/s`));
        else add(ramId, 'speed', L('Vitesse', 'Speed'), WARN, L(`${R.ramSpeed} > max ${MB.ramSpeed} MT/s — fonctionnera bridé / XMP requis`, `${R.ramSpeed} > max ${MB.ramSpeed} MT/s — will downclock / XMP needed`));
        if (!MB.ramSlots) add(ramId, 'sticks', L('Barrettes', 'Sticks'), WARN, L(`${sticks} barrette(s), slots CM inconnus — vérifiez`, `${sticks} stick(s), unknown board slots — verify`));
        else if (sticks <= MB.ramSlots) add(ramId, 'sticks', L('Barrettes', 'Sticks'), OK, L(`${sticks} ≤ ${MB.ramSlots} slots`, `${sticks} ≤ ${MB.ramSlots} slots`));
        else add(ramId, 'sticks', L('Barrettes', 'Sticks'), ERR, L(`${sticks} barrettes pour ${MB.ramSlots} slots !`, `${sticks} sticks for ${MB.ramSlots} slots!`));
      }
    }
    // Cooler: sockets + height
    if (coolerId) {
      const C = P[coolerId].parsed;
      const srcSockets = [...(MB ? MB.sockets : []), ...(CPU ? CPU.sockets : [])];
      if (!srcSockets.length) add(coolerId, 'socket', L('Socket', 'Socket'), NA, L('Ni CPU ni CM', 'No CPU or board'));
      else if (!C.sockets.length) add(coolerId, 'socket', L('Socket', 'Socket'), WARN, L('Sockets supportés non détectés — vérifiez', 'Supported sockets not detected — verify'));
      else if (C.sockets.some(s => srcSockets.includes(s))) add(coolerId, 'socket', L('Socket', 'Socket'), OK, L(`Supporte ${C.sockets.join('/')} +`, `Supports ${C.sockets.join('/')} +`));
      else add(coolerId, 'socket', L('Socket', 'Socket'), ERR, L(`${C.sockets.join('/')} ≠ ${srcSockets.join('/')} !`, `${C.sockets.join('/')} ≠ ${srcSockets.join('/')}!`));
      const caseIds = byDef('case');
      if (!caseIds.length) add(coolerId, 'height', L('Hauteur', 'Height'), NA, L('Boîtier absent', 'No case'));
      else {
        const H = P[caseIds[0]].parsed.caseCoolerMax, h = C.coolerH;
        if (!H || !h) add(coolerId, 'height', L('Hauteur', 'Height'), WARN, L(`Ventirad ${h || '?'} mm / max ${H || '?'} mm — vérifiez`, `Cooler ${h || '?'} mm / max ${H || '?'} mm — verify`));
        else if (h <= H) add(coolerId, 'height', L('Hauteur', 'Height'), OK, L(`${h} ≤ ${H} mm`, `${h} ≤ ${H} mm`));
        else add(coolerId, 'height', L('Hauteur', 'Height'), ERR, L(`${h} mm > max ${H} mm !`, `${h} mm > max ${H} mm!`));
      }
      // CPU TDP vs cooler rating
      const cpuTdp = CPU ? CPU.tdp : 0;
      if (cpuTdp && C.tdp) {
        if (C.tdp >= cpuTdp) add(coolerId, 'tdp', 'TDP', OK, L(`${C.tdp}W ≥ CPU ${cpuTdp}W`, `${C.tdp}W ≥ CPU ${cpuTdp}W`));
        else add(coolerId, 'tdp', 'TDP', ERR, L(`${C.tdp}W < CPU ${cpuTdp}W !`, `${C.tdp}W < CPU ${cpuTdp}W!`));
      } else if (cpuTdp || C.tdp) add(coolerId, 'tdp', 'TDP', WARN, L('TDP incomplet — vérifiez la dissipation', 'Incomplete TDP — verify cooling capacity'));
    }
    // Drives (ssd1 extras share defId ssd1; hdd too)
    const driveIds = order.filter(id => P[id] && (P[id].defId === 'ssd1' || P[id].defId === 'hdd'));
    const nvmeCount = driveIds.filter(id => !P[id].parsed.sataOnly).length;
    driveIds.forEach(id => {
      const D = P[id].parsed;
      if (D.sataOnly) {
        add(id, 'iface', L('Interface', 'Interface'), OK, L('SATA — ports standards', 'SATA — standard ports'));
        if (D.isHdd35 || /3[.,]5/.test(D.raw)) {
          const caseIds = byDef('case');
          if (!caseIds.length) add(id, 'bays', L('Baies', 'Bays'), NA, L('Boîtier absent', 'No case'));
          else if (!P[caseIds[0]].parsed.bays35) add(id, 'bays', L('Baies', 'Bays'), WARN, L('Baies 3,5" du boîtier inconnues — vérifiez', 'Unknown case 3.5" bays — verify'));
          else add(id, 'bays', L('Baies', 'Bays'), OK, L('Baie 3,5" disponible', '3.5" bay available'));
        }
        return;
      }
      // NVMe path
      if (!mbId) { add(id, 'iface', L('Interface', 'Interface'), NA, L('Carte mère absente', 'No motherboard')); }
      else if (!MB.m2) add(id, 'iface', L('Interface', 'Interface'), WARN, L('Pas de M.2 détecté sur la CM — vérifiez', 'No M.2 detected on board — verify'));
      else add(id, 'iface', L('Interface', 'Interface'), OK, L('NVMe sur slot M.2', 'NVMe on M.2 slot'));
      const gEra = eraM2gen(MB ? MB.sockets : [], MB ? MB.chipset : '');
      const dg = D.pcieGen;
      if (!mbId || !dg || !gEra) add(id, 'gen', L('Gen PCIe', 'PCIe gen'), mbId ? WARN : NA, mbId ? L(`SSD Gen${dg || '?'} / gen slot inconnue — vérifiez`, `SSD Gen${dg || '?'} / unknown slot gen — verify`) : L('Carte mère absente', 'No motherboard'));
      else if (dg <= gEra) add(id, 'gen', L('Gen PCIe', 'PCIe gen'), OK, L(`Gen${dg} ≤ Gen${gEra} du slot`, `Gen${dg} ≤ slot Gen${gEra}`));
      else add(id, 'gen', L('Gen PCIe', 'PCIe gen'), WARN, L(`Gen${dg} sur slot Gen${gEra} — bridé mais fonctionne`, `Gen${dg} on Gen${gEra} slot — capped but works`));
      if (nvmeCount > 1 && !(MB && MB.m2count)) add(id, 'slots', L('Slots', 'Slots'), WARN, L(`${nvmeCount} NVMe — nombre de slots M.2 à confirmer`, `${nvmeCount} NVMes — confirm M.2 slot count`));
      else if (MB && MB.m2count && nvmeCount > MB.m2count) add(id, 'slots', L('Slots', 'Slots'), ERR, L(`${nvmeCount} NVMe pour ${MB.m2count} slots !`, `${nvmeCount} NVMes for ${MB.m2count} slots!`));
      else if (mbId) add(id, 'slots', L('Slots', 'Slots'), OK, L('Slot M.2 disponible', 'M.2 slot available'));
    });
    // GPU
    if (gpuId) {
      const G = P[gpuId].parsed;
      const caseIds = byDef('case');
      if (!caseIds.length) add(gpuId, 'length', L('Longueur', 'Length'), NA, L('Boîtier absent', 'No case'));
      else {
        const Mx = P[caseIds[0]].parsed.caseGpuMax, gl = G.gpuLen;
        if (!Mx || !gl) add(gpuId, 'length', L('Longueur', 'Length'), WARN, L(`GPU ${gl || '?'} mm / max ${Mx || '?'} mm — vérifiez`, `GPU ${gl || '?'} mm / max ${Mx || '?'} mm — verify`));
        else if (gl <= Mx) add(gpuId, 'length', L('Longueur', 'Length'), OK, L(`${gl} ≤ ${Mx} mm`, `${gl} ≤ ${Mx} mm`));
        else add(gpuId, 'length', L('Longueur', 'Length'), ERR, L(`${gl} mm > max ${Mx} mm !`, `${gl} mm > max ${Mx} mm!`));
      }
      const gEra = eraM2gen(MB ? MB.sockets : [], MB ? MB.chipset : '');
      if (!mbId) add(gpuId, 'pcie', L('PCIe', 'PCIe'), NA, L('Carte mère absente', 'No motherboard'));
      else if (!G.pcieGen || !gEra) add(gpuId, 'pcie', L('PCIe', 'PCIe'), WARN, L(`GPU Gen${G.pcieGen || '?'} / slot Gen${gEra || '?'} — vérifiez`, `GPU Gen${G.pcieGen || '?'} / slot Gen${gEra || '?'} — verify`));
      else if (G.pcieGen <= gEra) add(gpuId, 'pcie', L('PCIe', 'PCIe'), OK, L(`Gen${G.pcieGen} ≤ Gen${gEra}`, `Gen${G.pcieGen} ≤ Gen${gEra}`));
      else add(gpuId, 'pcie', L('PCIe', 'PCIe'), WARN, L(`Gen${G.pcieGen} sur slot Gen${gEra} — légèrement bridé`, `Gen${G.pcieGen} on Gen${gEra} slot — slightly capped`));
      const need8 = G.pcie8, needH = G.hpwr;
      const psuIds = byDef('psu');
      if (!need8 && !needH) add(gpuId, 'power', L('Alim', 'Power'), NA, L('Connecteurs GPU inconnus', 'Unknown GPU connectors'));
      else if (!psuIds.length) add(gpuId, 'power', L('Alim', 'Power'), NA, L('Alimentation absente', 'No PSU'));
      else {
        const U = P[psuIds[0]].parsed;
        if (!U.pcie8 && !U.hpwr) add(gpuId, 'power', L('Alim', 'Power'), WARN, L('Câbles alim non détectés — vérifiez (PCIe 8P / 12VHPWR)', 'PSU cables not detected — verify (PCIe 8P / 12VHPWR)'));
        else if ((needH && U.hpwr) || (need8 && U.pcie8 >= need8)) add(gpuId, 'power', L('Alim', 'Power'), OK, L('Connecteurs OK', 'Connectors OK'));
        else if (need8 && U.hpwr) add(gpuId, 'power', L('Alim', 'Power'), WARN, L('Alim 12VHPWR uniquement — adaptateur vers 2×8P (souvent fourni avec le GPU)', '12VHPWR-only PSU — adapter to 2×8P (often bundled with GPU)'));
        else add(gpuId, 'power', L('Alim', 'Power'), ERR, L('Connecteurs insuffisants !', 'Insufficient connectors!'));
      }
    }
    // Case mirrors
    if (byDef('case').length) {
      const cid = byDef('case')[0], C = P[cid].parsed;
      if (mbId) {
        const M = P[mbId].parsed;
        if (!M.form || !C.caseForms.length) add(cid, 'format', L('Format', 'Form factor'), WARN, L('Formats à confirmer', 'Confirm form factors'));
        else if (C.caseForms.includes(M.form)) add(cid, 'format', L('Format', 'Form factor'), OK, L(`Accepte ${M.form}`, `Accepts ${M.form}`));
        else add(cid, 'format', L('Format', 'Form factor'), ERR, L(`${M.form} refusé (${C.caseForms.join('/')})`, `${M.form} refused (${C.caseForms.join('/')})`));
      }
      if (gpuId) {
        const gl = P[gpuId].parsed.gpuLen;
        if (!C.caseGpuMax || !gl) add(cid, 'gpu', L('GPU max', 'Max GPU'), WARN, L('Longueurs à confirmer', 'Confirm lengths'));
        else if (gl <= C.caseGpuMax) add(cid, 'gpu', L('GPU max', 'Max GPU'), OK, L(`${gl} ≤ ${C.caseGpuMax} mm`, `${gl} ≤ ${C.caseGpuMax} mm`));
        else add(cid, 'gpu', L('GPU max', 'Max GPU'), ERR, L(`GPU ${gl} mm > ${C.caseGpuMax} mm !`, `GPU ${gl} mm > ${C.caseGpuMax} mm!`));
      }
      if (coolerId) {
        const h = P[coolerId].parsed.coolerH;
        if (!C.caseCoolerMax || !h) add(cid, 'cooler', L('Ventirad max', 'Max cooler'), WARN, L('Hauteurs à confirmer', 'Confirm heights'));
        else if (h <= C.caseCoolerMax) add(cid, 'cooler', L('Ventirad max', 'Max cooler'), OK, L(`${h} ≤ ${C.caseCoolerMax} mm`, `${h} ≤ ${C.caseCoolerMax} mm`));
        else add(cid, 'cooler', L('Ventirad max', 'Max cooler'), ERR, L(`${h} mm > ${C.caseCoolerMax} mm !`, `${h} mm > ${C.caseCoolerMax} mm!`));
      }
    }
    // PSU
    if (psuId) {
      const U = P[psuId].parsed, cap = P[psuId].capW || U.capW, tot = totals.watts || 0;
      if (!cap) add(psuId, 'power', L('Puissance', 'Wattage'), WARN, L('Puissance alim inconnue — renseignez-la (nom ou champ)', 'Unknown PSU wattage — fill it in (name or field)'));
      else if (!tot) add(psuId, 'power', L('Puissance', 'Wattage'), NA, L('Aucune consommation renseignée', 'No power draw entered'));
      else if (cap >= tot * 1.25) add(psuId, 'power', L('Puissance', 'Wattage'), OK, L(`${cap}W ≥ ${tot}W × 1,25`, `${cap}W ≥ ${tot}W × 1.25`));
      else if (cap >= tot) add(psuId, 'power', L('Puissance', 'Wattage'), WARN, L(`${cap}W juste pour ${tot}W — marge faible`, `${cap}W just for ${tot}W — thin headroom`));
      else add(psuId, 'power', L('Puissance', 'Wattage'), ERR, L(`${cap}W < ${tot}W !`, `${cap}W < ${tot}W!`));
      const caseIds = byDef('case');
      if (!caseIds.length) add(psuId, 'format', L('Format', 'Form factor'), NA, L('Boîtier absent', 'No case'));
      else if (!U.psuFormat) add(psuId, 'format', L('Format', 'Form factor'), WARN, L('Format alim inconnu — vérifiez (ATX/SFX)', 'Unknown PSU format — verify (ATX/SFX)'));
      else add(psuId, 'format', L('Format', 'Form factor'), OK, L(`${U.psuFormat}`, `${U.psuFormat}`));
      if (gpuId) {
        const G = P[gpuId].parsed;
        if ((!G.pcie8 && !G.hpwr)) { /* na silently */ }
        else if (!U.pcie8 && !U.hpwr) add(psuId, 'cables', L('Câbles', 'Cables'), WARN, L('Câbles non détectés — vérifiez', 'Cables not detected — verify'));
        else if ((G.hpwr && U.hpwr) || (G.pcie8 && U.pcie8 >= G.pcie8)) add(psuId, 'cables', L('Câbles', 'Cables'), OK, L('Câbles OK', 'Cables OK'));
        else if (G.pcie8 && U.hpwr) add(psuId, 'cables', L('Câbles', 'Cables'), WARN, L('Adaptateur 12VHPWR→2×8P probablement fourni avec le GPU', '12VHPWR→2×8P adapter likely bundled with GPU'));
        else add(psuId, 'cables', L('Câbles', 'Cables'), ERR, L('Câbles insuffisants !', 'Insufficient cables!'));
      }
    }
    // Case fans (any product looking like a chassis fan, any slot)
    order.forEach(id => {
      if (!P[id] || P[id].defId === 'cooler') return;
      const F = P[id].parsed;
      if (!isCaseFan(F.raw)) return;
      const caseIds = byDef('case');
      if (!caseIds.length) { add(id, 'mount', L('Montage', 'Mounting'), NA, L('Boîtier absent', 'No case')); return; }
      const C = P[caseIds[0]].parsed;
      if (!F.fanSize || !C.fanSizes.length) add(id, 'mount', L('Montage', 'Mounting'), WARN, L(`Ventilateur ${F.fanSize || '?'} mm — emplacements ${C.fanSizes.join('/') || '?'} mm à confirmer`, `Fan ${F.fanSize || '?'} mm — confirm ${C.fanSizes.join('/') || '?'} mm mounts`));
      else if (C.fanSizes.includes(F.fanSize)) add(id, 'mount', L('Montage', 'Mounting'), OK, L(`${F.fanSize} mm supporté`, `${F.fanSize} mm supported`));
      else add(id, 'mount', L('Montage', 'Mounting'), ERR, L(`${F.fanSize} mm non supporté (${C.fanSizes.join('/')})`, `${F.fanSize} mm unsupported (${C.fanSizes.join('/')})`));
    });
    // USB devices vs backpanel
    const usbDevs = order.filter(id => P[id] && P[id].defId !== 'mb' && isUsbDevice(P[id].parsed.raw));
    if (usbDevs.length && mbId) {
      const M = P[mbId].parsed;
      const ports = (M.usbC > 0 ? M.usbC : 0) + (M.usbA > 0 ? M.usbA : 0);
      const unknown = M.usbUnknown || M.usbC < 0 || M.usbA < 0;
      usbDevs.forEach(id => {
        if (unknown) add(id, 'usb', 'USB', WARN, L(`${usbDevs.length} périphérique(s) USB — ports dorsaux à compter`, `${usbDevs.length} USB device(s) — count backpanel ports`));
        else if (usbDevs.length <= ports) add(id, 'usb', 'USB', OK, L(`${usbDevs.length}/${ports} ports USB`, `${usbDevs.length}/${ports} USB ports`));
        else add(id, 'usb', 'USB', ERR, L(`${usbDevs.length} appareils pour ${ports} ports !`, `${usbDevs.length} devices for ${ports} ports!`));
        const t = P[id].parsed.raw;
        if (/USB[-\s]?C|Type-?C/i.test(t) && M.usbC === 0 && !unknown) add(id, 'usbc', 'USB-C', WARN, L('Pas de USB-C dorsal détecté (adaptateur ?)', 'No backpanel USB-C detected (adapter?)'));
      });
    } else if (usbDevs.length && !mbId) {
      usbDevs.forEach(id => add(id, 'usb', 'USB', NA, L('Carte mère absente', 'No motherboard')));
    }
    // Router LAN vs motherboard LAN (user example: 2.5GbE board vs 1G router ports)
    byDef('router').forEach(id => {
      const R = P[id].parsed;
      if (!mbId) { add(id, 'lan', 'LAN', NA, L('Carte mère absente', 'No motherboard')); return; }
      const M = P[mbId].parsed;
      if (!R.lan || !M.lan) add(id, 'lan', 'LAN', WARN, L(`Débits LAN à confirmer (routeur ${R.lan || '?'} / CM ${M.lan || '?'})`, `Confirm LAN speeds (router ${R.lan || '?'} / board ${M.lan || '?'})`));
      else if (R.lan >= M.lan) add(id, 'lan', 'LAN', OK, L(`Routeur ${R.lan}G ≥ CM ${M.lan}G`, `Router ${R.lan}G ≥ board ${M.lan}G`));
      else add(id, 'lan', 'LAN', WARN, L(`Routeur ${R.lan}G < CM ${M.lan}G — débit bridé au routeur`, `Router ${R.lan}G < board ${M.lan}G — capped at router speed`));
    });
    // UPS vs total
    const upsIds = byDef('ups');
    upsIds.forEach(id => {
      const cap = P[id].capW || P[id].parsed.capW, tot = totals.watts || 0;
      if (!cap) add(id, 'load', L('Charge', 'Load'), WARN, L('Puissance onduleur inconnue (VA ou champ) — renseignez-la', 'Unknown UPS rating (VA or field) — fill it in'));
      else if (!tot) add(id, 'load', L('Charge', 'Load'), NA, L('Aucune consommation renseignée', 'No power draw entered'));
      else if (cap >= tot * 1.2) add(id, 'load', L('Charge', 'Load'), OK, L(`${cap}W ≥ ${tot}W × 1,2`, `${cap}W ≥ ${tot}W × 1.2`));
      else if (cap >= tot) add(id, 'load', L('Charge', 'Load'), WARN, L(`${cap}W juste pour ${tot}W`, `${cap}W just for ${tot}W`));
      else add(id, 'load', L('Charge', 'Load'), ERR, L(`${cap}W < ${tot}W !`, `${cap}W < ${tot}W!`));
    });
    // PCIe capture / sound cards: free slot of width
    order.forEach(id => {
      if (!P[id]) return;
      const t = P[id].parsed.raw, isCap = /capture|acquisition|elgato|avermedia/i.test(t), isSnd = /carte son|sound blaster|soundcard|Dac\b/i.test(t);
      if (!isCap && !isSnd) return;
      if (isUsbDevice(t) && !/pci[\s-]?e/i.test(t)) return; // external USB: no slot needed
      if (!mbId) { add(id, 'slot', L('Slot', 'Slot'), NA, L('Carte mère absente', 'No motherboard')); return; }
      const M = P[mbId].parsed;
      if (!M.slotX16 && !M.slotX1 && !/PCIe?\s*x\s*1/i.test(M.raw)) add(id, 'slot', L('Slot', 'Slot'), WARN, L('Slots PCIe de la CM inconnus — vérifiez un slot libre', 'Unknown board PCIe slots — verify a free slot'));
      else add(id, 'slot', L('Slot', 'Slot'), OK, L('Slot PCIe disponible', 'PCIe slot available'));
    });
    // slot worst-status map
    const statusOf = {};
    Object.keys(checks).forEach(id => {
      const arr = checks[id];
      statusOf[id] = arr.some(c => c.status === ERR) ? ERR : arr.some(c => c.status === WARN) ? WARN : OK;
    });
    const issues = { err: flatIssues.filter(i => i.level === 'err'), warn: flatIssues.filter(i => i.level === 'warn') };
    return { checks, issues, statusOf };
  }

  return { check, parse, isCaseFan, OK, WARN, ERR, NA };
})();
