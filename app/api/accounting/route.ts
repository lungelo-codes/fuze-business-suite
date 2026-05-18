import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company") || undefined;
  try {
    const result = await erpMethod("accounting.get_dashboard", company ? { company } : {});
    return NextResponse.json(result);
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}
