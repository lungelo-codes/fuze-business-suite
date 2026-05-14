"""
invoice_quote.py – Invoice and Quote generation for the Fuze Business Suite.

This module provides simple helper APIs to create Sales Invoice and Quotation
documents tied to a lead or customer. It also constructs a basic HTML
representation and optional PDF for those documents with the tenant's company
branding. These functions are deliberately simplified and may need further
customization for production use (e.g. tax calculations, stock checks).
"""

import base64
import frappe
from frappe.utils import nowdate
from ._saas_utils import require_auth, ok, fail, get_company


def _get_company_logo(company: str) -> str:
    """Return a data URI for the company's logo or an empty string."""
    try:
        logo = frappe.db.get_value("Company", company, "logo")
        if not logo:
            return ""
        file_doc = frappe.get_doc("File", {"file_url": logo})
        if not file_doc or not file_doc.get_content():
            return ""
        data = file_doc.get_content()
        encoded = base64.b64encode(data).decode("utf-8")
        return f"data:{file_doc.file_type};base64,{encoded}"
    except Exception:
        return ""


def _render_invoice_html(doc: frappe._dict, company: str) -> str:
    """Render a simple HTML invoice with company branding."""
    logo_data = _get_company_logo(company)
    items_rows = "".join([
        f"<tr><td>{item.get('item_name')}</td><td>{item.get('qty')}</td><td>{item.get('rate')}</td><td>{item.get('amount')}</td></tr>"
        for item in doc.get("items", [])
    ])
    total = sum(item.get("amount", 0) for item in doc.get("items", []))
    html = f"""
    <html>
    <head><meta charset='utf-8'><style>
      body {{ font-family: Arial, sans-serif; margin: 20px; }}
      .header {{ display: flex; align-items: center; justify-content: space-between; }}
      .logo {{ max-height: 60px; }}
      table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
      th, td {{ padding: 8px; border: 1px solid #ccc; }}
      th {{ background-color: #f5f5f5; }}
      .total {{ text-align: right; margin-top: 20px; font-weight: bold; }}
    </style></head>
    <body>
      <div class='header'>
        <div>
          <h2>Invoice</h2>
          <p>Invoice No: {doc.get('name')}</p>
          <p>Date: {doc.get('posting_date')}</p>
        </div>
        {f"<img class='logo' src='{logo_data}' />" if logo_data else ""}
      </div>
      <h3>Bill To: {doc.get('customer')}</h3>
      <table>
        <thead><tr><th>Item</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          {items_rows}
        </tbody>
      </table>
      <p class='total'>Total: {total}</p>
    </body>
    </html>
    """
    return html


def _render_quote_html(doc: frappe._dict, company: str) -> str:
    """Render a simple HTML quote with company branding."""
    logo_data = _get_company_logo(company)
    items_rows = "".join([
        f"<tr><td>{item.get('item_name')}</td><td>{item.get('qty')}</td><td>{item.get('rate')}</td><td>{item.get('amount')}</td></tr>"
        for item in doc.get("items", [])
    ])
    total = sum(item.get("amount", 0) for item in doc.get("items", []))
    html = f"""
    <html>
    <head><meta charset='utf-8'><style>
      body {{ font-family: Arial, sans-serif; margin: 20px; }}
      .header {{ display: flex; align-items: center; justify-content: space-between; }}
      .logo {{ max-height: 60px; }}
      table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
      th, td {{ padding: 8px; border: 1px solid #ccc; }}
      th {{ background-color: #f5f5f5; }}
      .total {{ text-align: right; margin-top: 20px; font-weight: bold; }}
    </style></head>
    <body>
      <div class='header'>
        <div>
          <h2>Quote</h2>
          <p>Quote No: {doc.get('name')}</p>
          <p>Date: {doc.get('transaction_date')}</p>
        </div>
        {f"<img class='logo' src='{logo_data}' />" if logo_data else ""}
      </div>
      <h3>To: {doc.get('party_name') or doc.get('customer_name')}</h3>
      <table>
        <thead><tr><th>Item</th><th>Quantity</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>
          {items_rows}
        </tbody>
      </table>
      <p class='total'>Total: {total}</p>
    </body>
    </html>
    """
    return html


