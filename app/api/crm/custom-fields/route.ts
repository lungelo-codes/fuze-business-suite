import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctype = searchParams.get("doctype") || "CRM Lead";
  try {
    const result = await erpMethod("crm.get_custom_fields", { doctype });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch custom fields" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { doctype, ...data } = body;
    if (!doctype) return NextResponse.json({ error: "doctype is required" }, { status: 400 });
    const result = await erpMethod("crm.create_custom_field", { doctype, data });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create custom field" }, { status: 500 });
  }
}
