import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE } from "@/lib/modules";
import { erpMethod, BusinessSuiteError, getERPNextBaseUrl } from "@/lib/server/erpnext";

type Any = Record<string, unknown>;

function normalizeLogoUrls(data: Any | null | undefined) {
  const base = getERPNextBaseUrl();
  const out: Any = { ...(data || {}) };
  for (const key of ["company_logo", "website_logo", "platform_logo", "logo"]) {
    if (typeof out[key] === "string" && String(out[key]).startsWith("/")) out[key] = `${base}${out[key]}`;
  }
  return out;
}

function unwrap(result: any) {
  const data = result?.data || result || {};
  return {
    company: normalizeLogoUrls(data.company),
    profile: data.profile || null,
    profile_warning: data.profile_warning || "",
  };
}

function contextCompany(searchCompany?: string | null) {
  const cookieCompany = cookies().get(COMPANY_COOKIE)?.value;
  const decodedCookie = cookieCompany ? decodeURIComponent(cookieCompany) : "";
  const wanted = searchCompany || decodedCookie;
  return wanted && wanted !== "—" ? wanted : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = contextCompany(searchParams.get("company"));
    const result = await erpMethod<any>("settings.get_business_branding", { company });
    return NextResponse.json({ data: unwrap(result) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load business settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const company = contextCompany(String(body.company || ""));
    const result = await erpMethod<any>("settings.save_business_branding", { data: { ...body, company } });
    return NextResponse.json({ data: unwrap(result) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save business settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
