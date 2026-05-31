import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'

export interface DialAbility {
  id: string
  name: string
  enabled: boolean
  reasons: string[]
}

interface RadialDialProps {
  x: number
  y: number
  abilities: DialAbility[]
  onSelect: (abilityId: string) => void
  onDismiss: () => void
}

const SLOT_COUNT = 8
const RADIUS = 100

export function RadialDial({ x, y, abilities, onSelect, onDismiss }: RadialDialProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => {
    const angle = (i / SLOT_COUNT) * Math.PI * 2 - Math.PI / 2
    const dx = Math.cos(angle) * RADIUS
    const dy = Math.sin(angle) * RADIUS
    const ability = abilities[i] ?? null

    return { index: i, dx, dy, ability }
  })

  return (
    <>
      <div className="fixed inset-0 z-40" onPointerDown={onDismiss} />
      <div
        ref={ref}
        className="fixed z-50 pointer-events-none"
        style={{ left: x, top: y }}
      >
        {slots.map(({ index, dx, dy, ability }) => (
          <div
            key={index}
            className={clsx(
              'absolute pointer-events-auto flex items-center justify-center w-16 h-16 rounded-full border text-xs font-mono transition-colors -translate-x-1/2 -translate-y-1/2',
              ability
                ? ability.enabled
                  ? 'bg-[#2a2a35] border-[var(--game-accent)] text-[var(--game-fg)] hover:bg-[var(--game-accent)] hover:text-black cursor-pointer'
                  : 'bg-[#1a1a22] border-[#444] text-[#555] cursor-default'
                : 'bg-transparent border-dashed border-[#333]'
            )}
            style={{ left: 32 + dx, top: 32 + dy }}
            title={ability && !ability.enabled ? ability.reasons.join('; ') : undefined}
            onClick={() => {
              if (ability && ability.enabled) onSelect(ability.id)
            }}
          >
            <span className="text-center leading-tight px-1">
              {ability ? ability.name : index + 1}
            </span>
          </div>
        ))}
      </div>
    </>
  )
}
