import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = {};
  if (p.get("project")) args.project = p.get("project");
  if (p.get("company")) args.company = p.get("company");
  try { return NextResponse.json(await erpMethod("projects.get_gantt_data", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
