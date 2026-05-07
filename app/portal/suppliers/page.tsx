import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("suppliers");
  const rows = await getCrudRows("suppliers");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="suppliers" config={config} initialRows={rows} />;
}
