import { getSetting } from "../db/settingsRepo";

const DEFAULT_MODEL = "gemini-2.0-flash";
const endpoint = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

export async function getApiKey() {
  return await getSetting("geminiApiKey");
}

async function callGemini({ prompt, schema, model = DEFAULT_MODEL }) {
  const key = await getApiKey();
  if (!key) throw new Error("Set your Gemini API key in Settings.");

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };
  if (schema) {
    body.generationConfig = {
      responseMimeType: "application/json",
      responseSchema: schema,
    };
  }

  const res = await fetch(endpoint(model, key), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const j = await res.json();
      detail = j?.error?.message || JSON.stringify(j);
    } catch {
      detail = await res.text();
    }
    throw new Error(`Gemini ${res.status}: ${detail || res.statusText}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return text;
}

const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    recipes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          summary: { type: "string" },
          serves: { type: "string" },
          time: { type: "string" },
          have: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
              },
              required: ["name"],
            },
          },
          need: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
              },
              required: ["name"],
            },
          },
          steps: { type: "array", items: { type: "string" } },
        },
        required: ["name", "have", "need", "steps"],
      },
    },
  },
  required: ["recipes"],
};

function pantryToLines(items) {
  if (!items.length) return "(pantry is empty)";
  return items
    .map((it) => {
      const name = it.product?.name || "(unnamed)";
      const qty = it.quantity ? ` — ${it.quantity} ${it.unit || ""}`.trim() : "";
      const exp = it.expiryDate ? `, exp ${it.expiryDate}` : "";
      return `- ${name}${qty}${exp}`;
    })
    .join("\n");
}

export async function suggestRecipes({ pantry, request }) {
  const pantryStr = pantryToLines(pantry);
  const prompt = request
    ? `The user wants to cook: "${request}".
They have these pantry items (and only these, plus typical kitchen staples like salt, pepper, oil, water):
${pantryStr}

For up to 3 close variants of this dish, tell them what they already HAVE that can be used and what they NEED to buy. Be honest about missing items. Steps should be concise.`
    : `Suggest 3 simple recipes the user can cook now using mainly these pantry items (assume they have basic staples: salt, pepper, oil, water).

${pantryStr}

For each recipe, list what they already HAVE from the pantry and what extra they'd NEED to buy. Prefer recipes that use items expiring soon.`;

  const raw = await callGemini({ prompt, schema: RECIPE_SCHEMA });
  try {
    return JSON.parse(raw);
  } catch (e) {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Could not parse Gemini response");
  }
}

export async function quickChat({ prompt }) {
  return callGemini({ prompt });
}
