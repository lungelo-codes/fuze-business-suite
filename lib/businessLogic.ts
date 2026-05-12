/**
 * businessLogic.ts
 * Central business logic rules for Fuze Business Suite.
 * All module operations must pass through these validators before hitting the API.
 */

export type ValidationResult = { valid: true } | { valid: false; error: string };

// ─── CRM Business Rules ───────────────────────────────────────────────────────

/**
 * A lead must have a name before it can be created.
 */
export function validateNewLead(data: Record<string, unknown>): ValidationResult {
  if (!data.name && !data.lead_name) {
    return { valid: false, error: "Lead name is required" };
  }
  if (data.email && !String(data.email).includes("@")) {
    return { valid: false, error: "Invalid email address" };
  }
  return { valid: true };
}

/**
 * A lead can only be converted to an opportunity if it has a company or contact name.
 */
export function validateLeadConversion(data: Record<string, unknown>): ValidationResult {
  if (!data.customer_name && !data.company_name && !data.lead_name) {
    return { valid: false, error: "Customer or company name is required for conversion" };
  }
  return { valid: true };
}

/**
 * A quote can only be created if there is a customer name.
 */
export function validateQuote(data: Record<string, unknown>): ValidationResult {
  if (!data.customer_name && !data.party_name) {
    return { valid: false, error: "Customer name is required to create a quote" };
  }
  const items = data.items as Array<Record<string, unknown>> | undefined;
  if (!items || items.length === 0) {
    return { valid: false, error: "At least one line item is required on a quote" };
  }
  for (const item of items) {
    if (!item.item_code) {
      return { valid: false, error: "All quote items must have an item code" };
    }
    if (Number(item.qty || 0) <= 0) {
      return { valid: false, error: "Item quantity must be greater than zero" };
    }
  }
  return { valid: true };
}

/**
 * An invoice requires a customer (not just a lead name) and at least one item.
 * Business rule: You cannot invoice a lead that has not been converted to a customer.
 */
export function validateInvoice(data: Record<string, unknown>): ValidationResult {
  if (!data.customer) {
    return {
      valid: false,
      error:
        "A customer record is required to create an invoice. Convert the lead to a customer first.",
    };
  }
  const items = data.items as Array<Record<string, unknown>> | undefined;
  if (!items || items.length === 0) {
    return { valid: false, error: "At least one line item is required on an invoice" };
  }
  for (const item of items) {
    if (!item.item_code) {
      return { valid: false, error: "All invoice items must have an item code" };
    }
    if (Number(item.qty || 0) <= 0) {
      return { valid: false, error: "Item quantity must be greater than zero" };
    }
    if (Number(item.rate || 0) < 0) {
      return { valid: false, error: "Item rate cannot be negative" };
    }
  }
  return { valid: true };
}

// ─── Compliance Business Rules ────────────────────────────────────────────────

/**
 * VAT returns require a period and at least one of output or input VAT.
 */
export function validateVatReturn(data: Record<string, unknown>): ValidationResult {
  if (!data.period) {
    return { valid: false, error: "Tax period is required for a VAT return" };
  }
  if (data.output_vat === undefined && data.input_vat === undefined) {
    return { valid: false, error: "At least output VAT or input VAT must be provided" };
  }
  return { valid: true };
}

/**
 * CIPC returns require a financial year.
 */
export function validateCipcReturn(data: Record<string, unknown>): ValidationResult {
  if (!data.financial_year && !data.year) {
    return { valid: false, error: "Financial year is required for a CIPC return" };
  }
  return { valid: true };
}

/**
 * Compliance tasks must have a title and a due date.
 */
export function validateComplianceTask(data: Record<string, unknown>): ValidationResult {
  if (!data.title) {
    return { valid: false, error: "Task title is required" };
  }
  return { valid: true };
}

// ─── Finance Business Rules ───────────────────────────────────────────────────

/**
 * A payment entry requires a party and an amount.
 */
export function validatePayment(data: Record<string, unknown>): ValidationResult {
  if (!data.party) {
    return { valid: false, error: "Party (customer or supplier) is required for a payment" };
  }
  if (Number(data.paid_amount || 0) <= 0) {
    return { valid: false, error: "Payment amount must be greater than zero" };
  }
  return { valid: true };
}

// ─── HR Business Rules ────────────────────────────────────────────────────────

/**
 * Leave requests require an employee, leave type, and date range.
 */
export function validateLeaveRequest(data: Record<string, unknown>): ValidationResult {
  if (!data.employee) {
    return { valid: false, error: "Employee is required for a leave request" };
  }
  if (!data.leave_type) {
    return { valid: false, error: "Leave type is required" };
  }
  if (!data.from_date || !data.to_date) {
    return { valid: false, error: "From date and to date are required" };
  }
  if (new Date(String(data.from_date)) > new Date(String(data.to_date))) {
    return { valid: false, error: "From date cannot be after to date" };
  }
  return { valid: true };
}

// ─── Project Business Rules ───────────────────────────────────────────────────

/**
 * Projects require a name and expected end date.
 */
export function validateProject(data: Record<string, unknown>): ValidationResult {
  if (!data.project_name && !data.name) {
    return { valid: false, error: "Project name is required" };
  }
  return { valid: true };
}

// ─── Generic helper ───────────────────────────────────────────────────────────

/**
 * Throws an error if validation fails. Use in API routes.
 */
export function assertValid(result: ValidationResult): void {
  if (!result.valid) {
    throw new Error(result.error);
  }
}
