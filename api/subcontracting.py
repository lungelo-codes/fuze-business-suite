"""
subcontracting.py  –  Subcontracting module API for the Fuze Business Suite.
Covers Subcontracting Orders, Subcontracting Receipts, BOM for subcontracting,
raw material supply to suppliers, and the Subcontracting dashboard.

ERPNext Subcontracting workflow:
    Purchase Order (Subcontracting) → Stock Entry (Send Raw Materials)
    → Subcontracting Receipt → Stock update + Purchase Invoice
"""

import frappe
from frappe.utils import flt, nowdate, get_first_day, get_last_day
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, pick_fields,
    safe_count, safe_sql_sum, money,
)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard(company=None):
    """
    Return a summary of key Subcontracting metrics.

    Args:
        company (str, optional): Filter by company.

    Returns:
        dict: Dashboard card data.
    """
    require_auth()
    company = get_company(company)
    currency = get_currency(company)

    open_orders = safe_count("Subcontracting Order", {
        "company": company,
        "status": ["in", ["Draft", "Open", "Partially Received"]],
    }) if has_doctype("Subcontracting Order") else 0

    completed_orders = safe_count("Subcontracting Order", {
        "company": company,
        "status": "Closed",
    }) if has_doctype("Subcontracting Order") else 0

    pending_receipts = safe_count("Subcontracting Receipt", {
        "company": company,
        "docstatus": 0,
    }) if has_doctype("Subcontracting Receipt") else 0

    total_value = safe_sql_sum(
        "SELECT COALESCE(SUM(total),0) v FROM `tabSubcontracting Order` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Subcontracting Order") else 0

    return ok({
        "cards": {
            "open_subcontracting_orders": open_orders,
            "completed_subcontracting_orders": completed_orders,
            "pending_receipts": pending_receipts,
            "total_subcontracting_value": money(total_value),
        },
        "currency": currency,
        "period": {"today": nowdate()},
    })


# ─── Subcontracting Orders ────────────────────────────────────────────────────

