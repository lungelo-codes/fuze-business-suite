import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getModulesForPlan } from "@/lib/modules";
import { unsignValue } from "@/lib/server/signedCookie";

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

const ALWAYS_ALLOWED_PORTAL_PATHS = [
  "/portal",
  "/portal/reports",
  "/portal/notifications",
  "/portal/business-profile",
  "/portal/modules",
  "/portal/billing",
  "/portal/settings",
];

const MODULE_PATHS: Record<string, string[]> = {
  customers: ["/portal/customers", "/portal/contacts"],
  invoices: ["/portal/invoices"],
  quotes: ["/portal/quotes"],
  payments: ["/portal/payments", "/portal/finance", "/portal/bank-reconciliation"],
  compliance: ["/portal/compliance", "/portal/vat", "/portal/paye", "/portal/uif", "/portal/sdl", "/portal/cipc", "/portal/sars-profile", "/portal/company-compliance", "/portal/compliance-reminders"],
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
  documents: ["/portal/documents"],
  employees: [
    "/portal/employees",
    "/portal/hr",
    "/portal/recruitment",
    "/portal/job-openings",
    "/portal/job-applicants",
    "/portal/appraisals",
    "/portal/expense-claims",
    "/portal/hr-loans",
    "/portal/hr-transfers",
    "/portal/exit-interviews",
  ],
  payroll: [
    "/portal/payroll",
    "/portal/salary-components",
    "/portal/salary-structure",
    "/portal/salary-structure-assignment",
  ],
  leave: ["/portal/leave"],
  attendance: ["/portal/attendance", "/portal/hr-shifts", "/portal/hr-onboarding"],
  support: ["/portal/support"],
  helpdesk: ["/portal/helpdesk"],
  chat: ["/portal/chat"],
  appointments: ["/portal/appointments"],
  insights: ["/portal/insights"],
  accounting: ["/portal/accounting"],
};

function pathMatches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

function parseActiveModules(request: NextRequest): string[] {
  const plan = request.cookies.get("fuze_plan")?.value || "Starter";
  const signedModules = request.cookies.get("fuze_modules")?.value;

  if (signedModules) {
    // Reject the cookie if it has been tampered with
    const verified = unsignValue(signedModules);
    if (verified) {
      try {
        const parsed = JSON.parse(decodeURIComponent(verified));
        if (Array.isArray(parsed) && parsed.length) return parsed.map(String);
      } catch {}
    }
    // Cookie present but signature invalid — deny all modules, force re-login
    return [];
  }

  return getModulesForPlan(plan);
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
    const role = request.cookies.get("fuze_role")?.value;
    if (role !== "admin") {
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

    if (ALWAYS_ALLOWED_PORTAL_PATHS.some((path) => pathMatches(pathname, path))) {
      return NextResponse.next();
    }

    const activeModules = parseActiveModules(request);

    for (const [moduleId, paths] of Object.entries(MODULE_PATHS)) {
      if (paths.some((path) => pathMatches(pathname, path))) {
        if (!activeModules.includes(moduleId)) {
          const billingUrl = new URL("/portal/billing", request.url);
          billingUrl.searchParams.set("upgrade", moduleId);
          return NextResponse.redirect(billingUrl);
        }
        return NextResponse.next();
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
