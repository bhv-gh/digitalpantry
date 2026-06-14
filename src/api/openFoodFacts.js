/**
 * Lookup a product by barcode from Open Food Facts.
 * Uses the world endpoint (India region is supported via the same API).
 * Returns a normalised product object or null if not found.
 */
const BASE = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = [
  "code",
  "product_name",
  "product_name_en",
  "brands",
  "categories",
  "image_front_small_url",
  "image_url",
  "quantity",
].join(",");

export async function lookupByBarcode(barcode) {
  if (!barcode) return null;
  const url = `${BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`OpenFoodFacts request failed (${res.status})`);
  }
  const data = await res.json();
  // OFF returns status: 1 if found, 0 if not
  if (data?.status !== 1 || !data.product) return null;
  const p = data.product;
  return {
    barcode: String(p.code || barcode),
    name: p.product_name_en || p.product_name || "",
    brand: (p.brands || "").split(",")[0]?.trim() || "",
    category: (p.categories || "").split(",")[0]?.trim() || "",
    imageUrl: p.image_front_small_url || p.image_url || "",
    quantity: p.quantity || "",
    source: "openfoodfacts",
  };
}
