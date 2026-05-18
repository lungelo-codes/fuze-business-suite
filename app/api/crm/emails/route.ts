import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET  /api/crm/emails?reference_doctype=CRM Lead&reference_name=CRM-LEAD-0001
 *   → lists communications (crm.get_communications)
 *
 * POST /api/crm/emails
 *   body: { reference_doctype, reference_name, to, subject, content, template?, cc?, bcc? }
 *   → sends email (crm.send_email)
 */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reference_doctype = searchParams.get("reference_doctype");
  const reference_name    = searchParams.get("reference_name");
  const limit  = searchParams.get("limit");
  const offset = searchParams.get("offset");

  if (!reference_doctype || !reference_name) {
    return NextResponse.json({ error: "reference_doctype and reference_name are required" }, { status: 400 });
  }

  try {
    const args: Record<string, string | number> = { reference_doctype, reference_name };
    if (limit)  args.limit  = Number(limit);
    if (offset) args.offset = Number(offset);

    const result = await erpMethod("fuze_suite.api.crm.get_communications", args);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch communications" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference_doctype, reference_name, to, subject, content, template, cc, bcc } = body;

    if (!reference_doctype || !reference_name || !to || !subject || !content) {
      return NextResponse.json(
        { error: "reference_doctype, reference_name, to, subject, and content are required" },
        { status: 400 }
      );
    }

    const result = await erpMethod("fuze_suite.api.crm.send_email", {
      reference_doctype,
      reference_name,
      to,
      subject,
      content,
      template: template || null,
      cc: cc || null,
      bcc: bcc || null,
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
