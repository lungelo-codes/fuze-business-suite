import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("chat"); const rows = await getCrudRows("chat"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="chat" config={config} initialRows={rows} />; }
