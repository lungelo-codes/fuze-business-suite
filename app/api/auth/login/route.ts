import { NextResponse } from "next/server";
import {
  ALL_MODULES,
  COMPANY_COOKIE,
  MODULE_COOKIE,
  PLAN_COOKIE,
  ROLE_COOKIE,
  TENANT_COOKIE,
  getModulesForPlan,
} from "@/lib/modules";

const MASTER_ERPNEXT_URL =
  process.env.ERPNEXT_URL ||
  process.env.NEXT_PUBLIC_ERPNEXT_URL ||
  process.env.NEXT_PUBLIC_API_URL;

const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY;
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET;
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

type LoginBody = {
  email?: string;
  password?: string;
  site?: string;
};

type ParsedCookie = {
  name: string;
  value: string;
};

type TenantContext = {
  tenantId?: string;
  companyName: string;
  plan: string;
  modules: string[];
};

const VALID_MODULES = new Set(ALL_MODULES.map((module) => module.id));

function jsonError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function normalizeSite(site?: string) {
  return String(site || "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function normalizeBackendUrl(site?: string) {
  const cleanSite = normalizeSite(site);
  if (cleanSite && cleanSite.includes(".")) return `https://${cleanSite}`;
  return MASTER_ERPNEXT_URL;
}

function companyFromSite(site?: string) {
  const clean = normalizeSite(site);
  return clean ? clean.replace(".fuzedigital.co.za", "") : "Business";
}

function parseSetCookieHeader(header: string | null): ParsedCookie[] {
  if (!header) return [];
  const parts = header.split(/,(?=\s*[^;=]+=[^;]+)/g);
  return parts
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter(Boolean)
    .map((pair) => {
      const index = pair.indexOf("=");
      return { name: pair.slice(0, index), value: pair.slice(index + 1) };
    })
    .filter((cookie) => cookie.name && cookie.value);
}

function parseModuleValue(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).map((v) => v.trim()).filter(Boolean);
  }

  const raw = String(value).trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).map((v) => v.trim()).filter(Boolean);
  } catch {}

  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

function cleanModules(modules: string[]) {
  return Array.from(new Set(modules.map(String).map((v) => v.trim()).filter((v) => VALID_MODULES.has(v))));
}

async function fetchUserRoles(backendUrl: string, email: string, sid?: string): Promise<string[]> {
  if (!backendUrl) return [];
  if (email === "Administrator") return ["Administrator", "System Manager"];

  const filters = encodeURIComponent(JSON.stringify([["parent", "=", email], ["role", "in", ["Administrator", "System Manager"]]]));
  const fields = encodeURIComponent(JSON.stringify(["role"]));

  const headers: HeadersInit = {};
  if (sid) headers.Cookie = `sid=${sid}`;

  try {
    const res = await fetch(`${backendUrl}/api/resource/Has%20Role?filters=${filters}&fields=${fields}`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: { role?: string }[] };
    return (json.data || []).map((row) => row.role).filter(Boolean) as string[];
  } catch {
    return [];
  }
}

