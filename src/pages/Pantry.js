import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  listPantryWithProducts,
  deletePantryItem,
  updatePantryItem,
} from "../db/pantryRepo";
import { addShoppingItem } from "../db/shoppingRepo";
import {
  formatExpiry,
  expiryBadgeClass,
  daysUntil,
} from "../lib/date";
import { PlusIcon, ScanIcon, TrashIcon, CartIcon } from "../components/icons";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "soon", label: "Soon" },
  { id: "expired", label: "Expired" },
];

export default function Pantry() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await listPantryWithProducts();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    if (filter === "soon") {
      return items.filter((it) => {
        const d = daysUntil(it.expiryDate);
        return d != null && d >= 0 && d <= 7;
      });
    }
    if (filter === "expired") {
      return items.filter((it) => {
        const d = daysUntil(it.expiryDate);
        return d != null && d < 0;
      });
    }
    return items;
  }, [items, filter]);

  const adjust = async (item, delta) => {
    const next = Math.max(0, (Number(item.quantity) || 0) + delta);
    if (next === 0) {
      await deletePantryItem(item.id);
    } else {
      await updatePantryItem({ ...item, quantity: next });
    }
    refresh();
  };

  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.product?.name || "this item"}?`)) return;
    await deletePantryItem(item.id);
    refresh();
  };

  const reorder = async (item) => {
    await addShoppingItem({
      name: item.product?.name || "Item",
      quantity: 1,
      unit: item.unit,
      productId: item.productId,
    });
    alert("Added to shopping list");
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex gap-2">
        <Link
          to="/scan"
          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-brand-600 text-white font-medium"
        >
          <ScanIcon className="w-4 h-4" /> Scan
        </Link>
        <Link
          to="/pantry/add"
          className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium"
        >
          <PlusIcon className="w-4 h-4" /> Add
        </Link>
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-100">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 text-sm py-1.5 rounded-md ${
              filter === f.id
                ? "bg-brand-100 text-brand-700 font-semibold"
                : "text-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-sm text-gray-500 py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="text-center text-sm text-gray-500 py-12">
          {items.length === 0 ? (
            <>
              Your pantry is empty.<br />
              Tap <span className="font-semibold">Scan</span> or <span className="font-semibold">Add</span> to start.
            </>
          ) : (
            "Nothing matches this filter."
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <li
              key={it.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex gap-3 items-center"
            >
              {it.product?.imageUrl ? (
                <img
                  src={it.product.imageUrl}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover bg-gray-100"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center text-lg font-semibold">
                  {(it.product?.name || "?")[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {it.product?.name || "(deleted product)"}
                </p>
                {it.product?.brand && (
                  <p className="text-xs text-gray-500 truncate">{it.product.brand}</p>
                )}
                <div className="flex gap-2 items-center mt-1">
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded ${expiryBadgeClass(
                      it.expiryDate
                    )}`}
                  >
                    {formatExpiry(it.expiryDate)}
                  </span>
                  {it.location && it.location !== "pantry" && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                      {it.location}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center bg-gray-100 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => adjust(it, -1)}
                    className="w-7 h-7 text-gray-600 active:bg-gray-200"
                    aria-label="Decrease"
                  >
                    −
                  </button>
                  <span className="px-1 text-sm tabular-nums min-w-[2ch] text-center">
                    {it.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjust(it, 1)}
                    className="w-7 h-7 text-gray-600 active:bg-gray-200"
                    aria-label="Increase"
                  >
                    +
                  </button>
                </div>
                <span className="text-[10px] text-gray-500">{it.unit}</span>
                <div className="flex gap-1 mt-0.5">
                  <button
                    type="button"
                    onClick={() => reorder(it)}
                    className="p-1 text-gray-400 hover:text-brand-600"
                    aria-label="Add to shopping list"
                    title="Add to shopping list"
                  >
                    <CartIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(it)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    aria-label="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
