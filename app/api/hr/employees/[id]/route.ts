import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const result = await erpMethod("fuze_suite.api.hr.get_employee", { employee_id: params.id });
  return NextResponse.json(result);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json();
  const result = await erpMethod("fuze_suite.api.hr.update_employee", { employee_id: params.id, data });
  return NextResponse.json(result);
}
