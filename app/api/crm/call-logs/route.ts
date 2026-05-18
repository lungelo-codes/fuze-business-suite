import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, string | number> = {};
  for (const key of ["reference_doctype", "reference_name", "limit", "offset"]) {
    const value = searchParams.get(key);
    if (!value) continue;
    args[key] = key === "limit" || key === "offset" ? Number(value) : value;
  }
  try {
    const result = await erpMethod("crm.get_call_logs", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch call logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference_doctype, reference_name, ...data } = body;
    if (!reference_doctype || !reference_name) return NextResponse.json({ error: "reference_doctype and reference_name are required" }, { status: 400 });
    const result = await erpMethod("crm.create_call_log", { reference_doctype, reference_name, data });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create call log" }, { status: 500 });
  }
}
