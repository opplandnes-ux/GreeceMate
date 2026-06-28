const TOKEN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createOrderId(): string {
  return `ord_${crypto.randomUUID()}`;
}

export function createOrderNumber(now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = new Uint8Array(6);
  crypto.getRandomValues(random);
  const suffix = Array.from(random, (byte) => TOKEN_ALPHABET[byte % TOKEN_ALPHABET.length]).join("");
  return `GM-${date}-${suffix}`;
}

export async function deriveOrderViewToken(orderId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`greecemate-order-view:${orderId}`),
  );
  return `ovt_${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

