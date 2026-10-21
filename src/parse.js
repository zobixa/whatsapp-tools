// Parse a phone number or WhatsApp catalog link into digits + JID.
// Accepts: 919876543210 | +91 98765 43210 | https://wa.me/c/919876543210
//          https://wa.me/919876543210 | https://wa.me/p/<productId>/919876543210
export function parseTarget(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('Give a phone number or a wa.me catalog link.');
  }
  let s = input.trim();

  // wa.me/p/<productId>/<phone> -> phone is the LAST path segment
  let m = s.match(/wa\.me\/p\/[^/]+\/(\d+)/i);
  if (m) return toTarget(m[1]);

  // wa.me/c/<phone> or wa.me/<phone>
  m = s.match(/wa\.me\/(?:c\/)?(\d+)/i);
  if (m) return toTarget(m[1]);

  // whatsapp.com/catalog/<phone> style links
  m = s.match(/catalog\/(\d+)/i);
  if (m) return toTarget(m[1]);

  // Plain number, possibly with +, spaces, dashes
  const digits = s.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    throw new Error(`"${input}" doesn't look like a full international number. Use country code + number, e.g. 919876543210 (no leading 0, no +).`);
  }
  return toTarget(digits);
}

function toTarget(phone) {
  return { phone, jid: `${phone}@s.whatsapp.net` };
}
