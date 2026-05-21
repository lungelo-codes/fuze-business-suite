import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE, TENANT_COOKIE, ROLE_COOKIE } from "@/lib/modules";
import { erpMethod, BusinessSuiteError, getERPNextBaseUrl } from "@/lib/server/erpnext";

function contextCompany() {
  const raw = cookies().get(COMPANY_COOKIE)?.value || "";
  return raw ? decodeURIComponent(raw) : "";
}
function contextTenant() {
  return cookies().get(TENANT_COOKIE)?.value || contextCompany();
}
function isSaasAdmin() {
  const role = cookies().get(ROLE_COOKIE)?.value || "";
  return ["admin", "Administrator", "System Manager"].includes(role);
}
function stripCustomerAdminFields(body: any) {
  if (isSaasAdmin()) return body || {};
  const out = { ...(body || {}) };
  for (const key of ["plan", "active_modules", "billing_status", "trial_start", "trial_end", "next_billing_date", "last_trial_email", "last_billing_email", "payfast_payment_link"]) delete out[key];
  return out;
}
function normalizeLogoUrls(data: any) {
  const base = getERPNextBaseUrl();
  const out = { ...(data || {}) };
  for (const key of ["company_logo", "website_logo", "platform_logo", "logo"]) {
    if (typeof out[key] === "string" && out[key].startsWith("/")) out[key] = `${base}${out[key]}`;
  }
  return out;
}
function unwrap(result: any) { return normalizeLogoUrls(result?.settings || result?.data?.settings || result || {}); }

export async function GET() {
  try {
    const result = await erpMethod<any>("settings.get_tenant_settings", { company: contextCompany(), tenant: contextTenant() });
    return NextResponse.json({ data: unwrap(result) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof BusinessSuiteError ? (e.rawMessage || e.message) : e instanceof Error ? e.message : "Could not load tenant settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod<any>("settings.save_tenant_settings", { data: { company: contextCompany(), tenant: contextTenant(), ...stripCustomerAdminFields(body) } });
    return NextResponse.json({ data: unwrap(result) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof BusinessSuiteError ? (e.rawMessage || e.message) : e instanceof Error ? e.message : "Could not save tenant settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
