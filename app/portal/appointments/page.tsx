import CrudModulePage from "@/components/crud/CrudModulePage";
import { getCrudConfig } from "@/lib/crudConfig";
import { getCrudRows } from "@/lib/server/crudData";

// Appointments uses the standard CRUD page with the Event doctype
// Booking is also available from the Projects dashboard
export default async function Page() {
  const config = getCrudConfig("appointments");
  const rows = await getCrudRows("appointments");
  if (!config) return <div>Unknown module</div>;
  return <CrudModulePage moduleId="appointments" config={config} initialRows={rows} />;
}
