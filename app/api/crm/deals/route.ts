import { fuzeData } from "@/lib/server/fuzeApi";
export async function GET() {
  const data = await fuzeData("fuze_suite.api.crm.get_pipeline", {}, {});
  return Response.json({ success: true, data });
}
export async function POST() {
  return Response.json({ success: false, error: "Deal updates must go through fuze_suite.api.crm." }, { status: 501 });
}
