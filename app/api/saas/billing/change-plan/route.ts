import { NextResponse } from 'next/server'

type PlanChangeBody = {
  currentPlan: string
  newPlan: string
  balanceDue?: number
  daysRemaining?: number
}

const planRank: Record<string, number> = {
  Starter: 1,
  Business: 2,
  Enterprise: 3,
}

export async function POST(req: Request) {
  const body = (await req.json()) as PlanChangeBody

  const currentRank = planRank[body.currentPlan] || 0
  const newRank = planRank[body.newPlan] || 0
  const balanceDue = body.balanceDue || 0

  if (balanceDue > 0 && newRank < currentRank) {
    return NextResponse.json(
      {
        ok: false,
        action: 'blocked',
        message:
          'Downgrades are blocked while the account has an outstanding balance.',
      },
      { status: 402 },
    )
  }

  if (newRank > currentRank) {
    return NextResponse.json({
      ok: true,
      action: 'upgrade_now',
      message:
        'Upgrade will apply immediately. A top-up invoice should be generated for the remaining billing period.',
    })
  }

  if (newRank < currentRank) {
    return NextResponse.json({
      ok: true,
      action: 'schedule_downgrade',
      message:
        'Downgrade has been scheduled for the next billing cycle. Current modules remain active until the paid period ends.',
    })
  }

  return NextResponse.json({
    ok: true,
    action: 'no_change',
    message: 'Plan is unchanged.',
  })
}
