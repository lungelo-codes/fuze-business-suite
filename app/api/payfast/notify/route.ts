import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { formDataToPayload, verifyPayFastSignature } from "@/lib/server/payfast";
import { getClientIp } from "@/lib/server/rateLimit";

/**
 * PayFast valid sender IP ranges (production + sandbox).
 * https://developers.payfast.co.za/docs#step_4_confirm_payment
 */
const PAYFAST_IP_RANGES = [
  // Production
  "197.221.208.",  // 197.221.208.0/24
  "197.221.209.",  // 197.221.209.0/24
  // Sandbox (for testing)
  "204.93.177.",
];

function isPayFastIp(ip: string): boolean {
  // Always allow in development
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.PAYFAST_SANDBOX === "true") return true;
  return PAYFAST_IP_RANGES.some((prefix) => ip.startsWith(prefix));
}

export async function POST(req: Request) {
  try {
    // 1. Verify sender IP is from PayFast
    const ip = getClientIp(req);
    if (!isPayFastIp(ip)) {
      console.warn(`[payfast/notify] Blocked request from unknown IP: ${ip}`);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = formDataToPayload(await req.formData());

    // 2. Verify PayFast HMAC signature
    if (!verifyPayFastSignature(payload)) {
      console.warn(`[payfast/notify] Invalid signature from ${ip}`);
      return NextResponse.json({ error: "Invalid PayFast signature" }, { status: 400 });
    }

    // 3. Only process completed payments
    if (payload.payment_status !== "COMPLETE") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const backend = await erpMethod("fuze_suite.api.saas.activate_subscription", {
      raw_payload: payload,
      m_payment_id: payload.m_payment_id,
      pf_payment_id: payload.pf_payment_id,
      amount_gross: payload.amount_gross,
      email_address: payload.email_address,
      payment_status: payload.payment_status,
    });

    return NextResponse.json({ ok: true, backend });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayFast notify failed" },
      { status: 500 }
    );
  }
}
