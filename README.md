# Pantry Digitiser

A mobile-first PWA to scan groceries into a digital pantry, get recipe ideas from Gemini, and manage a shopping list. Works fully offline (data lives in IndexedDB); ready to swap to Supabase later via the repository layer in `src/db/`.

## Features

- **Barcode scanner** (EAN / UPC / QR) via camera, powered by ZXing through `html5-qrcode`
- **OpenFoodFacts lookup** — auto-fills product name / brand / image from the global database
- **Quick manual register** for products not in OFF; remembered for next time
- **Add to pantry** with quantity, unit, location, and expiry date (date picker or OCR)
- **Pantry view** sorted by expiry, with colour-coded urgency, quick qty +/-, and "add to shop" on each item
- **Shopping list** with manual add (voice-to-text), check-off, and bulk clear
- **Voice input** on most text fields (Web Speech API — Chrome / Safari)
- **OCR** for expiry dates and label-to-name (lazy-loaded Tesseract.js, optional)
- **Gemini recipes** — "what can I cook with what I have?" and "I want to cook X — what's missing?"; one-tap add missing ingredients to the shopping list
- **PWA**: installable, offline shell

## Running locally

```
npm install
npm start          # http://localhost:3000
```

`localhost` is treated as a secure context, so camera and mic both work.

To test from your **phone** on the same Wi-Fi (camera/mic need HTTPS off-localhost):

```
npm run start:https
# accept the self-signed cert on the phone, then open:
# https://<your-laptop-LAN-IP>:3000
```

Or expose via a tunnel (no cert juggling):

```
npx cloudflared tunnel --url http://localhost:3000
# or
ngrok http 3000
```

## Production build

```
npm run build
npx serve -s build
```

Deploy `/build` to any static host (Netlify / Vercel / Cloudflare Pages / GitHub Pages) over HTTPS.

## Backup

Cloud backup runs against a hardcoded Google Apps Script web-app URL
(`src/lib/sheetsSync.js → SHEETS_URL`) bound to a single Google Sheet.

- **On every app load**, a modal asks "Restore from cloud backup?" — tap *Yes,
  restore* to replace local data with the sheet contents, *No* to keep local.
- **Auto-backup** pushes the local pantry to the sheet every 5 minutes (and once
  on app load, after the restore prompt is dismissed). Toggle in Settings →
  Cloud backup. Status and last-backup time are shown there too.
- **Manual Test / Push / Pull** buttons in Settings → Cloud backup for ad-hoc use.
- **JSON file** fallback under Settings → Backup file. Download a snapshot to keep
  anywhere (Drive, iCloud, email to self) and import it back from any device.

To rotate the Apps Script deployment, paste the new `/exec` URL into `SHEETS_URL`
and redeploy. The script source lives in git history (last seen at
`src/lib/appsScriptSource.js` before the URL was hardcoded).

## Gemini setup

1. Get a key at https://aistudio.google.com/app/apikey
2. Open the app, tap the gear icon → paste your key → Save.
3. Recipes page can now suggest meals.

The key is stored in this browser's IndexedDB and only ever sent to Google's Gemini API.

## Project layout

```
src/
  api/
    openFoodFacts.js   Barcode → product lookup
    gemini.js          Recipe generation (JSON schema)
  components/
    AppLayout.js       Header + bottom-nav shell
    BarcodeScanner.js  Camera + barcode capture + manual fallback
    MicButton.js       Reusable voice-input button
    VoiceInput.js      Text input + mic
    OcrCapture.js      Lazy-loaded Tesseract for label / expiry
    icons.js           Inline SVG icon set
  db/
    schema.js          IndexedDB open / migrations / uid()
    productsRepo.js    Reusable product catalog
    pantryRepo.js      Pantry items
    shoppingRepo.js    Shopping list
    settingsRepo.js    Key-value settings (Gemini API key, …)
  hooks/
    useSpeechToText.js
  lib/
    date.js            Expiry helpers
    ocr.js             Tesseract + date heuristics
    backup.js          JSON/CSV serialise + import logic
    sheetsSync.js      Talks to the hardcoded Apps Script web-app
  pages/
    Home.js, Scan.js, Pantry.js, AddPantryItem.js,
    Shopping.js, Recipes.js, Settings.js
  App.js               Router
  index.js             Entry + SW registration
public/
  manifest.json
  service-worker.js    Network-first app shell cache
```

## Swapping IndexedDB for Supabase later

All persistence flows through `src/db/*Repo.js` plus `schema.js`. Each repo exposes a small async API (`list…`, `add…`, `update…`, `delete…`). Replace those with Supabase calls and the rest of the app is unchanged.
