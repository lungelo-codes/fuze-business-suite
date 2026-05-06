import { NextResponse } from "next/server";
import { buildPayFastSignature } from "@/lib/server/payfast";
import { PLANS } from "@/lib/modules";

const PAYFAST_URL = process.env.PAYFAST_SANDBOX === "true"
  ? "https://sandbox.payfast.co.za/eng/process"
  : "https://www.payfast.co.za/eng/process";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      planId?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      tenantId?: string;
    };

    const { planId, email, firstName, lastName, tenantId } = body;
    if (!planId || !email) {
      return NextResponse.json({ error: "planId and email are required" }, { status: 400 });
    }

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan.price === 0) {
      return NextResponse.json({ error: "Free plan does not require payment" }, { status: 400 });
    }

    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    if (!merchantId || !merchantKey) {
      return NextResponse.json(
        { error: "PayFast is not configured. Set PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY." },
        { status: 503 }
      );
    }

    const payload: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: `${baseUrl}/portal/billing?payment=success`,
      cancel_url: `${baseUrl}/portal/billing?payment=cancelled`,
      notify_url: `${baseUrl}/api/payfast/notify`,
      name_first: firstName || "",
      name_last: lastName || "",
      email_address: email,
      m_payment_id: tenantId || `FUZE-${Date.now()}`,
      amount: plan.price.toFixed(2),
      item_name: `Fuze Business Suite - ${plan.label}`,
      item_description: `${plan.label} plan subscription`,
      custom_str1: planId,
      custom_str2: tenantId || "",
      custom_str3: email,
    };

    // Remove empty values
    Object.keys(payload).forEach((k) => {
      if (!payload[k]) delete payload[k];
    });

    const signature = buildPayFastSignature(payload, passphrase);
    payload.signature = signature;

    return NextResponse.json({
      url: PAYFAST_URL,
      payload,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout failed" },
      { status: 500 }
    );
  }
}
