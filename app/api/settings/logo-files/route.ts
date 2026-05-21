import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE } from "@/lib/modules";
import { erpMethod, BusinessSuiteError, getERPNextBaseUrl } from "@/lib/server/erpnext";

function contextCompany(searchCompany?: string | null) {
  const cookieCompany = cookies().get(COMPANY_COOKIE)?.value;
  const decodedCookie = cookieCompany ? decodeURIComponent(cookieCompany) : "";
  return searchCompany || decodedCookie || "";
}
function normalize(file: any) {
  const base = getERPNextBaseUrl();
  const out = { ...(file || {}) };
  if (typeof out.file_url === "string" && out.file_url.startsWith("/")) out.file_url = `${base}${out.file_url}`;
  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const result = await erpMethod<any>("settings.list_logo_files", {
      company: contextCompany(searchParams.get("company")),
      target: searchParams.get("target") || "company",
    });
    const data = result?.data || result || {};
    return NextResponse.json({ data: { files: (data.files || []).map(normalize) } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof BusinessSuiteError ? (e.rawMessage || e.message) : e instanceof Error ? e.message : "Could not load logo files" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
