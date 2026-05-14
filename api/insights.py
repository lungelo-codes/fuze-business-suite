"""
insights.py  –  Business Intelligence / Insights module for the Fuze Business Suite.
Aggregates data across all modules for executive-level dashboards and charts.
South African businesses – default currency ZAR.
"""

import frappe
from frappe.utils import flt, nowdate, add_months, get_first_day, get_last_day
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    has_doctype, safe_count, safe_sql_sum, money,
)


# ─── Business Overview ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_business_overview(company=None):
    require_auth()
    company = get_company(company)
    currency = get_currency(company)
    today = nowdate()
    start = get_first_day(today)
    end = get_last_day(today)

    # Revenue & expenses (all time)
    total_sales = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Sales Invoice") else 0

    total_purchases = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Purchase Invoice") else 0

    # This month
    month_sales = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1 AND posting_date BETWEEN %s AND %s",
        (company, start, end),
    ) if has_doctype("Sales Invoice") else 0

    month_expenses = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1 AND posting_date BETWEEN %s AND %s",
        (company, start, end),
    ) if has_doctype("Purchase Invoice") else 0

    # Counts
    customers = safe_count("Customer", {"disabled": 0})
    suppliers = safe_count("Supplier", {"disabled": 0})
    active_employees = safe_count("Employee", {"company": company, "status": "Active"})
    open_projects = safe_count("Project", {"company": company, "status": "Open"})
    open_tasks = safe_count("Task", {"status": ["not in", ["Completed", "Cancelled"]]})
    overdue_invoices = safe_count(
        "Sales Invoice",
        {"company": company, "docstatus": 1, "outstanding_amount": [">", 0], "due_date": ["<", today]},
    ) if has_doctype("Sales Invoice") else 0

    # Receivables / payables
    receivables = safe_sql_sum(
        "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1 AND outstanding_amount>0",
        (company,),
    ) if has_doctype("Sales Invoice") else 0

    payables = safe_sql_sum(
        "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1 AND outstanding_amount>0",
        (company,),
    ) if has_doctype("Purchase Invoice") else 0

    return ok({
        "currency": currency,
        "cards": {
            # All-time
            "total_revenue": money(total_sales),
            "total_expenses": money(total_purchases),
            "total_profit": money(total_sales - total_purchases),
            # This month
            "month_revenue": money(month_sales),
            "month_expenses": money(month_expenses),
            "month_profit": money(month_sales - month_expenses),
            # Outstanding
            "receivables": money(receivables),
            "payables": money(payables),
            "overdue_invoices": overdue_invoices,
            # Entities
            "customers": customers,
            "suppliers": suppliers,
            "active_employees": active_employees,
            "open_projects": open_projects,
            "open_tasks": open_tasks,
        },
        "period": {"month_start": str(start), "month_end": str(end)},
    })


# ─── Revenue chart ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_revenue_chart(company=None, months=6):
    require_auth()
    company = get_company(company)
    months = max(int(months or 6), 1)

    sales_rows = []
    expense_rows = []

    if has_doctype("Sales Invoice"):
        sales_rows = frappe.db.sql(
            """SELECT DATE_FORMAT(posting_date,'%%Y-%%m') AS month,
                      COALESCE(SUM(grand_total),0) AS revenue,
                      COALESCE(SUM(outstanding_amount),0) AS outstanding
               FROM `tabSales Invoice`
               WHERE company=%s AND docstatus=1
                 AND posting_date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
               GROUP BY DATE_FORMAT(posting_date,'%%Y-%%m')
               ORDER BY month ASC""",
            (company, months),
            as_dict=True,
        )

    if has_doctype("Purchase Invoice"):
        expense_rows = frappe.db.sql(
            """SELECT DATE_FORMAT(posting_date,'%%Y-%%m') AS month,
                      COALESCE(SUM(grand_total),0) AS expenses
               FROM `tabPurchase Invoice`
               WHERE company=%s AND docstatus=1
                 AND posting_date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
               GROUP BY DATE_FORMAT(posting_date,'%%Y-%%m')
               ORDER BY month ASC""",
            (company, months),
            as_dict=True,
        )

    expense_map = {r.month: flt(r.expenses) for r in expense_rows}
    chart = [
        {
            "month": r.month,
            "revenue": flt(r.revenue),
            "expenses": expense_map.get(r.month, 0),
            "profit": flt(r.revenue) - expense_map.get(r.month, 0),
            "outstanding": flt(r.outstanding),
        }
        for r in sales_rows
    ]

    return ok({"chart": chart, "currency": get_currency(company)})


