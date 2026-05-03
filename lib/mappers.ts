import {
  AppointmentRecord,
  CommunicationRecord,
  ComplianceKind,
  ComplianceRecord,
  CustomerRecord,
  EmployeeRecord,
  InvoiceRecord,
  ItemRecord,
  PaymentRecord,
  ProjectRecord,
  QuoteRecord,
  SupplierRecord,
  SupportTicket,
  TaskRecord
} from "./types";

function row(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function s(value: unknown): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : String(value);
}

function n(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

export function mapCustomers(data: unknown[]): CustomerRecord[] {
  return data.map((item): CustomerRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      customer_name: s(r.customer_name),
      customer_type: s(r.customer_type),
      customer_group: s(r.customer_group),
      territory: s(r.territory),
      mobile_no: s(r.mobile_no),
      email_id: s(r.email_id),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapInvoices(data: unknown[]): InvoiceRecord[] {
  return data.map((item): InvoiceRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      customer: s(r.customer),
      posting_date: s(r.posting_date),
      due_date: s(r.due_date),
      grand_total: n(r.grand_total),
      outstanding_amount: n(r.outstanding_amount),
      status: s(r.status),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapQuotes(data: unknown[]): QuoteRecord[] {
  return data.map((item): QuoteRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      party_name: s(r.party_name),
      transaction_date: s(r.transaction_date),
      valid_till: s(r.valid_till),
      grand_total: n(r.grand_total),
      status: s(r.status),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapPayments(data: unknown[]): PaymentRecord[] {
  return data.map((item): PaymentRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      party: s(r.party),
      party_type: s(r.party_type),
      posting_date: s(r.posting_date),
      paid_amount: n(r.paid_amount),
      payment_type: s(r.payment_type),
      status: s(r.status),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapEmployees(data: unknown[]): EmployeeRecord[] {
  return data.map((item): EmployeeRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      employee_name: s(r.employee_name),
      department: s(r.department),
      designation: s(r.designation),
      status: s(r.status),
      company_email: s(r.company_email),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapItems(data: unknown[]): ItemRecord[] {
  return data.map((item): ItemRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      item_name: s(r.item_name),
      item_group: s(r.item_group),
      stock_uom: s(r.stock_uom),
      disabled: n(r.disabled),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapSuppliers(data: unknown[]): SupplierRecord[] {
  return data.map((item): SupplierRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      supplier_name: s(r.supplier_name),
      supplier_group: s(r.supplier_group),
      supplier_type: s(r.supplier_type),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapProjects(data: unknown[]): ProjectRecord[] {
  return data.map((item): ProjectRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      project_name: s(r.project_name),
      status: s(r.status),
      expected_start_date: s(r.expected_start_date),
      expected_end_date: s(r.expected_end_date),
      percent_complete: n(r.percent_complete),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapTasks(data: unknown[]): TaskRecord[] {
  return data.map((item): TaskRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      subject: s(r.subject),
      status: s(r.status),
      priority: s(r.priority),
      exp_start_date: s(r.exp_start_date),
      exp_end_date: s(r.exp_end_date),
      project: s(r.project),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapSupport(data: unknown[]): SupportTicket[] {
  return data.map((item): SupportTicket => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      subject: s(r.subject),
      issue_type: s(r.issue_type),
      status: s(r.status),
      priority: s(r.priority),
      customer: s(r.customer),
      raised_by: s(r.raised_by),
      description: s(r.description),
      opening_date: s(r.opening_date),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapCommunications(data: unknown[]): CommunicationRecord[] {
  return data.map((item): CommunicationRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      subject: s(r.subject),
      content: s(r.content),
      sender: s(r.sender),
      communication_type: s(r.communication_type),
      creation: s(r.creation),
      reference_doctype: s(r.reference_doctype),
      reference_name: s(r.reference_name),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapAppointments(data: unknown[]): AppointmentRecord[] {
  return data.map((item): AppointmentRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      subject: s(r.subject),
      starts_on: s(r.starts_on),
      ends_on: s(r.ends_on),
      status: s(r.status),
      event_type: s(r.event_type),
      description: s(r.description),
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function mapCompliance(data: unknown[], kind: ComplianceKind): ComplianceRecord[] {
  return data.map((item): ComplianceRecord => {
    const r = row(item);
    return {
      name: String(r.name ?? ""),
      company: s(r.company),
      status: s(r.status),
      due_date: s(r.due_date),
      submission_date: s(r.submission_date),
      return_year: n(r.return_year),
      period: s(r.period),
      amount_due: n(r.amount_due),
      total_due: n(r.total_due),
      kind,
      modified: s(r.modified),
      owner: s(r.owner)
    };
  });
}

export function money(value?: number): string {
  return `R ${(value ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
