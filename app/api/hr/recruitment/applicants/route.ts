import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = {};
  if (p.get("job_opening")) args.job_opening = p.get("job_opening");
  if (p.get("status"))      args.status      = p.get("status");
  if (p.get("limit"))       args.limit       = Number(p.get("limit") || 50);
  if (p.get("offset"))      args.offset      = Number(p.get("offset") || 0);
  try { return NextResponse.json(await erpMethod("hr.get_job_applicants", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json(await erpMethod("hr.create_job_applicant", { data: body }), { status:201 });
  } catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
