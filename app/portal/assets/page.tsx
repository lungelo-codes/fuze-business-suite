import ERPModuleWorkspace from "@/components/modules/ERPModuleWorkspace";
import { safeList, money, sumField } from "@/lib/server/coreBusinessData";

export default async function AssetsPage() {
  const [assets, maintenance, movements] = await Promise.all([
    safeList("Asset", ["name", "asset_name", "item_code", "status", "location", "gross_purchase_amount", "modified"], 100),
    safeList("Asset Maintenance", ["name", "asset_name", "maintenance_status", "periodicity", "modified"], 100),
    safeList("Asset Movement", ["name", "asset", "source_location", "target_location", "status", "transaction_date", "modified"], 50),
  ]);
  const rows = [...assets, ...maintenance, ...movements];
  return <ERPModuleWorkspace
    moduleName="assets"
    eyebrow="ERPNext Assets"
    title="Assets Workspace"
    description="Track fixed assets, location movements, maintenance planning, purchase values and depreciation readiness from the SaaS portal."
    rows={rows}
    tabs={["Overview", "Asset Register", "Maintenance", "Movements", "Depreciation", "Reports"]}
    metrics={[
      { label: "Assets", value: assets.length, hint: "Registered assets", tone: "blue" },
      { label: "Asset Value", value: money(sumField(assets, "gross_purchase_amount")), hint: "Gross purchase value", tone: "green" },
      { label: "Maintenance", value: maintenance.length, hint: "Maintenance schedules", tone: "orange" },
      { label: "Movements", value: movements.length, hint: "Asset movements", tone: "purple" },
    ]}
    flow={[
      { label: "Purchase Asset", hint: "From buying", tone: "blue" },
      { label: "Asset Register", count: assets.length, tone: "green" },
      { label: "Movement", count: movements.length, tone: "purple" },
      { label: "Maintenance", count: maintenance.length, tone: "orange" },
      { label: "Depreciation", hint: "Accounting", tone: "pink" },
    ]}
    actions={[
      { label: "Add Asset", href: "/portal/assets", description: "Register a new fixed asset" },
      { label: "Schedule Maintenance", href: "/portal/assets", description: "Create maintenance schedule" },
      { label: "Asset Reports", href: "/portal/insights", description: "Review asset value and utilisation" },
    ]}
    insights={[
      { title: "Protect asset value", detail: "Assets without maintenance schedules should be reviewed by the operations owner.", tone: maintenance.length ? "ok" : "warn" },
      { title: "Track locations", detail: "Use movements to see which branch or employee holds each asset.", tone: "ok" },
      { title: "Finance link", detail: "Asset values should flow into accounting and depreciation reports.", tone: "ok" },
    ]}
    primaryField="asset_name"
    secondaryField="item_code"
    statusField="status"
    valueField="gross_purchase_amount"
    aiTitle="Assets AI Analyst"
    ownerQuestion="Which assets are underused, overdue for maintenance or affecting cash flow?"
  />;
}
