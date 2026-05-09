import { NextResponse } from "next/server";
import {
  createVerificationCode,
  signVerification,
  VERIFY_COOKIE,
} from "@/lib/server/verification";
import { erpMethod } from "@/lib/server/erpnext";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/server/rateLimit";

/**
 * POST /api/auth/forgot-password
 * Body: { email: string }
 *
 * Sends a 6-digit OTP to the address if it exists in ERPNext.
 * Always returns 200 to prevent email enumeration.
 */
export async function POST(req: Request) {
  // Rate limit: 5 requests per IP per 15 minutes
  const ip = getClientIp(req);
  const rl = rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  const { email } = (await req.json().catch(() => ({}))) as { email?: string };

  // Always return the same message — never reveal whether the email exists
  const ok = NextResponse.json({
    success: true,
    message: "If that email exists, a reset code has been sent.",
  });

  if (!email || !email.includes("@")) return ok;

  try {
    const code = createVerificationCode();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    const token = signVerification(email.toLowerCase(), code, expiresAt);

    // Send OTP email via ERPNext
    try {
      await erpMethod("frappe.core.doctype.communication.email.make", {
        recipients: email,
        subject: "Fuze Business Suite — password reset code",
        content: `
          <p>You requested a password reset for your Fuze Business Suite account.</p>
          <p>Your one-time reset code is:</p>
          <h2 style="letter-spacing:8px;font-size:36px;font-weight:900;font-family:monospace;">${code}</h2>
          <p>This code expires in <strong>15 minutes</strong>.</p>
          <p>If you did not request a reset, you can safely ignore this email — your password has not changed.</p>
        `,
        send_email: 1,
      });
    } catch {
      // Log in dev; don't expose failure to client
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[forgot-password] Email send failed — OTP for ${email}: ${code}`);
      }
    }

    ok.cookies.set(`${VERIFY_COOKIE}_reset`, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ success: true, message: "Reset code sent.", _dev_code: code });
    }

    return ok;
  } catch {
    return ok; // Never reveal server errors — always 200
  }
}