@frappe.whitelist()
def get_subcontracting_orders(company=None, status=None, supplier=None, limit=50, offset=0):
    """
    List Subcontracting Orders. These are purchase orders placed with
    an outside contractor who receives raw materials and returns
    finished goods.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / Open / Partially Received /
                                Closed / Cancelled.
        supplier (str, optional): Filter by supplier.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Subcontracting Orders.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Subcontracting Order"):
        return ok({"subcontracting_orders": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Subcontracting Order", [
        "name", "supplier", "supplier_name", "transaction_date",
        "schedule_date", "status", "total", "currency",
    ])

    rows = frappe.get_all(
        "Subcontracting Order",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Subcontracting Order", filters)
    return ok(
        {"subcontracting_orders": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_subcontracting_order(name):
    """
    Fetch a single Subcontracting Order with all item and raw material rows.

    Args:
        name (str): Subcontracting Order ID.

    Returns:
        dict: Full Subcontracting Order document.
    """
    require_auth()
    if not has_doctype("Subcontracting Order"):
        return fail("Subcontracting Order DocType not installed")
    doc = frappe.get_doc("Subcontracting Order", name)
    return ok({"subcontracting_order": doc.as_dict()})


@frappe.whitelist()
def create_subcontracting_order(data=None, **kwargs):
    """
    Create a new Subcontracting Order. You can either supply items
    directly or convert an existing Purchase Order.

    Payload fields:
        supplier (str): Supplier name (required).
        schedule_date (str): Expected delivery date (required).
        transaction_date (str, optional): Defaults to today.
        items (list[dict]): Finished goods rows with:
            - item_code (str)
            - qty (float)
            - rate (float)
            - bom (str): The BOM that defines the raw materials needed.
            - warehouse (str, optional)
            - service_cost_per_qty (float, optional)
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Subcontracting Order.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Subcontracting Order"):
            return fail("Subcontracting Order DocType not installed")

        company = get_company(p.get("company"))
        doc = frappe.new_doc("Subcontracting Order")
        doc.company = company
        doc.supplier = p.get("supplier")
        doc.transaction_date = p.get("transaction_date") or nowdate()
        doc.schedule_date = p.get("schedule_date") or nowdate()
        doc.currency = p.get("currency") or get_currency(company)

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            doc.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "bom": item.get("bom"),
                "warehouse": item.get("warehouse"),
                "service_cost_per_qty": item.get("service_cost_per_qty") or 0,
                "schedule_date": item.get("schedule_date") or p.get("schedule_date"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"subcontracting_order": {"id": doc.name}}, "Subcontracting Order created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_subcontracting_order(name):
    """
    Submit a Subcontracting Order. After submission, you can issue
    raw materials to the supplier.

    Args:
        name (str): Subcontracting Order ID.

    Returns:
        dict: Updated status.
    """
    require_auth()
    try:
        if not has_doctype("Subcontracting Order"):
            return fail("Subcontracting Order DocType not installed")
        doc = frappe.get_doc("Subcontracting Order", name)
        if doc.docstatus != 0:
            return fail(f"Subcontracting Order {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok(
            {"subcontracting_order": {"id": doc.name, "status": doc.status}},
            "Subcontracting Order submitted",
        )
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_subcontracting_order(name):
    """
    Cancel a submitted Subcontracting Order.

    Args:
        name (str): Subcontracting Order ID.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Subcontracting Order"):
            return fail("Subcontracting Order DocType not installed")
        doc = frappe.get_doc("Subcontracting Order", name)
        if doc.docstatus != 1:
            return fail("Only submitted Subcontracting Orders can be cancelled")
        doc.cancel()
        frappe.db.commit()
        return ok(
            {"subcontracting_order": {"id": doc.name, "status": "Cancelled"}},
            "Subcontracting Order cancelled",
        )
    except Exception as e:
        return fail(str(e))


# ─── Raw Material Transfer ────────────────────────────────────────────────────

@frappe.whitelist()
def create_raw_material_transfer(subcontracting_order, data=None, **kwargs):
    """
    Create a Stock Entry to transfer raw materials to the subcontractor
    (Material Transfer for Subcontract). Mirrors ERPNext's
    'Transfer Raw Materials' action on the Subcontracting Order.

    Args:
        subcontracting_order (str): Subcontracting Order ID.
        data (dict, optional): Additional overrides:
            - posting_date (str)
            - posting_time (str)
            - from_warehouse (str): Source warehouse.
            - to_warehouse (str): Supplier/subcontracting warehouse.

    Returns:
        dict: Name of the created Stock Entry.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Subcontracting Order") or not has_doctype("Stock Entry"):
            return fail("Required DocType not installed")

        from erpnext.subcontracting.doctype.subcontracting_order.subcontracting_order import (
            make_rm_stock_entry,
        )
        se = make_rm_stock_entry(subcontracting_order)
        se.posting_date = p.get("posting_date") or nowdate()
        if p.get("from_warehouse"):
            for row in se.items:
                row.s_warehouse = p["from_warehouse"]
        if p.get("to_warehouse"):
            for row in se.items:
                row.t_warehouse = p["to_warehouse"]
        se.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"stock_entry": {"id": se.name}}, "Raw Material Transfer created")
    except Exception as e:
        return fail(str(e))


# ─── Subcontracting Receipts ──────────────────────────────────────────────────

