import { getDB, uid } from "./schema";
import { getProduct } from "./productsRepo";

export async function addPantryItem(item) {
  const db = await getDB();
  const record = {
    id: item.id ?? uid(),
    productId: item.productId,
    quantity: Number(item.quantity ?? 1),
    unit: item.unit || "pcs",
    expiryDate: item.expiryDate || null, // ISO date string "YYYY-MM-DD"
    location: item.location || "pantry",
    notes: item.notes || "",
    addedAt: item.addedAt ?? Date.now(),
  };
  await db.put("pantryItems", record);
  return record;
}

export async function updatePantryItem(item) {
  return addPantryItem(item); // put = upsert
}

export async function deletePantryItem(id) {
  const db = await getDB();
  await db.delete("pantryItems", id);
}

export async function listPantryItems() {
  const db = await getDB();
  return db.getAll("pantryItems");
}

export async function listPantryWithProducts() {
  const items = await listPantryItems();
  const enriched = await Promise.all(
    items.map(async (it) => ({ ...it, product: await getProduct(it.productId) }))
  );
  return enriched.sort((a, b) => {
    const ax = a.expiryDate || "9999-99-99";
    const bx = b.expiryDate || "9999-99-99";
    return ax.localeCompare(bx);
  });
}
