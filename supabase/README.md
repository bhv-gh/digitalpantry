# Supabase backend

Cloud-sync the pantry across devices. Set this up once on supabase.com, send me back three things, and I'll wire the JS client into the app.

## What you do (≈ 10 min, free tier)

### 1. Create the project
- Go to https://supabase.com → sign in → **New project**
- Name: anything (e.g. `digital-pantry`)
- DB password: pick anything; you won't need it day-to-day
- Region: pick whichever is closest

### 2. Run the schema
- Open **SQL Editor → New query**
- Paste the entire contents of [`schema.sql`](./schema.sql)
- Click **Run**
- Expect "Success. No rows returned." in ~1 sec.

### 3. Enable an auth method (pick one)

| Method | Setup | Day-to-day login |
| --- | --- | --- |
| **Google OAuth** (recommended for mobile) | Auth → Providers → enable Google. Supabase has a built-in OAuth client — no Google Cloud setup needed. Then Auth → URL Configuration → set **Site URL** to `https://bhv-gh.github.io/digitalpantry/` and add the same to **Redirect URLs**. | One tap, no password. |
| **Magic link** (email) | Auth → Providers → ensure Email is on. Default rate-limited Supabase mailer is fine for personal use. | Type email → check inbox → click link. No password. |
| **Email + password** | Auth → Providers → Email is on by default. | Sign in once per device. |

You can enable more than one.

### 4. Send me back
1. **Project URL** — looks like `https://abcdefghijklmn.supabase.co` (Project Settings → API → Project URL)
2. **`anon` public key** (Project Settings → API → Project API keys → row labeled `anon` `public` — click the eye icon, then copy)
3. **Which auth method(s)** you enabled

The `anon` key is *designed* to live in browsers — the RLS policies above guarantee one user can't read another user's rows. Safe to commit.

## What I'll do once you send those

- Add `@supabase/supabase-js` dependency
- Create `src/db/supabase/` with drop-in repos that match the existing IndexedDB API — same function signatures, so the pages don't change
- Add a Sign-in screen that gates the app
- Add a one-time **"Upload my local pantry to the cloud"** button so your existing on-device data migrates up
- Add a Settings toggle for **Local-only** vs **Cloud-sync** so you can still go offline
- Optionally: subscribe to realtime changes so a scan on phone shows on laptop instantly

## Notes / decisions baked into the schema

- `user_id` references `auth.users(id) on delete cascade` — deleting your account wipes all your data.
- `products.barcode` is **not** unique globally; it's unique-ish per user (same barcode could exist for two users). The barcode index includes `user_id` so lookups stay fast.
- Quantities are `numeric` (supports 0.5 kg etc).
- Expiry is `date` not `timestamptz` — pantry items don't care about timezones.
- Shopping items can reference a product (`product_id` nullable, `set null` on delete) so reorder-from-pantry links keep working even after a product is later removed.
- `updated_at` auto-bumps on `products` only (the others are append-mostly). Easy to add to others if needed.
- Settings (Gemini key, Sheets URL) stay in IndexedDB by design — they're device-secret. Easy to flip if you want them synced.
