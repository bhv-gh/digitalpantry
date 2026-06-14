import { exportAll, importAll, validateBackup } from "./backup";

const ACTIONS = { EXPORT: "export", IMPORT: "import", PING: "ping" };

/**
 * Calls a deployed Google Apps Script web app.
 *
 * Important: we use text/plain content-type so the browser treats this
 * as a "simple" CORS request (no preflight). Apps Script doesn't reply
 * to OPTIONS, so a preflight would otherwise fail.
 */
async function callScript(url, action, payload = null) {
  if (!url) throw new Error("Set the Apps Script URL in Settings first.");
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
  } catch (e) {
    throw new Error(
      "Couldn't reach the script. Check the URL and that the deployment access is set to 'Anyone'."
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Sheet HTTP ${res.status}: ${detail.slice(0, 200) || res.statusText}`);
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      "Sheet returned a non-JSON response. Make sure you deployed the latest version of the script."
    );
  }
  if (json.error) throw new Error(json.error);
  return json;
}

export async function pingSheet(url) {
  return callScript(url, ACTIONS.PING);
}

export async function pushToSheet(url) {
  const data = await exportAll();
  return callScript(url, ACTIONS.EXPORT, data);
}

/** Fetch and validate but don't import — used for the confirm dialog. */
export async function fetchFromSheet(url) {
  const data = await callScript(url, ACTIONS.IMPORT);
  return validateBackup(data);
}

export async function pullFromSheet(url, mode) {
  const parsed = await fetchFromSheet(url);
  return importAll(parsed, mode);
}
