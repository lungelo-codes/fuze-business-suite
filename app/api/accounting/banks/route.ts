import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [banks, accounts] = await Promise.all([
      erpMethod("accounting.get_banks", {}),
      erpMethod("accounting.get_bank_accounts", {}),
    ]);
    return NextResponse.json({ banks, accounts });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
