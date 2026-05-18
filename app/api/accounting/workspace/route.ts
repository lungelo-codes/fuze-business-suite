import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET() {
  try {
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.get_finance_workspace", {}));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load finance" }, { status: 500 });
  }
}
