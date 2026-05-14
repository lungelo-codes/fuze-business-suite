import { NextResponse } from 'next/server';
import { erpMethod } from '@/lib/server/erpnext';

/**
 * API route for fetching a lead's lifecycle history or listing lifecycles.
 *
 * This endpoint proxies to the backend `crm.get_lead_lifecycle` method.  It accepts
 * optional query parameters:
 *
 * - `lead`: a specific lead name or ID to fetch a single lifecycle with its
 *   communications and status history.
 * - `limit`: maximum number of lifecycle records to return when listing.
 * - `offset`: number of records to skip for pagination.
 *
 * The response mirrors the backend's `ok/meta/data` structure.  When an
 * error occurs, a 500 response is returned with the error message.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lead = searchParams.get('lead') || undefined;
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');
  const limit = limitParam ? Number(limitParam) : undefined;
  const offset = offsetParam ? Number(offsetParam) : undefined;

  const args: Record<string, any> = {};
  if (lead) args.lead = lead;
  if (typeof limit === 'number' && !isNaN(limit)) args.limit = limit;
  if (typeof offset === 'number' && !isNaN(offset)) args.offset = offset;

  try {
    const result = await erpMethod('crm.get_lead_lifecycle', args);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Failed to fetch lead lifecycle', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch lead lifecycle' }, { status: 500 });
  }
}