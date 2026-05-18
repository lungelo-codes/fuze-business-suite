import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string, unknown> = {};
  if (p.get("bank_account")) args.bank_account = p.get("bank_account");
  if (p.get("limit")) args.limit = Number(p.get("limit"));
  try {
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.get_banking_reconciliation", args));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load reconciliation" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.reconcile_bank_transaction", { data: body }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not reconcile transaction" }, { status: 500 });
  }
}
