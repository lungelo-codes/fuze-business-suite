import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: NextRequest) {
  const type = new URL(req.url).searchParams.get("type") || undefined;
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.get_salary_components", { component_type: type }));
}
