import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: NextRequest) {
  const p = Object.fromEntries(new URL(req.url).searchParams.entries());
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.get_salary_structure_assignments", p));
}
