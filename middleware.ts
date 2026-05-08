import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/pricing",
  "/features",
  "/about",
  "/contact",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/verify",
  "/api/signup",
];

const MODULE_PATHS: Record<string, string[]> = {
  customers: ["/portal/customers"],
  invoices: ["/portal/invoices"],
  quotes: ["/portal/quotes"],
  payments: [
    "/portal/payments",
    "/portal/finance",
    "/portal/bank-reconciliation",
  ],
  compliance: [
    "/portal/compliance",
    "/portal/vat",
    "/portal/paye",
    "/portal/uif",
    "/portal/sdl",
    "/portal/cipc",
    "/portal/sars-profile",
    "/portal/company-compliance",
    "/portal/compliance-reminders",
  ],
  crm: ["/portal/crm"],
  leads: ["/portal/leads"],
  opportunities: ["/portal/opportunities"],
  "sales-orders": ["/portal/sales-orders"],
  contracts: ["/portal/contracts"],
  campaigns: ["/portal/campaigns"],
  suppliers: ["/portal/suppliers"],
  "purchase-orders": ["/portal/purchase-orders"],
  items: ["/portal/items", "/portal/inventory"],
  projects: ["/portal/projects"],
  tasks: ["/portal/tasks"],
  employees: ["/portal/employees", "/portal/hr"],
  payroll: ["/portal/payroll"],
  leave: ["/portal/leave"],
  attendance: ["/portal/attendance"],
  support: ["/portal/support"],
  chat: ["/portal/chat"],
  appointments: ["/portal/appointments"],
};

const ALWAYS_ALLOWED_PORTAL_PATHS = [
  "/portal",
  "/portal/settings",
  "/portal/business-profile",
  "/portal/modules",
  "/portal/billing",
  "/portal/reports",
  "/portal/notifications",
  "/portal/audit-trail",
];

function parseModules(raw?: string): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    return Array.isArray(parsed)
      ? parsed.map(String).map((v) => v.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function pathMatches(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(route + "/");
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/payfast") ||
    pathname.startsWith("/api/support/create")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin")) {
    const sid = request.cookies.get("sid")?.value;
    const userId = request.cookies.get("user_id")?.value;
    const role = request.cookies.get("fuze_role")?.value;

    if ((!sid && !userId) || role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "admin_required");
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    const sid = request.cookies.get("sid")?.value;
    const userId = request.cookies.get("user_id")?.value;

    if (!sid && !userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const role = request.cookies.get("fuze_role")?.value;
    if (role === "admin") return NextResponse.next();

    if (ALWAYS_ALLOWED_PORTAL_PATHS.some((p) => pathMatches(pathname, p))) {
      return NextResponse.next();
    }

    const activeModules = parseModules(request.cookies.get("fuze_modules")?.value);

    for (const [moduleId, paths] of Object.entries(MODULE_PATHS)) {
      if (paths.some((p) => pathMatches(pathname, p))) {
        if (!activeModules.includes(moduleId)) {
          const billingUrl = new URL("/portal/billing", request.url);
          billingUrl.searchParams.set("upgrade", moduleId);
          return NextResponse.redirect(billingUrl);
        }

        return NextResponse.next();
      }
    }

    const billingUrl = new URL("/portal/billing", request.url);
    billingUrl.searchParams.set("blocked", "unknown_module");
    return NextResponse.redirect(billingUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};