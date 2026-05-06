import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getDashboardData } from "@/lib/server/data";

export default async function CompliancePage() {
  const data = await getDashboardData();

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Compliance</h1>
          <div className="page-sub">VAT, PAYE, UIF, SDL and CIPC records from ERPNext.</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Compliance Watch List</h3></div>
        <div className="card-body">
          <SimpleTable
            data={data.compliance}
            columns={[
              { key: "name", label: "Record" },
              { key: "company", label: "Company" },
              { key: "kind", label: "Type" },
              { key: "due_date", label: "Due Date" },
              { key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
