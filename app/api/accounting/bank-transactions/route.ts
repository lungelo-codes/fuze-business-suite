import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.create_bank_transaction", { data: body }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not import bank transaction" }, { status: 500 });
  }
}
