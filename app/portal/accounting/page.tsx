import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpList } from "@/lib/server/erpnext";

type Row = Record<string, unknown>;
async function safeList(doctype: string, fields: string[]): Promise<Row[]> {
  try { return await erpList<Row>(doctype, { fields, limit: 100, orderBy: "modified desc" }); } catch { return []; }
}

export default async function AccountingPage() {
  const [journals, accounts, costCentres, budgets] = await Promise.all([
    safeList("Journal Entry", ["name", "voucher_type", "posting_date", "total_debit", "total_credit", "remark", "docstatus", "modified"]),
    safeList("Account", ["name", "account_name", "account_type", "root_type", "is_group", "modified"]),
    safeList("Cost Center", ["name", "cost_center_name", "is_group", "modified"]),
    safeList("Budget", ["name", "budget_against", "fiscal_year", "modified"]),
  ]);

  const totalDebit = journals.reduce((sum, j) => sum + Number(j.total_debit || 0), 0);
  const submitted = journals.filter((j) => Number(j.docstatus) === 1).length;
  const rows = [...journals, ...accounts];

  return (
    <ModernModuleDashboard
      title="Accounting"
      eyebrow="Finance Workspace"
      description="Full general ledger, journal entries, chart of accounts, cost centres and budgets. Powered by ERPNext v16 — open source and SARS-compliant."
      rows={rows}
      tabs={["Accounting Dashboard", "Journal Entries", "Chart of Accounts", "Cost Centres", "Budgets"]}
      metrics={[
        { label: "Journals", value: journals.length, hint: `${submitted} submitted` },
        { label: "Total Debit", value: `R${totalDebit.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`, hint: "All journal entries" },
        { label: "Accounts", value: accounts.length, hint: "Chart of accounts" },
        { label: "Cost Centres", value: costCentres.length, hint: "Active cost centres" },
      ]}
      actions={[
        { label: "New Journal", href: "/portal/accounting", description: "Post a manual journal entry" },
        { label: "Bank Reconciliation", href: "/portal/bank-reconciliation", description: "Match bank statements" },
        { label: "VAT Return", href: "/portal/vat", description: "Review VAT periods" },
        { label: "Reports", href: "/portal/reports", description: "P&L, Balance Sheet, Trial Balance" },
      ]}
      primaryField="voucher_type"
      secondaryField="remark"
      statusField="docstatus"
      valueField="total_debit"
      mode="finance"
    />
  );
}

