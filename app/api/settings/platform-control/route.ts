import { NextResponse } from "next/server";
import { erpMethod, BusinessSuiteError, getERPNextBaseUrl } from "@/lib/server/erpnext";

function normalizeLogoUrls(data: any) {
  const base = getERPNextBaseUrl();
  const out = { ...(data || {}) };
  for (const key of ["platform_logo", "website_logo", "company_logo", "logo"]) {
    if (typeof out[key] === "string" && out[key].startsWith("/")) out[key] = `${base}${out[key]}`;
  }
  return out;
}
function unwrap(result: any) { return normalizeLogoUrls(result?.settings || result?.data?.settings || result || {}); }

export async function GET() {
  try {
    const result = await erpMethod<any>("settings.get_platform_settings", {});
    return NextResponse.json({ data: unwrap(result) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load platform settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await erpMethod<any>("settings.save_platform_settings", { data: body });
    return NextResponse.json({ data: unwrap(result) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save platform settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
