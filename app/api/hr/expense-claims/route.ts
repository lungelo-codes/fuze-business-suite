import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: NextRequest) {
  const p = Object.fromEntries(new URL(req.url).searchParams.entries());
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.get_expense_claims", p));
}
export async function POST(req: NextRequest) {
  const data = await req.json();
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.create_expense_claim", { data }));
}
