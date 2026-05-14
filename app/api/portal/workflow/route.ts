import { NextResponse } from 'next/server'
import { erpMethod, erpCreate, erpGet, erpPatch } from '@/lib/server/erpnext'

type Row = Record<string, unknown>

/**
 * Workflow API — converts records through the sales pipeline:
 * Lead → Opportunity → Quotation → Sales Order → Sales Invoice
 *
 * POST body: { action, name, ...fields }
 * action: "lead_to_opportunity" | "opportunity_to_quote" | "quote_to_order" | "order_to_invoice" | "quote_to_invoice"
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Row
    const action = String(body.action || '')
    const name = String(body.name || '')

    if (!action || !name) {
      return NextResponse.json({ error: 'action and name are required' }, { status: 400 })
    }

    switch (action) {
      case 'lead_to_opportunity': {
        // Try the Frappe method first, then fall back to manual creation
        try {
          const result = await erpMethod<Row>('frappe.client.make_opportunity', { source_name: name })
          if (result) return NextResponse.json({ data: result, action })
        } catch {}

        // Manual: get lead and create opportunity
        const leadRes = await erpGet<{ data?: Row; message?: Row }>(`/api/resource/Lead/${encodeURIComponent(name)}`)
        const lead = leadRes.data ?? leadRes.message ?? {}
        const opp = await erpCreate<Row>('Opportunity', {
          opportunity_from: 'Lead',
          party_name: name,
          lead_name: String(lead.lead_name || lead.name || ''),
          contact_email: String(lead.email_id || ''),
          contact_mobile: String(lead.mobile_no || ''),
          status: 'Open',
          opportunity_type: 'Sales',
        })
        // Update lead status
        await erpPatch('Lead', name, { status: 'Opportunity' }).catch(() => null)
        return NextResponse.json({ data: opp, action })
      }

      case 'opportunity_to_quote': {
        try {
          const result = await erpMethod<Row>('frappe.client.make_quotation', { source_name: name })
          if (result) return NextResponse.json({ data: result, action })
        } catch {}

        const oppRes = await erpGet<{ data?: Row; message?: Row }>(`/api/resource/Opportunity/${encodeURIComponent(name)}`)
        const opp = oppRes.data ?? oppRes.message ?? {}
        const quote = await erpCreate<Row>('Quotation', {
          quotation_to: 'Customer',
          party_name: String(opp.party_name || opp.customer_name || ''),
          transaction_date: new Date().toISOString().slice(0, 10),
          valid_till: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          opportunity: name,
          items: [{ item_code: 'Consulting Service', qty: 1, rate: 0 }],
        })
        await erpPatch('Opportunity', name, { status: 'Quotation' }).catch(() => null)
        return NextResponse.json({ data: quote, action })
      }

      case 'quote_to_order': {
        try {
          const result = await erpMethod<Row>('erpnext.selling.doctype.quotation.quotation.make_sales_order', { source_name: name })
          if (result) return NextResponse.json({ data: result, action })
        } catch {}

        const quoteRes = await erpGet<{ data?: Row; message?: Row }>(`/api/resource/Quotation/${encodeURIComponent(name)}`)
        const quote = quoteRes.data ?? quoteRes.message ?? {}
        const order = await erpCreate<Row>('Sales Order', {
          customer: String(quote.party_name || quote.customer || ''),
          transaction_date: new Date().toISOString().slice(0, 10),
          delivery_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          items: Array.isArray(quote.items) ? quote.items : [{ item_code: 'Consulting Service', qty: 1, rate: 0 }],
        })
        return NextResponse.json({ data: order, action })
      }

      case 'quote_to_invoice': {
        try {
          const result = await erpMethod<Row>('erpnext.selling.doctype.quotation.quotation.make_sales_invoice', { source_name: name })
          if (result) return NextResponse.json({ data: result, action })
        } catch {}

        const quoteRes = await erpGet<{ data?: Row; message?: Row }>(`/api/resource/Quotation/${encodeURIComponent(name)}`)
        const quote = quoteRes.data ?? quoteRes.message ?? {}
        const invoice = await erpCreate<Row>('Sales Invoice', {
          customer: String(quote.party_name || quote.customer || ''),
          posting_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          items: Array.isArray(quote.items) ? quote.items : [{ item_code: 'Consulting Service', qty: 1, rate: 0 }],
        })
        return NextResponse.json({ data: invoice, action })
      }

      case 'order_to_invoice': {
        try {
          const result = await erpMethod<Row>('erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice', { source_name: name })
          if (result) return NextResponse.json({ data: result, action })
        } catch {}

        const orderRes = await erpGet<{ data?: Row; message?: Row }>(`/api/resource/Sales Order/${encodeURIComponent(name)}`)
        const order = orderRes.data ?? orderRes.message ?? {}
        const invoice = await erpCreate<Row>('Sales Invoice', {
          customer: String(order.customer || ''),
          posting_date: new Date().toISOString().slice(0, 10),
          due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
          items: Array.isArray(order.items) ? order.items : [{ item_code: 'Consulting Service', qty: 1, rate: 0 }],
        })
        return NextResponse.json({ data: invoice, action })
      }

      default:
        return NextResponse.json({ error: `Unknown workflow action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Workflow action failed' },
      { status: 500 }
    )
  }
}
