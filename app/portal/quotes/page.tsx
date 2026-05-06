import SimpleTable, { StatusCell } from "@/components/SimpleTable";
import { getModuleData } from "@/lib/server/data";

export default async function Page() {
  const data = await getModuleData("quotes");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Quotes</h1>
          <div className="page-sub">Quotation records from ERPNext</div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Quotes</h3>
        </div>
        <div className="card-body">
          <SimpleTable
            data={data}
            columns={[
              { key: "name", label: "Quote" },
{ key: "party_name", label: "Party" },
{ key: "transaction_date", label: "Date" },
{ key: "grand_total", label: "Total" },
{ key: "status", label: "Status", render: (row) => <StatusCell status={row.status} /> }
            ]}
          />
        </div>
      </div>
    </div>
  );
}
