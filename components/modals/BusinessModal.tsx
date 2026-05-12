'use client'

import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const widthMap = { md: 560, lg: 760, xl: 1020 }

function ModalContent({
  title,
  children,
  onClose,
  size = 'lg',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  size?: 'md' | 'lg' | 'xl'
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

  const maxW = widthMap[size]

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      {/* backdrop */}
      <button
        aria-label="Close modal"
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(11,16,32,0.52)',
          backdropFilter: 'blur(3px)',
          border: 0, cursor: 'pointer',
        }}
      />
      {/* dialog */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: maxW,
        borderRadius: 24, overflow: 'hidden',
        background: 'var(--demo-card, #fff)',
        border: '1px solid var(--demo-line, #E6E8EF)',
        boxShadow: '0 32px 80px rgba(22,26,45,.22)',
      }}>
        {/* header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 16, padding: '18px 24px',
          borderBottom: '1px solid var(--demo-line, #E6E8EF)',
          background: 'var(--demo-card, #fff)',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950, letterSpacing: '-0.025em', color: 'var(--demo-text, #15132E)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 36, height: 36, borderRadius: 12,
              border: '1px solid var(--demo-line, #E6E8EF)',
              background: 'var(--demo-soft, #F1F3F7)',
              color: 'var(--demo-muted, #6B7086)',
              cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 16, flexShrink: 0,
            }}
          >✕</button>
        </div>
        {/* body */}
        <div style={{ maxHeight: '75vh', overflowY: 'auto', padding: 24, background: 'var(--demo-soft, #F5F6FA)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

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
  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <ModalContent title={title} onClose={onClose} size={size}>{children}</ModalContent>,
    document.body
  )
}
