import { NextResponse } from 'next/server'
import { erpList, erpCreate } from '@/lib/server/erpnext'
import { cookies } from 'next/headers'

type Row = Record<string, unknown>

export async function GET() {
  try {
    const comms = await erpList<Row>('Communication', {
      fields: [
        'name', 'subject', 'content', 'sender', 'sender_full_name',
        'recipients', 'communication_type', 'status',
        'reference_doctype', 'reference_name', 'modified',
      ],
      limit: 100,
      orderBy: 'modified desc',
    })
    return NextResponse.json({ data: comms })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load messages' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Row
    if (!body.content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }
    const cookieStore = await cookies()
    const email = cookieStore.get('fuze_email')?.value
      ? decodeURIComponent(cookieStore.get('fuze_email')!.value)
      : ''
    const fullName = cookieStore.get('fuze_full_name')?.value
      ? decodeURIComponent(cookieStore.get('fuze_full_name')!.value)
      : ''

    const doc = await erpCreate<Row>('Communication', {
      subject: body.subject || 'Portal Message',
      content: body.content,
      communication_type: body.communication_type || 'Comment',
      sender: String(body.sender || email || ''),
      sender_full_name: String(body.sender_full_name || fullName || ''),
      reference_doctype: body.reference_doctype || '',
      reference_name: body.reference_name || '',
    })
    return NextResponse.json({ data: doc })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not send message' },
      { status: 500 }
    )
  }
}
