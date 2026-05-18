import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = {};
  if (p.get("project"))   args.project   = p.get("project");
  if (p.get("company"))   args.company   = p.get("company");
  if (p.get("from_date")) args.from_date = p.get("from_date");
  if (p.get("to_date"))   args.to_date   = p.get("to_date");
  try { return NextResponse.json(await erpMethod("projects.get_project_profitability", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
