import { NextResponse } from "next/server";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const result = await erpMethod<any>("settings.get_platform_settings", {});
    return NextResponse.json({ data: result?.settings || result || {} });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load platform settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod<any>("settings.save_platform_settings", { data: body });
    return NextResponse.json({ data: result?.settings || result || {} });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save platform settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
