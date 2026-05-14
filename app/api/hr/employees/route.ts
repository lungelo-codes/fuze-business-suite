import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: NextRequest) {
  const p = Object.fromEntries(new URL(req.url).searchParams.entries());
  const result = await erpMethod("fuze_suite.api.hr.get_employees", p);
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const result = await erpMethod("fuze_suite.api.hr.create_employee", { data });
  return NextResponse.json(result);
}
