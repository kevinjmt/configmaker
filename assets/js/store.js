/* ConfigMaker — storage adapter: synchronous API over an IndexedDB backend.
   - Sync reads/writes against an in-memory mirror (seeded from localStorage at load).
   - Writes flush debounced to IndexedDB; localStorage kept as best-effort fallback copy.
   - Boot: instant render from LS seed, then adopt IDB data when its seq is newer.
   - Quota-safe: IDB pool is huge; LS failures no longer fatal while IDB is healthy.
   - Backend is injectable (StoreDB._setBackend) for tests. No DOM access at load. */
'use strict';
const StoreDB = (() => {
  const DB = 'configmaker', STORE = 'kv', META = '__meta', SEQK = '__seq';
  const FLUSH_MS = 300;
  let idbHealthy = false, seq = 0, dirty = false, flushT = null, flushing = null, dbHandle = null;
  let readyResolve = null;
  const ready = new Promise(res => { readyResolve = res; });
  const mem = {};
  const lsGet = k => { try { const v = localStorage.getItem(k); return v == null ? undefined : v; } catch { return undefined; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
  const lsSeq = () => parseInt(lsGet(SEQK) || '0', 10) || 0;

  /* ---- pluggable backend (real IndexedDB by default) ---- */
  const realBackend = {
    open() {
      return new Promise((resolve, reject) => {
        let req;
        try { req = indexedDB.open(DB, 1); } catch (e) { reject(e); return; }
        req.onupgradeneeded = () => { try { req.result.createObjectStore(STORE); } catch {} };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },
    load(db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const st = tx.objectStore(STORE);
          const out = {};
          const dataReq = st.getAll(), keysReq = st.getAllKeys();
          let data = null, keys = null, done = 0;
          const fin = () => {
            if (++done < 2) return;
            (keys || []).forEach((k, i) => { out[k] = data[i]; });
            resolve({ seq: Number(out[META]) || 0, data: out });
          };
          dataReq.onsuccess = () => { data = dataReq.result || []; fin(); };
          keysReq.onsuccess = () => { keys = keysReq.result || []; fin(); };
          dataReq.onerror = keysReq.onerror = () => reject(dataReq.error || keysReq.error || new Error('load'));
        } catch (e) { reject(e); }
      });
    },
    store(db, s, snap) {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          const st = tx.objectStore(STORE);
          Object.keys(snap).forEach(k => { try { st.put(snap[k], k); } catch {} });
          try { st.put(s, META); } catch {}
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error || new Error('store'));
        } catch (e) { reject(e); }
      });
    },
  };
  let backend = realBackend;
  function _setBackend(b) { backend = b || realBackend; idbHealthy = false; dbHandle = null; dirty = true; }

  /* ---- synchronous adapter API (memory mirror) ---- */
  function getRaw(k) {
    if (Object.prototype.hasOwnProperty.call(mem, k)) return mem[k] === undefined ? null : mem[k];
    const v = lsGet(k);
    mem[k] = v;
    return v == null ? null : v;
  }
  function putRaw(k, v) {
    mem[k] = String(v);
    seq++;
    const lsOk = lsSet(k, String(v)) && lsSet(SEQK, String(seq));
    scheduleFlush();
    return lsOk ? true : (idbHealthy ? true : { quota: true });
  }
  function scheduleFlush() {
    dirty = true;
    if (flushT) return;
    flushT = setTimeout(() => { flushT = null; flushNow(); }, FLUSH_MS);
  }
  function flushNow() {
    if (!dirty || !idbHealthy || !dbHandle) return Promise.resolve(false);
    if (flushing) return flushing;
    dirty = false;
    const s = seq, snap = {};
    Object.keys(mem).forEach(k => { if (mem[k] !== undefined) snap[k] = mem[k]; });
    flushing = Promise.resolve()
      .then(() => backend.store(dbHandle, s, snap))
      .then(() => true, () => { idbHealthy = false; dirty = true; return false; })
      .then(ok => { flushing = null; if (dirty) scheduleFlush(); return ok; });
    return flushing;
  }

  const api = {
    getRaw, putRaw, flush: flushNow, scheduleFlush, _setBackend,
    get healthy() { return idbHealthy; },
    get ready() { return ready; },
    _reboot: () => boot(),
  };

  /* ---- boot: adopt IDB content when strictly newer than the LS copy ---- */
  let bootRun = 0;
  async function boot() {
    const run = ++bootRun;
    let adopted = false;
    try {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
        navigator.storage.persist().catch(() => {});
      }
    } catch {}
    try {
      if (backend === realBackend && typeof indexedDB === 'undefined') throw new Error('no-indexeddb');
      const db = await backend.open();
      dbHandle = db;
      const got = await backend.load(db);
      idbHealthy = true;
      const ls = lsSeq();
      if (got && typeof got.seq === 'number' && got.seq > ls && got.seq > seq && got.data) {
        Object.keys(got.data).forEach(k => { if (k !== META && k !== SEQK && got.data[k] !== undefined) mem[k] = got.data[k]; });
        seq = got.seq;
        adopted = true;
      } else if (got && typeof got.seq === 'number' && got.seq > seq) {
        seq = got.seq;
      }
      scheduleFlush();
    } catch {
      idbHealthy = false;
    }
    return { adopted, healthy: idbHealthy };
  }
  boot().then(r => { try { readyResolve(r); } catch {} });

  if (typeof window !== 'undefined' && window.addEventListener && typeof document !== 'undefined') {
    const kick = () => { try { flushNow(); } catch {} };
    window.addEventListener('pagehide', kick);
    window.addEventListener('beforeunload', kick);
    document.addEventListener('visibilitychange', () => { try { if (document.visibilityState === 'hidden') flushNow(); } catch {} });
    window.addEventListener('storage', e => { try { if (e && e.key) delete mem[e.key]; } catch {} });
  }
  return api;
})();
