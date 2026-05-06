import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("support");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Support</h1>
          <div className="page-sub">Issue records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Support</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Ticket" },
{ key: "subject", label: "Subject" },
{ key: "customer", label: "Customer" },
{ key: "priority", label: "Priority" },
{ key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
