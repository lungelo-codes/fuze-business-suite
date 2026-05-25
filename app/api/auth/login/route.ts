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

async function backendMethod<T>(backendUrl: string, method: string, body: Record<string, unknown>, sid?: string): Promise<T | null> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (sid) headers.Cookie = `sid=${sid}`;
  else if (ERPNEXT_API_KEY && ERPNEXT_API_SECRET) headers.Authorization = `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`;
  const candidates = [`fuze_suite.api.${method}`, method];
  for (const candidate of candidates) {
    try {
      const res = await fetch(`${backendUrl}/api/method/${candidate}`, { method: "POST", headers, body: JSON.stringify(body), cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      return (json.message ?? json.data ?? json) as T;
    } catch {}
  }
  return null;
}

async function fetchUserRoles(backendUrl: string, email: string, sid?: string): Promise<string[]> {
  if (!backendUrl) return [];
  if (email === "Administrator") return ["Administrator", "System Manager"];
  const result = await backendMethod<unknown>(backendUrl, "business_crud.get_user_roles", { email }, sid);
  const rows = Array.isArray(result) ? result : Array.isArray((result as any)?.data) ? (result as any).data : [];
  return rows.map(String).filter(Boolean);
}

async function fetchTenantContext(site?: string, email?: string): Promise<TenantContext> {
  const cleanSite = normalizeSite(site);
  // FIX: Do NOT default to "Starter" here — use null sentinel so the
  // caller can decide whether the backend actually returned a plan.
  const fallbackPlan = "Starter";
  const fallbackModules = getModulesForPlan(fallbackPlan);

  if (!MASTER_ERPNEXT_URL || !ERPNEXT_API_KEY || !ERPNEXT_API_SECRET) {
    // No backend configured — keep whatever plan the user had (caller
    // will merge with existing cookie; here we just signal "unknown").
    return { companyName: companyFromSite(site), plan: fallbackPlan, modules: fallbackModules };
  }

  const result = await backendMethod<any>(MASTER_ERPNEXT_URL, "business_crud.get_tenant_context", { site: cleanSite, email });

  // FIX: If the backend returned nothing at all (network error, method
  // missing, etc.) return a sentinel that tells the caller the plan is
  // unknown — we must NOT silently reset to "Starter".
  if (!result) {
    return { companyName: companyFromSite(site), plan: "__UNKNOWN__", modules: [] };
  }

  const tenant = result?.tenant || result?.data?.tenant || {};
  const tenantId = String(tenant.name || "");
  const rawPlan = String(tenant.plan || tenant.subscription_plan || "").trim();
  // FIX: Only use fallback plan when the backend explicitly has no plan
  // field (new tenant). Never silently downgrade a returning user.
  const plan = rawPlan || fallbackPlan;
  const companyName = String(tenant.company_name || companyFromSite(site));
  let modules = cleanModules([
    ...parseModuleValue(tenant.selected_modules),
    ...parseModuleValue(tenant.requested_modules),
    ...parseModuleValue(tenant.requested_module),
    ...parseModuleValue(tenant.modules),
    ...((Array.isArray(result?.modules) ? result.modules : Array.isArray(result?.data?.modules) ? result.data.modules : []) as unknown[]).map(String),
  ]);
  if (!modules.length) modules = getModulesForPlan(plan);
  if (!modules.length) modules = fallbackModules;
  return { tenantId, companyName, plan, modules };
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

    const rawTenant = isAdmin
      ? {
          companyName: "Fuze Business Suite",
          plan: "Business Pro",
          modules: ALL_MODULES.map((module) => module.id),
        }
      : await fetchTenantContext(cleanSite, email);

    // FIX: If the backend lookup failed (__UNKNOWN__ sentinel), read the
    // existing plan/modules cookies from the incoming request and keep
    // them — this prevents a failed backend call from resetting the user
    // back to Starter on every login.
    let finalPlan = rawTenant.plan;
    let finalModules = rawTenant.modules;

    if (finalPlan === "__UNKNOWN__") {
      const incomingCookies = req.headers.get("cookie") || "";
      const planMatch = incomingCookies.match(new RegExp(`${PLAN_COOKIE}=([^;]+)`));
      const moduleMatch = incomingCookies.match(new RegExp(`${MODULE_COOKIE}=([^;]+)`));
      if (planMatch?.[1]) {
        try { finalPlan = decodeURIComponent(planMatch[1]); } catch { finalPlan = "Starter"; }
      } else {
        finalPlan = "Starter";
      }
      if (moduleMatch?.[1]) {
        try {
          const parsed = JSON.parse(decodeURIComponent(moduleMatch[1]));
          finalModules = Array.isArray(parsed) ? parsed : getModulesForPlan(finalPlan);
        } catch { finalModules = getModulesForPlan(finalPlan); }
      } else {
        finalModules = getModulesForPlan(finalPlan);
      }
    }

    const tenant = { ...rawTenant, plan: finalPlan, modules: finalModules };

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
    // FIX: Plan and module cookies must outlive the session cookie so
    // that even if the backend lookup fails the user's chosen plan is
    // preserved. Use a long-lived expiry (365 days) consistent with
    // how tenant_site and tenant_backend are stored.
    const long = { ...common, maxAge: 365 * 86400 };

    response.cookies.set("sid", sid, common);
    response.cookies.set("user_id", userId, common);
    response.cookies.set("full_name", fullName, common);
    response.cookies.set("tenant_site", cleanSite, long);
    response.cookies.set("tenant_backend", backendUrl, long);
    response.cookies.set(TENANT_COOKIE, tenant.tenantId || cleanSite, long);
    response.cookies.set(ROLE_COOKIE, isAdmin ? "admin" : "customer", common);
    // FIX: Store plan and modules with long expiry so they survive
    // logout/login cycles where the backend may be unreachable.
    response.cookies.set(PLAN_COOKIE, tenant.plan, long);
    response.cookies.set(COMPANY_COOKIE, encodeURIComponent(tenant.companyName), long);
    response.cookies.set(MODULE_COOKIE, encodeURIComponent(JSON.stringify(tenant.modules)), long);

    return response;
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unexpected login error." }, { status: 500 });
  }
}
