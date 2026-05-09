import { NextResponse } from "next/server";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
import { fuzeMethod } from "@/lib/server/fuzeApi";

const CREATE_METHODS: Record<string, string> = {
  leads: "fuze_suite.api.crm.create_lead",
  support: "fuze_suite.api.helpdesk.create_ticket",
  "helpdesk-tickets": "fuze_suite.api.helpdesk.create_ticket",
};

export async function GET(_req: Request, { params }: { params: { module: string } }) {
  const config = getCrudConfig(params.module);
  if (!config) return NextResponse.json({ error: "Unknown module" }, { status: 404 });
  const rows = await getCrudRows(params.module);
  return NextResponse.json({ data: rows, meta: { source: "fuze_suite_api", rawERPNext: false } });
}

export async function POST(req: Request, { params }: { params: { module: string } }) {
  const method = CREATE_METHODS[params.module];
  if (!method) {
    return NextResponse.json(
      { error: "Create is not yet enabled for this module in the controlled Fuze API layer." },
      { status: 501 }
    );
  }
  const body = await req.json().catch(() => ({}));
  const response = await fuzeMethod(method, { data: body });
  return NextResponse.json(response, { status: response.success === false ? 400 : 200 });
}
