import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("contracts");
  const rows = await getCrudRows("contracts");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="contracts" config={config} initialRows={rows} />;
}
