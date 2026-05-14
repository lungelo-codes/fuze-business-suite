"""
assets.py  –  Asset Management module API for the Fuze Business Suite.
Covers Asset register, Asset Categories, Depreciation, Asset Movement,
Asset Repair, and the Asset dashboard.

ERPNext Asset workflow:
    Item (is_fixed_asset=True) → Purchase Receipt / Purchase Invoice
    → Asset (Draft) → Submit → Depreciation Schedules
    → Asset Movement / Asset Repair → Asset Disposal
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
    Return a summary of key Asset metrics.

    Args:
        company (str, optional): Filter by company.

    Returns:
        dict: Dashboard card data including asset counts and values.
    """
    require_auth()
    company = get_company(company)
    currency = get_currency(company)

    total_assets = safe_count("Asset", {
        "company": company,
        "docstatus": 1,
    }) if has_doctype("Asset") else 0

    active_assets = safe_count("Asset", {
        "company": company,
        "docstatus": 1,
        "status": ["in", ["Submitted", "Partially Depreciated"]],
    }) if has_doctype("Asset") else 0

    fully_depreciated = safe_count("Asset", {
        "company": company,
        "docstatus": 1,
        "status": "Fully Depreciated",
    }) if has_doctype("Asset") else 0

    under_repair = safe_count("Asset", {
        "company": company,
        "docstatus": 1,
        "status": "Out of Order",
    }) if has_doctype("Asset") else 0

    gross_value = safe_sql_sum(
        "SELECT COALESCE(SUM(gross_purchase_amount),0) v FROM `tabAsset` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Asset") else 0

    net_value = safe_sql_sum(
        "SELECT COALESCE(SUM(value_after_depreciation),0) v FROM `tabAsset` "
        "WHERE company=%s AND docstatus=1",
        (company,),
    ) if has_doctype("Asset") else 0

    return ok({
        "cards": {
            "total_assets": total_assets,
            "active_assets": active_assets,
            "fully_depreciated_assets": fully_depreciated,
            "assets_under_repair": under_repair,
            "gross_asset_value": money(gross_value),
            "net_asset_value": money(net_value),
        },
        "currency": currency,
        "period": {"today": nowdate()},
    })


