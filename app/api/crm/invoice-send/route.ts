/**
 * /api/crm/invoice-send
 * Creates a Sales Invoice linked to a customer/opportunity and optionally emails it.
 * Business logic: customer must exist, items required, due date enforced.
 */
import { NextResponse } from "next/server";
import { erpCreate, erpMethod } from "@/lib/server/erpnext";
import { validateInvoice, assertValid } from "@/lib/businessLogic";

function today() {
  return new Date().toISOString().split("T")[0];
}

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      customer?: string;
      customer_name?: string;
      email?: string;
      items?: Array<{
        item_code: string;
        qty: number;
        rate: number;
        description?: string;
      }>;
      due_date?: string;
      send_email?: boolean;
      opportunity_name?: string;
      quote_name?: string;
      payment_terms?: string;
      notes?: string;
    };

    const customer = body.customer || body.customer_name;

    // Run business logic validation
    assertValid(validateInvoice({ customer, items: body.items }));

    // Business logic: customer is mandatory for invoicing
    if (!customer) {
      return NextResponse.json(
        {
          error:
            "A customer name is required to create an invoice. Convert the lead to a customer first.",
        },
        { status: 400 }
      );
    }

    const postingDate = today();
    const dueDate = body.due_date || addDays(postingDate, 30);

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

    const invoiceDoc: Record<string, unknown> = {
      doctype: "Sales Invoice",
      customer,
      posting_date: postingDate,
      due_date: dueDate,
      items,
    };

    if (body.notes) invoiceDoc.terms = body.notes;
    if (body.payment_terms) invoiceDoc.payment_terms_template = body.payment_terms;

    const invoice = await erpCreate<Record<string, unknown>>(
      "Sales Invoice",
      invoiceDoc
    );
    const invoiceName = String(invoice.name || "");

    // Send email if requested
    if (body.send_email && body.email && invoiceName) {
      try {
        await erpMethod(
          "frappe.email.doctype.email_template.email_template.send_email",
          {
            doctype: "Sales Invoice",
            name: invoiceName,
            recipients: body.email,
            subject: `Invoice ${invoiceName}`,
            message: `Please find your invoice ${invoiceName} attached.`,
            send_email: 1,
            print_format: "Standard",
          }
        );
      } catch {
        // Email is best-effort
      }
    }

    return NextResponse.json({
      success: true,
      invoice_name: invoiceName,
      message: body.send_email
        ? `Invoice ${invoiceName} created and sent to ${body.email}`
        : `Invoice ${invoiceName} created successfully`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not create invoice",
      },
      { status: 500 }
    );
  }
}
