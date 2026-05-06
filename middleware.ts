import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/signup", "/pricing", "/features", "/about", "/contact", "/api/auth/login", "/api/auth/send-verification", "/api/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/payfast") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  // Protect /portal routes
  if (pathname.startsWith("/portal")) {
    const sid = request.cookies.get("sid")?.value;
    const userId = request.cookies.get("user_id")?.value;
    // ERPNext sets 'sid' and 'user_id' cookies on successful login
    if (!sid && !userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Admin routes require role cookie
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