# ─── Asset Categories ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_asset_categories(limit=50, offset=0):
    """
    List all Asset Categories configured in the system.

    Args:
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Asset Categories.
    """
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Asset Category"):
        return ok({"asset_categories": []}, meta={"total": 0})

    fields = pick_fields("Asset Category", [
        "name", "enable_cwip_accounting", "total_number_of_depreciations",
        "frequency_of_depreciation", "depreciation_method",
    ])

    rows = frappe.get_all(
        "Asset Category",
        fields=fields,
        order_by="name asc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Asset Category")
    return ok(
        {"asset_categories": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_asset_category(name):
    """
    Fetch a single Asset Category with its depreciation books.

    Args:
        name (str): Asset Category name.

    Returns:
        dict: Full Asset Category document.
    """
    require_auth()
    if not has_doctype("Asset Category"):
        return fail("Asset Category DocType not installed")
    doc = frappe.get_doc("Asset Category", name)
    return ok({"asset_category": doc.as_dict()})


@frappe.whitelist()
def create_asset_category(data=None, **kwargs):
    """
    Create a new Asset Category.

    Payload fields:
        asset_category_name (str): Category name (required).
        enable_cwip_accounting (bool, optional): Default False.
        depreciation_method (str, optional): Straight Line Method |
            Double Declining Balance | Written Down Value.
        total_number_of_depreciations (int, optional): Useful life in periods.
        frequency_of_depreciation (int, optional): Months between depreciations.
        finance_books (list[dict], optional): Finance book rows with
            depreciation_method, total_number_of_depreciations,
            frequency_of_depreciation, salvage_value_percentage.

    Returns:
        dict: Name of the created Asset Category.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Asset Category"):
            return fail("Asset Category DocType not installed")

        doc = frappe.new_doc("Asset Category")
        doc.asset_category_name = p.get("asset_category_name")
        doc.enable_cwip_accounting = p.get("enable_cwip_accounting") or 0
        doc.depreciation_method = p.get("depreciation_method") or "Straight Line Method"
        doc.total_number_of_depreciations = p.get("total_number_of_depreciations") or 0
        doc.frequency_of_depreciation = p.get("frequency_of_depreciation") or 12

        for book in (p.get("finance_books") or []):
            if not isinstance(book, dict):
                continue
            doc.append("finance_books", {
                "finance_book": book.get("finance_book"),
                "depreciation_method": book.get("depreciation_method") or doc.depreciation_method,
                "total_number_of_depreciations": book.get("total_number_of_depreciations") or doc.total_number_of_depreciations,
                "frequency_of_depreciation": book.get("frequency_of_depreciation") or doc.frequency_of_depreciation,
                "salvage_value_percentage": book.get("salvage_value_percentage") or 0,
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"asset_category": {"id": doc.name}}, "Asset Category created")
    except Exception as e:
        return fail(str(e))


# ─── Assets ───────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_assets(company=None, status=None, asset_category=None, location=None, limit=50, offset=0):
    """
    List Assets in the Fixed Asset register.

    Args:
        company (str, optional): Company filter.
        status (str, optional): Draft / Submitted / Partially Depreciated /
                                Fully Depreciated / Scrapped / Sold / Out of Order.
        asset_category (str, optional): Filter by Asset Category.
        location (str, optional): Filter by location.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Assets.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Asset"):
        return ok({"assets": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status
    if asset_category:
        filters["asset_category"] = asset_category
    if location:
        filters["location"] = location

    fields = pick_fields("Asset", [
        "name", "asset_name", "item_code", "item_name",
        "asset_category", "status", "purchase_date",
        "gross_purchase_amount", "value_after_depreciation",
        "location", "custodian", "department",
    ])

    rows = frappe.get_all(
        "Asset",
        filters=filters,
        fields=fields,
        order_by="purchase_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Asset", filters)
    return ok(
        {"assets": rows, "currency": get_currency(company)},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def get_asset(name):
    """
    Fetch a single Asset with depreciation schedules and movements.

    Args:
        name (str): Asset ID.

    Returns:
        dict: Full Asset document.
    """
    require_auth()
    if not has_doctype("Asset"):
        return fail("Asset DocType not installed")
    doc = frappe.get_doc("Asset", name)
    return ok({"asset": doc.as_dict()})


@frappe.whitelist()
def create_asset(data=None, **kwargs):
    """
    Create a new Asset in Draft state.

    Payload fields:
        asset_name (str): Descriptive name (required).
        item_code (str): The fixed-asset Item (required).
        asset_category (str): Asset Category (required).
        purchase_date (str): Date of purchase (required, YYYY-MM-DD).
        gross_purchase_amount (float): Purchase value (required).
        location (str, optional): Physical location.
        custodian (str, optional): Employee responsible for the asset.
        department (str, optional): Department.
        available_for_use_date (str, optional): Depreciation start date.
        calculate_depreciation (bool, optional): Enable auto depreciation.
        purchase_receipt (str, optional): Linked Purchase Receipt.
        purchase_invoice (str, optional): Linked Purchase Invoice.
        finance_books (list[dict], optional): Finance book rows with
            depreciation_method, total_number_of_depreciations,
            frequency_of_depreciation, expected_value_after_useful_life.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Asset.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Asset"):
            return fail("Asset DocType not installed")

        company = get_company(p.get("company"))
        doc = frappe.new_doc("Asset")
        doc.company = company
        doc.asset_name = p.get("asset_name")
        doc.item_code = p.get("item_code")
        doc.asset_category = p.get("asset_category")
        doc.purchase_date = p.get("purchase_date") or nowdate()
        doc.gross_purchase_amount = flt(p.get("gross_purchase_amount") or 0)
        doc.location = p.get("location")
        doc.custodian = p.get("custodian")
        doc.department = p.get("department")
        doc.available_for_use_date = p.get("available_for_use_date") or p.get("purchase_date") or nowdate()
        doc.calculate_depreciation = int(bool(p.get("calculate_depreciation", True)))
        doc.purchase_receipt = p.get("purchase_receipt")
        doc.purchase_invoice = p.get("purchase_invoice")

        for book in (p.get("finance_books") or []):
            if not isinstance(book, dict):
                continue
            doc.append("finance_books", {
                "finance_book": book.get("finance_book"),
                "depreciation_method": book.get("depreciation_method") or "Straight Line Method",
                "total_number_of_depreciations": book.get("total_number_of_depreciations") or 1,
                "frequency_of_depreciation": book.get("frequency_of_depreciation") or 12,
                "depreciation_start_date": book.get("depreciation_start_date") or doc.available_for_use_date,
                "expected_value_after_useful_life": flt(book.get("expected_value_after_useful_life") or 0),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"asset": {"id": doc.name}}, "Asset created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def submit_asset(name):
    """
    Submit an Asset. On submission, ERPNext generates the depreciation schedule.

    Args:
        name (str): Asset ID.

    Returns:
        dict: Updated status.
    """
    require_auth()
    try:
        if not has_doctype("Asset"):
            return fail("Asset DocType not installed")
        doc = frappe.get_doc("Asset", name)
        if doc.docstatus != 0:
            return fail(f"Asset {name} is not in Draft state")
        doc.submit()
        frappe.db.commit()
        return ok(
            {"asset": {"id": doc.name, "status": doc.status}},
            "Asset submitted",
        )
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def cancel_asset(name):
    """
    Cancel a submitted Asset.

    Args:
        name (str): Asset ID.

    Returns:
        dict: Success or failure response.
    """
    require_auth()
    try:
        if not has_doctype("Asset"):
            return fail("Asset DocType not installed")
        doc = frappe.get_doc("Asset", name)
        if doc.docstatus != 1:
            return fail("Only submitted Assets can be cancelled")
        doc.cancel()
        frappe.db.commit()
        return ok(
            {"asset": {"id": doc.name, "status": "Cancelled"}},
            "Asset cancelled",
        )
    except Exception as e:
        return fail(str(e))


# ─── Depreciation ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_depreciation_schedule(asset_name):
    """
    Return the depreciation schedule for an Asset.

    Args:
        asset_name (str): Asset ID.

    Returns:
        dict: List of scheduled depreciation entries with dates and amounts.
    """
    require_auth()
    if not has_doctype("Asset"):
        return fail("Asset DocType not installed")

    doc = frappe.get_doc("Asset", asset_name)
    schedule = [row.as_dict() for row in (doc.schedules or [])]
    return ok({
        "asset": asset_name,
        "depreciation_schedule": schedule,
        "total_entries": len(schedule),
    })


@frappe.whitelist()
def post_depreciation(asset_name, posting_date=None):
    """
    Manually trigger depreciation journal entries for an Asset up to
    a given posting date. Wraps ERPNext's make_depreciation_entry().

    Args:
        asset_name (str): Asset ID.
        posting_date (str, optional): Post depreciation up to this date.
                                      Defaults to today.

    Returns:
        dict: List of Journal Entry IDs created.
    """
    require_auth()
    try:
        if not has_doctype("Asset"):
            return fail("Asset DocType not installed")

        from erpnext.assets.doctype.asset.depreciation import make_depreciation_entry
        posting_date = posting_date or nowdate()
        entries = make_depreciation_entry(asset_name, posting_date)
        je_ids = [e.name for e in entries] if entries else []
        return ok(
            {"journal_entries": je_ids, "count": len(je_ids)},
            f"Depreciation posted: {len(je_ids)} entr{'y' if len(je_ids) == 1 else 'ies'} created",
        )
    except Exception as e:
        return fail(str(e))


# ─── Asset Movement ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_asset_movements(company=None, asset=None, limit=50, offset=0):
    """
    List Asset Movements (transfers between locations or custodians).

    Args:
        company (str, optional): Company filter.
        asset (str, optional): Filter by specific Asset.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Asset Movements.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Asset Movement"):
        return ok({"asset_movements": []}, meta={"total": 0})

    filters = {"company": company}
    if asset:
        filters["asset"] = asset

    fields = pick_fields("Asset Movement", [
        "name", "purpose", "transaction_date",
        "company", "reference_doctype", "reference_name",
    ])

    rows = frappe.get_all(
        "Asset Movement",
        filters=filters,
        fields=fields,
        order_by="transaction_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Asset Movement", filters)
    return ok(
        {"asset_movements": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def create_asset_movement(data=None, **kwargs):
    """
    Create an Asset Movement to transfer an asset to a new location
    or reassign it to a different custodian or department.

    Payload fields:
        purpose (str): Transfer | Issue | Receipt (required).
        transaction_date (str, optional): Defaults to today.
        assets (list[dict]): Asset rows with:
            - asset (str)
            - source_location (str, optional)
            - target_location (str, optional)
            - from_custodian (str, optional)
            - to_custodian (str, optional)
            - from_employee (str, optional)
            - to_employee (str, optional)
        reference_doctype (str, optional): Linked document type.
        reference_name (str, optional): Linked document name.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Asset Movement.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Asset Movement"):
            return fail("Asset Movement DocType not installed")

        company = get_company(p.get("company"))
        doc = frappe.new_doc("Asset Movement")
        doc.company = company
        doc.purpose = p.get("purpose") or "Transfer"
        doc.transaction_date = p.get("transaction_date") or nowdate()
        doc.reference_doctype = p.get("reference_doctype")
        doc.reference_name = p.get("reference_name")

        for asset_row in (p.get("assets") or []):
            if not isinstance(asset_row, dict):
                continue
            doc.append("assets", {
                "asset": asset_row.get("asset"),
                "source_location": asset_row.get("source_location"),
                "target_location": asset_row.get("target_location"),
                "from_custodian": asset_row.get("from_custodian"),
                "to_custodian": asset_row.get("to_custodian"),
                "from_employee": asset_row.get("from_employee"),
                "to_employee": asset_row.get("to_employee"),
            })

        doc.insert(ignore_permissions=True)
        doc.submit()
        frappe.db.commit()
        return ok({"asset_movement": {"id": doc.name}}, "Asset Movement created and submitted")
    except Exception as e:
        return fail(str(e))


# ─── Asset Repair ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_asset_repairs(company=None, asset=None, repair_status=None, limit=50, offset=0):
    """
    List Asset Repair records.

    Args:
        company (str, optional): Company filter.
        asset (str, optional): Filter by specific Asset.
        repair_status (str, optional): Pending | Completed | Cancelled.
        limit (int): Page size.
        offset (int): Page offset.

    Returns:
        dict: Paginated list of Asset Repairs.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Asset Repair"):
        return ok({"asset_repairs": []}, meta={"total": 0})

    filters = {"company": company}
    if asset:
        filters["asset"] = asset
    if repair_status and repair_status != "all":
        filters["repair_status"] = repair_status

    fields = pick_fields("Asset Repair", [
        "name", "asset_name", "asset", "failure_date",
        "repair_status", "repair_cost", "description",
    ])

    rows = frappe.get_all(
        "Asset Repair",
        filters=filters,
        fields=fields,
        order_by="failure_date desc",
        limit_start=offset,
        limit_page_length=limit,
    )
    total = frappe.db.count("Asset Repair", filters)
    return ok(
        {"asset_repairs": rows},
        meta={"total": total, "limit": limit, "offset": offset},
    )


@frappe.whitelist()
def create_asset_repair(data=None, **kwargs):
    """
    Create an Asset Repair record.

    Payload fields:
        asset (str): Asset ID (required).
        failure_date (str): Date the fault was identified (required).
        description (str): Description of the failure (required).
        repair_cost (float, optional): Estimated/actual repair cost.
        capitalize_repair_cost (bool, optional): Add repair cost to asset value.
        cost_center (str, optional): Cost centre for the repair expense.
        stock_items (list[dict], optional): Spare parts consumed with
            item_code, warehouse, qty, rate.
        company (str, optional): Company override.

    Returns:
        dict: Name of the created Asset Repair.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    try:
        if not has_doctype("Asset Repair"):
            return fail("Asset Repair DocType not installed")

        company = get_company(p.get("company"))
        doc = frappe.new_doc("Asset Repair")
        doc.company = company
        doc.asset = p.get("asset")
        doc.failure_date = p.get("failure_date") or nowdate()
        doc.description = p.get("description")
        doc.repair_cost = flt(p.get("repair_cost") or 0)
        doc.capitalize_repair_cost = int(bool(p.get("capitalize_repair_cost", False)))
        doc.cost_center = p.get("cost_center")

        for item in (p.get("stock_items") or []):
            if not isinstance(item, dict):
                continue
            doc.append("stock_items", {
                "item_code": item.get("item_code"),
                "warehouse": item.get("warehouse"),
                "qty": flt(item.get("qty") or 1),
                "rate": flt(item.get("rate") or 0),
            })

        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        return ok({"asset_repair": {"id": doc.name}}, "Asset Repair created")
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def complete_asset_repair(name):
    """
    Mark an Asset Repair as Completed.

    Args:
        name (str): Asset Repair ID.

    Returns:
        dict: Updated repair status.
    """
    require_auth()
    try:
        if not has_doctype("Asset Repair"):
            return fail("Asset Repair DocType not installed")
        doc = frappe.get_doc("Asset Repair", name)
        doc.repair_status = "Completed"
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        return ok(
            {"asset_repair": {"id": doc.name, "repair_status": "Completed"}},
            "Asset Repair marked as Completed",
        )
    except Exception as e:
        return fail(str(e))


# ─── Asset Disposal / Scrap ───────────────────────────────────────────────────

@frappe.whitelist()
def scrap_asset(name, posting_date=None):
    """
    Scrap an Asset. Creates the necessary accounting entries to write off
    the remaining book value.

    Args:
        name (str): Asset ID.
        posting_date (str, optional): Defaults to today.

    Returns:
        dict: Updated asset status.
    """
    require_auth()
    try:
        if not has_doctype("Asset"):
            return fail("Asset DocType not installed")

        from erpnext.assets.doctype.asset.asset import scrap_asset as _scrap
        _scrap(name)
        frappe.db.commit()
        doc = frappe.get_doc("Asset", name)
        return ok(
            {"asset": {"id": doc.name, "status": doc.status}},
            "Asset scrapped successfully",
        )
    except Exception as e:
        return fail(str(e))


@frappe.whitelist()
def restore_scrapped_asset(name):
    """
    Restore a previously scrapped Asset back to active status.

    Args:
        name (str): Asset ID.

    Returns:
        dict: Updated asset status.
    """
    require_auth()
    try:
        if not has_doctype("Asset"):
            return fail("Asset DocType not installed")

        from erpnext.assets.doctype.asset.asset import restore_asset
        restore_asset(name)
        frappe.db.commit()
        doc = frappe.get_doc("Asset", name)
        return ok(
            {"asset": {"id": doc.name, "status": doc.status}},
            "Asset restored successfully",
        )
    except Exception as e:
        return fail(str(e))


# ─── Helpers ──────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_asset_locations(company=None):
    """
    List all configured Asset Locations.

    Args:
        company (str, optional): Company filter (if applicable).

    Returns:
        dict: List of location names.
    """
    require_auth()
    if not has_doctype("Location"):
        return ok({"locations": []})

    rows = frappe.get_all("Location", fields=["name", "parent_location", "is_group"])
    return ok({"locations": rows})