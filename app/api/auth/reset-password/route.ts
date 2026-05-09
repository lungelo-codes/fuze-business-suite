import { NextResponse } from "next/server";
import { verifySignedCode, VERIFY_COOKIE } from "@/lib/server/verification";
import { erpMethod } from "@/lib/server/erpnext";
import { cookies } from "next/headers";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/server/rateLimit";

/**
 * POST /api/auth/reset-password
 * Body: { email, code, newPassword }
 *
 * Verifies the OTP then calls ERPNext to update the user password.
 */
export async function POST(req: Request) {
  // Strict rate limit on the verify step — 10 per IP per 15 min
  const ip = getClientIp(req);
  const rl = rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { email, code, newPassword } = (await req.json()) as {
      email?: string;
      code?: string;
      newPassword?: string;
    };

    if (!email || !code || !newPassword) {
      return NextResponse.json({ error: "Email, code and new password are required." }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const cookieStore = cookies();
    const token = cookieStore.get(`${VERIFY_COOKIE}_reset`)?.value;

    const valid = verifySignedCode(token, email, code);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid or expired reset code. Please request a new one." },
        { status: 400 }
      );
    }

    // Try Frappe's built-in reset (doesn't need old password, uses admin token)
    try {
      await erpMethod("frappe.core.doctype.user.user.update_password", {
        new_password: newPassword,
        key: "", // Admin API key bypasses the key requirement
        user: email.toLowerCase(),
      });
    } catch {
      // Fallback: use the Fuze custom method
      await erpMethod("fuze_suite.api.portal.admin_reset_password", {
        email: email.toLowerCase(),
        new_password: newPassword,
      });
    }

    const response = NextResponse.json({
      success: true,
      message: "Password updated. You can now log in.",
    });

    // Clear the reset cookie
    response.cookies.set(`${VERIFY_COOKIE}_reset`, "", { path: "/", maxAge: 0 });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Password reset failed." },
      { status: 500 }
    );
  }
}
