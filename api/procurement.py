"""
procurement.py  –  Procurement module API for the Fuze Business Suite.
Covers Suppliers, Supplier Groups, Material Requests, Requests for Quotation,
Supplier Quotations, Purchase Orders, Purchase Receipts, Purchase Returns,
Bills (Purchase Invoices), Supplier Scorecards, and Inventory.
South African businesses – default currency ZAR.
"""

import frappe
from frappe.utils import flt, nowdate
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, pick_fields,
    safe_count, safe_sql_sum, money,
)


# ─── Dashboard ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard(company=None):
    require_auth()
    company = get_company(company)
    currency = get_currency(company)

    suppliers          = safe_count("Supplier", {"disabled": 0})
    material_requests  = safe_count("Material Request", {"company": company, "docstatus": 1, "status": ["!=", "Stopped"]})
    open_rfqs          = safe_count("Request for Quotation", {"company": company, "docstatus": 1, "status": ["in", ["Open", "Partially Ordered"]]})
    purchase_orders    = safe_count("Purchase Order", {"company": company})
    pending_orders     = safe_count("Purchase Order", {
        "company": company,
        "status": ["in", ["Draft", "To Receive and Bill", "To Bill", "To Receive"]],
    })
    receipts           = safe_count("Purchase Receipt", {"company": company, "docstatus": 1})
    bills              = safe_count("Purchase Invoice", {"company": company, "docstatus": 1})
    unpaid_bills       = safe_count("Purchase Invoice", {
        "company": company, "docstatus": 1, "outstanding_amount": [">", 0],
    })

    total_spend = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Purchase Invoice") else 0

    this_month_spend = 0.0
    if has_doctype("Purchase Invoice"):
        from frappe.utils import get_first_day, get_last_day
        start = get_first_day(nowdate())
        end   = get_last_day(nowdate())
        this_month_spend = safe_sql_sum(
            "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
            "WHERE company=%s AND docstatus=1 AND posting_date BETWEEN %s AND %s",
            (company, start, end),
        )

    low_stock_count = _low_stock_count()

    return ok({
        "cards": {
            "suppliers":          suppliers,
            "material_requests":  material_requests,
            "open_rfqs":          open_rfqs,
            "purchase_orders":    purchase_orders,
            "pending_orders":     pending_orders,
            "receipts":           receipts,
            "bills":              bills,
            "unpaid_bills":       unpaid_bills,
            "total_spend":        money(total_spend),
            "this_month_spend":   money(this_month_spend),
            "low_stock_items":    low_stock_count,
        },
        "currency": currency,
    })


def _low_stock_count() -> int:
    try:
        if not has_doctype("Bin"):
            return 0
        result = frappe.db.sql(
            """SELECT COUNT(*) AS cnt FROM `tabBin`
               WHERE IFNULL(actual_qty, 0) <= IFNULL(reserved_qty, 0)""",
            as_dict=True,
        )
        return result[0].cnt if result else 0
    except Exception:
        return 0


# ─── Supplier Groups ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_supplier_groups():
    """Return all supplier groups for populating filter dropdowns."""
    require_auth()
    if not has_doctype("Supplier Group"):
        return ok({"supplier_groups": []})

    rows = frappe.get_all(
        "Supplier Group",
        fields=["name", "parent_supplier_group", "is_group"],
        order_by="name asc",
    )
    return ok({"supplier_groups": rows})


