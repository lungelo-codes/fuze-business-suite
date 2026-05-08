import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("documents");
  const rows = await getCrudRows("documents");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="documents" config={config} initialRows={rows} />;
}
