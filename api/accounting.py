"""
accounting.py  –  Accounting module API for the Fuze Business Suite.
Covers the full ERPNext Accounting module:
  Sales Invoices, Credit Notes, Dunning
  Purchase Invoices (Bills), Debit Notes
  Payments (Entry, Request, Order)
  Banking (Banks, Bank Accounts, Bank Transactions)
  Journal Entries (GL)
  Cost Centers & Budgets
  Subscriptions
  Fiscal Years & Accounting Periods
  Chart of Accounts
  P&L and Revenue charts
South African businesses – default currency ZAR.
"""

import frappe
from frappe.utils import flt, nowdate, getdate, add_months
from ._saas_utils import (
    require_auth, ok, fail, get_company, get_currency,
    page, parse_payload, has_doctype, pick_fields,
    safe_count, safe_sql_sum, safe_get_all, money,
    date_range_this_month,
)


# ─── Dashboard ────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_dashboard(company=None):
    require_auth()
    company = get_company(company)
    currency = get_currency(company)
    start, end = date_range_this_month()

    receivables = payables = monthly_revenue = monthly_expenses = 0.0
    overdue_invoices = overdue_bills = 0
    credit_notes = debit_notes = 0

    if has_doctype("Sales Invoice"):
        receivables = safe_sql_sum(
            "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabSales Invoice` "
            "WHERE company=%s AND docstatus=1 AND outstanding_amount>0 AND is_return=0",
            (company,),
        )
        monthly_revenue = safe_sql_sum(
            "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
            "WHERE company=%s AND docstatus=1 AND is_return=0 AND posting_date BETWEEN %s AND %s",
            (company, start, end),
        )
        overdue_invoices = frappe.db.count(
            "Sales Invoice",
            {"company": company, "docstatus": 1, "is_return": 0,
             "outstanding_amount": [">", 0], "due_date": ["<", nowdate()]},
        )
        credit_notes = frappe.db.count(
            "Sales Invoice",
            {"company": company, "docstatus": 1, "is_return": 1},
        )

    if has_doctype("Purchase Invoice"):
        payables = safe_sql_sum(
            "SELECT COALESCE(SUM(outstanding_amount),0) v FROM `tabPurchase Invoice` "
            "WHERE company=%s AND docstatus=1 AND outstanding_amount>0 AND is_return=0",
            (company,),
        )
        monthly_expenses = safe_sql_sum(
            "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
            "WHERE company=%s AND docstatus=1 AND is_return=0 AND posting_date BETWEEN %s AND %s",
            (company, start, end),
        )
        overdue_bills = frappe.db.count(
            "Purchase Invoice",
            {"company": company, "docstatus": 1, "is_return": 0,
             "outstanding_amount": [">", 0], "due_date": ["<", nowdate()]},
        )
        debit_notes = frappe.db.count(
            "Purchase Invoice",
            {"company": company, "docstatus": 1, "is_return": 1},
        )

    cash_in = cash_out = 0.0
    if has_doctype("Payment Entry"):
        cash_in = safe_sql_sum(
            "SELECT COALESCE(SUM(paid_amount),0) v FROM `tabPayment Entry` "
            "WHERE company=%s AND docstatus=1 AND payment_type='Receive'",
            (company,),
        )
        cash_out = safe_sql_sum(
            "SELECT COALESCE(SUM(paid_amount),0) v FROM `tabPayment Entry` "
            "WHERE company=%s AND docstatus=1 AND payment_type='Pay'",
            (company,),
        )

    profit = monthly_revenue - monthly_expenses

    return ok({
        "company": company,
        "currency": currency,
        "cards": {
            "receivables":       money(receivables),
            "payables":          money(payables),
            "monthly_revenue":   money(monthly_revenue),
            "monthly_expenses":  money(monthly_expenses),
            "monthly_profit":    money(profit),
            "cash_balance":      money(cash_in - cash_out),
            "overdue_invoices":  overdue_invoices,
            "overdue_bills":     overdue_bills,
            "credit_notes":      credit_notes,
            "debit_notes":       debit_notes,
        },
        "period": {"start": start, "end": end},
    })


