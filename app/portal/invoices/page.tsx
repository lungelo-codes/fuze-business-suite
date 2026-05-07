import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("invoices");
  const rows = await getCrudRows("invoices");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="invoices" config={config} initialRows={rows} />;
}
