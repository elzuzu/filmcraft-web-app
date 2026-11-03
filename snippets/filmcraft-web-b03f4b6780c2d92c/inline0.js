
export function filmcraftAcquireRecoveryLock() {
  if (!navigator.locks || !navigator.locks.request) return Promise.resolve(false);
  return new Promise(resolve => {
    let settled = false;
    navigator.locks.request('filmcraft-recovery-v2', {mode:'exclusive', ifAvailable:true}, lock => {
      if (!lock) { settled = true; resolve(false); return; }
      window.__filmcraftRecoveryLockHeld = true;
      settled = true; resolve(true);
      return new Promise(done => { window.__filmcraftReleaseRecoveryLock = done; });
    }).catch(() => { if (!settled) resolve(false); });
  });
}
export function filmcraftRecoveryLockHeld() { return window.__filmcraftRecoveryLockHeld === true; }