import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { erpMethod } from "@/lib/server/erpnext";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE } from "@/lib/modules";
import { verifySignedCode, VERIFY_COOKIE } from "@/lib/server/verification";

interface CreateDemoTenantResponse {
  ok?: boolean;
  message?: string;
  tenant?: string | number;
  provisioning_job?: string | number;
  site_name?: string;
  login_url?: string;
  email?: string;
}

function getString(body: Record<string, unknown>, key: string): string {
  return typeof body[key] === "string" ? String(body[key]).trim() : "";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const required = ["full_name", "company_name", "email", "phone", "plan", "verification_code"];
    const missing = required.filter((field) => !getString(body, field));
    if (missing.length) {
      return NextResponse.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    const email = getString(body, "email");
    const cookieStore = await cookies();
    const token = cookieStore.get(VERIFY_COOKIE)?.value;
    const verificationCode = getString(body, "verification_code");
    if (!verifySignedCode(token, email, verificationCode)) {
      return NextResponse.json({ error: "Invalid or expired email verification code" }, { status: 400 });
    }

    const modules = Array.isArray(body.modules) ? body.modules.map(String) : [];
    const backend = await erpMethod<CreateDemoTenantResponse>("fuze_suite.api.saas.create_demo_tenant", {
      full_name: getString(body, "full_name"),
      company_name: getString(body, "company_name"),
      email,
      phone: getString(body, "phone"),
      password: getString(body, "password"),
      requested_module: modules.join(","),
      trial_days: 14,
    }, { useToken: true });

    if (!backend?.ok) {
      return NextResponse.json({ error: backend?.message || "Could not create SaaS tenant" }, { status: 500 });
    }

    const siteUrl = backend.login_url || (backend.site_name ? `https://${backend.site_name}` : "");
    const response = NextResponse.json({
      success: true,
      message: backend.message || "Demo site created. Login details are being sent by email.",
      tenant: backend.tenant,
      provisioning_job: backend.provisioning_job,
      site_name: backend.site_name,
      site_url: siteUrl,
      login_url: siteUrl,
      email,
    });

    response.cookies.set(MODULE_COOKIE, JSON.stringify(modules), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(PLAN_COOKIE, getString(body, "plan") || "Starter", { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(COMPANY_COOKIE, getString(body, "company_name"), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set("fuze_email", email, { path: "/", maxAge: 365 * 86400 });
    if (siteUrl) response.cookies.set("fuze_erp_url", siteUrl, { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(VERIFY_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signup failed" },
      { status: 500 }
    );
  }
}
