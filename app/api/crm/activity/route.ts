import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const args: Record<string, string | number> = {};
  for (const key of ["reference_doctype", "reference_name", "lead", "deal", "limit"]) {
    const value = searchParams.get(key);
    if (!value) continue;
    args[key] = key === "limit" ? Number(value) : value;
  }
  try {
    const result = await erpMethod("fuze_suite.api.crm.get_activity_feed", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch activity" }, { status: 500 });
  }
}
