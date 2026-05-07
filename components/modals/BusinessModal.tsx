'use client'

import type { ReactNode } from 'react'

export default function BusinessModal({
  open,
  title,
  children,
  onClose,
  size = 'lg',
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'md' | 'lg' | 'xl'
}) {
  if (!open) return null

  const width = size === 'xl' ? 'max-w-5xl' : size === 'md' ? 'max-w-xl' : 'max-w-3xl'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${width} overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl `}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[#15132E]">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-auto bg-[#FBFCFE] p-6">{children}</div>
      </div>
    </div>
  )
}
