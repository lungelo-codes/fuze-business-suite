import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET /api/crm/sources
 * Returns the list of lead source options from the backend.
 */
export async function GET() {
  try {
    const result = await erpMethod("fuze_suite.api.crm.get_lead_sources", {});
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      sources: [
        "Website", "Email", "Phone", "Referral",
        "Social Media", "Campaign", "Advertisement", "Walk In", "Other",
      ],
    });
  }
}