@frappe.whitelist()
def get_subcontracting_receipts(company=None, status=None, limit=50, offset=0):
    """
    List Subcontracting Receipts. These record the finished goods received
    back from the subcontractor.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / Submitted / Cancelled.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Subcontracting Receipts.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Subcontracting Receipt"):
        return ok({"subcontracting_receipts": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["docstatus"] = {"Draft": 0, "Submitted": 1, "Cancelled": 2}.get(status, 0)

    fields = pick_fields("Subcontracting Receipt", [
        "name", "supplier", "supplier_name", "posting_date",
        "status", "total", "currency",
    ])

    rows = frappe.get_all(
        "Subcontracting Receipt",
        filters=filters,
        fields=fields,
        order_by="posting_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Subcontracting Receipt", filters)
    return ok(
        {"subcontracting_receipts": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_subcontracting_receipt(name):
    """
    Fetch a single Subcontracting Receipt.

    Args:
        name (str): Subcontracting Receipt ID.

    Returns:
        dict: Full Subcontracting Receipt document.
    """
    require_auth()
    if not has_doctype("Subcontracting Receipt"):
        return fail("Subcontracting Receipt DocType not installed")
    doc = frappe.get_doc("Subcontracting Receipt", name)
    return ok({"subcontracting_receipt": doc.as_dict()})


@frappe.whitelist()
def create_subcontracting_receipt(data=None, **kwargs):
    """
    Create a Subcontracting Receipt to record finished goods returned
    by the subcontractor. Pass ``from_subcontracting_order`` to
    auto-populate items from a Subcontracting Order.

    Payload fields:
        from_subcontracting_order (str, optional): Source Subcontracting Order.
        supplier (str): Supplier (required unless from_subcontracting_order).
        posting_date (str, optional): Defaults to today.
        items (list[dict]): Received item rows with:
            - item_code, qty, rate, warehouse, subcontracting_order,
              subcontracting_order_item.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Subcontracting Receipt.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Subcontracting Receipt"):
            return fail("Subcontracting Receipt DocType not installed")

        if p.get("from_subcontracting_order"):
            from erpnext.subcontracting.doctype.subcontracting_order.subcontracting_order import (
                make_subcontracting_receipt,
            )
            receipt = make_subcontracting_receipt(p["from_subcontracting_order"])
            receipt.posting_date = p.get("posting_date") or nowdate()
            receipt.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok(
                {"subcontracting_receipt": {"id": receipt.name}},
                "Subcontracting Receipt created from Order",
            )

        company = get_company(p.get("company"))
        receipt = frappe.new_doc("Subcontracting Receipt")
        receipt.company = company
        receipt.supplier = p.get("supplier")
        receipt.posting_date = p.get("posting_date") or nowdate()

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            receipt.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "warehouse": item.get("warehouse"),
                "subcontracting_order": item.get("subcontracting_order"),
                "subcontracting_order_item": item.get("subcontracting_order_item"),
            })

        receipt.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"subcontracting_receipt": {"id": receipt.name}}, "Subcontracting Receipt created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_subcontracting_receipt(name):
    """
    Submit a Subcontracting Receipt to update stock and trigger
    purchase accounting entries.

    Args:
        name (str): Subcontracting Receipt ID.

    Returns:
        dict: Updated status.
    """
    require_auth()
    try:
        if not has_doctype("Subcontracting Receipt"):
            return fail("Subcontracting Receipt DocType not installed")
        doc = frappe.get_doc("Subcontracting Receipt", name)
        if doc.docstatus != 0:
            return fail(f"Subcontracting Receipt {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok(
            {"subcontracting_receipt": {"id": doc.name, "status": "Submitted"}},
            "Subcontracting Receipt submitted",
        )
    except Exception as e:
        return fail(str(e))


# ─── Subcontracting BOM helpers ───────────────────────────────────────────────

@frappe.whitelist()
def get_boms_for_item(item_code, company=None):
    """
    List all Bills of Materials for a given finished-good item,
    useful for selecting the BOM when creating Subcontracting Orders.

    Args:
        item_code (str): Finished good item code.
        company (str, optional): Company filter.

    Returns:
        dict: List of BOMs with name, item, is_default, is_active.
    """
    require_auth()
    if not has_doctype("BOM"):
        return ok({"boms": []})

    filters = {"item": item_code, "is_active": 1, "docstatus": 1}
    if company:
        filters["company"] = get_company(company)

    rows = frappe.get_all(
        "BOM",
        filters=filters,
        fields=["name", "item", "item_name", "quantity", "is_default", "is_active"],
        order_by="is_default desc",
    )
    return ok({"boms": rows})