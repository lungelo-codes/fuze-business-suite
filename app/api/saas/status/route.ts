import { NextResponse } from "next/server";
import { erpGet } from "@/lib/server/erpnext";

interface TenantDoc {
  status?: string;
  site_name?: string;
  trial_end?: string;
}

interface ERPResponse {
  data?: TenantDoc;
  message?: TenantDoc;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant = searchParams.get("tenant");

    if (!tenant) {
      return NextResponse.json({ error: "Missing tenant parameter" }, { status: 400 });
    }

    // Fetch the tenant doc directly from the Frappe resource API
    const res = await erpGet<ERPResponse>(
      `/api/resource/Fuze SaaS Tenant/${encodeURIComponent(tenant)}`
    );

    const doc: TenantDoc = res.data ?? res.message ?? {};
    const status = (doc.status ?? "").toLowerCase();
    const ready = status === "active";

    return NextResponse.json({
      ready,
      status: doc.status ?? "Unknown",
      site_name: doc.site_name ?? null,
      trial_end: doc.trial_end ?? null,
    });
  } catch (error) {
    // Return not-ready rather than an error — the poller will just retry
    return NextResponse.json(
      {
        ready: false,
        status: "Unknown",
        error: error instanceof Error ? error.message : "Could not check status",
      },
      { status: 200 } // intentional 200 so the frontend doesn't treat this as a fatal error
    );
  }
}