# YUNIX Backend Export → Import Guide

Complete export of the YUNIX Lovable Cloud backend, ready to import into your own
Supabase project at **`https://ounphbavkyrmotskydto.supabase.co`**.

> ⚠️ YUNIX continues to run on Lovable Cloud. This bundle is a one-time copy — the
> two backends will not stay in sync afterwards.

---

## 📦 Bundle contents

```
yunix_export/
├── README.md                  ← you are here
├── database/
│   ├── 01_schema.sql          ← tables, enums, functions, triggers, RLS (5,018 lines)
│   └── 02_data.sql            ← INSERT statements for all rows (77,831 lines)
├── storage/                   ← 321 files, ~50 MB
│   ├── broadcast-images/      (11 files)
│   ├── certificates/          (24 files)
│   ├── course-thumbnails/     (3 files)
│   ├── payout-certificates/   (2 files)
│   └── prop-firm-screenshots/ (281 files)
├── edge-functions/functions/  ← 30 edge functions (source code)
├── auth/
│   └── users.csv              ← 47 user profiles (id, email, name, …) — NO passwords
└── config/
    ├── config.toml            ← per-function verify_jwt settings
    └── required-secrets.txt   ← list of secret names you must re-create
```

---

## 🚀 Import steps (in order)

### 0. Prerequisites

```bash
# Install Supabase CLI if you don't have it
npm i -g supabase

# Get your target DB URL from:
#   https://supabase.com/dashboard/project/ounphbavkyrmotskydto/settings/database
# Look for "Connection string" → URI. It will look like:
export TARGET_DB="postgresql://postgres.ounphbavkyrmotskydto:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres"
export TARGET_REF="ounphbavkyrmotskydto"
```

### 1. Restore the database schema

```bash
psql "$TARGET_DB" -f database/01_schema.sql
```

This creates every table, enum, function, trigger, and RLS policy in the `public` schema.

> If you see warnings about `auth.users` foreign keys — that's fine. The handle_new_user
> trigger references `auth.users` which already exists in your target project.

### 2. Restore the data

```bash
psql "$TARGET_DB" -f database/02_data.sql
```

> ⚠️ Rows referencing `user_id` will only be useful **after** the corresponding auth
> users exist. Either:
>   - Re-create users with the **same UUIDs** (see step 5), or
>   - Have users sign up fresh; the old data will be orphaned.

### 3. Re-create the 5 storage buckets

Run this SQL in your target project's SQL editor:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('prop-firm-screenshots', 'prop-firm-screenshots', true),
  ('certificates',          'certificates',          true),
  ('course-thumbnails',     'course-thumbnails',     true),
  ('broadcast-images',      'broadcast-images',      true),
  ('payout-certificates',   'payout-certificates',   true);
```

Then add basic policies (adjust as needed):

```sql
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (true);
CREATE POLICY "Authenticated upload" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (true);
```

### 4. Upload all storage files

Easiest: use the included Python script.

```bash
# Get a service role key from:
#   https://supabase.com/dashboard/project/ounphbavkyrmotskydto/settings/api
export TARGET_URL="https://ounphbavkyrmotskydto.supabase.co"
export TARGET_SERVICE_KEY="eyJhbGciOi..."   # service_role key

python3 - << 'PY'
import os, mimetypes, urllib.request, urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

BASE = os.environ["TARGET_URL"] + "/storage/v1/object"
KEY  = os.environ["TARGET_SERVICE_KEY"]
ROOT = Path("storage")

def upload(p: Path):
    bucket = p.parts[1]
    key = "/".join(p.parts[2:])
    encoded = "/".join(urllib.parse.quote(s) for s in key.split("/"))
    url = f"{BASE}/{bucket}/{encoded}"
    ct  = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
    data = p.read_bytes()
    req = urllib.request.Request(url, data=data, method="POST", headers={
        "Authorization": f"Bearer {KEY}",
        "Content-Type": ct,
        "x-upsert": "true",
    })
    try:
        urllib.request.urlopen(req).read()
        return True
    except Exception as e:
        print(f"FAIL {key}: {e}")
        return False

