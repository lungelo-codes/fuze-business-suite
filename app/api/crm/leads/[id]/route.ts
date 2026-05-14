import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Params = { params: { id: string } };

/**
 * GET    /api/crm/leads/[id]  – full lead with comms, notes, tasks, call logs
 * PUT    /api/crm/leads/[id]  – partial update
 * DELETE /api/crm/leads/[id]  – delete lead
 */

export async function GET(_req: Request, { params }: Params) {
  try {
    const result = await erpMethod("crm.get_lead", { lead: params.id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Lead not found" },
      { status: 404 }
    );
  }
}

export async function PUT(req: Request, { params }: Params) {
  try {
    const body = await req.json();
    const result = await erpMethod("crm.update_lead", { lead: params.id, data: body });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const result = await erpMethod("crm.delete_lead", { lead: params.id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to delete lead" },
      { status: 500 }
    );
  }
}
