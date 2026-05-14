import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: NextRequest) {
  const company = new URL(req.url).searchParams.get("company") || undefined;
  const result = await erpMethod("fuze_suite.api.hr.get_org_chart", { company });
  return NextResponse.json(result);
}
