'use client'

import type { ReactNode } from 'react'

export default function DetailDrawer({
  open,
  title,
  subtitle,
  children,
  onClose,
}: {
  open: boolean
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Close details" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={onClose} />
      <aside className="absolute right-0 top-0 z-10 flex h-full w-[820px] max-w-[96vw] flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl ">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Record Details</div>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#15132E]">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900">✕</button>
        </div>
        <div className="flex-1 overflow-auto bg-[#F7F8FB] p-6">{children}</div>
      </aside>
    </div>
  )
}
