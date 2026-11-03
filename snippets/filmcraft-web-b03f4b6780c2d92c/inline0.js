
export function filmcraftSpoolLocksAvailable() { return !!(navigator.locks && navigator.locks.request); }
export function filmcraftSpoolAcquire(id) {
  if (!filmcraftSpoolLocksAvailable()) return Promise.reject(new Error('Web Locks unavailable'));
  return new Promise((resolve, reject) => {
    let settled = false;
    try {
      navigator.locks.request('filmcraft-export-spool-v2:' + id, {mode:'exclusive', ifAvailable:true}, lock => {
        if (!lock) { settled = true; resolve(null); return; }
        return new Promise(release => { settled = true; resolve(() => release()); });
      }).catch(e => { if (!settled) reject(e); });
    } catch (e) { if (!settled) reject(e); }
  });
}
