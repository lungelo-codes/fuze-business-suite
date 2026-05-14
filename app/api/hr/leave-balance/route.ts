import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  return NextResponse.json(
    await erpMethod("fuze_suite.api.hr.get_leave_balance", {
      employee: sp.get("employee"),
      as_of_date: sp.get("as_of_date") || undefined,
    })
  );
}
