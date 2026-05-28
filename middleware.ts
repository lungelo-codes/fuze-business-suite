import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getModulesForPlan } from "@/lib/modules";
import { moduleIsActive, parseCookieModules, resolveModuleForPath } from "@/lib/saasAccess";

const PUBLIC_PATHS = [
  "/", "/login", "/signup", "/pricing", "/features", "/about", "/contact",
  "/api/auth/login", "/api/auth/logout", "/api/auth/verify", "/api/signup",
];

const ALWAYS_ALLOWED_PORTAL_PATHS = [
  "/portal", "/portal/notifications", "/portal/business-profile", "/portal/modules", "/portal/billing", "/portal/settings", "/portal/qa",
];

function pathMatches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/");
}

function parseActiveModules(request: NextRequest): string[] {
  const plan = request.cookies.get("fuze_plan")?.value || "Starter";
  const modules = parseCookieModules(request.cookies.get("fuze_modules")?.value);
  return modules.length ? modules : getModulesForPlan(plan);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") || pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/payfast") || pathname.startsWith("/api/support/create")
  ) return NextResponse.next();

  if (pathname.startsWith("/admin")) {
    const role = request.cookies.get("fuze_role")?.value;
    if (role !== "admin") {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("reason", "admin_required");
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal") || pathname.startsWith("/customer-portal")) {
    const sid = request.cookies.get("sid")?.value;
    const userId = request.cookies.get("user_id")?.value;
    if (!sid && !userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/portal") && ALWAYS_ALLOWED_PORTAL_PATHS.some((path) => pathMatches(pathname, path))) {
      return NextResponse.next();
    }

    const requiredModule = resolveModuleForPath(pathname);
    if (requiredModule) {
      const activeModules = parseActiveModules(request);
      if (!moduleIsActive(activeModules, requiredModule)) {
        const billingUrl = new URL("/portal/billing", request.url);
        billingUrl.searchParams.set("upgrade", requiredModule);
        billingUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(billingUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
