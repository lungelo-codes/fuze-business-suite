import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.get_salary_slip", { salary_slip: params.id }));
}
