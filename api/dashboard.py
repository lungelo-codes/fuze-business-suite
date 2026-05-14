"""
dashboard.py  –  Unified dashboard and navigation helpers for the Fuze Business Suite.

This module aggregates key metrics from across the various functional modules
provided in this repository and returns them in a consolidated structure. The
main entry point, ``get_full_dashboard``, invokes each module’s ``get_dashboard``
function and organises the results into logical groups. This allows the
frontend to present a single dashboard with tabs or sections for Accounting,
Compliance, CRM, HR, Helpdesk, Procurement, Projects, Sales and Insights.

By grouping related information together and returning a predictable shape,
clients can render balanced card layouts without having to know the
internals of each module. The returned ``cards`` are delivered as a list of
rows, each containing up to four items, which makes it easy for the UI
to distribute them evenly across the available screen real estate. For the
Compliance tab the function also surfaces high‑level counts for VAT, PAYE
and CIPC so that all statutory obligations appear together.

Example response structure::

    {
      "success": True,
      "message": "Success",
      "data": {
        "dashboards": {
          "accounting": {
            "cards": [[...], [...]],
            "raw": { ... }
          },
          "compliance": {
            "cards": [[...], [...]],
            "tabs": [ {"name": "VAT", "due": 2, "overdue": 1}, ... ],
            "raw": { ... }
          },
          ...
        }
      }
    }

Note: All functions enforce authentication and scope operations to the
current tenant's company. If any of the underlying modules is not
installed or throws an exception, the respective entry will contain an
``error`` key instead of cards.
"""

import frappe
from ._saas_utils import require_auth, ok, get_company

try:
    # Import dashboards from sibling modules. Not all modules may be
    # installed; wrap each import in a try/except and fallback to None.
    from . import accounting  # type: ignore
except Exception:
    accounting = None
try:
    from . import compliance  # type: ignore
except Exception:
    compliance = None
try:
    from . import crm  # type: ignore
except Exception:
    crm = None
try:
    from . import hr  # type: ignore
except Exception:
    hr = None
try:
    from . import helpdesk  # type: ignore
except Exception:
    helpdesk = None
try:
    from . import procurement  # type: ignore
except Exception:
    procurement = None
try:
    from . import projects  # type: ignore
except Exception:
    projects = None
try:
    from . import sales  # type: ignore
except Exception:
    sales = None
try:
    from . import insights  # type: ignore
except Exception:
    insights = None


def _group_cards(cards: dict, per_row: int = 4) -> list:
    """Convert a dictionary of card values into a list of rows for display.

    This helper takes the arbitrary mapping returned by the individual
    ``get_dashboard`` functions and converts it into a list of lists,
    preserving the original order of insertion. Each inner list contains
    up to ``per_row`` items. Each item is a mapping with a ``name`` and
    ``value`` key, making it easier for the frontend to iterate over.

    Args:
        cards (dict): The raw cards dictionary from a module dashboard.
        per_row (int): Maximum number of cards per row. Defaults to 4.

    Returns:
        list: A two‑dimensional list suitable for grid rendering.
    """
    if not isinstance(cards, dict):
        return []
    items = [
        {"name": k, "value": v} for k, v in cards.items()
    ]
    grouped = []
    for i in range(0, len(items), per_row):
        grouped.append(items[i : i + per_row])
    return grouped


@frappe.whitelist()
def get_full_dashboard(company: str | None = None):
    """Aggregate dashboards from all modules into a single payload.

    This function calls the ``get_dashboard`` function on each installed
    module, collects their card metrics and organises them into a
    top‑level structure keyed by the module name. For modules that are
    unavailable or throw an exception, an ``error`` message is returned
    in place of the cards. The resulting structure allows the frontend
    to render a single unified dashboard with a tab per module, greatly
    reducing clutter in sidebars or navigation menus.

    Args:
        company (str, optional): Explicit company to scope the data to.
            If omitted, falls back to the logged in user's default.

    Returns:
        dict: Success response containing the aggregated dashboards.
    """
    require_auth()
    # Determine the company once and pass it to modules that support it.
    comp = get_company(company)

    dashboards: dict[str, dict] = {}

    def _safe_call(module, func_name: str, supports_company: bool = True) -> dict:
        """Call a dashboard function safely and return a structured result."""
        if not module:
            return {"error": "Module not installed"}
        fn = getattr(module, func_name, None)
        if not callable(fn):
            return {"error": f"{func_name} not implemented"}
        try:
            # Many dashboards require a company parameter; others do not.
            if supports_company:
                resp = fn(company=comp)
            else:
                resp = fn()
            # The whitelisted function typically returns a dict with
            # ``success``, ``message`` and ``data`` keys. Use the
            # ``data`` key if present; otherwise return the whole response.
            if isinstance(resp, dict):
                data = resp.get("data") or resp
            else:
                data = resp
            cards = data.get("cards") if isinstance(data, dict) else None
            grouped = _group_cards(cards) if cards else []
            result = {"cards": grouped, "raw": data}
            return result
        except Exception as e:
            return {"error": str(e)}

    # Accounting dashboard
    dashboards["accounting"] = _safe_call(accounting, "get_dashboard")

    # Compliance dashboard with additional tabs for VAT/PAYE/CIPC
    comp_result = _safe_call(compliance, "get_dashboard")
    # If there is no error, construct compliance tabs
    if "error" not in comp_result:
        raw = comp_result.get("raw") or {}
        cards = raw.get("cards") or {}
        tabs = []
        # VAT tab
        if "vat_returns_due" in cards or "vat_overdue" in cards:
            tabs.append({
                "name": "VAT",
                "due": cards.get("vat_returns_due", 0),
                "overdue": cards.get("vat_overdue", 0),
            })
        # PAYE tab
        if "paye_due" in cards:
            tabs.append({
                "name": "PAYE",
                "due": cards.get("paye_due", 0),
            })
        # CIPC tab
        if "cipc_due" in cards:
            tabs.append({
                "name": "CIPC",
                "due": cards.get("cipc_due", 0),
            })
        # Upcoming deadlines tab
        if "upcoming_deadlines" in cards:
            tabs.append({
                "name": "Deadlines",
                "due": cards.get("upcoming_deadlines", 0),
            })
        # Include tabs and original raw data
        comp_result["tabs"] = tabs
    dashboards["compliance"] = comp_result

    # CRM dashboard
    dashboards["crm"] = _safe_call(crm, "get_dashboard")

    # HR dashboard
    dashboards["hr"] = _safe_call(hr, "get_dashboard")

    # Helpdesk dashboard (does not accept company param)
    dashboards["helpdesk"] = _safe_call(helpdesk, "get_dashboard", supports_company=False)

    # Procurement dashboard
    dashboards["procurement"] = _safe_call(procurement, "get_dashboard")

    # Projects dashboard
    dashboards["projects"] = _safe_call(projects, "get_dashboard")

    # Sales dashboard
    dashboards["sales"] = _safe_call(sales, "get_dashboard")

    # Insights dashboard (business overview)
    # The insights module exposes a different function name: get_business_overview
    if insights:
        try:
            resp = insights.get_business_overview(company=comp)
            data = resp.get("data") or resp if isinstance(resp, dict) else resp
            cards = data.get("cards") if isinstance(data, dict) else None
            grouped = _group_cards(cards) if cards else []
            dashboards["insights"] = {"cards": grouped, "raw": data}
        except Exception as e:
            dashboards["insights"] = {"error": str(e)}
    else:
        dashboards["insights"] = {"error": "Module not installed"}

    return ok({"dashboards": dashboards})