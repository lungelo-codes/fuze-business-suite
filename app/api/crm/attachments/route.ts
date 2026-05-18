import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, string | number> = {};
  for (const key of ["reference_doctype", "reference_name", "lead", "deal", "limit", "offset"]) {
    const value = searchParams.get(key);
    if (!value) continue;
    args[key] = key === "limit" || key === "offset" ? Number(value) : value;
  }
  try {
    const result = await erpMethod("fuze_suite.api.crm.get_attachments", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch attachments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("fuze_suite.api.crm.attach_file_to_record", body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to attach file" }, { status: 500 });
  }
}
