import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const employee = p.get("employee");
  if (!employee) return NextResponse.json({ error: "employee required" }, { status:400 });
  const args: Record<string,unknown> = { employee };
  if (p.get("as_of_date")) args.as_of_date = p.get("as_of_date");
  try { return NextResponse.json(await erpMethod("hr.get_leave_balance", args)); }
  catch (e:any) { return NextResponse.json({ error: e?.message }, { status:500 }); }
}
