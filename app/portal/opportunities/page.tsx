import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("opportunities");
  const rows = await getCrudRows("opportunities");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="opportunities" config={config} initialRows={rows} />;
}
