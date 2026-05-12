import { NextResponse } from "next/server";
import { compListTasks, compCreateTask, compListReminders } from "@/lib/server/apiClient";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const company = searchParams.get("company") || undefined;
    const status = searchParams.get("status") || undefined;
    const task_type = searchParams.get("task_type") || undefined;
    const type = searchParams.get("type") || "tasks";
    const limit = Number(searchParams.get("limit") || 50);
    const offset = Number(searchParams.get("offset") || 0);

    if (type === "reminders") {
      const data = await compListReminders(company, limit);
      return NextResponse.json(data);
    }

    const data = await compListTasks({ company, status, task_type, limit, offset });
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await compCreateTask(body);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
