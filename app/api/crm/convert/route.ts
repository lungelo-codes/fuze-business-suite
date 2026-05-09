import { erpMethod, erpPatch, BusinessSuiteError } from "@/lib/server/erpnext";

export async function POST(request: Request) {
  try {
    const { lead } = await request.json() as { lead?: string };

    if (!lead) {
      return Response.json({ success: false, error: "lead name is required" }, { status: 400 });
    }

    // ERPNext server-side method that creates a Customer from a Lead document
    // and links them via lead.customer field
    const customer = await erpMethod<Record<string, unknown>>(
      "erpnext.crm.doctype.lead.lead.make_customer",
      { source_name: lead }
    );

    if (!customer) {
      return Response.json({ success: false, error: "ERPNext did not return a customer record" }, { status: 500 });
    }

    // Mark the lead as Converted
    await erpPatch("Lead", lead, { status: "Converted" }).catch(() => null);

    const customerName = String(customer.name || customer.customer_name || lead);

    return Response.json({
      success: true,
      customer: customerName,
      data: customer,
      message: `Lead converted. Customer "${customerName}" is ready for quotes and invoices.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to convert lead";
    return Response.json(
      { success: false, error: message },
      { status: error instanceof BusinessSuiteError ? error.status : 500 }
    );
  }
}
