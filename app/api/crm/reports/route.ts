import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Row = Record<string, any>;
function objectFrom(value: unknown): Row {
  const v = value as any;
  if (v?.data && !Array.isArray(v.data)) return v.data;
  if (v?.message?.data && !Array.isArray(v.message.data)) return v.message.data;
  if (v?.message && !Array.isArray(v.message) && typeof v.message === "object") return v.message;
  return (v || {}) as Row;
}
export async function GET() {
  try {
    const result = await erpMethod("crm.get_crm_report_data", {});
    const data = objectFrom(result);
    return NextResponse.json({ success: true, data, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: true, data: { currency: "ZAR", cards: {}, lead_status: [], pipeline: [], monthly_quotes: [], monthly_sales_orders: [] }, error: error?.message || "Could not load CRM reports" });
  }
}
