import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = {};
  if (p.get("status"))       args.status       = p.get("status");
  if (p.get("company"))      args.company      = p.get("company");
  if (p.get("project_type")) args.project_type = p.get("project_type");
  if (p.get("limit"))        args.limit        = Number(p.get("limit") || 50);
  if (p.get("offset"))       args.offset       = Number(p.get("offset") || 0);
  try { return NextResponse.json(await erpMethod("projects.get_projects", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json(await erpMethod("projects.create_project", { data: body }), { status:201 });
  } catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
