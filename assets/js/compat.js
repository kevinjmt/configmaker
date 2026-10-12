/* ConfigMaker — compatibility checking (100% local, no dependency).
   Source of truth: the Idealo product page DATASHEET section only
   ("## Détails du produit", label/value lines), never the short summary.
   Layer 1: parseDatasheet() maps known labels → structured fields (+EN variants).
   Layer 2: check() runs pairwise rules → per-slot checks {key,label,status,tip,a,b}
   (a/b = the two compared specs) + global issues.
   Statuses: ok (green) | warn (yellow) | err (red) | na (grey, counterpart absent)
   | checked (light green, warning verified by user). */
'use strict';
const Compat = (() => {
  const OK = 'ok', WARN = 'warn', ERR = 'err', NA = 'na', CHECKED = 'checked';
  const T = (lang, fr, en) => (lang === 'en' ? en : fr);

  function fnum(s) {
    const m = String(s || '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/);
    return m ? parseFloat(m[1].replace(',', '.')) : 0;
  }
  function ints(s, min, max) {
    const out = [];
    const rx = /(\d+(?:[.,]\d+)?)/g;
    let m;
    const clean = String(s || '').replace(/\s/g, '');
    while ((m = rx.exec(clean)) !== null) {
      const v = parseFloat(m[1].replace(',', '.'));
      if (v >= min && v <= max) out.push(v);
    }
    return out;
  }
  function low(s) {
    return String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
  }

  /* Normalize datasheet text: table rows "| L | V |" become "L V" lines. */
  function dsLines(ds) {
    return String(ds || '').split('\n').map(ln => {
      let s = ln.trim();
      if (/^\|.*\|$/.test(s)) s = s.replace(/^\||\|$/g, '').split('|').map(x => x.trim()).filter(Boolean).join(' ');
      return s.replace(/\s+/g, ' ').trim();
    }).filter(Boolean);
  }

  /* label (lowercase) -> [field, kind]; longest labels first.
     kinds: raw | num | numlist | sockets | forms | form | ddr | pciegen | usbports | lan | flag */
  const LABELS = [
    ['support', 'socket', 'sockets'], ['socket du processeur', 'socket', 'sockets'],
    ['processor socket', 'socket', 'sockets'], ['socket', 'socket', 'sockets'],
    ['support des processeurs jusqu', 'cpuMaxTdp', 'num'],
    ['nombre d\u2019emplacements ram', 'ramSlots', 'num'], ["nombre d'emplacements ram", 'ramSlots', 'num'],
    ['number of ram slots', 'ramSlots', 'num'], ['memory slots', 'ramSlots', 'num'],
    ['architecture de la ram', null, null],
    ['type de ram', 'ddr', 'ddr'], ['memory type', 'ddr', 'ddr'], ['type de mémoire', 'ddr', 'ddr'],
    ['taux de transfert', 'ramSpeed', 'num'], ['transfer rate', 'ramSpeed', 'num'],
    ['vitesse de transfert', 'ramSpeed', 'num'], ['data rate', 'ramSpeed', 'num'],
    ['nombre de modules', 'ramSticks', 'num'], ['number of modules', 'ramSticks', 'num'],
    ['capacité par module', 'ramPerMod', 'num'], ['capacity per module', 'ramPerMod', 'num'],
    ['type dimm', 'dimmType', 'raw'], ['memory form factor', 'dimmType', 'raw'],
    ['fréquence mémoire (oc)', 'ramSpeedMax', 'num'], ['memory frequency (oc)', 'ramSpeedMax', 'num'],
    ['fréquence mémoire', 'ramSpeedMax', 'num'],
    ['memory frequency', 'ramSpeedMax', 'num'], ['bus frequency', 'ramSpeedMax', 'num'], ['fréquence de bus', 'ramSpeedMax', 'num'],
    ['extension de mémoire max', 'ramCapMax', 'num'], ['max memory', 'ramCapMax', 'num'],
    ['capacité mémoire', 'ramCap', 'num'], ['memory capacity', 'ramCap', 'num'], ['memory size', 'ramCap', 'num'],
    ['configuration', 'ramConfig', 'raw'],
    ['hauteur', 'height', 'num'], ['height', 'height', 'num'],
    ['tension', null, null], ['voltage', null, null],
    ['connecteurs de disque', null, null],
    ['nombre de ports sata', 'sataCount', 'num'], ['sata ports', 'sataCount', 'num'],
    ['nombre de ports m.2', 'm2count', 'num'], ['nombre de ports m2', 'm2count', 'num'], ['m.2 ports', 'm2count', 'num'],
    ['raccordements périphériques', 'usbBack', 'usbports'], ['rear usb', 'usbBack', 'usbports'],
    ['nombre de ports usb', null, null],
    ['ports internes', 'fans', 'fanports'], ['internal io', 'fans', 'fanports'], ['internal i/o', 'fans', 'fanports'],
    ['fan headers', 'fans', 'fanports'], ['fan connectors', 'fans', 'fanports'],
    ['prises ventilateur', 'fans', 'fanports'],
    ['internal usb', null, null],
    ['format', 'form', 'form'], ['form factor', 'form', 'form'],
    ['formats de cartes mères supportés', 'caseForms', 'forms'], ['supported motherboard formats', 'caseForms', 'forms'],
    ['standards ethernet', 'lan', 'lan'], ['ethernet', 'lan', 'lan'], ['network', 'lan', 'lan'],
    ['connecteurs vidéo', 'vid', 'vidports'], ['sorties vidéo', 'vid', 'vidports'], ['sorties video', 'vid', 'vidports'],
    ['entrées vidéo', 'vid', 'vidports'], ['entrees video', 'vid', 'vidports'], ['entrées', 'vid', 'vidports'],
    ['connecteur vidéo', 'vid', 'vidports'], ['ports vidéo', 'vid', 'vidports'],
    ['video inputs', 'vid', 'vidports'], ['video outputs', 'vid', 'vidports'],
    ['inputs', 'vid', 'vidports'], ['outputs', 'vid', 'vidports'],
    ['nombre de hdmi', 'hdmiN', 'num'], ['number of hdmi', 'hdmiN', 'num'], ['hdmi ports', 'hdmiN', 'num'],
    ['nombre de displayport', 'dpN', 'num'], ['number of displayports', 'dpN', 'num'], ['displayport ports', 'dpN', 'num'],
    ['spécification hdmi', 'hdmiVer', 'ver'], ['specification hdmi', 'hdmiVer', 'ver'], ['version hdmi', 'hdmiVer', 'ver'], ['hdmi version', 'hdmiVer', 'ver'],
    ['version displayport', 'dpVer', 'ver'], ['displayport version', 'dpVer', 'ver'],
    ['nombre maximal de moniteurs', 'maxMon', 'num'], ['max monitors', 'maxMon', 'num'],
    ['résolution max', 'maxRes', 'raw'], ['max resolution', 'maxRes', 'raw'],
    ['résolution', 'res', 'raw'], ['resolution', 'res', 'raw'],
    ['taux de rafraîchissement', 'refresh', 'num'], ['taux de rafraichissement', 'refresh', 'num'],
    ['refresh rate', 'refresh', 'num'], ['taux de rafraîssement', 'refresh', 'num'],
    ['total board power', 'gpuW', 'num'], ['puissance totale', 'gpuW', 'num'], ['consommation (jeu)', 'gpuW', 'num'],
    ['profondeur', 'depth', 'num'], ['épaisseur', 'depth', 'num'], ['thickness', 'depth', 'num'], ['depth', 'depth', 'num'],
    ['nombre de slots', 'gpuSlots', 'num'], ['slot d’extension', 'gpuSlots', 'raw'], ["slot d'extension", 'gpuSlots', 'raw'],
    ['connecteurs', 'vid', 'vidports'], ['connectique', 'vid', 'vidports'],
    ['lecteur de carte', 'cardReader', 'flag'], ['lecteur de cartes', 'cardReader', 'flag'],
    ['card reader', 'cardReader', 'flag'], ['lecteur sd', 'cardReader', 'flag'],
    ['carte son intégrée', 'audio', 'flag'], ['integrated sound', 'audio', 'flag'], ['carte son', 'audio', 'flag'],
    ['version bluetooth', 'bt', 'raw'], ['bluetooth', 'bt', 'raw'],
    ['connectivité', 'wireless', 'wireless'], ['connectivity', 'wireless', 'wireless'],
    ['connexion', 'wireless', 'wireless'], ['sans fil', 'wireless', 'wireless'],
    ['prise casque', 'jack', 'flag'], ['connecteur casque', 'jack', 'flag'],
    ['versions pcie', 'pcieVers', 'numlist'],
    ['nombre de slots pcie x16', 'slotX16', 'num'], ['nombre de slots pcie x1', 'slotX1', 'num'],
    ['slots pcie x16', 'slotX16', 'num'], ['slots pcie x1', 'slotX1', 'num'],
    ['pcie x16 slots', 'slotX16', 'num'], ['pcie x1 slots', 'slotX1', 'num'],
    ['tdp (thermal design power)', 'tdp', 'num'], ['thermal design power', 'tdp', 'num'], ['tdp', 'tdp', 'num'],
    ['types de mémoire', 'ddr', 'ddr'], ['memory types', 'ddr', 'ddr'],
    ['vitesse de transfert (lecture)', 'readSpeed', 'num'], ['read speed', 'readSpeed', 'num'],
    ['bus', 'bus', 'raw'], ['interface', 'bus', 'raw'],
    ['protocole', 'proto', 'raw'], ['protocol', 'proto', 'raw'],
    ['facteur de forme', 'ff', 'raw'],
    ['longueur', 'length', 'num'], ['length', 'length', 'num'],
    ['version pcie', 'pcieGen', 'num'], ['pcie version', 'pcieGen', 'num'],
    ['voies pcie', 'pcieLanes', 'num'], ['pcie lanes', 'pcieLanes', 'num'],
    ['port d\u2019alimentation', 'powConn', 'raw'], ["port d'alimentation", 'powConn', 'raw'], ['power connector', 'powConn', 'raw'],
    ['supports de processeurs compatibles', 'sockets', 'sockets'], ['compatible sockets', 'sockets', 'sockets'],
    ['taille du radiateur', 'radSize', 'num'], ['radiator size', 'radSize', 'num'],
    ['baies 3,5', 'bays35', 'num'], ['baie 2,5', 'bays25', 'num'],
    ['hauteur max. du ventilateur de processeur', 'caseCoolerMax', 'num'], ['max cpu cooler height', 'caseCoolerMax', 'num'],
    ['longueur max. de la carte graphique', 'caseGpuMax', 'num'], ['max gpu length', 'caseGpuMax', 'num'],
    ['refroidissement par eau', 'watercool', 'flag'], ['liquid cooling', 'watercool', 'flag'], ['water cooling', 'watercool', 'flag'],
    ['connecteurs pci-e (8 broches)', 'pcie8', 'num'], ['pci-e 8-pin connectors', 'pcie8', 'num'],
    ['autres connecteurs', 'otherConn', 'raw'],
    ['puissance continue', 'capW', 'num'],
    ['type de produit', 'ddr', 'ddr'], ['product type', 'ddr', 'ddr'],
  ];
  const SORTED = [...LABELS].sort((a, b) => b[0].length - a[0].length);

  function parseDatasheet(dsText) {
    const P = { sockets: [], caseForms: [], pcieVers: [], usbBack: { c: 0, a: 0 } };
    const rawLines = dsLines(dsText);
    /* Join "label" + "value" pairs split across two lines:
       exact label line, or label + short digit-less remainder ("Ports internes I/O"). */
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
      const l = low(rawLines[i]).replace(/[\s.:]+$/, '');
      const isLab = SORTED.some(([lab, field]) => field && l === lab);
      const partial = !isLab && SORTED.some(([lab, field]) => {
        if (!field || !l.startsWith(lab)) return false;
        const rest = l.slice(lab.length).trim();
        return rest.length > 0 && rest.length <= 8 && !/\d/.test(rest);
      });
      const nxt = i + 1 < rawLines.length ? low(rawLines[i + 1]).replace(/[\s.:]+$/, '') : '';
      const nxtIsLab = nxt && SORTED.some(([lab, field]) => field && (nxt === lab || nxt.startsWith(lab + ' ')));
      if ((isLab || partial) && nxt && !nxtIsLab) { lines.push(rawLines[i] + ' ' + rawLines[i + 1]); i++; }
      else lines.push(rawLines[i]);
    }
    for (const ln of lines) {
      const l = low(ln);
      let hit = null;
      for (const [lab, field, kind] of SORTED) {
        if (!field) continue;
        const rest = l.startsWith(lab) ? l.slice(lab.length) : null;
        if (rest !== null && (rest === '' || /^[\s.:'"\-–_(/]/.test(rest))) { hit = [field, kind, ln.slice(lab.length).replace(/^[\s:]+/, '')]; break; }
      }
      if (!hit) continue;
      const [field, kind, val] = hit;
      if (kind === 'raw') { P[field] = (P[field] ? P[field] + ' / ' : '') + val; continue; }
      if (kind === 'flag') { P[field] = /oui|yes|true/i.test(val) ? true : val; continue; }
      if (kind === 'num') {
        const nums = ints(val, 0, 1000000);
        if (field === 'ramSpeedMax' || field === 'readSpeed') P[field] = nums.length ? Math.max(...nums) : 0;
        else P[field] = nums.length ? nums[0] : 0;
        continue;
      }
      if (kind === 'numlist') { P[field] = ints(val, 1, 9); continue; }
      if (kind === 'sockets') {
        const ss = (val.match(/\b(AM5|AM4|1700|1851|1200|1151)\b/gi) || []).map(s => s.toUpperCase());
        P.sockets = [...new Set([...P.sockets, ...ss])];
        continue;
      }
      if (kind === 'forms') {
        const f = [];
        if (/E-?\s?ATX/i.test(val)) f.push('EATX');
        if (/MICRO\s?-?\s?ATX/i.test(val)) f.push('MATX');
        if (/MINI[ -]?ITX/i.test(val)) f.push('ITX');
        if (/\bATX\b/i.test(val) && !/ATX12V/i.test(val.replace(/\bATX\b/, ''))) f.push('ATX');
        P.caseForms = [...new Set([...P.caseForms, ...f])];
        continue;
      }
      if (kind === 'form') {
        if (/E-?\s?ATX/i.test(val)) P.form = 'EATX';
        else if (/MICRO\s?-?\s?ATX/i.test(val)) P.form = 'MATX';
        else if (/MINI[ -]?ITX/i.test(val)) P.form = 'ITX';
        else if (/\bATX\b/i.test(val)) P.form = 'ATX';
        continue;
      }
      if (kind === 'ddr') {
        const dm = val.match(/DDR\s?([45])\b/i);
        if (dm) P.ddr = 'DDR' + dm[1];
        continue;
      }
      if (kind === 'pciegen') { const n = fnum(val); if (n) P.pcieGen = n; continue; }
      if (kind === 'usbports') {
        val.split(',').forEach(part => {
          const n = fnum(part);
          if (!n) return;
          if (/C\b|2x2|Type.?C/i.test(part)) P.usbBack.c += n;
          else P.usbBack.a += n;
        });
        continue;
      }
      if (kind === 'lan') {
        const ns = ints(val.replace(',', '.'), 0, 100);
        if (ns.length) P.lan = Math.max(...ns);
        continue;
      }
      if (kind === 'fanports') {
        const v = String(val);
        let m = v.match(/(\d+)\s*(?:x\s*)?ventilateurs?\s*processeur|(\d+)\s*(?:x\s*)?cpu\s*fans?/i);
        if (m) P.fanCpu = Math.max(P.fanCpu || 0, parseInt(m[1] || m[2], 10));
        m = v.match(/(\d+)\s*(?:x\s*)?(?:bo[iî]tiers?\s*de\s*ventilation|ventilateurs?\s*(?:bo[iî]tier|ch[aâ]ssis)|system\s*fans?|chassis\s*fans?|case\s*fans?)/i);
        if (m) P.fanSys = Math.max(P.fanSys || 0, parseInt(m[1], 10));
        continue;
      }
      if (kind === 'vidports') {
        P.vid = P.vid || { hdmi: 0, dp: 0, usbc: 0 };
        const v = String(val);
        /* versions may hide in the same line (header joined with "Version DisplayPort …") */
        const mh = v.match(/hdmi\s*(\d+(?:[.,]\d+)?)/i);
        if (mh) P.hdmiVer = Math.max(P.hdmiVer || 0, parseFloat(mh[1].replace(',', '.')));
        const md = v.match(/display\s?port\s*(\d+(?:[.,]\d+)?)/i);
        if (md) P.dpVer = Math.max(P.dpVer || 0, parseFloat(md[1].replace(',', '.')));
        v.split(/[,;+]/).forEach(part => {
          let n = 1;
          const m = part.match(/(\d+)\s*x\b/i);
          if (m) n = parseInt(m[1], 10);
          if (/hdmi/i.test(part)) P.vid.hdmi += n;
          else if (/display\s?port|\bdp\b|mini\s?dp/i.test(part)) P.vid.dp += n;
          else if (/usb[-\s]?c|type.?c|thunderbolt|usb4/i.test(part)) P.vid.usbc += n;
        });
        continue;
      }
      if (kind === 'ver') {
        const m = String(val).match(/(\d+(?:[.,]\d+)?)/);
        if (m) P[field] = parseFloat(m[1].replace(',', '.'));
        continue;
      }
      if (kind === 'wireless') {
        P.wireless = P.wireless || {};
        const v = String(val);
        if (/bluetooth/i.test(v)) {
          P.wireless.bt = true;
          const bmv = v.match(/(\d+(?:[.,]\d+)?)/);
          if (bmv) P.wireless.btVer = bmv[1];
        }
        if (/2[.,]4\s?ghz|dongle|récepteur|receiver|radio/i.test(v)) P.wireless.rf = true;
        if (/sans fil|wireless/i.test(v)) P.wireless.wl = true;
        if (/filaire|wired|\busb\b/i.test(v)) P.wireless.wired = true;
        continue;
      }
    }
    /* "Configuration: 2 x 16 Go" → sticks + capacity (datasheet text, not summary). */
    if (P.ramConfig && (!P.ramSticks || !P.ramCap)) {
      const m = String(P.ramConfig).match(/(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
      if (m) {
        if (!P.ramSticks) P.ramSticks = parseInt(m[1], 10) || 0;
        if (!P.ramCap && /go|gb/i.test(P.ramConfig)) P.ramCap = Math.round(parseInt(m[1], 10) * parseFloat(m[2].replace(',', '.')));
      } else if (!P.ramCap) {
        const g = String(P.ramConfig).match(/(\d+(?:[.,]\d+)?)\s*(?:go|gb)/i);
        if (g) P.ramCap = Math.round(parseFloat(g[1].replace(',', '.')));
      }
    }
    if (P.ramPerMod && P.ramCap && !P.ramSticks) {
      const st = Math.round(P.ramCap / P.ramPerMod);
      if (st >= 1 && st <= 8) P.ramSticks = st;
    }
    /* "Nombre de HDMI / DisplayPort" → merge into vid counts. */
    if (P.hdmiN || P.dpN) {
      P.vid = P.vid || { hdmi: 0, dp: 0, usbc: 0 };
      P.vid.hdmi += P.hdmiN || 0;
      P.vid.dp += P.dpN || 0;
    }
    /* "2.560 x 1.440 pixels" → {w, h} (FR thousands separators). */
    const parseWH = t => {
      const m = String(t || '').replace(/(\d)[. ](?=\d{3}\b)/g, '$1').match(/(\d{3,5})\s*x\s*(\d{3,5})/i);
      return m ? { w: parseInt(m[1], 10), h: parseInt(m[2], 10) } : null;
    };
    if (P.res && !P.resWH) P.resWH = parseWH(P.res);
    if (P.maxRes && !P.maxResWH) P.maxResWH = parseWH(P.maxRes);
    /* Rear USB top speed (Gbps) from USB/Thunderbolt lines — for docks, webcams, screens. */
    let usbTop = 0;
    for (const ln of lines) {
      const l = low(ln);
      if (!/usb|thunderbolt/.test(l)) continue;
      if (/thunderbolt\s*5|\busb\s*4\b.*80|80\s*gbps/.test(l)) usbTop = Math.max(usbTop, 80);
      else if (/thunderbolt|usb\s*4\b/.test(l)) usbTop = Math.max(usbTop, 40);
      else if (/gen\s*2\s*x\s*2|2x2/.test(l)) usbTop = Math.max(usbTop, 20);
      else if (/gen\s*2(?!\s*x)/.test(l)) usbTop = Math.max(usbTop, 10);
      else if (/gen\s*1|usb\s*3\b|usb3/.test(l)) usbTop = Math.max(usbTop, 5);
      else if (/usb\s*2|usb2/.test(l)) usbTop = Math.max(usbTop, 0.48);
    }
    if (usbTop) P.usbTop = usbTop;
    /* Network + jack scan on raw lines (value-first layouts: "8 x RJ45", "SFP+", "Jack 3,5 mm"). */
    for (const ln of lines) {
      const l = low(ln);
      if (/rj-?45|base-?t|\bethernet\b/.test(l)) {
        const cm = l.match(/(\d+)\s*(?:x\s*)?(?:ports?\s*)?rj-?45/i);
        if (cm) P.rj45 = Math.max(P.rj45 || 0, parseInt(cm[1], 10));
        const spd = [];
        l.replace(/(\d+(?:[.,]\d+)?)\s*g(?:bps|b(?:ase)?-?t)?\b/gi, (_, n) => { spd.push(parseFloat(String(n).replace(',', '.'))); return ''; });
        if (/10\/100\/1000|\bgigabit\b|1000\s*mbps/i.test(l)) spd.push(1);
        if (spd.length) P.portSpeed = Math.max(P.portSpeed || 0, ...spd);
      }
      if (/\bsfp\b/.test(l)) {
        const sm = l.match(/(\d+)\s*x\s*sfp|sfp\+?\D{0,10}(\d+)|(\d+)\s*\D{0,10}sfp/i);
        P.sfp = Math.max(P.sfp || 0, sm ? parseInt(sm[1] || sm[2] || sm[3], 10) : 1);
      }
      if (/wi-?fi/.test(l)) {
        const wm = l.match(/wi-?fi\s*(\d)/i);
        if (wm) { P.wifiGen = Math.max(P.wifiGen || 0, parseInt(wm[1], 10)); if (/6e/i.test(l)) P.wifiE = true; }
      }
      if (/connect|entrées|entrees|audio|jack|casque/.test(l) && /jack|3[.,]5\s?mm/.test(l)) P.jack = true;
    }
    P.raw = String(dsText || '').slice(0, 6000); // keyword fallback (liquid cooling, SATA…)
    return P;
  }

  function isCaseFan(text) {
    const t = String(text || '');
    if (/carte mère|motherboard|chipset|socket\s*\d|ddr\s?\d|pcie\s*\d|mémoire|memory/i.test(t)) return false;
    if (!/ventilateur|fan/i.test(t)) return false;
    if (/processeur|ventirad|watercooling|AIO|refroidissement liquide|CPU/i.test(t) && !/châssis|chassis|boîtiers?|boitiers?|\bPC\b/i.test(t)) return false;
    return /châssis|chassis|boîtiers?|boitiers?|\bPC\b|RGB|ARGB|\b120\b|\b140\b|\b200\b|fan/i.test(t);
  }
  function isUsbDevice(text) { return /\bUSB\b/i.test(String(text || '')); }
  function isUsbCDevice(text) { return /USB[-\s]?C|Type.?C/i.test(String(text || '')); }
  /* Slot generation, datasheet-first: the board's own "Versions PCIe" list,
     with socket/chipset-era guessing only as fallback. */
  function slotGen(M, mbName) {
    if (M && Array.isArray(M.pcieVers) && M.pcieVers.length) return Math.max(...M.pcieVers);
    const soc = M ? (M.sockets || []) : [];
    return socketEraGen(soc, chipsetOf(M || {}, mbName));
  }
  function socketEraGen(sockets, chipsetText) {
    const c = String(chipsetText || '').toUpperCase();
    if (/X870|B850/.test(c)) return 5;
    const s = (sockets || []).join(',');
    if (/AM5/.test(s)) return 4;
    if (/AM4|1700|1200/.test(s)) return 4;
    return 0;
  }
  function chipsetOf(P, name) {
    if (P.chipset) return P.chipset;
    const m = `${name || ''}`.match(/\b(B860M?|B850|B650E?|X870E?|X670E?|B550|X570S?|Z890|Z790|Z690|B760|B660|H810|H610|H670|Z590|B560|H510|A520|A320|X470|B450)\b/i);
    return m ? m[1].toUpperCase() : '';
  }
  function psuCapW(p, P) {
    if (Number(p.capW) > 0) return Number(p.capW);
    if (P.capW) return P.capW;
    const m = `${p.name || ''}`.match(/(\d{3,4})\s*W\b/i);
    return m ? parseInt(m[1], 10) : 0;
  }
  function upsCapW(p, P, text) {
    if (Number(p.capW) > 0) return Number(p.capW);
    if (P.capW) return P.capW;
    const m = String(text || '').match(/(\d[\d\s]*)\s*VA\b/i);
    if (m) return Math.round(fnum(m[1]) * 0.6);
    return 0;
  }

  /* ---------------- Layer 2: rules engine ----------------
     ctx: {order, slots, sel(slot)->product|null, def(slot)->{sec}, totals:{watts}, lang}
     check: {key,label,status,tip,a,b}  a/b = {label, value} of compared specs */
  function check(ctx) {
    const { order, slots, sel, def, totals, lang } = ctx;
    const L = (fr, en) => (lang === 'en' ? en : fr);
    const P = {};
    order.forEach(id => {
      const s = slots[id]; if (!s) return;
      const p = sel(s); if (!p) return;
      const dst = String((p.datasheet || '')).trim();
      P[id] = {
        slot: s, p, defId: s.defId, hasDs: !!dst,
        ds: dst ? parseDatasheet(dst) : null,
        watts: (Number(p.watts) || 0) * (Number(p.qty) || 1),
        verified: Array.isArray(p.verified) ? p.verified : [],
      };
    });
    const byDef = want => order.filter(id => P[id] && (Array.isArray(want) ? want.includes(P[id].defId) : P[id].defId === want));
    const checks = {}; const flatIssues = [];
    const A = (label, value) => ({ label, value: value == null || value === '' ? '—' : String(value) });
    const add = (slot, key, label, status, tip, a, b) => {
      (checks[slot] = checks[slot] || []).push({ key, label, status, tip, a: a || null, b: b || null });
      if (status === ERR) flatIssues.push({ level: 'err', msg: `${label} — ${tip}`, slots: [slot], slot, key });
      else if (status === WARN && !(P[slot] && P[slot].verified.includes(key))) flatIssues.push({ level: 'warn', msg: `${label} — ${tip}`, slots: [slot], slot, key });
    };
    const needDs = id => {
      if (P[id].hasDs) return false;
      add(id, 'datasheet', L('Datasheet', 'Datasheet'), WARN,
        L('Fiche technique absente — re-sélectionnez ce composant via Idealo pour la charger', 'Missing datasheet — re-select this part via Idealo to load it'),
        A(L('Datasheet', 'Datasheet'), L('absente', 'missing')), null);
      return true;
    };
    const mbId = byDef('mb')[0], cpuId = byDef('cpu')[0], ramId = byDef('ram')[0],
      coolerId = byDef('cooler')[0], gpuId = byDef('gpu')[0], caseId = byDef('case')[0], psuId = byDef('psu')[0];
    const mbHasDs = mbId && P[mbId].hasDs;
    const mbUsbA = (mbHasDs && P[mbId].ds.usbBack) ? (P[mbId].ds.usbBack.a || 0) : 0;
    const mbUsbC = (mbHasDs && P[mbId].ds.usbBack) ? (P[mbId].ds.usbBack.c || 0) : 0;
    const mbBt = mbHasDs ? (P[mbId].ds.bt || '') : '';
    const mbAudio = mbHasDs ? !!P[mbId].ds.audio : false;

    /* ---- CPU: socket + TDP (no chipset check) ---- */
    if (cpuId) {
      if (!needDs(cpuId)) {
        const C = P[cpuId].ds;
        const cpuSock = (C.sockets || []).join('/');
        if (!mbId) add(cpuId, 'socket', L('Socket', 'Socket'), NA, L('Carte mère absente', 'No motherboard'), A('Socket CPU', cpuSock || '?'), null);
        else if (!P[mbId].hasDs) add(cpuId, 'socket', L('Socket', 'Socket'), WARN, L('Datasheet CM absente — vérifiez', 'Missing board datasheet — verify'), A('Socket CPU', cpuSock || '?'), null);
        else {
          const M = P[mbId].ds, mbSock = (M.sockets || []).join('/');
          if (!cpuSock || !mbSock) add(cpuId, 'socket', L('Socket', 'Socket'), WARN, L(`Socket CPU ${cpuSock || '?'} / CM ${mbSock || '?'} — vérifiez`, `CPU socket ${cpuSock || '?'} / board ${mbSock || '?'} — verify`), A('Socket CPU', cpuSock || '?'), A('Socket CM', mbSock || '?'));
          else if (C.sockets.some(s => M.sockets.includes(s))) add(cpuId, 'socket', L('Socket', 'Socket'), OK, L(`Socket ${cpuSock} des deux côtés`, `Socket ${cpuSock} on both`), A('Socket CPU', cpuSock), A('Socket CM', mbSock));
          else add(cpuId, 'socket', L('Socket', 'Socket'), ERR, L(`CPU ${cpuSock} ≠ CM ${mbSock} !`, `CPU ${cpuSock} ≠ board ${mbSock}!`), A('Socket CPU', cpuSock), A('Socket CM', mbSock));
        }
        const tdp = C.tdp || 0;
        const mbMax = (mbId && P[mbId].hasDs) ? (P[mbId].ds.cpuMaxTdp || 0) : 0;
        if (!tdp) add(cpuId, 'tdp', 'TDP', WARN, L('TDP CPU non renseigné — vérifiez ventirad et carte mère', 'CPU TDP unknown — verify cooler and board'), A('TDP CPU', '?'), null);
        else if (mbMax && tdp > mbMax) add(cpuId, 'tdp', 'TDP', ERR, L(`CPU ${tdp}W > max CM ${mbMax}W !`, `CPU ${tdp}W > board max ${mbMax}W!`), A('TDP CPU', tdp + ' W'), A('Max CM', mbMax + ' W'));
        else if (mbMax) add(cpuId, 'tdp', 'TDP', OK, L(`CPU ${tdp}W ≤ max CM ${mbMax}W`, `CPU ${tdp}W ≤ board max ${mbMax}W`), A('TDP CPU', tdp + ' W'), A('Max CM', mbMax + ' W'));
        else add(cpuId, 'tdp', 'TDP', WARN, L(`CPU ${tdp}W — dissipation (ventirad/CM) à confirmer`, `CPU ${tdp}W — confirm cooling (cooler/board)`), A('TDP CPU', tdp + ' W'), null);
      }
    }
    /* ---- MB format vs case ---- */
    if (mbId && !needDs(mbId)) {
      const M = P[mbId].ds;
      const caseIds = byDef('case');
      if (!caseIds.length) add(mbId, 'format', L('Format', 'Form factor'), NA, L('Boîtier absent', 'No case'), A('Format CM', M.form || '?'), null);
      else if (!P[caseIds[0]].hasDs) add(mbId, 'format', L('Format', 'Form factor'), WARN, L('Datasheet boîtier absente — vérifiez', 'Missing case datasheet — verify'), A('Format CM', M.form || '?'), null);
      else {
        const C = P[caseIds[0]].ds;
        if (!M.form || !C.caseForms.length) add(mbId, 'format', L('Format', 'Form factor'), WARN, L(`CM ${M.form || '?'} / boîtier ${C.caseForms.join('/') || '?'} — vérifiez`, `Board ${M.form || '?'} / case ${C.caseForms.join('/') || '?'} — verify`), A('Format CM', M.form || '?'), A('Formats boîtier', C.caseForms.join('/') || '?'));
        else if (C.caseForms.includes(M.form)) add(mbId, 'format', L('Format', 'Form factor'), OK, L(`${M.form} supporté par le boîtier`, `${M.form} supported by the case`), A('Format CM', M.form), A('Formats boîtier', C.caseForms.join('/')));
        else add(mbId, 'format', L('Format', 'Form factor'), ERR, L(`${M.form} non supporté (${C.caseForms.join('/')}) !`, `${M.form} not supported (${C.caseForms.join('/')})!`), A('Format CM', M.form), A('Formats boîtier', C.caseForms.join('/')));
      }
    }
    /* ---- RAM vs motherboard (max speed + max capacity from MB datasheet) ---- */
    if (ramId && !needDs(ramId)) {
      const R = P[ramId].ds, rp = P[ramId].p;
      const sticks = R.ramSticks || (Number(rp.qty) || 1);
      const cap = R.ramCap || 0;
      const rSpeed = R.ramSpeed || R.ramSpeedMax || 0; // kit speed (same datasheet label as board max)
      if (!mbId) add(ramId, 'type', L('Type', 'Type'), NA, L('Carte mère absente', 'No motherboard'), A('Type RAM', R.ddr || '?'), null);
      else if (!P[mbId].hasDs) add(ramId, 'type', L('Type', 'Type'), WARN, L('Datasheet CM absente — vérifiez', 'Missing board datasheet — verify'), A('Type RAM', R.ddr || '?'), null);
      else {
        const M = P[mbId].ds;
        if (!R.ddr || !M.ddr) add(ramId, 'type', L('Type', 'Type'), WARN, L(`RAM ${R.ddr || '?'} / CM ${M.ddr || '?'} — vérifiez`, `RAM ${R.ddr || '?'} / board ${M.ddr || '?'} — verify`), A('Type RAM', R.ddr || '?'), A('Type CM', M.ddr || '?'));
        else if (R.ddr === M.ddr) add(ramId, 'type', L('Type', 'Type'), OK, L(`DDR commune : ${R.ddr}`, `Common DDR: ${R.ddr}`), A('Type RAM', R.ddr), A('Type CM', M.ddr));
        else add(ramId, 'type', L('Type', 'Type'), ERR, L(`RAM ${R.ddr} ≠ CM ${M.ddr} !`, `RAM ${R.ddr} ≠ board ${M.ddr} !`), A('Type RAM', R.ddr), A('Type CM', M.ddr));
        if (!rSpeed || !M.ramSpeedMax) add(ramId, 'speed', L('Vitesse', 'Speed'), WARN, L(`RAM ${rSpeed || '?'} / max CM ${M.ramSpeedMax || '?'} MHz — vérifiez (XMP/EXPO ?)`, `RAM ${rSpeed || '?'} / board max ${M.ramSpeedMax || '?'} MHz — verify (XMP/EXPO?)`), A('Vitesse RAM', (rSpeed || '?') + ' MHz'), A('Max CM', (M.ramSpeedMax || '?') + ' MHz'));
        else if (rSpeed <= M.ramSpeedMax) add(ramId, 'speed', L('Vitesse', 'Speed'), OK, L(`${rSpeed} ≤ max ${M.ramSpeedMax} MHz`, `${rSpeed} ≤ max ${M.ramSpeedMax} MHz`), A('Vitesse RAM', rSpeed + ' MHz'), A('Max CM', M.ramSpeedMax + ' MHz'));
        else add(ramId, 'speed', L('Vitesse', 'Speed'), WARN, L(`${rSpeed} > max ${M.ramSpeedMax} MHz — bridé / XMP requis`, `${rSpeed} > max ${M.ramSpeedMax} MHz — capped / XMP needed`), A('Vitesse RAM', rSpeed + ' MHz'), A('Max CM', M.ramSpeedMax + ' MHz'));
        if (!M.ramSlots) add(ramId, 'sticks', L('Barrettes', 'Sticks'), WARN, L(`${sticks} barrette(s), slots CM inconnus — vérifiez`, `${sticks} stick(s), unknown board slots — verify`), A('Barrettes', sticks), A('Slots CM', '?'));
        else if (sticks <= M.ramSlots) add(ramId, 'sticks', L('Barrettes', 'Sticks'), OK, L(`${sticks} ≤ ${M.ramSlots} slots`, `${sticks} ≤ ${M.ramSlots} slots`), A('Barrettes', sticks), A('Slots CM', M.ramSlots));
        else add(ramId, 'sticks', L('Barrettes', 'Sticks'), ERR, L(`${sticks} barrettes pour ${M.ramSlots} slots !`, `${sticks} sticks for ${M.ramSlots} slots!`), A('Barrettes', sticks), A('Slots CM', M.ramSlots));
        if (cap && M.ramCapMax) {
          if (cap <= M.ramCapMax) add(ramId, 'capacity', L('Capacité', 'Capacity'), OK, L(`${cap} ≤ max ${M.ramCapMax} Go`, `${cap} ≤ max ${M.ramCapMax} GB`), A('Total RAM', cap + ' Go'), A('Max CM', M.ramCapMax + ' Go'));
          else add(ramId, 'capacity', L('Capacité', 'Capacity'), ERR, L(`${cap} > max ${M.ramCapMax} Go !`, `${cap} > max ${M.ramCapMax} GB!`), A('Total RAM', cap + ' Go'), A('Max CM', M.ramCapMax + ' Go'));
        } else if (cap || M.ramCapMax) add(ramId, 'capacity', L('Capacité', 'Capacity'), WARN, L('Capacité max à confirmer', 'Confirm max capacity'), A('Total RAM', cap ? cap + ' Go' : '?'), A('Max CM', M.ramCapMax ? M.ramCapMax + ' Go' : '?'));
      }
    }
    /* ---- Cooler ---- */
    if (coolerId && !needDs(coolerId)) {
      const C = P[coolerId].ds;
      const srcSockets = [...((mbId && P[mbId].hasDs) ? P[mbId].ds.sockets || [] : []), ...((cpuId && P[cpuId].hasDs) ? P[cpuId].ds.sockets || [] : [])];
      const liquid = /liquide|liquid|watercooling|AIO/i.test(C.raw || '');
      if (!srcSockets.length) add(coolerId, 'socket', L('Socket', 'Socket'), NA, L('Ni CPU ni CM renseignés', 'No CPU or board data'), A('Supports', (C.sockets || []).join('/') || '?'), null);
      else if (!(C.sockets || []).length) add(coolerId, 'socket', L('Socket', 'Socket'), WARN, L('Sockets supportés non détectés — vérifiez', 'Supported sockets not detected — verify'), A('Supports', '?'), A('Socket', srcSockets.join('/')));
      else if (C.sockets.some(s => srcSockets.includes(s))) add(coolerId, 'socket', L('Socket', 'Socket'), OK, L(`Supporte ${srcSockets.join('/')} +`, `Supports ${srcSockets.join('/')} +`), A('Supports', C.sockets.join('/')), A('Socket', srcSockets.join('/')));
      else add(coolerId, 'socket', L('Socket', 'Socket'), ERR, L(`${(C.sockets || []).join('/')} ≠ ${srcSockets.join('/')} !`, `${(C.sockets || []).join('/')} ≠ ${srcSockets.join('/')}!`), A('Supports', (C.sockets || []).join('/')), A('Socket', srcSockets.join('/')));
      const caseIds = byDef('case');
      if (liquid) {
        if (!caseIds.length || !P[caseIds[0]].hasDs) add(coolerId, 'radiator', L('Radiateur', 'Radiator'), WARN, L('Watercooling : support boîtier à confirmer', 'Watercooling: confirm case support'), A('Radiateur', (C.radSize || '?') + ' mm'), null);
        else {
          const w = P[caseIds[0]].ds.watercool;
          if (w === true || /oui|yes/i.test(String(w))) add(coolerId, 'radiator', L('Radiateur', 'Radiator'), OK, L('Boîtier compatible watercooling', 'Watercooling-ready case'), A('Radiateur', (C.radSize || '?') + ' mm'), null);
          else add(coolerId, 'radiator', L('Radiateur', 'Radiator'), WARN, L('Support watercooling du boîtier à confirmer', 'Confirm case watercooling support'), A('Radiateur', (C.radSize || '?') + ' mm'), null);
        }
      } else if (!caseIds.length) add(coolerId, 'height', L('Hauteur', 'Height'), NA, L('Boîtier absent', 'No case'), A('Hauteur', (C.height || '?') + ' mm'), null);
      else if (!P[caseIds[0]].hasDs) add(coolerId, 'height', L('Hauteur', 'Height'), WARN, L('Datasheet boîtier absente — vérifiez', 'Missing case datasheet — verify'), A('Hauteur', (C.height || '?') + ' mm'), null);
      else {
        const H = P[caseIds[0]].ds.caseCoolerMax, h = C.height;
        if (!H || !h) add(coolerId, 'height', L('Hauteur', 'Height'), WARN, L(`Ventirad ${h || '?'} mm / max ${H || '?'} mm — vérifiez`, `Cooler ${h || '?'} mm / max ${H || '?'} mm — verify`), A('Hauteur', (h || '?') + ' mm'), A('Max boîtier', (H || '?') + ' mm'));
        else if (h <= H) add(coolerId, 'height', L('Hauteur', 'Height'), OK, L(`${h} ≤ ${H} mm`, `${h} ≤ ${H} mm`), A('Hauteur', h + ' mm'), A('Max boîtier', H + ' mm'));
        else add(coolerId, 'height', L('Hauteur', 'Height'), ERR, L(`${h} mm > max ${H} mm !`, `${h} mm > max ${H} mm!`), A('Hauteur', h + ' mm'), A('Max boîtier', H + ' mm'));
      }
    }
    /* ---- Drives ---- */
    const driveIds = order.filter(id => P[id] && (P[id].defId === 'ssd1' || P[id].defId === 'hdd'));
    const nvmeIds = driveIds.filter(id => {
      const D = P[id].ds, nm = P[id].p.name || '';
      return P[id].hasDs && !(/SATA/i.test(nm + ' ' + (D.raw || '')) && !/NVMe|M\.?\s?2|PCIe/i.test(nm + ' ' + (D.raw || '')));
    });
    driveIds.forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const D = P[id].ds, nm = P[id].p.name || '';
      const sataOnly = /SATA/i.test(nm + ' ' + (D.raw || '')) && !/NVMe|M\.?\s?2|PCIe/i.test(nm + ' ' + (D.raw || ''));
      if (sataOnly) {
        add(id, 'iface', L('Interface', 'Interface'), OK, L('SATA — ports standards', 'SATA — standard ports'), A('Interface', 'SATA'), null);
        if (/3[.,]5/.test(nm)) {
          const caseIds = byDef('case');
          if (!caseIds.length) add(id, 'bays', L('Baies', 'Bays'), NA, L('Boîtier absent', 'No case'), A('Format', '3,5"'), null);
          else if (!P[caseIds[0]].hasDs) add(id, 'bays', L('Baies', 'Bays'), WARN, L('Datasheet boîtier absente — vérifiez', 'Missing case datasheet — verify'), A('Format', '3,5"'), null);
          else if (!P[caseIds[0]].ds.bays35) add(id, 'bays', L('Baies', 'Bays'), WARN, L('Baies 3,5" du boîtier inconnues — vérifiez', 'Unknown case 3.5" bays — verify'), A('Format', '3,5"'), null);
          else add(id, 'bays', L('Baies', 'Bays'), OK, L('Baie 3,5" disponible', '3.5" bay available'), A('Format', '3,5"'), null);
        }
        return;
      }
      if (!mbId) add(id, 'iface', L('Interface', 'Interface'), NA, L('Carte mère absente', 'No motherboard'), A('Interface', 'NVMe'), null);
      else if (!P[mbId].hasDs) add(id, 'iface', L('Interface', 'Interface'), WARN, L('Datasheet CM absente — vérifiez le M.2', 'Missing board datasheet — verify M.2'), A('Interface', 'NVMe'), null);
      else add(id, 'iface', L('Interface', 'Interface'), OK, L('NVMe sur slot M.2', 'NVMe on M.2 slot'), A('Interface', 'NVMe'), null);
      const M = (mbId && P[mbId].hasDs) ? P[mbId].ds : null;
      const gEra = slotGen(M, mbId ? P[mbId].p.name : '');
      const dg = D.pcieGen || 0;
      if (!mbId) add(id, 'gen', L('Gen PCIe', 'PCIe gen'), NA, L('Carte mère absente', 'No motherboard'), A('Gen SSD', dg || '?'), null);
      else if (!dg || !gEra) add(id, 'gen', L('Gen PCIe', 'PCIe gen'), WARN, L(`SSD Gen${dg || '?'} / gen slot inconnue — vérifiez`, `SSD Gen${dg || '?'} / unknown slot gen — verify`), A('Gen SSD', dg || '?'), A('Gen slot', gEra || '?'));
      else if (dg <= gEra) add(id, 'gen', L('Gen PCIe', 'PCIe gen'), OK, L(`Gen${dg} ≤ Gen${gEra} du slot`, `Gen${dg} ≤ slot Gen${gEra}`), A('Gen SSD', dg), A('Gen slot', gEra));
      else add(id, 'gen', L('Gen PCIe', 'PCIe gen'), WARN, L(`Gen${dg} sur slot Gen${gEra} — bridé mais fonctionne`, `Gen${dg} on Gen${gEra} slot — capped but works`), A('Gen SSD', dg), A('Gen slot', gEra));
      if (M && M.m2count && nvmeIds.length > M.m2count) add(id, 'slots', L('Slots', 'Slots'), ERR, L(`${nvmeIds.length} NVMe pour ${M.m2count} slots !`, `${nvmeIds.length} NVMes for ${M.m2count} slots!`), A('NVMe', nvmeIds.length), A('Slots M.2', M.m2count));
      else if (nvmeIds.length > 1 && !(M && M.m2count)) add(id, 'slots', L('Slots', 'Slots'), WARN, L(`${nvmeIds.length} NVMe — nombre de slots M.2 à confirmer`, `${nvmeIds.length} NVMes — confirm M.2 slot count`), A('NVMe', nvmeIds.length), A('Slots M.2', '?'));
      else if (mbId) add(id, 'slots', L('Slots', 'Slots'), OK, L('Slot M.2 disponible', 'M.2 slot available'), A('NVMe', nvmeIds.length), null);
      const m2sz = D.m2size || D.length;
      if (m2sz && m2sz !== 80 && m2sz !== '2280') add(id, 'size', L('Format', 'Form factor'), WARN, L(`M.2 ${m2sz} — vérifiez le support boîtier/CM`, `M.2 ${m2sz} — verify board/case support`), A('Longueur', m2sz), null);
    });

    /* ---- GPU ---- */
    if (gpuId && !needDs(gpuId)) {
      const G = P[gpuId].ds;
      const gl = G.length || 0;
      const caseIds = byDef('case');
      if (!caseIds.length) add(gpuId, 'length', L('Longueur', 'Length'), NA, L('Boîtier absent', 'No case'), A('Longueur GPU', gl ? gl + ' mm' : '?'), null);
      else if (!P[caseIds[0]].hasDs) add(gpuId, 'length', L('Longueur', 'Length'), WARN, L('Datasheet boîtier absente — vérifiez', 'Missing case datasheet — verify'), A('Longueur GPU', gl ? gl + ' mm' : '?'), null);
      else {
        const Mx = P[caseIds[0]].ds.caseGpuMax || 0;
        if (!Mx || !gl) add(gpuId, 'length', L('Longueur', 'Length'), WARN, L(`GPU ${gl || '?'} mm / max ${Mx || '?'} mm — vérifiez`, `GPU ${gl || '?'} mm / max ${Mx || '?'} mm — verify`), A('Longueur GPU', gl ? gl + ' mm' : '?'), A('Max boîtier', Mx ? Mx + ' mm' : '?'));
        else if (gl <= Mx) add(gpuId, 'length', L('Longueur', 'Length'), OK, L(`${gl} ≤ ${Mx} mm`, `${gl} ≤ ${Mx} mm`), A('Longueur GPU', gl + ' mm'), A('Max boîtier', Mx + ' mm'));
        else add(gpuId, 'length', L('Longueur', 'Length'), ERR, L(`${gl} mm > max ${Mx} mm !`, `${gl} mm > max ${Mx} mm!`), A('Longueur GPU', gl + ' mm'), A('Max boîtier', Mx + ' mm'));
      }
      const Mb = (mbId && P[mbId].hasDs) ? P[mbId].ds : null;
      const gEra = slotGen(Mb, mbId ? P[mbId].p.name : '');
      const gg = G.pcieGen || 0;
      if (!mbId) add(gpuId, 'pcie', L('PCIe', 'PCIe'), NA, L('Carte mère absente', 'No motherboard'), A('Gen GPU', gg || '?'), null);
      else if (!gg || !gEra) add(gpuId, 'pcie', L('PCIe', 'PCIe'), WARN, L(`GPU Gen${gg || '?'} / slot Gen${gEra || '?'} — vérifiez`, `GPU Gen${gg || '?'} / slot Gen${gEra || '?'} — verify`), A('Gen GPU', gg || '?'), A('Gen slot', gEra || '?'));
      else if (gg <= gEra) add(gpuId, 'pcie', L('PCIe', 'PCIe'), OK, L(`Gen${gg} ≤ Gen${gEra}`, `Gen${gg} ≤ Gen${gEra}`), A('Gen GPU', gg), A('Gen slot', gEra));
      else add(gpuId, 'pcie', L('PCIe', 'PCIe'), WARN, L(`Gen${gg} sur slot Gen${gEra} — légèrement bridé`, `Gen${gg} on Gen${gEra} slot — slightly capped`), A('Gen GPU', gg), A('Gen slot', gEra));
      const pc = String(G.powConn || '');
      const need8 = /8/.test(pc) ? (pc.match(/8/g) || []).length : 0;
      const needH = /12VHPWR|12V-2x6/i.test(pc);
      const psuIds = byDef('psu');
      if (!need8 && !needH) add(gpuId, 'power', L('Alim', 'Power'), NA, L('Connecteurs GPU inconnus', 'Unknown GPU connectors'), A('Connecteur GPU', pc || '?'), null);
      else if (!psuIds.length) add(gpuId, 'power', L('Alim', 'Power'), NA, L('Alimentation absente', 'No PSU'), A('Connecteur GPU', pc || '?'), null);
      else if (!P[psuIds[0]].hasDs) add(gpuId, 'power', L('Alim', 'Power'), WARN, L('Datasheet alim absente — vérifiez les câbles (PCIe 8P / 12VHPWR)', 'Missing PSU datasheet — verify cables (PCIe 8P / 12VHPWR)'), A('Connecteur GPU', pc), null);
      else {
        const U = P[psuIds[0]].ds;
        const oc = String(U.otherConn || '');
        const u8 = (U.pcie8 || 0) + (oc.match(/8/g) || []).length;
        const uh = /12VHPWR|12V-2x6/i.test(oc);
        if (!u8 && !uh) add(gpuId, 'power', L('Alim', 'Power'), WARN, L('Câbles alim non détectés — vérifiez (PCIe 8P / 12VHPWR)', 'PSU cables not detected — verify (PCIe 8P / 12VHPWR)'), A('Connecteur GPU', pc), A('Câbles alim', '?'));
        else if ((needH && uh) || (need8 && u8 >= need8)) add(gpuId, 'power', L('Alim', 'Power'), OK, L('Connecteurs OK', 'Connectors OK'), A('Connecteur GPU', pc), A('Câbles alim', `${u8}×8P${uh ? ' + 12VHPWR' : ''}`));
        else if (need8 && uh) add(gpuId, 'power', L('Alim', 'Power'), WARN, L('Alim 12VHPWR uniquement — adaptateur vers 2×8P (souvent fourni avec le GPU)', '12VHPWR-only PSU — adapter to 2×8P (often bundled with GPU)'), A('Connecteur GPU', pc), A('Câbles alim', '12VHPWR'));
        else add(gpuId, 'power', L('Alim', 'Power'), ERR, L('Connecteurs insuffisants !', 'Insufficient connectors!'), A('Connecteur GPU', pc), A('Câbles alim', `${u8}×8P`));
      }
    }
    /* ---- Case mirrors (GPU/cooler caps) ---- */
    if (caseId && !needDs(caseId)) {
      const W = P[caseId].ds;
      if (gpuId && P[gpuId].hasDs) {
        const gl = P[gpuId].ds.length || 0, Mx = W.caseGpuMax || 0;
        if (!Mx || !gl) add(caseId, 'gpu', L('GPU max', 'Max GPU'), WARN, L('Longueurs à confirmer', 'Confirm lengths'), A('Max boîtier', Mx ? Mx + ' mm' : '?'), A('Longueur GPU', gl ? gl + ' mm' : '?'));
        else if (gl <= Mx) add(caseId, 'gpu', L('GPU max', 'Max GPU'), OK, L(`${Mx} ≥ ${gl} mm`, `${Mx} ≥ ${gl} mm`), A('Max boîtier', Mx + ' mm'), A('Longueur GPU', gl + ' mm'));
        else add(caseId, 'gpu', L('GPU max', 'Max GPU'), ERR, L(`${Mx} < ${gl} mm !`, `${Mx} < ${gl} mm!`), A('Max boîtier', Mx + ' mm'), A('Longueur GPU', gl + ' mm'));
      }
      if (coolerId && P[coolerId].hasDs && !/liquide|liquid|watercooling|AIO/i.test(P[coolerId].ds.raw || '')) {
        const h = P[coolerId].ds.height || 0, Mx = W.caseCoolerMax || 0;
        if (!Mx || !h) add(caseId, 'cooler', L('Ventirad max', 'Max cooler'), WARN, L('Hauteurs à confirmer', 'Confirm heights'), A('Max boîtier', Mx ? Mx + ' mm' : '?'), A('Hauteur', h ? h + ' mm' : '?'));
        else if (h <= Mx) add(caseId, 'cooler', L('Ventirad max', 'Max cooler'), OK, L(`${Mx} ≥ ${h} mm`, `${Mx} ≥ ${h} mm`), A('Max boîtier', Mx + ' mm'), A('Hauteur', h + ' mm'));
        else add(caseId, 'cooler', L('Ventirad max', 'Max cooler'), ERR, L(`${Mx} < ${h} mm !`, `${Mx} < ${h} mm!`), A('Max boîtier', Mx + ' mm'), A('Hauteur', h + ' mm'));
      }
    }
    /* ---- PSU wattage vs total ---- */
    if (psuId && !needDs(psuId)) {
      const cap = psuCapW(P[psuId].p, P[psuId].ds);
      let need = totals.watts || 0;
      if (!need) { // estimate from datasheets when fiche watts are empty
        const gw = (gpuId && P[gpuId].hasDs) ? (P[gpuId].ds.gpuW || P[gpuId].watts) : 0;
        const ct = (cpuId && P[cpuId].hasDs) ? (P[cpuId].ds.tdp || 0) : 0;
        if (gw || ct) need = Math.round(gw + ct + 120);
      }
      const n = byDef(['cpu', 'gpu']).reduce((s, id) => s + P[id].watts, 0);
      const head = cap ? Math.round(cap * 0.8) : 0;
      if (!cap) add(psuId, 'watt', L('Puissance', 'Wattage'), WARN, L('Puissance alim inconnue — vérifiez', 'Unknown PSU wattage — verify'), A('Alim', '?'), A('Besoin', need + ' W'));
      else if (need && need > cap) add(psuId, 'watt', L('Puissance', 'Wattage'), ERR, L(`${need}W > ${cap}W !`, `${need}W > ${cap}W!`), A('Alim', cap + ' W'), A('Besoin', need + ' W'));
      else if (n && n > head) add(psuId, 'watt', L('Puissance', 'Wattage'), WARN, L(`CPU+GPU ${n}W proches de ${cap}W — marge faible`, `CPU+GPU ${n}W close to ${cap}W — thin margin`), A('Alim', cap + ' W'), A('CPU+GPU', n + ' W'));
      else add(psuId, 'watt', L('Puissance', 'Wattage'), OK, L(`${cap}W suffisants`, `${cap}W sufficient`), A('Alim', cap + ' W'), A('Besoin', need + ' W'));
    }
    /* ---- Case fans ---- */
    const PC_PARTS = ['cpu', 'mb', 'ram', 'cooler', 'thermal', 'ssd1', 'hdd', 'gpu', 'case', 'psu', 'psucables', 'netcard', 'os', 'soft'];
    const isFanSlot = id => P[id] && (P[id].defId === 'fans' || (!PC_PARTS.includes(P[id].defId) && /ventilateur|fan/i.test(P[id].p.name || '')));
    const chassisFanIds = order.filter(id => isFanSlot(id) && isCaseFan(P[id].p.name + ' ' + (P[id].ds ? P[id].ds.raw || '' : '')));
    chassisFanIds.forEach(id => {
      if (!caseId || !P[caseId].hasDs) { add(id, 'mount', L('Montage', 'Mount'), WARN, L('Boîtier/datasheet à confirmer', 'Confirm case/datasheet'), A('Ventilateur', P[id].p.name || '?'), null); return; }
      add(id, 'mount', L('Montage', 'Mount'), OK, L('Ventilateur boîtier standard', 'Standard case fan'), A('Ventilateur', P[id].p.name || '?'), null);
    });
    /* ---- Fan headers on motherboard vs fans + cooler ---- */
    const liquidCooler = coolerId && P[coolerId].hasDs && /liquide|liquid|watercooling|AIO/i.test(P[coolerId].ds.raw || '');
    const radFans = liquidCooler && P[coolerId].ds.radSize ? Math.min(3, Math.max(1, Math.round(P[coolerId].ds.radSize / 120))) : 0;
    const needCpu = coolerId ? 1 : 0; // air fan or AIO pump on CPU_FAN/AIO_PUMP
    const needSys = chassisFanIds.length + radFans;
    const fanPillId = chassisFanIds[0] || coolerId;
    if (fanPillId && needSys + needCpu > 0) {
      if (!mbId || !P[mbId].hasDs) add(fanPillId, 'headers', L('Prises ventilateurs', 'Fan headers'), WARN, L('Prises ventilateurs CM inconnues — vérifiez', 'Unknown board fan headers — verify'), A('Ventilateurs', `${needSys} châssis${needCpu ? ' + ventirad' : ''}`), null);
      else {
        const fc = P[mbId].ds.fanCpu || 0, fs = P[mbId].ds.fanSys || 0;
        if (needCpu) {
          if (fc >= needCpu) add(fanPillId, 'cpuheader', L('Prise CPU_FAN', 'CPU_FAN header'), OK, L(`${fc} prise(s) CPU — ventirad branché`, `${fc} CPU header(s) — cooler connected`), A('Ventirad', '1× CPU_FAN'), A('Prises CPU CM', fc));
          else add(fanPillId, 'cpuheader', L('Prise CPU_FAN', 'CPU_FAN header'), WARN, L('Prises CPU_FAN CM inconnues — vérifiez', 'Unknown board CPU_FAN headers — verify'), A('Ventirad', '1× CPU_FAN'), A('Prises CPU CM', fc || '?'));
        }
        if (needSys) {
          if (fs >= needSys) add(fanPillId, 'sysheaders', L('Prises châssis', 'Chassis headers'), OK, L(`${needSys} ventilateur(s) ≤ ${fs} prise(s) châssis`, `${needSys} fan(s) ≤ ${fs} chassis header(s)`), A('Ventilateurs', needSys), A('Prises châssis CM', fs));
          else if (fs) add(fanPillId, 'sysheaders', L('Prises châssis', 'Chassis headers'), WARN, L(`${needSys} ventilateurs pour ${fs} prise(s) — splitter/hub requis`, `${needSys} fans for ${fs} header(s) — splitter/hub needed`), A('Ventilateurs', needSys), A('Prises châssis CM', fs));
          else add(fanPillId, 'sysheaders', L('Prises châssis', 'Chassis headers'), WARN, L('Prises châssis CM inconnues — vérifiez', 'Unknown board chassis headers — verify'), A('Ventilateurs', needSys), A('Prises châssis CM', '?'));
        }
      }
    }
    /* ---- USB devices vs backpanel ---- */
    const usbIds = order.filter(id => P[id] && isUsbDevice(P[id].p.name));
    if (usbIds.length && mbId && P[mbId].hasDs) {
      const back = P[mbId].ds.usbBack || { c: 0, a: 0 };
      const needC = usbIds.filter(id => isUsbCDevice(P[id].p.name)).length;
      const needA = usbIds.length - needC;
      usbIds.forEach((id, i) => {
        if (i > 0) return;
        const c = isUsbCDevice(P[id].p.name);
        const have = c ? back.c : back.a, need = c ? needC : needA;
        if (!have) add(id, 'usb', 'USB', WARN, L('Ports arrière CM inconnus — hub conseillé', 'Unknown board rear ports — hub advised'), A('Appareils USB', usbIds.length), A('Ports CM', '?'));
        else if (need <= have) add(id, 'usb', 'USB', OK, L(`${need} appareil(s) ≤ ${have} port(s)`, `${need} device(s) ≤ ${have} port(s)`), A('Appareils USB', need), A('Ports CM', have));
        else add(id, 'usb', 'USB', WARN, L(`${need} appareils pour ${have} ports — hub USB requis`, `${need} devices for ${have} ports — USB hub needed`), A('Appareils USB', need), A('Ports CM', have));
      });
    }
    /* ---- Router: LAN + SFP+ vs motherboard / switch ---- */
    const cardIds = [...new Set([
      ...byDef('soundcard'), ...byDef('capture'),
      ...order.filter(id => P[id] && !['soundcard', 'capture'].includes(P[id].defId) && /capture|acquisition|carte son|sound card|elgato|avermedia/i.test(P[id].p.name || '')),
    ])];
    const isExtCard = id => /usb|thunderbolt|externe|external/i.test((P[id].p.name || '') + ' ' + (P[id].hasDs ? P[id].ds.raw || '' : ''));
    const intCards = cardIds.filter(id => !isExtCard(id));
    const routerLanOf = id => {
      if (P[id].hasDs && P[id].ds.lan) return P[id].ds.lan;
      const rn = (P[id].p.name.match(/(\d+(?:[.,]\d+)?)\s*Gb/i) || [])[1];
      return rn ? parseFloat(String(rn).replace(',', '.')) : 1;
    };
    const routerIds = byDef('router');
    routerIds.forEach(id => {
      if (!mbId || !P[mbId].hasDs) { add(id, 'lan', 'LAN', NA, L('CM absente/datasheet manquante', 'No board / missing datasheet'), A('Routeur', P[id].p.name || '?'), null); return; }
      const lan = P[mbId].ds.lan || 0;
      const rlan = routerLanOf(id);
      if (!lan) add(id, 'lan', 'LAN', WARN, L('LAN CM inconnu — vérifiez', 'Unknown board LAN — verify'), A('Routeur', rlan + ' GbE'), A('LAN CM', '?'));
      else if (rlan >= lan) add(id, 'lan', 'LAN', OK, L(`Routeur ${rlan} GbE ≥ CM ${lan} GbE`, `Router ${rlan}GbE ≥ board ${lan}GbE`), A('Routeur', rlan + ' GbE'), A('LAN CM', lan + ' GbE'));
      else add(id, 'lan', 'LAN', WARN, L(`Routeur ${rlan} GbE < CM ${lan} GbE — lien bridé à ${rlan} GbE`, `Router ${rlan}GbE < board ${lan}GbE — link capped at ${rlan}GbE`), A('Routeur', rlan + ' GbE'), A('LAN CM', lan + ' GbE'));
      if (P[id].hasDs && P[id].ds.sfp) {
        const swSfp = byDef('switch').some(sid => P[sid].hasDs && P[sid].ds.sfp);
        if (swSfp) add(id, 'sfp', 'SFP+', OK, L('SFP+ routeur + switch — liaison fibre possible', 'Router + switch SFP+ — fiber uplink possible'), A('Routeur', 'SFP+'), A('Switch', 'SFP+'));
        else add(id, 'sfp', 'SFP+', WARN, L('SFP+ routeur sans switch SFP+ — port inutilisé', 'Router SFP+ without SFP+ switch — unused port'), A('Routeur', 'SFP+'), A('Switch', '?'));
      }
      if (P[id].hasDs && P[id].ds.wifiGen) add(id, 'wifi', 'WiFi', NA, L(`WiFi ${P[id].ds.wifiGen}${P[id].ds.wifiE ? 'E' : ''} — aucun client à comparer`, `WiFi ${P[id].ds.wifiGen}${P[id].ds.wifiE ? 'E' : ''} — no client to compare`), A('Routeur', `WiFi ${P[id].ds.wifiGen}${P[id].ds.wifiE ? 'E' : ''}`), null);
    });
    /* ---- Switch vs router LAN + fastest PC link (MB LAN / NIC) ---- */
    byDef('switch').forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const D = P[id].ds;
      const swTop = D.portSpeed || (D.rj45 ? 1 : 0);
      const swSfp = D.sfp || 0;
      const rLan = routerIds.length ? Math.max(...routerIds.map(rid => routerLanOf(rid))) : 0;
      const rSfp = routerIds.some(rid => P[rid].hasDs && P[rid].ds.sfp);
      const nicTop = Math.max(0, ...byDef('netcard').map(nid => (P[nid].hasDs ? (P[nid].ds.portSpeed || P[nid].ds.lan || 0) : 0)));
      const mbLan = (mbId && P[mbId].hasDs) ? (P[mbId].ds.lan || 0) : 0;
      if (swSfp && (rSfp || byDef('netcard').some(nid => P[nid].hasDs && P[nid].ds.sfp))) add(id, 'link', L('Liaison', 'Uplink'), OK, L('SFP+ des deux côtés — liaison 10G+ possible', 'SFP+ on both ends — 10G+ uplink possible'), A('Switch', `${swSfp}×SFP+`), A('Pair', 'SFP+'));
      if (!swTop) { add(id, 'ports', L('Ports', 'Ports'), WARN, L('Débit des ports switch inconnu — vérifiez (1/2,5/10 GbE ?)', 'Unknown switch port speed — verify (1/2.5/10 GbE?)'), A('Switch', D.rj45 ? `${D.rj45}×RJ45` : '?'), null); return; }
      const aSw = A('Switch', `${D.rj45 ? D.rj45 + '×' : ''}${swTop} GbE${swSfp ? ' + SFP+' : ''}`);
      if (rLan) {
        if (swTop >= rLan) add(id, 'router', L('Routeur', 'Router'), OK, L(`Switch ${swTop} ≥ routeur ${rLan} GbE`, `Switch ${swTop} ≥ router ${rLan}GbE`), aSw, A('Routeur', rLan + ' GbE'));
        else add(id, 'router', L('Routeur', 'Router'), WARN, L(`Switch ${swTop} < routeur ${rLan} GbE — lien bridé`, `Switch ${swTop} < router ${rLan}GbE — capped link`), aSw, A('Routeur', rLan + ' GbE'));
      }
      const pcTop = Math.max(mbLan, nicTop);
      if (pcTop) {
        if (swTop >= pcTop) add(id, 'pc', 'PC', OK, L(`Switch ${swTop} ≥ lien PC ${pcTop} GbE`, `Switch ${swTop} ≥ PC link ${pcTop}GbE`), aSw, A('Lien PC', pcTop + ' GbE'));
        else add(id, 'pc', 'PC', WARN, L(`Switch ${swTop} < lien PC ${pcTop} GbE — bridé`, `Switch ${swTop} < PC link ${pcTop}GbE — capped`), aSw, A('Lien PC', pcTop + ' GbE'));
      } else if (!rLan) add(id, 'ports', L('Ports', 'Ports'), WARN, L('Vitesses routeur/PC inconnues — vérifiez', 'Unknown router/PC speeds — verify'), aSw, null);
    });
    /* ---- Network card: PCIe slot (if internal) + link speed ---- */
    const usbNic = id => /usb|externe|external/i.test((P[id].p.name || '') + ' ' + (P[id].hasDs ? P[id].ds.raw || '' : ''));
    byDef('netcard').forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      if (!usbNic(id) && mbId && P[mbId].hasDs) {
        const M = P[mbId].ds;
        const usedX1 = cardIds.filter(cid => cid !== id && !isExtCard(cid)).length;
        const x1 = M.slotX1 || 0;
        if (x1 && usedX1 < x1) add(id, 'slot', L('Slot', 'Slot'), OK, L(`Slot PCIe x1 libre (${usedX1 + 1}/${x1})`, `Free PCIe x1 slot (${usedX1 + 1}/${x1})`), A('Carte', 'PCIe x1'), A('Slots x1 CM', x1));
        else if ((M.slotX16 || 0) > (gpuId ? 1 : 0) + cardIds.filter(cid => cid !== id && !isExtCard(cid) && !x1).length) add(id, 'slot', L('Slot', 'Slot'), OK, L('Carte x1 dans slot x16 libre (compatible)', 'x1 card in free x16 slot (compatible)'), A('Carte', 'PCIe x1'), A('Slots x16', 'libre'));
        else if (x1 || M.slotX16) add(id, 'slot', L('Slot', 'Slot'), ERR, L('Plus de slot PCIe libre !', 'No free PCIe slot left!'), A('Carte', 'PCIe x1'), A('Slots CM', `x16:${M.slotX16 || '?'} x1:${M.slotX1 || '?'}`));
        else add(id, 'slot', L('Slot', 'Slot'), WARN, L('Slot libre à confirmer', 'Confirm free slot'), A('Carte', P[id].p.name || '?'), A('Slots CM', '?'));
      } else if (!usbNic(id)) add(id, 'slot', L('Slot', 'Slot'), WARN, L('Slots CM à confirmer', 'Confirm board slots'), A('Carte', P[id].p.name || '?'), null);
      else if (mbUsbA > 0) add(id, 'slot', L('Slot', 'Slot'), OK, L(`Carte USB — ${mbUsbA} port(s) USB-A arrière`, `USB card — ${mbUsbA} rear USB-A port(s)`), A('Carte', 'USB'), A('USB-A arrière', mbUsbA));
      else add(id, 'slot', L('Slot', 'Slot'), WARN, L('Ports USB CM à confirmer', 'Confirm board USB ports'), A('Carte', 'USB'), null);
      const nicTop = P[id].ds.portSpeed || P[id].ds.lan || 0;
      const swTops = byDef('switch').filter(sid => P[sid].hasDs).map(sid => P[sid].ds.portSpeed || (P[sid].ds.rj45 ? 1 : 0));
      const swTop = swTops.length ? Math.max(...swTops) : 0;
      const mbLan = (mbId && P[mbId].hasDs) ? (P[mbId].ds.lan || 0) : 0;
      if (nicTop && swTop) {
        if (nicTop <= swTop) add(id, 'link', L('Débit', 'Speed'), OK, L(`Carte ${nicTop} ≤ switch ${swTop} GbE`, `NIC ${nicTop} ≤ switch ${swTop}GbE`), A('Carte', nicTop + ' GbE'), A('Switch', swTop + ' GbE'));
        else add(id, 'link', L('Débit', 'Speed'), WARN, L(`Carte ${nicTop} > switch ${swTop} GbE — bridée`, `NIC ${nicTop} > switch ${swTop}GbE — capped`), A('Carte', nicTop + ' GbE'), A('Switch', swTop + ' GbE'));
      } else if (nicTop && mbLan) {
        if (nicTop > mbLan) add(id, 'link', L('Débit', 'Speed'), OK, L(`Carte ${nicTop} > LAN CM ${mbLan} GbE — utile`, `NIC ${nicTop} > board LAN ${mbLan}GbE — useful`), A('Carte', nicTop + ' GbE'), A('LAN CM', mbLan + ' GbE'));
        else add(id, 'link', L('Débit', 'Speed'), WARN, L(`Carte ${nicTop} ≤ LAN CM ${mbLan} GbE — intérêt à confirmer`, `NIC ${nicTop} ≤ board LAN ${mbLan}GbE — confirm usefulness`), A('Carte', nicTop + ' GbE'), A('LAN CM', mbLan + ' GbE'));
      } else if (nicTop || swTop || mbLan) add(id, 'link', L('Débit', 'Speed'), WARN, L('Débits carte/switch/CM à confirmer', 'Confirm NIC/switch/board speeds'), A('Carte', nicTop ? nicTop + ' GbE' : '?'), A('Réseau', swTop ? swTop + ' GbE' : mbLan ? mbLan + ' GbE' : '?'));
    });
    /* ---- UPS vs total ---- */
    byDef('ups').forEach(id => {
      if (!needDs(id)) {
        const cap = upsCapW(P[id].p, P[id].ds, P[id].ds.raw);
        const need = totals.watts || 0;
        if (!cap) add(id, 'load', L('Charge', 'Load'), WARN, L('Puissance onduleur inconnue — vérifiez', 'Unknown UPS capacity — verify'), A('Onduleur', '?'), A('Besoin', need + ' W'));
        else if (need && need > cap) add(id, 'load', L('Charge', 'Load'), ERR, L(`${need}W > ~${cap}W !`, `${need}W > ~${cap}W!`), A('Onduleur', '~' + cap + ' W'), A('Besoin', need + ' W'));
        else add(id, 'load', L('Charge', 'Load'), OK, L(`~${cap}W suffisants`, `~${cap}W sufficient`), A('Onduleur', '~' + cap + ' W'), A('Besoin', need + ' W'));
      }
    });
    /* ---- PCIe capture/sound cards: internal (PCIe x1) vs external (USB) ---- */
    cardIds.forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const lbl = L('Slot', 'Slot');
      if (isExtCard(id)) {
        const cType = /usb[-\s]?c|thunderbolt/i.test((P[id].p.name || '') + ' ' + (P[id].ds.raw || '')) ? 'C' : 'A';
        const have = cType === 'C' ? mbUsbC : mbUsbA;
        if (!mbId || !P[mbId].hasDs) add(id, 'slot', lbl, WARN, L('Carte externe — ports USB CM à confirmer', 'External card — confirm board USB ports'), A('Carte', P[id].p.name || '?'), null);
        else if (have > 0) add(id, 'slot', lbl, OK, L(`Carte externe USB-${cType} — ${have} port(s) arrière`, `External USB-${cType} card — ${have} rear port(s)`), A('Carte', 'USB-' + cType), A(`USB-${cType} arrière`, have));
        else add(id, 'slot', lbl, WARN, L(`Carte externe USB-${cType} — ports arrière à confirmer`, `External USB-${cType} card — confirm rear ports`), A('Carte', 'USB-' + cType), A(`USB-${cType} arrière`, '?'));
        return;
      }
      if (!mbId || !P[mbId].hasDs) { add(id, 'slot', lbl, WARN, L('Slots CM à confirmer', 'Confirm board slots'), A('Carte', P[id].p.name || '?'), null); return; }
      const M = P[mbId].ds;
      const x1 = M.slotX1 || 0;
      const rank = intCards.indexOf(id); // 0-based among internal cards
      if (x1 && rank < x1) add(id, 'slot', lbl, OK, L(`Carte interne — slot PCIe x1 n°${rank + 1}/${x1} libre`, `Internal card — free PCIe x1 slot #${rank + 1}/${x1}`), A('Carte', 'PCIe x1'), A('Slots x1 CM', x1));
      else {
        const x16used = (gpuId ? 1 : 0) + Math.max(0, rank - x1);
        if ((M.slotX16 || 0) > x16used) add(id, 'slot', lbl, OK, L('Carte x1 dans slot x16 libre (compatible)', 'x1 card in free x16 slot (compatible)'), A('Carte', 'PCIe x1'), A('Slots x16 libres', (M.slotX16 || 0) - x16used));
        else if (x1 || M.slotX16) add(id, 'slot', lbl, ERR, L('Plus de slot PCIe libre pour cette carte !', 'No free PCIe slot left for this card!'), A('Carte', 'PCIe x1'), A('Slots CM', `x16:${M.slotX16 || '?'} x1:${M.slotX1 || '?'}`));
        else add(id, 'slot', lbl, WARN, L('Slot libre à confirmer (GPU + carte d’extension)', 'Confirm free slot (GPU + add-in card)'), A('Carte', P[id].p.name || '?'), A('Slots CM', '?'));
      }
    });
    /* ---- Screens vs video outputs (GPU, else motherboard iGPU) ---- */
    const fmtVid = v => {
      if (!v) return '?';
      const parts = [];
      if (v.hdmi) parts.push(`${v.hdmi}×HDMI`);
      if (v.dp) parts.push(`${v.dp}×DP`);
      if (v.usbc) parts.push(`${v.usbc}×USB-C`);
      return parts.length ? parts.join(' + ') : '?';
    };
    const screenIds = byDef('screen1');
    const srcDs = (gpuId && P[gpuId].hasDs) ? P[gpuId].ds : null;
    const mbDs = (mbId && P[mbId].hasDs) ? P[mbId].ds : null;
    const srcVid = srcDs ? srcDs.vid : null;
    const mbVid = mbDs ? mbDs.vid : null;
    const outVid = (srcVid && (srcVid.hdmi || srcVid.dp || srcVid.usbc)) ? srcVid : mbVid;
    const outDs = (srcVid && (srcVid.hdmi || srcVid.dp || srcVid.usbc)) ? srcDs : mbDs;
    const outName = (srcVid && (srcVid.hdmi || srcVid.dp || srcVid.usbc)) ? L('Sorties GPU', 'GPU outputs') : L('Sorties CM', 'Board outputs');
    screenIds.forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const SD = P[id].ds;
      const V = SD.vid;
      const hasIn = V && (V.hdmi || V.dp || V.usbc);
      const ins = V ? [V.hdmi && 'HDMI', V.dp && 'DP', V.usbc && 'USB-C'].filter(Boolean) : [];
      const hasOut = outVid && (outVid.hdmi || outVid.dp || outVid.usbc);
      let common = [];
      if (!hasIn) add(id, 'input', L('Entrée vidéo', 'Video input'), WARN, L('Entrées vidéo de l’écran inconnues — vérifiez le câble (HDMI/DP/USB-C)', 'Unknown monitor inputs — verify cable (HDMI/DP/USB-C)'), A('Entrées écran', '?'), hasOut ? A(outName, fmtVid(outVid)) : null);
      else if (!hasOut) add(id, 'input', L('Entrée vidéo', 'Video input'), WARN, L('Sorties vidéo GPU/CM inconnues — vérifiez', 'Unknown GPU/board outputs — verify'), A('Entrées écran', ins.join(' + ')), A(outName, '?'));
      else {
        common = ins.filter(k => (k === 'HDMI' && outVid.hdmi) || (k === 'DP' && outVid.dp) || (k === 'USB-C' && outVid.usbc));
        if (common.length) add(id, 'input', L('Entrée vidéo', 'Video input'), OK, L(`${common.join(' + ')} des deux côtés`, `${common.join(' + ')} on both ends`), A('Entrées écran', ins.join(' + ')), A(outName, fmtVid(outVid)));
        else add(id, 'input', L('Entrée vidéo', 'Video input'), WARN, L(`Écran ${ins.join(' + ')} ≠ ${fmtVid(outVid)} — adaptateur à prévoir`, `Monitor ${ins.join(' + ')} ≠ ${fmtVid(outVid)} — adapter needed`), A('Entrées écran', ins.join(' + ')), A(outName, fmtVid(outVid)));
      }
      /* port speed: hi-demand (res×Hz) needs HDMI 2.1 / DP 1.4 on both ends */
      const rw = SD.resWH, hz = SD.refresh || 0;
      const dem = (rw && hz) ? rw.w * rw.h * hz : 0;
      const hi = dem > 450000000;
      if (common.length && (hi || (SD.hdmiVer && outDs && outDs.hdmiVer) || (SD.dpVer && outDs && outDs.dpVer))) {
        const port = common.includes('DP') ? 'DP' : common.includes('HDMI') ? 'HDMI' : 'USB-C';
        if (port === 'USB-C') add(id, 'ver', L('Débit vidéo', 'Video speed'), OK, L('USB-C Alt Mode — débit suffisant', 'USB-C Alt Mode — enough bandwidth'), A('Écran', `${rw ? rw.w + '×' + rw.h : '?'}@${hz || '?'}Hz`), A(outName, 'USB-C'));
        else {
          const needV = port === 'HDMI' ? 2.1 : 1.4;
          const sV = port === 'HDMI' ? (SD.hdmiVer || 0) : (SD.dpVer || 0);
          const oV = outDs ? (port === 'HDMI' ? (outDs.hdmiVer || 0) : (outDs.dpVer || 0)) : 0;
          const fmtV = v => v || '?';
          if (sV && oV) {
            if (sV >= needV && oV >= needV) add(id, 'ver', L('Débit vidéo', 'Video speed'), OK, L(`${port} ${sV}/${oV} — suffisant pour ${rw.w}×${rw.h}@${hz}Hz`, `${port} ${sV}/${oV} — enough for ${rw.w}×${rw.h}@${hz}Hz`), A('Écran', `${port} ${sV}`), A(outName, `${port} ${oV}`));
            else add(id, 'ver', L('Débit vidéo', 'Video speed'), WARN, L(`${port} ${fmtV(sV)}/${fmtV(oV)} < ${needV} — ${rw.w}×${rw.h}@${hz}Hz bridé, vérifiez le câble`, `${port} ${fmtV(sV)}/${fmtV(oV)} < ${needV} — ${rw.w}×${rw.h}@${hz}Hz capped, verify cable`), A('Écran', `${port} ${fmtV(sV)}`), A(outName, `${port} ${fmtV(oV)}`));
          } else if (hi) add(id, 'ver', L('Débit vidéo', 'Video speed'), WARN, L(`${rw.w}×${rw.h}@${hz}Hz exige ${port} ${needV} des deux côtés — versions à confirmer`, `${rw.w}×${rw.h}@${hz}Hz needs ${port} ${needV} on both ends — confirm versions`), A('Écran', `${port} ${fmtV(sV)}`), A(outName, `${port} ${fmtV(oV)}`));
        }
      }
      /* resolution vs GPU max */
      const gpMax = srcDs ? srcDs.maxResWH : null;
      if (rw && gpMax) {
        if (rw.w * rw.h <= gpMax.w * gpMax.h) add(id, 'res', L('Résolution', 'Resolution'), OK, L(`${rw.w}×${rw.h} ≤ max GPU ${gpMax.w}×${gpMax.h}`, `${rw.w}×${rw.h} ≤ GPU max ${gpMax.w}×${gpMax.h}`), A('Écran', `${rw.w}×${rw.h}`), A('Max GPU', `${gpMax.w}×${gpMax.h}`));
        else add(id, 'res', L('Résolution', 'Resolution'), WARN, L(`${rw.w}×${rw.h} > max GPU ${gpMax.w}×${gpMax.h} !`, `${rw.w}×${rw.h} > GPU max ${gpMax.w}×${gpMax.h}!`), A('Écran', `${rw.w}×${rw.h}`), A('Max GPU', `${gpMax.w}×${gpMax.h}`));
      }
      if (screenIds.length > 1) {
        const outs = hasOut ? ((outVid.hdmi || 0) + (outVid.dp || 0) + (outVid.usbc || 0)) : 0;
        if (outs && screenIds.length > outs) add(id, 'count', L('Écrans', 'Monitors'), WARN, L(`${screenIds.length} écrans pour ~${outs} sortie(s) — MST/dock requis`, `${screenIds.length} monitors for ~${outs} output(s) — MST/dock needed`), A('Écrans', screenIds.length), A(outName, fmtVid(outVid)));
        else if (outs) add(id, 'count', L('Écrans', 'Monitors'), OK, L(`${screenIds.length} écran(s) pour ~${outs} sortie(s)`, `${screenIds.length} monitor(s) for ~${outs} output(s)`), A('Écrans', screenIds.length), A(outName, fmtVid(outVid)));
      }
    });
    /* ---- USB / wireless / audio peripherals vs motherboard ---- */
    const usbPeripherals = ['keyboard', 'mouse', 'pad', 'headset', 'speakers', 'webcam', 'graphictab', 'usbstick', 'extstorage'];
    usbPeripherals.forEach(defId => {
      byDef(defId).forEach(id => {
        if (!P[id].hasDs) { needDs(id); return; }
        const D = P[id].ds, W = D.wireless || {};
        const lbl = L('Connexion', 'Connection');
        const forceUsb = defId === 'pad' || defId === 'usbstick' || defId === 'extstorage';
        const needsUsb = forceUsb || W.rf || W.wired || (!W.bt && !W.wl && !D.jack && /usb/i.test(D.raw || ''));
        if (D.jack && (defId === 'headset' || defId === 'speakers')) {
          if (mbAudio) add(id, 'audio', lbl, OK, L('Jack 3,5 mm — audio CM intégrée', '3.5mm jack — onboard board audio'), A('Casque/enceintes', 'Jack 3,5 mm'), A('Audio CM', String(P[mbId].ds.audio || 'intégré')));
          else add(id, 'audio', lbl, WARN, L('Jack 3,5 mm — audio CM à confirmer', '3.5mm jack — confirm board audio'), A('Casque/enceintes', 'Jack 3,5 mm'), A('Audio CM', '?'));
          return;
        }
        if (W.bt) {
          if (mbBt) add(id, 'bt', lbl, OK, L(`Bluetooth des deux côtés (CM ${mbBt})`, `Bluetooth on both ends (board ${mbBt})`), A('Périphérique', 'Bluetooth' + (W.btVer ? ' ' + W.btVer : '')), A('Bluetooth CM', String(mbBt)));
          else add(id, 'bt', lbl, WARN, L('Bluetooth CM non détecté — dongle USB fourni avec le périphérique ?', 'Board Bluetooth not detected — USB dongle bundled?'), A('Périphérique', 'Bluetooth'), A('Bluetooth CM', '?'));
          return;
        }
        if (needsUsb || W.wl) {
          const what = W.rf ? L('Dongle 2,4 GHz (USB-A)', '2.4GHz dongle (USB-A)') : L('USB filaire (USB-A)', 'Wired USB (USB-A)');
          if (!mbId || !P[mbId].hasDs) add(id, 'usb', lbl, WARN, L('Ports USB arrière CM inconnus — vérifiez', 'Unknown board rear USB ports — verify'), A('Périphérique', what), null);
          else if (mbUsbA > 0) add(id, 'usb', lbl, OK, L(`${what} — ${mbUsbA} port(s) USB-A à l’arrière`, `${what} — ${mbUsbA} rear USB-A port(s)`), A('Périphérique', what), A('USB-A arrière', mbUsbA));
          else add(id, 'usb', lbl, WARN, L('Ports USB-A arrière CM inconnus — hub conseillé', 'Unknown board rear USB-A ports — hub advised'), A('Périphérique', what), A('USB-A arrière', '?'));
          if ((defId === 'webcam' || defId === 'extstorage') && mbId && P[mbId].hasDs) { // cable speed
            const uhd = defId === 'webcam' && /4k|uhd|2160/i.test((P[id].p.name || '') + ' ' + (D.raw || ''));
            const rs = defId === 'extstorage' ? (D.readSpeed || 0) : 0;
            const needSpd = defId === 'extstorage' ? (rs ? rs * 8 / 1000 : 5) : (uhd ? 5 : 0.48);
            const devLbl = defId === 'extstorage' ? (rs ? `${rs} Mo/s` : 'SSD/HDD externe') : (uhd ? '4K/UHD' : 'HD');
            const mbTop = P[mbId].ds.usbTop || 0;
            if (!mbTop) add(id, 'speed', L('Débit', 'Speed'), WARN, L(`Débit USB arrière CM inconnu — ${defId === 'extstorage' ? 'vérifiez (5-20 Gbps)' : uhd ? '4K exige ~5 Gbps' : 'vérifiez'}`, `Unknown board rear USB speed — ${defId === 'extstorage' ? 'verify (5-20 Gbps)' : uhd ? '4K needs ~5 Gbps' : 'verify'}`), A(defId === 'extstorage' ? 'Stockage' : 'Webcam', devLbl), A('USB CM', '?'));
            else if (mbTop >= needSpd) add(id, 'speed', L('Débit', 'Speed'), OK, L(`USB arrière ~${mbTop} Gbps — suffisant`, `Rear USB ~${mbTop} Gbps — enough`), A(defId === 'extstorage' ? 'Stockage' : 'Webcam', devLbl), A('USB CM', `~${mbTop} Gbps`));
            else add(id, 'speed', L('Débit', 'Speed'), WARN, L(`USB arrière ~${mbTop} Gbps < ~${Math.round(needSpd * 10) / 10} requis — bridé`, `Rear USB ~${mbTop} Gbps < ~${Math.round(needSpd * 10) / 10} needed — capped`), A(defId === 'extstorage' ? 'Stockage' : 'Webcam', devLbl), A('USB CM', `~${mbTop} Gbps`));
          }
          return;
        }
        add(id, 'conn', lbl, WARN, L('Connectivité non détectée dans la datasheet — vérifiez (USB/Bluetooth/Jack)', 'Connectivity not found in datasheet — verify (USB/Bluetooth/Jack)'), A('Périphérique', P[id].p.name || '?'), null);
      });
    });
    /* ---- Docking station: rear USB-C + uplink speed ---- */
    byDef('dock').forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      if (!mbId || !P[mbId].hasDs) add(id, 'link', L('Liaison', 'Uplink'), WARN, L('USB-C arrière CM inconnu — vérifiez', 'Unknown board rear USB-C — verify'), A('Station', 'USB-C/TB'), null);
      else if (mbUsbC > 0) add(id, 'link', L('Liaison', 'Uplink'), OK, L(`USB-C vers ${mbUsbC} port(s) arrière`, `USB-C to ${mbUsbC} rear port(s)`), A('Station', 'USB-C/TB'), A('USB-C arrière', mbUsbC));
      else add(id, 'link', L('Liaison', 'Uplink'), WARN, L('Pas d’USB-C arrière détecté sur la CM — vérifiez', 'No rear USB-C detected on board — verify'), A('Station', 'USB-C/TB'), A('USB-C arrière', '?'));
      if (mbId && P[mbId].hasDs) {
        const dTop = P[id].ds.usbTop || 0, mTop = P[mbId].ds.usbTop || 0;
        if (dTop && mTop) {
          if (dTop <= mTop) add(id, 'speed', L('Débit', 'Speed'), OK, L(`Station ~${dTop} ≤ CM ~${mTop} Gbps — plein débit`, `Dock ~${dTop} ≤ board ~${mTop} Gbps — full speed`), A('Station', `~${dTop} Gbps`), A('USB-C CM', `~${mTop} Gbps`));
          else add(id, 'speed', L('Débit', 'Speed'), WARN, L(`Station ~${dTop} > CM ~${mTop} Gbps — bridée à ~${mTop}`, `Dock ~${dTop} > board ~${mTop} Gbps — capped at ~${mTop}`), A('Station', `~${dTop} Gbps`), A('USB-C CM', `~${mTop} Gbps`));
        } else if (dTop || mTop) add(id, 'speed', L('Débit', 'Speed'), WARN, L('Débit station/CM à confirmer (Thunderbolt/USB 5-40 Gbps)', 'Confirm dock/board speed (Thunderbolt/USB 5-40 Gbps)'), A('Station', dTop ? `~${dTop} Gbps` : '?'), A('USB-C CM', mTop ? `~${mTop} Gbps` : '?'));
      }
    });
    /* ---- SD / microSD card vs case or dock reader ---- */
    byDef('memcard').forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const cR = caseId && P[caseId].hasDs && P[caseId].ds.cardReader ? 'case' : null;
      const dR = byDef('dock').find(did => P[did].hasDs && P[did].ds.cardReader) ? 'dock' : null;
      const where = cR && dR ? L('Boîtier + dock', 'Case + dock') : cR ? L('Boîtier', 'Case') : dR ? 'Dock' : null;
      if (where) add(id, 'reader', L('Lecteur', 'Reader'), OK, L(`Lecteur SD : ${where}`, `SD reader: ${where}`), A('Carte', 'SD/microSD'), A('Lecteur', where));
      else if (mbUsbA > 0) add(id, 'reader', L('Lecteur', 'Reader'), WARN, L('Pas de lecteur SD détecté (boîtier/dock) — adaptateur USB requis', 'No SD reader detected (case/dock) — USB adapter needed'), A('Carte', 'SD/microSD'), A('Lecteur', '?'));
      else add(id, 'reader', L('Lecteur', 'Reader'), WARN, L('Lecteur SD à confirmer (boîtier/dock/adaptateur USB)', 'Confirm SD reader (case/dock/USB adapter)'), A('Carte', 'SD/microSD'), A('Lecteur', '?'));
    });
    /* ---- slot worst-status map ---- */
    const statusOf = {};
    order.forEach(id => {
      const arr = checks[id] || [];
      const vis = arr.filter(c => !(c.status === WARN && P[id] && P[id].verified.includes(c.key)));
      const eff = vis.map(c => c.status);
      statusOf[id] = eff.includes(ERR) ? ERR : vis.length < arr.length && !eff.length ? CHECKED : eff.includes(WARN) ? WARN : vis.length ? OK : undefined;
      if (vis.length < arr.length && eff.includes(ERR)) statusOf[id] = ERR;
      else if (vis.length < arr.length && eff.includes(WARN)) statusOf[id] = WARN;
      else if (vis.length < arr.length) statusOf[id] = CHECKED;
    });
    const issues = { err: flatIssues.filter(i => i.level === 'err'), warn: flatIssues.filter(i => i.level === 'warn') };
    return { checks, issues, statusOf };
  }

  /* Legacy shim: name-based wattage hint for the fiche editor (datasheet text may be absent). */
  function parse(defId, name, specs) {
    const m = String(name || '').match(/(\d{3,4})\s*W\b/i);
    return { capW: m ? parseInt(m[1], 10) : 0 };
  }

  return { check, parseDatasheet, parse, OK, WARN, ERR, NA, CHECKED };
})();
