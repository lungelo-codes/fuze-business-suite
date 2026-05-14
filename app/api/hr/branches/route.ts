// api/hr/branches/route.ts
import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: NextRequest) {
  const company = new URL(req.url).searchParams.get("company") || undefined;
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.get_branches", { company }));
}
