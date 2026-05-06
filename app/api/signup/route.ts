import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE } from "@/lib/modules";

interface CreateDemoTenantResponse {
  ok?: boolean;
  message?: string;
  tenant?: string | number;
  provisioning_job?: string | number;
  site_name?: string;
  login_url?: string;
  email?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const required = ["full_name", "company_name", "email", "phone", "plan"];
    const missing = required.filter((field) => !body[field]);
    if (missing.length) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    const backend = await erpMethod<CreateDemoTenantResponse>("fuze_suite.api.saas.create_demo_tenant", {
      full_name: String(body.full_name || ""),
      company_name: String(body.company_name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      requested_module: Array.isArray(body.modules) ? body.modules.join(",") : undefined,
      trial_days: 14,
    });

    if (!backend?.ok) {
      return NextResponse.json({ error: backend?.message || "Could not create SaaS tenant" }, { status: 500 });
    }

    const modules = Array.isArray(body.modules) ? body.modules : [];
    const response = NextResponse.json({
      success: true,
      message: backend.message || "Demo site created. Login details are being sent by email.",
      tenant: backend.tenant,
      provisioning_job: backend.provisioning_job,
      site_name: backend.site_name,
      site_url: backend.login_url,
      login_url: backend.login_url,
      backend,
    });

    response.cookies.set(MODULE_COOKIE, JSON.stringify(modules), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(PLAN_COOKIE, String(body.plan || "Starter"), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(COMPANY_COOKIE, String(body.company_name || ""), { path: "/", maxAge: 365 * 86400 });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 500 }
    );
  }
}
