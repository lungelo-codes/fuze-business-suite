import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET() {
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.get_employment_types", {}));
}