async function fetchTenantContext(site?: string, email?: string): Promise<TenantContext> {
  const cleanSite = normalizeSite(site);
  const fallbackPlan = "Starter";
  const fallbackModules = getModulesForPlan(fallbackPlan);

  if (!MASTER_ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
    return {
      companyName: companyFromSite(site),
      plan: fallbackPlan,
      modules: fallbackModules,
    };
  }

  const headers: HeadersInit = {
    Authorization: `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
  };

  const fields = encodeURIComponent(JSON.stringify([
    "name",
    "company_name",
    "site_name",
    "email",
    "plan",
    "subscription_plan",
    "requested_module",
    "requested_modules",
    "selected_modules",
    "modules",
  ]));

  const filterCandidates = [
    cleanSite ? [["site_name", "=", cleanSite]] : null,
    email ? [["email", "=", email]] : null,
  ].filter(Boolean) as unknown[][];

  for (const filtersRaw of filterCandidates) {
    try {
      const filters = encodeURIComponent(JSON.stringify(filtersRaw));
      const res = await fetch(
        `${MASTER_ERPNEXT_URL}/api/resource/Fuze%20SaaS%20Tenant?filters=${filters}&fields=${fields}&limit_page_length=1`,
        { headers, cache: "no-store" }
      );

      if (!res.ok) continue;

      const json = (await res.json()) as { data?: Record<string, unknown>[] };
      const tenant = json.data?.[0];
      if (!tenant) continue;

      const tenantId = String(tenant.name || "");
      const plan = String(tenant.plan || tenant.subscription_plan || fallbackPlan).trim() || fallbackPlan;
      const companyName = String(tenant.company_name || companyFromSite(site));

      let modules = cleanModules([
        ...parseModuleValue(tenant.selected_modules),
        ...parseModuleValue(tenant.requested_modules),
        ...parseModuleValue(tenant.requested_module),
        ...parseModuleValue(tenant.modules),
      ]);

      if (!modules.length && tenantId) {
        const childFilters = encodeURIComponent(JSON.stringify([["parent", "=", tenantId]]));
        const childFields = encodeURIComponent(JSON.stringify(["module", "module_key", "saas_module", "enabled"]));
        const childRes = await fetch(
          `${MASTER_ERPNEXT_URL}/api/resource/Fuze%20SaaS%20Tenant%20Module?filters=${childFilters}&fields=${childFields}&limit_page_length=100`,
          { headers, cache: "no-store" }
        );
        if (childRes.ok) {
          const childJson = (await childRes.json()) as { data?: Record<string, unknown>[] };
          modules = cleanModules(
            (childJson.data || [])
              .filter((row) => row.enabled === undefined || Number(row.enabled) === 1)
              .map((row) => row.module_key || row.module || row.saas_module)
              .map(String)
          );
        }
      }

      if (!modules.length) modules = getModulesForPlan(plan);
      if (!modules.length) modules = fallbackModules;

      return {
        tenantId,
        companyName,
        plan,
        modules,
      };
    } catch {
      continue;
    }
  }

  return {
    companyName: companyFromSite(site),
    plan: fallbackPlan,
    modules: fallbackModules,
  };
}

export async function POST(req: Request) {
  try {
    const { email, password, site } = (await req.json()) as LoginBody;
    const backendUrl = normalizeBackendUrl(site);
    const cleanSite = normalizeSite(site);

    if (!backendUrl) return jsonError("Missing Business Suite backend URL.", 500);
    if (!email || !password) return jsonError("Email and password are required.", 400);

    const loginRes = await fetch(`${backendUrl}/api/method/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ usr: email, pwd: password }),
      cache: "no-store",
      redirect: "manual",
    });

    const text = await loginRes.text();
    let loginJson: unknown = {};
    try {
      loginJson = text ? JSON.parse(text) : {};
    } catch {
      loginJson = { raw: text };
    }

    const parsedCookies = parseSetCookieHeader(loginRes.headers.get("set-cookie"));
    const sid = parsedCookies.find((cookie) => cookie.name === "sid")?.value;
    const userId = parsedCookies.find((cookie) => cookie.name === "user_id")?.value || email;
    const fullName = parsedCookies.find((cookie) => cookie.name === "full_name")?.value || email;

    if (!loginRes.ok || !sid) {
      return NextResponse.json(
        { success: false, error: "Login failed. Check your email and password.", details: loginJson },
        { status: 401 }
      );
    }

    const roles = await fetchUserRoles(backendUrl, email, sid);
    const isAdmin =
      email === "Administrator" ||
      ADMIN_EMAILS.includes(email.toLowerCase()) ||
      roles.includes("Administrator") ||
      roles.includes("System Manager");

    const tenant = isAdmin
      ? {
          companyName: "Fuze Business Suite",
          plan: "Business Pro",
          modules: ALL_MODULES.map((module) => module.id),
        }
      : await fetchTenantContext(cleanSite, email);

    const response = NextResponse.json({
      success: true,
      role: isAdmin ? "admin" : "customer",
      redirectTo: isAdmin ? "/admin" : "/portal",
      site: cleanSite,
      backendUrl,
      user: { email, full_name: decodeURIComponent(fullName), roles },
      tenant,
    });

    const secure = process.env.NODE_ENV === "production";
    const common = { httpOnly: false, sameSite: "lax" as const, secure, path: "/", maxAge: 60 * 60 * 24 };
    const long = { ...common, maxAge: 365 * 86400 };

    response.cookies.set("sid", sid, common);
    response.cookies.set("user_id", userId, common);
    response.cookies.set("full_name", fullName, common);
    response.cookies.set("tenant_site", cleanSite, long);
    response.cookies.set("tenant_backend", backendUrl, long);
    response.cookies.set(TENANT_COOKIE, tenant.tenantId || cleanSite, long);
    response.cookies.set(ROLE_COOKIE, isAdmin ? "admin" : "customer", common);
    response.cookies.set(PLAN_COOKIE, tenant.plan, common);
    response.cookies.set(COMPANY_COOKIE, encodeURIComponent(tenant.companyName), common);
    response.cookies.set(MODULE_COOKIE, encodeURIComponent(JSON.stringify(tenant.modules)), common);

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unexpected login error." }, { status: 500 });
  }
}
