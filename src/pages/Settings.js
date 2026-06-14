import { useEffect, useRef, useState } from "react";
import { getSetting, setSetting } from "../db/settingsRepo";
import {
  exportAll,
  downloadJsonBackup,
  validateBackup,
  importAll,
  readJsonFile,
  copyToClipboard,
} from "../lib/backup";
import { pingSheet, pushToSheet, fetchFromSheet } from "../lib/sheetsSync";
import { APPS_SCRIPT_SOURCE } from "../lib/appsScriptSource";
import { AUTO_BACKUP_INTERVAL_MS } from "../hooks/useAutoBackup";

export default function Settings() {
  /* ---- Gemini key ---- */
  const [geminiKey, setGeminiKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [geminiSavedAt, setGeminiSavedAt] = useState(null);

  /* ---- Sheets URL + auto-backup ---- */
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetSavedAt, setSheetSavedAt] = useState(null);
  const [sheetStatus, setSheetStatus] = useState(null);
  const [busy, setBusy] = useState(null);
  const [showSetup, setShowSetup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoBackup, setAutoBackup] = useState(true);
  const [lastBackupAt, setLastBackupAt] = useState(null);
  const [lastBackupError, setLastBackupError] = useState(null);

  /* ---- Import dialog ---- */
  const [pending, setPending] = useState(null); // { source, parsed, summary }
  const fileInputRef = useRef(null);

  const refreshBackupStatus = async () => {
    const [at, err] = await Promise.all([
      getSetting("lastBackupAt", null),
      getSetting("lastBackupError", null),
    ]);
    setLastBackupAt(at);
    setLastBackupError(err);
  };

  useEffect(() => {
    getSetting("geminiApiKey").then((v) => setGeminiKey(v || ""));
    getSetting("sheetsUrl").then((v) => setSheetUrl(v || ""));
    getSetting("autoBackupEnabled", true).then((v) => setAutoBackup(v !== false));
    refreshBackupStatus();
    // Poll while settings is open so the "Last backup" timer stays fresh
    // even when the user just sits on this page.
    const t = setInterval(refreshBackupStatus, 15000);
    return () => clearInterval(t);
  }, []);

  const saveGemini = async (e) => {
    e.preventDefault();
    await setSetting("geminiApiKey", geminiKey.trim());
    setGeminiSavedAt(Date.now());
  };

  const saveSheetUrl = async (e) => {
    e.preventDefault();
    await setSetting("sheetsUrl", sheetUrl.trim());
    setSheetSavedAt(Date.now());
    setSheetStatus(null);
  };

  const withBusy = async (key, fn) => {
    setBusy(key);
    setSheetStatus(null);
    try {
      await fn();
    } catch (e) {
      setSheetStatus({ kind: "error", message: e.message || String(e) });
    } finally {
      setBusy(null);
    }
  };

  const onPing = () =>
    withBusy("ping", async () => {
      const res = await pingSheet(sheetUrl);
      setSheetStatus({
        kind: "ok",
        message: `Connected. Script v${res.version}.`,
      });
    });

  const onPush = () =>
    withBusy("push", async () => {
      const res = await pushToSheet(sheetUrl);
      const now = Date.now();
      await setSetting("lastBackupAt", now);
      await setSetting("lastBackupError", null);
      setLastBackupAt(now);
      setLastBackupError(null);
      const c = res.counts || {};
      setSheetStatus({
        kind: "ok",
        message: `Pushed: ${c.products || 0} products, ${c.pantryItems || 0} pantry, ${c.shoppingItems || 0} shopping.`,
      });
    });

  const toggleAutoBackup = async (e) => {
    const next = e.target.checked;
    setAutoBackup(next);
    await setSetting("autoBackupEnabled", next);
  };

  const onPull = () =>
    withBusy("pull-prepare", async () => {
      const parsed = await fetchFromSheet(sheetUrl);
      setPending({ source: "sheet", parsed, summary: countSummary(parsed) });
    });

  /* ---- JSON file fallback ---- */
  const onExportJson = async () => {
    const data = await exportAll();
    downloadJsonBackup(data);
  };

  const onPickJson = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const raw = await readJsonFile(file);
      const parsed = validateBackup(raw);
      setPending({
        source: "file",
        parsed,
        summary: countSummary(parsed),
      });
    } catch (err) {
      setSheetStatus({ kind: "error", message: err.message || String(err) });
    }
  };

  const cancelPending = () => setPending(null);

  const runImport = async (mode) => {
    if (!pending) return;
    setBusy("import");
    try {
      const res = await importAll(pending.parsed, mode);
      const total =
        res.products.imported +
        res.pantryItems.imported +
        res.shoppingItems.imported;
      setSheetStatus({
        kind: "ok",
        message:
          mode === "replace"
            ? `Restored ${total} rows (replaced all existing data).`
            : `Merged ${total} new rows; skipped ${
                res.products.skipped + res.pantryItems.skipped + res.shoppingItems.skipped
              } duplicates.`,
      });
      setPending(null);
    } catch (e) {
      setSheetStatus({ kind: "error", message: e.message || String(e) });
    } finally {
      setBusy(null);
    }
  };

  const onCopyScript = async () => {
    await copyToClipboard(APPS_SCRIPT_SOURCE);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-4 space-y-5 max-w-md mx-auto pb-12">
      {/* Gemini key */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="text-base font-semibold">Gemini API key</h2>
        <p className="text-sm text-gray-600">
          Needed for recipe suggestions. Stored locally on this device only — never
          sent anywhere except to Google's Gemini API.
        </p>
        <form onSubmit={saveGemini} className="space-y-3">
          <div className="relative">
            <input
              type={showGemini ? "text" : "password"}
              autoComplete="off"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIza…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-16 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button
              type="button"
              onClick={() => setShowGemini((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
            >
              {showGemini ? "Hide" : "Show"}
            </button>
          </div>
          <div className="flex gap-2 items-center">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium"
            >
              Save
            </button>
            {geminiSavedAt && <span className="text-xs text-emerald-700">Saved</span>}
          </div>
        </form>
        <p className="text-xs text-gray-500">
          Get a key at{" "}
          <a
            className="text-brand-700 underline"
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
          >
            aistudio.google.com
          </a>
          .
        </p>
      </section>

      {/* Sheets sync */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <h2 className="text-base font-semibold">Google Sheets sync</h2>
          <button
            type="button"
            className="text-xs text-brand-700 underline"
            onClick={() => setShowSetup((s) => !s)}
          >
            {showSetup ? "Hide setup" : "How to set up?"}
          </button>
        </div>

        {showSetup && (
          <div className="text-xs space-y-2 bg-gray-50 border border-gray-100 rounded-lg p-3">
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>
                Open{" "}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 underline"
                >
                  sheets.new
                </a>{" "}
                to create a blank sheet. Name it (e.g. "Pantry Backup").
              </li>
              <li>Extensions → Apps Script. Replace any code with the script below.</li>
              <li>
                Click <span className="font-medium">Deploy → New deployment → Web app</span>.
                Set <em>Execute as</em>: Me, <em>Who has access</em>: Anyone. Authorise.
              </li>
              <li>Copy the Web app URL → paste below → Save → Test connection.</li>
            </ol>
            <div className="relative">
              <pre className="text-[10px] leading-snug overflow-auto max-h-48 bg-white border border-gray-200 rounded p-2 font-mono whitespace-pre">
                {APPS_SCRIPT_SOURCE}
              </pre>
              <button
                type="button"
                onClick={onCopyScript}
                className="absolute top-1 right-1 text-[11px] px-2 py-0.5 rounded bg-brand-600 text-white"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="text-amber-700">
              The URL is the secret — anyone with it can read/write your sheet. Don't
              share it.
            </p>
          </div>
        )}

        <form onSubmit={saveSheetUrl} className="space-y-2">
          <input
            type="url"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/…/exec"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex gap-2 items-center">
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium"
            >
              Save URL
            </button>
            {sheetSavedAt && <span className="text-xs text-emerald-700">Saved</span>}
          </div>
        </form>

        <label className="flex items-center justify-between gap-3 py-1">
          <span className="text-sm">
            <span className="font-medium">Auto-backup every {Math.round(AUTO_BACKUP_INTERVAL_MS / 60000)} min</span>
            <br />
            <span className="text-xs text-gray-500">Pushes silently while the app is open.</span>
          </span>
          <input
            type="checkbox"
            checked={autoBackup}
            onChange={toggleAutoBackup}
            disabled={!sheetUrl}
            className="w-5 h-5 accent-brand-600"
          />
        </label>

        <div className="text-xs text-gray-600">
          {sheetUrl ? (
            <>
              Last backup:{" "}
              <span className="font-medium">{formatLast(lastBackupAt)}</span>
              {lastBackupError && (
                <span className="block text-red-700 mt-0.5">
                  Last attempt failed: {lastBackupError}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500">Add a URL to enable auto-backup.</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onPing}
            disabled={!sheetUrl || busy}
            className="py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-sm disabled:opacity-50"
          >
            {busy === "ping" ? "…" : "Test"}
          </button>
          <button
            type="button"
            onClick={onPush}
            disabled={!sheetUrl || busy}
            className="py-2 rounded-lg bg-brand-600 text-white font-medium text-sm disabled:opacity-50"
          >
            {busy === "push" ? "Pushing…" : "Push"}
          </button>
          <button
            type="button"
            onClick={onPull}
            disabled={!sheetUrl || busy}
            className="py-2 rounded-lg bg-white border border-brand-600 text-brand-700 font-medium text-sm disabled:opacity-50"
          >
            {busy === "pull-prepare" ? "…" : "Pull"}
          </button>
        </div>

        {sheetStatus && (
          <p
            className={`text-sm ${
              sheetStatus.kind === "ok" ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {sheetStatus.message}
          </p>
        )}
      </section>

      {/* Local file backup */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="text-base font-semibold">Backup file</h2>
        <p className="text-sm text-gray-600">
          Download a JSON snapshot you can keep anywhere (Drive, iCloud, email to self).
          Restore it from any device.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportJson}
            className="py-2 rounded-lg bg-brand-600 text-white font-medium"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2 rounded-lg bg-white border border-brand-600 text-brand-700 font-medium"
          >
            Import JSON…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={onPickJson}
          />
        </div>
      </section>

      {/* Storage info */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-2">
        <h2 className="text-base font-semibold">Local storage</h2>
        <p className="text-sm text-gray-600">
          All pantry, shopping and product data is stored in this browser (IndexedDB).
          You can clear it from your browser site settings.
        </p>
      </section>

      {/* Confirm dialog */}
      {pending && (
        <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-lg font-semibold">Import data</h3>
            <p className="text-sm text-gray-600">
              {pending.source === "sheet" ? "From Google Sheet:" : "From backup file:"}
            </p>
            <ul className="text-sm bg-gray-50 rounded-lg p-3 space-y-0.5">
              <li>Products: <span className="font-semibold">{pending.summary.products}</span></li>
              <li>Pantry: <span className="font-semibold">{pending.summary.pantryItems}</span></li>
              <li>Shopping: <span className="font-semibold">{pending.summary.shoppingItems}</span></li>
            </ul>
            <p className="text-sm text-gray-600">How would you like to apply this?</p>
            <div className="space-y-2">
              <button
                type="button"
                disabled={busy === "import"}
                onClick={() => runImport("merge")}
                className="w-full py-2 rounded-lg bg-brand-600 text-white font-medium disabled:opacity-60"
              >
                Merge — keep existing, add missing
              </button>
              <button
                type="button"
                disabled={busy === "import"}
                onClick={() => {
                  if (window.confirm("This will delete all local pantry, shopping, and product data, then restore from the backup. Continue?")) {
                    runImport("replace");
                  }
                }}
                className="w-full py-2 rounded-lg bg-red-600 text-white font-medium disabled:opacity-60"
              >
                Replace all — wipe and restore
              </button>
              <button
                type="button"
                disabled={busy === "import"}
                onClick={cancelPending}
                className="w-full py-2 rounded-lg bg-gray-100 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function countSummary(parsed) {
  return {
    products: parsed.products?.length || 0,
    pantryItems: parsed.pantryItems?.length || 0,
    shoppingItems: parsed.shoppingItems?.length || 0,
  };
}

function formatLast(ts) {
  if (!ts) return "never";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(ts).toLocaleString();
}

