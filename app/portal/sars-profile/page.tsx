import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("sars-profile"); const rows = await getCrudRows("sars-profile"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="sars-profile" config={config} initialRows={rows} />; }
