import { NextResponse } from 'next/server'
import { erpList, erpCreate } from '@/lib/server/erpnext'

type Row = Record<string, unknown>

export async function GET() {
  try {
    const events = await erpList<Row>('Event', {
      fields: [
        'name', 'subject', 'starts_on', 'ends_on', 'event_type',
        'status', 'description', 'all_day', 'modified',
      ],
      limit: 200,
      orderBy: 'starts_on desc',
    })
    return NextResponse.json({ data: events })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load appointments' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Row
    if (!body.subject || !body.starts_on) {
      return NextResponse.json({ error: 'Subject and start date are required' }, { status: 400 })
    }
    const doc = await erpCreate<Row>('Event', {
      subject: body.subject,
      starts_on: body.starts_on,
      ends_on: body.ends_on || body.starts_on,
      event_type: body.event_type || 'Private',
      description: body.description || '',
      status: body.status || 'Open',
      all_day: body.all_day ? 1 : 0,
    })
    return NextResponse.json({ data: doc })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not create appointment' },
      { status: 500 }
    )
  }
}
