import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

async function readPayload(req: Request) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("application/json")) return await req.json();
  const form = await req.formData();
  return Object.fromEntries(form.entries());
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get("provider") || "payfast";
    const payload = await readPayload(req);
    return NextResponse.json(await erpMethod("fuze_suite.api.payments.handle_gateway_notification", { provider, data: payload }));
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not process payment notification" }, { status: 500 });
  }
}
