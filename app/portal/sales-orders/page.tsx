import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("sales-orders");
  const rows = await getCrudRows("sales-orders");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="sales-orders" config={config} initialRows={rows} />;
}
