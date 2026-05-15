import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
import ProcurementWorkspace from "@/components/procurement/ProcurementWorkspace";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safe(fn: () => Promise<Row[]>): Promise<Row[]> { try { return await fn(); } catch { return []; } }

export default async function ProcurementPage() {
  const [suppliers, purchaseOrders] = await Promise.all([
    safe(() => erpList<Row>("Supplier", { fields: ["name","supplier_name","supplier_type","supplier_group","country","mobile_no","email_id","status","modified"], limit:200, orderBy:"modified desc" })),
    safe(() => erpList<Row>("Purchase Order", { fields: ["name","supplier","supplier_name","transaction_date","schedule_date","grand_total","status","docstatus","modified"], limit:200, orderBy:"modified desc" })),
  ]);

  return (
    <ProcurementWorkspace
      initialSuppliers={suppliers}
      initialPurchaseOrders={purchaseOrders}
    />
  );
}