files = [p for p in ROOT.rglob("*") if p.is_file()]
with ThreadPoolExecutor(20) as ex:
    ok = sum(ex.map(upload, files))
print(f"Uploaded {ok}/{len(files)}")
PY
```

### 5. Auth users (passwords cannot be migrated)

`auth/users.csv` has 47 user profiles (id, email, name, …) but **no passwords**
— Supabase stores those as bcrypt hashes you can't extract via SQL.

You have two options:

**Option A — Re-create with same UUIDs (preserves all FK relationships):**

```bash
# For each row in auth/users.csv, use Supabase Admin API to invite the user.
# They'll receive a "Set your password" email and keep their old UUID.
# Example for one user:
curl -X POST "$TARGET_URL/auth/v1/admin/users" \
  -H "Authorization: Bearer $TARGET_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"<uuid-from-csv>","email":"<email>","email_confirm":true}'
```

**Option B — Let users sign up fresh:** all old `user_id` references will be orphaned.
The handle_new_user trigger (already in `01_schema.sql`) will auto-create new profile rows.

### 6. Deploy the edge functions

```bash
# Login to Supabase CLI
supabase login

# Link to your target project
cd edge-functions
supabase link --project-ref $TARGET_REF

# Deploy each function
for fn in functions/*/; do
  name=$(basename "$fn")
  echo "Deploying $name..."
  supabase functions deploy "$name" --project-ref $TARGET_REF --no-verify-jwt
done
```

> Per-function `verify_jwt` settings are in `config/config.toml` — apply them after deploy
> via dashboard or by copying the `[functions.*]` blocks into your `supabase/config.toml`.

### 7. Re-create secrets

See `config/required-secrets.txt`. In your target project:
**Settings → Edge Functions → Secrets** — add each one.

> ⚠️ **`LOVABLE_API_KEY` won't work outside Lovable.** Replace AI calls with your own
> OpenAI / Gemini / Anthropic API key. The affected functions are:
> `chat`, `ai-support-chat`, `analyze-chart`, `extract-trade`, `screenshot-parser`,
> `trade-plan-ai`, `trader-assist-ai`.

### 8. Reconfigure auth providers

Go to **Authentication → Providers** in your target dashboard:
- Enable Email + Password (and HIBP check if desired)
- Re-add Google OAuth (you'll need to create a new OAuth client in Google Cloud
  Console with the new project's callback URL: `https://ounphbavkyrmotskydto.supabase.co/auth/v1/callback`)
- Re-configure email templates (Auth → Email Templates)

### 9. Update the frontend (if you fork the YUNIX app)

If you also clone the YUNIX frontend code to point at the new project, update `.env`:

```
VITE_SUPABASE_URL="https://ounphbavkyrmotskydto.supabase.co"
VITE_SUPABASE_PROJECT_ID="ounphbavkyrmotskydto"
VITE_SUPABASE_PUBLISHABLE_KEY="<your new anon key>"
```

---

## 📊 Export summary

| Item | Count |
|---|---|
| Database tables | ~40 |
| Database rows (data SQL lines) | ~78,000 |
| Auth user profiles | 47 |
| Storage files | 321 (~50 MB) |
| Edge functions | 30 |

## ❓ Troubleshooting

- **`relation "auth.users" does not exist`** while running `01_schema.sql`: you're
  probably running it against a non-Supabase Postgres. Use a real Supabase project.
- **FK violations** on `02_data.sql`: ensure you didn't skip the schema step, and that
  user UUIDs exist in `auth.users` (re-create them first).
- **Edge function 401 errors**: secrets not configured (see step 7), or auth.uid() is
  null because users haven't been migrated yet.

Generated: 2026-04-19 from `bduwtkejrfmcggfwniqe.supabase.co` (YUNIX Lovable Cloud).
