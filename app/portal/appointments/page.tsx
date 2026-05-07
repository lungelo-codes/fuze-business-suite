import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("appointments");
  const rows = await getCrudRows("appointments");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="appointments" config={config} initialRows={rows} />;
}
