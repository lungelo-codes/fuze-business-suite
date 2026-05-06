import SearchTable, { StatusBadge } from "@/components/SearchTable";
import { getModuleData } from "@/lib/server/data";
import { CustomerRecord } from "@/lib/types";

export default async function CustomersPage() {
  const data = (await getModuleData("customers")) as CustomerRecord[];

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Customers</h1>
          <div className="page-sub">
            {data.length} customer record{data.length !== 1 ? "s" : ""} from ERPNext
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3>All Customers</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={data}
            pageSize={25}
            searchPlaceholder="Search by name, email, territory…"
            columns={[
              {
                key: "customer_name",
                label: "Customer Name",
                render: (row) => (
                  <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                    {(row as CustomerRecord).customer_name || row.name}
                  </span>
                ),
              },
              { key: "customer_type", label: "Type" },
              { key: "customer_group", label: "Group" },
              { key: "territory", label: "Territory" },
              {
                key: "email_id",
                label: "Email",
                render: (row) => {
                  const rec = row as CustomerRecord;
                  return rec.email_id ? (
                    <a href={`mailto:${rec.email_id}`} style={{ color: "var(--teal)", fontSize: 12 }}>
                      {rec.email_id}
                    </a>
                  ) : <span style={{ color: "var(--muted-2)" }}>—</span>;
                },
              },
              {
                key: "mobile_no",
                label: "Phone",
                render: (row) => {
                  const rec = row as CustomerRecord;
                  return rec.mobile_no
                    ? <span style={{ fontSize: 12 }}>{rec.mobile_no}</span>
                    : <span style={{ color: "var(--muted-2)" }}>—</span>;
                },
              },
              {
                key: "modified",
                label: "Last Updated",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {String((row as CustomerRecord).modified ?? "").split(" ")[0] || "—"}
                  </span>
                ),
              },
            ]}
            empty="No customers found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
