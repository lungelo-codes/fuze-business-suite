import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("leads");
  const rows = await getCrudRows("leads");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="leads" config={config} initialRows={rows} />;
}