@frappe.whitelist()
def create_invoice(data=None, **kwargs):
    """
    Create a Sales Invoice document with basic fields and optional items. The caller
    must provide at least a customer or lead identifier and a list of items with
    qty and rate. A simple PDF is generated from the invoice for download.

    Expected payload keys:
      customer: Name of the Customer (if lead, ensure a Customer exists)
      company: Company to issue the invoice under
      due_date: Date by which payment is due (YYYY-MM-DD)
      items: List of { item_name, qty, rate, amount?, description? }
    """
    require_auth()
    p = kwargs or {}
    if isinstance(data, dict):
        p.update(data)
    # Validate input
    customer = p.get("customer")
    if not customer:
        return fail("customer is required")
    company = p.get("company") or get_company()
    items = p.get("items") or []
    if not isinstance(items, list) or not items:
        return fail("items must be a non-empty list")
    # Create Sales Invoice
    inv = frappe.get_doc({"doctype": "Sales Invoice"})
    inv.customer = customer
    inv.company = company
    inv.due_date = p.get("due_date") or nowdate()
    for item in items:
        inv.append("items", {
            "item_name": item.get("item_name") or item.get("name") or "Item",
            "qty": item.get("qty") or 1,
            "rate": item.get("rate") or item.get("amount") or 0,
            "amount": item.get("amount") or ((item.get("qty") or 1) * (item.get("rate") or 0)),
            "description": item.get("description") or "",
        })
    try:
        inv.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        return fail(str(e))
    # Generate HTML and PDF
    html = _render_invoice_html(inv.as_dict(), company)
    pdf = None
    try:
        from frappe.utils.pdf import get_pdf_from_html
        pdf = get_pdf_from_html(html)
    except Exception:
        pdf = None
    encoded_pdf = base64.b64encode(pdf).decode("utf-8") if pdf else None
    return ok({"invoice": inv.as_dict(), "pdf": encoded_pdf}, "Invoice created")


@frappe.whitelist()
def create_quote(data=None, **kwargs):
    """
    Create a Quotation document with basic fields and optional items. Expects a
    party_name or customer_name, the company issuing the quote, and items. A
    simple PDF is generated from the quote for download.
    """
    require_auth()
    p = kwargs or {}
    if isinstance(data, dict):
        p.update(data)
    party = p.get("party_name") or p.get("customer_name") or p.get("customer")
    if not party:
        return fail("party_name or customer_name is required")
    company = p.get("company") or get_company()
    items = p.get("items") or []
    if not isinstance(items, list) or not items:
        return fail("items must be a non-empty list")
    # Create Quotation
    quote = frappe.get_doc({"doctype": "Quotation"})
    quote.party_name = party
    quote.company = company
    quote.transaction_date = p.get("transaction_date") or nowdate()
    for item in items:
        quote.append("items", {
            "item_name": item.get("item_name") or item.get("name") or "Item",
            "qty": item.get("qty") or 1,
            "rate": item.get("rate") or item.get("amount") or 0,
            "amount": item.get("amount") or ((item.get("qty") or 1) * (item.get("rate") or 0)),
            "description": item.get("description") or "",
        })
    try:
        quote.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        return fail(str(e))
    # Generate HTML and PDF
    html = _render_quote_html(quote.as_dict(), company)
    pdf = None
    try:
        from frappe.utils.pdf import get_pdf_from_html
        pdf = get_pdf_from_html(html)
    except Exception:
        pdf = None
    encoded_pdf = base64.b64encode(pdf).decode("utf-8") if pdf else None
    return ok({"quotation": quote.as_dict(), "pdf": encoded_pdf}, "Quote created")