# ─── Customer acquisition trend ──────────────────────────────────────────────

@frappe.whitelist()
def get_customer_growth(months=6):
    require_auth()
    months = max(int(months or 6), 1)

    if not has_doctype("Customer"):
        return ok({"chart": []})

    rows = frappe.db.sql(
        """SELECT DATE_FORMAT(creation,'%%Y-%%m') AS month,
                  COUNT(*) AS new_customers
           FROM `tabCustomer`
           WHERE creation >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
           GROUP BY DATE_FORMAT(creation,'%%Y-%%m')
           ORDER BY month ASC""",
        (months,),
        as_dict=True,
    )

    return ok({"chart": rows})


# ─── Top customers by revenue ─────────────────────────────────────────────────

@frappe.whitelist()
def get_top_customers(company=None, limit=10):
    require_auth()
    company = get_company(company)

    if not has_doctype("Sales Invoice"):
        return ok({"customers": [], "currency": get_currency(company)})

    rows = frappe.db.sql(
        """SELECT customer_name,
                  COALESCE(SUM(grand_total),0) AS total_revenue,
                  COUNT(*) AS invoice_count
           FROM `tabSales Invoice`
           WHERE company=%s AND docstatus=1
           GROUP BY customer_name
           ORDER BY total_revenue DESC
           LIMIT %s""",
        (company, int(limit or 10)),
        as_dict=True,
    )

    return ok({
        "customers": [
            {
                "name": r.customer_name,
                "total_revenue": money(r.total_revenue),
                "invoice_count": r.invoice_count,
            }
            for r in rows
        ],
        "currency": get_currency(company),
    })


# ─── Pipeline summary (CRM) ──────────────────────────────────────────────────

@frappe.whitelist()
def get_pipeline_summary(company=None):
    require_auth()
    currency = get_currency(company)

    # Support both Frappe CRM and ERPNext
    deal_dt = None
    val_field = None
    stage_field = None

    if has_doctype("CRM Deal"):
        deal_dt = "CRM Deal"
        val_field = "deal_value"
        stage_field = "stage"
    elif has_doctype("Opportunity"):
        deal_dt = "Opportunity"
        val_field = "opportunity_amount"
        stage_field = "sales_stage"

    if not deal_dt or not val_field:
        return ok({"stages": [], "total": 0, "currency": currency})

    try:
        rows = frappe.db.sql(
            f"""SELECT {stage_field} AS stage,
                        COUNT(*) AS count,
                        COALESCE(SUM({val_field}),0) AS value
                FROM `tab{deal_dt}` WHERE docstatus<2
                GROUP BY {stage_field}
                ORDER BY count DESC""",
            as_dict=True,
        )
    except Exception:
        return ok({"stages": [], "total": 0, "currency": currency})

    total_value = sum(flt(r.value) for r in rows)
    stages = [
        {"stage": r.stage or "Unknown", "count": r.count, "value": money(r.value)}
        for r in rows
    ]

    return ok({"stages": stages, "total": money(total_value), "currency": currency})


# ─── Frappe Insights queries (if installed) ───────────────────────────────────

@frappe.whitelist()
def get_insights_queries(limit=50):
    require_auth()
    if not has_doctype("Insights Query"):
        return ok({"queries": [], "available": False})

    rows = frappe.get_all(
        "Insights Query",
        fields=["name", "title", "status", "modified"],
        order_by="modified desc",
        limit_page_length=int(limit or 50),
    )

    return ok({"queries": rows, "available": True})


