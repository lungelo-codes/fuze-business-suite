import { NextResponse } from "next/server";
const ERPNEXT_URL = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL || "";
const DEFAULT_FORMATS: Record<string,string> = { "Sales Invoice": "Sales Invoice Standard", "Quotation": "Quotation" };
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const doctype = searchParams.get("doctype") || "";
  const name = searchParams.get("name") || "";
  const format = searchParams.get("format") || DEFAULT_FORMATS[doctype] || "Standard";
  const letterhead = searchParams.get("letterhead") || "";
  if (!ERPNEXT_URL || !doctype || !name) return NextResponse.json({ error: "Missing document print details" }, { status: 400 });
  const qs = new URLSearchParams({ doctype, name, format, trigger_print: "0", no_letterhead: "0" });
  if (letterhead) qs.set("letterhead", letterhead);
  return NextResponse.json({ data: { url: `${ERPNEXT_URL}/printview?${qs.toString()}` } });
}
