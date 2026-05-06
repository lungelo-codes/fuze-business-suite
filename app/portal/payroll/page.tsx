import SearchTable, { StatusBadge } from "@/components/SearchTable";
import KPI from "@/components/KPI";
import { erpList } from "@/lib/server/erpnext";

interface SalarySlip {
  name: string;
  employee?: string;
  employee_name?: string;
  posting_date?: string;
  start_date?: string;
  end_date?: string;
  gross_pay?: number;
  net_pay?: number;
  total_deduction?: number;
  status?: string;
  company?: string;
  modified?: string;
  [key: string]: unknown;
}

function money(v?: number) {
  return `R ${(v ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PayrollPage() {
  const slips: SalarySlip[] = await erpList<SalarySlip>("Salary Slip", {
    fields: [
      "name", "employee", "employee_name", "posting_date",
      "start_date", "end_date", "gross_pay", "net_pay",
      "total_deduction", "status", "company", "modified",
    ],
    limit: 100,
    orderBy: "posting_date desc",
  });

  const totalGross = slips.reduce((s, r) => s + (r.gross_pay ?? 0), 0);
  const totalNet = slips.reduce((s, r) => s + (r.net_pay ?? 0), 0);
  const totalDeductions = slips.reduce((s, r) => s + (r.total_deduction ?? 0), 0);
  const submitted = slips.filter((s) => s.status === "Submitted").length;

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Payroll</h1>
          <div className="page-sub">{slips.length} salary slip records from ERPNext</div>
        </div>
      </div>

      <div className="kpi-grid">
        <KPI label="Total Slips" value={slips.length} hint="All salary slips" tone="teal" icon="💰" />
        <KPI label="Submitted" value={submitted} hint="Finalised payroll runs" icon="✓" />
        <KPI label="Total Gross Pay" value={money(totalGross)} hint="Sum of gross salaries" tone="blue" icon="G" />
        <KPI label="Total Net Pay" value={money(totalNet)} hint={`Deductions: ${money(totalDeductions)}`} tone="warn" icon="N" />
      </div>

      <div className="card">
        <div className="card-head">
          <h3>Salary Slips</h3>
        </div>
        <div className="card-body">
          <SearchTable
            data={slips}
            pageSize={25}
            searchPlaceholder="Search by employee name, ID…"
            columns={[
              {
                key: "employee_name",
                label: "Employee",
                render: (row) => (
                  <span style={{ fontWeight: 600, color: "var(--navy-ink)" }}>
                    {(row as SalarySlip).employee_name || (row as SalarySlip).employee || row.name}
                  </span>
                ),
              },
              {
                key: "name",
                label: "Slip ID",
                render: (row) => (
                  <span style={{ fontFamily: "monospace", fontSize: 12 }}>{row.name}</span>
                ),
              },
              {
                key: "start_date",
                label: "Period",
                render: (row) => {
                  const s = (row as SalarySlip).start_date;
                  const e = (row as SalarySlip).end_date;
                  return (
                    <span style={{ fontSize: 12 }}>
                      {s ? String(s).split(" ")[0] : "—"} → {e ? String(e).split(" ")[0] : "—"}
                    </span>
                  );
                },
              },
              {
                key: "gross_pay",
                label: "Gross Pay",
                render: (row) => (
                  <span style={{ fontWeight: 600 }}>{money((row as SalarySlip).gross_pay)}</span>
                ),
              },
              {
                key: "total_deduction",
                label: "Deductions",
                render: (row) => (
                  <span style={{ color: "var(--danger)" }}>{money((row as SalarySlip).total_deduction)}</span>
                ),
              },
              {
                key: "net_pay",
                label: "Net Pay",
                render: (row) => (
                  <span style={{ fontWeight: 700, color: "var(--ok)" }}>{money((row as SalarySlip).net_pay)}</span>
                ),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => <StatusBadge status={(row as SalarySlip).status} />,
              },
              {
                key: "posting_date",
                label: "Posted",
                render: (row) => (
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {String((row as SalarySlip).posting_date || "").split(" ")[0] || "—"}
                  </span>
                ),
              },
            ]}
            empty="No salary slips found in ERPNext"
          />
        </div>
      </div>
    </div>
  );
}
