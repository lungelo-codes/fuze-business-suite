import { erpMethod } from "@/lib/server/erpnext";

export type SignupPayload = {
  full_name?: string;
  company_name: string;
  email: string;
  phone?: string;
  plan?: string;
  requested_module?: string[] | string;
  trial_days?: number;
};

export type SaaSModule = {
  name: string;
  module_key: string;
  module_name: string;
  app_name?: string;
  description?: string;
  enabled?: number;
};

function normalizeModules(modules?: string[] | string): string {
  if (!modules) return "";

  if (Array.isArray(modules)) {
    return modules.filter(Boolean).join(",");
  }

  return String(modules);
}

export async function getSaaSModules(): Promise<SaaSModule[]> {
  const rows = await erpMethod<SaaSModule[]>(
    "fuze_suite.api.saas.get_modules",
    {}
  );

  return Array.isArray(rows) ? rows : [];
}

export async function createDemoTenant(payload: SignupPayload) {
  const response = await erpMethod<{
    ok: boolean;
    message?: string;
    tenant?: string;
    provisioning_job?: string;
    site_name?: string;
    login_url?: string;
    email?: string;
    status?: string;
  }>(
    "fuze_suite.api.saas.create_demo_tenant",
    {
      company_name: payload.company_name,
      email: payload.email,
      full_name: payload.full_name || "",
      phone: payload.phone || "",
      requested_module: normalizeModules(payload.requested_module),
      trial_days: payload.trial_days || 14,
    }
  );

  return response;
}