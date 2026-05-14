import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

// Projects dashboard endpoint. Returns summary KPIs for projects and tasks.
export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const company = params.get("company") || undefined;
    const result = await erpMethod("projects.get_dashboard", company ? { company } : {});
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch projects dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}