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
  const KWH_PRICE = 0.2001; // € TTC/kWh, France Base 6kVA (CRE grid 01/08/2026)
  const HOURS_DAY = 4;      // daily full-load hypothesis for cost display
  const EFF80 = { titanium: .92, platinum: .90, gold: .87, silver: .85, bronze: .82, none: .75 };
  const EFF80LBL = { titanium: 'Titanium', platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze', none: '—' };

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
    ['nombre de threads', 'cpuThreads', 'num'], ['number of threads', 'cpuThreads', 'num'],
    ['thread count', 'cpuThreads', 'num'], ['threads', 'cpuThreads', 'num'],
    ['nombre de cœurs', 'cpuCores', 'num'], ["nombre de coeurs", 'cpuCores', 'num'],
    ['number of cores', 'cpuCores', 'num'], ['core count', 'cpuCores', 'num'], ['cœurs', 'cpuCores', 'num'],
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
    ['capacité mémoire', 'ramCap', 'num'], ['capacité de mémoire', 'ramCap', 'num'], ['mémoire vidéo', 'ramCap', 'num'], ['taille mémoire', 'ramCap', 'num'], ['memory capacity', 'ramCap', 'num'], ['memory size', 'ramCap', 'num'], ['video memory', 'ramCap', 'num'],
    ['configuration', 'ramConfig', 'raw'],
    ['hauteur', 'height', 'num'], ['height', 'height', 'num'],
    ['tension', null, null], ['voltage', null, null],
    ['puissance de refroidissement max', 'tdp', 'num'], ['capacité de refroidissement', 'tdp', 'num'],
    ['cooling capacity', 'tdp', 'num'], ['puissance frigorifique', 'tdp', 'num'],
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
    ['standards ethernet', 'lan', 'lan'], ['standard ethernet', 'lan', 'lan'], ['standard lan', 'lan', 'lan'],
    ['ethernet standard', 'lan', 'lan'], ['ethernet', 'lan', 'lan'], ['network', 'lan', 'lan'],
    ['standard wi-fi', 'wifiStd', 'raw'], ['standard wifi', 'wifiStd', 'raw'],
    ['norme wi-fi', 'wifiStd', 'raw'], ['norme wifi', 'wifiStd', 'raw'],
    ['connecteurs vidéo', 'vid', 'vidports'], ['connecteurs vidéos', 'vid', 'vidports'], ['connecteurs video', 'vid', 'vidports'],
    ['sorties vidéo', 'vid', 'vidports'], ['sorties vidéos', 'vid', 'vidports'], ['sorties video', 'vid', 'vidports'],
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
    ['tbp', 'gpuW', 'num'], ['board power', 'gpuW', 'num'], ['power draw', 'gpuW', 'num'],
    ['consommation électrique', 'gpuW', 'num'], ['puissance carte', 'gpuW', 'num'],
    ['leistungsaufnahme', 'gpuW', 'num'], ['graphics power', 'gpuW', 'num'],
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
    ['longueur max. de l\u2019alimentation', 'casePsuMax', 'num'], ["longueur max. de l'alimentation", 'casePsuMax', 'num'],
    ['longueur max. bloc d\u2019alimentation', 'casePsuMax', 'num'], ['longueur maxi alimentation', 'casePsuMax', 'num'],
    ['max psu length', 'casePsuMax', 'num'], ['psu max length', 'casePsuMax', 'num'],
    ['place pour l\u2019alimentation', 'casePsuMax', 'num'], ['room for power supply', 'casePsuMax', 'num'],
    ['dimensions', 'dims', 'dims'], ['dimension', 'dims', 'dims'],
    ['dimensions (l x w x h)', null, null], ['taille (l x w x h)', 'dims', 'dims'], ['size', 'dims', 'dims'],
    ['mesures', 'dims', 'dims'], ['measurements', 'dims', 'dims'], ['largura', null, null], ['tiefe', null, null],
    ['slots', 'caseSlots', 'num'],
    ['refroidissement par eau', 'watercool', 'flag'], ['liquid cooling', 'watercool', 'flag'], ['water cooling', 'watercool', 'flag'],
    ['radiateurs supportés', 'caseRads', 'radlist'], ['radiator support', 'caseRads', 'radlist'],
    ['emplacements radiateur', 'caseRads', 'radlist'], ['radiateur supporté', 'caseRads', 'radlist'],
    ['connecteurs pci-e (8 broches)', 'pcie8', 'num'], ['pci-e 8-pin connectors', 'pcie8', 'num'],
    ['autres connecteurs', 'otherConn', 'raw'],
    ['puissance continue', 'capW', 'num'],
    ['certification 80 plus', 'cert80', 'raw'], ['certification 80+', 'cert80', 'raw'],
    ['80 plus', 'cert80', 'raw'], ['80+', 'cert80', 'raw'],
    ['efficacité', 'cert80', 'raw'], ['efficiency', 'cert80', 'raw'], ['rendement', 'cert80', 'raw'],
    ['nombre de ventilateurs', 'fanCount', 'num'], ['number of fans', 'fanCount', 'num'],
    ['ventilateurs préinstallés', 'fanCount', 'num'], ['preinstalled fans', 'fanCount', 'num'],
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
        else if (field === 'height') P[field] = nums.length ? Math.max(P[field] || 0, nums[0]) : (P[field] || 0); // tallest (with fans) wins
        else P[field] = nums.length ? nums[0] : 0;
        continue;
      }
      if (kind === 'radlist') { P.caseRads = [...new Set([...(P.caseRads || []), ...ints(val, 120, 480)])]; continue; }
      if (kind === 'dims') {
        const ds2 = val.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/);
        if (ds2) {
          const nums2 = [parseFloat(ds2[1].replace(',', '.')), parseFloat(ds2[2].replace(',', '.')), parseFloat(ds2[3].replace(',', '.'))];
          if (nums2.every(n => n >= 40 && n <= 800)) P.dims = nums2;
        }
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
          if (/ps\/2/i.test(part)) return; // keyboard/mouse legacy port, not USB
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
        let m = v.match(/(\d+)\s*(?:x\s*)?ventilateurs?\s*processeur|(\d+)\s*(?:x\s*)?cpu\s*fans?|(\d+)\s*(?:x\s*)?cpu[_\s-]?fan\b|(\d+)\s*(?:x\s*)?cpu[_\s-]?opt/i);
        if (m) P.fanCpu = Math.max(P.fanCpu || 0, parseInt(m[1] || m[2] || m[3] || m[4], 10));
        m = v.match(/(\d+)\s*(?:x\s*)?(?:bo[iî]tiers?\s*de\s*ventilation|ventilateurs?\s*(?:bo[iî]tier|ch[aâ]ssis)|system\s*fans?|chassis\s*fans?|case\s*fans?|cha[_\s-]?fan|sys[_\s-]?fan|case[_\s-]?fan)/i);
        if (m) P.fanSys = Math.max(P.fanSys || 0, parseInt(m[1], 10));
        m = v.match(/(\d+)\s*(?:x\s*)?(?:aio[_\s-]?pump|pump[_\s-]?fan|w[_\s-]?pump)/i);
        if (m) P.pump = Math.max(P.pump || 0, parseInt(m[1], 10));
        m = v.match(/(\d+)\s*(?:x\s*)?cpu[_\s-]?opt/i);
        if (m) P.cpuOpt = Math.max(P.cpuOpt || 0, parseInt(m[1], 10));
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
    /* Screen energy → watts (label-agnostic): direct W > kWh/1000h > kWh/year (÷1460h) > €/year (÷0.2001€, ÷1460h). */
    {
      const eTest = ln => /kwh|\bwh\b|€|\beuro\b|consommation|consumption|classe|class|énergie|energy|électrique|electric|power|puissance/i.test(low(ln));
      const eL = [];
      for (let i = 0; i < lines.length; i++) {
        const pair = lines[i] + ' ' + (lines[i + 1] || ''); // label and value may sit on two lines
        if (eTest(lines[i]) || eTest(lines[i + 1] || '')) eL.push(pair);
      }
      let w = 0, src = '';
      for (const ln of eL) {
        const l = low(ln);
        if (/kwh/.test(l)) continue;
        const m = l.match(/(\d+(?:[.,]\d+)?)\s*w(?:atts?)?\b/);
        if (m && /conso|consumption|énergie|energy|électrique|electric|power|puissance/i.test(l)) { w = parseFloat(m[1].replace(',', '.')); src = 'W'; break; }
      }
      if (!w) for (const ln of eL) {
        const m = low(ln).match(/(\d+(?:[.,]\d+)?)\s*kwh\s*\/\s*1000\s*h/);
        if (m) { w = parseFloat(m[1].replace(',', '.')); src = 'kWh/1000h'; break; }
      }
      if (!w) for (const ln of eL) {
        const m = low(ln).match(/(\d+(?:[.,]\d+)?)\s*kwh\s*\/\s*(an|année|year)/);
        if (m) { w = Math.round(parseFloat(m[1].replace(',', '.')) * 1000 / 1460); src = 'kWh/an'; break; }
      }
      if (!w) for (const ln of eL) {
        const l = low(ln);
        const m = l.match(/(\d+(?:[.,]\d+)?)\s*€|(\d+(?:[.,]\d+)?)\s*euro/);
        if (m && /\/\s*(an|année|year)|par an|per year/.test(l)) {
          const eur = parseFloat((m[1] || m[2]).replace(',', '.'));
          if (eur > 0) { w = Math.round(eur / KWH_PRICE * 1000 / 1460); src = '€/an'; }
          break;
        }
      }
      if (w > 0) { P.screenW = w; P.screenWSrc = src; }
    }
    /* Network + jack scan on raw lines (value-first layouts: "8 x RJ45", "SFP+", "Jack 3,5 mm"). */
    for (const ln of lines) {
      const l = low(ln);
      /* Drive form factor: M.2 (unambiguous keywords) or 2.5"/3.5" (needs size words). */
      if (/m\.?\s?2|2280|2260|2242|2230|22110|\bnvme\b|\bpcie\b/.test(l) && /pouces|inch|format|facteur|dimensions?|taille|largeur|width|hauteur|height|longueur|length|profondeur|depth|épaisseur|thickness|baie|bay|interface|protocole|bus|disque|drive|hdd|ssd|stockage|storage/.test(l)) P.driveFF = 'M2';
      else if ((/2[.,]5/.test(l) || /3[.,]5/.test(l)) && /pouces|inch|"|disque|drive|hdd|ssd|stockage|storage|baie|bay/.test(l)) {
        if (/2[.,]5/.test(l)) P.driveFF = P.driveFF || '2.5';
        else P.driveFF = P.driveFF || '3.5';
      }
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
      if (!P.wifiGen && P.wifiStd) {
        const wm = String(P.wifiStd).match(/(\d)/);
        if (wm) { P.wifiGen = parseInt(wm[1], 10); if (/6e/i.test(P.wifiStd)) P.wifiE = true; }
      }
      if (/connect|entrées|entrees|audio|jack|casque/.test(l) && /jack|3[.,]5\s?mm/.test(l)) P.jack = true;
      if (/daisy[\s-]?chain/i.test(l)) P.daisy = true; // fans linkable in series on one header
      /* RGB headers (3-pin ARGB vs 4-pin RGB) — only header-worded lines with counts. */
      if (/rgb/.test(l) && (/connecteur|header|prise|broche|pin|embase/i.test(ln) || /(\d+)\s*x\s*.rgb/i.test(l))) {
        const parts = l.split(/[,;+]/);
        parts.forEach(part => {
          let n = 1;
          const m = part.match(/(\d+)\s*x\b/i);
          if (m) n = parseInt(m[1], 10);
          if (/(^|[^a-z])a[\s-]?rgb|adressable|addressable|3\s*broches|3\s*pin|5v/i.test(part)) P.argb = (P.argb || 0) + n;
          else if (/rgb|led/i.test(part)) P.rgb4 = (P.rgb4 || 0) + n;
        });
      }
    }
    /* Front-panel USB-C (single line or split across two lines) needs an internal header. */
    for (let li = 0; li < lines.length; li++) {
      const pair = lines[li] + ' ' + (lines[li + 1] || '');
      if (/façade|facade|front|avant/i.test(pair) && /usb[-\s]?c|type.?c|thunderbolt/i.test(pair)) { P.frontUsbC = true; break; }
    }
    P.raw = String(dsText || '').slice(0, 6000); // keyword fallback (liquid cooling, SATA…)
    /* Standalone "Bluetooth X" lines land in P.bt, not wireless: merge them. */
    if (P.bt && !(P.wireless && P.wireless.bt)) {
      P.wireless = P.wireless || {};
      P.wireless.bt = true;
      const bmv = String(P.bt).match(/(\d+(?:[.,]\d+)?)/);
      if (bmv && !P.wireless.btVer) P.wireless.btVer = bmv[1];
    }
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
  function isUsbCDevice(text) { return /USB[-\s]?C(?![a-z])|Type[-\s]?C(?![a-z])|thunderbolt/i.test(String(text || '')); }
  /* Slot generation, datasheet-first: the board's own "Versions PCIe" list,
     with socket/chipset-era guessing only as fallback. */
  function slotGen(M, mbName) {
    if (M && Array.isArray(M.pcieVers) && M.pcieVers.length) return Math.max(...M.pcieVers);
    const soc = M ? (M.sockets || []) : [];
    return socketEraGen(soc, chipsetOf(M || {}, mbName));
  }
  /* Slot-count from thickness when not stated: 2→40.6mm, 2.5→50.8, 3→61.0, 3.5→71.1, 4→81.3. */
  function slotsFromMm(h) {
    h = Number(h) || 0;
    if (!h) return 0;
    if (h <= 45) return 2;
    if (h <= 55) return 2.5;
    if (h <= 66) return 3;
    if (h <= 76) return 3.5;
    return 4;
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
  /* CPU peak factor by brand/segment (bequiet-style peak methodology, local model).
     AMD PPT is officially ~1.35×TDP; Intel mobile runs near base; Intel desktop
     turbos ~1.5× (unlocked K/KF/KS/X ~2×). Detection order matters (HX before K). */
  function cpuPeakFactor(name) {
    const t = String(name || '');
    if (/amd|ryzen|epyc|threadripper|athlon/i.test(t)) return { factor: 1.35, key: 'AMD' };
    if (/intel|core [iu]|xeon|pentium|celeron/i.test(t)) {
      const m = t.match(/(\d{3,5})\s?([A-Z]{1,3})\b/);
      const suf = m ? m[2].toUpperCase() : '';
      if (['U', 'H', 'HX', 'P', 'N', 'Y', 'G7', 'G4', 'G1', 'M', 'E', 'HK', 'HQ'].includes(suf)) return { factor: 1.0, key: 'laptop' };
      if (['K', 'KF', 'KS', 'X', 'XE'].includes(suf)) return { factor: 2.0, key: 'K' };
      return { factor: 1.5, key: 'Intel' };
    }
    return { factor: 1.35, key: '×1,35' };
  }
  /* 80+ level from PSU name + datasheet text → {level, label, factor}. */
  function psuCertLevel(p, P) {
    const t = `${p.name || ''} ${P.cert80 || ''} ${P.raw || ''}`.toLowerCase();
    if (/titanium|titane/.test(t)) return { level: 'titanium', label: 'Titanium' };
    if (/platinum|platine/.test(t)) return { level: 'platinum', label: 'Platinum' };
    if (/\bgold\b|\bor\b/.test(t)) return { level: 'gold', label: 'Gold' };
    if (/silver|argent/.test(t)) return { level: 'silver', label: 'Silver' };
    if (/bronze/.test(t)) return { level: 'bronze', label: 'Bronze' };
    if (/80\s*plus|80\+/.test(t)) return { level: 'bronze', label: '80 PLUS' };
    return { level: 'none', label: '—' };
  }
  function upsCapW(p, P, text) {
    if (Number(p.capW) > 0) return Number(p.capW);
    if (P.capW) return P.capW;
    const m = String(text || '').match(/(\d[\d\s]*)\s*VA\b/i);
    if (m) return Math.round(fnum(m[1]) * 0.6);
    return 0;
  }

  /* ---------------- Layer 3: power calculator (bequiet-style peak methodology) ----------------
     Single source of truth for watts: used by check() pills AND the Power pane.
     CPU = TDP×1.35 peak · GPU = datasheet TBP (else fiche/default) · fixed per-device rules.
     Screens excluded from PSU total, included in UPS total + plug count. */
  function powerBreakdown(ctx) {
    const { order, slots, sel, def, lang } = ctx;
    const L = (fr, en) => (lang === 'en' ? en : fr);
    const P = {};
    order.forEach(id => {
      const s = slots[id]; if (!s) return;
      const p = sel(s); if (!p) return;
      const dst = String((p.datasheet || '')).trim();
      P[id] = { slot: s, p, defId: s.defId, hasDs: !!dst,
        ds: dst ? parseDatasheet(dst) : null,
        qty: Math.max(1, Number(p.qty) || 1) };
    });
    const byDef = want => order.filter(id => P[id] && (Array.isArray(want) ? want.includes(P[id].defId) : P[id].defId === want));
    const defW = id => { try { const d = def ? def(P[id].slot) : null; return (d && Number(d.w)) || 0; } catch { return 0; } };
    const items = [];
    const push = (id, w, parts, opts) => {
      w = Math.round((Number(w) || 0) * 10) / 10;
      if (!(w > 0)) return null;
      const it = { id, defId: P[id].defId, name: P[id].p.name || '', w,
        parts: (parts || []).filter(x => x.w > 0),
        psu: !(opts && opts.psu === false), ups: !(opts && opts.ups === false) };
      items.push(it);
      return it;
    };
    const sataTest = (nm, raw) => /SATA/i.test(String(nm || '') + ' ' + String(raw || '')) && !/NVMe|M\.?\s?2|PCIe/i.test(String(nm || '') + ' ' + String(raw || ''));
    const PC_PARTS_L = ['cpu', 'mb', 'ram', 'cooler', 'thermal', 'ssd1', 'hdd', 'gpu', 'case', 'psu', 'psucables', 'netcard', 'os', 'soft'];
    const isFanSlotL = id => P[id] && (P[id].defId === 'fans' || (!PC_PARTS_L.includes(P[id].defId) && /ventilateur|fan/i.test(P[id].p.name || '')));
    const chassisFanIds = order.filter(id => isFanSlotL(id) && isCaseFan(P[id].p.name + ' ' + (P[id].ds ? P[id].ds.raw || '' : '')));
    const cardIds = [...new Set([
      ...byDef('soundcard'), ...byDef('capture'),
      ...order.filter(id => P[id] && !['soundcard', 'capture'].includes(P[id].defId) && /capture|acquisition|carte son|sound card|elgato|avermedia/i.test(P[id].p.name || '')),
    ])];
    const isExtCard = id => /usb|thunderbolt|externe|external/i.test((P[id].p.name || '') + ' ' + (P[id].hasDs ? P[id].ds.raw || '' : ''));
    const intCards = cardIds.filter(id => !isExtCard(id) && P[id].hasDs);
    const usbNicTest = id => /usb|externe|external/i.test((P[id].p.name || '') + ' ' + (P[id].hasDs ? P[id].ds.raw || '' : ''));
    const intNicIds = byDef('netcard').filter(nid => P[nid].hasDs && !usbNicTest(nid));
    const uhdTest = txt => /4k|uhd|2160/i.test(String(txt || ''));
    const usbW = txt => {
      const t = String(txt || '');
      if (/usb[-\s]?c|type.?c|thunderbolt|usb4/i.test(t)) return { w: 15, lbl: 'USB-C' };
      if (/usb\s*3|usb3|gen\s*[12]|superspeed|usb\s*[35]\.\d/i.test(t)) return { w: 5, lbl: 'USB 3' };
      return { w: 2.5, lbl: 'USB 2' };
    };
    const mbId = byDef('mb')[0], cpuId = byDef('cpu')[0], ramId = byDef('ram')[0],
      coolerId = byDef('cooler')[0], gpuId = byDef('gpu')[0], psuId = byDef('psu')[0];
    /* CPU */
    if (cpuId) {
      const C = P[cpuId].ds, tdp = C ? (C.tdp || 0) : 0;
      if (tdp) {
        const pf = cpuPeakFactor(P[cpuId].p.name);
        const peak = Math.round(tdp * pf.factor);
        const fs = String(pf.factor).replace('.', ',');
        push(cpuId, peak, [{ label: L(`Pic CPU (TDP×${fs} ${pf.key})`, `CPU peak (TDP×${pf.factor} ${pf.key})`), w: peak }]);
      }
      else push(cpuId, P[cpuId].p.watts || defW(cpuId) || 125, [{ label: L('Valeur fiche/défaut', 'Entry/default value'), w: P[cpuId].p.watts || defW(cpuId) || 125 }]);
    }
    /* GPU */
    if (gpuId) {
      const G = P[gpuId].ds, tbp = G ? (G.gpuW || G.tdp || 0) : 0;
      const w = tbp || P[gpuId].p.watts || 250;
      push(gpuId, w, [{ label: tbp ? 'TBP datasheet' : L('Estimation', 'Estimate'), w }]);
    }
    /* Motherboard (chipset + misc, flat) */
    if (mbId) push(mbId, 50, [{ label: L('Chipset + divers (forfait)', 'Chipset + misc (flat)'), w: 50 }]);
    /* RAM */
    if (ramId) {
      const R = P[ramId].ds;
      const sticks = (R && R.ramSticks) || P[ramId].qty;
      push(ramId, 5 * sticks, [{ label: L(`RAM (${sticks} barrette(s) × 5W)`, `RAM (${sticks} stick(s) × 5W)`), w: 5 * sticks }]);
    }
    /* Drives */
    order.filter(id => P[id] && (P[id].defId === 'ssd1' || P[id].defId === 'hdd')).forEach(id => {
      if (!P[id].hasDs) { push(id, 15 * P[id].qty, [{ label: L('SATA (supposé)', 'SATA (assumed)'), w: 15 * P[id].qty }]); return; }
      const D = P[id].ds, nm = P[id].p.name || '';
      const m2 = !sataTest(nm, D.raw) || D.driveFF === 'M2';
      if (m2) push(id, 10 * P[id].qty, [{ label: 'M.2 NVMe (10W)', w: 10 * P[id].qty }]);
      else push(id, 15 * P[id].qty, [{ label: L('SATA (15W)', 'SATA (15W)'), w: 15 * P[id].qty }]);
    });
    /* Cooler */
    if (coolerId) {
      const C = P[coolerId].ds;
      const liquid = C && /liquide|liquid|watercooling|AIO/i.test(C.raw || '');
      if (!C) push(coolerId, P[coolerId].p.watts || defW(coolerId) || 10, [{ label: L('Valeur fiche/défaut', 'Entry/default value'), w: P[coolerId].p.watts || defW(coolerId) || 10 }]);
      else if (liquid) {
        const rf = C.radSize ? Math.min(3, Math.max(1, Math.round(C.radSize / 120))) : 0;
        push(coolerId, rf * 5 + 10, [
          { label: L(`Ventilateurs rad (${rf}×5W)`, `Rad fans (${rf}×5W)`), w: rf * 5 },
          { label: L('Pompe (10W)', 'Pump (10W)'), w: 10 },
        ]);
      } else {
        const nf = C.fanCount || 1;
        push(coolerId, nf * 5, [{ label: L(`Ventilateur(s) (${nf}×5W)`, `Fan(s) (${nf}×5W)`), w: nf * 5 }]);
      }
    }
    /* Chassis fans */
    chassisFanIds.forEach(id => push(id, 5 * P[id].qty, [{ label: L(`Ventilateur(s) (${P[id].qty}×5W)`, `Fan(s) (${P[id].qty}×5W)`), w: 5 * P[id].qty }]));
    /* Internal PCIe cards */
    intCards.forEach(id => {
      const txt = (P[id].p.name || '') + ' ' + (P[id].ds.raw || '');
      const isCap = P[id].defId === 'capture' || /capture|acquisition|elgato|avermedia/i.test(P[id].p.name || '');
      const w = isCap ? (uhdTest(txt) ? 15 : 10) : 5;
      push(id, w, [{ label: isCap ? (uhdTest(txt) ? L('Acquisition 4K (15W)', '4K capture (15W)') : L('Acquisition (10W)', 'Capture (10W)')) : L('Carte son (5W)', 'Sound card (5W)'), w }]);
    });
    /* Internal NICs */
    intNicIds.forEach(id => {
      const D = P[id].ds;
      const spd = (D.portSpeed || D.lan || 0);
      const nm = (P[id].p.name.match(/(\d+(?:[.,]\d+)?)\s*Gb/i) || [])[1];
      const top = spd || (nm ? parseFloat(String(nm).replace(',', '.')) : 0);
      const w = top >= 10 ? 5 : 1;
      push(id, w, [{ label: L(`Carte réseau ${top || '?'} GbE (${w}W)`, `NIC ${top || '?'}GbE (${w}W)`), w }]);
    });
    /* USB-powered externals (per-connection estimate) */
    [...byDef(['keyboard', 'mouse', 'pad', 'headset', 'gamepad', 'speakers', 'webcam', 'graphictab', 'usbstick', 'dock', 'printer', 'extstorage', 'hub']),
      ...cardIds.filter(id => isExtCard(id) && P[id].hasDs),
      ...byDef('netcard').filter(nid => P[nid].hasDs && usbNicTest(nid)),
    ].forEach(id => {
      if (!P[id] || items.some(it => it.id === id)) return;
      const u = usbW((P[id].p.name || '') + ' ' + (P[id].hasDs ? P[id].ds.raw || '' : ''));
      push(id, u.w * P[id].qty, [{ label: `${u.lbl} (~${u.w}W)`, w: u.w * P[id].qty }]);
    });
    /* Screens: UPS only, never PSU */
    const screenIds = byDef('screen1');
    screenIds.forEach(id => {
      const W = P[id].hasDs ? (P[id].ds.screenW || 0) : 0;
      if (W > 0) push(id, W * P[id].qty, [{ label: L(`Écran (~${W}W)`, `Monitor (~${W}W)`), w: W * P[id].qty }], { psu: false });
    });
    const psuTotal = Math.round(items.filter(i => i.psu).reduce((s, i) => s + i.w, 0) * 10) / 10;
    const upsTotal = Math.round(items.filter(i => i.ups).reduce((s, i) => s + i.w, 0) * 10) / 10;
    const plugs = screenIds.length + byDef('printer').length + (psuTotal > 0 ? 1 : 0);
    let psu = { capW: 0, cert: 'none', certLabel: '—', factor: EFF80.none, usableW: 0 };
    if (psuId) {
      const cap = psuCapW(P[psuId].p, P[psuId].ds || {});
      const cert = psuCertLevel(P[psuId].p, P[psuId].ds || {});
      psu = { capW: cap, cert: cert.level, certLabel: cert.label, factor: EFF80[cert.level] || EFF80.none, usableW: Math.round(cap * (EFF80[cert.level] || EFF80.none)) };
    }
    return { items, psuTotal, upsTotal, plugs, psu, kwhPrice: KWH_PRICE, hoursDay: HOURS_DAY };
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
    const firstOf = d => byDef(d)[0] || null; // any slot id of that kind (for counterpart icons)
    const loadingIds = new Set((ctx && ctx.dsIds) || []); // product ids with a datasheet fetch in flight
    const checks = {}; const flatIssues = [];
    const A = (label, value, slot) => ({ label, value: value == null || value === '' ? '—' : String(value), slot: slot || null });
    const add = (slot, key, label, status, tip, a, b) => {
      (checks[slot] = checks[slot] || []).push({ key, label, status, tip, a: a || null, b: b || null });
      if (status === ERR) flatIssues.push({ level: 'err', msg: `${label} — ${tip}`, slots: [slot], slot, key });
      else if (status === WARN && !(P[slot] && P[slot].verified.includes(key))) flatIssues.push({ level: 'warn', msg: `${label} — ${tip}`, slots: [slot], slot, key });
    };
    const needDs = id => {
      if (P[id].hasDs) return false;
      if (P[id].p && loadingIds.has(P[id].p.id)) return true; // fetch in flight: grey pill shown, no yellow flicker
      add(id, 'datasheet', L('Datasheet', 'Datasheet'), WARN,
        L('Fiche technique absente — re-sélectionnez ce composant via Idealo pour la charger', 'Missing datasheet — re-select this part via Idealo to load it'),
        A(L('Datasheet', 'Datasheet'), L('absente', 'missing')), null);
      return true;
    };
    /* Lighting check factory: ARGB (3-pin 5V) vs RGB (4-pin 12V) vs board headers. */
    const rgbCheck = (id, wantArgb, devKind) => {
      const lbl = L('Éclairage', 'Lighting');
      const kind = wantArgb ? 'ARGB' : 'RGB';
      if (!mbId || !P[mbId].hasDs) { add(id, 'rgb', lbl, WARN, L('Prises RGB CM à confirmer', 'Confirm board RGB headers'), A(devKind, kind), null); return; }
      const mA = P[mbId].ds.argb || 0, mR = P[mbId].ds.rgb4 || 0;
      if (wantArgb) {
        if (mA > 0) add(id, 'rgb', lbl, OK, L(`ARGB vers ${mA} prise(s) 3-pin 5V`, `ARGB to ${mA} 3-pin 5V header(s)`), A(devKind, 'ARGB'), A('Prises ARGB CM', mA, mbId));
        else if (mR > 0) add(id, 'rgb', lbl, WARN, L('ARGB incompatible 4-pin 12V — contrôleur/hub requis', 'ARGB incompatible with 4-pin 12V — controller/hub needed'), A(devKind, 'ARGB'), A('Prises RGB CM', mR + '× 4-pin', mbId));
        else add(id, 'rgb', lbl, WARN, L('Aucune prise ARGB détectée — vérifiez le manuel (contrôleur ?)', 'No ARGB header detected — check manual (controller?)'), A(devKind, 'ARGB'), A('Prises ARGB CM', '?', mbId));
      } else {
        if (mR > 0) add(id, 'rgb', lbl, OK, L(`RGB vers ${mR} prise(s) 4-pin 12V`, `RGB to ${mR} 4-pin 12V header(s)`), A(devKind, 'RGB'), A('Prises RGB CM', mR, mbId));
        else if (mA > 0) add(id, 'rgb', lbl, WARN, L('Prise ARGB 3-pin uniquement — adaptateur/contrôleur requis', 'ARGB 3-pin header only — adapter/controller needed'), A(devKind, 'RGB'), A('Prises ARGB CM', mA, mbId));
        else add(id, 'rgb', lbl, WARN, L('Prises RGB CM non renseignées — vérifiez le manuel', 'Board RGB headers unknown — check manual'), A(devKind, 'RGB'), A('Prises RGB CM', '?', mbId));
      }
    };
    const mbId = byDef('mb')[0], cpuId = byDef('cpu')[0], ramId = byDef('ram')[0],
      coolerId = byDef('cooler')[0], gpuId = byDef('gpu')[0], caseId = byDef('case')[0], psuId = byDef('psu')[0];
    const mbHasDs = mbId && P[mbId].hasDs;
    const mbUsbA = (mbHasDs && P[mbId].ds.usbBack) ? (P[mbId].ds.usbBack.a || 0) : 0;
    const mbUsbC = (mbHasDs && P[mbId].ds.usbBack) ? (P[mbId].ds.usbBack.c || 0) : 0;
    const mbBt = mbHasDs ? (P[mbId].ds.bt || '') : '';
    const mbAudio = mbHasDs ? !!P[mbId].ds.audio : false;
    /* A discrete GPU almost always covers the neighbouring x1 slot (dual-slot coolers),
       unless its datasheet explicitly says single-slot / low profile. */
    const gpuRaw = (gpuId && P[gpuId].hasDs) ? (P[gpuId].ds.raw || '') : '';
    const gpuSingle = /single[\s-]?slot|low profile|profil bas|1\s*slot\b/i.test(gpuRaw);
    const gpuX1blocked = (gpuId && P[gpuId].hasDs && !gpuSingle) ? 1 : 0;
    const pw = powerBreakdown(ctx); // shared watts engine (pills + PSU/UPS)
    const pwOf = id => pw.items.find(i => i.id === id) || null;

    /* ---- CPU: socket + TDP (no chipset check) ---- */
    if (cpuId) {
      if (!needDs(cpuId)) {
        const C = P[cpuId].ds;
        const cpuSock = (C.sockets || []).join('/');
        if (!mbId) add(cpuId, 'socket', L('Socket', 'Socket'), NA, L('Carte mère absente', 'No motherboard'), A('Socket CPU', cpuSock || '?'), null);
        else if (!P[mbId].hasDs) add(cpuId, 'socket', L('Socket', 'Socket'), WARN, L('Datasheet CM absente — vérifiez', 'Missing board datasheet — verify'), A('Socket CPU', cpuSock || '?'), null);
        else {
          const M = P[mbId].ds, mbSock = (M.sockets || []).join('/');
          if (!cpuSock || !mbSock) add(cpuId, 'socket', L('Socket', 'Socket'), WARN, L(`Socket CPU ${cpuSock || '?'} / CM ${mbSock || '?'} — vérifiez`, `CPU socket ${cpuSock || '?'} / board ${mbSock || '?'} — verify`), A('Socket CPU', cpuSock || '?'), A('Socket CM', mbSock || '?', mbId));
          else if (C.sockets.some(s => M.sockets.includes(s))) add(cpuId, 'socket', L('Socket', 'Socket'), OK, L(`Socket ${cpuSock} des deux côtés`, `Socket ${cpuSock} on both`), A('Socket CPU', cpuSock), A('Socket CM', mbSock, mbId));
          else add(cpuId, 'socket', L('Socket', 'Socket'), ERR, L(`CPU ${cpuSock} ≠ CM ${mbSock} !`, `CPU ${cpuSock} ≠ board ${mbSock}!`), A('Socket CPU', cpuSock), A('Socket CM', mbSock, mbId));
        }
        const tdp = C.tdp || 0;
        const mbMax = (mbId && P[mbId].hasDs) ? (P[mbId].ds.cpuMaxTdp || 0) : 0;
        if (!tdp) add(cpuId, 'tdp', 'TDP', WARN, L('TDP CPU non renseigné — vérifiez ventirad et carte mère', 'CPU TDP unknown — verify cooler and board'), A('TDP CPU', '?'), null);
        else if (mbMax && tdp > mbMax) add(cpuId, 'tdp', 'TDP', ERR, L(`CPU ${tdp}W > max CM ${mbMax}W !`, `CPU ${tdp}W > board max ${mbMax}W!`), A('TDP CPU', tdp + ' W'), A('Max CM', mbMax + ' W', mbId));
        else if (mbMax) add(cpuId, 'tdp', 'TDP', OK, L(`CPU ${tdp}W ≤ max CM ${mbMax}W`, `CPU ${tdp}W ≤ board max ${mbMax}W`), A('TDP CPU', tdp + ' W'), A('Max CM', mbMax + ' W', mbId));
        else add(cpuId, 'tdp', 'TDP', WARN, L(`CPU ${tdp}W — dissipation (ventirad/CM) à confirmer`, `CPU ${tdp}W — confirm cooling (cooler/board)`), A('TDP CPU', tdp + ' W'), null);
        const cw = pwOf(cpuId);
        if (cw) {
          const fromTdp = tdp > 0;
          const pf = cpuPeakFactor(P[cpuId].p.name);
          const fs = String(pf.factor).replace('.', ',');
          add(cpuId, 'watts', L('Conso', 'Power'), fromTdp ? OK : WARN,
            fromTdp ? L(`Pic CPU ~${cw.w}W (TDP×${fs} ${pf.key})`, `CPU peak ~${cw.w}W (TDP×${pf.factor} ${pf.key})`) : L(`~${cw.w}W (estimation — TDP inconnu)`, `~${cw.w}W (estimate — unknown TDP)`),
            A('CPU', `~${cw.w} W`, cpuId), A('Base', tdp ? `TDP ${tdp}W` : L('estimation', 'estimate')));
        }
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
        if (!M.form || !C.caseForms.length) add(mbId, 'format', L('Format', 'Form factor'), WARN, L(`CM ${M.form || '?'} / boîtier ${C.caseForms.join('/') || '?'} — vérifiez`, `Board ${M.form || '?'} / case ${C.caseForms.join('/') || '?'} — verify`), A('Format CM', M.form || '?'), A('Formats boîtier', C.caseForms.join('/') || '?', caseIds[0]));
        else if (C.caseForms.includes(M.form)) add(mbId, 'format', L('Format', 'Form factor'), OK, L(`${M.form} supporté par le boîtier`, `${M.form} supported by the case`), A('Format CM', M.form), A('Formats boîtier', C.caseForms.join('/'), caseIds[0]));
        else add(mbId, 'format', L('Format', 'Form factor'), ERR, L(`${M.form} non supporté (${C.caseForms.join('/')}) !`, `${M.form} not supported (${C.caseForms.join('/')})!`), A('Format CM', M.form), A('Formats boîtier', C.caseForms.join('/'), caseIds[0]));
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
        if (!R.ddr || !M.ddr) add(ramId, 'type', L('Type', 'Type'), WARN, L(`RAM ${R.ddr || '?'} / CM ${M.ddr || '?'} — vérifiez`, `RAM ${R.ddr || '?'} / board ${M.ddr || '?'} — verify`), A('Type RAM', R.ddr || '?'), A('Type CM', M.ddr || '?', mbId));
        else if (R.ddr === M.ddr) add(ramId, 'type', L('Type', 'Type'), OK, L(`DDR commune : ${R.ddr}`, `Common DDR: ${R.ddr}`), A('Type RAM', R.ddr), A('Type CM', M.ddr, mbId));
        else add(ramId, 'type', L('Type', 'Type'), ERR, L(`RAM ${R.ddr} ≠ CM ${M.ddr} !`, `RAM ${R.ddr} ≠ board ${M.ddr} !`), A('Type RAM', R.ddr), A('Type CM', M.ddr, mbId));
        if (!rSpeed || !M.ramSpeedMax) add(ramId, 'speed', L('Vitesse', 'Speed'), WARN, L(`RAM ${rSpeed || '?'} / max CM ${M.ramSpeedMax || '?'} MHz — vérifiez (XMP/EXPO ?)`, `RAM ${rSpeed || '?'} / board max ${M.ramSpeedMax || '?'} MHz — verify (XMP/EXPO?)`), A('Vitesse RAM', (rSpeed || '?') + ' MHz'), A('Max CM', (M.ramSpeedMax || '?') + ' MHz', mbId));
        else if (rSpeed <= M.ramSpeedMax) add(ramId, 'speed', L('Vitesse', 'Speed'), OK, L(`${rSpeed} ≤ max ${M.ramSpeedMax} MHz`, `${rSpeed} ≤ max ${M.ramSpeedMax} MHz`), A('Vitesse RAM', rSpeed + ' MHz'), A('Max CM', M.ramSpeedMax + ' MHz', mbId));
        else add(ramId, 'speed', L('Vitesse', 'Speed'), WARN, L(`${rSpeed} > max ${M.ramSpeedMax} MHz — bridé / XMP requis`, `${rSpeed} > max ${M.ramSpeedMax} MHz — capped / XMP needed`), A('Vitesse RAM', rSpeed + ' MHz'), A('Max CM', M.ramSpeedMax + ' MHz', mbId));
        if (!M.ramSlots) add(ramId, 'sticks', L('Barrettes', 'Sticks'), WARN, L(`${sticks} barrette(s), slots CM inconnus — vérifiez`, `${sticks} stick(s), unknown board slots — verify`), A('Barrettes', sticks), A('Slots CM', '?', mbId));
        else if (sticks <= M.ramSlots) add(ramId, 'sticks', L('Barrettes', 'Sticks'), OK, L(`${sticks} ≤ ${M.ramSlots} slots`, `${sticks} ≤ ${M.ramSlots} slots`), A('Barrettes', sticks), A('Slots CM', M.ramSlots, mbId));
        else add(ramId, 'sticks', L('Barrettes', 'Sticks'), ERR, L(`${sticks} barrettes pour ${M.ramSlots} slots !`, `${sticks} sticks for ${M.ramSlots} slots!`), A('Barrettes', sticks), A('Slots CM', M.ramSlots, mbId));
        if (cap && M.ramCapMax) {
          if (cap <= M.ramCapMax) add(ramId, 'capacity', L('Capacité', 'Capacity'), OK, L(`${cap} ≤ max ${M.ramCapMax} Go`, `${cap} ≤ max ${M.ramCapMax} GB`), A('Total RAM', cap + ' Go'), A('Max CM', M.ramCapMax + ' Go', mbId));
          else add(ramId, 'capacity', L('Capacité', 'Capacity'), ERR, L(`${cap} > max ${M.ramCapMax} Go !`, `${cap} > max ${M.ramCapMax} GB!`), A('Total RAM', cap + ' Go'), A('Max CM', M.ramCapMax + ' Go', mbId));
        } else if (cap || M.ramCapMax) add(ramId, 'capacity', L('Capacité', 'Capacity'), WARN, L('Capacité max à confirmer', 'Confirm max capacity'), A('Total RAM', cap ? cap + ' Go' : '?'), A('Max CM', M.ramCapMax ? M.ramCapMax + ' Go' : '?', mbId));
      }
    }
    /* ---- Cooler ---- */
    if (coolerId && !needDs(coolerId)) {
      const C = P[coolerId].ds;
      const srcSockets = [...((mbId && P[mbId].hasDs) ? P[mbId].ds.sockets || [] : []), ...((cpuId && P[cpuId].hasDs) ? P[cpuId].ds.sockets || [] : [])];
      const liquid = /liquide|liquid|watercooling|AIO/i.test(C.raw || '');
      if (!srcSockets.length) add(coolerId, 'socket', L('Socket', 'Socket'), NA, L('Ni CPU ni CM renseignés', 'No CPU or board data'), A('Supports', (C.sockets || []).join('/') || '?'), null);
      else if (!(C.sockets || []).length) add(coolerId, 'socket', L('Socket', 'Socket'), WARN, L('Sockets supportés non détectés — vérifiez', 'Supported sockets not detected — verify'), A('Supports', '?'), A('Socket', srcSockets.join('/'), (mbId || cpuId)));
      else if (C.sockets.some(s => srcSockets.includes(s))) add(coolerId, 'socket', L('Socket', 'Socket'), OK, L(`Supporte ${srcSockets.join('/')} +`, `Supports ${srcSockets.join('/')} +`), A('Supports', C.sockets.join('/')), A('Socket', srcSockets.join('/'), (mbId || cpuId)));
      else add(coolerId, 'socket', L('Socket', 'Socket'), ERR, L(`${(C.sockets || []).join('/')} ≠ ${srcSockets.join('/')} !`, `${(C.sockets || []).join('/')} ≠ ${srcSockets.join('/')}!`), A('Supports', (C.sockets || []).join('/')), A('Socket', srcSockets.join('/'), (mbId || cpuId)));
      const caseIds = byDef('case');
      if (liquid) {
        if (!caseIds.length || !P[caseIds[0]].hasDs) add(coolerId, 'radiator', L('Radiateur', 'Radiator'), WARN, L('Watercooling : support boîtier à confirmer', 'Watercooling: confirm case support'), A('Radiateur', (C.radSize || '?') + ' mm'), null);
        else {
          const CW = P[caseIds[0]].ds;
          const rads = CW.caseRads || [];
          const rs = C.radSize || 0;
          if (rs && rads.length) {
            if (rads.includes(rs)) add(coolerId, 'radiator', L('Radiateur', 'Radiator'), OK, L(`Radiateur ${rs} mm supporté (${rads.join('/')})`, `${rs}mm radiator supported (${rads.join('/')})`), A('Radiateur', rs + ' mm'), A('Radiateurs boîtier', rads.join('/'), caseIds[0]));
            else add(coolerId, 'radiator', L('Radiateur', 'Radiator'), WARN, L(`Radiateur ${rs} mm non listé (${rads.join('/')}) — vérifiez l'emplacement`, `${rs}mm radiator not listed (${rads.join('/')}) — verify mount point`), A('Radiateur', rs + ' mm'), A('Radiateurs boîtier', rads.join('/'), caseIds[0]));
          }
          else if (CW.watercool === true || /oui|yes/i.test(String(CW.watercool || ''))) add(coolerId, 'radiator', L('Radiateur', 'Radiator'), OK, L('Boîtier compatible watercooling', 'Watercooling-ready case'), A('Radiateur', (C.radSize || '?') + ' mm'), null);
          else add(coolerId, 'radiator', L('Radiateur', 'Radiator'), WARN, L('Support watercooling du boîtier à confirmer', 'Confirm case watercooling support'), A('Radiateur', (C.radSize || '?') + ' mm'), null);
        }
      } else if (!caseIds.length) add(coolerId, 'height', L('Hauteur', 'Height'), NA, L('Boîtier absent', 'No case'), A('Hauteur', (C.height || '?') + ' mm'), null);
      else if (!P[caseIds[0]].hasDs) add(coolerId, 'height', L('Hauteur', 'Height'), WARN, L('Datasheet boîtier absente — vérifiez', 'Missing case datasheet — verify'), A('Hauteur', (C.height || '?') + ' mm'), null);
      else {
        const H = P[caseIds[0]].ds.caseCoolerMax, h = C.height;
        if (!H || !h) add(coolerId, 'height', L('Hauteur', 'Height'), WARN, L(`Ventirad ${h || '?'} mm / max ${H || '?'} mm — vérifiez`, `Cooler ${h || '?'} mm / max ${H || '?'} mm — verify`), A('Hauteur', (h || '?') + ' mm'), A('Max boîtier', (H || '?') + ' mm', caseIds[0]));
        else if (h <= H) add(coolerId, 'height', L('Hauteur', 'Height'), OK, L(`${h} ≤ ${H} mm`, `${h} ≤ ${H} mm`), A('Hauteur', h + ' mm'), A('Max boîtier', H + ' mm', caseIds[0]));
        else add(coolerId, 'height', L('Hauteur', 'Height'), ERR, L(`${h} mm > max ${H} mm !`, `${h} mm > max ${H} mm!`), A('Hauteur', h + ' mm'), A('Max boîtier', H + ' mm', caseIds[0]));
      }
      /* ---- Cooler lighting (name + datasheet); fans handled in the fan-headers section ---- */
      const cName = P[coolerId].p.name || '';
      const argbNeed = /(^|[^a-z])a[\s-]?rgb|adressable|addressable/i.test(cName + ' ' + (C.raw || ''));
      const rgbNeed = !argbNeed && /\brgb\b|led/i.test(cName + ' ' + (C.raw || ''));
      if (argbNeed || rgbNeed) rgbCheck(coolerId, argbNeed, L('Ventirad', 'Cooler'));
      /* ---- AIO pump header (liquid only): AIO_PUMP preferred, CPU_OPT fallback, else manual check ---- */
      if (liquid) {
        if (!mbId || !P[mbId].hasDs) add(coolerId, 'pump', L('Pompe', 'Pump'), WARN, L('Prise pompe CM à confirmer (AIO_PUMP / CPU_OPT)', 'Confirm board pump header (AIO_PUMP / CPU_OPT)'), A('Pompe AIO', '1×'), null);
        else {
          const pu = P[mbId].ds.pump || 0, co = P[mbId].ds.cpuOpt || 0;
          if (pu > 0) add(coolerId, 'pump', L('Pompe', 'Pump'), OK, L(`Pompe sur prise AIO_PUMP (${pu} détectée(s))`, `Pump on AIO_PUMP header (${pu} detected)`), A('Pompe AIO', '1× AIO_PUMP'), A('Prises pompe CM', pu, mbId));
          else if (co > 0) add(coolerId, 'pump', L('Pompe', 'Pump'), WARN, L(`Pas de prise AIO_PUMP — vérifiez manuellement : CPU_OPT (${co}) ou CPU_FAN à 100%`, `No AIO_PUMP header — manually verify: CPU_OPT (${co}) or CPU_FAN at 100%`), A('Pompe AIO', '1×'), A('Prises pompe CM', `AIO_PUMP:0 CPU_OPT:${co}`, mbId));
          else add(coolerId, 'pump', L('Pompe', 'Pump'), WARN, L('Vérifiez manuellement la prise pompe (AIO_PUMP / CPU_OPT) — non renseignée sur Idealo', 'Manually verify the pump header (AIO_PUMP / CPU_OPT) — not listed on Idealo'), A('Pompe AIO', '1×'), A('Prises pompe CM', '?', mbId));
        }
      }
    }
    /* ---- Drives ---- */
    const driveIds = order.filter(id => P[id] && (P[id].defId === 'ssd1' || P[id].defId === 'hdd'));
    const ffOf = did => {
      if (!P[did] || !P[did].hasDs) return null;
      const dd = P[did].ds, nn = P[did].p.name || '';
      if (!(/SATA/i.test(nn + ' ' + (dd.raw || '')) && !/NVMe|M\.?\s?2|PCIe/i.test(nn + ' ' + (dd.raw || '')))) return 'M2';
      return dd.driveFF || (P[did].defId === 'hdd' ? '3.5' : null);
    };
    const need35 = driveIds.filter(did => ffOf(did) === '3.5');
    const need25 = driveIds.filter(did => ffOf(did) === '2.5');
    const isSataDrive = did => {
      if (!P[did] || !P[did].hasDs) return false;
      const dd = P[did].ds, nn = P[did].p.name || '';
      return /SATA/i.test(nn + ' ' + (dd.raw || '')) && !/NVMe|M\.?\s?2|PCIe/i.test(nn + ' ' + (dd.raw || ''));
    };
    const sataIds = driveIds.filter(isSataDrive);
    const nvmeIds = driveIds.filter(id => {
      const D = P[id].ds, nm = P[id].p.name || '';
      return P[id].hasDs && !(/SATA/i.test(nm + ' ' + (D.raw || '')) && !/NVMe|M\.?\s?2|PCIe/i.test(nm + ' ' + (D.raw || '')));
    });
    driveIds.forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const D = P[id].ds, nm = P[id].p.name || '';
      const sataOnly = /SATA/i.test(nm + ' ' + (D.raw || '')) && !/NVMe|M\.?\s?2|PCIe/i.test(nm + ' ' + (D.raw || ''));
      if (sataOnly) {
        /* SATA port numbering lives in the Interface pill: overflow drives go ERR. */
        const sRank = sataIds.indexOf(id) + 1, sTotal = sataIds.length;
        if (!mbId) add(id, 'iface', L('Interface', 'Interface'), NA, L('Carte mère absente', 'No motherboard'), A('Interface', 'SATA'), null);
        else if (!P[mbId].hasDs) add(id, 'iface', L('Interface', 'Interface'), WARN, L('Ports SATA CM à confirmer (datasheet manquante)', 'Confirm board SATA ports (missing datasheet)'), A('Disques SATA', sTotal), null);
        else {
          const sPorts = P[mbId].ds.sataCount || 0;
          if (!sPorts) add(id, 'iface', L('Interface', 'Interface'), WARN, L('Nombre de ports SATA CM inconnu — vérifiez', 'Unknown board SATA port count — verify'), A('Disques SATA', sTotal), A('Ports SATA CM', '?', mbId));
          else if (sRank <= sPorts) add(id, 'iface', L('Interface', 'Interface'), OK, L(`SATA n°${sRank}/${sTotal} ≤ ${sPorts} ports`, `SATA #${sRank}/${sTotal} ≤ ${sPorts} ports`), A('Disques SATA', sTotal), A('Ports SATA CM', sPorts, mbId));
          else add(id, 'iface', L('Interface', 'Interface'), ERR, L(`SATA n°${sRank} — seulement ${sPorts} ports !`, `SATA #${sRank} — only ${sPorts} ports!`), A('Disques SATA', sTotal), A('Ports SATA CM', sPorts, mbId));
        }
        const ff = ffOf(id);
        const caseIds = byDef('case');
        if (!ff || (ff !== '3.5' && ff !== '2.5')) add(id, 'bays', L('Baies', 'Bays'), WARN, L('Format du disque non détecté — vérifiez (2,5" ?)', 'Unknown drive size — verify (2.5"?)'), A('Format', '?'), null);
        else if (!caseIds.length) add(id, 'bays', L('Baies', 'Bays'), NA, L('Boîtier absent', 'No case'), A('Format', ff + '"'), null);
        else if (!P[caseIds[0]].hasDs) add(id, 'bays', L('Baies', 'Bays'), WARN, L('Datasheet boîtier absente — vérifiez', 'Missing case datasheet — verify'), A('Format', ff + '"'), null);
        else {
          const b35 = P[caseIds[0]].ds.bays35 || 0, b25 = P[caseIds[0]].ds.bays25 || 0;
          const rank = (ff === '3.5' ? need35 : need25).indexOf(id) + 1;
          const total = ff === '3.5' ? need35.length : need25.length;
          if (!b35 && !b25) add(id, 'bays', L('Baies', 'Bays'), WARN, L('Baies du boîtier inconnues — vérifiez', 'Unknown case bays — verify'), A('Disques ' + ff + '"', total), A('Baies', '?'));
          else if (ff === '3.5') {
            if (rank <= b35) add(id, 'bays', L('Baies', 'Bays'), OK, L(`Disque 3,5" n°${rank}/${total} ≤ ${b35} baie(s)`, `3.5" drive #${rank}/${total} ≤ ${b35} bay(s)`), A('Disques 3,5"', total), A('Baies 3,5"', b35, caseIds[0]));
            else add(id, 'bays', L('Baies', 'Bays'), ERR, L(`Disque 3,5" n°${rank} — seulement ${b35} baie(s) !`, `3.5" drive #${rank} — only ${b35} bay(s)!`), A('Disques 3,5"', total), A('Baies 3,5"', b35, caseIds[0]));
          } else {
            if (rank <= b25) add(id, 'bays', L('Baies', 'Bays'), OK, L(`SSD 2,5" n°${rank}/${total} ≤ ${b25} baie(s)`, `2.5" SSD #${rank}/${total} ≤ ${b25} bay(s)`), A('SSD 2,5"', total), A('Baies 2,5"', b25, caseIds[0]));
            else if (rank <= b25 + b35) add(id, 'bays', L('Baies', 'Bays'), WARN, L(`SSD 2,5" n°${rank} en baie 3,5" — cadre/adaptateur requis`, `2.5" SSD #${rank} in 3.5" bay — bracket/adapter needed`), A('SSD 2,5"', total), A('Baies 2,5"+3,5"', `${b25}+${b35}`, caseIds[0]));
            else add(id, 'bays', L('Baies', 'Bays'), ERR, L(`SSD 2,5" n°${rank} — seulement ${b25 + b35} baie(s) !`, `2.5" SSD #${rank} — only ${b25 + b35} bay(s)!`), A('SSD 2,5"', total), A('Baies 2,5"+3,5"', `${b25}+${b35}`, caseIds[0]));
          }
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
      else if (!dg || !gEra) add(id, 'gen', L('Gen PCIe', 'PCIe gen'), WARN, L(`SSD Gen${dg || '?'} / gen slot inconnue — vérifiez`, `SSD Gen${dg || '?'} / unknown slot gen — verify`), A('Gen SSD', dg || '?'), A('Gen slot', gEra || '?', mbId));
      else if (dg <= gEra) add(id, 'gen', L('Gen PCIe', 'PCIe gen'), OK, L(`Gen${dg} ≤ Gen${gEra} du slot`, `Gen${dg} ≤ slot Gen${gEra}`), A('Gen SSD', dg), A('Gen slot', gEra, mbId));
      else add(id, 'gen', L('Gen PCIe', 'PCIe gen'), WARN, L(`Gen${dg} sur slot Gen${gEra} — bridé mais fonctionne`, `Gen${dg} on Gen${gEra} slot — capped but works`), A('Gen SSD', dg), A('Gen slot', gEra, mbId));
      if (M && M.m2count && nvmeIds.length > M.m2count) add(id, 'slots', L('Slots', 'Slots'), ERR, L(`${nvmeIds.length} NVMe pour ${M.m2count} slots !`, `${nvmeIds.length} NVMes for ${M.m2count} slots!`), A('NVMe', nvmeIds.length), A('Slots M.2', M.m2count, mbId));
      else if (nvmeIds.length > 1 && !(M && M.m2count)) add(id, 'slots', L('Slots', 'Slots'), WARN, L(`${nvmeIds.length} NVMe — nombre de slots M.2 à confirmer`, `${nvmeIds.length} NVMes — confirm M.2 slot count`), A('NVMe', nvmeIds.length), A('Slots M.2', '?', mbId));
      else if (mbId) add(id, 'slots', L('Slots', 'Slots'), OK, L('Slot M.2 disponible', 'M.2 slot available'), A('NVMe', nvmeIds.length), null);
      const m2sz = D.m2size || D.length;
      if (m2sz && m2sz !== 80 && m2sz !== '2280') add(id, 'size', L('Format', 'Form factor'), WARN, L(`M.2 ${m2sz} — vérifiez le support boîtier/CM`, `M.2 ${m2sz} — verify board/case support`), A('Longueur', m2sz), null);
    });

    /* ---- GPU ---- */
    if (gpuId && !needDs(gpuId)) {
      const G = P[gpuId].ds;
      const gl = G.length || 0;
      if (!mbId) add(gpuId, 'slot', L('Slot', 'Slot'), NA, L('Carte mère absente', 'No motherboard'), A('Carte', 'PCIe x16'), null);
      else if (!P[mbId].hasDs) add(gpuId, 'slot', L('Slot', 'Slot'), WARN, L('Slots CM à confirmer (datasheet manquante)', 'Confirm board slots (missing datasheet)'), A('Carte', 'PCIe x16'), null);
      else if ((P[mbId].ds.slotX16 || 0) >= 1) {
        const cover = gpuX1blocked ? L(' — recouvre le slot x1 voisin', ' — covers the neighbouring x1 slot') : '';
        add(gpuId, 'slot', L('Slot', 'Slot'), OK, L(`Slot PCIe x16 disponible (${P[mbId].ds.slotX16})${cover}`, `Free PCIe x16 slot (${P[mbId].ds.slotX16})${cover}`), A('Carte', 'PCIe x16'), A('Slots x16 CM', P[mbId].ds.slotX16, mbId));
      }
      else add(gpuId, 'slot', L('Slot', 'Slot'), ERR, L('Aucun slot PCIe x16 sur la carte mère !', 'No PCIe x16 slot on the motherboard!'), A('Carte', 'PCIe x16'), A('Slots x16 CM', 0, mbId));
      const caseIds = byDef('case');
      if (!caseIds.length) add(gpuId, 'length', L('Longueur', 'Length'), NA, L('Boîtier absent', 'No case'), A('Longueur GPU', gl ? gl + ' mm' : '?'), null);
      else if (!P[caseIds[0]].hasDs) add(gpuId, 'length', L('Longueur', 'Length'), WARN, L('Datasheet boîtier absente — vérifiez', 'Missing case datasheet — verify'), A('Longueur GPU', gl ? gl + ' mm' : '?'), null);
      else {
        const Mx = P[caseIds[0]].ds.caseGpuMax || 0;
        if (!Mx || !gl) add(gpuId, 'length', L('Longueur', 'Length'), WARN, L(`GPU ${gl || '?'} mm / max ${Mx || '?'} mm — vérifiez`, `GPU ${gl || '?'} mm / max ${Mx || '?'} mm — verify`), A('Longueur GPU', gl ? gl + ' mm' : '?'), A('Max boîtier', Mx ? Mx + ' mm' : '?', caseIds[0]));
        else if (gl <= Mx) add(gpuId, 'length', L('Longueur', 'Length'), OK, L(`${gl} ≤ ${Mx} mm`, `${gl} ≤ ${Mx} mm`), A('Longueur GPU', gl + ' mm'), A('Max boîtier', Mx + ' mm', caseIds[0]));
        else add(gpuId, 'length', L('Longueur', 'Length'), ERR, L(`${gl} mm > max ${Mx} mm !`, `${gl} mm > max ${Mx} mm!`), A('Longueur GPU', gl + ' mm'), A('Max boîtier', Mx + ' mm', caseIds[0]));
      }
      const Mb = (mbId && P[mbId].hasDs) ? P[mbId].ds : null;
      const gEra = slotGen(Mb, mbId ? P[mbId].p.name : '');
      const gg = G.pcieGen || 0;
      /* ---- GPU thickness (slots used) vs case expansion slots ---- */
      const gSlots = G.gpuSlots || slotsFromMm(G.depth);
      if (!caseIds.length) add(gpuId, 'slots', L('Slots', 'Slots'), NA, L('Boîtier absent', 'No case'), A('Slots GPU', gSlots || '?'), null);
      else if (!P[caseIds[0]].hasDs) add(gpuId, 'slots', L('Slots', 'Slots'), WARN, L('Slots du boîtier à confirmer (datasheet manquante)', 'Confirm case slots (missing datasheet)'), A('Slots GPU', gSlots || '?'), null);
      else {
        const CS = P[caseIds[0]].ds.caseSlots || 0;
        if (!CS || !gSlots) add(gpuId, 'slots', L('Slots', 'Slots'), WARN, L(`GPU ${gSlots || '?'} slot(s) / boîtier ${CS || '?'} — vérifiez`, `GPU ${gSlots || '?'} slot(s) / case ${CS || '?'} — verify`), A('Slots GPU', gSlots || '?'), A('Slots boîtier', CS || '?', caseIds[0]));
        else if (gSlots <= CS) add(gpuId, 'slots', L('Slots', 'Slots'), OK, L(`${gSlots} ≤ ${CS} slots boîtier`, `${gSlots} ≤ ${CS} case slots`), A('Slots GPU', gSlots), A('Slots boîtier', CS, caseIds[0]));
        else add(gpuId, 'slots', L('Slots', 'Slots'), ERR, L(`${gSlots} slots GPU > ${CS} boîtier !`, `GPU ${gSlots} slots > case ${CS}!`), A('Slots GPU', gSlots), A('Slots boîtier', CS, caseIds[0]));
      }
      if (!mbId) add(gpuId, 'pcie', L('PCIe', 'PCIe'), NA, L('Carte mère absente', 'No motherboard'), A('Gen GPU', gg || '?'), null);
      else if (!gg || !gEra) add(gpuId, 'pcie', L('PCIe', 'PCIe'), WARN, L(`GPU Gen${gg || '?'} / slot Gen${gEra || '?'} — vérifiez`, `GPU Gen${gg || '?'} / slot Gen${gEra || '?'} — verify`), A('Gen GPU', gg || '?'), A('Gen slot', gEra || '?', mbId));
      else if (gg <= gEra) add(gpuId, 'pcie', L('PCIe', 'PCIe'), OK, L(`Gen${gg} ≤ Gen${gEra}`, `Gen${gg} ≤ Gen${gEra}`), A('Gen GPU', gg), A('Gen slot', gEra, mbId));
      else add(gpuId, 'pcie', L('PCIe', 'PCIe'), WARN, L(`Gen${gg} sur slot Gen${gEra} — légèrement bridé`, `Gen${gg} on Gen${gEra} slot — slightly capped`), A('Gen GPU', gg), A('Gen slot', gEra, mbId));
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
        if (!u8 && !uh) add(gpuId, 'power', L('Alim', 'Power'), WARN, L('Câbles alim non détectés — vérifiez (PCIe 8P / 12VHPWR)', 'PSU cables not detected — verify (PCIe 8P / 12VHPWR)'), A('Connecteur GPU', pc), A('Câbles alim', '?', psuIds[0]));
        else if ((needH && uh) || (need8 && u8 >= need8)) add(gpuId, 'power', L('Alim', 'Power'), OK, L('Connecteurs OK', 'Connectors OK'), A('Connecteur GPU', pc), A('Câbles alim', `${u8}×8P${uh ? ' + 12VHPWR' : ''}`, psuIds[0]));
        else if (need8 && uh) add(gpuId, 'power', L('Alim', 'Power'), WARN, L('Alim 12VHPWR uniquement — adaptateur vers 2×8P (souvent fourni avec le GPU)', '12VHPWR-only PSU — adapter to 2×8P (often bundled with GPU)'), A('Connecteur GPU', pc), A('Câbles alim', '12VHPWR', psuIds[0]));
        else add(gpuId, 'power', L('Alim', 'Power'), ERR, L('Connecteurs insuffisants !', 'Insufficient connectors!'), A('Connecteur GPU', pc), A('Câbles alim', `${u8}×8P`, psuIds[0]));
      }
      const gw = pwOf(gpuId);
      if (gw) {
        const gtbp = P[gpuId].ds ? (P[gpuId].ds.gpuW || P[gpuId].ds.tdp || 0) : 0;
        const fromTbp = gtbp > 0;
        add(gpuId, 'watts', L('Conso', 'Power'), fromTbp ? OK : WARN,
          fromTbp ? L(`TBP ~${gw.w}W (datasheet)`, `TBP ~${gw.w}W (datasheet)`) : L(`~${gw.w}W (estimation — TBP inconnu)`, `~${gw.w}W (estimate — unknown TBP)`),
          A('GPU', `~${gw.w} W`, gpuId), A('Base', fromTbp ? `TBP ${gtbp}W` : L('estimation', 'estimate')));
      }
    }
    /* ---- Case mirrors (GPU/cooler caps) ---- */
    if (caseId && !needDs(caseId)) {
      const W = P[caseId].ds;
      if (gpuId && P[gpuId].hasDs) {
        const gl = P[gpuId].ds.length || 0, Mx = W.caseGpuMax || 0;
        if (!Mx || !gl) add(caseId, 'gpu', L('GPU max', 'Max GPU'), WARN, L('Longueurs à confirmer', 'Confirm lengths'), A('Max boîtier', Mx ? Mx + ' mm' : '?'), A('Longueur GPU', gl ? gl + ' mm' : '?', gpuId));
        else if (gl <= Mx) add(caseId, 'gpu', L('GPU max', 'Max GPU'), OK, L(`${Mx} ≥ ${gl} mm`, `${Mx} ≥ ${gl} mm`), A('Max boîtier', Mx + ' mm'), A('Longueur GPU', gl + ' mm', gpuId));
        else add(caseId, 'gpu', L('GPU max', 'Max GPU'), ERR, L(`${Mx} < ${gl} mm !`, `${Mx} < ${gl} mm!`), A('Max boîtier', Mx + ' mm'), A('Longueur GPU', gl + ' mm', gpuId));
      }
      if (coolerId && P[coolerId].hasDs && !/liquide|liquid|watercooling|AIO/i.test(P[coolerId].ds.raw || '')) {
        const h = P[coolerId].ds.height || 0, Mx = W.caseCoolerMax || 0;
        if (!Mx || !h) add(caseId, 'cooler', L('Ventirad max', 'Max cooler'), WARN, L('Hauteurs à confirmer', 'Confirm heights'), A('Max boîtier', Mx ? Mx + ' mm' : '?'), A('Hauteur', h ? h + ' mm' : '?', coolerId));
        else if (h <= Mx) add(caseId, 'cooler', L('Ventirad max', 'Max cooler'), OK, L(`${Mx} ≥ ${h} mm`, `${Mx} ≥ ${h} mm`), A('Max boîtier', Mx + ' mm'), A('Hauteur', h + ' mm', coolerId));
        else add(caseId, 'cooler', L('Ventirad max', 'Max cooler'), ERR, L(`${Mx} < ${h} mm !`, `${Mx} < ${h} mm!`), A('Max boîtier', Mx + ' mm'), A('Hauteur', h + ' mm', coolerId));
      }
      /* ---- Front-panel USB-C needs an internal USB-C header: always a manual check ---- */
      if (W.frontUsbC) add(caseId, 'usbc', 'USB-C', WARN, L('USB-C en façade — vérifiez manuellement le connecteur USB-C interne de la carte mère', 'Front USB-C port — manually verify the motherboard internal USB-C header'), A('Façade boîtier', 'USB-C'), A('Header interne CM', '?', mbId));
      /* ---- Heavy GPU (>2.5 slots): manual card-holder check on the case ---- */
      if (gpuId && P[gpuId].hasDs) {
        const gs = P[gpuId].ds.gpuSlots || slotsFromMm(P[gpuId].ds.depth);
        if (gs > 2.5) add(caseId, 'support', L('Support GPU', 'GPU support'), WARN, L(`Carte lourde (${gs} slots) — vérifiez manuellement le support anti-affaissement (card holder)`, `Heavy card (${gs} slots) — manually verify anti-sag support (card holder)`), A('Slots GPU', gs, gpuId), A('Support', '?'));
      }
    }
    /* ---- PSU usable power (rated × 80+ factor) vs calculated load ---- */
    if (psuId && !needDs(psuId)) {
      const cap = pw.psu.capW, usable = pw.psu.usableW, need = pw.psuTotal;
      const certTxt = pw.psu.certLabel && pw.psu.certLabel !== '—' ? ` ${pw.psu.certLabel}` : '';
      if (!cap) add(psuId, 'watt', L('Puissance', 'Wattage'), WARN, L('Puissance alim inconnue — vérifiez', 'Unknown PSU wattage — verify'), A('Alim', '?'), A('Besoin', need + ' W'));
      else if (need > usable) add(psuId, 'watt', L('Puissance', 'Wattage'), ERR, L(`Besoin ~${need}W > utile ~${usable}W (${cap}W${certTxt}) !`, `Load ~${need}W > usable ~${usable}W (${cap}W${certTxt})!`), A(`Alim utile`, `~${usable} W`, psuId), A('Besoin', need + ' W'));
      else if (need > usable * 0.8) add(psuId, 'watt', L('Puissance', 'Wattage'), WARN, L(`~${need}W proches des ~${usable}W utiles (${cap}W${certTxt}) — marge faible`, `~${need}W close to ~${usable}W usable (${cap}W${certTxt}) — thin margin`), A('Alim utile', `~${usable} W`, psuId), A('Besoin', need + ' W'));
      else add(psuId, 'watt', L('Puissance', 'Wattage'), OK, L(`~${need}W ≤ ~${usable}W utiles (${cap}W${certTxt})`, `~${need}W ≤ ~${usable}W usable (${cap}W${certTxt})`), A('Alim utile', `~${usable} W`, psuId), A('Besoin', need + ' W'));
    }
    /* ---- PSU quality / build / modularity / fit (community 2025 tier list) ---- */
    if (psuId) {
      const rp = P[psuId].p;
      const db = (typeof PsuDb !== 'undefined' || typeof globalThis.PsuDb !== 'undefined') ? (globalThis.PsuDb || PsuDb) : null;
      const dbrow = db ? db.match(rp.name || '', pwOf(psuId) ? pw.psu.capW : (Number(rp.capW) || 0)) : null;
      const psuDs = P[psuId].ds || {};
      if (dbrow) {
        const letter = String(dbrow.tier || '').replace(/[^A-Za-z+\-]/g, '');
        const first = (letter[0] || '').toUpperCase();
        const lc = dbrow.lc ? L(' · confiance limitée (*)', ' · limited confidence (*)') : '';
        let qs = 'warn', qv = L('non classée', 'untiered');
        if (first === 'A') { qs = 'ok'; qv = L('excellente', 'excellent'); }
        else if (first === 'B') { qs = 'ok'; qv = L('bonne', 'good'); }
        else if (first === 'C') { qs = 'warn'; qv = L('correcte / bas de gamme', 'okay / budget'); }
        else if (first === 'D') { qs = 'err'; qv = L('à éviter', 'avoid'); }
        else if (first === 'E' || first === 'F') { qs = 'err'; qv = L('non recommandée', 'not recommended'); }
        add(psuId, 'psuq', L('Qualité alim', 'PSU quality'), qs,
          L('Tier ', 'Tier ') + (letter || '?') + ' (' + qv + ')' + lc + (dbrow.series ? ' — ' + dbrow.series : ''),
          A('Tier', letter || '?'), A('80 Plus', dbrow.cert || L('non certifiée', 'not certified')));
        const effMap = { G: L('Or', 'Gold'), S: L('Argent', 'Silver'), B: L('Bronze', 'Bronze'), W: L('Blanc', 'White'), T: L('Titane', 'Titanium'), P: L('Platine', 'Platinum'), N: L('Aucune', 'None') };
        const effTxt = dbrow.eff ? (effMap[dbrow.eff] || dbrow.eff) : '?';
        const atxNew = /3\./.test(dbrow.atx || '');
        add(psuId, 'psur', L('Fabrication', 'Build'), atxNew ? 'ok' : 'na',
          atxNew ? L(`${dbrow.atx} — compatible 12V-2×6 / connecteurs récents`, `${dbrow.atx} — 12V-2×6 / modern connectors ready`)
            : L(`${dbrow.atx || 'ATX 2.x'} — ancienne norme, adaptateur possible`, `${dbrow.atx || 'ATX 2.x'} — older standard, adapter may be needed`),
          A('ODM', dbrow.odm || '?'), A(L('Efficacité', 'Efficiency'), effTxt));
        const mod = dbrow.mod;
        const mods = mod === 'Full' ? 'ok' : (mod === 'Semi' ? 'warn' : (mod === 'No' ? 'na' : 'warn'));
        const modt = mod === 'Full' ? L('Câbles modulaires — câblage libre', 'Modular cables — free wiring')
          : mod === 'Semi' ? L('Modularité partielle — câbles principaux fixes', 'Partial modularity — main cables fixed')
          : L('Câbles fixes — prévoir le passage', 'Fixed cables — plan the routing');
        add(psuId, 'psum', L('Modularité', 'Modularity'), mods, modt,
          A('Câbles', mod === 'Full' ? L('modulaires', 'modular') : mod === 'Semi' ? L('partiels', 'partial') : L('fixes', 'fixed')), null);
      } else {
        add(psuId, 'psuq', L('Qualité alim', 'PSU quality'), 'warn',
          L('Non listée dans la tier list PSU (2025) — qualité à évaluer', 'Not in the PSU tier list (2025) — assess quality'),
          A('80 Plus', psuDs.cert80 ? String(psuDs.cert80).toUpperCase() : '?'), null);
        const atxDs = psuDs.atx || '';
        add(psuId, 'psur', L('Fabrication', 'Build'), /3\./.test(atxDs) ? 'ok' : 'warn',
          /3\./.test(atxDs) ? L('ATX 3.x détectée dans la fiche', 'ATX 3.x found in datasheet') : L('Fabrication/ODM inconnus — vérifiez', 'Build/ODM unknown — verify'),
          A('ATX', atxDs || '?'), A('ODM', '?'));
      }
      /* format / fit vs case (the tier list has no dims → datasheet length + format) */
      const pL = (P[psuId].ds && P[psuId].ds.length) || 0;
      const fmt = dbrow ? (dbrow.ff || '') : '';
      const fmtNote = fmt ? ' · ' + fmt : '';
      const caseOk = caseId ? P[caseId].hasDs : false;
      const maxPsu = caseOk ? (P[caseId].ds.casePsuMax || 0) : 0;
      const dimLbl = L('Format alim', 'PSU format');
      if (!caseId) add(psuId, 'psud', dimLbl, 'na', L('Boîtier absent — place à vérifier', 'No case — fit to verify') + fmtNote, A('Format', fmt || (pL ? pL + ' mm' : '?')), null);
      else if (!caseOk) add(psuId, 'psud', dimLbl, 'warn', L('Datasheet boîtier absente — place à vérifier', 'Missing case datasheet — fit to verify') + fmtNote, A(L('Longueur', 'Length'), pL ? pL + ' mm' : '?'), A('Boîtier', P[caseId].p.name || ''));
      else if (maxPsu && pL) {
        if (pL <= maxPsu) add(psuId, 'psud', dimLbl, 'ok', L(`${pL} ≤ ${maxPsu} mm (clearance boîtier)`, `${pL} ≤ ${maxPsu} mm (case clearance)`) + fmtNote, A(L('Longueur', 'Length'), pL + ' mm'), A('Clearance', maxPsu + ' mm'));
        else add(psuId, 'psud', dimLbl, 'err', L(`${pL} mm > clearance boîtier ${maxPsu} mm !`, `${pL} mm > case clearance ${maxPsu} mm!`) + fmtNote, A(L('Longueur', 'Length'), pL + ' mm'), A('Clearance', maxPsu + ' mm'));
      } else if (fmt && !pL) {
        const caseRaw = (P[caseId].ds && P[caseId].ds.raw) || '';
        const caseSfxOnly = /sfx|mini[- ]?itx|flex|tfx/i.test(caseRaw) && !/atx/i.test(caseRaw);
        const isSfxPsu = fmt === 'SFX' || fmt === 'SFX-L' || fmt === 'TFX' || fmt === 'FLEX';
        if (isSfxPsu && caseSfxOnly) add(psuId, 'psud', dimLbl, 'ok', L(`Format ${fmt} adapté au boîtier compact`, `Format ${fmt} fits compact case`), A('Format', fmt), A('Boîtier', P[caseId].p.name || ''));
        else if (fmt === 'ATX' && caseSfxOnly) add(psuId, 'psud', dimLbl, 'err', L('Format ATX incompatible avec un boîtier ITX/SFX uniquement', 'ATX format incompatible with an ITX/SFX-only case'), A('Format', 'ATX'), A('Boîtier', P[caseId].p.name || ''));
        else add(psuId, 'psud', dimLbl, 'warn', L(`Datasheet alim absente — vérifiez la place (${fmt})`, `Missing PSU datasheet — verify fit (${fmt})`), A('Format', fmt), A('Boîtier', P[caseId].p.name || ''));
      } else {
        add(psuId, 'psud', dimLbl, 'na', L('Dimensions alim non listées — vérifiez la place', 'PSU dimensions not listed — verify fit'), A('Format', fmt || '?'), A(L('Longueur', 'Length'), pL ? pL + ' mm' : '?'));
      }
    }
    /* ---- Schuko outlet capacity: multiprises & UPS ---- */
    const qtyOf = def => byDef(def).reduce((s, id) => s + (Number(P[id].qty) || 1), 0);
    const mainsExtra = ['printer', 'speakers', 'dock', 'router', 'switch', 'nas', 'extstorage'];
    const screenQty = qtyOf('screen1');
    const pcQty = psuId ? 1 : 0;
    const otherQty = mainsExtra.reduce((s, d) => s + qtyOf(d), 0);
    const upsPresent = byDef('ups').length > 0;
    const mpPresent = byDef('multiprise').length > 0;
    const batteryQty = screenQty + pcQty; // PC + screens that should sit on the UPS
    const outletsOf = id => {
      const raw = (P[id].ds && P[id].ds.raw) || '';
      let m = raw.match(/(\d+)\s*(?:prises?|sockets?|outlets?|sorties?|ports?)/i);
      if (!m) m = raw.match(/(?:prises?|sockets?|outlets?|sorties?|ports?)[^\d]{0,8}(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    };
    if (mpPresent) byDef('multiprise').forEach(id => {
      const need = otherQty + (upsPresent ? 1 : 0);
      const have = outletsOf(id);
      const LBL = L('Prises Schuko', 'Schuko outlets');
      const base = upsPresent
        ? L(`Onduleur branché sur la multiprise : ${need} prise(s) utilisée(s)${have ? ' / ' + have : ''}${batteryQty ? ' — PC/écrans sur l’onduleur' : ''}`,
            `UPS plugged into the strip: ${need} socket(s) used${have ? ' / ' + have : ''}${batteryQty ? ' — PC/screens on the UPS' : ''}`)
        : L(`${need} appareil(s) sur secteur (PC, écrans, périphériques)${have ? ' / ' + have + ' prises' : ''}`,
            `${need} mains device(s) (PC, screens, peripherals)${have ? ' / ' + have + ' sockets' : ''}`);
      if (have && need > have) add(id, 'schuko', LBL, ERR, L(`${need} prises nécessaires > ${have} disponibles — multiprise supplémentaire !`, `${need} sockets needed > ${have} available — extra strip needed!`), A('Appareils', need), A('Prises', have));
      else if (have) add(id, 'schuko', LBL, OK, base, A('Appareils', need), A('Prises', have));
      else add(id, 'schuko', LBL, WARN, base + L(' — nombre de prises à confirmer', ' — socket count to verify'), A('Appareils', need), A('Prises', '?'));
    });
    if (upsPresent) byDef('ups').forEach(id => {
      const need = batteryQty;
      const have = outletsOf(id);
      const LBL = L('Prises onduleur', 'UPS outlets');
      const base = mpPresent
        ? L(`Onduleur sur multiprise — ${need} appareil(s) sur batterie (PC + écrans)${have ? ' / ' + have + ' prises' : ''}`,
            `UPS on the strip — ${need} device(s) on battery (PC + screens)${have ? ' / ' + have + ' outlets' : ''}`)
        : L(`${need} appareil(s) sur batterie (PC + écrans)${have ? ' / ' + have + ' prises' : ''}`,
            `${need} device(s) on battery (PC + screens)${have ? ' / ' + have + ' outlets' : ''}`);
      if (have && need > have) add(id, 'schuko', LBL, ERR, L(`${need} prises nécessaires > ${have} — répartir PC/écrans`, `${need} outlets needed > ${have} — split PC/screens`), A('Batterie', need), A('Prises', have));
      else if (have) add(id, 'schuko', LBL, OK, base, A('Batterie', need), A('Prises', have));
      else add(id, 'schuko', LBL, WARN, base + L(' — nombre de prises à confirmer', ' — outlet count to verify'), A('Batterie', need), A('Prises', '?'));
    });
    /* ---- Case fans ---- */
    const PC_PARTS = ['cpu', 'mb', 'ram', 'cooler', 'thermal', 'ssd1', 'hdd', 'gpu', 'case', 'psu', 'psucables', 'netcard', 'os', 'soft'];
    const isFanSlot = id => P[id] && (P[id].defId === 'fans' || (!PC_PARTS.includes(P[id].defId) && /ventilateur|fan/i.test(P[id].p.name || '')));
    const chassisFanIds = order.filter(id => isFanSlot(id) && isCaseFan(P[id].p.name + ' ' + (P[id].ds ? P[id].ds.raw || '' : '')));
    chassisFanIds.forEach(id => {
      /* Fan slots are never listed on Idealo: always a manual check. */
      const cn = caseId && P[caseId] ? (P[caseId].p.name || '') : '';
      add(id, 'mount', L('Montage', 'Mount'), WARN, L(`Emplacements ventilateurs à vérifier manuellement${cn ? ` (boîtier ${cn})` : ''} — non renseignés sur Idealo`, `Manually verify case fan slots${cn ? ` (${cn})` : ''} — not listed on Idealo`), A('Ventilateur', P[id].p.name || '?'), A('Emplacements boîtier', '?'));
    });
    /* ---- Fan headers on motherboard vs fans + cooler ---- */
    const liquidCooler = coolerId && P[coolerId].hasDs && /liquide|liquid|watercooling|AIO/i.test(P[coolerId].ds.raw || '');
    const radFans = liquidCooler && P[coolerId].ds.radSize ? Math.min(3, Math.max(1, Math.round(P[coolerId].ds.radSize / 120))) : 0;
    const needCpu = coolerId ? 1 : 0; // air fan or AIO pump on CPU_FAN/AIO_PUMP
    /* Daisy chains: daisy-capable chassis fans share a single SYS_FAN header. */
    const daisyIds = chassisFanIds.filter(fid => {
      const F = P[fid].ds, nm = P[fid].p.name || '';
      return P[fid].hasDs && (F.daisy || /daisy[\s-]?chain/i.test(nm));
    });
    const plainIds = chassisFanIds.filter(fid => !daisyIds.includes(fid));
    /* Daisy chain on: one chained fan is deduced (shares its header with the chain). */
    const daisyNeed = daisyIds.length ? Math.max(1, daisyIds.length - 1) : 0;
    const needSys = plainIds.length + daisyNeed + radFans;
    const cpuPillId = coolerId; // CPU_FAN pill lives on the cooler…
    const sysPillId = chassisFanIds[0] || coolerId; // …SYS_FAN pills live on the (first) case fan
    if ((sysPillId && needSys > 0) || (cpuPillId && needCpu > 0)) {
      if (!mbId || !P[mbId].hasDs) add(sysPillId || cpuPillId, 'headers', L('Prises ventilateurs', 'Fan headers'), WARN, L('Prises ventilateurs CM inconnues — vérifiez', 'Unknown board fan headers — verify'), A('Ventilateurs', `${needSys} châssis${needCpu ? ' + ventirad' : ''}`), null);
      else {
        const fc = P[mbId].ds.fanCpu || 0, fs = P[mbId].ds.fanSys || 0;
        if (needCpu && cpuPillId) {
          const leftCpu = fc ? Math.max(0, fc - needCpu) : 0;
          if (fc >= needCpu) add(cpuPillId, 'cpuheader', L('Prise CPU_FAN', 'CPU_FAN header'), OK, L(`${fc} prise(s) CPU — ventirad/pompe sur CPU_FAN — ${leftCpu} restante(s)`, `${fc} CPU header(s) — cooler/pump on CPU_FAN — ${leftCpu} left`), A('Ventirad', '1× CPU_FAN'), A('Prises CPU CM', `${fc} (reste ${leftCpu})`, mbId));
          else add(cpuPillId, 'cpuheader', L('Prise CPU_FAN', 'CPU_FAN header'), WARN, L('Prises CPU_FAN CM inconnues — vérifiez', 'Unknown board CPU_FAN headers — verify'), A('Ventirad', '1× CPU_FAN'), A('Prises CPU CM', fc || '?', mbId));
        }
        if (needSys && sysPillId) {
          const leftSys = fs ? Math.max(0, fs - needSys) : 0;
          const chainNote = daisyIds.length ? L(` — dont ${daisyIds.length} en série (daisy chain, −1 prise)`, ` — incl. ${daisyIds.length} daisy-chained (−1 header)`) : '';
          if (fs >= needSys) add(sysPillId, 'sysheaders', L('Prises SYS_FAN', 'SYS_FAN headers'), OK, L(`${needSys} ventilateur(s) ≤ ${fs} prise(s) SYS_FAN${chainNote} — ${leftSys} restante(s) — ne pas utiliser CPU_FAN`, `${needSys} fan(s) ≤ ${fs} SYS_FAN header(s)${chainNote} — ${leftSys} left — do not use CPU_FAN`), A('Ventilateurs', needSys), A('Prises SYS_FAN CM', `${fs} (reste ${leftSys})`, mbId));
          else if (fs) add(sysPillId, 'sysheaders', L('Prises SYS_FAN', 'SYS_FAN headers'), WARN, L(`${needSys} ventilateurs pour ${fs} prise(s) SYS_FAN — splitter/hub requis`, `${needSys} fans for ${fs} SYS_FAN header(s) — splitter/hub needed`), A('Ventilateurs', needSys), A('Prises SYS_FAN CM', fs, mbId));
          else add(sysPillId, 'sysheaders', L('Prises SYS_FAN', 'SYS_FAN headers'), WARN, L('Prises SYS_FAN CM inconnues — vérifiez', 'Unknown board SYS_FAN headers — verify'), A('Ventilateurs', needSys), A('Prises SYS_FAN CM', '?', mbId));
        }
      }
    }
    /* Per-fan lighting from the product title (RGB/ARGB mentions). */
    chassisFanIds.forEach(fid => {
      if (!P[fid].hasDs) return;
      const fnm = P[fid].p.name || '';
      const fArgb = /(^|[^a-z])a[\s-]?rgb|adressable|addressable/i.test(fnm);
      const fRgb = !fArgb && /\brgb\b|led/i.test(fnm);
      if (fArgb || fRgb) rgbCheck(fid, fArgb, L('Ventilateur', 'Fan'));
    });
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
        if (!have) add(id, 'usb', 'USB', WARN, L('Ports arrière CM inconnus — hub conseillé', 'Unknown board rear ports — hub advised'), A('Appareils USB', usbIds.length), A('Ports CM', '?', mbId));
        else if (need <= have) add(id, 'usb', 'USB', OK, L(`${need} appareil(s) ≤ ${have} port(s)`, `${need} device(s) ≤ ${have} port(s)`), A('Appareils USB', need), A('Ports CM', have, mbId));
        else add(id, 'usb', 'USB', WARN, L(`${need} appareils pour ${have} ports — hub USB requis`, `${need} devices for ${have} ports — USB hub needed`), A('Appareils USB', need), A('Ports CM', have, mbId));
      });
    }
    /* ---- Router: LAN + SFP+ vs motherboard / switch ---- */
    const cardIds = [...new Set([
      ...byDef('soundcard'), ...byDef('capture'),
      ...order.filter(id => P[id] && !['soundcard', 'capture'].includes(P[id].defId) && /capture|acquisition|carte son|sound card|elgato|avermedia/i.test(P[id].p.name || '')),
    ])];
    const isExtCard = id => /usb|thunderbolt|externe|external/i.test((P[id].p.name || '') + ' ' + (P[id].hasDs ? P[id].ds.raw || '' : ''));
    const intCards = cardIds.filter(id => !isExtCard(id));
    const usbNic = id => /usb|externe|external/i.test((P[id].p.name || '') + ' ' + (P[id].hasDs ? P[id].ds.raw || '' : ''));
    const intNicIds = byDef('netcard').filter(nid => P[nid].hasDs && !usbNic(nid));
    const intAll = [...intCards, ...intNicIds]; // every internal PCIe x1 card, GPU first
    /* Shared x1/x16 placement: rank = position among internal cards. */
    const x1place = (M, rank) => {
      const x1eff = Math.max(0, (M.slotX1 || 0) - gpuX1blocked);
      if (x1eff && rank < x1eff) return { where: 'x1', x1eff };
      const x16used = (gpuId ? 1 : 0) + Math.max(0, rank - x1eff);
      if ((M.slotX16 || 0) > x16used) return { where: 'x16', free: (M.slotX16 || 0) - x16used };
      return { where: null, x1eff };
    };
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
      if (!lan) add(id, 'lan', 'LAN', WARN, L('LAN CM inconnu — vérifiez', 'Unknown board LAN — verify'), A('Routeur', rlan + ' GbE'), A('LAN CM', '?', mbId));
      else if (rlan >= lan) add(id, 'lan', 'LAN', OK, L(`Routeur ${rlan} GbE ≥ CM ${lan} GbE`, `Router ${rlan}GbE ≥ board ${lan}GbE`), A('Routeur', rlan + ' GbE'), A('LAN CM', lan + ' GbE', mbId));
      else add(id, 'lan', 'LAN', WARN, L(`Routeur ${rlan} GbE < CM ${lan} GbE — lien bridé à ${rlan} GbE`, `Router ${rlan}GbE < board ${lan}GbE — link capped at ${rlan}GbE`), A('Routeur', rlan + ' GbE'), A('LAN CM', lan + ' GbE', mbId));
      if (P[id].hasDs && P[id].ds.sfp) {
        const swSfp = byDef('switch').some(sid => P[sid].hasDs && P[sid].ds.sfp);
        const swSfpId = byDef('switch').find(sid => P[sid].hasDs && P[sid].ds.sfp) || null;
        if (swSfp) add(id, 'sfp', 'SFP+', OK, L('SFP+ routeur + switch — liaison fibre possible', 'Router + switch SFP+ — fiber uplink possible'), A('Routeur', 'SFP+'), A('Switch', 'SFP+', swSfpId));
        else add(id, 'sfp', 'SFP+', WARN, L('SFP+ routeur sans switch SFP+ — port inutilisé', 'Router SFP+ without SFP+ switch — unused port'), A('Routeur', 'SFP+'), A('Switch', '?', swSfpId));
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
        if (swTop >= rLan) add(id, 'router', L('Routeur', 'Router'), OK, L(`Switch ${swTop} ≥ routeur ${rLan} GbE`, `Switch ${swTop} ≥ router ${rLan}GbE`), aSw, A('Routeur', rLan + ' GbE', firstOf('router')));
        else add(id, 'router', L('Routeur', 'Router'), WARN, L(`Switch ${swTop} < routeur ${rLan} GbE — lien bridé`, `Switch ${swTop} < router ${rLan}GbE — capped link`), aSw, A('Routeur', rLan + ' GbE', firstOf('router')));
      }
      const pcTop = Math.max(mbLan, nicTop);
      if (pcTop) {
        if (swTop >= pcTop) add(id, 'pc', 'PC', OK, L(`Switch ${swTop} ≥ lien PC ${pcTop} GbE`, `Switch ${swTop} ≥ PC link ${pcTop}GbE`), aSw, A('Lien PC', pcTop + ' GbE'));
        else add(id, 'pc', 'PC', WARN, L(`Switch ${swTop} < lien PC ${pcTop} GbE — bridé`, `Switch ${swTop} < PC link ${pcTop}GbE — capped`), aSw, A('Lien PC', pcTop + ' GbE'));
      } else if (!rLan) add(id, 'ports', L('Ports', 'Ports'), WARN, L('Vitesses routeur/PC inconnues — vérifiez', 'Unknown router/PC speeds — verify'), aSw, null);
    });
    /* ---- Network card: PCIe slot (if internal) + link speed ---- */
    byDef('netcard').forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      if (!usbNic(id) && mbId && P[mbId].hasDs) {
        const M = P[mbId].ds;
        const rank = intAll.indexOf(id);
        const pl = x1place(M, rank);
        if (pl.where === 'x1') add(id, 'slot', L('Slot', 'Slot'), OK, L(`Slot PCIe x1 libre (n°${rank + 1}/${pl.x1eff}${gpuX1blocked ? ', GPU recouvre 1 slot' : ''})`, `Free PCIe x1 slot (#${rank + 1}/${pl.x1eff}${gpuX1blocked ? ', GPU covers 1 slot' : ''})`), A('Carte', 'PCIe x1'), A('Slots x1 CM', pl.x1eff, mbId));
        else if (pl.where === 'x16') add(id, 'slot', L('Slot', 'Slot'), OK, L('Carte x1 dans slot x16 libre (compatible)', 'x1 card in free x16 slot (compatible)'), A('Carte', 'PCIe x1'), A('Slots x16 libres', pl.free, mbId));
        else if (M.slotX1 || M.slotX16) add(id, 'slot', L('Slot', 'Slot'), ERR, L('Plus de slot PCIe libre !', 'No free PCIe slot left!'), A('Carte', 'PCIe x1'), A('Slots CM', `x16:${M.slotX16 || '?'} x1:${M.slotX1 || '?'}`, mbId));
        else add(id, 'slot', L('Slot', 'Slot'), WARN, L('Slot libre à confirmer', 'Confirm free slot'), A('Carte', P[id].p.name || '?'), A('Slots CM', '?', mbId));
      } else if (!usbNic(id)) add(id, 'slot', L('Slot', 'Slot'), WARN, L('Slots CM à confirmer', 'Confirm board slots'), A('Carte', P[id].p.name || '?'), null);
      else if (mbUsbA > 0) add(id, 'slot', L('Slot', 'Slot'), OK, L(`Carte USB — ${mbUsbA} port(s) USB-A arrière`, `USB card — ${mbUsbA} rear USB-A port(s)`), A('Carte', 'USB'), A('USB-A arrière', mbUsbA, mbId));
      else add(id, 'slot', L('Slot', 'Slot'), WARN, L('Ports USB CM à confirmer', 'Confirm board USB ports'), A('Carte', 'USB'), null);
      const nicTop = P[id].ds.portSpeed || P[id].ds.lan || 0;
      const swTops = byDef('switch').filter(sid => P[sid].hasDs).map(sid => P[sid].ds.portSpeed || (P[sid].ds.rj45 ? 1 : 0));
      const swTop = swTops.length ? Math.max(...swTops) : 0;
      const mbLan = (mbId && P[mbId].hasDs) ? (P[mbId].ds.lan || 0) : 0;
      if (nicTop && swTop) {
        if (nicTop <= swTop) add(id, 'link', L('Débit', 'Speed'), OK, L(`Carte ${nicTop} ≤ switch ${swTop} GbE`, `NIC ${nicTop} ≤ switch ${swTop}GbE`), A('Carte', nicTop + ' GbE'), A('Switch', swTop + ' GbE', firstOf('switch')));
        else add(id, 'link', L('Débit', 'Speed'), WARN, L(`Carte ${nicTop} > switch ${swTop} GbE — bridée`, `NIC ${nicTop} > switch ${swTop}GbE — capped`), A('Carte', nicTop + ' GbE'), A('Switch', swTop + ' GbE', firstOf('switch')));
      } else if (nicTop && mbLan) {
        if (nicTop > mbLan) add(id, 'link', L('Débit', 'Speed'), OK, L(`Carte ${nicTop} > LAN CM ${mbLan} GbE — utile`, `NIC ${nicTop} > board LAN ${mbLan}GbE — useful`), A('Carte', nicTop + ' GbE'), A('LAN CM', mbLan + ' GbE', mbId));
        else add(id, 'link', L('Débit', 'Speed'), WARN, L(`Carte ${nicTop} ≤ LAN CM ${mbLan} GbE — intérêt à confirmer`, `NIC ${nicTop} ≤ board LAN ${mbLan}GbE — confirm usefulness`), A('Carte', nicTop + ' GbE'), A('LAN CM', mbLan + ' GbE', mbId));
      } else if (nicTop || swTop || mbLan) add(id, 'link', L('Débit', 'Speed'), WARN, L('Débits carte/switch/CM à confirmer', 'Confirm NIC/switch/board speeds'), A('Carte', nicTop ? nicTop + ' GbE' : '?'), A('Réseau', swTop ? swTop + ' GbE' : mbLan ? mbLan + ' GbE' : '?'));
    });
    /* ---- NAS vs switch / router link ---- */
    byDef('nas').forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const D = P[id].ds;
      const nasTop = D.portSpeed || D.lan || 0;
      const nasSfp = D.sfp || 0;
      const aNas = A('NAS', nasTop ? nasTop + ' GbE' : (nasSfp ? 'SFP+' : '?'));
      const swIds = byDef('switch').filter(sid => P[sid].hasDs);
      const swTop = Math.max(0, ...swIds.map(sid => P[sid].ds.portSpeed || (P[sid].ds.rj45 ? 1 : 0)));
      const swSfp = swIds.some(sid => P[sid].ds.sfp);
      const rIds = routerIds.filter(rid => P[rid].hasDs);
      const rLan = rIds.length ? Math.max(...rIds.map(rid => routerLanOf(rid))) : 0;
      const rSfp = rIds.some(rid => P[rid].ds.sfp);
      if (!swIds.length && !rIds.length) { add(id, 'link', L('Liaison', 'Uplink'), NA, L('Ni switch ni routeur — liaison à confirmer', 'No switch or router — confirm link'), aNas, null); return; }
      if (nasSfp && (swSfp || rSfp)) { add(id, 'link', L('Liaison', 'Uplink'), OK, L('SFP+ des deux côtés — liaison 10G+ possible', 'SFP+ on both ends — 10G+ uplink possible'), A('NAS', `${nasSfp}×SFP+`), A('Pair', 'SFP+')); return; }
      if (swIds.length) {
        if (!nasTop || !swTop) add(id, 'link', L('Liaison', 'Uplink'), WARN, L('Débits NAS/switch à confirmer', 'Confirm NAS/switch speeds'), aNas, A('Switch', swTop ? swTop + ' GbE' : '?', firstOf('switch')));
        else if (nasTop <= swTop) add(id, 'link', L('Liaison', 'Uplink'), OK, L(`NAS ${nasTop} ≤ switch ${swTop} GbE`, `NAS ${nasTop} ≤ switch ${swTop}GbE`), aNas, A('Switch', swTop + ' GbE', firstOf('switch')));
        else add(id, 'link', L('Liaison', 'Uplink'), WARN, L(`NAS ${nasTop} > switch ${swTop} GbE — bridé`, `NAS ${nasTop} > switch ${swTop}GbE — capped`), aNas, A('Switch', swTop + ' GbE', firstOf('switch')));
        return;
      }
      if (!nasTop || !rLan) add(id, 'link', L('Liaison', 'Uplink'), WARN, L('Débits NAS/routeur à confirmer', 'Confirm NAS/router speeds'), aNas, A('Routeur', rLan ? rLan + ' GbE' : '?', firstOf('router')));
      else if (nasTop <= rLan) add(id, 'link', L('Liaison', 'Uplink'), OK, L(`NAS ${nasTop} ≤ routeur ${rLan} GbE`, `NAS ${nasTop} ≤ router ${rLan}GbE`), aNas, A('Routeur', rLan + ' GbE', firstOf('router')));
      else add(id, 'link', L('Liaison', 'Uplink'), WARN, L(`NAS ${nasTop} > routeur ${rLan} GbE — bridé`, `NAS ${nasTop} > router ${rLan}GbE — capped`), aNas, A('Routeur', rLan + ' GbE', firstOf('router')));
    });
    /* ---- UPS vs total (PC + screens) ---- */
    byDef('ups').forEach(id => {
      if (!needDs(id)) {
        const cap = upsCapW(P[id].p, P[id].ds, P[id].ds.raw);
        const need = Math.round(pw.upsTotal);
        if (!cap) add(id, 'load', L('Charge', 'Load'), WARN, L('Puissance onduleur inconnue — vérifiez', 'Unknown UPS capacity — verify'), A('Onduleur', '?'), A('Besoin', need + ' W'));
        else if (need && need > cap) add(id, 'load', L('Charge', 'Load'), ERR, L(`${need}W (PC+écrans) > ~${cap}W !`, `${need}W (PC+screens) > ~${cap}W!`), A('Onduleur', '~' + cap + ' W'), A('Besoin', need + ' W'));
        else add(id, 'load', L('Charge', 'Load'), OK, L(`~${cap}W suffisants (PC+écrans ~${need}W)`, `~${cap}W sufficient (PC+screens ~${need}W)`), A('Onduleur', '~' + cap + ' W'), A('Besoin', need + ' W'));
      }
    });
    /* ---- PCIe capture/sound cards: internal (PCIe x1) vs external (USB) ---- */
    cardIds.forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const lbl = L('Slot', 'Slot');
      if (isExtCard(id)) {
        const cType = isUsbCDevice((P[id].p.name || '') + ' ' + (P[id].ds.raw || '')) ? 'C' : 'A';
        const have = cType === 'C' ? mbUsbC : mbUsbA;
        if (!mbId || !P[mbId].hasDs) add(id, 'slot', lbl, WARN, L('Carte externe — ports USB CM à confirmer', 'External card — confirm board USB ports'), A('Carte', P[id].p.name || '?'), null);
        else if (have > 0) add(id, 'slot', lbl, OK, L(`Carte externe USB-${cType} — ${have} port(s) arrière`, `External USB-${cType} card — ${have} rear port(s)`), A('Carte', 'USB-' + cType), A(`USB-${cType} arrière`, have));
        else add(id, 'slot', lbl, WARN, L(`Carte externe USB-${cType} — ports arrière à confirmer`, `External USB-${cType} card — confirm rear ports`), A('Carte', 'USB-' + cType), A(`USB-${cType} arrière`, '?'));
        return;
      }
      if (!mbId || !P[mbId].hasDs) { add(id, 'slot', lbl, WARN, L('Slots CM à confirmer', 'Confirm board slots'), A('Carte', P[id].p.name || '?'), null); return; }
      const M = P[mbId].ds;
      const rank = intAll.indexOf(id); // 0-based among ALL internal x1 cards (sound/capture/NIC)
      const pl = x1place(M, rank);
      if (pl.where === 'x1') add(id, 'slot', lbl, OK, L(`Carte interne — slot PCIe x1 n°${rank + 1}/${pl.x1eff} libre${gpuX1blocked ? ' (GPU recouvre 1 slot)' : ''}`, `Internal card — free PCIe x1 slot #${rank + 1}/${pl.x1eff}${gpuX1blocked ? ' (GPU covers 1 slot)' : ''}`), A('Carte', 'PCIe x1'), A('Slots x1 CM', pl.x1eff, mbId));
      else if (pl.where === 'x16') add(id, 'slot', lbl, OK, L('Carte x1 dans slot x16 libre (compatible)', 'x1 card in free x16 slot (compatible)'), A('Carte', 'PCIe x1'), A('Slots x16 libres', pl.free, mbId));
      else if (M.slotX1 || M.slotX16) add(id, 'slot', lbl, ERR, L('Plus de slot PCIe libre pour cette carte !', 'No free PCIe slot left for this card!'), A('Carte', 'PCIe x1'), A('Slots CM', `x16:${M.slotX16 || '?'} x1:${M.slotX1 || '?'}`, mbId));
      else add(id, 'slot', lbl, WARN, L('Slot libre à confirmer (GPU + carte d’extension)', 'Confirm free slot (GPU + add-in card)'), A('Carte', P[id].p.name || '?'), A('Slots CM', '?', mbId));
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
    const outId = (srcVid && (srcVid.hdmi || srcVid.dp || srcVid.usbc)) ? gpuId : mbId;
    const outName = (srcVid && (srcVid.hdmi || srcVid.dp || srcVid.usbc)) ? L('Sorties GPU', 'GPU outputs') : L('Sorties CM', 'Board outputs');
    screenIds.forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const sw = pwOf(id);
      if (sw && sw.w > 0) add(id, 'power', L('Conso', 'Power'), OK, L(`Écran ~${sw.w}W — hors PSU, compté pour l'onduleur`, `Monitor ~${sw.w}W — not on PSU, counted for UPS`), A('Écran', `~${sw.w} W`, id), A('Prises', '1'));
      else add(id, 'power', L('Conso', 'Power'), WARN, L('Conso écran non renseignée — hors PSU, à confirmer pour l\u2019onduleur', 'Unknown monitor draw — not on PSU, confirm for UPS'), A('Écran', '?', id), null);
      const SD = P[id].ds;
      const V = SD.vid;
      const hasIn = V && (V.hdmi || V.dp || V.usbc);
      const ins = V ? [V.hdmi && 'HDMI', V.dp && 'DP', V.usbc && 'USB-C'].filter(Boolean) : [];
      const hasOut = outVid && (outVid.hdmi || outVid.dp || outVid.usbc);
      let common = [];
      if (!hasIn) add(id, 'input', L('Entrée vidéo', 'Video input'), WARN, L('Entrées vidéo de l’écran inconnues — vérifiez le câble (HDMI/DP/USB-C)', 'Unknown monitor inputs — verify cable (HDMI/DP/USB-C)'), A('Entrées écran', '?'), hasOut ? A(outName, fmtVid(outVid)) : null);
      else if (!hasOut) add(id, 'input', L('Entrée vidéo', 'Video input'), WARN, L('Sorties vidéo GPU/CM inconnues — vérifiez', 'Unknown GPU/board outputs — verify'), A('Entrées écran', ins.join(' + ')), A(outName, '?', outId));
      else {
        common = ins.filter(k => (k === 'HDMI' && outVid.hdmi) || (k === 'DP' && outVid.dp) || (k === 'USB-C' && outVid.usbc));
        if (common.length) add(id, 'input', L('Entrée vidéo', 'Video input'), OK, L(`${common.join(' + ')} des deux côtés`, `${common.join(' + ')} on both ends`), A('Entrées écran', ins.join(' + ')), A(outName, fmtVid(outVid), outId));
        else add(id, 'input', L('Entrée vidéo', 'Video input'), WARN, L(`Écran ${ins.join(' + ')} ≠ ${fmtVid(outVid)} — adaptateur à prévoir`, `Monitor ${ins.join(' + ')} ≠ ${fmtVid(outVid)} — adapter needed`), A('Entrées écran', ins.join(' + ')), A(outName, fmtVid(outVid), outId));
      }
      /* port speed: hi-demand (res×Hz) needs HDMI 2.1 / DP 1.4 on both ends */
      const rw = SD.resWH, hz = SD.refresh || 0;
      const dem = (rw && hz) ? rw.w * rw.h * hz : 0;
      const hi = dem > 450000000;
      if (common.length && (hi || (SD.hdmiVer && outDs && outDs.hdmiVer) || (SD.dpVer && outDs && outDs.dpVer))) {
        const port = common.includes('DP') ? 'DP' : common.includes('HDMI') ? 'HDMI' : 'USB-C';
        if (port === 'USB-C') add(id, 'ver', L('Débit vidéo', 'Video speed'), OK, L('USB-C Alt Mode — débit suffisant', 'USB-C Alt Mode — enough bandwidth'), A('Écran', `${rw ? rw.w + '×' + rw.h : '?'}@${hz || '?'}Hz`), A(outName, 'USB-C', outId));
        else {
          const needV = port === 'HDMI' ? 2.1 : 1.4;
          const sV = port === 'HDMI' ? (SD.hdmiVer || 0) : (SD.dpVer || 0);
          const oV = outDs ? (port === 'HDMI' ? (outDs.hdmiVer || 0) : (outDs.dpVer || 0)) : 0;
          const fmtV = v => v || '?';
          if (sV && oV) {
            if (sV >= needV && oV >= needV) add(id, 'ver', L('Débit vidéo', 'Video speed'), OK, L(`${port} ${sV}/${oV} — suffisant pour ${rw.w}×${rw.h}@${hz}Hz`, `${port} ${sV}/${oV} — enough for ${rw.w}×${rw.h}@${hz}Hz`), A('Écran', `${port} ${sV}`), A(outName, `${port} ${oV}`, outId));
            else add(id, 'ver', L('Débit vidéo', 'Video speed'), WARN, L(`${port} ${fmtV(sV)}/${fmtV(oV)} < ${needV} — ${rw.w}×${rw.h}@${hz}Hz bridé, vérifiez le câble`, `${port} ${fmtV(sV)}/${fmtV(oV)} < ${needV} — ${rw.w}×${rw.h}@${hz}Hz capped, verify cable`), A('Écran', `${port} ${fmtV(sV)}`), A(outName, `${port} ${fmtV(oV)}`, outId));
          } else if (hi) add(id, 'ver', L('Débit vidéo', 'Video speed'), WARN, L(`${rw.w}×${rw.h}@${hz}Hz exige ${port} ${needV} des deux côtés — versions à confirmer`, `${rw.w}×${rw.h}@${hz}Hz needs ${port} ${needV} on both ends — confirm versions`), A('Écran', `${port} ${fmtV(sV)}`), A(outName, `${port} ${fmtV(oV)}`, outId));
        }
      }
      /* resolution vs GPU max */
      const gpMax = srcDs ? srcDs.maxResWH : null;
      if (rw && gpMax) {
        if (rw.w * rw.h <= gpMax.w * gpMax.h) add(id, 'res', L('Résolution', 'Resolution'), OK, L(`${rw.w}×${rw.h} ≤ max GPU ${gpMax.w}×${gpMax.h}`, `${rw.w}×${rw.h} ≤ GPU max ${gpMax.w}×${gpMax.h}`), A('Écran', `${rw.w}×${rw.h}`), A('Max GPU', `${gpMax.w}×${gpMax.h}`, (srcDs ? gpuId : mbId)));
        else add(id, 'res', L('Résolution', 'Resolution'), WARN, L(`${rw.w}×${rw.h} > max GPU ${gpMax.w}×${gpMax.h} !`, `${rw.w}×${rw.h} > GPU max ${gpMax.w}×${gpMax.h}!`), A('Écran', `${rw.w}×${rw.h}`), A('Max GPU', `${gpMax.w}×${gpMax.h}`, (srcDs ? gpuId : mbId)));
      }
      if (screenIds.length > 1) {
        const outs = hasOut ? ((outVid.hdmi || 0) + (outVid.dp || 0) + (outVid.usbc || 0)) : 0;
        if (outs && screenIds.length > outs) add(id, 'count', L('Écrans', 'Monitors'), WARN, L(`${screenIds.length} écrans pour ~${outs} sortie(s) — MST/dock requis`, `${screenIds.length} monitors for ~${outs} output(s) — MST/dock needed`), A('Écrans', screenIds.length), A(outName, fmtVid(outVid), outId));
        else if (outs) add(id, 'count', L('Écrans', 'Monitors'), OK, L(`${screenIds.length} écran(s) pour ~${outs} sortie(s)`, `${screenIds.length} monitor(s) for ~${outs} output(s)`), A('Écrans', screenIds.length), A(outName, fmtVid(outVid), outId));
      }
    });
    /* ---- USB / wireless / audio peripherals vs motherboard ---- */
    const usbPeripherals = ['keyboard', 'mouse', 'pad', 'headset', 'gamepad', 'speakers', 'webcam', 'graphictab', 'usbstick', 'extstorage'];
    usbPeripherals.forEach(defId => {
      byDef(defId).forEach(id => {
        if (!P[id].hasDs) { needDs(id); return; }
        const D = P[id].ds, W = D.wireless || {};
        const lbl = L('Connexion', 'Connection');
        /* Pad: USB check only when a USB connection cable is mentioned (same line). */
        const padUsb = defId === 'pad' && String((P[id].p.name || '') + '\n' + (D.raw || '')).split('\n').some(ln => /c[aâ]ble|cable|cord|cordon/i.test(ln) && /usb/i.test(ln));
        if (defId === 'pad' && !padUsb) return; // plain pad: nothing to check
        const forceUsb = padUsb || defId === 'usbstick' || defId === 'extstorage';
        const needsUsb = forceUsb || W.rf || W.wired || (!W.bt && !W.wl && !D.jack && /usb/i.test(D.raw || ''));
        if (D.jack && (defId === 'headset' || defId === 'speakers')) {
          if (mbAudio) add(id, 'audio', lbl, OK, L('Jack 3,5 mm — audio CM intégrée', '3.5mm jack — onboard board audio'), A('Casque/enceintes', 'Jack 3,5 mm'), A('Audio CM', String(P[mbId].ds.audio || 'intégré'), mbId));
          else add(id, 'audio', lbl, WARN, L('Jack 3,5 mm — audio CM à confirmer', '3.5mm jack — confirm board audio'), A('Casque/enceintes', 'Jack 3,5 mm'), A('Audio CM', '?', mbId));
          return;
        }
        if (W.bt) {
          if (mbBt) add(id, 'bt', lbl, OK, L(`Bluetooth des deux côtés (CM ${mbBt})`, `Bluetooth on both ends (board ${mbBt})`), A('Périphérique', 'Bluetooth' + (W.btVer ? ' ' + W.btVer : '')), A('Bluetooth CM', String(mbBt), mbId));
          else add(id, 'bt', lbl, WARN, L('Bluetooth CM non détecté — dongle USB fourni avec le périphérique ?', 'Board Bluetooth not detected — USB dongle bundled?'), A('Périphérique', 'Bluetooth'), A('Bluetooth CM', '?', mbId));
          return;
        }
        if (needsUsb || W.wl) {
          const txt = (P[id].p.name || '') + ' ' + (D.raw || '');
          /* USB-C cable (not a 2.4GHz dongle): check USB-C on board rear or case front. */
          if (isUsbCDevice(txt) && !W.rf) {
            const whatC = L('USB-C (câble)', 'USB-C (cable)');
            const caseC = (caseId && P[caseId].hasDs && P[caseId].ds.frontUsbC) ? 1 : 0;
            if (!mbId || !P[mbId].hasDs) add(id, 'usb', lbl, WARN, L('Ports USB-C CM inconnus — vérifiez', 'Unknown board USB-C ports — verify'), A('Périphérique', whatC), null);
            else if (mbUsbC > 0) add(id, 'usb', lbl, OK, L(`USB-C — ${mbUsbC} port(s) USB-C à l’arrière`, `USB-C — ${mbUsbC} rear USB-C port(s)`), A('Périphérique', whatC), A('USB-C arrière', mbUsbC, mbId));
            else if (caseC) add(id, 'usb', lbl, OK, L('USB-C en façade du boîtier', 'Front-panel case USB-C'), A('Périphérique', whatC), A('USB-C façade', L('oui', 'yes'), caseId));
            else add(id, 'usb', lbl, WARN, L('Pas d’USB-C détecté (CM/boîtier) — vérifiez manuellement (adaptateur ?)', 'No USB-C found (board/case) — verify manually (adapter?)'), A('Périphérique', whatC), A('USB-C', '?'));
          } else {
          const what = W.rf ? L('Dongle 2,4 GHz (USB-A)', '2.4GHz dongle (USB-A)') : L('USB filaire (USB-A)', 'Wired USB (USB-A)');
          if (!mbId || !P[mbId].hasDs) add(id, 'usb', lbl, WARN, L('Ports USB arrière CM inconnus — vérifiez', 'Unknown board rear USB ports — verify'), A('Périphérique', what), null);
          else if (mbUsbA > 0) add(id, 'usb', lbl, OK, L(`${what} — ${mbUsbA} port(s) USB-A à l’arrière`, `${what} — ${mbUsbA} rear USB-A port(s)`), A('Périphérique', what), A('USB-A arrière', mbUsbA, mbId));
          else add(id, 'usb', lbl, WARN, L('Ports USB-A arrière CM inconnus — hub conseillé', 'Unknown board rear USB-A ports — hub advised'), A('Périphérique', what), A('USB-A arrière', '?', mbId));
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
      else if (mbUsbC > 0) add(id, 'link', L('Liaison', 'Uplink'), OK, L(`USB-C vers ${mbUsbC} port(s) arrière`, `USB-C to ${mbUsbC} rear port(s)`), A('Station', 'USB-C/TB'), A('USB-C arrière', mbUsbC, mbId));
      else add(id, 'link', L('Liaison', 'Uplink'), WARN, L('Pas d’USB-C arrière détecté sur la CM — vérifiez', 'No rear USB-C detected on board — verify'), A('Station', 'USB-C/TB'), A('USB-C arrière', '?', mbId));
      if (mbId && P[mbId].hasDs) {
        const dTop = P[id].ds.usbTop || 0, mTop = P[mbId].ds.usbTop || 0;
        if (dTop && mTop) {
          if (dTop <= mTop) add(id, 'speed', L('Débit', 'Speed'), OK, L(`Station ~${dTop} ≤ CM ~${mTop} Gbps — plein débit`, `Dock ~${dTop} ≤ board ~${mTop} Gbps — full speed`), A('Station', `~${dTop} Gbps`), A('USB-C CM', `~${mTop} Gbps`, mbId));
          else add(id, 'speed', L('Débit', 'Speed'), WARN, L(`Station ~${dTop} > CM ~${mTop} Gbps — bridée à ~${mTop}`, `Dock ~${dTop} > board ~${mTop} Gbps — capped at ~${mTop}`), A('Station', `~${dTop} Gbps`), A('USB-C CM', `~${mTop} Gbps`, mbId));
        } else if (dTop || mTop) add(id, 'speed', L('Débit', 'Speed'), WARN, L('Débit station/CM à confirmer (Thunderbolt/USB 5-40 Gbps)', 'Confirm dock/board speed (Thunderbolt/USB 5-40 Gbps)'), A('Station', dTop ? `~${dTop} Gbps` : '?'), A('USB-C CM', mTop ? `~${mTop} Gbps` : '?', mbId));
      }
    });
    /* ---- SD / microSD card vs case or dock reader ---- */
    byDef('memcard').forEach(id => {
      if (!P[id].hasDs) { needDs(id); return; }
      const cR = caseId && P[caseId].hasDs && P[caseId].ds.cardReader ? caseId : null;
      const dR = byDef('dock').find(did => P[did].hasDs && P[did].ds.cardReader) || null;
      const where = cR && dR ? L('Boîtier + dock', 'Case + dock') : cR ? L('Boîtier', 'Case') : dR ? 'Dock' : null;
      if (where) add(id, 'reader', L('Lecteur', 'Reader'), OK, L(`Lecteur SD : ${where}`, `SD reader: ${where}`), A('Carte', 'SD/microSD'), A('Lecteur', where, cR || dR));
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

  return { check, parseDatasheet, parse, powerBreakdown, OK, WARN, ERR, NA, CHECKED, KWH_PRICE, HOURS_DAY };
})();
try { module.exports = Compat; } catch { /* browser */ }
