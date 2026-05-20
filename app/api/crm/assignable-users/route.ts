import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  try {
    const result = await erpMethod("crm.get_assignable_users", { search: p.get("search") || undefined, limit: Number(p.get("limit") || 80) });
    return NextResponse.json({ success: true, data: result, ...(typeof result === "object" && result ? result as Record<string, unknown> : {}) });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not load users", users: [], employees: [] }, { status: 200 });
  }
}
