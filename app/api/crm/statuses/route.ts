import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * GET /api/crm/statuses?type=lead|deal
 * Returns the ordered status list for leads or deals from the backend master.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "lead";

  try {
    const method = type === "deal" ? "fuze_suite.api.crm.get_deal_statuses" : "fuze_suite.api.crm.get_lead_statuses";
    const result = await erpMethod(method, {});
    return NextResponse.json(result);
  } catch (error: any) {
    // Return static fallbacks if the backend method fails
    if (type === "deal") {
      return NextResponse.json({
        statuses: [
          { name: "Prospecting",        color: "blue",   position: 1 },
          { name: "Qualification",      color: "yellow", position: 2 },
          { name: "Needs Analysis",     color: "orange", position: 3 },
          { name: "Proposal/Quotation", color: "orange", position: 3 },
          { name: "Negotiation",        color: "purple", position: 4 },
          { name: "Ready to Close",     color: "teal",   position: 5 },
          { name: "Won",                color: "green",  position: 6 },
          { name: "Lost",               color: "red",    position: 7 },
        ],
      });
    }
    return NextResponse.json({
      statuses: [
        { name: "New",            color: "blue",   position: 1 },
        { name: "Open",           color: "yellow", position: 2 },
        { name: "Contacted",      color: "orange", position: 3 },
        { name: "Replied",        color: "purple", position: 4 },
        { name: "Qualified",      color: "green",  position: 5 },
        { name: "Unqualified",    color: "red",    position: 6 },
        { name: "Converted",      color: "teal",   position: 7 },
        { name: "Do Not Contact", color: "gray",   position: 8 },
      ],
    });
  }
}
