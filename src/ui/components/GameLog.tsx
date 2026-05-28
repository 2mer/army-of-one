import { useRef, useEffect } from 'react'
import type { LogEntry } from '@/engine/core/types'

interface GameLogProps {
  entries: LogEntry[]
}

export function GameLog({ entries }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto text-xs p-2 bg-black/40">
      {entries.length === 0 && (
        <div className="text-[#555] italic">Game log</div>
      )}
      {entries.map(entry => (
        <div key={entry.id} className="text-[#888] leading-5">
          <span className="text-[#555]">{'>'}</span> {entry.message}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
