import ModernModuleDashboard from "@/components/modules/ModernModuleDashboard";
import { erpMethod } from "@/lib/server/erpnext";

/**
 * Compliance page
 *
 * This page consolidates all statutory compliance obligations – such as VAT,
 * PAYE and CIPC returns – into a single dashboard. It calls the unified
 * dashboard API exposed by the backend (dashboard.get_full_dashboard) and
 * extracts the compliance metrics, upcoming deadlines and tab definitions.
 * Tabs correspond to each type of return or reminder, but individual pages
 * for VAT, PAYE, CIPC and reminders remain accessible via the quick action
 * buttons. The ModernModuleDashboard component handles the layout with
 * metrics, tabs, a list of upcoming deadlines and quick actions.
 */
export default async function CompliancePage() {
  // Attempt to fetch the aggregated dashboards from the backend. If the
  // request fails (for example due to missing authentication), fall back
  // to empty structures to avoid runtime errors.
  let dashboards: any = {};
  try {
    const result = await erpMethod<Record<string, unknown>>("dashboard.get_full_dashboard", {});
    dashboards = (result as any)?.dashboards || {};
  } catch {
    dashboards = {};
  }

  const comp: any = dashboards?.compliance || {};
  const raw = (comp.raw || {}) as any;
  const cards: Record<string, any> = raw.cards || {};
  const upcoming: Record<string, any>[] = raw.upcoming || [];

  // Build a concise set of metric cards. Only the most important values
  // (due returns, PAYE, CIPC and upcoming deadlines) are surfaced here to
  // keep the stat grid balanced. Additional data such as overdue VAT is
  // displayed within the tab summary.
  const metrics = [
    { label: "VAT Due", value: cards.vat_returns_due ?? 0, hint: "Outstanding VAT returns" },
    { label: "PAYE Due", value: cards.paye_due ?? 0, hint: "Outstanding PAYE returns" },
    { label: "CIPC Due", value: cards.cipc_due ?? 0, hint: "Annual returns due" },
    { label: "Deadlines", value: cards.upcoming_deadlines ?? 0, hint: "Upcoming tasks" },
  ];

  // Compose the tab labels from the backend tabs. Each tab object can
  // include a `due`, `count` or `value` key to indicate how many items
  // require attention. We append the count to the name when present.
  const tabDefs: any[] = Array.isArray(comp.tabs) ? comp.tabs : [];
  const tabLabels = tabDefs.map((tab) => {
    const count = tab.due ?? tab.count ?? tab.value ?? 0;
    return count ? `${tab.name} (${count})` : tab.name;
  });
  // Prepend the dashboard tab for the overall compliance view.
  const tabs = ["Compliance Dashboard", ...tabLabels];

  // Define quick actions to the underlying detailed pages. These actions
  // remain in the system even though the sidebar no longer exposes the
  // individual compliance modules, allowing users to drill down when
  // necessary.
  const actions = [
    { label: "File VAT Return", href: "/portal/vat", description: "Prepare and submit VAT return" },
    { label: "Submit PAYE", href: "/portal/paye", description: "Capture your monthly PAYE return" },
    { label: "CIPC Annual Return", href: "/portal/cipc", description: "Lodge your annual return" },
    { label: "View Deadlines", href: "/portal/compliance-reminders", description: "See upcoming statutory deadlines" },
  ];

  return (
    <ModernModuleDashboard
      title="Compliance"
      eyebrow="Finance Workspace"
      description="Unified view of your statutory obligations including VAT, PAYE, CIPC and submission deadlines."
      rows={upcoming}
      tabs={tabs}
      metrics={metrics}
      actions={actions}
      primaryField="title"
      secondaryField="due_date"
      statusField="status"
    />
  );
}