import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST() {
  try {
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.ensure_finance_setup", {}));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not prepare finance" }, { status: 500 });
  }
}
