// Convert Baileys / Graph API products into an RFC-4180 CSV string.

const COLUMNS = [
  'product_id',
  'name',
  'description',
  'price',
  'price_raw',
  'currency',
  'sku_retailer_id',
  'availability',
  'is_hidden',
  'review_status',
  'image_url',
  'product_url',
  'collection',
];

function esc(value) {
  const s = value === undefined || value === null ? '' : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function productsToCsv(products, phone = '') {
  const lines = [COLUMNS.join(',')];
  for (const p of products) {
    // WhatsApp returns price as an integer scaled x1000 in the catalog
    // protocol (e.g. 499000 = 499.00). price_raw keeps the exact value
    // WhatsApp sent, so nothing is lost if a region differs.
    const raw = typeof p.price === 'number' ? p.price : '';
    const price = raw === '' ? '' : (raw / 1000).toFixed(2);

    const imageUrl =
      p.imageUrls?.original || p.imageUrls?.requested ||
      Object.values(p.imageUrls || {})[0] || p.imageUrl || p.image_url || '';

    const productUrl =
      p.url || (phone && p.id ? `https://wa.me/p/${p.id}/${phone}` : '');

    const row = {
      product_id: p.id || '',
      name: p.name || '',
      description: p.description || '',
      price,
      price_raw: raw,
      currency: p.currency || '',
      sku_retailer_id: p.retailerId || p.retailer_id || '',
      availability: p.availability || '',
      is_hidden: p.isHidden ?? p.is_hidden ?? '',
      review_status: p.reviewStatus?.whatsapp || p.review_status || '',
      image_url: imageUrl,
      product_url: productUrl,
      collection: p._collection || '',
    };
    lines.push(COLUMNS.map((c) => esc(row[c])).join(','));
  }
  // BOM so Excel opens UTF-8 (prices, emoji, non-English names) correctly
  return '﻿' + lines.join('\r\n') + '\r\n';
}
