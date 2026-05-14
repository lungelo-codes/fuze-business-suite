import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company") || undefined;
  const result = await erpMethod("fuze_suite.api.hr.get_dashboard", { company });
  return NextResponse.json(result);
}
