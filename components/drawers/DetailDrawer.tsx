'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

function DrawerContent({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  onClose: () => void
}) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex' }}>
      {/* backdrop */}
      <button
        aria-label="Close details"
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(11,16,32,0.52)',
          backdropFilter: 'blur(3px)',
          border: 0, cursor: 'pointer',
        }}
      />
      {/* panel */}
      <aside style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 'min(820px, 96vw)',
        display: 'flex', flexDirection: 'column',
        background: 'var(--demo-card, #fff)',
        borderLeft: '1px solid var(--demo-line, #E6E8EF)',
        boxShadow: '0 0 80px rgba(22,26,45,.22)',
        overflow: 'hidden',
        zIndex: 1,
      }}>
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          gap: 16, padding: '20px 24px',
          borderBottom: '1px solid var(--demo-line, #E6E8EF)',
          background: 'var(--demo-card, #fff)',
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#28a486' }}>
              Record Details
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 22, fontWeight: 950, letterSpacing: '-0.03em', color: 'var(--demo-text, #15132E)' }}>
              {title}
            </h2>
            {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--demo-muted, #6B7086)' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: 12, border: '1px solid var(--demo-line, #E6E8EF)',
              background: 'var(--demo-soft, #F1F3F7)', color: 'var(--demo-muted, #6B7086)',
              cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0,
            }}
          >✕</button>
        </div>
        {/* body */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--demo-soft, #F5F6FA)' }}>
          {children}
        </div>
      </aside>
    </div>
  )
}

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
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <DrawerContent title={title} subtitle={subtitle} onClose={onClose}>{children}</DrawerContent>,
    document.body
  )
}
