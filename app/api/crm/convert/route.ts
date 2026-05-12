/**
 * /api/crm/convert
 * Business logic for CRM lifecycle conversions:
 *   - Lead → Opportunity
 *   - Lead/Opportunity → Customer
 *   - Opportunity → Won (with optional invoice creation)
 */
import { NextResponse } from "next/server";
import { erpCreate, erpPatch, erpMethod } from "@/lib/server/erpnext";

function today() {
  return new Date().toISOString().split("T")[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      action: "lead_to_opportunity" | "lead_to_customer" | "opportunity_to_customer" | "mark_won" | "mark_lost";
      lead_name?: string;
      opportunity_name?: string;
      customer_name?: string;
      company_name?: string;
      email?: string;
      phone?: string;
      opportunity_amount?: number;
      expected_closing?: string;
      reason_lost?: string;
    };

    if (!body.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    // ── Lead → Opportunity ────────────────────────────────────────────────
    if (body.action === "lead_to_opportunity") {
      if (!body.lead_name) {
        return NextResponse.json({ error: "lead_name is required" }, { status: 400 });
      }

      // Mark lead as Converted
      await erpPatch("Lead", body.lead_name, { status: "Converted" }).catch(() => {});

      // Create Opportunity
      const opp = await erpCreate<Record<string, unknown>>("Opportunity", {
        opportunity_from: "Lead",
        party_name: body.lead_name,
        lead: body.lead_name,
        status: "Open",
        opportunity_amount: body.opportunity_amount || 0,
        expected_closing: body.expected_closing || today(),
        sales_stage: "Prospecting",
      });

      return NextResponse.json({
        success: true,
        action: "lead_to_opportunity",
        opportunity_name: opp.name,
        message: `Lead converted to Opportunity ${opp.name}`,
      });
    }

    // ── Lead/Opportunity → Customer ───────────────────────────────────────
    if (body.action === "lead_to_customer" || body.action === "opportunity_to_customer") {
      const name = body.customer_name || body.company_name;
      if (!name) {
        return NextResponse.json(
          { error: "customer_name or company_name is required to create a customer" },
          { status: 400 }
        );
      }

      // Try native ERPNext lead-to-customer conversion first
      if (body.lead_name) {
        try {
          const result = await erpMethod<Record<string, unknown>>(
            "erpnext.crm.doctype.lead.lead.make_customer",
            { source_name: body.lead_name }
          );
          if (result?.name) {
            await erpPatch("Lead", body.lead_name, { status: "Converted" }).catch(() => {});
            return NextResponse.json({
              success: true,
              action: "lead_to_customer",
              customer_name: result.name,
              message: `Lead converted to Customer ${result.name}`,
            });
          }
        } catch {
          // Fall through to manual creation
        }
      }

      // Manual customer creation
      const customer = await erpCreate<Record<string, unknown>>("Customer", {
        customer_name: name,
        customer_type: "Company",
        customer_group: "All Customer Groups",
        territory: "All Territories",
        email_id: body.email,
        mobile_no: body.phone,
      });

      // Mark lead/opportunity as converted
      if (body.lead_name) {
        await erpPatch("Lead", body.lead_name, { status: "Converted" }).catch(() => {});
      }
      if (body.opportunity_name) {
        await erpPatch("Opportunity", body.opportunity_name, { status: "Won" }).catch(() => {});
      }

      return NextResponse.json({
        success: true,
        action: body.action,
        customer_name: customer.name,
        message: `Customer ${customer.name} created successfully`,
      });
    }

    // ── Mark Opportunity as Won ───────────────────────────────────────────
    if (body.action === "mark_won") {
      if (!body.opportunity_name) {
        return NextResponse.json({ error: "opportunity_name is required" }, { status: 400 });
      }
      await erpPatch("Opportunity", body.opportunity_name, { status: "Won" });
      return NextResponse.json({
        success: true,
        action: "mark_won",
        message: `Opportunity ${body.opportunity_name} marked as Won`,
      });
    }

    // ── Mark Opportunity as Lost ──────────────────────────────────────────
    if (body.action === "mark_lost") {
      if (!body.opportunity_name) {
        return NextResponse.json({ error: "opportunity_name is required" }, { status: 400 });
      }
      await erpPatch("Opportunity", body.opportunity_name, {
        status: "Lost",
        lost_reasons: body.reason_lost ? [{ lost_reason: body.reason_lost }] : [],
      });
      return NextResponse.json({
        success: true,
        action: "mark_lost",
        message: `Opportunity ${body.opportunity_name} marked as Lost`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Conversion failed" },
      { status: 500 }
    );
  }
}
