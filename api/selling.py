"""
selling.py  –  Selling module API for the Fuze Business Suite.
Covers Customers, Quotations, Sales Orders, Sales Invoices,
Delivery Notes, and the Selling dashboard.

ERPNext Selling workflow:
    Lead → Opportunity → Quotation → Sales Order
    → Delivery Note → Sales Invoice → Payment Entry
"""

import frappe
from frappe.utils import flt, nowdate
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, pick_fields,
    safe_count, safe_sql_sum, money,
)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard(company=None):
    """
    Return a summary of key Selling metrics for the current period.

    Args:
        company (str, optional): Filter by company.

    Returns:
        dict: Dashboard card data with order counts and revenue figures.
    """
    require_auth()
    company = get_company(company)
    currency = get_currency(company)

    open_quotations = safe_count("Quotation", {
        "company": company,
        "status": ["in", ["Open", "Draft"]],
        "docstatus": ["!=", 2],
    }) if has_doctype("Quotation") else 0

    open_orders = safe_count("Sales Order", {
        "company": company,
        "status": ["in", ["To Deliver and Bill", "To Bill", "To Deliver"]],
        "docstatus": 1,
    }) if has_doctype("Sales Order") else 0

    pending_delivery = safe_count("Delivery Note", {
        "company": company,
        "docstatus": 0,
    }) if has_doctype("Delivery Note") else 0

    unpaid_invoices = safe_count("Sales Invoice", {
        "company": company,
        "docstatus": 1,
        "status": ["in", ["Unpaid", "Overdue", "Partly Paid"]],
    }) if has_doctype("Sales Invoice") else 0

    total_revenue = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Sales Invoice") else 0

    outstanding = safe_sql_sum(
        "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Sales Invoice") else 0

    return ok({
        "cards": {
            "open_quotations": open_quotations,
            "open_sales_orders": open_orders,
            "pending_delivery_notes": pending_delivery,
            "unpaid_invoices": unpaid_invoices,
            "total_revenue": money(total_revenue),
            "total_outstanding": money(outstanding),
        },
        "currency": currency,
        "period": {"today": nowdate()},
    })


# ─── Customers ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_customers(company=None, customer_group=None, territory=None, limit=50, offset=0):
    """
    List Customers.

    Args:
        company (str, optional): Company filter.
        customer_group (str, optional): Filter by Customer Group.
        territory (str, optional): Filter by Territory.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Customers.
    """
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Customer"):
        return ok({"customers": []}, meta={"total": 0})

    filters = {}
    if customer_group:
        filters["customer_group"] = customer_group
    if territory:
        filters["territory"] = territory

    fields = pick_fields("Customer", [
        "name", "customer_name", "customer_type", "customer_group",
        "territory", "default_currency", "mobile_no", "email_id",
    ])

    rows = frappe.get_all(
        "Customer",
        filters=filters,
        fields=fields,
        order_by="customer_name asc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Customer", filters)
    return ok(
        {"customers": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_customer(name):
    """
    Fetch a single Customer with addresses, contacts, and credit limits.

    Args:
        name (str): Customer ID.

    Returns:
        dict: Full Customer document.
    """
    require_auth()
    if not has_doctype("Customer"):
        return fail("Customer DocType not installed")
    doc = frappe.get_doc("Customer", name)
    return ok({"customer": doc.as_dict()})


@frappe.whitelist()
def create_customer(data=None, **kwargs):
    """
    Create a new Customer.

    Payload fields:
        customer_name (str): Full customer name (required).
        customer_type (str): Company | Individual (required).
        customer_group (str): Customer Group (required).
        territory (str): Territory (required).
        default_currency (str, optional): ISO currency code.
        mobile_no (str, optional): Mobile phone number.
        email_id (str, optional): Primary email address.
        tax_id (str, optional): Tax registration number / VAT number.
        credit_limits (list[dict], optional): Credit limit rows with
            company (str) and credit_limit (float).

    Returns:
        dict: Name of the created Customer.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Customer"):
            return fail("Customer DocType not installed")

        doc = frappe.new_doc("Customer")
        doc.customer_name = p.get("customer_name")
        doc.customer_type = p.get("customer_type") or "Company"
        doc.customer_group = p.get("customer_group") or "All Customer Groups"
        doc.territory = p.get("territory") or "All Territories"
        doc.default_currency = p.get("default_currency") or get_currency(get_company())
        doc.mobile_no = p.get("mobile_no")
        doc.email_id = p.get("email_id")
        doc.tax_id = p.get("tax_id")

        for limit_row in (p.get("credit_limits") or []):
            if not isinstance(limit_row, dict):
                continue
            doc.append("credit_limits", {
                "company": limit_row.get("company") or get_company(),
                "credit_limit": flt(limit_row.get("credit_limit") or 0),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"customer": {"id": doc.name}}, "Customer created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def update_customer(name, data=None, **kwargs):
    """
    Update fields on an existing Customer.

    Args:
        name (str): Customer ID.
        data (dict): Fields to update — any subset of the create_customer payload.

    Returns:
        dict: Updated Customer ID.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Customer"):
            return fail("Customer DocType not installed")
        doc = frappe.get_doc("Customer", name)
        updatable = [
            "customer_name", "customer_type", "customer_group", "territory",
            "default_currency", "mobile_no", "email_id", "tax_id",
        ]
        for field in updatable:
            if p.get(field) is not None:
                setattr(doc, field, p[field])
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"customer": {"id": doc.name}}, "Customer updated")
    except Exception as e:
        return fail(str(e))


