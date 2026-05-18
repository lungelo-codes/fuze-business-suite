import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const result = await erpMethod("fuze_suite.api.crm.get_sales_form_options", {
      doctype: p.get("doctype") || "Quotation",
      search: p.get("search") || undefined,
      limit: Number(p.get("limit") || 50),
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Could not load sales options" }, { status: 500 });
  }
}
