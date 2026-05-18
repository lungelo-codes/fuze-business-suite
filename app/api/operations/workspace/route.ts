import { NextResponse } from "next/server";
import { erpMethod } from "@/lib/server/erpnext";

type Any = Record<string, any>;

async function safe<T = Any>(method: string, args: Any = {}, fallback: T): Promise<T> {
  try {
    const res = await erpMethod<any>(method, args);
    return ((res as any)?.data ?? res ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const company = params.get("company") || undefined;
  const base = company ? { company } : {};

  const [procurement, projects, quality, data, suppliers, materialRequests, rfqs, supplierQuotes, purchaseOrders, receipts, projectRows, taskRows, timesheets, qualityGoals, qualityMeetings, qualityReviews, qualityActions, dataImports] = await Promise.all([
    safe("procurement.get_dashboard", base, {}),
    safe("projects.get_dashboard", base, {}),
    safe("quality.get_dashboard", base, {}),
    safe("data_management.get_dashboard", {}, {}),
    safe("procurement.get_suppliers", { limit: 25 }, { suppliers: [] }),
    safe("procurement.get_material_requests", { ...base, limit: 25 }, { material_requests: [] }),
    safe("procurement.get_request_for_quotations", { ...base, limit: 25 }, { rfqs: [] }),
    safe("procurement.get_supplier_quotations", { ...base, limit: 25 }, { supplier_quotations: [] }),
    safe("procurement.get_purchase_orders", { ...base, limit: 25 }, { purchase_orders: [] }),
    safe("procurement.get_purchase_receipts", { ...base, limit: 25 }, { receipts: [] }),
    safe("projects.get_projects", { ...base, limit: 25 }, { projects: [] }),
    safe("projects.get_tasks", { limit: 25 }, { tasks: [] }),
    safe("projects.get_timesheets", { ...base, limit: 25 }, { timesheets: [] }),
    safe("quality.get_quality_goals", { ...base, limit: 25 }, { quality_goals: [] }),
    safe("quality.get_quality_meetings", { ...base, limit: 25 }, { quality_meetings: [] }),
    safe("quality.get_quality_reviews", { ...base, limit: 25 }, { quality_reviews: [] }),
    safe("quality.get_quality_actions", { ...base, limit: 25 }, { quality_actions: [] }),
    safe("data_management.get_data_imports", { limit: 25 }, { data_imports: [] }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      dashboards: { procurement, projects, quality, data },
      procurement: {
        suppliers: (suppliers as Any).suppliers || [],
        material_requests: (materialRequests as Any).material_requests || [],
        rfqs: (rfqs as Any).rfqs || [],
        supplier_quotations: (supplierQuotes as Any).supplier_quotations || [],
        purchase_orders: (purchaseOrders as Any).purchase_orders || [],
        receipts: (receipts as Any).receipts || [],
      },
      projects: {
        projects: (projectRows as Any).projects || [],
        tasks: (taskRows as Any).tasks || [],
        timesheets: (timesheets as Any).timesheets || [],
      },
      quality: {
        goals: (qualityGoals as Any).quality_goals || [],
        meetings: (qualityMeetings as Any).quality_meetings || [],
        reviews: (qualityReviews as Any).quality_reviews || [],
        actions: (qualityActions as Any).quality_actions || [],
      },
      data_management: {
        imports: (dataImports as Any).data_imports || [],
      },
    },
  });
}
