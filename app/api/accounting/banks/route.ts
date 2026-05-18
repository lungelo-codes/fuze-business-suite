import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [banks, accounts, transactions, reconciliation] = await Promise.all([
      erpMethod("fuze_suite.api.accounting.get_banks", {}),
      erpMethod("fuze_suite.api.accounting.get_bank_accounts", {}),
      erpMethod("fuze_suite.api.accounting.get_bank_transactions", { limit: 50 }),
      erpMethod("fuze_suite.api.accounting.get_banking_reconciliation", { limit: 50 }),
    ]);
    return NextResponse.json({ banks, accounts, transactions, reconciliation });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not load banking" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await erpMethod("fuze_suite.api.accounting.create_bank_account", { data: body }));
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not save bank account" }, { status: 500 });
  }
}
