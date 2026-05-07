import { erpnextFetch } from "@/lib/server/erpnext";

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
  const res = await erpnextFetch<{
    message?: SaaSModule[];
    data?: SaaSModule[];
  }>("/api/method/fuze_suite.api.saas.get_modules", {
    method: "GET",
    cache: "no-store",
  });

  const rows = Array.isArray(res?.message)
    ? res.message
    : Array.isArray(res?.data)
      ? res.data
      : [];

  return rows.map((row) => ({
    name: row.name,
    module_key: row.module_key,
    module_name: row.module_name,
    app_name: row.app_name,
    description: row.description,
    enabled: row.enabled,
  }));
}

export async function createDemoTenant(payload: SignupPayload) {
  const body = new URLSearchParams();

  body.set("company_name", payload.company_name);
  body.set("email", payload.email);

  if (payload.full_name) body.set("full_name", payload.full_name);
  if (payload.phone) body.set("phone", payload.phone);
  if (payload.trial_days) body.set("trial_days", String(payload.trial_days));

  body.set("requested_module", normalizeModules(payload.requested_module));

  const res = await erpnextFetch<{
    message?: {
      ok: boolean;
      message?: string;
      tenant?: string;
      provisioning_job?: string;
      site_name?: string;
      login_url?: string;
      email?: string;
      status?: string;
    };
  }>("/api/method/fuze_suite.api.saas.create_demo_tenant", {
    method: "POST",
    body,
    cache: "no-store",
  });

  return res.message;
}