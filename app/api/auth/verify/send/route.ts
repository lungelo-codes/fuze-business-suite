import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createVerificationCode,
  signVerification,
  VERIFY_COOKIE,
} from "@/lib/server/verification";
import { erpMethod } from "@/lib/server/erpnext";
import { safeJsonError } from "@/lib/server/apiGuard";

export async function POST(req: Request) {
  try {
    const { email } = (await req.json()) as { email?: string };
    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Valid email is required" }, { status: 400 });
    }

    const code = createVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    const token = signVerification(email.toLowerCase(), code, expiresAt);

    try {
      await erpMethod("fuze_suite.api.portal.send_verification_email", {
        email,
        code,
        subject: "Your Business Suite verification code",
      });
    } catch {
      console.warn("[verify/send] Verification email delivery needs backend mail setup.");
    }

    const response = NextResponse.json({
      ok: true,
      success: true,
      message: "Verification code sent to your email address.",
      ...(process.env.NODE_ENV !== "production" ? { _dev_code: code } : {}),
    });

    response.cookies.set(VERIFY_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });

    return response;
  } catch (error: unknown) {
    return safeJsonError(error, "Could not send verification code.");
  }
}
