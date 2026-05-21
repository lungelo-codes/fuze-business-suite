import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COMPANY_COOKIE, TENANT_COOKIE } from "@/lib/modules";
import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawCompany = cookies().get(COMPANY_COOKIE)?.value || "";
    const company = rawCompany ? decodeURIComponent(rawCompany) : "";
    const tenant = cookies().get(TENANT_COOKIE)?.value || company;
    const result = await erpMethod<any>("settings.generate_payfast_payment_link", { data: { company, tenant, ...body } });
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not create payment link" }, { status: e instanceof BusinessSuiteError ? e.status : 500 });
  }
}
