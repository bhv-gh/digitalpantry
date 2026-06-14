import { useEffect, useRef, useState, useCallback } from "react";
import { getSetting, setSetting } from "../db/settingsRepo";
import { pushToSheet } from "../lib/sheetsSync";

export const AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000; // never push more than once per minute

/**
 * Auto-backup to the configured Google Sheet.
 *  - Runs once on mount (so the first push happens at page load).
 *  - Then every AUTO_BACKUP_INTERVAL_MS while the tab is open.
 *  - Also re-checks when the tab becomes visible (mobile browsers throttle
 *    setInterval in background tabs, so an interval alone misses the case
 *    "user reopened the PWA an hour later").
 *
 * No-op when sheetsUrl is empty or autoBackupEnabled is false.
 * Exposes the latest status as React state for the Settings UI.
 */
export default function useAutoBackup() {
  const [status, setStatus] = useState({ lastAt: null, lastError: null, running: false });
  const inflightRef = useRef(false);
  const tickRef = useRef(null);

  const runOnce = useCallback(async ({ force = false } = {}) => {
    if (inflightRef.current) return;
    const [url, enabledRaw, lastAt] = await Promise.all([
      getSetting("sheetsUrl"),
      getSetting("autoBackupEnabled", true),
      getSetting("lastBackupAt", 0),
    ]);
    if (!url || enabledRaw === false) return;
    if (!force && lastAt && Date.now() - lastAt < MIN_GAP_MS) return;

    inflightRef.current = true;
    setStatus((s) => ({ ...s, running: true }));
    try {
      await pushToSheet(url);
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

    // Hydrate status from settings so Settings page shows "Last: X min ago"
    // even before the first auto-push fires.
    (async () => {
      const [lastAt, lastError] = await Promise.all([
        getSetting("lastBackupAt", null),
        getSetting("lastBackupError", null),
      ]);
      if (!stopped) setStatus({ lastAt, lastError, running: false });
    })();

    // First run on mount.
    runOnce({ force: true });

    const interval = setInterval(() => {
      if (!stopped) tickRef.current?.();
    }, AUTO_BACKUP_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped) tickRef.current?.();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [runOnce]);

  return { ...status, runNow: () => runOnce({ force: true }) };
}
