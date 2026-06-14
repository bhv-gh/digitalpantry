import { useState } from "react";
import { fetchFromSheet } from "../lib/sheetsSync";
import { importAll } from "../lib/backup";
import { RESTORE_DECISION_KEY } from "../hooks/useAutoBackup";
import { SparkIcon } from "./icons";

/**
 * Shown once per page-load. Asks "restore cloud → device, replacing local?".
 * Yes  → fetch + replace + reload so pages re-mount with new data.
 * No   → dismiss; auto-backup resumes and will eventually push local up.
 */
export default function RestorePrompt() {
  const [open, setOpen] = useState(() => {
    try {
      return sessionStorage.getItem(RESTORE_DECISION_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  if (!open) return null;

  const decide = () => {
    try {
      sessionStorage.setItem(RESTORE_DECISION_KEY, "1");
    } catch {}
    window.dispatchEvent(new CustomEvent("pantry:restore-decided"));
  };

  const dismiss = () => {
    decide();
    setOpen(false);
  };

  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      const parsed = await fetchFromSheet();
      const res = await importAll(parsed, "replace");
      const total =
        res.products.imported +
        res.pantryItems.imported +
        res.shoppingItems.imported;
      setDone(`Restored ${total} items. Reloading…`);
      decide();
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setError(e.message || "Restore failed");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3">
        <h3 className="text-lg font-semibold">Restore from cloud backup?</h3>
        {!done && !error && (
          <p className="text-sm text-gray-600">
            Pull the latest pantry from your backup sheet. This{" "}
            <span className="font-semibold">replaces</span> anything currently on
            this device.
          </p>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {done && (
          <p className="text-sm text-emerald-700 flex items-center gap-2">
            <SparkIcon className="w-4 h-4 animate-spin" /> {done}
          </p>
        )}
        {!done && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={restore}
              className="flex-1 py-2 rounded-lg bg-brand-600 text-white font-semibold disabled:opacity-60"
            >
              {busy ? "Restoring…" : "Yes, restore"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={dismiss}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700"
            >
              No
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
