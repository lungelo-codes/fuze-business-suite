import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE } from "@/lib/appModules";
import { erpGet, erpList, erpPatch, BusinessSuiteError, getERPNextBaseUrl } from "@/lib/server/erpnext";

type Any = Record<string, unknown>;
const COMPANY_FIELDS = ["name","company_name","company_logo","default_letter_head","phone_no","email","website","tax_id","registration_details","default_bank_account","default_currency"];
const PROFILE_FIELDS = ["name","company","trading_name","registration_number","industry","financial_year_end","base_currency","vat_registered","vat_registration_date","phone","email","website","street_address","suburb","city","province","postal_code","bank_name","account_number","branch_code"];

function pick(input: Any, allowed: string[]) {
  const out: Any = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
  return out;
}

async function resolveCompanyName(searchCompany?: string | null) {
  const cookieCompany = cookies().get(COMPANY_COOKIE)?.value;
  const decodedCookie = cookieCompany ? decodeURIComponent(cookieCompany) : "";
  const wanted = searchCompany || decodedCookie;
  if (wanted && wanted !== "—") return wanted;
  const companies = await erpList<Any>("Company", { fields: ["name"], limit: 1, orderBy: "modified desc" });
  return String(companies[0]?.name || "");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyName = await resolveCompanyName(searchParams.get("company"));
    if (!companyName) return NextResponse.json({ error: "No company found" }, { status: 404 });

    const companyRes = await erpGet<{ data?: Any; message?: Any }>(`/api/resource/Company/${encodeURIComponent(companyName)}`);
    const company = companyRes.data || companyRes.message || {};

    const profiles = await erpList<Any>("Fuze Business Profile", { fields: PROFILE_FIELDS, filters: [["company", "=", companyName]], limit: 1, orderBy: "modified desc" });
    const profile = profiles[0] || null;

    const cleanCompany = pick(company, COMPANY_FIELDS);
    const erpnextUrl = getERPNextBaseUrl();
    if (typeof cleanCompany.company_logo === "string" && cleanCompany.company_logo.startsWith("/") && erpnextUrl) cleanCompany.company_logo = `${erpnextUrl}${cleanCompany.company_logo}`;
    return NextResponse.json({ data: { company: cleanCompany, profile } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load business settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json() as Any;
    const companyName = await resolveCompanyName(String(body.company || ""));
    if (!companyName) return NextResponse.json({ error: "No company found" }, { status: 404 });

    const companyPayload = pick(body.company_settings as Any || body, ["company_logo","default_letter_head","phone_no","email","website","tax_id","registration_details","default_bank_account"]);
    const erpnextUrl = getERPNextBaseUrl();
    if (typeof companyPayload.company_logo === "string" && erpnextUrl && companyPayload.company_logo.startsWith(erpnextUrl)) companyPayload.company_logo = companyPayload.company_logo.slice(erpnextUrl.length);
    let company: Any = {};
    if (Object.keys(companyPayload).length) company = await erpPatch<Any>("Company", companyName, companyPayload);

    const profilePayload = pick(body.profile as Any || body, PROFILE_FIELDS.filter(f => !["name","company"].includes(f)));
    let profile: Any | null = null;
    if (Object.keys(profilePayload).length) {
      const existing = await erpList<Any>("Fuze Business Profile", { fields: ["name"], filters: [["company", "=", companyName]], limit: 1 });
      if (existing[0]?.name) {
        profile = await erpPatch<Any>("Fuze Business Profile", String(existing[0].name), profilePayload);
      } else {
        const { erpCreate } = await import("@/lib/server/erpnext");
        profile = await erpCreate<Any>("Fuze Business Profile", { company: companyName, ...profilePayload });
      }
    }

    return NextResponse.json({ data: { company, profile } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not save business settings" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