# ─── Sales Invoices ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_invoices(company=None, status=None, customer=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Sales Invoice"):
        return ok({"invoices": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company, "is_return": 0}
    if status and status != "all":
        filters["status"] = status
    if customer:
        filters["customer"] = customer

    fields = pick_fields("Sales Invoice", [
        "name", "customer", "customer_name", "posting_date", "due_date",
        "grand_total", "rounded_total", "outstanding_amount", "status",
        "currency", "taxes_and_charges", "payment_terms_template",
        "is_pos", "loyalty_points",
    ])

    rows = frappe.get_all(
        "Sales Invoice", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Sales Invoice", filters)
    return ok({"invoices": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_invoice(name):
    require_auth()
    if not has_doctype("Sales Invoice"):
        return fail("Sales Invoice DocType not found")
    doc = frappe.get_doc("Sales Invoice", name)
    return ok({"invoice": doc.as_dict()})


# ─── Credit Notes (Sales Returns) ─────────────────────────────────────────────

@frappe.whitelist()
def get_credit_notes(company=None, customer=None, limit=50, offset=0):
    """Sales Invoices with is_return=1."""
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Sales Invoice"):
        return ok({"credit_notes": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company, "docstatus": 1, "is_return": 1}
    if customer:
        filters["customer"] = customer

    fields = pick_fields("Sales Invoice", [
        "name", "customer", "customer_name", "posting_date",
        "grand_total", "status", "currency", "return_against",
    ])

    rows = frappe.get_all(
        "Sales Invoice", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Sales Invoice", filters)
    return ok({"credit_notes": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Dunning (Sales Interest) ─────────────────────────────────────────────────

@frappe.whitelist()
def get_dunning_list(company=None, status=None, limit=50, offset=0):
    """List Dunning / Sales Interest documents for overdue receivables follow-up."""
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Dunning"):
        return ok({"dunning": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Dunning", [
        "name", "customer", "customer_name", "posting_date",
        "grand_total", "outstanding_amount", "status",
        "dunning_type", "overdue_days",
    ])

    rows = frappe.get_all(
        "Dunning", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Dunning", filters)
    return ok({"dunning": rows}, meta={"total": total, "limit": limit, "offset": offset})


# ─── Bills (Purchase Invoices) ────────────────────────────────────────────────

@frappe.whitelist()
def get_bills(company=None, status=None, supplier=None, limit=50, offset=0):
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Purchase Invoice"):
        return ok({"bills": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company, "is_return": 0}
    if status and status != "all":
        filters["status"] = status
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Purchase Invoice", [
        "name", "supplier", "supplier_name", "posting_date", "due_date",
        "grand_total", "rounded_total", "outstanding_amount", "status",
        "bill_no", "bill_date", "currency", "payment_terms_template",
    ])

    rows = frappe.get_all(
        "Purchase Invoice", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Purchase Invoice", filters)
    return ok({"bills": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_bill(name):
    require_auth()
    if not has_doctype("Purchase Invoice"):
        return fail("Purchase Invoice DocType not found")
    doc = frappe.get_doc("Purchase Invoice", name)
    return ok({"bill": doc.as_dict()})


# ─── Debit Notes (Purchase Returns) ──────────────────────────────────────────

@frappe.whitelist()
def get_debit_notes(company=None, supplier=None, limit=50, offset=0):
    """Purchase Invoices with is_return=1 (Debit Notes)."""
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Purchase Invoice"):
        return ok({"debit_notes": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company, "docstatus": 1, "is_return": 1}
    if supplier:
        filters["supplier"] = supplier

    fields = pick_fields("Purchase Invoice", [
        "name", "supplier", "supplier_name", "posting_date",
        "grand_total", "status", "currency", "return_against",
    ])

    rows = frappe.get_all(
        "Purchase Invoice", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Purchase Invoice", filters)
    return ok({"debit_notes": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Payments ─────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_payments(company=None, payment_type=None, mode_of_payment=None,
                 party_type=None, limit=50, offset=0):
    """
    payment_type: Receive | Pay | Internal Transfer
    party_type: Customer | Supplier
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Payment Entry"):
        return ok({"payments": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {"company": company, "docstatus": 1}
    if payment_type and payment_type != "all":
        filters["payment_type"] = payment_type
    if mode_of_payment:
        filters["mode_of_payment"] = mode_of_payment
    if party_type:
        filters["party_type"] = party_type

    fields = pick_fields("Payment Entry", [
        "name", "payment_type", "party_type", "party", "party_name",
        "posting_date", "paid_amount", "received_amount",
        "source_exchange_rate", "target_exchange_rate",
        "reference_no", "reference_date",
        "mode_of_payment", "clearance_date", "status",
        "paid_from", "paid_to",
    ])

    rows = frappe.get_all(
        "Payment Entry", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Payment Entry", filters)
    return ok({"payments": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_payment(name):
    require_auth()
    if not has_doctype("Payment Entry"):
        return fail("Payment Entry DocType not found")
    doc = frappe.get_doc("Payment Entry", name)
    return ok({"payment": doc.as_dict()})


# ─── Payment Requests ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_payment_requests(company=None, status=None, limit=50, offset=0):
    """Payment Requests linked to Sales/Purchase Invoices."""
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Payment Request"):
        return ok({"payment_requests": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Payment Request", [
        "name", "payment_request_type", "party_type", "party", "party_name",
        "transaction_date", "grand_total", "currency",
        "mode_of_payment", "status", "reference_name",
    ])

    rows = frappe.get_all(
        "Payment Request", filters=filters, fields=fields,
        order_by="transaction_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Payment Request", filters)
    return ok({"payment_requests": rows},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Payment Orders ───────────────────────────────────────────────────────────

@frappe.whitelist()
def get_payment_orders(company=None, status=None, limit=50, offset=0):
    """Payment Orders — batch payment instructions sent to a bank."""
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Payment Order"):
        return ok({"payment_orders": []}, meta={"total": 0})

    filters = {"company": company}
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Payment Order", [
        "name", "payment_order_type", "company_bank_account",
        "posting_date", "status", "modified",
    ])

    rows = frappe.get_all(
        "Payment Order", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Payment Order", filters)
    return ok({"payment_orders": rows},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Banking ──────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_banks():
    """List all Bank masters."""
    require_auth()
    if not has_doctype("Bank"):
        return ok({"banks": []})
    rows = frappe.get_all("Bank", fields=["name", "bank_name", "swift_number", "modified"],
                          order_by="bank_name asc")
    return ok({"banks": rows})


@frappe.whitelist()
def get_bank_accounts(company=None, account_type=None):
    """List Bank Accounts. account_type: Savings | Current | Overdraft | etc."""
    require_auth()
    if not has_doctype("Bank Account"):
        return ok({"bank_accounts": []})

    filters = {"is_company_account": 1}
    if company:
        filters["company"] = company
    if account_type:
        filters["account_type"] = account_type

    fields = pick_fields("Bank Account", [
        "name", "account_name", "bank", "account_type",
        "bank_account_no", "iban", "branch_code",
        "company", "account", "currency", "is_default",
    ])

    rows = frappe.get_all("Bank Account", filters=filters, fields=fields,
                          order_by="account_name asc")
    return ok({"bank_accounts": rows})


@frappe.whitelist()
def get_bank_transactions(bank_account=None, from_date=None, to_date=None,
                           status=None, limit=50, offset=0):
    """
    List Bank Transactions for reconciliation.
    status: Unreconciled | Reconciled | Pending
    """
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Bank Transaction"):
        return ok({"transactions": []}, meta={"total": 0})

    filters = {}
    if bank_account:
        filters["bank_account"] = bank_account
    if status and status != "all":
        filters["status"] = status
    if from_date:
        filters["date"] = [">=", from_date]
    if to_date:
        existing = filters.get("date")
        if existing:
            filters["date"] = ["between", [from_date, to_date]]
        else:
            filters["date"] = ["<=", to_date]

    fields = pick_fields("Bank Transaction", [
        "name", "date", "bank_account", "description",
        "deposit", "withdrawal", "currency",
        "transaction_id", "reference_number", "status",
        "allocated_amount", "unallocated_amount",
    ])

    rows = frappe.get_all(
        "Bank Transaction", filters=filters, fields=fields,
        order_by="date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Bank Transaction", filters)
    return ok({"transactions": rows},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Journal Entries (General Ledger) ────────────────────────────────────────

@frappe.whitelist()
def get_journal_entries(company=None, voucher_type=None, from_date=None,
                         to_date=None, limit=50, offset=0):
    """
    voucher_type: Journal Entry | Bank Entry | Cash Entry | Credit Card Entry |
                  Debit Note | Credit Note | Contra Entry | Excise Entry |
                  Write Off Entry | Opening Entry | Depreciation Entry | Exchange Rate Revaluation
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Journal Entry"):
        return ok({"entries": []}, meta={"total": 0})

    filters = {"company": company, "docstatus": 1}
    if voucher_type:
        filters["voucher_type"] = voucher_type
    if from_date:
        filters["posting_date"] = [">=", from_date]
    if to_date:
        if "posting_date" in filters:
            filters["posting_date"] = ["between", [from_date, to_date]]
        else:
            filters["posting_date"] = ["<=", to_date]

    fields = pick_fields("Journal Entry", [
        "name", "posting_date", "voucher_type", "title",
        "total_debit", "total_credit",
        "cheque_no", "cheque_date",
        "finance_book", "remark", "amended_from",
    ])

    rows = frappe.get_all(
        "Journal Entry", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Journal Entry", filters)
    return ok({"entries": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_journal_entry(name):
    require_auth()
    if not has_doctype("Journal Entry"):
        return fail("Journal Entry DocType not found")
    doc = frappe.get_doc("Journal Entry", name)
    return ok({"journal_entry": doc.as_dict()})


# ─── GL Entries (raw ledger) ──────────────────────────────────────────────────

@frappe.whitelist()
def get_gl_entries(company=None, account=None, party_type=None, party=None,
                   from_date=None, to_date=None, limit=100, offset=0):
    """
    Raw General Ledger entries. Filter by account, party, or date range.
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("GL Entry"):
        return ok({"gl_entries": []}, meta={"total": 0})

    filters = {"company": company, "is_cancelled": 0}
    if account:
        filters["account"] = account
    if party_type:
        filters["party_type"] = party_type
    if party:
        filters["party"] = party
    if from_date and to_date:
        filters["posting_date"] = ["between", [from_date, to_date]]
    elif from_date:
        filters["posting_date"] = [">=", from_date]
    elif to_date:
        filters["posting_date"] = ["<=", to_date]

    fields = pick_fields("GL Entry", [
        "name", "posting_date", "account", "party_type", "party",
        "debit", "credit", "debit_in_account_currency", "credit_in_account_currency",
        "account_currency", "voucher_type", "voucher_no",
        "cost_center", "project", "remarks",
    ])

    rows = frappe.get_all(
        "GL Entry", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("GL Entry", filters)
    return ok({"gl_entries": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Chart of Accounts ────────────────────────────────────────────────────────

@frappe.whitelist()
def get_accounts(company=None, account_type=None, root_type=None,
                 is_group=None, limit=200):
    """
    root_type: Asset | Liability | Income | Expense | Equity
    account_type: Receivable | Payable | Bank | Cash | Tax | etc.
    """
    require_auth()
    company = get_company(company)

    if not has_doctype("Account"):
        return ok({"accounts": []})

    filters = {"company": company}
    if account_type:
        filters["account_type"] = account_type
    if root_type:
        filters["root_type"] = root_type
    if is_group is not None:
        filters["is_group"] = is_group
    else:
        filters["is_group"] = 0   # leaf accounts by default

    fields = pick_fields("Account", [
        "name", "account_name", "account_type", "root_type",
        "account_currency", "parent_account",
        "is_group", "freeze_account", "disabled",
    ])

    rows = frappe.get_all(
        "Account", filters=filters, fields=fields,
        order_by="root_type asc, account_name asc",
        limit_page_length=int(limit or 200),
    )
    return ok({"accounts": rows, "currency": get_currency(company)})


# ─── Cost Centers ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_cost_centers(company=None, is_group=None):
    """List Cost Centers for accounting dimension tagging."""
    require_auth()
    if not has_doctype("Cost Center"):
        return ok({"cost_centers": []})

    filters = {}
    if company:
        filters["company"] = company
    if is_group is not None:
        filters["is_group"] = is_group

    fields = pick_fields("Cost Center", [
        "name", "cost_center_name", "parent_cost_center",
        "is_group", "company", "disabled",
    ])

    rows = frappe.get_all("Cost Center", filters=filters, fields=fields,
                          order_by="cost_center_name asc")
    return ok({"cost_centers": rows})


# ─── Budgets ──────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_budgets(company=None, fiscal_year=None, limit=50, offset=0):
    """List Budgets by company and/or fiscal year."""
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Budget"):
        return ok({"budgets": []}, meta={"total": 0})

    filters = {}
    if company:
        filters["company"] = company
    if fiscal_year:
        filters["fiscal_year"] = fiscal_year

    fields = pick_fields("Budget", [
        "name", "budget_against", "cost_center", "project",
        "fiscal_year", "company", "action_if_annual_budget_exceeded",
        "action_if_accumulated_monthly_budget_exceeded", "modified",
    ])

    rows = frappe.get_all(
        "Budget", filters=filters, fields=fields,
        order_by="fiscal_year desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Budget", filters)
    return ok({"budgets": rows}, meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_budget(name):
    require_auth()
    if not has_doctype("Budget"):
        return fail("Budget DocType not found")
    doc = frappe.get_doc("Budget", name)
    return ok({"budget": doc.as_dict()})


# ─── Subscriptions ────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_subscriptions(company=None, status=None, limit=50, offset=0):
    """
    List Subscriptions (recurring billing plans).
    status: Active | Cancelled | Completed | Past Due Date | Trialing
    """
    require_auth()
    limit, offset = page(limit, offset)

    if not has_doctype("Subscription"):
        return ok({"subscriptions": []}, meta={"total": 0})

    filters = {}
    if company:
        filters["company"] = company
    if status and status != "all":
        filters["status"] = status

    fields = pick_fields("Subscription", [
        "name", "party_type", "party", "company",
        "start_date", "end_date", "current_invoice_start",
        "current_invoice_end", "status", "trial_period_start",
        "trial_period_end", "generate_invoice_at_period_start", "modified",
    ])

    rows = frappe.get_all(
        "Subscription", filters=filters, fields=fields,
        order_by="start_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Subscription", filters)
    return ok({"subscriptions": rows},
              meta={"total": total, "limit": limit, "offset": offset})


@frappe.whitelist()
def get_subscription(name):
    require_auth()
    if not has_doctype("Subscription"):
        return fail("Subscription DocType not found")
    doc = frappe.get_doc("Subscription", name)
    return ok({"subscription": doc.as_dict()})


# ─── Fiscal Years ─────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_fiscal_years():
    """Return all Fiscal Years, newest first."""
    require_auth()
    if not has_doctype("Fiscal Year"):
        return ok({"fiscal_years": []})

    rows = frappe.get_all(
        "Fiscal Year",
        fields=["name", "year_start_date", "year_end_date", "is_short_year", "disabled"],
        order_by="year_start_date desc",
    )
    return ok({"fiscal_years": rows})


# ─── Accounting Periods ───────────────────────────────────────────────────────

@frappe.whitelist()
def get_accounting_periods(company=None):
    """Return Accounting Periods used to control transaction dates."""
    require_auth()
    if not has_doctype("Accounting Period"):
        return ok({"accounting_periods": []})

    filters = {}
    if company:
        filters["company"] = company

    fields = pick_fields("Accounting Period", [
        "name", "period_name", "start_date", "end_date", "company",
    ])

    rows = frappe.get_all("Accounting Period", filters=filters, fields=fields,
                          order_by="start_date desc")
    return ok({"accounting_periods": rows})


# ─── Advance Payments ─────────────────────────────────────────────────────────

@frappe.whitelist()
def get_advance_payments(company=None, party_type=None, party=None,
                          limit=50, offset=0):
    """
    Payment Entries that are unreconciled advances.
    party_type: Customer | Supplier
    """
    require_auth()
    limit, offset = page(limit, offset)
    company = get_company(company)

    if not has_doctype("Payment Entry"):
        return ok({"advances": [], "currency": get_currency(company)}, meta={"total": 0})

    filters = {
        "company": company,
        "docstatus": 1,
        "unallocated_amount": [">", 0],
    }
    if party_type:
        filters["party_type"] = party_type
    if party:
        filters["party"] = party

    fields = pick_fields("Payment Entry", [
        "name", "payment_type", "party_type", "party", "party_name",
        "posting_date", "paid_amount", "unallocated_amount",
        "mode_of_payment", "reference_no",
    ])

    rows = frappe.get_all(
        "Payment Entry", filters=filters, fields=fields,
        order_by="posting_date desc", limit_start=offset, limit_page_length=limit,
    )
    total = frappe.db.count("Payment Entry", filters)
    return ok({"advances": rows, "currency": get_currency(company)},
              meta={"total": total, "limit": limit, "offset": offset})


# ─── Profit & Loss ────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_profit_loss(company=None, from_date=None, to_date=None):
    require_auth()
    company = get_company(company)
    start, end = date_range_this_month()
    from_date = from_date or start
    to_date   = to_date   or end

    income = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1 AND is_return=0 AND posting_date BETWEEN %s AND %s",
        (company, from_date, to_date),
    ) if has_doctype("Sales Invoice") else 0

    returns = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabSales Invoice` "
        "WHERE company=%s AND docstatus=1 AND is_return=1 AND posting_date BETWEEN %s AND %s",
        (company, from_date, to_date),
    ) if has_doctype("Sales Invoice") else 0

    expenses = safe_sql_sum(
        "SELECT COALESCE(SUM(grand_total),0) v FROM `tabPurchase Invoice` "
        "WHERE company=%s AND docstatus=1 AND is_return=0 AND posting_date BETWEEN %s AND %s",
        (company, from_date, to_date),
    ) if has_doctype("Purchase Invoice") else 0

    net_income = income - returns
    profit     = net_income - expenses

    return ok({
        "from_date":   from_date,
        "to_date":     to_date,
        "gross_income": money(income),
        "returns":      money(returns),
        "net_income":   money(net_income),
        "expenses":     money(expenses),
        "profit":       money(profit),
        "margin_pct":   round(profit / net_income * 100, 1) if net_income else 0,
        "currency":     get_currency(company),
    })


# ─── Revenue chart (last N months) ───────────────────────────────────────────

@frappe.whitelist()
def get_revenue_chart(company=None, months=6):
    require_auth()
    company = get_company(company)
    months  = max(int(months or 6), 1)

    revenue_rows = []
    if has_doctype("Sales Invoice"):
        revenue_rows = frappe.db.sql(
            """SELECT DATE_FORMAT(posting_date, '%%Y-%%m') AS month,
                      COALESCE(SUM(CASE WHEN is_return=0 THEN grand_total ELSE 0 END), 0) AS revenue,
                      COALESCE(SUM(CASE WHEN is_return=1 THEN grand_total ELSE 0 END), 0) AS returns,
                      COALESCE(SUM(CASE WHEN is_return=0 THEN outstanding_amount ELSE 0 END), 0) AS outstanding
               FROM `tabSales Invoice`
               WHERE company=%s AND docstatus=1
                 AND posting_date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
               GROUP BY DATE_FORMAT(posting_date, '%%Y-%%m')
               ORDER BY month ASC""",
            (company, months), as_dict=True,
        )

    expense_rows = []
    if has_doctype("Purchase Invoice"):
        expense_rows = frappe.db.sql(
            """SELECT DATE_FORMAT(posting_date, '%%Y-%%m') AS month,
                      COALESCE(SUM(CASE WHEN is_return=0 THEN grand_total ELSE 0 END), 0) AS expenses
               FROM `tabPurchase Invoice`
               WHERE company=%s AND docstatus=1
                 AND posting_date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH)
               GROUP BY DATE_FORMAT(posting_date, '%%Y-%%m')
               ORDER BY month ASC""",
            (company, months), as_dict=True,
        )

    expense_map = {r.month: flt(r.expenses) for r in expense_rows}
    chart = []
    for r in revenue_rows:
        m = r.month
        net = flt(r.revenue) - flt(r.returns)
        chart.append({
            "month":       m,
            "revenue":     flt(r.revenue),
            "returns":     flt(r.returns),
            "net_revenue": net,
            "expenses":    expense_map.get(m, 0),
            "profit":      net - expense_map.get(m, 0),
            "outstanding": flt(r.outstanding),
        })

    return ok({"chart": chart, "currency": get_currency(company)})


# ─── Accounts Receivable & Payable Ageing ────────────────────────────────────

@frappe.whitelist()
def get_receivables_ageing(company=None, as_of_date=None):
    """
    Receivables bucketed into ageing brackets: current, 0-30, 31-60, 61-90, 90+.
    """
    require_auth()
    company    = get_company(company)
    as_of_date = as_of_date or nowdate()

    if not has_doctype("Sales Invoice"):
        return ok({"ageing": [], "currency": get_currency(company)})

    try:
        rows = frappe.db.sql(
            """SELECT
                customer_name,
                SUM(outstanding_amount) AS total_outstanding,
                SUM(CASE WHEN DATEDIFF(%s, due_date) <= 0  THEN outstanding_amount ELSE 0 END) AS current_amt,
                SUM(CASE WHEN DATEDIFF(%s, due_date) BETWEEN 1  AND 30 THEN outstanding_amount ELSE 0 END) AS days_1_30,
                SUM(CASE WHEN DATEDIFF(%s, due_date) BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END) AS days_31_60,
                SUM(CASE WHEN DATEDIFF(%s, due_date) BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END) AS days_61_90,
                SUM(CASE WHEN DATEDIFF(%s, due_date) > 90              THEN outstanding_amount ELSE 0 END) AS days_90_plus
               FROM `tabSales Invoice`
               WHERE company=%s AND docstatus=1 AND is_return=0 AND outstanding_amount > 0
               GROUP BY customer_name
               ORDER BY total_outstanding DESC""",
            (as_of_date,) * 5 + (company,),
            as_dict=True,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_receivables_ageing failed")
        rows = []

    return ok({"ageing": rows, "as_of_date": as_of_date, "currency": get_currency(company)})


@frappe.whitelist()
def get_payables_ageing(company=None, as_of_date=None):
    """
    Payables bucketed into ageing brackets: current, 0-30, 31-60, 61-90, 90+.
    """
    require_auth()
    company    = get_company(company)
    as_of_date = as_of_date or nowdate()

    if not has_doctype("Purchase Invoice"):
        return ok({"ageing": [], "currency": get_currency(company)})

    try:
        rows = frappe.db.sql(
            """SELECT
                supplier_name,
                SUM(outstanding_amount) AS total_outstanding,
                SUM(CASE WHEN DATEDIFF(%s, due_date) <= 0  THEN outstanding_amount ELSE 0 END) AS current_amt,
                SUM(CASE WHEN DATEDIFF(%s, due_date) BETWEEN 1  AND 30 THEN outstanding_amount ELSE 0 END) AS days_1_30,
                SUM(CASE WHEN DATEDIFF(%s, due_date) BETWEEN 31 AND 60 THEN outstanding_amount ELSE 0 END) AS days_31_60,
                SUM(CASE WHEN DATEDIFF(%s, due_date) BETWEEN 61 AND 90 THEN outstanding_amount ELSE 0 END) AS days_61_90,
                SUM(CASE WHEN DATEDIFF(%s, due_date) > 90              THEN outstanding_amount ELSE 0 END) AS days_90_plus
               FROM `tabPurchase Invoice`
               WHERE company=%s AND docstatus=1 AND is_return=0 AND outstanding_amount > 0
               GROUP BY supplier_name
               ORDER BY total_outstanding DESC""",
            (as_of_date,) * 5 + (company,),
            as_dict=True,
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_payables_ageing failed")
        rows = []

    return ok({"ageing": rows, "as_of_date": as_of_date, "currency": get_currency(company)})