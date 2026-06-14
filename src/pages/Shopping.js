import { useEffect, useState, useCallback } from "react";
import {
  addShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  listShoppingItems,
  clearChecked,
} from "../db/shoppingRepo";
import VoiceInput from "../components/VoiceInput";
import { PlusIcon, TrashIcon, CheckIcon } from "../components/icons";

const UNITS = ["pcs", "g", "kg", "ml", "L", "pack"];

export default function Shopping() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("pcs");

  const refresh = useCallback(async () => {
    setLoading(true);
    setItems(await listShoppingItems());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = async (e) => {
    e?.preventDefault();
    const n = name.trim();
    if (!n) return;
    await addShoppingItem({ name: n, quantity: Number(qty) || 1, unit });
    setName(""); setQty(1); setUnit("pcs");
    refresh();
  };

  const toggle = async (it) => {
    await updateShoppingItem({ ...it, checked: !it.checked });
    refresh();
  };

  const remove = async (it) => {
    await deleteShoppingItem(it.id);
    refresh();
  };

  const sweep = async () => {
    if (!window.confirm("Remove all checked items?")) return;
    await clearChecked();
    refresh();
  };

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <form
        onSubmit={add}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-2"
      >
        <VoiceInput
          value={name}
          onChange={setName}
          placeholder="Add item (tap mic to speak)…"
        />
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-base"
            aria-label="Quantity"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-base bg-white"
            aria-label="Unit"
          >
            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
          <button
            type="submit"
            className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg bg-brand-600 text-white font-medium"
          >
            <PlusIcon className="w-4 h-4" /> Add
          </button>
        </div>
      </form>

      {checkedCount > 0 && (
        <button
          type="button"
          onClick={sweep}
          className="w-full text-sm py-2 rounded-lg bg-gray-100 text-gray-700"
        >
          Clear {checkedCount} checked item{checkedCount === 1 ? "" : "s"}
        </button>
      )}

      {loading ? (
        <p className="text-center text-sm text-gray-500 py-12">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-center text-sm text-gray-500 py-12">
          Shopping list is empty.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className={`bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex items-center gap-3 ${
                it.checked ? "opacity-60" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(it)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  it.checked
                    ? "bg-brand-600 border-brand-600 text-white"
                    : "border-gray-300 text-transparent"
                }`}
                aria-label={it.checked ? "Mark unchecked" : "Mark checked"}
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium truncate ${
                    it.checked ? "line-through text-gray-500" : ""
                  }`}
                >
                  {it.name}
                </p>
                <p className="text-xs text-gray-500">
                  {it.quantity} {it.unit}
                  {it.notes && ` · ${it.notes}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(it)}
                className="p-1 text-gray-400 hover:text-red-600"
                aria-label="Delete"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
