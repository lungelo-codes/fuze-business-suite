import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company") || undefined;
  try {
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.get_dashboard", company ? { company } : {}));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load finance dashboard" }, { status: 500 });
  }
}
