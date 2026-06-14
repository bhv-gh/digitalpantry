import { exportAll, importAll, validateBackup } from "./backup";

/**
 * Hardcoded Apps Script web-app URL. If you redeploy the script
 * (Apps Script editor → Deploy → Manage deployments → edit), paste the new
 * "/exec" URL here and ship a build.
 */
export const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbz8G6ye4KTLUjYZC_R26dSm-MV4L9J6JJKvUT8l_2Wp9lP8d9ndMYgR9lkb0_nZEwc/exec";

const ACTIONS = { EXPORT: "export", IMPORT: "import", PING: "ping" };

/**
 * text/plain content-type keeps this a "simple" CORS request — Apps Script
 * doesn't reply to OPTIONS preflights, so anything else fails.
 */
async function callScript(action, payload = null) {
  let res;
  try {
    res = await fetch(SHEETS_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, payload }),
    });
  } catch (e) {
    throw new Error("Couldn't reach the backup script.");
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
      "Sheet returned a non-JSON response. The script may need to be redeployed."
    );
  }
  if (json.error) throw new Error(json.error);
  return json;
}

export const pingSheet = () => callScript(ACTIONS.PING);

export async function pushToSheet() {
  const data = await exportAll();
  return callScript(ACTIONS.EXPORT, data);
}

/** Fetch and validate but don't import — used for the confirm dialog. */
export async function fetchFromSheet() {
  const data = await callScript(ACTIONS.IMPORT);
  return validateBackup(data);
}

export async function pullFromSheet(mode) {
  const parsed = await fetchFromSheet();
  return importAll(parsed, mode);
}
