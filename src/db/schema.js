import { openDB } from "idb";

const DB_NAME = "pantry-digitiser";
const DB_VERSION = 1;

let _dbPromise = null;

export function getDB() {
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("products")) {
          const s = db.createObjectStore("products", { keyPath: "id" });
          s.createIndex("barcode", "barcode", { unique: false });
          s.createIndex("name", "name");
        }
        if (!db.objectStoreNames.contains("pantryItems")) {
          const s = db.createObjectStore("pantryItems", { keyPath: "id" });
          s.createIndex("productId", "productId");
          s.createIndex("expiryDate", "expiryDate");
        }
        if (!db.objectStoreNames.contains("shoppingItems")) {
          db.createObjectStore("shoppingItems", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      },
    });
  }
  return _dbPromise;
}

export const uid = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
