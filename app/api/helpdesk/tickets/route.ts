import { fuzeData, fuzeMethod } from "@/lib/server/fuzeApi";

export async function GET(): Promise<Response> {
  const data = await fuzeData("fuze_suite.api.helpdesk.get_tickets", {}, {});
  return Response.json({ success: true, data });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = await request.json();
    const response = await fuzeMethod("fuze_suite.api.helpdesk.create_ticket", { data: payload });
    return Response.json(response, { status: response.success === false ? 400 : 200 });
  } catch (error) {
    return Response.json({ success: false, error: error instanceof Error ? error.message : "Failed to create ticket" }, { status: 500 });
  }
}
