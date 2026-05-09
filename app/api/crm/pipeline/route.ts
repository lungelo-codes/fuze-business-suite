import { NextResponse } from "next/server";
import { fuzeData } from "@/lib/server/fuzeApi";

type Row = Record<string, unknown>;

export async function GET() {
  const [pipeline, leads] = await Promise.all([
    fuzeData<Row>("fuze_suite.api.crm.get_pipeline", {}, {}),
    fuzeData<Row>("fuze_suite.api.crm.get_leads", {}, {}),
  ]);
  return NextResponse.json({ success: true, data: { pipeline, leads } });
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: "Pipeline update must be added to fuze_suite.api.crm before the UI can change stages." },
    { status: 501 }
  );
}
