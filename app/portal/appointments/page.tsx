import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("appointments");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Appointments</h1>
          <div className="page-sub">Event records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Appointments</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Event" },
{ key: "subject", label: "Subject" },
{ key: "starts_on", label: "Start" },
{ key: "ends_on", label: "End" },
{ key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
