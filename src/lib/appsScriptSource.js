/* eslint-disable no-template-curly-in-string */

/**
 * The Apps Script the user pastes into a new Google Sheet's Script Editor.
 * Kept here so the Settings page can show + copy it to the clipboard.
 * Update both ends together if you change the protocol — bump VERSION below
 * AND in src/lib/backup.js (BACKUP_VERSION).
 */
export const APPS_SCRIPT_SOURCE = String.raw`/**
 * Pantry Digitiser <-> Google Sheets bridge.
 * Setup (one-time, ~5 min):
 *   1. Open https://sheets.google.com -> new blank sheet (e.g. "Pantry Backup").
 *   2. Extensions -> Apps Script. Replace the placeholder with this file. Save.
 *   3. Deploy -> New deployment -> Type: Web app.
 *        Execute as:     Me
 *        Who has access: Anyone (the URL is the secret -- keep it private)
 *      Deploy and authorise.
 *   4. Copy the Web app URL it shows.
 *   5. In the Pantry app, paste it in Settings -> Sheets sync, save, Test.
 */

const VERSION = 1;

const TABLES = [
  { name: "products",      columns: ["id","barcode","name","brand","category","imageUrl","unit","source","createdAt","updatedAt"] },
  { name: "pantryItems",   columns: ["id","productId","quantity","unit","expiryDate","location","notes","addedAt"] },
  { name: "shoppingItems", columns: ["id","name","quantity","unit","notes","productId","checked","addedAt"] },
];

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const { action, payload } = body;
    if (action === "ping")   return json_({ ok: true, version: VERSION, ts: new Date().toISOString() });
    if (action === "export") return json_(writeAll_(payload));
    if (action === "import") return json_(readAll_());
    return json_({ error: "Unknown action: " + action });
  } catch (err) {
    return json_({ error: String((err && err.message) || err) });
  }
}

function doGet() {
  try { return json_(readAll_()); }
  catch (err) { return json_({ error: String((err && err.message) || err) }); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeAll_(payload) {
  if (!payload || payload.version !== VERSION) {
    throw new Error("Unsupported backup version: " + (payload && payload.version));
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const counts = {};
  TABLES.forEach(function (t) {
    const rows = payload[t.name] || [];
    writeSheet_(ss, t, rows);
    counts[t.name] = rows.length;
  });
  return { ok: true, version: VERSION, counts: counts, exportedAt: new Date().toISOString() };
}

function writeSheet_(ss, table, rows) {
  let sheet = ss.getSheetByName(table.name);
  if (!sheet) sheet = ss.insertSheet(table.name);
  sheet.clear();
  const data = [table.columns];
  rows.forEach(function (r) {
    data.push(table.columns.map(function (c) { return normaliseOut_(r[c]); }));
  });
  sheet.getRange(1, 1, data.length, table.columns.length).setValues(data);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, table.columns.length);
}

function normaliseOut_(v) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return v;
}

function readAll_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = { version: VERSION, exportedAt: new Date().toISOString() };
  TABLES.forEach(function (t) {
    out[t.name] = readSheet_(ss, t);
  });
  return out;
}

function readSheet_(ss, table) {
  const sheet = ss.getSheetByName(table.name);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(function (h) { return String(h); });
  const rows = [];
  for (let r = 1; r < values.length; r++) {
    const row = {};
    headers.forEach(function (h, i) {
      row[h] = normaliseIn_(values[r][i], h);
    });
    rows.push(row);
  }
  return rows;
}

function normaliseIn_(v, key) {
  if (v === "" || v == null) return null;
  if (typeof v === "boolean") return v;
  if (key === "checked") return v === true || v === "true" || v === "TRUE" || v === 1;
  if (key === "quantity") return Number(v);
  if (key === "createdAt" || key === "updatedAt" || key === "addedAt") {
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}
`;
