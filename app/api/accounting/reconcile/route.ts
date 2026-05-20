import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { requireSaaSUser, safeJsonError, tenantArgs, tenantData } from "@/lib/server/apiGuard";

export async function GET(req: Request) {
  try {
    const session = requireSaaSUser();
    const p = new URL(req.url).searchParams;
    const args: Record<string, unknown> = {};
    if (p.get("bank_account")) args.bank_account = p.get("bank_account");
    if (p.get("limit")) args.limit = Number(p.get("limit"));
    return NextResponse.json({ ok: true, data: await erpMethod("fuze_suite.api.accounting.get_banking_reconciliation", tenantArgs(args, session)) });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not load reconciliation.");
  }
}

export async function POST(req: Request) {
  try {
    const session = requireSaaSUser();
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, data: await erpMethod("fuze_suite.api.accounting.reconcile_bank_transaction", tenantArgs({ data: tenantData(body, session) }, session)) });
  } catch (e: unknown) {
    return safeJsonError(e, "Could not reconcile transaction.");
  }
}
