import { useEffect, useRef, useState, useCallback } from "react";
import { getSetting, setSetting } from "../db/settingsRepo";
import { pushToSheet } from "../lib/sheetsSync";

export const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000;
export const RESTORE_DECISION_KEY = "pantry-restore-decided";

function restoreDecided() {
  try {
    return sessionStorage.getItem(RESTORE_DECISION_KEY) === "1";
  } catch {
    return true; // no sessionStorage → don't block
  }
}

/**
 * Auto-backup to the hardcoded Apps Script web-app.
 *  - Runs once on mount, then every AUTO_BACKUP_INTERVAL_MS.
 *  - Re-checks when the tab becomes visible (mobile browsers throttle
 *    setInterval in background tabs).
 *  - Gated on the user dismissing the restore-on-load prompt so a slow Yes
 *    doesn't get overwritten by a stale auto-push.
 *  - No-op when autoBackupEnabled === false.
 */
export default function useAutoBackup() {
  const [status, setStatus] = useState({ lastAt: null, lastError: null, running: false });
  const inflightRef = useRef(false);
  const tickRef = useRef(null);

  const runOnce = useCallback(async ({ force = false } = {}) => {
    if (inflightRef.current) return;
    if (!restoreDecided()) return;
    const [enabledRaw, lastAt] = await Promise.all([
      getSetting("autoBackupEnabled", true),
      getSetting("lastBackupAt", 0),
    ]);
    if (enabledRaw === false) return;
    if (!force && lastAt && Date.now() - lastAt < MIN_GAP_MS) return;

    inflightRef.current = true;
    setStatus((s) => ({ ...s, running: true }));
    try {
      await pushToSheet();
      const now = Date.now();
      await setSetting("lastBackupAt", now);
      await setSetting("lastBackupError", null);
      setStatus({ lastAt: now, lastError: null, running: false });
    } catch (e) {
      const msg = e?.message || String(e);
      await setSetting("lastBackupError", msg);
      setStatus((s) => ({ ...s, lastError: msg, running: false }));
    } finally {
      inflightRef.current = false;
    }
  }, []);

  tickRef.current = runOnce;

  useEffect(() => {
    let stopped = false;

    (async () => {
      const [lastAt, lastError] = await Promise.all([
        getSetting("lastBackupAt", null),
        getSetting("lastBackupError", null),
      ]);
      if (!stopped) setStatus({ lastAt, lastError, running: false });
    })();

    // First run on mount (will no-op until restore prompt is dismissed).
    runOnce({ force: true });

    const interval = setInterval(() => {
      if (!stopped) tickRef.current?.();
    }, AUTO_BACKUP_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped) tickRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisible);

    // Re-check shortly after the restore prompt is dismissed.
    const onDecided = () => tickRef.current?.({ force: true });
    window.addEventListener("pantry:restore-decided", onDecided);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pantry:restore-decided", onDecided);
    };
  }, [runOnce]);

  return { ...status, runNow: () => runOnce({ force: true }) };
}
