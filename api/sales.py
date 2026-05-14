"""
sales.py  –  Sales module API for the Fuze Business Suite.
Covers Products/Items, Quotations, Sales Orders, Delivery Notes,
Invoices, Payments, Blanket Orders, Campaigns, and the Sales dashboard.
South African businesses – default currency ZAR.

ERPNext Selling workflow:
    Lead/Opportunity → Quotation → Sales Order → Delivery Note → Sales Invoice → Payment
"""

import frappe
from frappe.utils import flt, nowdate, get_first_day, get_last_day, add_days
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
    today = nowdate()
    start = get_first_day(today)
    end = get_last_day(today)

    quotations = safe_count("Quotation", {"company": company})
    orders = safe_count("Sales Order", {"company": company})
    invoices = safe_count("Sales Invoice", {"company": company, "docstatus": 1})
    pending_orders = safe_count("Sales Order", {
        "company": company,
        "status": ["in", ["Draft", "To Deliver and Bill", "To Bill"]],
    })

    total_revenue = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Sales Invoice") else 0

    month_revenue = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1 AND posting_date BETWEEN %s AND %s",
        (company, start, end),
    ) if has_doctype("Sales Invoice") else 0

    outstanding = safe_sql_sum(
        "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1 AND outstanding_amount>0",
        (company,),
    ) if has_doctype("Sales Invoice") else 0

    overdue = safe_count("Sales Invoice", {
        "company": company, "docstatus": 1,
        "outstanding_amount": [">", 0], "due_date": ["<", today],
    }) if has_doctype("Sales Invoice") else 0

    # Delivery notes pending billing
    pending_dn = safe_count("Delivery Note", {
        "company": company, "docstatus": 1,
        "status": ["in", ["To Bill"]],
    }) if has_doctype("Delivery Note") else 0

    return ok({
        "cards": {
            "quotations": quotations,
            "sales_orders": orders,
            "pending_orders": pending_orders,
            "invoices": invoices,
            "pending_delivery_notes": pending_dn,
            "total_revenue": money(total_revenue),
            "month_revenue": money(month_revenue),
            "outstanding": money(outstanding),
            "overdue_invoices": overdue,
        },
        "currency": currency,
        "period": {"month_start": str(start), "month_end": str(end)},
    })


