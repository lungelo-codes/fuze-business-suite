import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET() {
  try {
    return NextResponse.json(await erpMethod("fuze_suite.api.payments.get_payment_gateway_options", {}));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not load payment gateways" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json(await erpMethod("fuze_suite.api.payments.save_payment_gateway_settings", body));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not save payment gateway" }, { status: 500 });
  }
}