@frappe.whitelist()
def get_insights_dashboards(limit=20):
    require_auth()
    if not has_doctype("Insights Dashboard"):
        return ok({"dashboards": [], "available": False})

    rows = frappe.get_all(
        "Insights Dashboard",
        fields=["name", "title", "modified"],
        order_by="modified desc",
        limit_page_length=int(limit or 20),
    )

    return ok({"dashboards": rows, "available": True})


# ─── Full Company Report ────────────────────────────────────────────────────

@frappe.whitelist()
def get_full_report(company=None):
    """
    Return a consolidated report with metrics across CRM, Sales, Finance,
    HR, Projects and Support modules. This is used in the SaaS reports
    page to display comprehensive analytics for a tenant. Each section of
    the report aggregates data from its respective DocTypes. For example,
    the sales section counts quotations, orders and invoices and sums
    revenue; finance covers outstanding receivables and payables; HR
    returns active employees; projects details open projects and tasks; and
    support lists open tickets.

    Args:
        company (str, optional): The company name. Uses default company
            if not provided.

    Returns:
        dict: A response containing the report structure and currency.
    """
    require_auth()
    company = get_company(company)
    currency = get_currency(company)
    report = {}
    try:
        # CRM metrics
        leads = safe_count("Lead") if has_doctype("Lead") else 0
        customers = safe_count("Customer", {"disabled": 0}) if has_doctype("Customer") else 0
        opportunities = safe_count("Opportunity") if has_doctype("Opportunity") else 0
        report["crm"] = {
            "leads": leads,
            "customers": customers,
            "opportunities": opportunities,
        }
        # Sales metrics
        quotations = safe_count("Quotation", {"company": company}) if has_doctype("Quotation") else 0
        orders = safe_count("Sales Order", {"company": company}) if has_doctype("Sales Order") else 0
        invoices = safe_count("Sales Invoice", {"company": company, "docstatus": 1}) if has_doctype("Sales Invoice") else 0
        revenue = safe_sql_sum(
            "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` WHERE company=%s AND docstatus=1",
            (company,),
        ) if has_doctype("Sales Invoice") else 0
        report["sales"] = {
            "quotations": quotations,
            "orders": orders,
            "invoices": invoices,
            "total_revenue": money(revenue),
        }
        # Finance metrics
        receivables = safe_sql_sum(
            "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabSales Invoice` WHERE company=%s AND docstatus=1 AND outstanding_amount>0",
            (company,),
        ) if has_doctype("Sales Invoice") else 0
        payables = safe_sql_sum(
            "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabPurchase Invoice` WHERE company=%s AND docstatus=1 AND outstanding_amount>0",
            (company,),
        ) if has_doctype("Purchase Invoice") else 0
        report["finance"] = {
            "receivables": money(receivables),
            "payables": money(payables),
        }
        # HR metrics
        active_employees = safe_count("Employee", {"company": company, "status": "Active"}) if has_doctype("Employee") else 0
        report["hr"] = {"active_employees": active_employees}
        # Projects metrics
        open_projects = safe_count("Project", {"company": company, "status": "Open"}) if has_doctype("Project") else 0
        open_tasks = safe_count("Task", {"status": ["not in", ["Completed", "Cancelled"]]}) if has_doctype("Task") else 0
        report["projects"] = {
            "open_projects": open_projects,
            "open_tasks": open_tasks,
        }
        # Support metrics
        tickets = safe_count("HD Ticket", {"docstatus": ["<", 2]}) if has_doctype("HD Ticket") else 0
        report["support"] = {"open_tickets": tickets}
        return ok({"report": report, "currency": currency})
    except Exception as e:
        return fail(str(e))


# The following alias is provided for clarity when called from the SaaS portal.
# It simply delegates to ``get_full_report``. This avoids exposing the
# implementation function name in the frontend code and allows future
# refactoring.
@frappe.whitelist()
def get_company_report(company=None):
    """
    Alias for :func:`get_full_report`. Returns a consolidated report with
    metrics across CRM, Sales, Finance, HR, Projects and Support modules.

    Args:
        company (str, optional): Name of the company. Defaults to the
            current tenant's company if omitted.

    Returns:
        dict: Same structure as returned by ``get_full_report``.
    """
    return get_full_report(company)