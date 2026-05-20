import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company") || undefined;

  try {
    const result = await erpMethod("fuze_suite.api.crm.get_dashboard", company ? { company } : {});
    return NextResponse.json(result);
  } catch (error: any) {
    // Fallback: try workspace summary counts when crm module isn't installed
    return NextResponse.json(
      { error: error?.message || "Failed to fetch CRM dashboard" },
      { status: 500 }
    );
  }
}
