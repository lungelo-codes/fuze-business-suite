import { fuzeData } from "@/lib/server/fuzeApi";
export async function GET() {
  const [pipeline, leads] = await Promise.all([
    fuzeData("fuze_suite.api.crm.get_pipeline", {}, {}),
    fuzeData("fuze_suite.api.crm.get_leads", {}, {}),
  ]);
  return Response.json({ success: true, data: { pipeline, leads }, message: "Loaded from controlled Fuze CRM API" });
}
