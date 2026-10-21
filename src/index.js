#!/usr/bin/env node
/**
 * Export someone's public WhatsApp Business catalog to CSV.
 *
 * Usage:
 *   npm install
 *   npm start -- 919876543210
 *   npm start -- "https://wa.me/c/919876543210"
 *   npm start -- 919876543210 my-shop.csv
 *   npm run demo          (no WhatsApp needed - writes sample-output.csv)
 *
 * First run prints a QR code in the terminal. Scan it with the WhatsApp
 * you want to browse catalogs with (WhatsApp > Linked Devices), exactly
 * like WhatsApp Web. The login is saved in ./auth so you only scan once.
 * Use a spare/secondary number if you can - see README for the ban-risk note.
 */
import { writeFileSync } from 'node:fs';
import { parseTarget } from './parse.js';
import { productsToCsv } from './csv.js';

const arg = process.argv[2];

// ---------- demo mode: prove the CSV shape without a WhatsApp login ----------
if (arg === '--demo') {
  const demo = [
    {
      id: '8800123456789012', name: 'Cotton Kurti - Blue',
      description: 'Handloom cotton, sizes S-XXL.\nFree shipping over 999.',
      price: 499000, currency: 'INR', retailerId: 'KURTI-BLU-001',
      availability: 'in stock', isHidden: false,
      reviewStatus: { whatsapp: 'APPROVED' },
      imageUrls: { original: 'https://example.com/kurti.jpg' },
    },
    {
      id: '8800123456789013', name: 'Notebook, A5 (Pack of 3)',
      description: '200 pages, ruled', price: 199000, currency: 'INR',
      retailerId: 'NB-A5-3', availability: 'in stock', isHidden: false,
      reviewStatus: { whatsapp: 'APPROVED' },
      imageUrls: { original: 'https://example.com/notebook.jpg' },
    },
  ];
  writeFileSync('sample-output.csv', productsToCsv(demo, '919876543210'));
  console.log('Wrote sample-output.csv (2 demo products). This is the exact format a real export produces.');
  process.exit(0);
}

if (!arg) {
  console.error('Usage: npm start -- <phone number or wa.me/c/ link> [output.csv]');
  console.error('Example: npm start -- 919876543210');
  process.exit(1);
}

const { phone, jid } = parseTarget(arg);
const outFile = process.argv[3] || `catalog-${phone}.csv`;

// ---------- connect to WhatsApp (Baileys, QR pairing like WhatsApp Web) ----------
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } =
  await import('@whiskeysockets/baileys');
const { default: pino } = await import('pino');
const { default: qrcode } = await import('qrcode-terminal');

const { state, saveCreds } = await useMultiFileAuthState('auth');
let version;
try { ({ version } = await fetchLatestBaileysVersion()); } catch { /* fall back to bundled default */ }

const sock = makeWASocket({
  ...(version ? { version } : {}),
  auth: state,
  logger: pino({ level: 'silent' }),
  printQRInTerminal: false,
  browser: ['Catalog CSV Exporter', 'Chrome', '1.0.0'],
});
sock.ev.on('creds.update', saveCreds);

await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('Timed out waiting for connection (120s). Scan the QR code and try again.')), 120_000);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nScan this QR with WhatsApp > Linked Devices:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') { clearTimeout(timer); resolve(); }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        clearTimeout(timer);
        reject(new Error('Logged out. Delete the ./auth folder and run again to re-pair.'));
      }
    }
  });
});

console.log(`Connected. Checking ${phone} ...`);

// Is the number on WhatsApp / a business at all?
try {
  const [check] = await sock.onWhatsApp(phone);
  if (check && !check.exists) {
    console.error(`+${phone} is not on WhatsApp. Nothing to export.`);
    process.exit(1);
  }
} catch { /* check is best-effort; catalog fetch below is the real test */ }

// ---------- fetch every page of the catalog ----------
const all = [];
let cursor;
let page = 0;
do {
  const { products, nextPageCursor } = await sock.getCatalog({ jid, limit: 50, cursor });
  all.push(...products);
  cursor = nextPageCursor;
  page += 1;
  console.log(`Page ${page}: ${products.length} products (total ${all.length})`);
} while (cursor);

// Collections are optional metadata - tag each product with its collection name.
try {
  const { collections } = await sock.getCollections(jid, 50);
  const byId = new Map();
  for (const c of collections || []) for (const p of c.products || []) byId.set(p.id, c.name);
  for (const p of all) if (byId.has(p.id)) p._collection = byId.get(p.id);
} catch { /* a shop without collections still exports fine */ }

await sock.end();

if (all.length === 0) {
  console.log(`No products found. +${phone} either has no WhatsApp Business catalog, or has it hidden/empty.`);
  process.exit(0);
}

writeFileSync(outFile, productsToCsv(all, phone));
console.log(`\nDone: ${all.length} products -> ${outFile}`);
