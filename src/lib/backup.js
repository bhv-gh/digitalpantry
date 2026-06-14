import { listProducts, saveProduct } from "../db/productsRepo";
import { listPantryItems, addPantryItem } from "../db/pantryRepo";
import { listShoppingItems, addShoppingItem } from "../db/shoppingRepo";
import { getDB } from "../db/schema";

const BACKUP_VERSION = 1;

export const TABLES = {
  products: {
    label: "Products",
    columns: ["id", "barcode", "name", "brand", "category", "imageUrl", "unit", "source", "createdAt", "updatedAt"],
    list: listProducts,
  },
  pantryItems: {
    label: "Pantry",
    columns: ["id", "productId", "quantity", "unit", "expiryDate", "location", "notes", "addedAt"],
    list: listPantryItems,
  },
  shoppingItems: {
    label: "Shopping",
    columns: ["id", "name", "quantity", "unit", "notes", "productId", "checked", "addedAt"],
    list: listShoppingItems,
  },
};

export async function exportAll() {
  const [products, pantryItems, shoppingItems] = await Promise.all([
    listProducts(),
    listPantryItems(),
    listShoppingItems(),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      products: products.length,
      pantryItems: pantryItems.length,
      shoppingItems: shoppingItems.length,
    },
    products,
    pantryItems,
    shoppingItems,
  };
}

export function serializeRows(rows, columns, sep = ",") {
  const cell = sep === "," ? csvCell : tsvCell;
  const header = columns.map(cell).join(sep);
  const body = rows.map((r) => columns.map((c) => cell(r[c])).join(sep)).join("\n");
  return header + "\n" + body;
}

function csvCell(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function tsvCell(v) {
  if (v == null) return "";
  return String(v).replace(/[\t\n\r]/g, " ");
}

export function downloadBlob(content, mime, filename) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 0);
}

export function downloadJsonBackup(data) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(JSON.stringify(data, null, 2), "application/json", `pantry-backup-${stamp}.json`);
}

export function downloadCsv(name, rows, columns) {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(serializeRows(rows, columns, ","), "text/csv;charset=utf-8", `${name}-${stamp}.csv`);
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

export async function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Unable to read file"));
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || "{}")));
      } catch (e) {
        reject(new Error("File is not valid JSON"));
      }
    };
    reader.readAsText(file);
  });
}

export function validateBackup(data) {
  if (!data || typeof data !== "object") throw new Error("Empty or invalid backup file");
  if (data.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${data.version ?? "unknown"} (expected ${BACKUP_VERSION})`);
  }
  return {
    products: Array.isArray(data.products) ? data.products : [],
    pantryItems: Array.isArray(data.pantryItems) ? data.pantryItems : [],
    shoppingItems: Array.isArray(data.shoppingItems) ? data.shoppingItems : [],
  };
}

async function clearAll() {
  const db = await getDB();
  const tx = db.transaction(["products", "pantryItems", "shoppingItems"], "readwrite");
  await Promise.all([
    tx.objectStore("products").clear(),
    tx.objectStore("pantryItems").clear(),
    tx.objectStore("shoppingItems").clear(),
  ]);
  await tx.done;
}

async function existingIds(store) {
  const db = await getDB();
  const all = await db.getAll(store);
  return new Set(all.map((r) => r.id));
}

async function importBucket({ items, importer, existing, mode }) {
  let imported = 0, skipped = 0, failed = 0;
  for (const item of items) {
    if (mode === "merge" && existing.has(item.id)) {
      skipped++;
      continue;
    }
    try {
      await importer(item);
      imported++;
    } catch {
      failed++;
    }
  }
  return { imported, skipped, failed };
}

/**
 * Import a parsed/validated backup.
 * mode: "replace" wipes existing data first, "merge" keeps existing rows and skips duplicate ids.
 */
export async function importAll(parsed, mode) {
  if (mode !== "replace" && mode !== "merge") {
    throw new Error(`Unknown import mode: ${mode}`);
  }
  if (mode === "replace") {
    await clearAll();
  }
  const [existingProducts, existingPantry, existingShop] = await Promise.all([
    existingIds("products"),
    existingIds("pantryItems"),
    existingIds("shoppingItems"),
  ]);
  const products = await importBucket({
    items: parsed.products,
    importer: saveProduct,
    existing: existingProducts,
    mode,
  });
  const pantryItems = await importBucket({
    items: parsed.pantryItems,
    importer: addPantryItem,
    existing: existingPantry,
    mode,
  });
  const shoppingItems = await importBucket({
    items: parsed.shoppingItems.filter((s) => (s.name || "").trim()),
    importer: addShoppingItem,
    existing: existingShop,
    mode,
  });
  return { products, pantryItems, shoppingItems };
}