# ─── Suppliers ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_suppliers(limit=50, offset=0, search=None, supplier_group=None):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Supplier"):
        return ok({"suppliers": []}, meta={"total": 0})

    filters = {"disabled": 0}
    if supplier_group:
        filters["supplier_group"] = supplier_group

    fields = pick_fields("Supplier", [
        "name", "supplier_name", "supplier_group", "supplier_type",
        "country", "mobile_no", "email_id", "tax_id",
        "payment_terms", "default_currency", "hold_type",
        "on_hold", "modified",
    ])

    if search:
        rows = frappe.get_all(
            "Supplier",
            filters=[
                ["disabled", "=", 0],
                ["supplier_name", "like", f"%{search}%"],
            ],
            fields=fields,
            order_by="supplier_name asc",
            limit_start=offset,
            limit_page_length=limit,
        )
    else:
        rows = frappe.get_all(
            "Supplier",
            filters=filters,
            fields=fields,
            order_by="supplier_name asc",
            limit_start=offset,
            limit_page_length=limit,
        )

    total = frappe.db.count("Supplier", filters)
    return ok({"suppliers": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_supplier(name):
    require_auth()
    if not has_doctype("Supplier"):
        return fail("Supplier DocType not installed")
    doc = frappe.get_doc("Supplier", name)
    data = doc.as_dict()

    # Enrich with linked contacts and addresses
    contacts = frappe.get_all(
        "Dynamic Link",
        filters={"link_doctype": "Supplier", "link_name": name, "parenttype": "Contact"},
        fields=["parent"],
    )
    data["contacts"] = [
        frappe.get_doc("Contact", c.parent).as_dict() for c in contacts
    ] if contacts else []

    addresses = frappe.get_all(
        "Dynamic Link",
        filters={"link_doctype": "Supplier", "link_name": name, "parenttype": "Address"},
        fields=["parent"],
    )
    data["addresses"] = [
        frappe.get_doc("Address", a.parent).as_dict() for a in addresses
    ] if addresses else []

    return ok({"supplier": data})


# ─── Material Requests ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_material_requests(company=None, status=None, material_request_type=None,
                          limit=50, offset=0):
    """
    List Material Requests.
    material_request_type: Purchase | Material Transfer | Material Issue | Manufacture | Customer Provided
    status: Draft | Submitted | Stopped | Cancelled | Pending | Partially Ordered | Ordered | Issued | Transferred
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Material Request"):
        return ok({"material_requests": []}, meta={"total": 0})

    filters = {"company": company, "docstatus": 1}
    if status and status != "all":
        filters["status"] = status
    if material_request_type and material_request_type != "all":
        filters["material_request_type"] = material_request_type

    fields = pick_fields("Material Request", [
        "name", "material_request_type", "transaction_date",
        "schedule_date", "status", "per_ordered",
        "requested_by", "purpose",
    ])

    rows = frappe.get_all(
        "Material Request",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Material Request", filters)
    return ok({"material_requests": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_material_request(name):
    require_auth()
    if not has_doctype("Material Request"):
        return fail("Material Request DocType not installed")
    doc = frappe.get_doc("Material Request", name)
    return ok({"material_request": doc.as_dict()})


# ─── Requests for Quotation ───────────────────────────────────────────────────

@frappe.whitelist()
def get_request_for_quotations(company=None, status=None, limit=50, offset=0):
    """
    List Requests for Quotation (RFQs).
    status: Draft | Submitted | Stopped | Cancelled
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Request for Quotation"):
        return ok({"rfqs": []}, meta={"total": 0})

    filters = {"company": company, "docstatus": 1}
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Request for Quotation", [
        "name", "transaction_date", "status",
        "message_for_supplier", "modified",
    ])

    rows = frappe.get_all(
        "Request for Quotation",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Request for Quotation", filters)
    return ok({"rfqs": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_request_for_quotation(name):
    require_auth()
    if not has_doctype("Request for Quotation"):
        return fail("Request for Quotation DocType not installed")
    doc = frappe.get_doc("Request for Quotation", name)
    return ok({"rfq": doc.as_dict()})


# ─── Supplier Quotations ──────────────────────────────────────────────────────

@frappe.whitelist()
def get_supplier_quotations(company=None, status=None, supplier=None,
                             limit=50, offset=0):
    """
    List Supplier Quotations.
    status: Draft | Submitted | Stopped | Cancelled | Ordered | Lost
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Supplier Quotation"):
        return ok({"supplier_quotations": [], "currency": get_currency(company)},
                  meta={"total": 0})

    filters = {"company": company, "docstatus": 1}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Supplier Quotation", [
        "name", "supplier", "supplier_name", "transaction_date",
        "valid_till", "grand_total", "status", "currency",
    ])

    rows = frappe.get_all(
        "Supplier Quotation",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Supplier Quotation", filters)
    return ok(
        {"supplier_quotations": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_supplier_quotation(name):
    require_auth()
    if not has_doctype("Supplier Quotation"):
        return fail("Supplier Quotation DocType not installed")
    doc = frappe.get_doc("Supplier Quotation", name)
    return ok({"supplier_quotation": doc.as_dict()})


# ─── Purchase Orders ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_orders(company=None, status=None, supplier=None,
                         limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Purchase Order"):
        return ok({"purchase_orders": [], "currency": get_currency(company)},
                  meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Purchase Order", [
        "name", "supplier", "supplier_name", "transaction_date",
        "schedule_date", "grand_total", "rounded_total",
        "taxes_and_charges", "status", "currency",
        "per_received", "per_billed", "advance_paid",
        "payment_terms_template", "set_warehouse",
    ])

    rows = frappe.get_all(
        "Purchase Order",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Purchase Order", filters)
    return ok(
        {"purchase_orders": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_purchase_order(name):
    require_auth()
    if not has_doctype("Purchase Order"):
        return fail("Purchase Order DocType not installed")
    doc = frappe.get_doc("Purchase Order", name)
    return ok({"purchase_order": doc.as_dict()})


# ─── Purchase Receipts ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_receipts(company=None, status=None, supplier=None,
                           limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Purchase Receipt"):
        return ok({"receipts": [], "currency": get_currency(company)},
                  meta={"total": 0})

    filters = {"company": company, "docstatus": 1}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Purchase Receipt", [
        "name", "supplier", "supplier_name", "posting_date",
        "grand_total", "rounded_total", "status",
        "per_billed", "is_return", "set_warehouse",
    ])

    rows = frappe.get_all(
        "Purchase Receipt",
        filters=filters,
        fields=fields,
        order_by="posting_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Purchase Receipt", filters)
    return ok(
        {"receipts": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_purchase_receipt(name):
    require_auth()
    if not has_doctype("Purchase Receipt"):
        return fail("Purchase Receipt DocType not installed")
    doc = frappe.get_doc("Purchase Receipt", name)
    return ok({"purchase_receipt": doc.as_dict()})


# ─── Purchase Returns (Debit Notes) ──────────────────────────────────────────

@frappe.whitelist()
def get_purchase_returns(company=None, supplier=None, limit=50, offset=0):
    """
    Returns Purchase Invoices with is_return=1 (Debit Notes / Purchase Returns).
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Purchase Invoice"):
        return ok({"purchase_returns": [], "currency": get_currency(company)},
                  meta={"total": 0})

    filters = {"company": company, "docstatus": 1, "is_return": 1}
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Purchase Invoice", [
        "name", "supplier", "supplier_name", "posting_date",
        "grand_total", "status", "currency", "return_against",
    ])

    rows = frappe.get_all(
        "Purchase Invoice",
        filters=filters,
        fields=fields,
        order_by="posting_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Purchase Invoice", filters)
    return ok(
        {"purchase_returns": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


# ─── Purchase Invoices (Bills) ────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_invoices(company=None, status=None, supplier=None,
                           limit=50, offset=0):
    """
    List Purchase Invoices (Bills). Use status='unpaid' for outstanding bills.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Purchase Invoice"):
        return ok({"invoices": [], "currency": get_currency(company)},
                  meta={"total": 0})

    filters = {"company": company, "docstatus": 1, "is_return": 0}
    if supplier:
        filters["supplier"] = supplier
    if status == "unpaid":
        filters["outstanding_amount"] = [">", 0]
    elif status and status != "all":
        filters["status"] = status

    fields = pick_fields("Purchase Invoice", [
        "name", "supplier", "supplier_name", "posting_date", "due_date",
        "grand_total", "outstanding_amount", "status", "currency",
        "payment_terms_template", "bill_no", "bill_date",
    ])

    rows = frappe.get_all(
        "Purchase Invoice",
        filters=filters,
        fields=fields,
        order_by="posting_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Purchase Invoice", filters)
    return ok(
        {"invoices": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_purchase_invoice(name):
    require_auth()
    if not has_doctype("Purchase Invoice"):
        return fail("Purchase Invoice DocType not installed")
    doc = frappe.get_doc("Purchase Invoice", name)
    return ok({"purchase_invoice": doc.as_dict()})


# ─── Supplier Scorecard ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_supplier_scorecards(supplier=None, limit=50, offset=0):
    """
    List Supplier Scorecards. Optionally filter by supplier.
    """
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Supplier Scorecard"):
        return ok({"scorecards": []}, meta={"total": 0})

    filters = {}
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Supplier Scorecard", [
        "name", "supplier", "supplier_name", "scorecard_period",
        "score", "grade", "standings_color", "weighting_function",
        "status", "modified",
    ])

    rows = frappe.get_all(
        "Supplier Scorecard",
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Supplier Scorecard", filters)
    return ok({"scorecards": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_supplier_scorecard(name):
    require_auth()
    if not has_doctype("Supplier Scorecard"):
        return fail("Supplier Scorecard DocType not installed")
    doc = frappe.get_doc("Supplier Scorecard", name)
    return ok({"scorecard": doc.as_dict()})


# ─── Inventory / Low Stock ────────────────────────────────────────────────────

@frappe.whitelist()
def get_low_stock(limit=50):
    require_auth()

    if not has_doctype("Bin"):
        return ok({"items": []})

    try:
        rows = frappe.db.sql(
            """SELECT b.item_code,
                      i.item_name,
                      i.item_group,
                      b.warehouse,
                      b.actual_qty,
                      b.reserved_qty,
                      b.ordered_qty,
                      b.projected_qty,
                      i.stock_uom,
                      (b.actual_qty - IFNULL(b.reserved_qty, 0)) AS available_qty
               FROM `tabBin` b
               LEFT JOIN `tabItem` i ON i.name = b.item_code
               WHERE IFNULL(b.actual_qty, 0) <= IFNULL(b.reserved_qty, 0)
               ORDER BY b.actual_qty ASC
               LIMIT %s""",
            (int(limit or 50),),
            as_dict=True,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_low_stock failed")
        rows = []

    return ok({"items": rows})


@frappe.whitelist()
def get_inventory_summary(company=None, warehouse=None, item_group=None,
                           limit=100, offset=0):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Bin"):
        return ok({"items": []}, meta={"total": 0})

    where_clauses = []
    args = []

    if warehouse:
        where_clauses.append("b.warehouse = %s")
        args.append(warehouse)
    if item_group:
        where_clauses.append("i.item_group = %s")
        args.append(item_group)

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    try:
        rows = frappe.db.sql(
            f"""SELECT b.item_code,
                       i.item_name,
                       i.item_group,
                       b.warehouse,
                       b.actual_qty,
                       b.reserved_qty,
                       b.ordered_qty,
                       b.projected_qty,
                       i.stock_uom,
                       i.standard_rate,
                       (b.actual_qty * IFNULL(i.standard_rate, 0)) AS stock_value,
                       (b.actual_qty - IFNULL(b.reserved_qty, 0))  AS available_qty
                FROM `tabBin` b
                LEFT JOIN `tabItem` i ON i.name = b.item_code
                {where_sql}
                ORDER BY b.actual_qty DESC
                LIMIT %s OFFSET %s""",
            tuple(args) + (limit, offset),
            as_dict=True,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_inventory_summary failed")
        rows = []

    return ok({"items": rows}, meta={"limit": limit, "offset": offset})


# ─── Procurement Cycle Overview ───────────────────────────────────────────────

@frappe.whitelist()
def get_procurement_cycle_summary(company=None):
    """
    Returns a high-level count summary of each stage in the
    ERPNext procurement cycle for dashboard widgets.
    """
    require_auth()
    company = get_company(company)

    summary = {
        "material_requests":   safe_count("Material Request", {"company": company, "docstatus": 1, "status": ["!=", "Stopped"]}),
        "rfqs_open":           safe_count("Request for Quotation", {"company": company, "docstatus": 1, "status": "Open"}),
        "supplier_quotations": safe_count("Supplier Quotation", {"company": company, "docstatus": 1}),
        "purchase_orders":     safe_count("Purchase Order", {"company": company, "docstatus": 1}),
        "pending_receipt":     safe_count("Purchase Order", {"company": company, "docstatus": 1, "per_received": ["<", 100], "status": ["!=", "Closed"]}),
        "receipts":            safe_count("Purchase Receipt", {"company": company, "docstatus": 1}),
        "pending_billing":     safe_count("Purchase Receipt", {"company": company, "docstatus": 1, "per_billed": ["<", 100], "status": ["!=", "Closed"]}),
        "purchase_invoices":   safe_count("Purchase Invoice", {"company": company, "docstatus": 1, "is_return": 0}),
        "unpaid_invoices":     safe_count("Purchase Invoice", {"company": company, "docstatus": 1, "is_return": 0, "outstanding_amount": [">", 0]}),
    }

    return ok({"procurement_cycle": summary, "currency": get_currency(company)})