import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("campaigns");
  const rows = await getCrudRows("campaigns");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="campaigns" config={config} initialRows={rows} />;
}
