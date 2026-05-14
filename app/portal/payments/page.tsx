import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("payments"); const rows = await getCrudRows("payments"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="payments" config={config} initialRows={rows} />; }
