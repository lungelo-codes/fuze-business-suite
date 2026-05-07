import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("items");
  const rows = await getCrudRows("items");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="items" config={config} initialRows={rows} />;
}
