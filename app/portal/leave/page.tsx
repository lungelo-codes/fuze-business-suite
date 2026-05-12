import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("leave"); const rows = await getCrudRows("leave"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="leave" config={config} initialRows={rows} />; }
