import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, number> = {};
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  if (limit) args.limit = Number(limit);
  if (offset) args.offset = Number(offset);
  try {
    const result = await erpMethod("fuze_suite.api.crm.get_email_templates", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch email templates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await erpMethod("fuze_suite.api.crm.create_email_template", { data: body });
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create email template" }, { status: 500 });
  }
}
