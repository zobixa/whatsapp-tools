# WhatsApp Catalog -> CSV Exporter

Export any public WhatsApp Business catalog as a CSV file:
product name, description, price, currency, SKU, availability, image URL,
product link, and collection - one row per product.

## The honest part first (read this before building a website on it)

WhatsApp has **no public, no-login catalog API**. A business catalog
(`wa.me/c/<number>`) only opens inside WhatsApp. So there are exactly two ways
to get the data:

| Route | Works for | Login needed | Risk |
|---|---|---|---|
| **This tool (Baileys)** | Anyone's public catalog | Pair *your* WhatsApp by QR, like WhatsApp Web | Unofficial client. Against WhatsApp ToS, low-volume personal use rarely causes trouble, but the paired number *can* be banned. Use a spare number. |
| **Official Graph API** (`src/graph.js`) | Only catalogs **you** own | Meta access token | None. Safe, but can't fetch a competitor's/stranger's catalog. |

That means a public web tool where a stranger pastes a number and instantly
gets a CSV is **not possible** with a free / official method - any site offering
it is running paired WhatsApp accounts behind the scenes and rotating them when
they get banned. For your own use, or as a downloadable/desktop tool, the
Baileys route below works fine.

## Run it

```bash
npm install
npm start -- 919876543210
npm start -- "https://wa.me/c/919876543210"
npm start -- 919876543210 my-shop.csv
```

- Number must be full international format: country code + number, no `+`, no leading 0.
- First run prints a QR code in the terminal. Scan it with
  WhatsApp > Linked Devices. Login is saved in `./auth` - you only scan once.
- Output: `catalog-<number>.csv` in this folder.

No WhatsApp handy? See the exact output format first:

```bash
npm run demo   # writes sample-output.csv with 2 demo products
```

## Your own catalog (official, no QR)

```bash
GRAPH_ACCESS_TOKEN=xxxx npm run graph -- <CATALOG_ID>
```

## CSV columns

`product_id, name, description, price, price_raw, currency, sku_retailer_id, availability, is_hidden, review_status, image_url, product_url, collection`

- `price` = `price_raw / 1000`, formatted to 2 decimals. WhatsApp's catalog
  protocol stores price as an integer scaled x1000 (499000 = 499.00).
  `price_raw` keeps the exact value WhatsApp sent - check it against a product
  whose price you know on your first live run.
- `product_url` = the product's own link if WhatsApp gave one, otherwise
  rebuilt as `https://wa.me/p/<product_id>/<number>`.
- The file starts with a UTF-8 BOM so Excel opens names/emoji correctly.

## Notes / limits

- An empty result means: no Business account, no catalog, or catalog is empty/hidden.
  It is not a crash - the tool says so and exits cleanly.
- Fetching is paginated (50/page) and fetches the *whole* catalog.
- Image URLs are WhatsApp CDN links and can expire - download images promptly
  if you need them permanently.
- Keep volume low: one catalog at a time, don't loop over hundreds of numbers.
  That's what gets paired numbers banned.

## Not tested live here

The CSV converter and input parsing are tested (see `npm run demo`).
The live fetch itself needs *your* WhatsApp to pair, so do one test run
against a shop whose prices you know and confirm `price` + one
`product_url` open correctly before relying on it.
