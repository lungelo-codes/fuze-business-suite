/**
 * /api/crm/quote-send
 * Creates a Quotation linked to a CRM lead/opportunity and optionally emails it.
 */
import { NextResponse } from "next/server";
import { erpCreate, erpMethod } from "@/lib/server/erpnext";
import { validateQuote, assertValid } from "@/lib/businessLogic";

function today() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      customer_name?: string;
      party_name?: string;
      email?: string;
      items?: Array<{ item_code: string; qty: number; rate: number; description?: string }>;
      valid_till?: string;
      send_email?: boolean;
      lead_name?: string;
      opportunity_name?: string;
      notes?: string;
    };

    const partyName =
      body.customer_name || body.party_name || "Unknown Customer";

    // Run business logic validation
    assertValid(validateQuote({ customer_name: partyName, items: body.items }));

    const items = (body.items || []).length
      ? body.items!.map((i) => ({
          item_code: i.item_code || "Consulting Service",
          item_name: i.item_code || "Consulting Service",
          description: i.description || i.item_code || "Consulting Service",
          qty: Number(i.qty || 1),
          rate: Number(i.rate || 0),
          uom: "Nos",
        }))
      : [
          {
            item_code: "Consulting Service",
            item_name: "Consulting Service",
            description: "Consulting Service",
            qty: 1,
            rate: 0,
            uom: "Nos",
          },
        ];

    // Business logic: validate required fields
    if (!partyName || partyName === "Unknown Customer") {
      return NextResponse.json(
        { error: "Customer or party name is required to create a quote" },
        { status: 400 }
      );
    }

    const quotationDoc: Record<string, unknown> = {
      doctype: "Quotation",
      quotation_to: "Customer",
      party_name: partyName,
      transaction_date: today(),
      valid_till: body.valid_till || today(),
      order_type: "Sales",
      items,
    };

    if (body.notes) {
      quotationDoc.terms = body.notes;
    }

    // Link to lead/opportunity if provided
    if (body.lead_name) {
      quotationDoc.lead = body.lead_name;
    }
    if (body.opportunity_name) {
      quotationDoc.opportunity = body.opportunity_name;
    }

    const quote = await erpCreate<Record<string, unknown>>(
      "Quotation",
      quotationDoc
    );
    const quoteName = String(quote.name || "");

    // Send email if requested and email is provided
    if (body.send_email && body.email && quoteName) {
      try {
        await erpMethod("frappe.email.doctype.email_template.email_template.send_email", {
          doctype: "Quotation",
          name: quoteName,
          recipients: body.email,
          subject: `Quotation ${quoteName}`,
          message: `Please find your quotation ${quoteName} attached.`,
          send_email: 1,
          print_format: "Standard",
        });
      } catch {
        // Email sending is best-effort; don't fail the whole request
      }
    }

    return NextResponse.json({
      success: true,
      quote_name: quoteName,
      message: body.send_email
        ? `Quote ${quoteName} created and email sent to ${body.email}`
        : `Quote ${quoteName} created successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create quotation",
      },
      { status: 500 }
    );
  }
}
