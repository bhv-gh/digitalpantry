import { getDB, uid } from "./schema";

export async function getProductByBarcode(barcode) {
  if (!barcode) return null;
  const db = await getDB();
  return (await db.getFromIndex("products", "barcode", String(barcode))) || null;
}

export async function getProduct(id) {
  const db = await getDB();
  return (await db.get("products", id)) || null;
}

export async function listProducts() {
  const db = await getDB();
  const all = await db.getAll("products");
  return all.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function saveProduct(p) {
  const db = await getDB();
  const product = {
    id: p.id ?? uid(),
    barcode: p.barcode ? String(p.barcode) : null,
    name: p.name || "Unnamed product",
    brand: p.brand || "",
    category: p.category || "",
    imageUrl: p.imageUrl || "",
    unit: p.unit || "pcs",
    source: p.source || "manual",
    createdAt: p.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await db.put("products", product);
  return product;
}

export async function deleteProduct(id) {
  const db = await getDB();
  await db.delete("products", id);
}
