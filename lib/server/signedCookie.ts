/**
 * Signs and verifies cookie values with HMAC-SHA256.
 * Prevents clients from editing cookies like fuze_modules to unlock paid modules.
 */
import crypto from "crypto";

function secret(): string {
  return (
    process.env.COOKIE_SIGNING_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ERPNEXT_API_SECRET ||
    "fuze-dev-cookie-secret-change-in-production"
  );
}

/** Returns "value.hmac" */
export function signValue(value: string): string {
  const sig = crypto.createHmac("sha256", secret()).update(value).digest("base64url");
  return `${value}.${sig}`;
}

/** Returns the original value if valid, null if tampered or missing */
export function unsignValue(signed: string | undefined): string | null {
  if (!signed) return null;
  const lastDot = signed.lastIndexOf(".");
  if (lastDot === -1) return null;
  const value = signed.slice(0, lastDot);
  const sig = signed.slice(lastDot + 1);
  const expected = crypto.createHmac("sha256", secret()).update(value).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }
  return value;
}
