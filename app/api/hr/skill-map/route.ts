import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: NextRequest) {
  const employee = new URL(req.url).searchParams.get("employee");
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.get_employee_skill_map", { employee }));
}
