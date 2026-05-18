import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const args: Record<string,unknown> = {};
  if (p.get("company"))         args.company         = p.get("company");
  if (p.get("status"))          args.status          = p.get("status");
  if (p.get("asset_category"))  args.asset_category  = p.get("asset_category");
  if (p.get("location"))        args.location        = p.get("location");
  if (p.get("limit"))           args.limit           = Number(p.get("limit") || 50);
  if (p.get("offset"))          args.offset          = Number(p.get("offset") || 0);
  // dashboard mode
  if (p.get("dashboard")) {
    try { return NextResponse.json(await erpMethod("assets.get_dashboard", args)); }
    catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
  }
  try { return NextResponse.json(await erpMethod("assets.get_assets", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    return NextResponse.json(await erpMethod("assets.create_asset", { data: body }), { status:201 });
  } catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
