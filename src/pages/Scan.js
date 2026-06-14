import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import BarcodeScanner from "../components/BarcodeScanner";
import VoiceInput from "../components/VoiceInput";
import OcrCapture from "../components/OcrCapture";
import { getProductByBarcode, saveProduct } from "../db/productsRepo";
import { lookupByBarcode } from "../api/openFoodFacts";
import { SparkIcon, ScanIcon, PlusIcon } from "../components/icons";

const STEP = {
  SCANNING: "scanning",
  LOOKING_UP: "looking_up",
  REGISTER: "register",
  ERROR: "error",
};

export default function Scan() {
  const navigate = useNavigate();
  const [step, setStep] = useState(STEP.SCANNING);
  const [barcode, setBarcode] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    brand: "",
    category: "",
    imageUrl: "",
    source: "manual",
  });
  const [error, setError] = useState(null);
  const [info, setInfo] = useState("");

  const handleDetected = useCallback(async (code) => {
    const clean = String(code || "").trim();
    if (!clean) return;
    setBarcode(clean);
    setError(null);
    setInfo("");
    setStep(STEP.LOOKING_UP);

    try {
      const existing = await getProductByBarcode(clean);
      if (existing) {
        navigate(`/pantry/add/${existing.id}`);
        return;
      }

      let off = null;
      try {
        off = await lookupByBarcode(clean);
      } catch (e) {
        setInfo("Couldn't reach OpenFoodFacts — fill the details manually.");
      }

      if (off && off.name) {
        const saved = await saveProduct({ ...off });
        navigate(`/pantry/add/${saved.id}`);
        return;
      }

      // Unknown product → manual register
      setDraft({
        name: off?.name || "",
        brand: off?.brand || "",
        category: off?.category || "",
        imageUrl: off?.imageUrl || "",
        source: off ? "openfoodfacts" : "manual",
      });
      if (!info) setInfo("Not in OpenFoodFacts. Register it once and we'll remember it.");
      setStep(STEP.REGISTER);
    } catch (e) {
      setError(e.message || "Lookup failed");
      setStep(STEP.ERROR);
    }
  }, [navigate, info]);

  const submitRegister = async (e) => {
    e.preventDefault();
    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    const saved = await saveProduct({ ...draft, barcode });
    navigate(`/pantry/add/${saved.id}`);
  };

  return (
    <div className="h-full flex flex-col">
      {step === STEP.SCANNING && (
        <>
          <div className="flex-1 min-h-0">
            <BarcodeScanner
              onDetected={handleDetected}
              onCancel={() => navigate("/")}
            />
          </div>
          <div className="p-3 bg-white border-t border-gray-100 text-center text-xs text-gray-500">
            Point camera at any barcode (EAN/UPC/QR). Or type the number above.
          </div>
        </>
      )}

      {step === STEP.LOOKING_UP && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
          <SparkIcon className="w-8 h-8 text-brand-600 animate-spin" />
          <p className="text-sm text-gray-600">Looking up #{barcode}…</p>
        </div>
      )}

      {step === STEP.REGISTER && (
        <form onSubmit={submitRegister} className="p-4 max-w-md w-full mx-auto space-y-4">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold">Register product</h2>
            <p className="text-xs text-gray-500">Barcode #{barcode || "(manual entry)"}</p>
            {info && <p className="text-xs text-amber-700">{info}</p>}
          </header>

          {draft.imageUrl && (
            <img
              src={draft.imageUrl}
              alt=""
              className="w-24 h-24 rounded-lg object-cover bg-gray-100 mx-auto"
            />
          )}

          <label className="block">
            <span className="text-xs text-gray-500">Name *</span>
            <VoiceInput
              value={draft.name}
              onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
              placeholder="e.g. Tata Salt 1kg"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Brand</span>
            <VoiceInput
              value={draft.brand}
              onChange={(v) => setDraft((d) => ({ ...d, brand: v }))}
              placeholder="e.g. Tata"
            />
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Category</span>
            <VoiceInput
              value={draft.category}
              onChange={(v) => setDraft((d) => ({ ...d, category: v }))}
              placeholder="e.g. Spices"
            />
          </label>

          <OcrCapture
            mode="label"
            label="Scan label to fill name (optional)"
            onResult={({ text }) => {
              if (!text) return;
              const firstLine = text.split("\n").map((s) => s.trim()).filter(Boolean)[0];
              if (firstLine && !draft.name) {
                setDraft((d) => ({ ...d, name: firstLine.slice(0, 60) }));
              } else {
                // show full text so user can copy
                alert("OCR result:\n\n" + text.slice(0, 400));
              }
            }}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 py-3 rounded-lg bg-brand-600 text-white font-semibold inline-flex items-center justify-center gap-1"
            >
              <PlusIcon className="w-4 h-4" /> Save & set expiry
            </button>
            <button
              type="button"
              onClick={() => setStep(STEP.SCANNING)}
              className="px-4 py-3 rounded-lg bg-gray-100 text-gray-700 inline-flex items-center gap-1"
            >
              <ScanIcon className="w-4 h-4" /> Re-scan
            </button>
          </div>
        </form>
      )}

      {step === STEP.ERROR && (
        <div className="p-6 text-center space-y-3">
          <p className="text-red-700 font-medium">Something went wrong</p>
          <p className="text-sm text-gray-600">{error}</p>
          <button
            onClick={() => setStep(STEP.SCANNING)}
            className="px-4 py-2 rounded bg-brand-600 text-white"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
