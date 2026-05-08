import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

export default async function Page() {
  const config = getCrudConfig("contacts");
  const rows = await getCrudRows("contacts");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="contacts" config={config} initialRows={rows} />;
}
