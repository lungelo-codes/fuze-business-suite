import crypto from "crypto";

export interface PayFastPayload {
  [key: string]: string;
}

function encodePayFastValue(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, "+");
}

export function buildPayFastSignature(data: PayFastPayload, passphrase?: string): string {
  const keys = Object.keys(data).filter((key) => key !== "signature" && data[key] !== "").sort();
  const query = keys.map((key) => `${key}=${encodePayFastValue(data[key])}`).join("&");
  const finalQuery = passphrase ? `${query}&passphrase=${encodePayFastValue(passphrase)}` : query;
  return crypto.createHash("md5").update(finalQuery).digest("hex");
}

export function formDataToPayload(formData: FormData): PayFastPayload {
  const payload: PayFastPayload = {};
  formData.forEach((value, key) => {
    payload[key] = String(value);
  });
  return payload;
}

export function verifyPayFastSignature(payload: PayFastPayload): boolean {
  if (!payload.signature) return false;
  return buildPayFastSignature(payload, process.env.PAYFAST_PASSPHRASE) === payload.signature;
}
