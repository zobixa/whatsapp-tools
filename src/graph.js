#!/usr/bin/env node
/**
 * OFFICIAL route - export YOUR OWN catalog via the Meta Graph API.
 * No QR pairing, no ban risk. Only works for catalogs you own/manage.
 *
 * Setup: create an app at developers.facebook.com, get a token with
 * catalog_management / business_management permission for your catalog.
 *
 * Usage:
 *   GRAPH_ACCESS_TOKEN=xxxx npm run graph -- <CATALOG_ID> [output.csv]
 */
import { writeFileSync } from 'node:fs';
import { productsToCsv } from './csv.js';

const catalogId = process.argv[2];
const outFile = process.argv[3] || `catalog-${catalogId}.csv`;
const token = process.env.GRAPH_ACCESS_TOKEN;

if (!catalogId || !token) {
  console.error('Usage: GRAPH_ACCESS_TOKEN=xxxx npm run graph -- <CATALOG_ID> [output.csv]');
  process.exit(1);
}

const fields = 'id,name,description,price,currency,retailer_id,url,image_url,availability,inventory_count';
let url = `https://graph.facebook.com/v21.0/${catalogId}/products?fields=${fields}&limit=100&access_token=${encodeURIComponent(token)}`;
const raw = [];

while (url) {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    console.error('Graph API error:', JSON.stringify(json.error || json));
    process.exit(1);
  }
  for (const d of json.data || []) {
    raw.push({
      id: d.id,
      name: d.name,
      description: d.description,
      // Graph API returns price as a formatted string like "499.00".
      // Scale to the same raw convention productsToCsv expects.
      price: d.price ? Math.round(parseFloat(d.price) * 1000) : '',
      currency: d.currency || '',
      retailerId: d.retailer_id || '',
      url: d.url || '',
      imageUrls: d.image_url ? { original: d.image_url } : {},
      availability: d.availability || '',
    });
  }
  url = json.paging?.next || null;
}

writeFileSync(outFile, productsToCsv(raw, ''));
console.log(`Done: ${raw.length} products -> ${outFile}`);
