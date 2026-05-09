import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";
import { MODULE_COOKIE, PLAN_COOKIE, COMPANY_COOKIE, TENANT_COOKIE, calculateSubscriptionTotal } from "@/lib/modules";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/server/rateLimit";

interface CreateDemoTenantResponse {
  ok?: boolean;
  message?: string;
  tenant?: string | number;
  provisioning_job?: string | number;
  site_name?: string;
  login_url?: string;
  email?: string;
  status?: string;
}

function cleanModules(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(String).map((v) => v.trim()).filter(Boolean)));
}

export async function POST(req: Request) {
  // Rate limit: 5 signups per IP per hour
  const ip = getClientIp(req);
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const required = ["full_name", "company_name", "email", "phone", "plan"];
    const missing = required.filter((field) => !body[field]);

    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    }

    const modules = cleanModules(body.modules);

    const backend = await erpMethod<CreateDemoTenantResponse>("fuze_suite.api.saas.create_demo_tenant", {
      full_name: String(body.full_name || ""),
      company_name: String(body.company_name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      preferred_site_name: String(body.preferred_site_name || ""),
      plan: String(body.plan || "Starter"),
      requested_module: JSON.stringify(modules),
      trial_days: 14,
    });

    if (!backend?.ok) {
      return NextResponse.json({ success: false, error: backend?.message || "Could not create SaaS tenant" }, { status: 500 });
    }

    const tenantId = backend.tenant ? String(backend.tenant) : "";
    const loginUrl = backend.login_url || (backend.site_name ? `/login?site=${encodeURIComponent(backend.site_name)}` : "/login");

    const response = NextResponse.json({
      success: true,
      message: backend.message || "Your workspace is being prepared. Login details will be emailed when ready.",
      tenant: backend.tenant,
      provisioning_job: backend.provisioning_job,
      site_name: backend.site_name,
      site_url: loginUrl,
      login_url: loginUrl,
      modules,
      total: calculateSubscriptionTotal(String(body.plan || "Starter"), modules),
      status: backend.status || "Provisioning",
      backend,
    });

    response.cookies.set(MODULE_COOKIE, JSON.stringify(modules), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(PLAN_COOKIE, String(body.plan || "Starter"), { path: "/", maxAge: 365 * 86400 });
    response.cookies.set(COMPANY_COOKIE, String(body.company_name || ""), { path: "/", maxAge: 365 * 86400 });
    if (tenantId) response.cookies.set(TENANT_COOKIE, tenantId, { path: "/", maxAge: 365 * 86400 });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Signup failed" },
      { status: 500 }
    );
  }
}