# ─── Products / Items ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_products(limit=50, offset=0, search=None, item_group=None):
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Item"):
        return ok({"products": []}, meta={"total": 0})

    filters = {"disabled": 0}
    if item_group:
        filters["item_group"] = item_group

    if search:
        rows = frappe.get_all(
            "Item",
            filters=[[" disabled", "=", 0], ["item_name", "like", f"%{search}%"]],
            fields=pick_fields("Item", [
                "name", "item_name", "item_code", "item_group",
                "stock_uom", "standard_rate", "description",
                "is_stock_item", "is_service_item", "image",
            ]),
            order_by="item_name asc",
            limit_start=offset,
            limit_page_length=limit,
        )
    else:
        rows = frappe.get_all(
            "Item",
            filters=filters,
            fields=pick_fields("Item", [
                "name", "item_name", "item_code", "item_group",
                "stock_uom", "standard_rate", "description",
                "is_stock_item", "is_service_item", "image",
            ]),
            order_by="item_name asc",
            limit_start=offset,
            limit_page_length=limit,
        )

    total = frappe.db.count("Item", filters)
    return ok({"products": rows, "currency": get_currency()},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Quotations ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_quotations(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    if not has_doctype("Quotation"):
        return ok({"quotations": [], "currency": get_currency(company)}, meta={"total": 0})

    fields = pick_fields("Quotation", [
        "name", "quotation_to", "party_name", "customer_name",
        "transaction_date", "valid_till", "grand_total", "status",
        "currency", "order_type",
    ])

    rows = frappe.get_all(
        "Quotation",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Quotation", filters)
    return ok(
        {"quotations": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_quotation(name):
    require_auth()
    if not has_doctype("Quotation"):
        return fail("Quotation DocType not installed")
    doc = frappe.get_doc("Quotation", name)
    return ok({"quotation": doc.as_dict()})


@frappe.whitelist()
def create_quotation(data=None, **kwargs):
    """
    Create a new Quotation. The payload should include at least a customer
    (`customer` or `customer_name`) and a list of items with quantity and rate.
    Additional fields such as transaction_date, valid_till, and company may be
    provided. Returns the name of the created Quotation.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quotation"):
            return fail("Quotation DocType not installed")
        company = get_company(p.get("company"))
        quotation = frappe.new_doc("Quotation")
        quotation.company = company
        # Determine the party; quotation_to may be Customer, Lead, etc.
        quotation.quotation_to = p.get("quotation_to") or "Customer"
        # party_name and customer fields hold references depending on quotation_to
        quotation.party_name = p.get("party_name") or p.get("customer") or p.get("customer_name")
        quotation.customer = p.get("customer")
        quotation.customer_name = p.get("customer_name")
        quotation.transaction_date = p.get("transaction_date") or nowdate()
        quotation.valid_till = p.get("valid_till") or None
        quotation.order_type = p.get("order_type") or "Sales"
        # Items: expect a list of dicts with item_code, qty, rate, description, etc.
        items = p.get("items") or []
        for item in items:
            if not isinstance(item, dict):
                continue
            quotation.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
            })
        quotation.insert(ignore_permissions=True)
        # Save but do not submit automatically; allow user to review
        frappe.db.commit()
        return ok({"quotation": {"id": quotation.name}}, "Quotation created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_quotation(name):
    """
    Submit (freeze) a Quotation so it can be sent to the customer.
    Once submitted, changes are no longer allowed — mirrors ERPNext Submit.

    Args:
        name (str): Quotation ID (e.g. ``QTN-00001``).

    Returns:
        dict: Success response with quotation name and new status.
    """
    require_auth()
    try:
        if not has_doctype("Quotation"):
            return fail("Quotation DocType not installed")
        doc = frappe.get_doc("Quotation", name)
        if doc.docstatus != 0:
            return fail(f"Quotation {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok({"quotation": {"id": doc.name, "status": doc.status}}, "Quotation submitted")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_quotation(name):
    """
    Cancel a submitted Quotation.

    Args:
        name (str): Quotation ID.

    Returns:
        dict: Success response or failure reason.
    """
    require_auth()
    try:
        if not has_doctype("Quotation"):
            return fail("Quotation DocType not installed")
        doc = frappe.get_doc("Quotation", name)
        if doc.docstatus != 1:
            return fail("Only submitted quotations can be cancelled")
        doc.cancel()
        frappe.db.commit()
        return ok({"quotation": {"id": doc.name, "status": "Cancelled"}}, "Quotation cancelled")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def mark_quotation_lost(name, lost_reasons=None, competitors=None):
    """
    Mark a Quotation as Lost with optional reasons and competitor info.
    Mirrors ERPNext's 'Declare Order Lost' action.

    Args:
        name (str): Quotation ID.
        lost_reasons (list[dict]): e.g. [{"lost_reason": "Too Expensive"}]
        competitors (list[dict]): e.g. [{"competitor": "Acme Corp"}]

    Returns:
        dict: Success response.
    """
    require_auth()
    try:
        if not has_doctype("Quotation"):
            return fail("Quotation DocType not installed")
        doc = frappe.get_doc("Quotation", name)
        doc.status = "Lost"
        if lost_reasons:
            for r in (lost_reasons if isinstance(lost_reasons, list) else []):
                doc.append("lost_reasons", r)
        if competitors:
            for c in (competitors if isinstance(competitors, list) else []):
                doc.append("competitors", c)
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quotation": {"id": doc.name, "status": "Lost"}}, "Quotation marked as Lost")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def convert_quotation_to_order(name, delivery_date=None):
    """
    Convert a submitted Quotation into a Sales Order.
    Mirrors ERPNext's 'Make Sales Order' button on the Quotation form.

    Args:
        name (str): Submitted Quotation ID.
        delivery_date (str, optional): Override delivery date for all items.

    Returns:
        dict: Name of the created Sales Order.
    """
    require_auth()
    try:
        if not has_doctype("Quotation") or not has_doctype("Sales Order"):
            return fail("Required DocType not installed")
        from erpnext.selling.doctype.quotation.quotation import make_sales_order
        so = make_sales_order(name)
        if delivery_date:
            so.delivery_date = delivery_date
            for item in so.items:
                if not item.delivery_date:
                    item.delivery_date = delivery_date
        so.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"sales_order": {"id": so.name}}, "Sales Order created from Quotation")
    except Exception as e:
        return fail(str(e))


# ─── Sales Orders ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_sales_orders(company=None, status=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    if not has_doctype("Sales Order"):
        return ok({"orders": [], "currency": get_currency(company)}, meta={"total": 0})

    fields = pick_fields("Sales Order", [
        "name", "customer", "customer_name", "transaction_date",
        "delivery_date", "grand_total", "status",
        "currency", "per_delivered", "per_billed", "advance_paid",
    ])

    rows = frappe.get_all(
        "Sales Order",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Sales Order", filters)
    return ok(
        {"orders": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_sales_order(name):
    require_auth()
    if not has_doctype("Sales Order"):
        return fail("Sales Order DocType not installed")
    doc = frappe.get_doc("Sales Order", name)
    return ok({"order": doc.as_dict()})


@frappe.whitelist()
def create_sales_order(data=None, **kwargs):
    """
    Create a Sales Order — the binding contract with your customer.
    Pass ``from_quotation`` to automatically copy items from a submitted
    Quotation, or supply items manually.

    Payload fields:
        customer (str): Customer name (required unless from_quotation).
        from_quotation (str, optional): Quotation ID to convert.
        delivery_date (str, optional): Default delivery date for all items.
        po_no (str, optional): Customer's Purchase Order number.
        po_date (str, optional): Customer's PO date.
        items (list[dict]): Items with item_code, qty, rate, uom, warehouse.
        taxes (list[dict], optional): Tax and charges rows.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Sales Order.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")

        # Delegate to conversion helper if quotation provided
        if p.get("from_quotation"):
            return convert_quotation_to_order(
                p["from_quotation"],
                delivery_date=p.get("delivery_date"),
            )

        company = get_company(p.get("company"))
        so = frappe.new_doc("Sales Order")
        so.company = company
        so.customer = p.get("customer")
        so.customer_name = p.get("customer_name")
        so.transaction_date = p.get("transaction_date") or nowdate()
        so.delivery_date = p.get("delivery_date") or None
        so.po_no = p.get("po_no") or None
        so.po_date = p.get("po_date") or None
        so.order_type = p.get("order_type") or "Sales"
        so.currency = p.get("currency") or get_currency(company)

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            so.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "delivery_date": item.get("delivery_date") or p.get("delivery_date"),
                "warehouse": item.get("warehouse"),
            })

        if p.get("taxes"):
            for tax in p.get("taxes"):
                so.append("taxes", tax)

        so.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"sales_order": {"id": so.name}}, "Sales Order created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_sales_order(name):
    """
    Submit a Sales Order, reserving stock and enabling downstream steps
    (Delivery Note, Invoice, Material Request, Production Order).

    Args:
        name (str): Sales Order ID.

    Returns:
        dict: Sales Order name and status after submission.
    """
    require_auth()
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")
        doc = frappe.get_doc("Sales Order", name)
        if doc.docstatus != 0:
            return fail(f"Sales Order {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok({"sales_order": {"id": doc.name, "status": doc.status}}, "Sales Order submitted")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_sales_order(name):
    """
    Cancel a submitted Sales Order. Releases any reserved stock.

    Args:
        name (str): Sales Order ID.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")
        doc = frappe.get_doc("Sales Order", name)
        if doc.docstatus != 1:
            return fail("Only submitted Sales Orders can be cancelled")
        doc.cancel()
        frappe.db.commit()
        return ok({"sales_order": {"id": doc.name, "status": "Cancelled"}}, "Sales Order cancelled")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def hold_sales_order(name, reason=None):
    """
    Place a Sales Order on hold. Stops further processing until released.

    Args:
        name (str): Sales Order ID.
        reason (str, optional): Reason for hold.

    Returns:
        dict: Updated Sales Order status.
    """
    require_auth()
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")
        doc = frappe.get_doc("Sales Order", name)
        doc.hold_sales_order(reason=reason or "")
        frappe.db.commit()
        return ok({"sales_order": {"id": doc.name, "status": doc.status}}, "Sales Order put on hold")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def close_sales_order(name):
    """
    Close a Sales Order to stop further deliveries or billing,
    even if it has not been fully delivered/billed.

    Args:
        name (str): Sales Order ID.

    Returns:
        dict: Updated Sales Order status.
    """
    require_auth()
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")
        doc = frappe.get_doc("Sales Order", name)
        doc.update_status("Closed")
        frappe.db.commit()
        return ok({"sales_order": {"id": doc.name, "status": "Closed"}}, "Sales Order closed")
    except Exception as e:
        return fail(str(e))


# ─── Delivery Notes ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_delivery_notes(company=None, status=None, limit=50, offset=0):
    """
    List Delivery Notes. Optionally filter by company or status
    (Draft, To Bill, Completed, Cancelled, Return Issued).

    Returns:
        dict: Paginated list of Delivery Notes.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    if not has_doctype("Delivery Note"):
        return ok({"delivery_notes": [], "currency": get_currency(company)}, meta={"total": 0})

    fields = pick_fields("Delivery Note", [
        "name", "customer", "customer_name", "posting_date",
        "grand_total", "status", "currency", "lr_no",
    ])

    rows = frappe.get_all(
        "Delivery Note",
        filters=filters,
        fields=fields,
        order_by="posting_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Delivery Note", filters)
    return ok(
        {"delivery_notes": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_delivery_note(name):
    """
    Fetch a single Delivery Note with all child rows.

    Args:
        name (str): Delivery Note ID.

    Returns:
        dict: Full Delivery Note document.
    """
    require_auth()
    if not has_doctype("Delivery Note"):
        return fail("Delivery Note DocType not installed")
    doc = frappe.get_doc("Delivery Note", name)
    return ok({"delivery_note": doc.as_dict()})


@frappe.whitelist()
def create_delivery_note(data=None, **kwargs):
    """
    Create a Delivery Note recording the physical shipment of goods.
    Pass ``from_sales_order`` to copy items automatically from a
    submitted Sales Order, or supply items manually.

    Payload fields:
        customer (str): Customer name (required unless from_sales_order).
        from_sales_order (str, optional): Sales Order to pull items from.
        posting_date (str, optional): Defaults to today.
        items (list[dict]): Items with item_code, qty, warehouse, etc.
        lr_no (str, optional): Lorry Receipt / waybill number.
        lr_date (str, optional): Lorry Receipt date.
        vehicle_no (str, optional): Vehicle / truck registration.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Delivery Note.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Delivery Note"):
            return fail("Delivery Note DocType not installed")

        # Use ERPNext's built-in mapper when coming from a Sales Order
        if p.get("from_sales_order"):
            from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note
            dn = make_delivery_note(p["from_sales_order"])
            dn.posting_date = p.get("posting_date") or nowdate()
            if p.get("lr_no"):
                dn.lr_no = p["lr_no"]
            if p.get("lr_date"):
                dn.lr_date = p["lr_date"]
            if p.get("vehicle_no"):
                dn.vehicle_no = p["vehicle_no"]
            dn.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok({"delivery_note": {"id": dn.name}}, "Delivery Note created from Sales Order")

        company = get_company(p.get("company"))
        dn = frappe.new_doc("Delivery Note")
        dn.company = company
        dn.customer = p.get("customer")
        dn.customer_name = p.get("customer_name")
        dn.posting_date = p.get("posting_date") or nowdate()
        dn.lr_no = p.get("lr_no") or None
        dn.lr_date = p.get("lr_date") or None
        dn.vehicle_no = p.get("vehicle_no") or None
        dn.currency = p.get("currency") or get_currency(company)

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            dn.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "warehouse": item.get("warehouse"),
                "against_sales_order": item.get("against_sales_order"),
            })

        dn.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"delivery_note": {"id": dn.name}}, "Delivery Note created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_delivery_note(name):
    """
    Submit a Delivery Note, updating stock ledger entries.

    Args:
        name (str): Delivery Note ID.

    Returns:
        dict: Delivery Note name and status after submission.
    """
    require_auth()
    try:
        if not has_doctype("Delivery Note"):
            return fail("Delivery Note DocType not installed")
        doc = frappe.get_doc("Delivery Note", name)
        if doc.docstatus != 0:
            return fail(f"Delivery Note {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok({"delivery_note": {"id": doc.name, "status": doc.status}}, "Delivery Note submitted")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def create_return_delivery_note(name):
    """
    Create a Return Delivery Note (goods returned by customer) against
    a submitted Delivery Note. Mirrors ERPNext's 'Return' action.

    Args:
        name (str): Original submitted Delivery Note ID.

    Returns:
        dict: Name of the created return Delivery Note.
    """
    require_auth()
    try:
        if not has_doctype("Delivery Note"):
            return fail("Delivery Note DocType not installed")
        from erpnext.stock.doctype.delivery_note.delivery_note import make_return_doc
        ret = make_return_doc("Delivery Note", name)
        ret.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"delivery_note": {"id": ret.name}}, "Return Delivery Note created")
    except Exception as e:
        return fail(str(e))


# ─── Sales Invoices ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_invoices(company=None, status=None, customer=None, limit=50, offset=0):
    """
    List Sales Invoices. Filter by company, status, or customer.
    Status values: Draft, Submitted, Paid, Partly Paid, Unpaid,
    Overdue, Cancelled, Return Issued.

    Returns:
        dict: Paginated list of Sales Invoices.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if customer:
        filters["customer"] = customer

    if not has_doctype("Sales Invoice"):
        return ok({"invoices": [], "currency": get_currency(company)}, meta={"total": 0})

    fields = pick_fields("Sales Invoice", [
        "name", "customer", "customer_name", "posting_date",
        "due_date", "grand_total", "outstanding_amount", "paid_amount",
        "status", "currency", "is_return", "return_against",
    ])

    rows = frappe.get_all(
        "Sales Invoice",
        filters=filters,
        fields=fields,
        order_by="posting_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Sales Invoice", filters)
    return ok(
        {"invoices": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_invoice(name):
    """
    Fetch a single Sales Invoice with all child rows (items, taxes, payments).

    Args:
        name (str): Sales Invoice ID.

    Returns:
        dict: Full Sales Invoice document.
    """
    require_auth()
    if not has_doctype("Sales Invoice"):
        return fail("Sales Invoice DocType not installed")
    doc = frappe.get_doc("Sales Invoice", name)
    return ok({"invoice": doc.as_dict()})


@frappe.whitelist()
def create_sales_invoice(data=None, **kwargs):
    """
    Create a new Sales Invoice. The payload should include at least a
    customer (`customer`) and a list of items with quantity and rate. Optionally
    include due_date, posting_date, company, and other standard fields. This
    helper will insert and submit the invoice so that it reflects in accounts.
    Returns the name of the created Sales Invoice.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Sales Invoice"):
            return fail("Sales Invoice DocType not installed")
        company = get_company(p.get("company"))
        inv = frappe.new_doc("Sales Invoice")
        inv.company = company
        inv.customer = p.get("customer")
        inv.customer_name = p.get("customer_name")
        inv.posting_date = p.get("posting_date") or nowdate()
        inv.due_date = p.get("due_date") or inv.posting_date
        inv.currency = p.get("currency") or get_currency(company)
        inv.update_stock = p.get("update_stock") or 0
        # Items list
        items = p.get("items") or []
        for item in items:
            if not isinstance(item, dict):
                continue
            inv.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
            })
        # Taxes and charges can be supplied
        if p.get("taxes"):
            for tax in p.get("taxes"):
                inv.append("taxes", tax)
        inv.insert(ignore_permissions=True)
        # Submit invoice to finalize; catch any validation errors
        try:
            inv.submit()
        except Exception:
            # If submission fails, leave as draft and return draft name
            pass
        frappe.db.commit()
        return ok({"invoice": {"id": inv.name}}, "Sales Invoice created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_sales_invoice(name):
    """
    Cancel a submitted Sales Invoice. Reverses GL entries.
    To issue a refund use ``create_credit_note`` instead.

    Args:
        name (str): Sales Invoice ID.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Sales Invoice"):
            return fail("Sales Invoice DocType not installed")
        doc = frappe.get_doc("Sales Invoice", name)
        if doc.docstatus != 1:
            return fail("Only submitted invoices can be cancelled")
        doc.cancel()
        frappe.db.commit()
        return ok({"invoice": {"id": doc.name, "status": "Cancelled"}}, "Sales Invoice cancelled")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def create_credit_note(name):
    """
    Create a Credit Note (return invoice) against a submitted Sales Invoice.
    Mirrors ERPNext's 'Return / Credit Note' action. Reduces the customer's
    outstanding balance.

    Args:
        name (str): Original submitted Sales Invoice ID.

    Returns:
        dict: Name of the created Credit Note.
    """
    require_auth()
    try:
        if not has_doctype("Sales Invoice"):
            return fail("Sales Invoice DocType not installed")
        from erpnext.accounts.doctype.sales_invoice.sales_invoice import make_return_doc
        credit_note = make_return_doc("Sales Invoice", name)
        credit_note.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"credit_note": {"id": credit_note.name}}, "Credit Note created")
    except Exception as e:
        return fail(str(e))


# ─── Payments ─────────────────────────────────────────────────────────────────

@frappe.whitelist()
def create_payment_entry(data=None, **kwargs):
    """
    Record a customer payment and reconcile it against outstanding invoices.
    Mirrors ERPNext's Payment Entry with type 'Receive'.

    Payload fields:
        customer (str): Customer name (required).
        paid_amount (float): Amount received (required).
        mode_of_payment (str): e.g. 'Bank Transfer', 'Cash', 'EFT'.
        paid_from (str): Debtors account (leave blank to auto-resolve).
        paid_to (str): Bank / cash account to receive funds into.
        reference_no (str, optional): Bank reference or cheque number.
        reference_date (str, optional): Date of the bank transaction.
        against_invoices (list[str], optional): Invoice IDs to allocate against.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Payment Entry.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Payment Entry"):
            return fail("Payment Entry DocType not installed")

        company = get_company(p.get("company"))
        pe = frappe.new_doc("Payment Entry")
        pe.payment_type = "Receive"
        pe.company = company
        pe.party_type = "Customer"
        pe.party = p.get("customer")
        pe.paid_amount = flt(p.get("paid_amount") or 0)
        pe.received_amount = flt(p.get("received_amount") or pe.paid_amount)
        pe.mode_of_payment = p.get("mode_of_payment") or "Bank Transfer"
        pe.paid_from = p.get("paid_from") or None
        pe.paid_to = p.get("paid_to") or None
        pe.reference_no = p.get("reference_no") or None
        pe.reference_date = p.get("reference_date") or nowdate()
        pe.remarks = p.get("remarks") or None

        # Allocate against specific invoices if provided
        for sinv_id in (p.get("against_invoices") or []):
            inv = frappe.get_doc("Sales Invoice", sinv_id)
            outstanding = flt(inv.outstanding_amount)
            allocated = min(pe.paid_amount, outstanding)
            pe.append("references", {
                "reference_doctype": "Sales Invoice",
                "reference_name": sinv_id,
                "total_amount": inv.grand_total,
                "outstanding_amount": outstanding,
                "allocated_amount": allocated,
            })

        pe.setup_party_account_field()
        pe.set_missing_values()
        pe.insert(ignore_permissions=True)
        pe.submit()
        frappe.db.commit()
        return ok({"payment_entry": {"id": pe.name}}, "Payment recorded")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_payment_entries(company=None, customer=None, limit=50, offset=0):
    """
    List Payment Entries for customers.

    Returns:
        dict: Paginated list of Payment Entries.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company, "payment_type": "Receive", "party_type": "Customer"}
    if customer:
        filters["party"] = customer

    if not has_doctype("Payment Entry"):
        return ok({"payments": []}, meta={"total": 0})

    fields = pick_fields("Payment Entry", [
        "name", "party", "paid_amount", "mode_of_payment",
        "reference_no", "reference_date", "docstatus",
    ])

    rows = frappe.get_all(
        "Payment Entry",
        filters=filters,
        fields=fields,
        order_by="reference_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Payment Entry", filters)
    return ok(
        {"payments": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


# ─── Blanket Orders (rate contracts) ──────────────────────────────────────────

@frappe.whitelist()
def get_blanket_orders(company=None, customer=None, limit=50, offset=0):
    """
    List Blanket Orders (long-term rate contracts with key customers).

    Returns:
        dict: Paginated list of Blanket Orders.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company, "order_type": "Selling"}
    if customer:
        filters["customer"] = customer

    if not has_doctype("Blanket Order"):
        return ok({"blanket_orders": []}, meta={"total": 0})

    fields = pick_fields("Blanket Order", [
        "name", "customer", "customer_name", "from_date", "to_date",
        "docstatus", "amended_from",
    ])

    rows = frappe.get_all(
        "Blanket Order",
        filters=filters,
        fields=fields,
        order_by="from_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )

    total = frappe.db.count("Blanket Order", filters)
    return ok({"blanket_orders": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def create_blanket_order(data=None, **kwargs):
    """
    Create a Blanket Order — a pre-agreed rate contract with a customer.
    When creating Sales Orders, ERPNext validates rates against this contract.

    Payload fields:
        customer (str): Customer name (required).
        from_date (str): Contract start date.
        to_date (str): Contract end date.
        items (list[dict]): Items with item_code, qty, rate, uom.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Blanket Order.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Blanket Order"):
            return fail("Blanket Order DocType not installed")
        company = get_company(p.get("company"))
        bo = frappe.new_doc("Blanket Order")
        bo.company = company
        bo.order_type = "Selling"
        bo.customer = p.get("customer")
        bo.from_date = p.get("from_date") or nowdate()
        bo.to_date = p.get("to_date") or None

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            bo.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "uom": item.get("uom"),
            })

        bo.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"blanket_order": {"id": bo.name}}, "Blanket Order created")
    except Exception as e:
        return fail(str(e))


# ─── Revenue leaderboard by customer ─────────────────────────────────────────

@frappe.whitelist()
def get_top_customers(company=None, limit=10):
    require_auth()
    company = get_company(company)

    if not has_doctype("Sales Invoice"):
        return ok({"customers": [], "currency": get_currency(company)})

    rows = frappe.db.sql(
        """SELECT customer_name,
                  COALESCE(SUM(grand_total),0) AS revenue,
                  COUNT(*) AS orders
           FROM `tabSales Invoice`
           WHERE company=%s AND docstatus=1
           GROUP BY customer_name
           ORDER BY revenue DESC
           LIMIT %s""",
        (company, int(limit or 10)),
        as_dict=True,
    )

    return ok({
        "customers": [
            {"name": r.customer_name, "revenue": money(r.revenue), "orders": r.orders}
            for r in rows
        ],
        "currency": get_currency(company),
    })


# ─── Monthly sales trend ──────────────────────────────────────────────────────

@frappe.whitelist()
def get_sales_trend(company=None, months=6):
    require_auth()
    company = get_company(company)
    months = max(int(months or 6), 1)

    if not has_doctype("Sales Invoice"):
        return ok({"chart": [], "currency": get_currency(company)})

    rows = frappe.db.sql(
        """SELECT DATE_FORMAT(posting_date,'%%Y-%%m') AS month,
                  COUNT(*) AS count,
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

    chart = [
        {
            "month": r.month,
            "count": r.count,
            "revenue": money(r.revenue),
            "outstanding": money(r.outstanding),
        }
        for r in rows
    ]

    return ok({"chart": chart, "currency": get_currency(company)})


# ─── Document Portal Links ─────────────────────────────────────────────────

@frappe.whitelist()
def get_invoice_portal_url(name: str, print_format: str = None):
    """
    Generate a secure portal link for a Sales Invoice so that customers can
    view or pay the invoice online. If the document exposes a signature
    (via `get_signature`), the URL includes a key parameter for guest
    access. Otherwise, a generic URL to the ERPNext form is returned.

    Args:
        name (str): The Sales Invoice name (e.g. "SINV-0001").
        print_format (str, optional): Optional print format to attach.

    Returns:
        dict: Response containing the URL.
    """
    require_auth()
    try:
        if not has_doctype("Sales Invoice"):
            return fail("Sales Invoice DocType not installed")
        doc = frappe.get_doc("Sales Invoice", name)
        base_url = frappe.utils.get_url()
        key = None
        try:
            if hasattr(doc, "get_signature"):
                key = doc.get_signature()
        except Exception:
            key = None
        if key:
            url = f"{base_url}/Sales%20Invoice/{doc.name}?key={key}"
            if print_format:
                url += f"&format={print_format}"
        else:
            url = f"{base_url}/app/Sales%20Invoice/{doc.name}"
        return ok({"invoice_url": url})
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_quotation_portal_url(name: str, print_format: str = None):
    """
    Generate a secure portal link for a Quotation. Similar to invoices,
    includes a key parameter if supported. The link can be shared with
    prospective customers to view or accept the quotation online.

    Args:
        name (str): The Quotation name (e.g. "QTN-0001").
        print_format (str, optional): Optional print format to attach.

    Returns:
        dict: Response containing the URL.
    """
    require_auth()
    try:
        if not has_doctype("Quotation"):
            return fail("Quotation DocType not installed")
        doc = frappe.get_doc("Quotation", name)
        base_url = frappe.utils.get_url()
        key = None
        try:
            if hasattr(doc, "get_signature"):
                key = doc.get_signature()
        except Exception:
            key = None
        if key:
            url = f"{base_url}/Quotation/{doc.name}?key={key}"
            if print_format:
                url += f"&format={print_format}"
        else:
            url = f"{base_url}/app/Quotation/{doc.name}"
        return ok({"quotation_url": url})
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_sales_order_portal_url(name: str, print_format: str = None):
    """
    Generate a secure portal link for a Sales Order so the customer
    can review it online.

    Args:
        name (str): Sales Order ID.
        print_format (str, optional): Optional print format to attach.

    Returns:
        dict: Response containing the URL.
    """
    require_auth()
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")
        doc = frappe.get_doc("Sales Order", name)
        base_url = frappe.utils.get_url()
        key = None
        try:
            if hasattr(doc, "get_signature"):
                key = doc.get_signature()
        except Exception:
            key = None
        if key:
            url = f"{base_url}/Sales%20Order/{doc.name}?key={key}"
            if print_format:
                url += f"&format={print_format}"
        else:
            url = f"{base_url}/app/Sales%20Order/{doc.name}"
        return ok({"sales_order_url": url})
    except Exception as e:
        return fail(str(e))


# ─── Sending Documents via Email ───────────────────────────────────────────

@frappe.whitelist()
def send_invoice_email(name: str, recipient: str, message: str = None, print_format: str = None, subject: str = None):
    """
    Email a sales invoice to a customer. This helper fetches the specified
    invoice, generates a PDF using the requested print format and sends it
    to the provided recipient address via Frappe's ``sendmail`` utility.

    Args:
        name (str): The Sales Invoice ID (e.g. ``SINV-0001``).
        recipient (str): Email address of the recipient.
        message (str, optional): Message body to include in the email.
        print_format (str, optional): Print format to use for the PDF.
        subject (str, optional): Email subject. Defaults to ``Invoice <name>``.

    Returns:
        dict: Success response indicating the email was queued or failure.
    """
    require_auth()
    try:
        if not has_doctype("Sales Invoice"):
            return fail("Sales Invoice DocType not installed")
        doc = frappe.get_doc("Sales Invoice", name)
        subject = subject or f"Invoice {doc.name} from {doc.company}"
        message_body = message or f"Please find attached invoice {doc.name}."
        pdf = frappe.attach_print(doc.doctype, doc.name, print_format=print_format)
        frappe.sendmail(recipients=[recipient], subject=subject, message=message_body, attachments=[pdf])
        return ok({"sent_to": recipient}, "Invoice emailed")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def send_quotation_email(name: str, recipient: str, message: str = None, print_format: str = None, subject: str = None):
    """
    Email a quotation to a prospective customer. Similar to invoices, this
    helper generates a PDF from the Quotation DocType and sends it via
    Frappe's email framework.

    Args:
        name (str): The Quotation ID (e.g. ``QTN-0001``).
        recipient (str): Email address of the recipient.
        message (str, optional): Message body to include in the email.
        print_format (str, optional): Print format to use for the PDF.
        subject (str, optional): Email subject. Defaults to ``Quotation <name>``.

    Returns:
        dict: Success response indicating the email was queued or failure.
    """
    require_auth()
    try:
        if not has_doctype("Quotation"):
            return fail("Quotation DocType not installed")
        doc = frappe.get_doc("Quotation", name)
        subject = subject or f"Quotation {doc.name} from {doc.company}"
        message_body = message or f"Please find attached quotation {doc.name}."
        pdf = frappe.attach_print(doc.doctype, doc.name, print_format=print_format)
        frappe.sendmail(recipients=[recipient], subject=subject, message=message_body, attachments=[pdf])
        return ok({"sent_to": recipient}, "Quotation emailed")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def send_sales_order_email(name: str, recipient: str, message: str = None, print_format: str = None, subject: str = None):
    """
    Email a Sales Order confirmation to a customer.

    Args:
        name (str): Sales Order ID (e.g. ``SO-0001``).
        recipient (str): Email address of the recipient.
        message (str, optional): Message body to include in the email.
        print_format (str, optional): Print format to use for the PDF.
        subject (str, optional): Email subject.

    Returns:
        dict: Success response indicating the email was queued or failure.
    """
    require_auth()
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")
        doc = frappe.get_doc("Sales Order", name)
        subject = subject or f"Order Confirmation {doc.name} from {doc.company}"
        message_body = message or f"Please find attached your order confirmation {doc.name}."
        pdf = frappe.attach_print(doc.doctype, doc.name, print_format=print_format)
        frappe.sendmail(recipients=[recipient], subject=subject, message=message_body, attachments=[pdf])
        return ok({"sent_to": recipient}, "Sales Order emailed")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def send_delivery_note_email(name: str, recipient: str, message: str = None, print_format: str = None, subject: str = None):
    """
    Email a Delivery Note / packing slip to a customer.

    Args:
        name (str): Delivery Note ID.
        recipient (str): Email address of the recipient.
        message (str, optional): Message body.
        print_format (str, optional): Print format for the PDF.
        subject (str, optional): Email subject.

    Returns:
        dict: Success response or failure.
    """
    require_auth()
    try:
        if not has_doctype("Delivery Note"):
            return fail("Delivery Note DocType not installed")
        doc = frappe.get_doc("Delivery Note", name)
        subject = subject or f"Delivery Note {doc.name} from {doc.company}"
        message_body = message or f"Please find attached delivery note {doc.name}."
        pdf = frappe.attach_print(doc.doctype, doc.name, print_format=print_format)
        frappe.sendmail(recipients=[recipient], subject=subject, message=message_body, attachments=[pdf])
        return ok({"sent_to": recipient}, "Delivery Note emailed")
    except Exception as e:
        return fail(str(e))