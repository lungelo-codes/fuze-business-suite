import crypto from "crypto";

export const VERIFY_COOKIE = "fuze_email_verify";

function secret(): string {
  return process.env.VERIFICATION_SECRET || process.env.NEXTAUTH_SECRET || process.env.ERPNEXT_API_SECRET || "fuze-dev-verification-secret";
}

export function createVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function signVerification(email: string, code: string, expiresAt: number): string {
  const raw = `${email.toLowerCase()}|${code}|${expiresAt}`;
  const sig = crypto.createHmac("sha256", secret()).update(raw).digest("hex");
  return Buffer.from(`${raw}|${sig}`).toString("base64url");
}

export function verifySignedCode(token: string | undefined, email: string, code: string): boolean {
  if (!token || !email || !code) return false;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [tokenEmail, tokenCode, expiresRaw, sig] = decoded.split("|");
    const expiresAt = Number(expiresRaw);
    if (!tokenEmail || !tokenCode || !expiresAt || !sig) return false;
    if (Date.now() > expiresAt) return false;
    if (tokenEmail.toLowerCase() !== email.toLowerCase()) return false;
    if (tokenCode !== code.trim()) return false;
    const expected = crypto
      .createHmac("sha256", secret())
      .update(`${tokenEmail}|${tokenCode}|${expiresAt}`)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}
