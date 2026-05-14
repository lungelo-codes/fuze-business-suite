import { NextRequest, NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const data = await req.json();
  return NextResponse.json(await erpMethod("fuze_suite.api.hr.update_job_applicant", { applicant_id: params.id, data }));
}
