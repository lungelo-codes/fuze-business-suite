import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctype = searchParams.get("doctype") || undefined;
  try {
    const result = await erpMethod("fuze_suite.api.crm.get_crm_views", { doctype });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch views" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("fuze_suite.api.crm.save_crm_view", { data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to save view" }, { status: 500 });
  }
}
