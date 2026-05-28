import AIAssistantPanel from "@/components/ai/AIAssistantPanel";
import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> { try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; } }

export default async function AssetsPage() {
  const [assets, maintenance] = await Promise.all([
    safeList("Asset", ["name", "asset_name", "item_code", "status", "location", "gross_purchase_amount", "modified"]),
    safeList("Asset Maintenance", ["name", "asset_name", "maintenance_status", "periodicity", "modified"]),
  ]);
  const rows = [...assets, ...maintenance];
  return <><AIAssistantPanel moduleName="assets" title="Assets AI Analyst" /><ModernModuleDashboard
    title="Assets"
    eyebrow="ERPNext Asset Management"
    description="Track fixed assets, locations, maintenance, depreciation readiness and asset status from ERPNext."
    rows={rows}
    tabs={["Assets", "Maintenance", "Depreciation", "Locations"]}
    metrics={[{ label: "Assets", value: assets.length, hint: "Asset records" }, { label: "Maintenance", value: maintenance.length, hint: "Schedules" }, { label: "Active", value: assets.filter((r) => String(r.status || '').toLowerCase().includes('active')).length, hint: "In use" }, { label: "Draft", value: assets.filter((r) => String(r.status || '').toLowerCase().includes('draft')).length, hint: "Not submitted" }]}
    actions={[{ label: "Add Asset", href: "/portal/assets", description: "Register a new fixed asset" }, { label: "Maintenance", href: "/portal/assets", description: "Review maintenance schedules" }, { label: "Reports", href: "/portal/reports", description: "Asset performance and value" }]}
    primaryField="asset_name"
    secondaryField="item_code"
    statusField="status"
    mode="projects"
  /></>;
}
