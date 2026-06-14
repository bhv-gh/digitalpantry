import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listPantryWithProducts } from "../db/pantryRepo";
import { addShoppingItem } from "../db/shoppingRepo";
import { suggestRecipes, getApiKey } from "../api/gemini";
import VoiceInput from "../components/VoiceInput";
import { SparkIcon, PlusIcon, CartIcon, ChefIcon } from "../components/icons";

export default function Recipes() {
  const [hasKey, setHasKey] = useState(true);
  const [pantry, setPantry] = useState([]);
  const [request, setRequest] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recipes, setRecipes] = useState(null);
  const [addedKeys, setAddedKeys] = useState({});

  useEffect(() => {
    getApiKey().then((k) => setHasKey(!!k));
    listPantryWithProducts().then(setPantry);
  }, []);

  const ask = async (withRequest) => {
    setLoading(true);
    setError(null);
    setRecipes(null);
    setAddedKeys({});
    try {
      const res = await suggestRecipes({
        pantry,
        request: withRequest ? request.trim() : null,
      });
      setRecipes(res?.recipes || []);
    } catch (e) {
      setError(e.message || "Recipe generation failed");
    } finally {
      setLoading(false);
    }
  };

  const addNeed = async (recipeIdx, needIdx, ing) => {
    const key = `${recipeIdx}:${needIdx}`;
    await addShoppingItem({
      name: ing.name,
      quantity: 1,
      unit: "pcs",
      notes: ing.quantity || "",
    });
    setAddedKeys((p) => ({ ...p, [key]: true }));
  };

  const addAllNeeds = async (recipeIdx, needs) => {
    const updates = {};
    for (let i = 0; i < needs.length; i++) {
      const key = `${recipeIdx}:${i}`;
      if (addedKeys[key]) continue;
      await addShoppingItem({
        name: needs[i].name,
        quantity: 1,
        unit: "pcs",
        notes: needs[i].quantity || "",
      });
      updates[key] = true;
    }
    setAddedKeys((p) => ({ ...p, ...updates }));
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      {!hasKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
          <p className="font-medium text-amber-900">Gemini API key required</p>
          <p className="text-amber-800 mt-1">
            Add your key in{" "}
            <Link to="/settings" className="underline">
              Settings
            </Link>{" "}
            to get recipe suggestions.
          </p>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-3">
        <p className="text-sm text-gray-600">
          You have <span className="font-semibold">{pantry.length}</span> pantry item
          {pantry.length === 1 ? "" : "s"} to cook with.
        </p>
        <button
          type="button"
          onClick={() => ask(false)}
          disabled={loading || !pantry.length}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-brand-600 text-white font-semibold disabled:opacity-60"
        >
          <ChefIcon className="w-5 h-5" />
          What can I cook?
        </button>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Or ask for a specific dish
          </p>
          <VoiceInput
            value={request}
            onChange={setRequest}
            placeholder="e.g. paneer butter masala"
          />
          <button
            type="button"
            onClick={() => ask(true)}
            disabled={loading || !request.trim()}
            className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-white border border-brand-600 text-brand-700 font-medium disabled:opacity-60"
          >
            <SparkIcon className="w-4 h-4" />
            Tell me what I'm missing
          </button>
        </div>
      </section>

      {loading && (
        <div className="text-center py-8 text-sm text-gray-600">
          <SparkIcon className="w-6 h-6 mx-auto mb-2 text-brand-600 animate-spin" />
          Cooking up ideas…
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {recipes && recipes.length === 0 && !loading && (
        <p className="text-center text-sm text-gray-500 py-6">
          Gemini didn't return any recipes. Try a different request.
        </p>
      )}

      {recipes?.map((r, ri) => (
        <article
          key={ri}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3"
        >
          <header className="space-y-1">
            <h2 className="text-lg font-semibold">{r.name}</h2>
            {(r.serves || r.time) && (
              <p className="text-xs text-gray-500">
                {[r.serves && `Serves ${r.serves}`, r.time].filter(Boolean).join(" · ")}
              </p>
            )}
            {r.summary && <p className="text-sm text-gray-700">{r.summary}</p>}
          </header>

          {r.have?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">
                You have
              </p>
              <ul className="text-sm space-y-0.5">
                {r.have.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-3">
                    <span>{i.name}</span>
                    {i.quantity && <span className="text-gray-500">{i.quantity}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {r.need?.length > 0 && (
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <p className="text-xs uppercase tracking-wide text-orange-700 font-semibold">
                  You need to buy
                </p>
                <button
                  type="button"
                  onClick={() => addAllNeeds(ri, r.need)}
                  className="text-xs text-brand-700 underline"
                >
                  Add all to shop
                </button>
              </div>
              <ul className="space-y-1">
                {r.need.map((i, idx) => {
                  const key = `${ri}:${idx}`;
                  const added = addedKeys[key];
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex-1">
                        {i.name}
                        {i.quantity && (
                          <span className="text-gray-500"> — {i.quantity}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => addNeed(ri, idx, i)}
                        disabled={added}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                          added
                            ? "bg-gray-100 text-gray-500"
                            : "bg-brand-100 text-brand-700 hover:bg-brand-100"
                        }`}
                      >
                        {added ? "Added" : (<><PlusIcon className="w-3 h-3" /> Shop</>)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {r.steps?.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-1">
                Steps
              </p>
              <ol className="text-sm space-y-1 list-decimal list-inside text-gray-800">
                {r.steps.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </article>
      ))}

      {recipes?.length > 0 && (
        <Link
          to="/shopping"
          className="block text-center py-3 text-brand-700 font-medium"
        >
          <CartIcon className="w-4 h-4 inline mr-1" />
          View shopping list
        </Link>
      )}
    </div>
  );
}
