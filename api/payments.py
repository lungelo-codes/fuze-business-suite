"""
payments.py  –  Payment gateway API for the Fuze Business Suite.

Provides SaaS subscribers with the ability to create payment links and
process transactions via supported gateways (iKhokha and Yoco). These
endpoints wrap external payment APIs so that SaaS users can charge their
clients or pay their own subscription fees. Since each gateway requires
authentication keys, the caller must supply the necessary credentials in
the payload. Responses typically include a payment URL that can be
embedded in customer emails or the portal.
"""

import json
import frappe
import requests
from ._saas_utils import require_auth, ok, fail, get_company, parse_payload


def _post_json(url: str, payload: dict, headers: dict | None = None) -> dict:
    """
    Internal helper to perform a POST request and return the parsed JSON
    response. Any HTTP or transport errors are surfaced as RuntimeError with
    the original message. This helper intentionally sets a modest timeout to
    avoid hanging the worker. Callers should wrap exceptions in a fail
    response.

    Args:
        url (str): The full endpoint URL.
        payload (dict): The JSON body to send.
        headers (dict | None): Optional HTTP headers.

    Returns:
        dict: The decoded JSON response from the remote server.
    """
    try:
        response = requests.post(url, json=payload, headers=headers or {}, timeout=20)
        response.raise_for_status()
        return response.json() if response.content else {}
    except Exception as e:
        # Wrap all network errors in a generic runtime error
        raise RuntimeError(str(e)) from e


@frappe.whitelist()
def create_payment_link(data=None, **kwargs):
    """
    Create a payment link for the specified gateway. Supported gateways are
    ``ikhokha`` and ``yoco``. The payload must include ``gateway`` (the
    gateway identifier), ``amount`` (as a number), and ``currency``. Each
    gateway requires different credentials and fields, which should be
    provided in the payload. Any additional keys not recognised here are
    passed through to the remote API. On success the response contains
    the URL that the customer should be redirected to along with the raw
    provider response.

    **iKhokha**
      - Endpoint: ``https://api.ikhokha.com/public-api/v1/api/payment``
      - Required fields: ``entity_id``, ``external_entity_id``, ``amount``,
        ``currency``, ``description``. The amount should be in the
        smallest currency unit (cents). A ``mode`` (``live`` or ``sandbox``)
        can be supplied, defaulting to ``live``. URLs for callbacks and
        redirects can be provided in the ``callback_url``, ``success_url``,
        ``failure_url`` and ``cancel_url`` keys. Authentication uses
        HTTP Basic with your application key and secret.

    **Yoco**
      - Endpoint: ``https://api.yoco.com/v1/payment_links/``
      - Required fields: ``amount`` and ``currency``. Amount must be
        provided in cents. A ``reference`` and ``description`` can be
        included. Redirect and callback URLs may be supplied via the
        ``success_url``, ``cancel_url`` and ``failure_url`` keys. The
        caller must supply ``api_key`` which is used as a Bearer token in
        the Authorization header.

    Args:
        data (dict or str): JSON payload containing payment details.

    Returns:
        dict: Success response with payment link and raw provider response
        or failure response on error.
    """
    require_auth()
    p = parse_payload(data, **kwargs)
    gateway = (p.get("gateway") or "").lower()
    amount = p.get("amount")
    currency = p.get("currency") or "ZAR"
    if not gateway or amount is None:
        return fail("gateway and amount are required fields")
    try:
        if gateway == "ikhokha":
            # Real iKhokha iK Pay payment link creation
            endpoint = p.get("endpoint") or "https://api.ikhokha.com/public-api/v1/api/payment"
            # Build the request body according to the API spec
            body = {
                "entityID": p.get("entity_id"),
                "externalEntityID": p.get("external_entity_id"),
                "amount": int(float(amount) * 100),  # convert to cents
                "currency": currency,
                "requesterUrl": p.get("requester_url") or frappe.utils.get_url(),
                "mode": p.get("mode") or "live",
                "description": p.get("description"),
                "externalTransactionID": p.get("external_transaction_id"),
                "urls": {
                    "callbackUrl": p.get("callback_url"),
                    "successPageUrl": p.get("success_url"),
                    "failurePageUrl": p.get("failure_url"),
                    "cancelUrl": p.get("cancel_url"),
                },
            }
            # Remove None values recursively
            def _clean(d):
                if isinstance(d, dict):
                    return {k: _clean(v) for k, v in d.items() if v not in (None, "")}
                return d
            body = _clean(body)
            # Construct basic auth header if credentials are supplied
            auth_key = p.get("api_key") or p.get("client_id") or ""
            auth_secret = p.get("api_secret") or p.get("client_secret") or ""
            headers = {"Content-Type": "application/json"}
            if auth_key:
                import base64
                basic = base64.b64encode(f"{auth_key}:{auth_secret}".encode()).decode()
                headers["Authorization"] = f"Basic {basic}"
            # Allow caller to specify additional headers
            extra_headers = p.get("headers") or {}
            headers.update({k: v for k, v in extra_headers.items()})
            # Perform request
            res = _post_json(endpoint, body, headers)
            # Extract link: paylinkUrl is returned on success
            link = res.get("paylinkUrl") or res.get("url") or res.get("paymentLink")
            return ok({"gateway": "ikhokha", "payment_link": link, "response": res}, "Payment link created")
        elif gateway == "yoco":
            endpoint = p.get("endpoint") or "https://api.yoco.com/v1/payment_links/"
            # Yoco amounts must be in cents
            amount_cents = int(round(float(amount) * 100))
            body = {
                "amount": amount_cents,
                "currency": currency,
                "reference": p.get("reference"),
                "description": p.get("description"),
                "success_url": p.get("success_url"),
                "cancel_url": p.get("cancel_url"),
                "failure_url": p.get("failure_url"),
            }
            body = {k: v for k, v in body.items() if v not in (None, "")}
            # Yoco uses Bearer token for auth; token is supplied in api_key
            api_token = p.get("api_key") or p.get("token")
            if not api_token:
                return fail("api_key is required for Yoco")
            headers = {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            }
            # Additional headers may be supplied
            extra_headers = p.get("headers") or {}
            headers.update({k: v for k, v in extra_headers.items()})
            res = _post_json(endpoint, body, headers)
            # Yoco returns hosted_payment_page_url or link in URL
            link = res.get("hosted_payment_page_url") or res.get("checkout_url") or res.get("url")
            return ok({"gateway": "yoco", "payment_link": link, "response": res}, "Payment link created")
        else:
            return fail(f"Unsupported payment gateway: {gateway}")
    except Exception as e:
        return fail(str(e))