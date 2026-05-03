import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { formDataToPayload, verifyPayFastSignature } from "@/lib/server/payfast";

export async function POST(req: Request) {
  try {
    const payload = formDataToPayload(await req.formData());

    if (!verifyPayFastSignature(payload)) {
      return NextResponse.json({ error: "Invalid PayFast signature" }, { status: 400 });
    }

    if (payload.payment_status !== "COMPLETE") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const backend = await erpMethod("fuze_suite.api.saas.activate_subscription", {
      raw_payload: payload,
      m_payment_id: payload.m_payment_id,
      pf_payment_id: payload.pf_payment_id,
      amount_gross: payload.amount_gross,
      email_address: payload.email_address,
      payment_status: payload.payment_status
    });

    return NextResponse.json({ ok: true, backend });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "PayFast notify failed" },
      { status: 500 }
    );
  }
}
