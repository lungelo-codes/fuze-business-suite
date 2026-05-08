import { NextResponse } from "next/server";
import { erpList } from "@/lib/server/erpnext";

interface Tenant {
  name: string;
  status: string;
  site_name: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant");

    if (!tenant) {
      return NextResponse.json({ ready: false, status: "Unknown" });
    }

    const rows = await erpList<Tenant>("Fuze SaaS Tenant", {
      fields: ["name", "status", "site_name"],
      filters: [["name", "=", tenant]],
      limit: 1,
    });

    const doc = rows[0];
    if (!doc) {
      return NextResponse.json({ ready: false, status: "Not Found" });
    }

    return NextResponse.json({
      ready: doc.status === "Active",
      status: doc.status,
      site_name: doc.site_name,
    });
  } catch {
    return NextResponse.json({ ready: false, status: "Unknown" });
  }
}