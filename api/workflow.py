"""
workflow.py  –  Cross‑module business logic for the Fuze Business Suite.

This module orchestrates typical CRM and sales flows that span multiple
DocTypes. For example, a user may want to record a new lead, convert that
lead into a customer and then immediately generate a quotation and sales
invoice. Rather than forcing the frontend to call several endpoints in
sequence, this workflow provides a single API that performs the entire
operation and returns the resulting document identifiers.

All functions defined here enforce authentication and scope operations to
the current tenant's company. They rely on existing helpers in the CRM
and Sales modules to perform the underlying operations. Should any
intermediate step fail, the error is surfaced to the caller and no
subsequent actions are attempted.

Example payload for ``process_lead_to_invoice``::

    {
      "lead": {
        "name": "John Doe",
        "company": "ACME Ltd",
        "email": "john@acme.co.za",
        "phone": "0831234567",
        "source": "Website"
      },
      "items": [
        {"item_code": "ITEM-001", "qty": 2, "rate": 1500.00},
        {"item_code": "ITEM-002", "qty": 1, "rate": 500.00}
      ],
      "company": "ACME Ltd",
      "transaction_date": "2024-01-15",
      "valid_till": "2024-01-31",
      "quotation_to": "Customer",
      "posting_date": "2024-01-15",
      "due_date": "2024-02-15"
    }

In the above example a new lead is created (or an existing one reused),
converted into a customer, a quotation is prepared and an invoice is
submitted. The response will contain the identifiers for each document.

"""

import frappe
from ._saas_utils import require_auth, ok, fail, parse_payload, get_company

# Import functions from local modules without triggering Frappe whitelisting.
from .crm import create_lead, convert_lead_to_customer  # type: ignore
from .sales import create_quotation, create_sales_invoice  # type: ignore


@frappe.whitelist()
def process_lead_to_invoice(data=None, **kwargs):
    """
    Create a lead, convert it to a customer, generate a quotation and a
    sales invoice in a single call. This convenience endpoint reduces the
    number of round‑trips required by the frontend and ensures a consistent
    workflow. It returns the identifiers of the created documents on
    success. If a lead with the provided name already exists, it will be
    reused rather than recreated.

    Args:
        data (dict or str): JSON payload containing ``lead`` details,
            ``items`` for the sale and optional dates. See module
            documentation for example structure.

    Returns:
        dict: Success or failure response with document identifiers.
    """
    require_auth()
    payload = parse_payload(data, **kwargs)
    try:
        # Extract lead information
        lead_payload = payload.get("lead") or {}
        # Determine existing lead name if provided
        lead_name = lead_payload.get("id") or lead_payload.get("name")
        # Create the lead if it does not already exist
        if not lead_name:
            create_resp = create_lead(lead_payload)
            if not create_resp.get("success"):
                return create_resp
            lead_name = create_resp["data"]["lead"]["id"]
        else:
            # Verify the lead exists; if not, create it
            if not frappe.db.exists("Lead", lead_name):
                create_resp = create_lead(lead_payload)
                if not create_resp.get("success"):
                    return create_resp
                lead_name = create_resp["data"]["lead"]["id"]
        # Convert the lead to a customer
        convert_resp = convert_lead_to_customer(lead_name)
        if not convert_resp.get("success"):
            return convert_resp
        customer_id = convert_resp["data"]["customer"]["id"]
        # Build quotation payload
        quotation_payload = {
            "customer": customer_id,
            "customer_name": lead_payload.get("company")
                or lead_payload.get("lead_name")
                or lead_payload.get("name"),
            "company": payload.get("company"),
            "items": payload.get("items") or [],
            "quotation_to": payload.get("quotation_to") or "Customer",
            "transaction_date": payload.get("transaction_date"),
            "valid_till": payload.get("valid_till"),
            "order_type": payload.get("order_type") or "Sales",
        }
        quotation_resp = create_quotation(quotation_payload)
        if not quotation_resp.get("success"):
            return quotation_resp
        quotation_id = quotation_resp["data"]["quotation"]["id"]
        # Build sales invoice payload
        invoice_payload = {
            "customer": customer_id,
            "customer_name": lead_payload.get("company")
                or lead_payload.get("lead_name")
                or lead_payload.get("name"),
            "company": payload.get("company"),
            "items": payload.get("items") or [],
            "posting_date": payload.get("posting_date"),
            "due_date": payload.get("due_date"),
            "currency": payload.get("currency"),
        }
        invoice_resp = create_sales_invoice(invoice_payload)
        if not invoice_resp.get("success"):
            return invoice_resp
        invoice_id = invoice_resp["data"]["invoice"]["id"]
        return ok({
            "lead_id": lead_name,
            "customer_id": customer_id,
            "quotation_id": quotation_id,
            "invoice_id": invoice_id,
        }, "Lead processed to invoice")
    except Exception as e:
        return fail(str(e))