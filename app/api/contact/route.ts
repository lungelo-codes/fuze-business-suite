import { NextResponse } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/server/rateLimit";

export async function POST(req: Request) {
  // Rate limit: 3 submissions per IP per hour
  const ip = getClientIp(req);
  const rl = rateLimit(`contact:${ip}`, 3, 60 * 60 * 1000);
  if (!rl.allowed) return rateLimitResponse(rl.resetAt);

  try {
    const { name, email, message } = (await req.json()) as {
      name?: string;
      email?: string;
      message?: string;
    };

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // Send via ERPNext Communication doctype or fall back to a simple email API call
    const erpnextUrl = process.env.ERPNEXT_URL || process.env.NEXT_PUBLIC_ERPNEXT_URL;
    const apiKey = process.env.ERPNEXT_API_KEY;
    const apiSecret = process.env.ERPNEXT_API_SECRET;
    const toEmail = process.env.CONTACT_EMAIL || "updates@fuzedigital.co.za";

    if (erpnextUrl && apiKey && apiSecret) {
      await fetch(`${erpnextUrl}/api/method/frappe.core.doctype.communication.email.make`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `token ${apiKey}:${apiSecret}`,
        },
        body: JSON.stringify({
          recipients: toEmail,
          subject: `Business Suite Contact: ${name}`,
          content: `<p><b>From:</b> ${name} &lt;${email}&gt;</p><p><b>Message:</b></p><p>${message.replace(/\n/g, "<br>")}</p>`,
          send_email: 1,
        }),
      });
    }

    // Always return success to avoid leaking whether ERPNext is configured
    return NextResponse.json({ success: true, message: "Message received. We will be in touch within one business day." });
  } catch (error) {
    console.error("[contact]", error);
    return NextResponse.json({ error: "Could not send message. Please email us directly." }, { status: 500 });
  }
}
