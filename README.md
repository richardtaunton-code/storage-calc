# Broadcast Storage Calculator — Deployment Guide

## Repository structure

```
/
├── index.html                          ← calculator (free + license-unlock)
├── netlify.toml                        ← Netlify build & header config
├── netlify/
│   └── functions/
│       └── verify-license.js           ← license validation serverless function
└── README.md
```

---

## 1. GitHub → Netlify deployment

1. Push this folder to your GitHub repo (or drag-drop into an existing one).
2. In Netlify → **Add new site** → **Import from Git** → connect your repo.
3. Build settings are auto-detected from `netlify.toml` — no changes needed.
4. Click **Deploy site**.

---

## 2. Environment variables (Netlify dashboard)

Go to **Site settings → Environment variables** and add:

| Variable | Value |
|---|---|
| `LEMON_SQUEEZY_API_KEY` | Your LS API key — **Settings → API** in LS dashboard |
| `LS_STORE_ID` | Your numeric store ID (visible in LS dashboard URL) |
| `LS_PRODUCT_ID` | Your product ID (optional — adds extra validation) |

After adding variables, **trigger a redeploy** (Deploys → Trigger deploy).

---

## 3. Lemon Squeezy — product setup

1. Create a product in your LS store (one-time purchase or subscription).
2. Under the product, note the **Variant ID** from the URL when editing it.
3. In `index.html`, replace `YOUR_VARIANT_ID` in this line:
   ```
   const UPGRADE_URL = 'https://nakedfilmco.lemonsqueezy.com/buy/YOUR_VARIANT_ID';
   ```
   Replace `nakedfilmco` with your actual LS store slug too.
4. In LS dashboard → **Settings → Webhooks**: optionally add a webhook to your
   Netlify function URL for real-time license events (advanced — not required).

---

## 4. Custom domain

In Netlify → **Domain management** → **Add custom domain**:
- e.g. `calc.nakedfilm.co.uk`
- Netlify auto-provisions an SSL certificate via Let's Encrypt.

Then update `netlify.toml` to include your domain in `frame-ancestors`:
```toml
Content-Security-Policy = "frame-ancestors 'self' *.framer.com *.framer.app *.nakedfilm.co.uk"
```

---

## 5. Framer embed

1. In Framer, create a new page (e.g. `/calculator`).
2. Add an **Embed** component — set the URL to your deployed Netlify URL.
3. Set the embed height to `100vh` or a fixed `900px`.
4. Set the Framer page background to `#000000` to match the calculator.
5. Disable Framer's default header/nav on that page for a seamless embed.

> **Note:** The `Content-Security-Policy` header in `netlify.toml` includes
> `*.framer.com` and `*.framer.app` — this allows Framer to embed the calculator
> in an iframe. If you publish on a custom Framer domain, add it to that list.

---

## 6. How the license flow works

```
User hits locked feature
        ↓
showUpgradePrompt() modal appears
        ↓
  ┌─────────────────┐     ┌──────────────────────────────┐
  │ "Buy" button    │ OR  │ Enter license key + Activate  │
  └────────┬────────┘     └──────────────┬───────────────┘
           │                             │
           ↓                             ↓
  Opens Lemon Squeezy         POST /.netlify/functions/
  checkout in new tab          verify-license
                                         │
                               LS API validates key
                                         │
                            ┌────────────┴───────────┐
                            │ valid                  │ invalid
                            ↓                        ↓
                   localStorage.setItem()     Show error message
                   page.reload()
                            ↓
                   FREE_TIER = false (unlocked)
                   Full calculator available
```

The license key is stored in `localStorage`. On every page load, if a saved
key exists, it is silently re-validated against the Netlify function. If the
key has been revoked or expired, it is removed and the user returns to free tier.

---

## 7. Testing locally

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Create a local .env file (never commit this)
echo "LEMON_SQUEEZY_API_KEY=your_key_here" > .env
echo "LS_STORE_ID=12345" >> .env
echo "LS_PRODUCT_ID=67890" >> .env

# Run locally with functions
netlify dev
# → opens http://localhost:8888
```

To test the license flow locally without a real key, temporarily set
`FREE_TIER = false` at the top of the init block in `index.html`.
