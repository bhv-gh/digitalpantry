import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPantryWithProducts } from "../db/pantryRepo";
import { listShoppingItems } from "../db/shoppingRepo";
import {
  daysUntil,
  formatExpiry,
  expiryBadgeClass,
} from "../lib/date";
import { ScanIcon, PlusIcon, ChefIcon, CartIcon } from "../components/icons";

export default function Home() {
  const [pantry, setPantry] = useState([]);
  const [shopping, setShopping] = useState([]);

  useEffect(() => {
    listPantryWithProducts().then(setPantry);
    listShoppingItems().then(setShopping);
  }, []);

  const expiringSoon = pantry.filter((it) => {
    const d = daysUntil(it.expiryDate);
    return d != null && d >= 0 && d <= 7;
  });
  const expired = pantry.filter((it) => {
    const d = daysUntil(it.expiryDate);
    return d != null && d < 0;
  });
  const openShop = shopping.filter((i) => !i.checked).length;

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/scan"
          className="rounded-xl bg-brand-600 text-white p-4 flex flex-col items-start gap-1 shadow-sm"
        >
          <ScanIcon className="w-6 h-6" />
          <span className="text-lg font-semibold">Scan</span>
          <span className="text-xs text-brand-50">Barcode or QR</span>
        </Link>
        <Link
          to="/pantry/add"
          className="rounded-xl bg-white border border-gray-200 p-4 flex flex-col items-start gap-1 shadow-sm"
        >
          <PlusIcon className="w-6 h-6 text-brand-600" />
          <span className="text-lg font-semibold">Add</span>
          <span className="text-xs text-gray-500">From your products</span>
        </Link>
        <Link
          to="/recipes"
          className="rounded-xl bg-white border border-gray-200 p-4 flex flex-col items-start gap-1 shadow-sm"
        >
          <ChefIcon className="w-6 h-6 text-brand-600" />
          <span className="text-lg font-semibold">Recipes</span>
          <span className="text-xs text-gray-500">Ask Gemini</span>
        </Link>
        <Link
          to="/shopping"
          className="rounded-xl bg-white border border-gray-200 p-4 flex flex-col items-start gap-1 shadow-sm"
        >
          <CartIcon className="w-6 h-6 text-brand-600" />
          <span className="text-lg font-semibold">Shop</span>
          <span className="text-xs text-gray-500">
            {openShop ? `${openShop} item${openShop === 1 ? "" : "s"} to buy` : "All clear"}
          </span>
        </Link>
      </div>

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-baseline mb-2">
          <h2 className="text-base font-semibold">Pantry overview</h2>
          <Link to="/pantry" className="text-xs text-brand-700">View all</Link>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="Total" value={pantry.length} />
          <Stat label="Soon" value={expiringSoon.length} accent="text-orange-700" />
          <Stat label="Expired" value={expired.length} accent="text-red-700" />
        </div>
      </section>

      {(expiringSoon.length > 0 || expired.length > 0) && (
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Needs attention</h3>
          <ul className="divide-y divide-gray-100">
            {[...expired, ...expiringSoon].slice(0, 5).map((it) => (
              <li
                key={it.id}
                className="py-2 flex items-center gap-2 text-sm"
              >
                <span className="flex-1 truncate">
                  {it.product?.name || "(deleted)"}
                </span>
                <span
                  className={`text-[11px] px-1.5 py-0.5 rounded ${expiryBadgeClass(it.expiryDate)}`}
                >
                  {formatExpiry(it.expiryDate)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pantry.length === 0 && (
        <section className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm text-brand-800">
          <p className="font-medium mb-1">Welcome to your Pantry Digitiser</p>
          <p>
            Tap <span className="font-semibold">Scan</span> to barcode-scan a product,
            or <span className="font-semibold">Add</span> to register one manually. We'll
            remember it for next time.
          </p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent = "text-gray-900" }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}
