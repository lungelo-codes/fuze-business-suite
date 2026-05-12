import { NextResponse } from "next/server";
import { erpList } from "@/lib/server/erpnext";

export async function GET() {
  try {
    const data = await erpList("Leave Allocation", {
      fields: [
        "name", "employee", "employee_name", "leave_type",
        "from_date", "to_date", "new_leaves_allocated",
        "total_leaves_allocated", "modified",
      ],
      limit: 100,
      orderBy: "from_date desc",
    });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
