import { fuzeData } from "@/lib/server/fuzeApi";
export async function GET() {
  const data = await fuzeData("fuze_suite.api.compliance.get_compliance_dashboard", {}, {});
  return Response.json({ success: true, data });
}
