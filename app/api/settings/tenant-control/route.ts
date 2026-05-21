import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE, TENANT_COOKIE } from "@/lib/modules";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

function contextCompany() {
  const raw = cookies().get(COMPANY_COOKIE)?.value || "";
  return raw ? decodeURIComponent(raw) : "";
}
function contextTenant() {
  return cookies().get(TENANT_COOKIE)?.value || contextCompany();
}

export async function GET() {
  try {
    const result = await erpMethod<any>("settings.get_tenant_settings", { company: contextCompany(), tenant: contextTenant() });
    return NextResponse.json({ data: result?.settings || result || {} });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load tenant settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod<any>("settings.save_tenant_settings", { data: { company: contextCompany(), tenant: contextTenant(), ...body } });
    return NextResponse.json({ data: result?.settings || result || {} });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save tenant settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
