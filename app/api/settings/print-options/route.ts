import { NextResponse } from "next/server";
import { erpList, BusinessSuiteError } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const [letterheads, invoiceFormats, quoteFormats] = await Promise.all([
      erpList<Record<string, unknown>>("Letter Head", { fields: ["name","is_default","disabled"], limit: 100, orderBy: "is_default desc, modified desc" }),
      erpList<Record<string, unknown>>("Print Format", { fields: ["name","doc_type","standard","disabled"], filters: [["doc_type","=","Sales Invoice"],["disabled","=",0]], limit: 100, orderBy: "standard desc, modified desc" }),
      erpList<Record<string, unknown>>("Print Format", { fields: ["name","doc_type","standard","disabled"], filters: [["doc_type","=","Quotation"],["disabled","=",0]], limit: 100, orderBy: "standard desc, modified desc" }).catch(() => []),
    ]);
    return NextResponse.json({ data: { letterheads, invoiceFormats, quoteFormats } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load print settings", data: { letterheads: [], invoiceFormats: [], quoteFormats: [] } }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
