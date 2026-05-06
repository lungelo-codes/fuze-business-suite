import { NextResponse } from "next/server";
import { erpList } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const data = await erpList("Attendance", {
      fields: [
        "name", "employee", "employee_name", "attendance_date",
        "status", "in_time", "out_time", "working_hours",
        "late_entry", "early_exit", "company", "modified",
      ],
      limit: 200,
      orderBy: "attendance_date desc",
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
