import { NextResponse } from 'next/server';
import { erpMethod } from '@/lib/server/erpnext';

/**
 * API route for creating a new sales invoice.
 *
 * This endpoint accepts a POST request with JSON payload containing:
 *
 * ```json
 * {
 *   "party": "Customer Name or ID",
 *   "items": [
 *     { "item_code": "ITEM001", "qty": 1, "rate": 1000 },
 *     ...
 *   ],
 *   "company_logo_url": "https://example.com/path/to/logo.png" // optional
 * }
 * ```
 *
 * It forwards the request to the backend `invoice_quote.create_invoice` method and
 * returns the resulting document and PDF (if generated) as JSON.  When an
 * error occurs, a 500 response is returned with the error message.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { party, items, company_logo_url } = body || {};
    if (!party || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid payload. `party` and `items` are required.' }, { status: 400 });
    }
    const args: Record<string, any> = { party, items };
    if (company_logo_url) args.company_logo_url = company_logo_url;
    const result = await erpMethod('invoice_quote.create_invoice', args);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to create invoice', error);
    return NextResponse.json({ error: error?.message || 'Failed to create invoice' }, { status: 500 });
  }
}