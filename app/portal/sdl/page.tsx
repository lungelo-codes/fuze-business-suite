import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";
export default async function Page() { const config = getCrudConfig("sdl"); const rows = await getCrudRows("sdl"); if (!config) return <div>Unknown module</div>; return <CrudModulePage moduleId="sdl" config={config} initialRows={rows} />; }
