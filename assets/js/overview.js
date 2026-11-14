'use strict';
const Overview = (() => {
  const D = OVERVIEW_DATA;
  let ctx = null;
  let transferTimer = null;
  let transferRun = 0;

  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
  const round = (n, d = 0) => {
    const p = 10 ** d;
    return Math.round((Number(n) || 0) * p) / p;
  };
  const T = key => {
    const item = D.i18n[key];
    if (!item) return key;
    return (ctx && ctx.lang === 'en') ? item.en : item.fr;
  };
  const esc = value => (ctx && ctx.esc ? ctx.esc(value) : String(value ?? ''));
  const num = (value, dec = 0) => (Number(value) || 0).toLocaleString((ctx && ctx.lang === 'en') ? 'en-US' : 'fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const money = value => (ctx && ctx.money ? ctx.money(value) : `${num(value, 2)} €`);
  const L = (en, fr) => ((ctx && ctx.lang === 'en') ? en : fr);
  const icon = cls => `<i class="${cls}"></i>`;
  const pct = value => `${clamp(value, 0, 100)}%`;
  const safe = fn => { try { return fn(); } catch { return null; } };
  const DRIVE_DEFS = ['ssd1', 'ssd2', 'hdd', 'extssd', 'extstorage', 'usbstick', 'memcard', 'nas'];

  function defaultState() { return clone(D.defaultState); }

  function normalize(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== 'object') return base;
    const out = { ...base, ...raw };
    out.view = raw.view === 'setup' ? 'setup' : 'pc';
    out.pcTab = ['photos', 'airflow', 'pcie', 'psu'].includes(raw.pcTab) ? raw.pcTab : 'photos';
    out.setupTab = ['layout', 'ports'].includes(raw.setupTab) ? raw.setupTab : 'layout';
    out.photo = Math.max(0, Number(raw.photo) || 0);
    out.airflow = { ...base.airflow, ...(raw.airflow || {}) };
    out.airflow.front = clamp(out.airflow.front, 0, 6);
    out.airflow.top = clamp(out.airflow.top, 0, 4);
    out.airflow.rear = clamp(out.airflow.rear, 0, 3);
    out.airflow.bottom = clamp(out.airflow.bottom, 0, 3);
    out.airflow.fanSize = Number(out.airflow.fanSize) === 140 ? 140 : 120;
    out.airflow.rpm = clamp(out.airflow.rpm, 400, 2200);
    out.airflow.heatW = clamp(out.airflow.heatW, 0, 1500);
    out.airflow.radiator = ['none', 'front', 'top', 'side'].includes(out.airflow.radiator) ? out.airflow.radiator : 'front';
    out.psu = { ...base.psu, ...(raw.psu || {}) };
    out.psu.loadMode = raw.psu && raw.psu.loadMode === 'manual' ? 'manual' : 'auto';
    out.psu.loadW = clamp(out.psu.loadW, 50, 2000);
    out.psu.hours = clamp(out.psu.hours, 0.5, 24);
    out.psu.efficiency = ['auto', 'titanium', 'platinum', 'gold', 'silver', 'bronze', 'white', 'none'].includes(out.psu.efficiency) ? out.psu.efficiency : 'auto';
    out.setup = { ...base.setup, ...(raw.setup || {}) };
    out.setup.positions = (raw.setup && raw.setup.positions && typeof raw.setup.positions === 'object') ? { ...raw.setup.positions } : {};
    out.setup.deskW = clamp(out.setup.deskW || 160, 80, 320);
    out.setup.deskD = clamp(out.setup.deskD || 80, 45, 140);
    out.setup.wall = clamp(out.setup.wall || 240, 120, 500);
    out.ports = {
      ...base.ports,
      ...(raw.ports || {}),
      usb: Array.isArray(raw.ports && raw.ports.usb) ? raw.ports.usb.filter(x => x && typeof x === 'object').map((x, i) => ({
        id: String(x.id || `usb${i + 1}`),
        type: D.usbTypes[x.type] ? x.type : 'usb-a',
        label: String(x.label || `USB ${i + 1}`),
        device: String(x.device || '')
      })) : base.ports.usb,
      power: Array.isArray(raw.ports && raw.ports.power) ? raw.ports.power.filter(x => x && typeof x === 'object').map((x, i) => ({
        id: String(x.id || `pwr${i + 1}`),
        label: String(x.label || `Prise ${i + 1}`),
        device: String(x.device || '')
      })) : base.ports.power
    };
    out.ports.maxW = clamp(out.ports.maxW || 3680, 500, 8000);
    out.tasks = { ...base.tasks, ...(raw.tasks || {}) };
    out.tasks.scenario = D.scenarios[out.tasks.scenario] ? out.tasks.scenario : 'gaming';
    out.tasks.apps = Array.isArray(out.tasks.apps) ? [...new Set(out.tasks.apps.filter(id => D.apps.some(a => a.id === id)))] : [];
    out.tasks.background = out.tasks.background !== false;
    out.storage = { ...base.storage, ...(raw.storage || {}) };
    out.storage.libs = { ...base.storage.libs };
    if (raw.storage && raw.storage.libs && typeof raw.storage.libs === 'object') {
      Object.keys(out.storage.libs).forEach(key => {
        out.storage.libs[key] = { ...out.storage.libs[key], ...(raw.storage.libs[key] || {}) };
        out.storage.libs[key].on = out.storage.libs[key].on !== false;
        out.storage.libs[key].size = clamp(out.storage.libs[key].size, 0, 100000);
        out.storage.libs[key].drive = String(out.storage.libs[key].drive || '');
      });
    }
    out.storage.reserve = clamp(out.storage.reserve, 0, 50);
    out.transfer = { ...base.transfer, ...(raw.transfer || {}) };
    out.transfer.size = clamp(out.transfer.size, 0.001, 10000);
    out.transfer.unit = ['MB', 'GB', 'TB'].includes(out.transfer.unit) ? out.transfer.unit : 'GB';
    out.transfer.files = clamp(out.transfer.files, 1, 100000);
    out.transfer.overhead = clamp(out.transfer.overhead, 0, 30);
    out.transfer.verify = out.transfer.verify === true;
    out.transfer.from = String(out.transfer.from || '');
    out.transfer.to = String(out.transfer.to || '');
    out.version = D.version;
    return out;
  }

  function ensure() {
    if (!ctx || !ctx.state) return defaultState();
    if (!ctx.state.overview) ctx.state.overview = defaultState();
    else ctx.state.overview = normalize(ctx.state.overview);
    return ctx.state.overview;
  }

  function parseDs(product) {
    if (!product || !product.datasheet) return {};
    if (typeof Compat === 'undefined' || !Compat.parseDatasheet) return {};
    return safe(() => Compat.parseDatasheet(product.datasheet) || {}) || {};
  }

  function selected(id) {
    const slot = ctx && ctx.state && ctx.state.slots && ctx.state.slots[id];
    if (!slot || !Array.isArray(slot.products)) return null;
    return slot.products.find(p => p.id === slot.selectedId) || null;
  }

  function defIdOf(id) {
    if (ctx && ctx.defId) return ctx.defId(id);
    const slot = ctx && ctx.state && ctx.state.slots && ctx.state.slots[id];
    return slot ? slot.defId : id;
  }

  function slotLabel(id) {
    return ctx && ctx.slotName ? ctx.slotName(id) : id;
  }

  function selectedRows(sec) {
    const out = [];
    const order = (ctx && ctx.state && ctx.state.order) || [];
    order.forEach(id => {
      const p = selected(id);
      if (!p) return;
      const defId = defIdOf(id);
      const section = ctx && ctx.sectionOf ? ctx.sectionOf(id) : null;
      if (sec && section !== sec) return;
      out.push({ id, defId, section, p, ds: parseDs(p) });
    });
    return out;
  }

  function byDef(defId) {
    return selectedRows().find(x => x.defId === defId) || null;
  }

  function caseRow() {
    return byDef('case') || selectedRows().find(x => /bo[iî]tier|case/i.test(x.p.name || '')) || null;
  }

  function estimatePower() {
    if (ctx && ctx.power && Number(ctx.power.psuTotal) > 0) return Number(ctx.power.psuTotal);
    let w = 0;
    selectedRows('pc').forEach(row => {
      if (['case', 'psu', 'psucables', 'thermal', 'os', 'soft'].includes(row.defId)) return;
      const direct = Number(row.p.watts) || 0;
      const dsW = Number(row.ds.tdp) || Number(row.ds.gpuW) || 0;
      w += (direct || dsW || 0) * (Number(row.p.qty) || 1);
    });
    return Math.max(35, Math.round(w || 180));
  }

  function parseCapacityGB(text) {
    const source = String(text || '').replace(/\u00a0/g, ' ');
    const re = /(\d+(?:[.,]\d+)?)\s*(TB|TO|T|GB|GO|G)\b/gi;
    let best = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      const value = parseFloat(m[1].replace(',', '.'));
      if (!(value > 0)) continue;
      const unit = m[2].toUpperCase();
      const gb = (unit.startsWith('T')) ? value * 1000 : value;
      if (gb > best && gb <= 100000) best = gb;
    }
    return best;
  }

  function parseSpeedMBs(text) {
    const source = String(text || '').replace(/\u00a0/g, ' ');
    const re = /(\d+(?:[\s.]?\d{3})*(?:[.,]\d+)?)\s*(Mo\/s|MB\/s|MBs|Go\/s|GB\/s|Gb\/s|Gbps)\b/gi;
    let best = 0;
    let m;
    while ((m = re.exec(source)) !== null) {
      let value = parseFloat(m[1].replace(/\s/g, '').replace(',', '.'));
      if (!(value > 0)) continue;
      if (/^(Go|GB|Gb|Gbps)/i.test(m[2])) value *= 1000;
      if (/Gbps/i.test(m[2])) value /= 8;
      if (value > best && value < 100000) best = value;
    }
    return best;
  }

  function driveRows() {
    const rows = [];
    selectedRows().forEach(row => {
      const text = `${row.p.name || ''} ${row.p.specs || ''}`;
      const isDrive = DRIVE_DEFS.includes(row.defId) || /ssd|hdd|nvme|disque|stockage|storage|nas/i.test(row.p.name || '');
      if (!isDrive) return;
      const capacity = parseCapacityGB(`${row.p.name || ''} ${row.p.specs || ''} ${row.ds.raw || ''}`) || (row.defId === 'usbstick' ? 64 : row.defId === 'nas' ? 4000 : 1000);
      const speed = parseSpeedMBs(`${row.p.name || ''} ${row.p.specs || ''} ${row.ds.raw || ''}`) || (/hdd|disque dur/i.test(text) ? 160 : /usb/i.test(`${row.p.name} ${row.ds.raw || ''}`) ? 450 : 3500);
      const busText = `${row.ds.bus || ''} ${row.ds.proto || ''}`;
      const kind = /hdd|disque dur/i.test(text) ? 'HDD' : /nvme|m\.2/i.test(text) || (/pcie/i.test(busText) && !/sata|usb/i.test(busText)) ? 'NVMe' : /nas/i.test(text) ? 'NAS' : /usb|externe|external/i.test(text) ? 'USB' : 'SSD';
      rows.push({ ...row, capacity, speed, kind });
    });
    if (!rows.length) {
      selectedRows().filter(r => ['ssd1', 'hdd'].includes(r.defId)).forEach(row => {
        rows.push({ ...row, capacity: 1000, speed: row.defId === 'hdd' ? 160 : 3500, kind: row.defId === 'hdd' ? 'HDD' : 'NVMe' });
      });
    }
    return rows;
  }

  function powerForDevice(id) {
    const power = ctx && ctx.power;
    if (id === 'pc' || id === 'psu') return Math.round((power && power.psuTotal) || estimatePower());
    const row = selectedRows().find(x => x.id === id) || byDef(id);
    if (row) {
      const w = Number(row.ds.screenW) || Number(row.p.watts) || 0;
      if (id === 'screen1' || id === 'screen2') return Math.round(w || (id === 'screen2' ? 35 : 45));
      if (w > 0) return Math.round(w * (Number(row.p.qty) || 1));
    }
    const item = D.powerDevices.find(x => x.id === id);
    return Math.round((item && item.watts) || 0);
  }

  function usbType(type) {
    return D.usbTypes[type] || D.usbTypes['usb-a'];
  }

  function usbDevice(id) {
    return D.usbDevices.find(x => x.id === id) || D.usbDevices[0];
  }

  function powerDevice(id) {
    return D.powerDevices.find(x => x.id === id) || D.powerDevices[0];
  }

  function powerPortLabel(port) {
    const label = String((port && port.label) || '');
    return ctx && ctx.lang === 'en' ? label.replace(/^Prise\s+/i, 'Outlet ') : label;
  }

  function airflowInfo() {
    const ov = ensure();
    const air = ov.airflow;
    const fanCount = air.front + air.top + air.rear + air.bottom;
    const baseCfm = air.fanSize === 140 ? 72 : 57;
    const rpmFactor = Math.pow(air.rpm / 1000, 0.82);
    const radPenalty = air.radiator === 'none' ? 1 : air.radiator === 'front' || air.radiator === 'side' ? 0.82 : 0.9;
    const intake = (air.front * baseCfm + air.bottom * baseCfm * 0.72) * radPenalty * rpmFactor;
    const exhaust = (air.rear * baseCfm * 0.95 + air.top * baseCfm * 0.9) * (air.radiator === 'top' ? 0.84 : 1) * rpmFactor;
    const cfm = Math.max(0, round(intake * 0.62 + exhaust * 0.38, 0));
    const heat = air.heatW > 0 ? air.heatW : estimatePower();
    const delta = cfm > 0 ? round(heat / (cfm * 0.57), 1) : null;
    const balanceValue = intake - exhaust;
    const balance = Math.abs(balanceValue) < Math.max(12, Math.max(intake, exhaust) * 0.08) ? 'neutral' : balanceValue > 0 ? 'positive' : 'negative';
    const noise = fanCount > 0 ? round(18 + 10 * Math.log10(fanCount) + 17 * Math.log2(Math.max(400, air.rpm) / 700), 0) : 0;
    return { ...air, fanCount, intake: round(intake, 0), exhaust: round(exhaust, 0), cfm, heat, delta, noise, balance, balanceValue: round(balanceValue, 0) };
  }

  function efficiencyValue() {
    const ov = ensure();
    if (ov.psu.efficiency !== 'auto') return { key: ov.psu.efficiency, value: { titanium: 0.94, platinum: 0.92, gold: 0.9, silver: 0.88, bronze: 0.85, white: 0.82, none: 0.8 }[ov.psu.efficiency] || 0.86 };
    const psu = byDef('psu');
    const text = psu ? `${psu.p.name || ''} ${psu.p.specs || ''} ${psu.ds.raw || ''}` : '';
    const found = [['titanium', 0.94], ['platinum', 0.92], ['gold', 0.9], ['silver', 0.88], ['bronze', 0.85], ['white', 0.82]].find(([key]) => new RegExp(key, 'i').test(text) || new RegExp(`80\\s*\\+\\s*${key}`, 'i').test(text));
    return found ? { key: found[0], value: found[1] } : { key: 'none', value: 0.86 };
  }

  function psuInfo() {
    const ov = ensure();
    const psu = byDef('psu');
    const cap = psu ? (Number(psu.p.capW) || Number(psu.ds.capW) || parseCapacityGB(`${psu.p.name || ''}`) || (String(psu.p.name || '').match(/(\d{3,4})\s*W/i) || [])[1] || 750) : 0;
    const load = ov.psu.loadMode === 'manual' ? ov.psu.loadW : Math.round((ctx && ctx.power && ctx.power.psuTotal) || estimatePower());
    const eff = efficiencyValue();
    const wall = load / eff.value;
    const util = cap > 0 ? load / cap * 100 : 0;
    const headroom = cap > 0 ? cap - load : 0;
    const status = cap <= 0 ? 'empty' : util > 100 ? 'over' : util > 85 ? 'tight' : 'good';
    const kwh = wall * ov.psu.hours * 365 / 1000;
    const rate = ctx && Number(ctx.kwhPrice) > 0 ? Number(ctx.kwhPrice) : 0.2516;
    const cost = kwh * rate;
    const recommended = Math.ceil((load * 1.35) / 50) * 50;
    return { psu, cap, load, eff, wall: round(wall, 0), util: round(util, 1), headroom: round(headroom, 0), status, kwh: round(kwh, 0), cost, recommended };
  }

  function pcieInfo() {
    const mb = byDef('mb');
    const gpu = byDef('gpu');
    const cpu = byDef('cpu');
    const mds = mb ? mb.ds : {};
    const cpuDs = cpu ? cpu.ds : {};
    const slots16 = Math.max(0, Number(mds.slotX16) || (mb ? 1 : 0));
    const slots1 = Math.max(0, Number(mds.slotX1) || 0);
    const gen = Number(mds.pcieGen) || Number(cpuDs.pcieGen) || 4;
    const cpuLanes = Number(cpuDs.pcieLanes) || Number(mds.pcieLanes) || 24;
    const nvmeRows = selectedRows().filter(r => {
      if (!DRIVE_DEFS.includes(r.defId) && !/ssd|nvme|disque|stockage|storage/i.test(r.p.name || '')) return false;
      const text = `${r.p.name || ''} ${r.p.specs || ''} ${r.ds.raw || ''}`;
      return /nvme|m\.2/i.test(text) && !/sata/i.test(text);
    });
    const gpuLanes = gpu ? 16 : 0;
    const cardRows = selectedRows().filter(r => ['netcard', 'capture', 'soundcard'].includes(r.defId));
    const cardLanes = cardRows.reduce((sum, r) => sum + (r.defId === 'capture' ? 4 : 1), 0);
    const nvmeLanes = nvmeRows.length * 4;
    const used = gpuLanes + nvmeLanes + cardLanes;
    const free = Math.max(0, cpuLanes - used);
    return { mb, gpu, cpu, mds, slots16, slots1, gen, cpuLanes, gpuLanes, nvmeRows, cardRows, nvmeLanes, cardLanes, used, free, overloaded: used > cpuLanes };
  }

  function taskInfo() {
    const ov = ensure();
    const scenario = D.scenarios[ov.tasks.scenario] || D.scenarios.gaming;
    const apps = ov.tasks.apps.map(id => D.apps.find(a => a.id === id)).filter(Boolean);
    const bg = ov.tasks.background ? { cpu: 2.2, gpu: 1.2, ram: 0.9, disk: 1.5 } : { cpu: 0, gpu: 0, ram: 0, disk: 0 };
    const cpu = clamp(scenario.cpu + bg.cpu + apps.reduce((s, a) => s + a.cpu, 0), 1, 100);
    const gpu = clamp(scenario.gpu + bg.gpu + apps.reduce((s, a) => s + a.gpu, 0), 0, 100);
    const memGB = scenario.ram + bg.ram + apps.reduce((s, a) => s + a.ram, 0);
    const ramRow = byDef('ram');
    const ramTotal = Math.max(8, Number(ramRow && (ramRow.ds.ramCap || ramRow.ds.ramPerMod)) || 32);
    const disk = clamp(scenario.disk + bg.disk + apps.reduce((s, a) => s + a.disk, 0), 0, 100);
    const processes = [{ label: scenario.label, cpu: scenario.cpu, gpu: scenario.gpu, ram: scenario.ram, disk: scenario.disk, kind: 'base' }]
      .concat(apps.map(a => ({ ...a, kind: 'app' })));
    if (ov.tasks.background) processes.push({ label: { fr: 'Tâches de fond Windows', en: 'Windows background' }, cpu: bg.cpu, gpu: bg.gpu, ram: bg.ram, disk: bg.disk, kind: 'bg' });
    processes.sort((a, b) => (b.cpu + b.gpu + b.disk) - (a.cpu + a.gpu + a.disk));
    return { scenario, apps, cpu: round(cpu, 0), gpu: round(gpu, 0), ram: round(memGB, 1), ramPct: round(memGB / ramTotal * 100, 0), ramTotal, disk: round(disk, 0), processes };
  }

  function storageInfo() {
    const ov = ensure();
    const drives = driveRows();
    const usedByDrive = {};
    drives.forEach(d => { usedByDrive[d.id] = 0; });
    const fallback = drives.find(d => /nvme|ssd/i.test(d.kind)) || drives[0];
    const fallback2 = drives.find(d => /hdd/i.test(d.kind)) || fallback;
    const libs = D.libraries.map(def => {
      const saved = ov.storage.libs[def.id] || { on: true, size: def.size, drive: '' };
      let target = saved.drive;
      if (!target || !drives.some(d => d.id === target)) target = ['media', 'backups', 'photos'].includes(def.id) ? (fallback2 && fallback2.id) : (fallback && fallback.id);
      return { ...def, ...saved, target };
    });
    libs.forEach(lib => {
      if (!lib.on || !usedByDrive.hasOwnProperty(lib.target)) return;
      usedByDrive[lib.target] += lib.size;
    });
    const driveStats = drives.map(d => {
      const used = usedByDrive[d.id] || 0;
      const usable = d.capacity * (1 - ov.storage.reserve / 100);
      return { ...d, used, usable, free: Math.max(0, usable - used), pct: usable > 0 ? clamp(used / usable * 100, 0, 100) : 0, over: used > usable };
    });
    const totalCap = driveStats.reduce((s, d) => s + d.capacity, 0);
    const totalUsed = libs.filter(l => l.on).reduce((s, l) => s + l.size, 0);
    return { drives: driveStats, libs, totalCap, totalUsed, totalPct: totalCap > 0 ? clamp(totalUsed / totalCap * 100, 0, 100) : 0 };
  }

  function transferOptions() {
    const drives = driveRows().map(d => ({ id: d.id, label: `${d.p.name || slotLabel(d.id)} · ${d.kind}`, read: d.speed, write: d.kind === 'HDD' ? Math.min(180, d.speed) : d.speed * 0.85, kind: d.kind }));
    const net = [
      { id: 'lan1', label: L('LAN 1 GbE', 'LAN 1 GbE'), read: 112, write: 112, kind: 'LAN' },
      { id: 'lan25', label: L('LAN 2.5 GbE', 'LAN 2.5 GbE'), read: 280, write: 280, kind: 'LAN' },
      { id: 'lan10', label: L('LAN 10 GbE', 'LAN 10 GbE'), read: 1100, write: 1100, kind: 'LAN' },
      { id: 'wifi6', label: L('Wi-Fi 6', 'Wi-Fi 6'), read: 75, write: 65, kind: 'Wi-Fi' }
    ];
    return drives.concat(net);
  }

  function transferInfo() {
    const ov = ensure();
    const options = transferOptions();
    const from = options.find(o => o.id === ov.transfer.from) || options[0] || null;
    const to = options.find(o => o.id === ov.transfer.to) || options[1] || options[0] || null;
    const multiplier = ov.transfer.unit === 'TB' ? 1000000 : ov.transfer.unit === 'GB' ? 1000 : 1;
    const sizeMB = ov.transfer.size * multiplier;
    const baseSpeed = from && to ? Math.max(1, Math.min(from.read, to.write)) : 0;
    const speed = baseSpeed * (1 - ov.transfer.overhead / 100) * (ov.transfer.verify ? 0.82 : 1);
    const seconds = speed > 0 ? (sizeMB / speed) + Math.max(0, ov.transfer.files - 1) * 0.15 : 0;
    const bottleneck = from && to ? (from.read <= to.write ? from : to) : null;
    return { ov: ov.transfer, options, from, to, sizeMB, speed: round(speed, 0), seconds, bottleneck };
  }

  function formatTime(seconds) {
    if (!(seconds > 0)) return '—';
    if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
    if (seconds < 60) return `${num(seconds, seconds < 10 ? 1 : 0)} s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;
    return `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`;
  }

  function metric(label, value, suffix = '', tone = '') {
    return `<div class="ov-metric${tone ? ' ' + tone : ''}"><span>${esc(label)}</span><strong>${esc(value)}${suffix ? `<small>${esc(suffix)}</small>` : ''}</strong></div>`;
  }

  function pill(label, tab, active, attr) {
    return `<button type="button" class="ov-pill${active ? ' active' : ''}" data-${attr}="${tab}" role="tab" aria-selected="${active}">${esc(label)}</button>`;
  }

  function subnav(items, active, attr) {
    return `<div class="ov-subnav" role="tablist">${items.map(([key, label]) => pill(label, key, key === active, attr)).join('')}</div>`;
  }

  function renderPhotos() {
    const row = caseRow();
    const images = row ? [...new Set([...(Array.isArray(row.p.images) ? row.p.images : []), row.p.image].filter(Boolean))] : [];
    const ov = ensure();
    const index = images.length ? ((ov.photo % images.length) + images.length) % images.length : 0;
    const main = images[index] || '';
    const specs = row ? row.ds : {};
    return `<section class="ov-card ov-gallery-card">
      <div class="ov-card-head"><h3>${icon('lucide:images')} ${esc(T('ov.case'))}</h3><span class="ov-chip">${esc(row ? row.p.name : T('ov.caseFallback'))}</span></div>
      <div class="ov-gallery">
        <div class="ov-gallery-main">${main ? `<img src="${esc(main)}" alt="${esc(row ? row.p.name : T('ov.case'))}">` : `<div class="ov-empty-photo">${icon('lucide:pc-case')}<strong>${esc(T('ov.caseFallback'))}</strong><span>${esc(T('ov.caseFallbackHint'))}</span></div>`}</div>
        <div class="ov-gallery-side">
          <div class="ov-case-name">${esc(row ? row.p.name : '—')}</div>
          <p class="ov-muted">${esc(row ? (row.p.specs || row.ds.raw || '').slice(0, 220) : T('ov.empty'))}</p>
          <div class="ov-kv-grid">
            ${specs.caseForms && specs.caseForms.length ? `<span><small>${esc(T('ov.form'))}</small><strong>${esc(specs.caseForms.join(' / '))}</strong></span>` : ''}
            ${specs.caseGpuMax ? `<span><small>${esc(T('ov.maxGpu'))}</small><strong>${num(specs.caseGpuMax, 0)} mm</strong></span>` : ''}
            ${specs.caseCoolerMax ? `<span><small>${esc(T('ov.maxCooler'))}</small><strong>${num(specs.caseCoolerMax, 0)} mm</strong></span>` : ''}
            ${specs.caseRads && specs.caseRads.length ? `<span><small>${esc(T('ov.radSupport'))}</small><strong>${esc(specs.caseRads.join(' / '))} mm</strong></span>` : ''}
          </div>
          ${images.length > 1 ? `<div class="ov-thumbs">${images.map((img, i) => `<button type="button" class="ov-thumb${i === index ? ' active' : ''}" data-ov-photo="${i}" aria-label="${esc(T('ov.photos'))} ${i + 1}"><img src="${esc(img)}" alt=""></button>`).join('')}</div><p class="ov-muted">${esc(T('ov.galleryHint'))}</p>` : ''}
        </div>
      </div>
    </section>`;
  }

  function fanWord(count) {
    return Number(count) === 1 ? L('fan', 'ventilateur') : L('fans', 'ventilateurs');
  }

  function fanDots(count, direction, size) {
    const dots = [];
    for (let i = 0; i < count; i++) dots.push(`<span class="ov-fan-dot ${direction} ${size === 140 ? 'big' : ''}" style="--d:${i}"></span>`);
    return dots.join('');
  }

  function renderAirflow() {
    const a = airflowInfo();
    const tone = a.delta == null ? '' : a.delta < 9 ? 'ok' : a.delta < 15 ? 'warn' : 'bad';
    const pressureKey = a.balance === 'positive' ? 'ov.positive' : a.balance === 'negative' ? 'ov.negative' : 'ov.neutral';
    return `<section class="ov-card">
      <div class="ov-card-head"><h3>${icon('lucide:wind')} ${esc(T('ov.airflow'))}</h3><span class="ov-chip">${esc(T('ov.estimate'))}</span></div>
      <div class="ov-airflow">
        <div class="ov-case" data-anim="${a.fanCount ? 'on' : 'off'}">
          <div class="ov-case-label top">${esc(T('ov.top'))} · ${a.top} ${esc(fanWord(a.top))}</div>
          <div class="ov-case-fans top">${fanDots(a.top, 'down', a.fanSize)}</div>
          <div class="ov-case-label front">${esc(T('ov.front'))} · ${a.front} ${esc(fanWord(a.front))}</div>
          <div class="ov-case-fans front">${fanDots(a.front, 'right', a.fanSize)}</div>
          <div class="ov-case-label rear">${esc(T('ov.rear'))} · ${a.rear} ${esc(fanWord(a.rear))}</div>
          <div class="ov-case-fans rear">${fanDots(a.rear, 'right', a.fanSize)}</div>
          <div class="ov-case-label bottom">${esc(T('ov.bottom'))} · ${a.bottom} ${esc(fanWord(a.bottom))}</div>
          <div class="ov-case-fans bottom">${fanDots(a.bottom, 'up', a.fanSize)}</div>
          <div class="ov-case-core">${icon('lucide:gpu')}<span>${esc(num(a.heat, 0))} W</span><small>${esc(T('ov.heat'))}</small></div>
          <span class="ov-air-arrow a1">→</span><span class="ov-air-arrow a2">→</span><span class="ov-air-arrow a3">↑</span><span class="ov-air-arrow a4">↓</span>
        </div>
        <div class="ov-controls">
          <div class="ov-control-row"><span>${esc(T('ov.front'))}</span><span class="ov-stepper"><button type="button" data-air-step="front" data-delta="-1">−</button><b>${a.front}</b><button type="button" data-air-step="front" data-delta="1">+</button></span></div>
          <div class="ov-control-row"><span>${esc(T('ov.top'))}</span><span class="ov-stepper"><button type="button" data-air-step="top" data-delta="-1">−</button><b>${a.top}</b><button type="button" data-air-step="top" data-delta="1">+</button></span></div>
          <div class="ov-control-row"><span>${esc(T('ov.rear'))}</span><span class="ov-stepper"><button type="button" data-air-step="rear" data-delta="-1">−</button><b>${a.rear}</b><button type="button" data-air-step="rear" data-delta="1">+</button></span></div>
          <div class="ov-control-row"><span>${esc(T('ov.bottom'))}</span><span class="ov-stepper"><button type="button" data-air-step="bottom" data-delta="-1">−</button><b>${a.bottom}</b><button type="button" data-air-step="bottom" data-delta="1">+</button></span></div>
          <label class="ov-field"><span>${esc(T('ov.fanSize'))}</span><select data-ov-air="fanSize"><option value="120"${a.fanSize === 120 ? ' selected' : ''}>120 mm</option><option value="140"${a.fanSize === 140 ? ' selected' : ''}>140 mm</option></select></label>
          <label class="ov-field"><span>${esc(T('ov.radiator'))}</span><select data-ov-air="radiator"><option value="none"${a.radiator === 'none' ? ' selected' : ''}>${esc(T('ov.none'))}</option><option value="front"${a.radiator === 'front' ? ' selected' : ''}>${esc(T('ov.radFront'))}</option><option value="top"${a.radiator === 'top' ? ' selected' : ''}>${esc(T('ov.radTop'))}</option><option value="side"${a.radiator === 'side' ? ' selected' : ''}>${esc(T('ov.radSide'))}</option></select></label>
          <label class="ov-field"><span>${esc(T('ov.rpm'))}</span><input type="range" min="400" max="2200" step="50" value="${a.rpm}" data-ov-air-range="rpm"><em>${num(a.rpm, 0)} rpm</em></label>
          <label class="ov-field"><span>${esc(T('ov.heat'))}</span><input type="number" min="0" max="1500" step="10" value="${a.heatW || ''}" placeholder="${esc(T('ov.heatAuto'))}" data-ov-air="heatW"><em>${a.heatW ? esc(T('ov.manual')) : esc(T('ov.auto'))}</em></label>
        </div>
      </div>
      <div class="ov-metrics" id="ovAirflowMetrics">
        ${metric(T('ov.cfm'), num(a.cfm, 0), ' CFM')}
        ${metric(T('ov.pressure'), a.balanceValue > 0 ? `+${num(a.balanceValue, 0)}` : num(a.balanceValue, 0), ' CFM', a.balance === 'neutral' ? 'ok' : '')}
        ${metric(T('ov.delta'), a.delta == null ? '—' : `+${num(a.delta, 1)}`, ' °C', tone)}
        ${metric(T('ov.noise'), num(a.noise, 0), ' dB(A)')}
        ${metric(T('ov.balance'), T(pressureKey), '', a.balance === 'neutral' ? 'ok' : '')}
      </div>
      <p class="ov-note">${esc(T(`ov.${a.balance}Hint`))} ${esc(T('ov.airflowNote'))}</p>
    </section>`;
  }

  function laneRail(pcie) {
    return Array.from({ length: pcie.cpuLanes }, (_, i) => {
      const cls = i < Math.min(pcie.gpuLanes, 16) ? 'gpu' : i < pcie.gpuLanes + pcie.nvmeLanes ? 'nvme' : i < pcie.used ? 'card' : 'free';
      return `<span class="ov-lane ${cls}"></span>`;
    }).join('');
  }

  function renderPcie() {
    const p = pcieInfo();
    return `<section class="ov-card">
      <div class="ov-card-head"><h3>${icon('lucide:circuit-board')} ${esc(T('ov.pcie'))}</h3><span class="ov-chip">PCIe ${p.gen}.0</span></div>
      <div class="ov-pcie-top">
        <div class="ov-pcie-board">
          <div class="ov-board-name">${esc(p.mb ? p.mb.p.name : T('ov.noBoard'))}</div>
          <div class="ov-board-slots">
            ${Array.from({ length: p.slots16 }, (_, i) => `<div class="ov-pcie-slot x16"><span>x16</span><b>${i === 0 && p.gpu ? esc(p.gpu.p.name) : '—'}</b></div>`).join('')}
            ${Array.from({ length: p.slots1 }, (_, i) => `<div class="ov-pcie-slot x1"><span>x1</span><b>${i < p.cardRows.length ? esc(p.cardRows[i].p.name) : '—'}</b></div>`).join('')}
            ${Array.from({ length: Math.max(1, Number(p.mds.m2count) || p.nvmeRows.length) }, (_, i) => `<div class="ov-pcie-slot m2"><span>M.2</span><b>${p.nvmeRows[i] ? esc(p.nvmeRows[i].p.name) : '—'}</b></div>`).join('')}
          </div>
        </div>
        <div class="ov-pcie-stats">
          ${metric(T('ov.gpuLanes'), p.gpuLanes ? 'x16' : '—')}
          ${metric(T('ov.usedLanes'), num(p.used, 0), ` / ${p.cpuLanes}`)}
          ${metric(T('ov.freeLanes'), num(p.free, 0), '', p.free < 4 ? 'warn' : 'ok')}
          ${metric(T('ov.nvme'), num(p.nvmeRows.length, 0), ' × x4')}
        </div>
      </div>
      <div class="ov-lane-rail">${laneRail(p)}</div>
      <div class="ov-lane-legend"><span class="gpu">${esc(T('ov.gpu'))}</span><span class="nvme">${esc(T('ov.nvme'))}</span><span class="card">${esc(T('ov.cards'))}</span><span class="free">${esc(T('ov.freeLanes'))}</span></div>
      ${p.overloaded ? `<p class="ov-warn">${esc(L('Lane budget exceeded: some devices will share or be capped.', 'Budget de voies dépassé : certains périphériques partageront des voies ou seront bridés.'))}</p>` : ''}
      <div class="ov-actions"><a class="ov-btn" href="${esc((ctx && ctx.pcieUrl) || 'https://pcie-simulator.vercel.app/')}" target="_blank" rel="noopener">${icon('fa-solid fa-arrow-up-right-from-square')} ${esc(T('ov.pcieOpen'))}</a></div>
      <p class="ov-note">${esc(T('ov.pcieNote'))}</p>
    </section>`;
  }

  function psuMetricsHtml(p) {
    const statusLabel = p.status === 'over' ? T('ov.over') : p.status === 'tight' ? T('ov.tight') : p.status === 'good' ? T('ov.good') : '—';
    const tone = p.status === 'over' ? 'bad' : p.status === 'tight' ? 'warn' : p.status === 'good' ? 'ok' : '';
    return [
      metric(T('ov.wall'), num(p.wall, 0), ' W'),
      metric(T('ov.headroom'), p.cap ? `${num(p.headroom, 0)}` : '—', ' W', tone),
      metric(T('ov.recommended'), num(p.recommended, 0), ' W', 'ok'),
      metric(T('ov.annual'), num(p.kwh, 0), ' kWh'),
      metric(T('ov.cost'), money(p.cost), L('/yr', '/an')),
      metric(T('ov.status'), statusLabel, '', tone)
    ].join('');
  }

  function renderPsu() {
    const p = psuInfo();
    const ov = ensure();
    return `<section class="ov-card">
      <div class="ov-card-head"><h3>${icon('fa-solid fa-plug-circle-bolt')} ${esc(T('ov.psu'))}</h3><span class="ov-chip">${esc(p.psu ? p.psu.p.name : T('ov.estimate'))}</span></div>
      <div class="ov-psu-grid">
        <div class="ov-psu-gauge">
          <div class="ov-ring" style="--p:${pct(p.util)};--tone:var(--${p.status === 'over' ? 'danger' : p.status === 'tight' ? 'warn' : 'ok'})"><strong>${num(p.util, 0)}%</strong><span>${esc(T('ov.load'))}</span></div>
          <div class="ov-psu-numbers"><span><small>${esc(T('ov.capacity'))}</small><strong>${p.cap ? `${num(p.cap, 0)} W` : '—'}</strong></span><span><small>${esc(T('ov.load'))}</small><strong>${num(p.load, 0)} W</strong></span><span><small>${esc(T('ov.headroom'))}</small><strong>${p.cap ? `${num(p.headroom, 0)} W` : '—'}</strong></span></div>
        </div>
        <div class="ov-controls">
          <div class="ov-segment"><button type="button" class="${ov.psu.loadMode === 'auto' ? 'active' : ''}" data-psu-mode="auto">${esc(T('ov.psuAuto'))}</button><button type="button" class="${ov.psu.loadMode === 'manual' ? 'active' : ''}" data-psu-mode="manual">${esc(T('ov.psuManual'))}</button></div>
          <label class="ov-field"><span>${esc(T('ov.load'))}</span><input type="range" min="50" max="2000" step="10" value="${clamp(ov.psu.loadMode === 'manual' ? ov.psu.loadW : p.load, 50, 2000)}" data-psu-range="loadW"${ov.psu.loadMode === 'manual' ? '' : ' disabled'}><em>${num(ov.psu.loadMode === 'manual' ? ov.psu.loadW : p.load, 0)} W</em></label>
          <label class="ov-field"><span>${esc(T('ov.efficiency'))}</span><select data-ov-psu="efficiency"><option value="auto"${ov.psu.efficiency === 'auto' ? ' selected' : ''}>${esc(T('ov.effAuto'))}</option><option value="titanium"${ov.psu.efficiency === 'titanium' ? ' selected' : ''}>80+ Titanium</option><option value="platinum"${ov.psu.efficiency === 'platinum' ? ' selected' : ''}>80+ Platinum</option><option value="gold"${ov.psu.efficiency === 'gold' ? ' selected' : ''}>80+ Gold</option><option value="silver"${ov.psu.efficiency === 'silver' ? ' selected' : ''}>80+ Silver</option><option value="bronze"${ov.psu.efficiency === 'bronze' ? ' selected' : ''}>80+ Bronze</option><option value="white"${ov.psu.efficiency === 'white' ? ' selected' : ''}>80+ White</option><option value="none"${ov.psu.efficiency === 'none' ? ' selected' : ''}>80+</option></select><em>${num(p.eff.value * 100, 0)} %</em></label>
          <label class="ov-field"><span>${esc(T('ov.hours'))}</span><input type="range" min="0.5" max="24" step="0.5" value="${ov.psu.hours}" data-psu-range="hours"><em>${num(ov.psu.hours, 1)} h</em></label>
        </div>
      </div>
      <div class="ov-metrics">${psuMetricsHtml(p)}</div>
      <p class="ov-note">${esc(T('ov.psuNote'))}</p>
    </section>`;
  }

  function positionFor(ov, id, defId, index) {
    if (ov.setup.positions[id]) return { ...D.setupPositions[defId], ...ov.setup.positions[id] };
    const def = D.setupPositions[defId];
    if (def) {
      if (defId === 'screen1' && /screen2/.test(id)) return { ...def, x: 76 };
      return { ...def };
    }
    return { x: 14 + (index % 4) * 18, y: 18 + (index % 3) * 14, w: 7 + (defId === 'desk' ? 12 : 0) };
  }

  function renderLayout() {
    const ov = ensure();
    const rows = selectedRows('setup').concat(caseRow() ? [caseRow()] : []);
    const items = rows.map((row, index) => {
      const base = D.setupPositions[row.defId] || {};
      const pos = positionFor(ov, row.id, row.defId, index);
      const image = row.p.image ? `<img src="${esc(row.p.image)}" alt="">` : '';
      return `<button type="button" class="ov-setup-item${row.defId === 'case' ? ' pc' : ''}" data-ov-drag="${esc(row.id)}" style="left:${pos.x}%;top:${pos.y}%;width:${pos.w}%;--scale:${Number(base.scale) || 1}" title="${esc(row.p.name)}">
        ${image}<span class="ov-setup-ico">${icon(row.p.image ? 'lucide:grip' : 'lucide:box')}</span><b>${esc(row.p.name || slotLabel(row.id))}</b>
      </button>`;
    }).join('');
    const out = Object.keys(ov.setup.positions).some(id => {
      const p = ov.setup.positions[id];
      return p && (p.x < 4 || p.x > 96 || p.y < 5 || p.y > 96);
    });
    return `<section class="ov-card">
      <div class="ov-card-head"><h3>${icon('lucide:ruler')} ${esc(T('ov.layout'))}</h3><span class="ov-chip">${rows.length} ${esc(itemWord(rows.length))}</span></div>
      <div class="ov-layout-toolbar">
        <label class="ov-field"><span>${esc(T('ov.deskWidth'))}</span><input type="number" min="80" max="320" step="10" value="${ov.setup.deskW}" data-ov-desk="deskW"><em>cm</em></label>
        <label class="ov-field"><span>${esc(T('ov.deskDepth'))}</span><input type="number" min="45" max="140" step="5" value="${ov.setup.deskD}" data-ov-desk="deskD"><em>cm</em></label>
        <label class="ov-field"><span>${esc(T('ov.wallWidth'))}</span><input type="number" min="120" max="500" step="10" value="${ov.setup.wall}" data-ov-desk="wall"><em>cm</em></label>
        <button type="button" class="ov-btn" data-ov-reset-layout>${icon('fa-solid fa-rotate-left')} ${esc(T('ov.reset'))}</button>
      </div>
      <div class="ov-setup-plan" id="ovSetupPlan">
        <div class="ov-grid-bg"></div>
        <div class="ov-desk-surface" style="width:min(92%,${Math.round(ov.setup.deskW / 2)}px);height:54%"></div>
        <div class="ov-wall-line"><span>${esc(T('ov.wallWidth'))}</span></div>
        ${items || `<div class="ov-empty">${esc(T('ov.empty'))}</div>`}
      </div>
      <div class="ov-layout-foot"><span class="ov-chip ${out ? 'warn' : 'ok'}">${out ? esc(T('ov.fitWarn')) : esc(T('ov.fitOk'))}</span><span class="ov-muted">${esc(T('ov.layoutHint'))}</span></div>
    </section>`;
  }

  function usbOptions(current) {
    return D.usbDevices.map(d => `<option value="${esc(d.id)}"${d.id === current ? ' selected' : ''}>${esc(ctx.lang === 'en' ? d.label.en : d.label.fr)}</option>`).join('');
  }

  function powerOptions(current) {
    return D.powerDevices.map(d => `<option value="${esc(d.id)}"${d.id === current ? ' selected' : ''}>${esc(ctx.lang === 'en' ? d.label.en : d.label.fr)}</option>`).join('');
  }

  function renderPorts() {
    const ov = ensure();
    const usb = ov.ports.usb.map((port, index) => {
      const type = usbType(port.type);
      const device = usbDevice(port.device);
      const need = Number(device.speed) || 0;
      return `<div class="ov-port-card" data-usb-card="${esc(port.id)}">
        <div class="ov-port-head"><span class="ov-port-badge">${esc(type.label)}</span><b>${esc(port.label)}</b><button type="button" class="ov-icon-btn" data-usb-remove="${esc(port.id)}" title="${esc(T('ov.remove'))}">${icon('fa-solid fa-xmark')}</button></div>
        <label class="ov-field"><span>${esc(T('ov.usbType'))}</span><select data-usb-type="${esc(port.id)}">${Object.entries(D.usbTypes).map(([key, item]) => `<option value="${esc(key)}"${key === port.type ? ' selected' : ''}>${esc(item.label)}</option>`).join('')}</select></label>
        <label class="ov-field"><span>${esc(T('ov.assigned'))}</span><select data-usb-device="${esc(port.id)}">${usbOptions(port.device)}</select></label>
        <div class="ov-port-stats"><span>${num(type.speed, 0)} MB/s</span><span>${num(type.power, 1)} W</span>${need > type.speed ? `<span class="warn">${esc(L('capped', 'bridé'))}</span>` : need ? `<span class="ok">${esc(L('compatible', 'compatible'))}</span>` : ''}</div>
      </div>`;
    }).join('');
    const powers = ov.ports.power.map(port => {
      const device = powerDevice(port.device);
      const watts = powerForDevice(port.device);
      return `<div class="ov-port-card" data-power-card="${esc(port.id)}">
        <div class="ov-port-head"><span class="ov-port-badge">230 V</span><b>${esc(powerPortLabel(port))}</b><button type="button" class="ov-icon-btn" data-power-remove="${esc(port.id)}" title="${esc(T('ov.remove'))}">${icon('fa-solid fa-xmark')}</button></div>
        <label class="ov-field"><span>${esc(T('ov.assigned'))}</span><select data-power-device="${esc(port.id)}">${powerOptions(port.device)}</select></label>
        <div class="ov-port-stats"><span>${num(watts, 0)} W</span>${watts > 0 ? `<span class="ok">${esc(T('ov.estimate'))}</span>` : ''}</div>
      </div>`;
    }).join('');
    const totalW = ov.ports.power.reduce((s, port) => s + powerForDevice(port.device), 0);
    const loadPct = ov.ports.maxW > 0 ? totalW / ov.ports.maxW * 100 : 0;
    const loadTone = loadPct > 100 ? 'bad' : loadPct > 80 ? 'warn' : 'ok';
    return `<section class="ov-card">
      <div class="ov-card-head"><h3>${icon('lucide:usb')} ${esc(T('ov.usbPorts'))} & ${esc(T('ov.powerPorts'))}</h3><span class="ov-chip">${esc(T('ov.estimate'))}</span></div>
      <div class="ov-ports-block"><div class="ov-block-head"><h4>${esc(T('ov.usbPorts'))}</h4><button type="button" class="ov-btn small" data-usb-add>${icon('fa-solid fa-plus')} ${esc(T('ov.add'))}</button></div><div class="ov-port-grid">${usb || `<p class="ov-empty">${esc(T('ov.empty'))}</p>`}</div></div>
      <div class="ov-ports-block"><div class="ov-block-head"><h4>${esc(T('ov.powerPorts'))}</h4><button type="button" class="ov-btn small" data-power-add>${icon('fa-solid fa-plus')} ${esc(T('ov.add'))}</button></div>
      <div class="ov-strip-load"><div class="ov-bar"><span class="${loadTone}" style="width:${pct(loadPct)}"></span></div><span>${esc(T('ov.stripLoad'))} : <strong>${num(totalW, 0)} W</strong> / ${num(ov.ports.maxW, 0)} W · ${loadPct > 100 ? esc(T('ov.stripOver')) : loadPct > 80 ? esc(T('ov.stripWarn')) : esc(T('ov.stripOk'))}</span></div>
      <div class="ov-port-grid">${powers || `<p class="ov-empty">${esc(T('ov.empty'))}</p>`}</div></div>
      <p class="ov-note">${esc(T('ov.portsNote'))}</p>
    </section>`;
  }

  function itemWord(count) {
    return Number(count) === 1 ? L('item', 'élément') : L('items', 'éléments');
  }

  function taskBar(label, value, suffix = '%', tone = '') {
    return `<div class="ov-task-row"><span>${esc(label)}</span><div class="ov-bar"><span class="${tone}" style="width:${pct(value)}"></span></div><strong>${num(value, suffix === '%' ? 0 : 1)}${suffix}</strong></div>`;
  }

  function renderTasks() {
    const ov = ensure();
    const t = taskInfo();
    return `<section class="ov-card ov-task-card">
      <div class="ov-card-head"><h3>${icon('fa-solid fa-list-check')} ${esc(T('ov.tasks'))}</h3><span class="ov-chip">${esc(ctx.lang === 'en' ? t.scenario.label.en : t.scenario.label.fr)}</span></div>
      <div class="ov-task-top">
        <label class="ov-field"><span>${esc(T('ov.scenario'))}</span><select data-task-scenario>${Object.entries(D.scenarios).map(([key, s]) => `<option value="${esc(key)}"${key === ov.tasks.scenario ? ' selected' : ''}>${esc(ctx.lang === 'en' ? s.label.en : s.label.fr)}</option>`).join('')}</select></label>
        <label class="ov-check"><input type="checkbox" data-task-bg${ov.tasks.background ? ' checked' : ''}><span>${esc(T('ov.background'))}</span></label>
      </div>
      <div class="ov-task-bars">
        ${taskBar(T('ov.cpu'), t.cpu, '%', t.cpu > 90 ? 'warn' : '')}
        ${taskBar(T('ov.gpu'), t.gpu, '%', t.gpu > 95 ? 'warn' : '')}
        ${taskBar(T('ov.ram'), t.ramPct, '%', t.ramPct > 85 ? 'bad' : '')}
        ${taskBar(T('ov.disk'), t.disk, '%', t.disk > 90 ? 'bad' : '')}
      </div>
      <div class="ov-task-meta"><span>${num(t.ram, 1)} / ${num(t.ramTotal, 0)} GB</span><span>${esc(T('ov.apps'))} : ${t.apps.length}</span></div>
      <div class="ov-apps">${D.apps.map(app => `<label class="ov-app"><input type="checkbox" data-task-app="${esc(app.id)}"${ov.tasks.apps.includes(app.id) ? ' checked' : ''}><span>${esc(ctx.lang === 'en' ? app.label.en : app.label.fr)}</span><small>${num(app.cpu, 1)}% CPU</small></label>`).join('')}</div>
      <div class="ov-process-list"><h4>${esc(T('ov.processes'))}</h4>${t.processes.map(p => `<div class="ov-process"><span>${esc(ctx.lang === 'en' ? p.label.en : p.label.fr)}</span><span>${num(p.cpu, 1)}%</span><span>${num(p.ram, 1)} GB</span></div>`).join('')}</div>
      <p class="ov-note">${esc(T('ov.taskNote'))}</p>
    </section>`;
  }

  function driveName(id) {
    const row = driveRows().find(d => d.id === id);
    return row ? slotLabel(id) : id;
  }

  function renderStorage() {
    const s = storageInfo();
    const drives = s.drives.map(d => `<div class="ov-drive">
      <div class="ov-drive-head"><b>${esc(slotLabel(d.id))}</b><span class="ov-chip">${esc(d.kind)}</span></div>
      <div class="ov-drive-name">${esc(d.p.name || '')}</div>
      <div class="ov-bar"><span class="${d.over ? 'bad' : d.pct > 85 ? 'warn' : 'ok'}" style="width:${pct(d.pct)}"></span></div>
      <div class="ov-drive-stats"><span>${esc(T('ov.used'))} ${num(d.used, 0)} GB</span><span>${esc(T('ov.free'))} ${num(d.free, 0)} GB</span><span>${num(d.speed, 0)} MB/s</span></div>
    </div>`).join('');
    const libs = s.libs.map(lib => `<div class="ov-lib-row">
      <label class="ov-check"><input type="checkbox" data-storage-on="${esc(lib.id)}"${lib.on ? ' checked' : ''}><span>${icon(lib.icon)} ${esc(ctx.lang === 'en' ? lib.label.en : lib.label.fr)}</span></label>
      <label class="ov-size"><input type="number" min="0" max="100000" step="5" value="${lib.size}" data-storage-size="${esc(lib.id)}"><span>GB</span></label>
      <select data-storage-drive="${esc(lib.id)}">${s.drives.map(d => `<option value="${esc(d.id)}"${d.id === lib.target ? ' selected' : ''}>${esc(slotLabel(d.id))}</option>`).join('')}</select>
    </div>`).join('');
    return `<section class="ov-card ov-storage-card">
      <div class="ov-card-head"><h3>${icon('fa-solid fa-hard-drive')} ${esc(T('ov.storage'))}</h3><span class="ov-chip">${num(s.totalUsed, 0)} / ${num(s.totalCap, 0)} GB</span></div>
      <div class="ov-storage-top"><div class="ov-bar big"><span class="${s.totalPct > 90 ? 'bad' : s.totalPct > 75 ? 'warn' : 'ok'}" style="width:${pct(s.totalPct)}"></span></div><span>${esc(T('ov.reserve'))} ${num(ensure().storage.reserve, 0)}%</span></div>
      <div class="ov-drive-list">${drives || `<p class="ov-empty">${esc(T('ov.noDrives'))}</p>`}</div>
      <h4 class="ov-subhead">${esc(T('ov.libraries'))}</h4>
      <div class="ov-lib-list">${libs}</div>
      <label class="ov-field ov-reserve"><span>${esc(T('ov.reserve'))}</span><input type="range" min="0" max="50" step="1" value="${ensure().storage.reserve}" data-storage-reserve><em>${num(ensure().storage.reserve, 0)} %</em></label>
      <p class="ov-note">${esc(T('ov.storageNote'))}</p>
    </section>`;
  }

  function renderTransfer() {
    const t = transferInfo();
    const options = t.options.map(o => `<option value="${esc(o.id)}"${o.id === (t.from && t.from.id) ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
    const toOptions = t.options.map(o => `<option value="${esc(o.id)}"${o.id === (t.to && t.to.id) ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
    return `<section class="ov-card ov-transfer-card">
      <div class="ov-card-head"><h3>${icon('fa-solid fa-arrow-right-arrow-left')} ${esc(T('ov.transfer'))}</h3><span class="ov-chip" id="ovTransferStatus">${esc(T('ov.transferIdle'))}</span></div>
      <div class="ov-transfer-form">
        <label class="ov-field"><span>${esc(T('ov.from'))}</span><select data-transfer="from">${options}</select></label>
        <label class="ov-field"><span>${esc(T('ov.to'))}</span><select data-transfer="to">${toOptions}</select></label>
        <label class="ov-field"><span>${esc(T('ov.size'))}</span><input type="number" min="0.001" max="10000" step="0.5" value="${t.ov.size}" data-transfer="size"><select data-transfer="unit"><option value="MB"${t.ov.unit === 'MB' ? ' selected' : ''}>MB</option><option value="GB"${t.ov.unit === 'GB' ? ' selected' : ''}>GB</option><option value="TB"${t.ov.unit === 'TB' ? ' selected' : ''}>TB</option></select></label>
        <label class="ov-field"><span>${esc(T('ov.files'))}</span><input type="number" min="1" max="100000" step="1" value="${t.ov.files}" data-transfer="files"></label>
        <label class="ov-field"><span>${esc(T('ov.overhead'))}</span><input type="range" min="0" max="30" step="1" value="${t.ov.overhead}" data-transfer-range="overhead"><em>${num(t.ov.overhead, 0)} %</em></label>
        <label class="ov-check"><input type="checkbox" data-transfer-verify${t.ov.verify ? ' checked' : ''}><span>${esc(T('ov.verify'))}</span></label>
      </div>
      <div class="ov-transfer-result">
        <div class="ov-transfer-big"><small>${esc(T('ov.time'))}</small><strong id="ovTransferTime">${esc(formatTime(t.seconds))}</strong></div>
        <div class="ov-transfer-stats">
          <span><small>${esc(T('ov.realSpeed'))}</small><strong id="ovTransferSpeed">${num(t.speed, 0)} MB/s</strong></span>
          <span><small>${esc(T('ov.bottleneck'))}</small><strong id="ovTransferBottleneck">${esc(t.bottleneck ? t.bottleneck.label : '—')}</strong></span>
        </div>
        <div class="ov-transfer-progress"><div class="ov-bar big"><span id="ovTransferBar" style="width:0%"></span></div><div class="ov-transfer-eta"><span id="ovTransferPct">0 %</span><span id="ovTransferEta">${esc(formatTime(t.seconds))}</span></div></div>
        <button type="button" class="ov-btn primary" data-transfer-start>${icon('fa-solid fa-play')} ${esc(T('ov.start'))}</button>
      </div>
      <p class="ov-note">${esc(T('ov.transferNote'))}</p>
    </section>`;
  }

  function render(context) {
    if (context) ctx = context;
    if (transferTimer) { clearInterval(transferTimer); transferTimer = null; }
    transferRun++;
    const root = document.getElementById('overviewBody');
    if (!root || !ctx) return;
    const ov = ensure();
    const main = ov.view === 'pc'
      ? `${subnav([['photos', T('ov.photos')], ['airflow', T('ov.airflow')], ['pcie', T('ov.pcie')], ['psu', T('ov.psu')]], ov.pcTab, 'pc-tab')}
         <div class="ov-tab-body">${ov.pcTab === 'photos' ? renderPhotos() : ov.pcTab === 'airflow' ? renderAirflow() : ov.pcTab === 'pcie' ? renderPcie() : renderPsu()}</div>`
      : `${subnav([['layout', T('ov.layout')], ['ports', T('ov.ports')]], ov.setupTab, 'setup-tab')}
         <div class="ov-tab-body">${ov.setupTab === 'layout' ? renderLayout() : renderPorts()}</div>`;
    root.innerHTML = `<div class="ov-view-switch" role="tablist">
        <button type="button" class="ov-view-btn${ov.view === 'pc' ? ' active' : ''}" data-ov-view="pc">${icon('lucide:pc-case')} ${esc(T('ov.pc'))}</button>
        <button type="button" class="ov-view-btn${ov.view === 'setup' ? ' active' : ''}" data-ov-view="setup">${icon('lucide:monitor')} ${esc(T('ov.setup'))}</button>
      </div>
      ${main}
      <div class="ov-sim-grid">${renderTasks()}${renderStorage()}${renderTransfer()}</div>`;
    bind(root);
  }

  function commit(rerender = true) {
    if (ctx && ctx.persist) ctx.persist();
    if (rerender) render();
  }

  function updateAirflowMetrics() {
    const a = airflowInfo();
    const host = document.getElementById('ovAirflowMetrics');
    if (!host) return;
    host.innerHTML = [
      metric(T('ov.cfm'), num(a.cfm, 0), ' CFM'),
      metric(T('ov.pressure'), a.balanceValue > 0 ? `+${num(a.balanceValue, 0)}` : num(a.balanceValue, 0), ' CFM', a.balance === 'neutral' ? 'ok' : ''),
      metric(T('ov.delta'), a.delta == null ? '—' : `+${num(a.delta, 1)}`, ' °C', a.delta == null ? '' : a.delta < 9 ? 'ok' : a.delta < 15 ? 'warn' : 'bad'),
      metric(T('ov.noise'), num(a.noise, 0), ' dB(A)'),
      metric(T('ov.balance'), T(a.balance === 'positive' ? 'ov.positive' : a.balance === 'negative' ? 'ov.negative' : 'ov.neutral'), '', a.balance === 'neutral' ? 'ok' : '')
    ].join('');
    const core = document.querySelector('.ov-case-core span');
    if (core) core.textContent = `${num(a.heat, 0)} W`;
  }

  function updatePsuNumbers() {
    const p = psuInfo();
    const ring = document.querySelector('.ov-psu-gauge .ov-ring');
    if (ring) {
      ring.style.setProperty('--p', pct(p.util));
      ring.style.setProperty('--tone', p.status === 'over' ? 'var(--danger)' : p.status === 'tight' ? 'var(--warn)' : 'var(--ok)');
      const strong = ring.querySelector('strong');
      if (strong) strong.textContent = `${num(p.util, 0)}%`;
    }
    const values = document.querySelectorAll('.ov-psu-numbers strong');
    if (values.length >= 3) {
      values[0].textContent = p.cap ? `${num(p.cap, 0)} W` : '—';
      values[1].textContent = `${num(p.load, 0)} W`;
      values[2].textContent = p.cap ? `${num(p.headroom, 0)} W` : '—';
    }
    const metrics = document.querySelector('.ov-psu-grid')?.closest('.ov-card')?.querySelector('.ov-metrics');
    if (metrics) metrics.innerHTML = psuMetricsHtml(p);
  }

  function updateStorageBars() {
    const s = storageInfo();
    const host = document.querySelector('.ov-storage-card');
    if (!host) return;
    host.querySelectorAll('.ov-drive').forEach((el, i) => {
      const d = s.drives[i];
      if (!d) return;
      const bar = el.querySelector('.ov-bar span');
      if (bar) { bar.style.width = pct(d.pct); bar.className = d.over ? 'bad' : d.pct > 85 ? 'warn' : 'ok'; }
      const stats = el.querySelectorAll('.ov-drive-stats span');
      if (stats.length >= 2) { stats[0].textContent = `${T('ov.used')} ${num(d.used, 0)} GB`; stats[1].textContent = `${T('ov.free')} ${num(d.free, 0)} GB`; }
    });
    const top = host.querySelector('.ov-storage-top .ov-bar span');
    if (top) { top.style.width = pct(s.totalPct); top.className = s.totalPct > 90 ? 'bad' : s.totalPct > 75 ? 'warn' : 'ok'; }
    const topLabel = host.querySelector('.ov-storage-top > span:last-child');
    if (topLabel) topLabel.textContent = `${T('ov.reserve')} ${num(ensure().storage.reserve, 0)}%`;
  }

  function updateTransferResult() {
    const t = transferInfo();
    const set = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value; };
    set('ovTransferTime', formatTime(t.seconds));
    set('ovTransferSpeed', `${num(t.speed, 0)} MB/s`);
    set('ovTransferBottleneck', t.bottleneck ? t.bottleneck.label : '—');
    set('ovTransferEta', formatTime(t.seconds));
  }

  function startTransfer() {
    const t = transferInfo();
    const bar = document.getElementById('ovTransferBar');
    const pctEl = document.getElementById('ovTransferPct');
    const eta = document.getElementById('ovTransferEta');
    const status = document.getElementById('ovTransferStatus');
    if (!bar || !pctEl || !eta) return;
    if (transferTimer) clearInterval(transferTimer);
    if (!(t.speed > 0)) {
      if (status) status.textContent = T('ov.noDrive');
      return;
    }
    const run = ++transferRun;
    const started = performance.now();
    const duration = 2400;
    if (status) status.textContent = T('ov.transferRunning');
    bar.style.width = '0%';
    transferTimer = setInterval(() => {
      if (run !== transferRun) { clearInterval(transferTimer); transferTimer = null; return; }
      const progress = clamp((performance.now() - started) / duration * 100, 0, 100);
      bar.style.width = `${progress}%`;
      pctEl.textContent = `${num(progress, 0)} %`;
      eta.textContent = formatTime(t.seconds * (1 - progress / 100));
      if (progress >= 100) {
        clearInterval(transferTimer); transferTimer = null;
        if (status) status.textContent = T('ov.transferDone');
        pctEl.textContent = '100 %';
        eta.textContent = '0 s';
      }
    }, 50);
  }

  function bind(root) {
    root.querySelectorAll('[data-ov-view]').forEach(btn => btn.onclick = () => {
      const ov = ensure();
      ov.view = btn.dataset.ovView;
      commit();
    });
    root.querySelectorAll('[data-pc-tab]').forEach(btn => btn.onclick = () => { ensure().pcTab = btn.dataset.pcTab; commit(); });
    root.querySelectorAll('[data-setup-tab]').forEach(btn => btn.onclick = () => { ensure().setupTab = btn.dataset.setupTab; commit(); });
    root.querySelectorAll('[data-ov-photo]').forEach(btn => btn.onclick = () => { ensure().photo = Number(btn.dataset.ovPhoto) || 0; commit(); });
    root.querySelectorAll('[data-air-step]').forEach(btn => btn.onclick = () => {
      const ov = ensure();
      const key = btn.dataset.airStep;
      const limits = { front: [0, 6], top: [0, 4], rear: [0, 3], bottom: [0, 3] };
      ov.airflow[key] = clamp((Number(ov.airflow[key]) || 0) + Number(btn.dataset.delta), limits[key][0], limits[key][1]);
      commit();
    });
    root.querySelectorAll('[data-ov-air]').forEach(input => input.onchange = () => {
      const ov = ensure();
      const key = input.dataset.ovAir;
      ov.airflow[key] = key === 'heatW' ? clamp(input.value, 0, 1500) : key === 'fanSize' ? Number(input.value) : input.value;
      commit();
    });
    const rpm = root.querySelector('[data-ov-air-range="rpm"]');
    if (rpm) {
      rpm.oninput = () => {
        const ov = ensure();
        ov.airflow.rpm = clamp(rpm.value, 400, 2200);
        const em = rpm.closest('.ov-field')?.querySelector('em');
        if (em) em.textContent = `${num(ov.airflow.rpm, 0)} rpm`;
        updateAirflowMetrics();
      };
      rpm.onchange = () => { if (ctx && ctx.persist) ctx.persist(); };
    }
    root.querySelectorAll('[data-psu-mode]').forEach(btn => btn.onclick = () => { ensure().psu.loadMode = btn.dataset.psuMode === 'manual' ? 'manual' : 'auto'; commit(); });
    root.querySelectorAll('[data-ov-psu]').forEach(input => input.onchange = () => { ensure().psu.efficiency = input.value; commit(); });
    root.querySelectorAll('[data-psu-range]').forEach(input => {
      input.oninput = () => {
        const ov = ensure();
        const key = input.dataset.psuRange;
        ov.psu[key] = key === 'hours' ? clamp(input.value, 0.5, 24) : clamp(input.value, 50, 2000);
        const em = input.closest('.ov-field')?.querySelector('em');
        if (em) em.textContent = key === 'hours' ? `${num(ov.psu[key], 1)} h` : `${num(ov.psu[key], 0)} W`;
        updatePsuNumbers();
      };
      input.onchange = () => { if (ctx && ctx.persist) ctx.persist(); };
    });
    const plan = root.querySelector('#ovSetupPlan');
    if (plan) {
      plan.querySelectorAll('[data-ov-drag]').forEach(item => {
        item.onpointerdown = event => {
          if (event.button !== undefined && event.button !== 0) return;
          const rect = plan.getBoundingClientRect();
          item.dataset.x = parseFloat(item.style.left) || 50;
          item.dataset.y = parseFloat(item.style.top) || 50;
          const move = ev => {
            const x = clamp((ev.clientX - rect.left) / rect.width * 100, 3, 97);
            const y = clamp((ev.clientY - rect.top) / rect.height * 100, 5, 96);
            item.style.left = `${x}%`;
            item.style.top = `${y}%`;
            item.dataset.x = x;
            item.dataset.y = y;
          };
          const end = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            const ov = ensure();
            ov.setup.positions[item.dataset.ovDrag] = { x: round(Number(item.dataset.x) || 50, 1), y: round(Number(item.dataset.y) || 50, 1), w: round(parseFloat(item.style.width) || 10, 1) };
            if (ctx && ctx.persist) ctx.persist();
            const chip = plan.closest('.ov-card')?.querySelector('.ov-layout-foot .ov-chip');
            const placedOut = Object.keys(ov.setup.positions).some(id => {
              const pos = ov.setup.positions[id];
              return pos && (pos.x < 4 || pos.x > 96 || pos.y < 5 || pos.y > 96);
            });
            if (chip) {
              chip.className = `ov-chip ${placedOut ? 'warn' : 'ok'}`;
              chip.textContent = T(placedOut ? 'ov.fitWarn' : 'ov.fitOk');
            }
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', end);
          window.addEventListener('pointercancel', end);
          event.preventDefault();
        };
      });
    }
    root.querySelectorAll('[data-ov-desk]').forEach(input => input.onchange = () => {
      const ov = ensure();
      const key = input.dataset.ovDesk;
      ov.setup[key] = clamp(input.value, key === 'wall' ? 120 : key === 'deskD' ? 45 : 80, key === 'wall' ? 500 : key === 'deskD' ? 140 : 320);
      commit();
    });
    const resetLayout = root.querySelector('[data-ov-reset-layout]');
    if (resetLayout) resetLayout.onclick = () => { ensure().setup.positions = {}; commit(); };
    root.querySelectorAll('[data-usb-type]').forEach(sel => sel.onchange = () => {
      const port = ensure().ports.usb.find(p => p.id === sel.dataset.usbType);
      if (port) port.type = sel.value;
      commit();
    });
    root.querySelectorAll('[data-usb-device]').forEach(sel => sel.onchange = () => {
      const port = ensure().ports.usb.find(p => p.id === sel.dataset.usbDevice);
      if (port) port.device = sel.value;
      commit();
    });
    root.querySelectorAll('[data-usb-remove]').forEach(btn => btn.onclick = () => {
      const ov = ensure();
      ov.ports.usb = ov.ports.usb.filter(p => p.id !== btn.dataset.usbRemove);
      commit();
    });
    const usbAdd = root.querySelector('[data-usb-add]');
    if (usbAdd) usbAdd.onclick = () => {
      const ov = ensure();
      ov.ports.usb.push({ id: `usb${Date.now().toString(36)}`, type: 'usb-a', label: `USB ${ov.ports.usb.length + 1}`, device: '' });
      commit();
    };
    root.querySelectorAll('[data-power-device]').forEach(sel => sel.onchange = () => {
      const port = ensure().ports.power.find(p => p.id === sel.dataset.powerDevice);
      if (port) port.device = sel.value;
      commit();
    });
    root.querySelectorAll('[data-power-remove]').forEach(btn => btn.onclick = () => {
      const ov = ensure();
      ov.ports.power = ov.ports.power.filter(p => p.id !== btn.dataset.powerRemove);
      commit();
    });
    const powerAdd = root.querySelector('[data-power-add]');
    if (powerAdd) powerAdd.onclick = () => {
      const ov = ensure();
      ov.ports.power.push({ id: `pwr${Date.now().toString(36)}`, label: L(`Outlet ${ov.ports.power.length + 1}`, `Prise ${ov.ports.power.length + 1}`), device: '' });
      commit();
    };
    const scenario = root.querySelector('[data-task-scenario]');
    if (scenario) scenario.onchange = () => { ensure().tasks.scenario = scenario.value; commit(); };
    const bg = root.querySelector('[data-task-bg]');
    if (bg) bg.onchange = () => { ensure().tasks.background = bg.checked; commit(); };
    root.querySelectorAll('[data-task-app]').forEach(cb => cb.onchange = () => {
      const ov = ensure();
      const id = cb.dataset.taskApp;
      if (cb.checked && !ov.tasks.apps.includes(id)) ov.tasks.apps.push(id);
      if (!cb.checked) ov.tasks.apps = ov.tasks.apps.filter(x => x !== id);
      commit();
    });
    root.querySelectorAll('[data-storage-on]').forEach(cb => cb.onchange = () => {
      const ov = ensure();
      if (ov.storage.libs[cb.dataset.storageOn]) ov.storage.libs[cb.dataset.storageOn].on = cb.checked;
      commit();
    });
    root.querySelectorAll('[data-storage-size]').forEach(input => {
      input.onchange = () => {
        const ov = ensure();
        if (ov.storage.libs[input.dataset.storageSize]) ov.storage.libs[input.dataset.storageSize].size = clamp(input.value, 0, 100000);
        commit();
      };
    });
    root.querySelectorAll('[data-storage-drive]').forEach(sel => sel.onchange = () => {
      const ov = ensure();
      if (ov.storage.libs[sel.dataset.storageDrive]) ov.storage.libs[sel.dataset.storageDrive].drive = sel.value;
      commit();
    });
    const reserve = root.querySelector('[data-storage-reserve]');
    if (reserve) {
      reserve.oninput = () => {
        ensure().storage.reserve = clamp(reserve.value, 0, 50);
        const em = reserve.closest('.ov-field')?.querySelector('em');
        if (em) em.textContent = `${num(ensure().storage.reserve, 0)} %`;
        updateStorageBars();
      };
      reserve.onchange = () => { if (ctx && ctx.persist) ctx.persist(); };
    }
    root.querySelectorAll('[data-transfer]').forEach(input => input.onchange = () => {
      const ov = ensure();
      const key = input.dataset.transfer;
      ov.transfer[key] = ['size', 'files'].includes(key) ? clamp(input.value, 0.001, key === 'files' ? 1000000 : 10000) : input.value;
      commit();
    });
    const overhead = root.querySelector('[data-transfer-range="overhead"]');
    if (overhead) {
      overhead.oninput = () => {
        ensure().transfer.overhead = clamp(overhead.value, 0, 30);
        const em = overhead.closest('.ov-field')?.querySelector('em');
        if (em) em.textContent = `${num(ensure().transfer.overhead, 0)} %`;
        updateTransferResult();
      };
      overhead.onchange = () => { if (ctx && ctx.persist) ctx.persist(); };
    }
    const verify = root.querySelector('[data-transfer-verify]');
    if (verify) verify.onchange = () => { ensure().transfer.verify = verify.checked; commit(); };
    const start = root.querySelector('[data-transfer-start]');
    if (start) start.onclick = startTransfer;
  }

  function printHtml(context) {
    if (context) ctx = context;
    if (!ctx) return '';
    const ov = ensure();
    const a = airflowInfo();
    const p = psuInfo();
    const pcie = pcieInfo();
    const tasks = taskInfo();
    const storage = storageInfo();
    const transfer = transferInfo();
    const pressure = T(a.balance === 'positive' ? 'ov.positive' : a.balance === 'negative' ? 'ov.negative' : 'ov.neutral');
    const taskName = ctx.lang === 'en' ? tasks.scenario.label.en : tasks.scenario.label.fr;
    const rows = arr => arr.map(([k, v]) => `<span><small>${esc(k)}</small><strong>${esc(v)}</strong></span>`).join('');
    return `<section class="pr-sec ov-print-sec"><h2 class="pr-h2"><i class="fa-solid fa-computer"></i> ${esc(T('ov.printTitle'))}</h2>
      <p class="hint">${esc(T('ov.printNote'))}</p>
      <div class="ov-print-grid">
        <div class="ov-print-box"><h3>${esc(T('ov.airflow'))}</h3><div class="ov-print-kv">${rows([[T('ov.cfm'), `${num(a.cfm, 0)} CFM`], [T('ov.pressure'), `${num(a.balanceValue, 0)} CFM`], [T('ov.balance'), pressure], [T('ov.delta'), a.delta == null ? '—' : `+${num(a.delta, 1)} °C`], [T('ov.noise'), `${num(a.noise, 0)} dB(A)`]])}</div></div>
        <div class="ov-print-box"><h3>${esc(T('ov.pcie'))}</h3><div class="ov-print-kv">${rows([[T('ov.boardSlots'), `${pcie.slots16} × x16 · ${pcie.slots1} × x1`], [T('ov.usedLanes'), `${num(pcie.used, 0)} / ${pcie.cpuLanes}`], [T('ov.nvme'), String(pcie.nvmeRows.length)], [T('ov.cards'), String(pcie.cardRows.length)]])}</div></div>
        <div class="ov-print-box"><h3>${esc(T('ov.psu'))}</h3><div class="ov-print-kv">${rows([[T('ov.capacity'), p.cap ? `${num(p.cap, 0)} W` : '—'], [T('ov.load'), `${num(p.load, 0)} W`], [T('ov.wall'), `${num(p.wall, 0)} W`], [T('ov.headroom'), p.cap ? `${num(p.headroom, 0)} W` : '—'], [T('ov.cost'), `${money(p.cost)}${L('/yr', '/an')}`]])}</div></div>
        <div class="ov-print-box"><h3>${esc(T('ov.tasks'))}</h3><div class="ov-print-kv">${rows([[T('ov.scenario'), taskName], [T('ov.cpu'), `${num(tasks.cpu, 0)} %`], [T('ov.gpu'), `${num(tasks.gpu, 0)} %`], [T('ov.ram'), `${num(tasks.ram, 1)} / ${num(tasks.ramTotal, 0)} GB`], [T('ov.disk'), `${num(tasks.disk, 0)} %`]])}</div></div>
        <div class="ov-print-box"><h3>${esc(T('ov.storage'))}</h3><div class="ov-print-kv">${rows(storage.drives.map(d => [slotLabel(d.id), `${num(d.used, 0)} / ${num(d.capacity, 0)} GB · ${esc(d.kind)}`]))}</div></div>
        <div class="ov-print-box"><h3>${esc(T('ov.transfer'))}</h3><div class="ov-print-kv">${rows([[T('ov.from'), transfer.from ? transfer.from.label : '—'], [T('ov.to'), transfer.to ? transfer.to.label : '—'], [T('ov.size'), `${num(transfer.ov.size, 2)} ${transfer.ov.unit}`], [T('ov.realSpeed'), `${num(transfer.speed, 0)} MB/s`], [T('ov.time'), formatTime(transfer.seconds)]])}</div></div>
      </div>
      <div class="ov-print-box"><h3>${esc(T('ov.ports'))}</h3><div class="ov-print-ports">${ov.ports.usb.map(port => `<span>${esc(port.label)} · ${esc(usbType(port.type).label)} · ${esc(ctx.lang === 'en' ? usbDevice(port.device).label.en : usbDevice(port.device).label.fr)}</span>`).join('')}${ov.ports.power.map(port => `<span>${esc(powerPortLabel(port))} · ${esc(ctx.lang === 'en' ? powerDevice(port.device).label.en : powerDevice(port.device).label.fr)} · ${num(powerForDevice(port.device), 0)} W</span>`).join('')}</div></div>
    </section>`;
  }

  function exportData(context) {
    const previous = ctx;
    if (context) ctx = context;
    const ov = ensure();
    const a = airflowInfo();
    const p = psuInfo();
    const pc = pcieInfo();
    const t = taskInfo();
    const s = storageInfo();
    const transfer = transferInfo();
    const data = {
      inputs: clone(ov),
      summary: {
        airflow: { cfm: a.cfm, pressure: a.balanceValue, balance: a.balance, delta: a.delta, noise: a.noise, heat: a.heat },
        pcie: { generation: pc.gen, lanes: pc.cpuLanes, used: pc.used, free: pc.free, nvme: pc.nvmeRows.length, cards: pc.cardRows.length },
        psu: { capacity: p.cap, load: p.load, wall: p.wall, efficiency: p.eff.value, headroom: p.headroom, status: p.status, kwh: p.kwh, cost: p.cost },
        tasks: { scenario: t.scenario.label, cpu: t.cpu, gpu: t.gpu, ram: t.ram, ramTotal: t.ramTotal, disk: t.disk },
        storage: { total: s.totalCap, used: s.totalUsed, drives: s.drives.map(d => ({ slot: d.id, kind: d.kind, capacity: d.capacity, used: d.used, speed: d.speed })) },
        transfer: { from: transfer.from ? transfer.from.label : '', to: transfer.to ? transfer.to.label : '', size: transfer.ov.size, unit: transfer.ov.unit, speed: transfer.speed, seconds: transfer.seconds }
      }
    };
    ctx = previous;
    return data;
  }

  return { defaultState, normalize, render, printHtml, exportData };
})();
