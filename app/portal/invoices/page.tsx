import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function InvoicesPage() {
  const config = getCrudConfig("invoices");
  const rows = await getCrudRows("invoices").catch(() => []);
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="invoices" config={config} initialRows={rows} />;
}
