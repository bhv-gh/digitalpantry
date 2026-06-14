import { getDB, uid } from "./schema";

export async function addShoppingItem(item) {
  const db = await getDB();
  const record = {
    id: item.id ?? uid(),
    name: (item.name || "").trim(),
    quantity: Number(item.quantity ?? 1),
    unit: item.unit || "pcs",
    notes: item.notes || "",
    productId: item.productId || null,
    checked: !!item.checked,
    addedAt: item.addedAt ?? Date.now(),
  };
  if (!record.name) throw new Error("Shopping item needs a name");
  await db.put("shoppingItems", record);
  return record;
}

export async function updateShoppingItem(item) {
  return addShoppingItem(item);
}

export async function deleteShoppingItem(id) {
  const db = await getDB();
  await db.delete("shoppingItems", id);
}

export async function clearChecked() {
  const db = await getDB();
  const all = await db.getAll("shoppingItems");
  const tx = db.transaction("shoppingItems", "readwrite");
  await Promise.all(all.filter((i) => i.checked).map((i) => tx.store.delete(i.id)));
  await tx.done;
}

export async function listShoppingItems() {
  const db = await getDB();
  const all = await db.getAll("shoppingItems");
  return all.sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return b.addedAt - a.addedAt;
  });
}
