import { getDB } from "./schema";

export async function getSetting(key, fallback = null) {
  const db = await getDB();
  const row = await db.get("settings", key);
  return row ? row.value : fallback;
}

export async function setSetting(key, value) {
  const db = await getDB();
  await db.put("settings", { key, value, updatedAt: Date.now() });
  return value;
}