# ─── Quotations ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_quotations(company=None, status=None, customer=None, limit=50, offset=0):
    """
    List Quotations (sales quotes sent to prospects or customers).

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / Open / Replied / Ordered / Lost / Cancelled.
        customer (str, optional): Filter by customer / lead.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Quotations.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Quotation"):
        return ok({"quotations": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if customer:
        filters["party_name"] = customer

    fields = pick_fields("Quotation", [
        "name", "party_name", "customer_name", "transaction_date",
        "valid_till", "status", "grand_total", "currency",
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
    """
    Fetch a single Quotation with all item rows and tax details.

    Args:
        name (str): Quotation ID.

    Returns:
        dict: Full Quotation document.
    """
    require_auth()
    if not has_doctype("Quotation"):
        return fail("Quotation DocType not installed")
    doc = frappe.get_doc("Quotation", name)
    return ok({"quotation": doc.as_dict()})


@frappe.whitelist()
def create_quotation(data=None, **kwargs):
    """
    Create a new Quotation.

    Payload fields:
        quotation_to (str): Customer | Lead | Prospect (required).
        party_name (str): Customer / Lead name (required).
        transaction_date (str, optional): Defaults to today.
        valid_till (str, optional): Quote expiry date.
        items (list[dict]): Item rows with:
            item_code, qty, rate, warehouse (optional),
            delivery_date (optional), description (optional).
        taxes_and_charges (str, optional): Tax template.
        tc_name (str, optional): Terms and Conditions.
        company (str, optional): Company override.
        currency (str, optional): Transaction currency.

    Returns:
        dict: Name of the created Quotation.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Quotation"):
            return fail("Quotation DocType not installed")

        company = get_company(p.get("company"))
        doc = frappe.new_doc("Quotation")
        doc.company = company
        doc.quotation_to = p.get("quotation_to") or "Customer"
        doc.party_name = p.get("party_name")
        doc.transaction_date = p.get("transaction_date") or nowdate()
        doc.valid_till = p.get("valid_till")
        doc.currency = p.get("currency") or get_currency(company)
        doc.taxes_and_charges = p.get("taxes_and_charges")
        doc.tc_name = p.get("tc_name")

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            doc.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "qty": flt(item.get("qty") or 1),
                "rate": flt(item.get("rate") or 0),
                "warehouse": item.get("warehouse"),
                "delivery_date": item.get("delivery_date"),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"quotation": {"id": doc.name}}, "Quotation created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_quotation(name):
    """
    Submit a Quotation so it can be sent to the customer.

    Args:
        name (str): Quotation ID.

    Returns:
        dict: Updated status.
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
        return ok(
            {"quotation": {"id": doc.name, "status": doc.status}},
            "Quotation submitted",
        )
    except Exception as e:
        return fail(str(e))


# ─── Sales Orders ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_sales_orders(company=None, status=None, customer=None, limit=50, offset=0):
    """
    List Sales Orders.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / To Deliver and Bill / To Bill /
                                To Deliver / Completed / Cancelled / Closed.
        customer (str, optional): Filter by customer.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Sales Orders.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Sales Order"):
        return ok({"sales_orders": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if customer:
        filters["customer"] = customer

    fields = pick_fields("Sales Order", [
        "name", "customer", "customer_name", "transaction_date",
        "delivery_date", "status", "grand_total", "currency",
        "per_delivered", "per_billed",
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
        {"sales_orders": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_sales_order(name):
    """
    Fetch a single Sales Order with all line items and linked documents.

    Args:
        name (str): Sales Order ID.

    Returns:
        dict: Full Sales Order document.
    """
    require_auth()
    if not has_doctype("Sales Order"):
        return fail("Sales Order DocType not installed")
    doc = frappe.get_doc("Sales Order", name)
    return ok({"sales_order": doc.as_dict()})


@frappe.whitelist()
def create_sales_order(data=None, **kwargs):
    """
    Create a new Sales Order. Can also be created from a Quotation.

    Payload fields:
        customer (str): Customer name (required).
        delivery_date (str): Expected delivery date (required).
        transaction_date (str, optional): Order date. Defaults to today.
        from_quotation (str, optional): Convert a submitted Quotation.
        items (list[dict]): Item rows with item_code, qty, rate,
            warehouse (optional), delivery_date (optional).
        taxes_and_charges (str, optional): Tax template.
        tc_name (str, optional): Terms and Conditions.
        currency (str, optional): Transaction currency.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Sales Order.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Sales Order"):
            return fail("Sales Order DocType not installed")

        if p.get("from_quotation"):
            from erpnext.selling.doctype.quotation.quotation import make_sales_order
            doc = make_sales_order(p["from_quotation"])
        else:
            company = get_company(p.get("company"))
            doc = frappe.new_doc("Sales Order")
            doc.company = company
            doc.customer = p.get("customer")
            doc.transaction_date = p.get("transaction_date") or nowdate()
            doc.delivery_date = p.get("delivery_date") or nowdate()
            doc.currency = p.get("currency") or get_currency(company)
            doc.taxes_and_charges = p.get("taxes_and_charges")
            doc.tc_name = p.get("tc_name")

            for item in (p.get("items") or []):
                if not isinstance(item, dict):
                    continue
                doc.append("items", {
                    "item_code": item.get("item_code"),
                    "item_name": item.get("item_name"),
                    "description": item.get("description"),
                    "qty": flt(item.get("qty") or 1),
                    "rate": flt(item.get("rate") or 0),
                    "warehouse": item.get("warehouse"),
                    "delivery_date": item.get("delivery_date") or p.get("delivery_date"),
                })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"sales_order": {"id": doc.name}}, "Sales Order created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_sales_order(name):
    """
    Submit a Sales Order to confirm it and enable delivery / billing.

    Args:
        name (str): Sales Order ID.

    Returns:
        dict: Updated status.
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
        return ok(
            {"sales_order": {"id": doc.name, "status": doc.status}},
            "Sales Order submitted",
        )
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_sales_order(name):
    """
    Cancel a submitted Sales Order.

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
        return ok(
            {"sales_order": {"id": doc.name, "status": "Cancelled"}},
            "Sales Order cancelled",
        )
    except Exception as e:
        return fail(str(e))


# ─── Delivery Notes ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_delivery_notes(company=None, status=None, customer=None, limit=50, offset=0):
    """
    List Delivery Notes.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / To Bill / Completed / Cancelled / Return.
        customer (str, optional): Filter by customer.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Delivery Notes.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Delivery Note"):
        return ok({"delivery_notes": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if customer:
        filters["customer"] = customer

    fields = pick_fields("Delivery Note", [
        "name", "customer", "customer_name", "posting_date",
        "status", "grand_total", "currency",
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
        {"delivery_notes": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def create_delivery_note(data=None, **kwargs):
    """
    Create a Delivery Note. Can be created from a Sales Order.

    Payload fields:
        from_sales_order (str, optional): Auto-populate from a Sales Order.
        customer (str): Customer name (required unless from_sales_order).
        posting_date (str, optional): Defaults to today.
        items (list[dict]): Item rows with item_code, qty, rate, warehouse,
            against_sales_order (optional), so_detail (optional).
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Delivery Note.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Delivery Note"):
            return fail("Delivery Note DocType not installed")

        if p.get("from_sales_order"):
            from erpnext.selling.doctype.sales_order.sales_order import make_delivery_note
            doc = make_delivery_note(p["from_sales_order"])
            doc.posting_date = p.get("posting_date") or nowdate()
        else:
            company = get_company(p.get("company"))
            doc = frappe.new_doc("Delivery Note")
            doc.company = company
            doc.customer = p.get("customer")
            doc.posting_date = p.get("posting_date") or nowdate()

            for item in (p.get("items") or []):
                if not isinstance(item, dict):
                    continue
                doc.append("items", {
                    "item_code": item.get("item_code"),
                    "item_name": item.get("item_name"),
                    "qty": flt(item.get("qty") or 1),
                    "rate": flt(item.get("rate") or 0),
                    "warehouse": item.get("warehouse"),
                    "against_sales_order": item.get("against_sales_order"),
                    "so_detail": item.get("so_detail"),
                })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"delivery_note": {"id": doc.name}}, "Delivery Note created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_delivery_note(name):
    """
    Submit a Delivery Note to update stock and mark items as delivered.

    Args:
        name (str): Delivery Note ID.

    Returns:
        dict: Updated status.
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
        return ok(
            {"delivery_note": {"id": doc.name, "status": doc.status}},
            "Delivery Note submitted",
        )
    except Exception as e:
        return fail(str(e))


# ─── Sales Invoices ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_sales_invoices(company=None, status=None, customer=None, limit=50, offset=0):
    """
    List Sales Invoices.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / Submitted / Return / Credit Note Issued /
                                Unpaid / Overdue / Partly Paid / Paid / Cancelled.
        customer (str, optional): Filter by customer.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Sales Invoices.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Sales Invoice"):
        return ok({"sales_invoices": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if customer:
        filters["customer"] = customer

    fields = pick_fields("Sales Invoice", [
        "name", "customer", "customer_name", "posting_date",
        "due_date", "status", "grand_total", "outstanding_amount", "currency",
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
        {"sales_invoices": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_sales_invoice(name):
    """
    Fetch a single Sales Invoice with all item rows, taxes, and payments.

    Args:
        name (str): Sales Invoice ID.

    Returns:
        dict: Full Sales Invoice document.
    """
    require_auth()
    if not has_doctype("Sales Invoice"):
        return fail("Sales Invoice DocType not installed")
    doc = frappe.get_doc("Sales Invoice", name)
    return ok({"sales_invoice": doc.as_dict()})


@frappe.whitelist()
def create_sales_invoice(data=None, **kwargs):
    """
    Create a new Sales Invoice. Can be created from a Sales Order or
    Delivery Note.

    Payload fields:
        from_sales_order (str, optional): Auto-populate from a Sales Order.
        from_delivery_note (str, optional): Auto-populate from a Delivery Note.
        customer (str): Customer name (required unless from_* is provided).
        posting_date (str, optional): Defaults to today.
        due_date (str, optional): Payment due date.
        items (list[dict]): Item rows with item_code, qty, rate,
            income_account (optional), warehouse (optional).
        taxes_and_charges (str, optional): Tax template.
        currency (str, optional): Transaction currency.
        company (str, optional): Company override.
        is_return (bool, optional): Set True for a Credit Note.
        return_against (str, optional): Original invoice for Credit Note.

    Returns:
        dict: Name of the created Sales Invoice.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Sales Invoice"):
            return fail("Sales Invoice DocType not installed")

        if p.get("from_sales_order"):
            from erpnext.selling.doctype.sales_order.sales_order import make_sales_invoice
            doc = make_sales_invoice(p["from_sales_order"])
        elif p.get("from_delivery_note"):
            from erpnext.stock.doctype.delivery_note.delivery_note import make_sales_invoice
            doc = make_sales_invoice(p["from_delivery_note"])
        else:
            company = get_company(p.get("company"))
            doc = frappe.new_doc("Sales Invoice")
            doc.company = company
            doc.customer = p.get("customer")
            doc.currency = p.get("currency") or get_currency(company)
            doc.taxes_and_charges = p.get("taxes_and_charges")
            doc.is_return = int(bool(p.get("is_return", False)))
            doc.return_against = p.get("return_against")

            for item in (p.get("items") or []):
                if not isinstance(item, dict):
                    continue
                doc.append("items", {
                    "item_code": item.get("item_code"),
                    "item_name": item.get("item_name"),
                    "description": item.get("description"),
                    "qty": flt(item.get("qty") or 1),
                    "rate": flt(item.get("rate") or 0),
                    "income_account": item.get("income_account"),
                    "warehouse": item.get("warehouse"),
                })

        doc.posting_date = p.get("posting_date") or nowdate()
        doc.due_date = p.get("due_date")
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"sales_invoice": {"id": doc.name}}, "Sales Invoice created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_sales_invoice(name):
    """
    Submit a Sales Invoice to create accounting entries and send for payment.

    Args:
        name (str): Sales Invoice ID.

    Returns:
        dict: Updated status.
    """
    require_auth()
    try:
        if not has_doctype("Sales Invoice"):
            return fail("Sales Invoice DocType not installed")
        doc = frappe.get_doc("Sales Invoice", name)
        if doc.docstatus != 0:
            return fail(f"Sales Invoice {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok(
            {"sales_invoice": {"id": doc.name, "status": doc.status}},
            "Sales Invoice submitted",
        )
    except Exception as e:
        return fail(str(e))


# ─── Selling Helpers ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_customer_groups():
    """
    List all Customer Groups.

    Returns:
        dict: Hierarchical list of Customer Groups.
    """
    require_auth()
    if not has_doctype("Customer Group"):
        return ok({"customer_groups": []})
    rows = frappe.get_all(
        "Customer Group",
        fields=["name", "parent_customer_group", "is_group"],
        order_by="name asc",
    )
    return ok({"customer_groups": rows})


@frappe.whitelist()
def get_territories():
    """
    List all Sales Territories.

    Returns:
        dict: Hierarchical list of Territories.
    """
    require_auth()
    if not has_doctype("Territory"):
        return ok({"territories": []})
    rows = frappe.get_all(
        "Territory",
        fields=["name", "parent_territory", "is_group"],
        order_by="name asc",
    )
    return ok({"territories": rows})


@frappe.whitelist()
def get_sales_persons(company=None):
    """
    List all Sales Persons (sales reps) configured in the system.

    Args:
        company (str, optional): Not currently filtered by company
                                 (Sales Persons are company-agnostic in ERPNext).

    Returns:
        dict: List of Sales Persons.
    """
    require_auth()
    if not has_doctype("Sales Person"):
        return ok({"sales_persons": []})
    rows = frappe.get_all(
        "Sales Person",
        fields=["name", "sales_person_name", "parent_sales_person", "is_group", "enabled"],
        filters={"enabled": 1},
        order_by="sales_person_name asc",
    )
    return ok({"sales_persons": rows})