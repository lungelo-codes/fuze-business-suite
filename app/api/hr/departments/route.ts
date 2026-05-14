import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// GET /api/hr/departments
export async function GET(req: NextRequest) {
  const company = new URL(req.url).searchParams.get("company") || undefined;
  const result = await erpMethod("fuze_suite.api.hr.get_departments", { company });
  return NextResponse.json(result);
}
