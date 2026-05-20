import { erpMethod, BusinessSuiteError } from "@/lib/server/erpnext";

type Row = Record<string, any>;

type SalesKind = "quote" | "sales-order" | "invoice" | "contract";

function unwrapRow(value: unknown): Row {
  const v = value as any;
  if (v?.data && !Array.isArray(v.data)) return v.data;
  if (v?.message && !Array.isArray(v.message)) return v.message;
  if (v?.doc) return v.doc;
  if (v && typeof v === "object") return v as Row;
  return {};
}

function rowsFrom(value: unknown): Row[] {
  const v = value as any;
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.data)) return v.data;
  if (Array.isArray(v?.message)) return v.message;
  if (Array.isArray(v?.records)) return v.records;
  if (Array.isArray(v?.rows)) return v.rows;
  return [];
}

async function listOne(doctype: string, filters: unknown[], fields: string[]): Promise<Row | null> {
  try {
    const res = await erpMethod("business_crud.list_doctype", { doctype, fields, filters, limit: 1, order_by: "modified desc" });
    return rowsFrom(res)[0] || null;
  } catch {
    return null;
  }
}

async function getDoc(doctype: string, name: string): Promise<Row | null> {
  try {
    const res = await erpMethod("business_crud.get_doctype", { doctype, name });
    return unwrapRow(res);
  } catch {
    return null;
  }
}

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function getReference(type: "lead" | "deal", id: string): Promise<Row> {
  if (type === "lead") return (await getDoc("Lead", id)) || { name: id };
  return (await getDoc("Opportunity", id)) || { name: id };
}

async function getFirstName(doctype: string, fields = ["name"]): Promise<string> {
  const row = await listOne(doctype, [], fields);
  return String(row?.name || "");
}

async function ensureCustomerFromReference(ref: Row, type: "lead" | "deal"): Promise<string> {
  const existing = type === "deal" ? String(ref.party_name || ref.customer || ref.customer_name || "") : "";
  if (existing) return existing;

  const customerName = String(ref.company_name || ref.customer_name || ref.organization || ref.title || ref.lead_name || ref.name || "CRM Customer");
  const found = await listOne("Customer", [["customer_name", "=", customerName]], ["name", "customer_name"]);
  if (found?.name) return String(found.name);

  const created = await erpMethod("business_crud.create_doctype", {
    doctype: "Customer",
    module_id: "crm-customers",
    values: {
      customer_name: customerName,
      customer_type: "Company",
      customer_group: await getFirstName("Customer Group") || "All Customer Groups",
      territory: await getFirstName("Territory") || "All Territories",
    },
    ignore_mandatory: true,
    ignore_validate: true,
    mute_notifications: true,
  });
  const row = unwrapRow(created);
  if (!row.name) throw new BusinessSuiteError("Could not prepare customer", 500);
  return String(row.name);
}

async function normaliseItems(body: Row) {
  const uom = await getFirstName("UOM") || "Nos";
  const itemGroup = await getFirstName("Item Group") || "All Item Groups";
  const incoming = Array.isArray(body.items) && body.items.length ? body.items : [{ item_name: "Service", qty: 1, rate: 0 }];
  return incoming.map((item: Row, index: number) => ({
    item_code: item.item_code || undefined,
    item_name: item.item_name || item.description || `Service ${index + 1}`,
    item_group: item.item_group || itemGroup,
    description: item.description || item.item_name || `Service ${index + 1}`,
    qty: Number(item.qty || 1),
    rate: Number(item.rate || 0),
    amount: Number(item.qty || 1) * Number(item.rate || 0),
    uom: item.uom || uom,
    stock_uom: item.uom || uom,
    conversion_factor: 1,
    delivery_date: item.delivery_date || today(14),
  }));
}

async function createBusinessDoc(doctype: string, values: Row, moduleId: string): Promise<Row> {
  const result = await erpMethod("business_crud.create_doctype", {
    doctype,
    values,
    module_id: moduleId,
    ignore_mandatory: true,
    ignore_validate: true,
    mute_notifications: true,
  });
  return unwrapRow(result);
}

export async function createCrmSalesDocument(type: "lead" | "deal", id: string, kind: SalesKind, body: Row): Promise<Row> {
  const ref = await getReference(type, id);
  const sellingPriceList = await getFirstName("Price List", ["name", "selling"]) || "Standard Selling";

  if (kind === "contract") {
    const customer = await ensureCustomerFromReference(ref, type);
    const values = {
      party_type: "Customer",
      party_name: customer,
      contract_terms: body.contract_terms || body.terms_template || body.contract_name || `Contract for ${customer}`,
      start_date: body.start_date || today(0),
      end_date: body.end_date || today(365),
      status: body.status || "Unsigned",
    };
    return createBusinessDoc("Contract", values, "contracts");
  }

  const items = await normaliseItems(body);
  const common = {
    company: body.company || undefined,
    currency: body.currency || "ZAR",
    conversion_rate: body.conversion_rate || 1,
    selling_price_list: body.selling_price_list || sellingPriceList,
    price_list_currency: body.price_list_currency || "ZAR",
    plc_conversion_rate: body.plc_conversion_rate || 1,
    items,
  };

  if (kind === "quote") {
    const leadParty = type === "lead" ? String(ref.name || id) : "";
    const customerParty = type === "deal" ? await ensureCustomerFromReference(ref, type) : "";
    return createBusinessDoc("Quotation", {
      ...common,
      title: body.title || `Quote - ${ref.company_name || ref.customer_name || ref.title || ref.name || id}`,
      quotation_to: type === "lead" ? "Lead" : "Customer",
      party_name: type === "lead" ? leadParty : customerParty,
      customer_name: ref.company_name || ref.customer_name || ref.title || ref.lead_name || undefined,
      transaction_date: body.transaction_date || today(0),
      valid_till: body.valid_till || today(14),
      order_type: "Sales",
    }, "quotes");
  }

  const customer = await ensureCustomerFromReference(ref, type);

  if (kind === "sales-order") {
    return createBusinessDoc("Sales Order", {
      ...common,
      title: body.title || `Sales Order - ${customer}`,
      customer,
      transaction_date: body.transaction_date || today(0),
      delivery_date: body.delivery_date || today(21),
    }, "sales-orders");
  }

  return createBusinessDoc("Sales Invoice", {
    ...common,
    title: body.title || `Invoice - ${customer}`,
    customer,
    posting_date: body.posting_date || today(0),
    due_date: body.due_date || today(14),
  }, "invoices");
}
