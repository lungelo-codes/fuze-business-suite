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

// Module ID → portal path mapping for access control
const MODULE_PATHS: Record<string, string> = {
  "invoices":        "/portal/invoices",
  "quotes":          "/portal/quotes",
  "payments":        "/portal/payments",
  "customers":       "/portal/customers",
  "contacts":        "/portal/contacts",
  "compliance":      "/portal/compliance",
  "suppliers":       "/portal/suppliers",
  "purchase-orders": "/portal/purchase-orders",
  "items":           "/portal/items",
  "documents":       "/portal/documents",
  "projects":        "/portal/projects",
  "tasks":           "/portal/tasks",
  "employees":       "/portal/employees",
  "payroll":         "/portal/payroll",
  "leave":           "/portal/leave",
  "attendance":      "/portal/attendance",
  "support":         "/portal/support",
  "chat":            "/portal/chat",
  "appointments":    "/portal/appointments",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/payfast") ||
    pathname.startsWith("/api/support/create")
  ) {
    return NextResponse.next();
  }

  // Protect /portal routes — require ERPNext session
  if (pathname.startsWith("/portal")) {
    const sid = request.cookies.get("sid")?.value;
    const userId = request.cookies.get("user_id")?.value;

    if (!sid && !userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Module access guard — check if user has access to this module path
    const modulesCookie = request.cookies.get("fuze_modules")?.value;
    if (modulesCookie) {
      try {
        const activeModules: string[] = JSON.parse(decodeURIComponent(modulesCookie));
        if (activeModules.length > 0) {
          for (const [moduleId, modulePath] of Object.entries(MODULE_PATHS)) {
            if (pathname.startsWith(modulePath) && !activeModules.includes(moduleId)) {
              // Redirect to billing with upgrade prompt
              const billingUrl = new URL("/portal/billing", request.url);
              billingUrl.searchParams.set("upgrade", moduleId);
              return NextResponse.redirect(billingUrl);
            }
          }
        }
      } catch {
        // Invalid cookie — allow access
      }
    }
  }

  // Admin routes require admin role cookie
  if (pathname.startsWith("/admin")) {
    const role = request.cookies.get("fuze_role")?.value;
    if (role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "admin_required");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
