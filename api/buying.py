"""
buying.py  –  Buying module API for the Fuze Business Suite.
Covers Suppliers, Material Requests, Purchase Orders, Purchase Receipts,
Purchase Invoices, Debit Notes, Supplier Payments, Blanket Purchase Orders,
and the Buying dashboard.
South African businesses – default currency ZAR.

ERPNext Buying workflow:
    Material Request → Request for Quotation → Supplier Quotation
    → Purchase Order → Purchase Receipt → Purchase Invoice → Payment
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
    """
    Buying module summary dashboard: open purchase orders, pending receipts,
    outstanding payables, monthly spend, and overdue payables.

    Args:
        company (str, optional): Company name. Falls back to default.

    Returns:
        dict: Dashboard cards with counts and monetary totals.
    """
    require_auth()
    company = get_company(company)
    currency = get_currency(company)
    today = nowdate()
    start = get_first_day(today)
    end = get_last_day(today)

    # Counts
    material_requests = safe_count("Material Request", {"company": company, "docstatus": ["!=", 2]})
    purchase_orders = safe_count("Purchase Order", {"company": company})
    pending_orders = safe_count("Purchase Order", {
        "company": company,
        "status": ["in", ["Draft", "To Receive and Bill", "To Bill", "To Receive"]],
    })
    purchase_invoices = safe_count("Purchase Invoice", {"company": company, "docstatus": 1})
    pending_receipts = safe_count("Purchase Receipt", {
        "company": company, "docstatus": 1,
        "status": ["in", ["To Bill"]],
    }) if has_doctype("Purchase Receipt") else 0

    # Monetary totals
    total_spend = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Purchase Invoice") else 0

    month_spend = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1 AND posting_date BETWEEN %s AND %s",
        (company, start, end),
    ) if has_doctype("Purchase Invoice") else 0

    outstanding_payables = safe_sql_sum(
        "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1 AND outstanding_amount>0",
        (company,),
    ) if has_doctype("Purchase Invoice") else 0

    overdue = safe_count("Purchase Invoice", {
        "company": company, "docstatus": 1,
        "outstanding_amount": [">", 0], "due_date": ["<", today],
    }) if has_doctype("Purchase Invoice") else 0

    return ok({
        "cards": {
            "material_requests": material_requests,
            "purchase_orders": purchase_orders,
            "pending_orders": pending_orders,
            "purchase_invoices": purchase_invoices,
            "pending_receipts": pending_receipts,
            "total_spend": money(total_spend),
            "month_spend": money(month_spend),
            "outstanding_payables": money(outstanding_payables),
            "overdue_invoices": overdue,
        },
        "currency": currency,
        "period": {"month_start": str(start), "month_end": str(end)},
    })


# ─── Suppliers ───────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_suppliers(limit=50, offset=0, search=None, supplier_group=None):
    """
    List Suppliers. Optionally filter by supplier_group or free-text search.

    Args:
        limit (int): Page size (default 50, max 200).
        offset (int): Pagination offset.
        search (str, optional): Search string matched against supplier_name.
        supplier_group (str, optional): Filter by Supplier Group.

    Returns:
        dict: Paginated list of Supplier records.
    """
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
        "payment_terms", "currency", "disabled",
    ])

    if search:
        rows = frappe.get_all(
            "Supplier",
            filters=[[" disabled", "=", 0], ["supplier_name", "like", f"%{search}%"]],
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
    """
    Fetch a single Supplier document with all addresses and contacts.

    Args:
        name (str): Supplier ID / name.

    Returns:
        dict: Full Supplier document.
    """
    require_auth()
    if not has_doctype("Supplier"):
        return fail("Supplier DocType not installed")
    doc = frappe.get_doc("Supplier", name)
    return ok({"supplier": doc.as_dict()})


@frappe.whitelist()
def create_supplier(data=None, **kwargs):
    """
    Create a new Supplier.

    Payload fields:
        supplier_name (str): Full supplier / company name (required).
        supplier_group (str): e.g. 'Services', 'Hardware', 'Raw Material'.
        supplier_type (str): 'Company' or 'Individual'.
        country (str, optional): Country name.
        mobile_no (str, optional): Contact number.
        email_id (str, optional): Primary contact email.
        tax_id (str, optional): VAT/tax registration number.
        payment_terms (str, optional): Default payment terms template.
        currency (str, optional): Supplier's billing currency. Default ZAR.

    Returns:
        dict: Name of the created Supplier.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Supplier"):
            return fail("Supplier DocType not installed")
        sup = frappe.new_doc("Supplier")
        sup.supplier_name = p.get("supplier_name")
        sup.supplier_group = p.get("supplier_group") or "All Supplier Groups"
        sup.supplier_type = p.get("supplier_type") or "Company"
        sup.country = p.get("country")
        sup.mobile_no = p.get("mobile_no")
        sup.email_id = p.get("email_id")
        sup.tax_id = p.get("tax_id")
        sup.payment_terms = p.get("payment_terms")
        sup.currency = p.get("currency") or get_currency()
        sup.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"supplier": {"id": sup.name}}, "Supplier created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def update_supplier(name, data=None, **kwargs):
    """
    Update fields on an existing Supplier.

    Args:
        name (str): Supplier ID.
        data (dict): Fields to update. Any Supplier field is accepted.

    Returns:
        dict: Updated Supplier ID.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Supplier"):
            return fail("Supplier DocType not installed")
        doc = frappe.get_doc("Supplier", name)
        allowed = [
            "supplier_name", "supplier_group", "supplier_type",
            "country", "mobile_no", "email_id", "tax_id",
            "payment_terms", "currency", "disabled",
        ]
        for field in allowed:
            if field in p:
                setattr(doc, field, p[field])
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok({"supplier": {"id": doc.name}}, "Supplier updated")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_top_suppliers(company=None, limit=10):
    """
    Revenue leaderboard for suppliers – ranked by total purchase spend.

    Args:
        company (str, optional): Company filter.
        limit (int): Number of top suppliers to return (default 10).

    Returns:
        dict: List of supplier names with total spend and invoice count.
    """
    require_auth()
    company = get_company(company)

    if not has_doctype("Purchase Invoice"):
        return ok({"suppliers": [], "currency": get_currency(company)})

    rows = frappe.db.sql(
        """SELECT supplier_name,
                  COALESCE(SUM(grand_total),0) AS spend,
                  COUNT(*) AS invoices
           FROM `tabPurchase Invoice`
           WHERE company=%s AND docstatus=1
           GROUP BY supplier_name
           ORDER BY spend DESC
           LIMIT %s""",
        (company, int(limit or 10)),
        as_dict=True,
    )

    return ok({
        "suppliers": [
            {"name": r.supplier_name, "spend": money(r.spend), "invoices": r.invoices}
            for r in rows
        ],
        "currency": get_currency(company),
    })


# ─── Material Requests ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_material_requests(company=None, status=None, material_request_type=None, limit=50, offset=0):
    """
    List Material Requests. The first step in the buying workflow –
    an internal request for stock or services.

    Status values: Draft, Submitted, Stopped, Cancelled, Pending, Partially Ordered, Ordered, Issued, Transferred.
    material_request_type: Purchase, Material Transfer, Material Issue, Manufacture, Customer Provided.

    Returns:
        dict: Paginated list of Material Requests.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if material_request_type:
        filters["material_request_type"] = material_request_type

    if not has_doctype("Material Request"):
        return ok({"material_requests": []}, meta={"total": 0})

    fields = pick_fields("Material Request", [
        "name", "material_request_type", "transaction_date",
        "schedule_date", "status", "requested_by", "company",
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
    return ok(
        {"material_requests": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_material_request(name):
    """
    Fetch a single Material Request with all item rows.

    Args:
        name (str): Material Request ID.

    Returns:
        dict: Full Material Request document.
    """
    require_auth()
    if not has_doctype("Material Request"):
        return fail("Material Request DocType not installed")
    doc = frappe.get_doc("Material Request", name)
    return ok({"material_request": doc.as_dict()})


@frappe.whitelist()
def create_material_request(data=None, **kwargs):
    """
    Create a Material Request – an internal indent for stock or services.

    Payload fields:
        material_request_type (str): 'Purchase', 'Material Transfer', 'Material Issue', 'Manufacture'.
        transaction_date (str, optional): Defaults to today.
        schedule_date (str, optional): Required-by date.
        requested_by (str, optional): User who raised the request.
        items (list[dict]): Items with item_code, qty, uom, warehouse, schedule_date.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Material Request.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Material Request"):
            return fail("Material Request DocType not installed")
        company = get_company(p.get("company"))
        mr = frappe.new_doc("Material Request")
        mr.company = company
        mr.material_request_type = p.get("material_request_type") or "Purchase"
        mr.transaction_date = p.get("transaction_date") or nowdate()
        mr.schedule_date = p.get("schedule_date") or None
        mr.requested_by = p.get("requested_by") or frappe.session.user

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            mr.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "warehouse": item.get("warehouse"),
                "schedule_date": item.get("schedule_date") or p.get("schedule_date") or nowdate(),
            })

        mr.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"material_request": {"id": mr.name}}, "Material Request created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_material_request(name):
    """
    Submit a Material Request so it can be converted into a Purchase Order
    or Request for Quotation.

    Args:
        name (str): Material Request ID.

    Returns:
        dict: Material Request name and status after submission.
    """
    require_auth()
    try:
        if not has_doctype("Material Request"):
            return fail("Material Request DocType not installed")
        doc = frappe.get_doc("Material Request", name)
        if doc.docstatus != 0:
            return fail(f"Material Request {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok({"material_request": {"id": doc.name, "status": doc.status}}, "Material Request submitted")
    except Exception as e:
        return fail(str(e))


# ─── Request for Quotation (RFQ) ─────────────────────────────────────────────

@frappe.whitelist()
def get_rfqs(company=None, status=None, limit=50, offset=0):
    """
    List Requests for Quotation sent to suppliers.

    Returns:
        dict: Paginated list of RFQ records.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    if not has_doctype("Request for Quotation"):
        return ok({"rfqs": []}, meta={"total": 0})

    fields = pick_fields("Request for Quotation", [
        "name", "transaction_date", "status", "message_for_supplier", "company",
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
def create_rfq(data=None, **kwargs):
    """
    Create a Request for Quotation to send to one or more suppliers.

    Payload fields:
        transaction_date (str, optional): Defaults to today.
        message_for_supplier (str, optional): Email message body.
        suppliers (list[dict]): Each entry needs {'supplier': '<name>'}.
        items (list[dict]): Items with item_code, qty, uom, description.
        company (str, optional): Company override.
        from_material_request (str, optional): Material Request ID to convert.

    Returns:
        dict: Name of the created RFQ.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Request for Quotation"):
            return fail("Request for Quotation DocType not installed")

        if p.get("from_material_request"):
            from erpnext.buying.doctype.material_request.material_request import make_request_for_quotation
            rfq = make_request_for_quotation(p["from_material_request"])
            rfq.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok({"rfq": {"id": rfq.name}}, "RFQ created from Material Request")

        company = get_company(p.get("company"))
        rfq = frappe.new_doc("Request for Quotation")
        rfq.company = company
        rfq.transaction_date = p.get("transaction_date") or nowdate()
        rfq.message_for_supplier = p.get("message_for_supplier") or ""

        for sup in (p.get("suppliers") or []):
            if not isinstance(sup, dict):
                continue
            rfq.append("suppliers", {"supplier": sup.get("supplier")})

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            rfq.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
            })

        rfq.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"rfq": {"id": rfq.name}}, "Request for Quotation created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_rfq(name):
    """
    Submit an RFQ so it can be sent to suppliers.

    Args:
        name (str): RFQ ID.

    Returns:
        dict: RFQ name and status after submission.
    """
    require_auth()
    try:
        if not has_doctype("Request for Quotation"):
            return fail("Request for Quotation DocType not installed")
        doc = frappe.get_doc("Request for Quotation", name)
        if doc.docstatus != 0:
            return fail(f"RFQ {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok({"rfq": {"id": doc.name, "status": doc.status}}, "RFQ submitted")
    except Exception as e:
        return fail(str(e))


# ─── Supplier Quotations ──────────────────────────────────────────────────────

@frappe.whitelist()
def get_supplier_quotations(company=None, supplier=None, status=None, limit=50, offset=0):
    """
    List Supplier Quotations received from vendors in response to an RFQ.

    Returns:
        dict: Paginated list of Supplier Quotations.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if supplier:
        filters["supplier"] = supplier
    if status and status != "all":
        filters["status"] = status

    if not has_doctype("Supplier Quotation"):
        return ok({"supplier_quotations": []}, meta={"total": 0})

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
    """
    Fetch a single Supplier Quotation document.

    Args:
        name (str): Supplier Quotation ID.

    Returns:
        dict: Full Supplier Quotation document.
    """
    require_auth()
    if not has_doctype("Supplier Quotation"):
        return fail("Supplier Quotation DocType not installed")
    doc = frappe.get_doc("Supplier Quotation", name)
    return ok({"supplier_quotation": doc.as_dict()})


@frappe.whitelist()
def create_supplier_quotation(data=None, **kwargs):
    """
    Record a Supplier Quotation / vendor quote.

    Payload fields:
        supplier (str): Supplier name (required).
        transaction_date (str, optional): Date received. Defaults to today.
        valid_till (str, optional): Expiry date.
        items (list[dict]): Items with item_code, qty, rate, uom.
        taxes (list[dict], optional): Tax rows.
        currency (str, optional): Supplier's quote currency.
        company (str, optional): Company override.
        from_rfq (str, optional): RFQ ID to convert.

    Returns:
        dict: Name of the created Supplier Quotation.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Supplier Quotation"):
            return fail("Supplier Quotation DocType not installed")

        if p.get("from_rfq"):
            from erpnext.buying.doctype.request_for_quotation.request_for_quotation import make_supplier_quotation_from_rfq
            sq = make_supplier_quotation_from_rfq(
                p["from_rfq"],
                for_supplier=p.get("supplier"),
            )
            sq.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok({"supplier_quotation": {"id": sq.name}}, "Supplier Quotation created from RFQ")

        company = get_company(p.get("company"))
        sq = frappe.new_doc("Supplier Quotation")
        sq.company = company
        sq.supplier = p.get("supplier")
        sq.transaction_date = p.get("transaction_date") or nowdate()
        sq.valid_till = p.get("valid_till") or None
        sq.currency = p.get("currency") or get_currency(company)

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            sq.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
            })

        if p.get("taxes"):
            for tax in p.get("taxes"):
                sq.append("taxes", tax)

        sq.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"supplier_quotation": {"id": sq.name}}, "Supplier Quotation created")
    except Exception as e:
        return fail(str(e))


# ─── Purchase Orders ──────────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_orders(company=None, status=None, supplier=None, limit=50, offset=0):
    """
    List Purchase Orders. Optionally filter by company, status, or supplier.

    Status values: Draft, To Receive and Bill, To Bill, To Receive, Completed,
    Cancelled, Closed.

    Returns:
        dict: Paginated list of Purchase Orders.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    if not has_doctype("Purchase Order"):
        return ok({"purchase_orders": [], "currency": get_currency(company)}, meta={"total": 0})

    fields = pick_fields("Purchase Order", [
        "name", "supplier", "supplier_name", "transaction_date",
        "schedule_date", "grand_total", "status",
        "currency", "per_received", "per_billed", "advance_paid",
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
    """
    Fetch a single Purchase Order with all child rows.

    Args:
        name (str): Purchase Order ID.

    Returns:
        dict: Full Purchase Order document.
    """
    require_auth()
    if not has_doctype("Purchase Order"):
        return fail("Purchase Order DocType not installed")
    doc = frappe.get_doc("Purchase Order", name)
    return ok({"purchase_order": doc.as_dict()})


@frappe.whitelist()
def create_purchase_order(data=None, **kwargs):
    """
    Create a Purchase Order. The binding contract with your supplier.

    Payload fields:
        supplier (str): Supplier name (required unless from_supplier_quotation).
        from_supplier_quotation (str, optional): Supplier Quotation to convert.
        from_material_request (str, optional): Material Request to convert.
        schedule_date (str, optional): Delivery date for all items.
        items (list[dict]): Items with item_code, qty, rate, uom, warehouse.
        taxes (list[dict], optional): Tax and charges rows.
        currency (str, optional): Purchase currency. Defaults to company currency.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Purchase Order.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Purchase Order"):
            return fail("Purchase Order DocType not installed")

        # Convert from Supplier Quotation
        if p.get("from_supplier_quotation"):
            from erpnext.buying.doctype.supplier_quotation.supplier_quotation import make_purchase_order
            po = make_purchase_order(p["from_supplier_quotation"])
            if p.get("schedule_date"):
                po.schedule_date = p["schedule_date"]
            po.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok({"purchase_order": {"id": po.name}}, "Purchase Order created from Supplier Quotation")

        # Convert from Material Request
        if p.get("from_material_request"):
            from erpnext.buying.doctype.material_request.material_request import make_purchase_order
            po = make_purchase_order(p["from_material_request"])
            po.supplier = p.get("supplier") or po.supplier
            if p.get("schedule_date"):
                po.schedule_date = p["schedule_date"]
            po.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok({"purchase_order": {"id": po.name}}, "Purchase Order created from Material Request")

        company = get_company(p.get("company"))
        po = frappe.new_doc("Purchase Order")
        po.company = company
        po.supplier = p.get("supplier")
        po.supplier_name = p.get("supplier_name")
        po.transaction_date = p.get("transaction_date") or nowdate()
        po.schedule_date = p.get("schedule_date") or None
        po.currency = p.get("currency") or get_currency(company)

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            po.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "schedule_date": item.get("schedule_date") or p.get("schedule_date"),
                "warehouse": item.get("warehouse"),
            })

        if p.get("taxes"):
            for tax in p.get("taxes"):
                po.append("taxes", tax)

        po.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"purchase_order": {"id": po.name}}, "Purchase Order created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_purchase_order(name):
    """
    Submit a Purchase Order to lock it and allow receipts / invoices to be raised.

    Args:
        name (str): Purchase Order ID.

    Returns:
        dict: Purchase Order name and status after submission.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Order"):
            return fail("Purchase Order DocType not installed")
        doc = frappe.get_doc("Purchase Order", name)
        if doc.docstatus != 0:
            return fail(f"Purchase Order {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok({"purchase_order": {"id": doc.name, "status": doc.status}}, "Purchase Order submitted")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_purchase_order(name):
    """
    Cancel a submitted Purchase Order. Releases any reserved quantities.

    Args:
        name (str): Purchase Order ID.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Order"):
            return fail("Purchase Order DocType not installed")
        doc = frappe.get_doc("Purchase Order", name)
        if doc.docstatus != 1:
            return fail("Only submitted Purchase Orders can be cancelled")
        doc.cancel()
        frappe.db.commit()
        return ok({"purchase_order": {"id": doc.name, "status": "Cancelled"}}, "Purchase Order cancelled")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def close_purchase_order(name):
    """
    Close a Purchase Order to stop further receiving or billing,
    even if not fully received/billed.

    Args:
        name (str): Purchase Order ID.

    Returns:
        dict: Updated Purchase Order status.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Order"):
            return fail("Purchase Order DocType not installed")
        doc = frappe.get_doc("Purchase Order", name)
        doc.update_status("Closed")
        frappe.db.commit()
        return ok({"purchase_order": {"id": doc.name, "status": "Closed"}}, "Purchase Order closed")
    except Exception as e:
        return fail(str(e))


# ─── Purchase Receipts ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_receipts(company=None, status=None, supplier=None, limit=50, offset=0):
    """
    List Purchase Receipts (GRNs). Optionally filter by company, status, or supplier.

    Status values: Draft, To Bill, Completed, Return Issued, Cancelled.

    Returns:
        dict: Paginated list of Purchase Receipts.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    if not has_doctype("Purchase Receipt"):
        return ok({"purchase_receipts": [], "currency": get_currency(company)}, meta={"total": 0})

    fields = pick_fields("Purchase Receipt", [
        "name", "supplier", "supplier_name", "posting_date",
        "grand_total", "status", "currency", "lr_no",
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
        {"purchase_receipts": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_purchase_receipt(name):
    """
    Fetch a single Purchase Receipt with all item rows.

    Args:
        name (str): Purchase Receipt ID.

    Returns:
        dict: Full Purchase Receipt document.
    """
    require_auth()
    if not has_doctype("Purchase Receipt"):
        return fail("Purchase Receipt DocType not installed")
    doc = frappe.get_doc("Purchase Receipt", name)
    return ok({"purchase_receipt": doc.as_dict()})


@frappe.whitelist()
def create_purchase_receipt(data=None, **kwargs):
    """
    Create a Purchase Receipt (GRN) recording goods received from a supplier.
    Pass ``from_purchase_order`` to automatically copy items from a submitted
    Purchase Order, or supply items manually.

    Payload fields:
        supplier (str): Supplier name (required unless from_purchase_order).
        from_purchase_order (str, optional): Purchase Order to pull items from.
        posting_date (str, optional): Defaults to today.
        items (list[dict]): Items with item_code, qty, warehouse, uom, rate.
        lr_no (str, optional): Lorry receipt / waybill number.
        lr_date (str, optional): Lorry receipt date.
        vehicle_no (str, optional): Delivery vehicle registration.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Purchase Receipt.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Purchase Receipt"):
            return fail("Purchase Receipt DocType not installed")

        if p.get("from_purchase_order"):
            from erpnext.buying.doctype.purchase_order.purchase_order import make_purchase_receipt
            pr = make_purchase_receipt(p["from_purchase_order"])
            pr.posting_date = p.get("posting_date") or nowdate()
            if p.get("lr_no"):
                pr.lr_no = p["lr_no"]
            if p.get("lr_date"):
                pr.lr_date = p["lr_date"]
            if p.get("vehicle_no"):
                pr.vehicle_no = p["vehicle_no"]
            pr.insert(ignore_permissions=True)
            frappe.db.commit()
            return ok({"purchase_receipt": {"id": pr.name}}, "Purchase Receipt created from Purchase Order")

        company = get_company(p.get("company"))
        pr = frappe.new_doc("Purchase Receipt")
        pr.company = company
        pr.supplier = p.get("supplier")
        pr.supplier_name = p.get("supplier_name")
        pr.posting_date = p.get("posting_date") or nowdate()
        pr.lr_no = p.get("lr_no") or None
        pr.lr_date = p.get("lr_date") or None
        pr.vehicle_no = p.get("vehicle_no") or None
        pr.currency = p.get("currency") or get_currency(company)

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            pr.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "warehouse": item.get("warehouse"),
                "against_purchase_order": item.get("against_purchase_order"),
            })

        pr.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"purchase_receipt": {"id": pr.name}}, "Purchase Receipt created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_purchase_receipt(name):
    """
    Submit a Purchase Receipt, updating the stock ledger.

    Args:
        name (str): Purchase Receipt ID.

    Returns:
        dict: Purchase Receipt name and status after submission.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Receipt"):
            return fail("Purchase Receipt DocType not installed")
        doc = frappe.get_doc("Purchase Receipt", name)
        if doc.docstatus != 0:
            return fail(f"Purchase Receipt {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok({"purchase_receipt": {"id": doc.name, "status": doc.status}}, "Purchase Receipt submitted")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def create_return_purchase_receipt(name):
    """
    Create a Return Purchase Receipt (goods returned to supplier) against
    a submitted Purchase Receipt.

    Args:
        name (str): Original submitted Purchase Receipt ID.

    Returns:
        dict: Name of the created return Purchase Receipt.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Receipt"):
            return fail("Purchase Receipt DocType not installed")
        from erpnext.controllers.sales_and_purchase_return import make_return_doc
        ret = make_return_doc("Purchase Receipt", name)
        ret.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"purchase_receipt": {"id": ret.name}}, "Return Purchase Receipt created")
    except Exception as e:
        return fail(str(e))


# ─── Purchase Invoices ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_invoices(company=None, status=None, supplier=None, limit=50, offset=0):
    """
    List Purchase Invoices. Filter by company, status, or supplier.

    Status values: Draft, Submitted, Paid, Partly Paid, Unpaid, Overdue,
    Cancelled, Return Issued.

    Returns:
        dict: Paginated list of Purchase Invoices.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    if not has_doctype("Purchase Invoice"):
        return ok({"purchase_invoices": [], "currency": get_currency(company)}, meta={"total": 0})

    fields = pick_fields("Purchase Invoice", [
        "name", "supplier", "supplier_name", "posting_date",
        "due_date", "grand_total", "outstanding_amount", "paid_amount",
        "status", "currency", "is_return", "return_against",
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
        {"purchase_invoices": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_purchase_invoice(name):
    """
    Fetch a single Purchase Invoice with all child rows (items, taxes, payments).

    Args:
        name (str): Purchase Invoice ID.

    Returns:
        dict: Full Purchase Invoice document.
    """
    require_auth()
    if not has_doctype("Purchase Invoice"):
        return fail("Purchase Invoice DocType not installed")
    doc = frappe.get_doc("Purchase Invoice", name)
    return ok({"purchase_invoice": doc.as_dict()})


@frappe.whitelist()
def create_purchase_invoice(data=None, **kwargs):
    """
    Create a Purchase Invoice (Bill) against a supplier.
    Pass ``from_purchase_order`` or ``from_purchase_receipt`` to auto-populate
    items, or supply items manually.

    Payload fields:
        supplier (str): Supplier name (required unless from_*).
        from_purchase_order (str, optional): Purchase Order to convert.
        from_purchase_receipt (str, optional): Purchase Receipt to convert.
        posting_date (str, optional): Defaults to today.
        due_date (str, optional): Payment due date.
        bill_no (str, optional): Supplier's invoice number.
        bill_date (str, optional): Date on supplier's invoice.
        items (list[dict]): Items with item_code, qty, rate, uom.
        taxes (list[dict], optional): Tax and charge rows.
        currency (str, optional): Billing currency.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Purchase Invoice.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Purchase Invoice"):
            return fail("Purchase Invoice DocType not installed")

        if p.get("from_purchase_order"):
            from erpnext.buying.doctype.purchase_order.purchase_order import make_purchase_invoice
            pi = make_purchase_invoice(p["from_purchase_order"])
            pi.posting_date = p.get("posting_date") or nowdate()
            pi.bill_no = p.get("bill_no") or pi.bill_no
            pi.bill_date = p.get("bill_date") or pi.bill_date
            pi.insert(ignore_permissions=True)
            try:
                pi.submit()
            except Exception:
                pass
            frappe.db.commit()
            return ok({"purchase_invoice": {"id": pi.name}}, "Purchase Invoice created from Purchase Order")

        if p.get("from_purchase_receipt"):
            from erpnext.stock.doctype.purchase_receipt.purchase_receipt import make_purchase_invoice
            pi = make_purchase_invoice(p["from_purchase_receipt"])
            pi.posting_date = p.get("posting_date") or nowdate()
            pi.bill_no = p.get("bill_no") or pi.bill_no
            pi.bill_date = p.get("bill_date") or pi.bill_date
            pi.insert(ignore_permissions=True)
            try:
                pi.submit()
            except Exception:
                pass
            frappe.db.commit()
            return ok({"purchase_invoice": {"id": pi.name}}, "Purchase Invoice created from Purchase Receipt")

        company = get_company(p.get("company"))
        pi = frappe.new_doc("Purchase Invoice")
        pi.company = company
        pi.supplier = p.get("supplier")
        pi.supplier_name = p.get("supplier_name")
        pi.posting_date = p.get("posting_date") or nowdate()
        pi.due_date = p.get("due_date") or pi.posting_date
        pi.bill_no = p.get("bill_no") or None
        pi.bill_date = p.get("bill_date") or None
        pi.currency = p.get("currency") or get_currency(company)
        pi.update_stock = p.get("update_stock") or 0

        for item in (p.get("items") or []):
            if not isinstance(item, dict):
                continue
            pi.append("items", {
                "item_code": item.get("item_code"),
                "item_name": item.get("item_name"),
                "description": item.get("description"),
                "uom": item.get("uom"),
                "qty": item.get("qty") or 1,
                "rate": item.get("rate") or 0,
                "warehouse": item.get("warehouse"),
            })

        if p.get("taxes"):
            for tax in p.get("taxes"):
                pi.append("taxes", tax)

        pi.insert(ignore_permissions=True)
        try:
            pi.submit()
        except Exception:
            pass
        frappe.db.commit()
        return ok({"purchase_invoice": {"id": pi.name}}, "Purchase Invoice created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_purchase_invoice(name):
    """
    Cancel a submitted Purchase Invoice. Reverses GL entries.

    Args:
        name (str): Purchase Invoice ID.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Invoice"):
            return fail("Purchase Invoice DocType not installed")
        doc = frappe.get_doc("Purchase Invoice", name)
        if doc.docstatus != 1:
            return fail("Only submitted Purchase Invoices can be cancelled")
        doc.cancel()
        frappe.db.commit()
        return ok({"purchase_invoice": {"id": doc.name, "status": "Cancelled"}}, "Purchase Invoice cancelled")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def create_debit_note(name):
    """
    Create a Debit Note (return invoice) against a submitted Purchase Invoice.
    Mirrors ERPNext's 'Return / Debit Note' action. Reduces the supplier's
    outstanding balance.

    Args:
        name (str): Original submitted Purchase Invoice ID.

    Returns:
        dict: Name of the created Debit Note.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Invoice"):
            return fail("Purchase Invoice DocType not installed")
        from erpnext.accounts.doctype.purchase_invoice.purchase_invoice import make_return_doc
        debit_note = make_return_doc("Purchase Invoice", name)
        debit_note.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"debit_note": {"id": debit_note.name}}, "Debit Note created")
    except Exception as e:
        return fail(str(e))


# ─── Supplier Payments ────────────────────────────────────────────────────────

@frappe.whitelist()
def create_supplier_payment(data=None, **kwargs):
    """
    Record a payment to a supplier and reconcile it against outstanding bills.
    Mirrors ERPNext's Payment Entry with type 'Pay'.

    Payload fields:
        supplier (str): Supplier name (required).
        paid_amount (float): Amount to pay (required).
        mode_of_payment (str): e.g. 'Bank Transfer', 'EFT', 'Cash'.
        paid_from (str): Bank / cash account to pay from.
        paid_to (str): Supplier's creditors account (leave blank to auto-resolve).
        reference_no (str, optional): Bank reference or cheque number.
        reference_date (str, optional): Date of the bank transaction.
        against_invoices (list[str], optional): Purchase Invoice IDs to allocate against.
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
        pe.payment_type = "Pay"
        pe.company = company
        pe.party_type = "Supplier"
        pe.party = p.get("supplier")
        pe.paid_amount = flt(p.get("paid_amount") or 0)
        pe.received_amount = pe.paid_amount
        pe.mode_of_payment = p.get("mode_of_payment") or "Bank Transfer"
        pe.paid_from = p.get("paid_from") or None
        pe.paid_to = p.get("paid_to") or None
        pe.reference_no = p.get("reference_no") or None
        pe.reference_date = p.get("reference_date") or nowdate()
        pe.posting_date = p.get("posting_date") or nowdate()

        for pinv_id in (p.get("against_invoices") or []):
            try:
                inv = frappe.get_doc("Purchase Invoice", pinv_id)
            except Exception:
                continue
            outstanding = flt(inv.outstanding_amount)
            allocated = min(pe.paid_amount, outstanding)
            pe.append("references", {
                "reference_doctype": "Purchase Invoice",
                "reference_name": pinv_id,
                "total_amount": inv.grand_total,
                "outstanding_amount": outstanding,
                "allocated_amount": allocated,
            })

        pe.setup_party_account_field()
        pe.set_missing_values()
        pe.insert(ignore_permissions=True)
        pe.submit()
        frappe.db.commit()
        return ok({"payment_entry": {"id": pe.name}}, "Supplier payment recorded")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_supplier_payments(company=None, supplier=None, limit=50, offset=0):
    """
    List Payment Entries for suppliers (payment_type = 'Pay').

    Returns:
        dict: Paginated list of supplier Payment Entries.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company, "payment_type": "Pay", "party_type": "Supplier"}
    if supplier:
        filters["party"] = supplier

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


# ─── Blanket Purchase Orders (rate contracts) ─────────────────────────────────

@frappe.whitelist()
def get_blanket_purchase_orders(company=None, supplier=None, limit=50, offset=0):
    """
    List Blanket Orders (long-term rate contracts with suppliers).

    Returns:
        dict: Paginated list of Blanket Orders for Purchasing.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)
    filters = {"company": company, "order_type": "Purchasing"}
    if supplier:
        filters["supplier"] = supplier

    if not has_doctype("Blanket Order"):
        return ok({"blanket_orders": []}, meta={"total": 0})

    fields = pick_fields("Blanket Order", [
        "name", "supplier", "supplier_name", "from_date", "to_date",
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
def create_blanket_purchase_order(data=None, **kwargs):
    """
    Create a Blanket Purchase Order — a pre-agreed rate contract with a supplier.
    When creating Purchase Orders, ERPNext validates rates against this contract.

    Payload fields:
        supplier (str): Supplier name (required).
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
        bo.order_type = "Purchasing"
        bo.supplier = p.get("supplier")
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
        return ok({"blanket_order": {"id": bo.name}}, "Blanket Purchase Order created")
    except Exception as e:
        return fail(str(e))


# ─── Monthly purchase trend ───────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_trend(company=None, months=6):
    """
    Monthly purchase spend trend for charting.

    Args:
        company (str, optional): Company filter.
        months (int): Number of past months to include (default 6).

    Returns:
        dict: Monthly spend, invoice count, and outstanding payables.
    """
    require_auth()
    company = get_company(company)
    months = max(int(months or 6), 1)

    if not has_doctype("Purchase Invoice"):
        return ok({"chart": [], "currency": get_currency(company)})

    rows = frappe.db.sql(
        """SELECT DATE_FORMAT(posting_date,'%%Y-%%m') AS month,
                  COUNT(*) AS count,
                  COALESCE(SUM(grand_total),0) AS spend,
                  COALESCE(SUM(outstanding_amount),0) AS outstanding
           FROM `tabPurchase Invoice`
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
            "spend": money(r.spend),
            "outstanding": money(r.outstanding),
        }
        for r in rows
    ]

    return ok({"chart": chart, "currency": get_currency(company)})


# ─── Document Portal Links ────────────────────────────────────────────────────

@frappe.whitelist()
def get_purchase_order_portal_url(name: str, print_format: str = None):
    """
    Generate a portal link for a Purchase Order.

    Args:
        name (str): Purchase Order ID.
        print_format (str, optional): Optional print format to attach.

    Returns:
        dict: URL for the Purchase Order.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Order"):
            return fail("Purchase Order DocType not installed")
        doc = frappe.get_doc("Purchase Order", name)
        base_url = frappe.utils.get_url()
        key = None
        try:
            if hasattr(doc, "get_signature"):
                key = doc.get_signature()
        except Exception:
            key = None
        if key:
            url = f"{base_url}/Purchase%20Order/{doc.name}?key={key}"
            if print_format:
                url += f"&format={print_format}"
        else:
            url = f"{base_url}/app/Purchase%20Order/{doc.name}"
        return ok({"purchase_order_url": url})
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def get_purchase_invoice_portal_url(name: str, print_format: str = None):
    """
    Generate a portal link for a Purchase Invoice.

    Args:
        name (str): Purchase Invoice ID.
        print_format (str, optional): Optional print format.

    Returns:
        dict: URL for the Purchase Invoice.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Invoice"):
            return fail("Purchase Invoice DocType not installed")
        doc = frappe.get_doc("Purchase Invoice", name)
        base_url = frappe.utils.get_url()
        key = None
        try:
            if hasattr(doc, "get_signature"):
                key = doc.get_signature()
        except Exception:
            key = None
        if key:
            url = f"{base_url}/Purchase%20Invoice/{doc.name}?key={key}"
            if print_format:
                url += f"&format={print_format}"
        else:
            url = f"{base_url}/app/Purchase%20Invoice/{doc.name}"
        return ok({"purchase_invoice_url": url})
    except Exception as e:
        return fail(str(e))


# ─── Email helpers ────────────────────────────────────────────────────────────

@frappe.whitelist()
def send_purchase_order_email(name: str, recipient: str, message: str = None, print_format: str = None, subject: str = None):
    """
    Email a Purchase Order to a supplier.

    Args:
        name (str): Purchase Order ID.
        recipient (str): Supplier email address.
        message (str, optional): Email body.
        print_format (str, optional): Print format for the PDF attachment.
        subject (str, optional): Email subject line.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Order"):
            return fail("Purchase Order DocType not installed")
        doc = frappe.get_doc("Purchase Order", name)
        subject = subject or f"Purchase Order {doc.name} from {doc.company}"
        message_body = message or f"Please find attached Purchase Order {doc.name}."
        pdf = frappe.attach_print(doc.doctype, doc.name, print_format=print_format)
        frappe.sendmail(recipients=[recipient], subject=subject, message=message_body, attachments=[pdf])
        return ok({"sent_to": recipient}, "Purchase Order emailed")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def send_purchase_invoice_email(name: str, recipient: str, message: str = None, print_format: str = None, subject: str = None):
    """
    Email a Purchase Invoice / bill to a supplier or internal recipient.

    Args:
        name (str): Purchase Invoice ID.
        recipient (str): Email address.
        message (str, optional): Email body.
        print_format (str, optional): Print format for the PDF.
        subject (str, optional): Email subject.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Purchase Invoice"):
            return fail("Purchase Invoice DocType not installed")
        doc = frappe.get_doc("Purchase Invoice", name)
        subject = subject or f"Purchase Invoice {doc.name} from {doc.company}"
        message_body = message or f"Please find attached Purchase Invoice {doc.name}."
        pdf = frappe.attach_print(doc.doctype, doc.name, print_format=print_format)
        frappe.sendmail(recipients=[recipient], subject=subject, message=message_body, attachments=[pdf])
        return ok({"sent_to": recipient}, "Purchase Invoice emailed")
    except Exception as e:
        return fail(str(e))