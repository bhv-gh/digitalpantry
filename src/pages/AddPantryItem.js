import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProduct, listProducts, saveProduct } from "../db/productsRepo";
import { addPantryItem } from "../db/pantryRepo";
import { todayIso } from "../lib/date";
import VoiceInput from "../components/VoiceInput";
import OcrCapture from "../components/OcrCapture";
import { PlusIcon, ScanIcon } from "../components/icons";

const LOCATIONS = ["pantry", "fridge", "freezer", "spice rack", "other"];
const UNITS = ["pcs", "g", "kg", "ml", "L", "pack"];

export default function AddPantryItem() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pcs");
  const [expiry, setExpiry] = useState("");
  const [location, setLocation] = useState("pantry");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (productId) {
      getProduct(productId).then((p) => {
        if (p) {
          setProduct(p);
          if (p.unit) setUnit(p.unit);
        }
      });
    } else {
      listProducts().then(setProducts);
    }
  }, [productId]);

  const filtered = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) =>
        (p.name + " " + (p.brand || "")).toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [products, productSearch]);

  const pickProduct = (p) => {
    setProduct(p);
    if (p.unit) setUnit(p.unit);
  };

  const createAndPick = async (e) => {
    e?.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const p = await saveProduct({
      name,
      brand: newBrand.trim(),
      category: newCategory.trim(),
      source: "manual",
    });
    setProducts((prev) => [...prev, p]);
    setProduct(p);
    setCreating(false);
    setNewName(""); setNewBrand(""); setNewCategory("");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!product) {
      setError("Pick or register a product first.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addPantryItem({
        productId: product.id,
        quantity: Number(quantity) || 1,
        unit,
        expiryDate: expiry || null,
        location,
        notes,
      });
      navigate("/pantry");
    } catch (err) {
      setError(err.message || "Failed to save");
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {/* Product selection / display */}
      {product ? (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex gap-3 items-center">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt=""
              className="w-14 h-14 rounded-lg object-cover bg-gray-100"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-semibold">
              {(product.name || "?")[0]?.toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{product.name}</p>
            {product.brand && (
              <p className="text-xs text-gray-500 truncate">{product.brand}</p>
            )}
            {product.barcode && (
              <p className="text-[10px] text-gray-400 truncate">#{product.barcode}</p>
            )}
          </div>
          {!productId && (
            <button
              type="button"
              onClick={() => setProduct(null)}
              className="text-xs text-gray-500 underline"
            >
              Change
            </button>
          )}
        </section>
      ) : (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-semibold">Choose product</h2>
            <Link to="/scan" className="inline-flex items-center gap-1 text-xs text-brand-700">
              <ScanIcon className="w-4 h-4" /> Scan
            </Link>
          </div>
          <VoiceInput
            value={productSearch}
            onChange={setProductSearch}
            placeholder="Search registered products…"
          />
          <ul className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pickProduct(p)}
                  className="w-full text-left py-2 flex items-center gap-2"
                >
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover bg-gray-100" />
                  ) : (
                    <div className="w-8 h-8 rounded bg-brand-50 text-brand-600 flex items-center justify-center text-sm font-semibold">
                      {(p.name || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm truncate">{p.name}</p>
                    {p.brand && <p className="text-[11px] text-gray-500 truncate">{p.brand}</p>}
                  </div>
                </button>
              </li>
            ))}
            {!filtered.length && (
              <li className="py-3 text-sm text-gray-500 text-center">
                No matches yet.
              </li>
            )}
          </ul>

          {!creating ? (
            <button
              type="button"
              onClick={() => { setCreating(true); setNewName(productSearch); }}
              className="w-full inline-flex justify-center items-center gap-1 text-sm text-brand-700 py-2 border border-dashed border-brand-300 rounded-lg"
            >
              <PlusIcon className="w-4 h-4" /> Register new product
            </button>
          ) : (
            <form onSubmit={createAndPick} className="space-y-2">
              <VoiceInput value={newName} onChange={setNewName} placeholder="Product name *" />
              <VoiceInput value={newBrand} onChange={setNewBrand} placeholder="Brand (optional)" />
              <VoiceInput value={newCategory} onChange={setNewCategory} placeholder="Category (optional)" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 rounded-lg bg-brand-600 text-white font-medium">
                  Save product
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* Pantry item details */}
      {product && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-gray-500">Quantity</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-500">Unit</span>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
          </div>

          <div>
            <div className="flex items-end justify-between mb-1">
              <span className="text-xs text-gray-500">Expiry date</span>
              <button
                type="button"
                onClick={() => setExpiry("")}
                className="text-xs text-gray-500 underline"
              >
                No expiry
              </button>
            </div>
            <input
              type="date"
              value={expiry}
              min="2000-01-01"
              onChange={(e) => setExpiry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="mt-2">
              <OcrCapture
                mode="expiry"
                label="Scan expiry from label (optional)"
                onResult={({ expiry: found, text }) => {
                  if (found) setExpiry(found);
                  else if (text) alert("Couldn't detect a date. Raw OCR text:\n\n" + text.slice(0, 300));
                }}
              />
            </div>
          </div>

          <label className="block">
            <span className="text-xs text-gray-500">Location</span>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Notes (optional)</span>
            <VoiceInput value={notes} onChange={setNotes} placeholder="e.g. opened, half used" />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-brand-600 text-white font-semibold disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add to pantry"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-3 rounded-lg bg-gray-100 text-gray-700"
            >
              Cancel
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            Today: {todayIso()}
          </p>
        </form>
      )}
    </div>
  );
}
