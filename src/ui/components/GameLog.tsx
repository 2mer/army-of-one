import type { LogEntry, LogEntryType } from '@/engine/core/types'

const TYPE_COLORS: Record<LogEntryType, string> = {
  info: '#888',
  error: '#f87171',
  highlight: '#fbbf24',
}

interface GameLogProps {
  entries: LogEntry[]
}

export function GameLog({ entries }: GameLogProps) {
  const total = entries.length

  return (
    <div className="flex-1 min-h-0 overflow-y-auto text-xs p-2 bg-black/40">
      {total === 0 && (
        <div className="text-[#555] italic">Game log</div>
      )}
      {[...entries].reverse().map((entry, i) => {
        const opacity = 1 - (i / Math.max(total - 1, 1)) * 0.6
        return (
          <div key={entry.id} className="leading-5" style={{ opacity }}>
            <span className="text-[#555]">{'>'}</span>{' '}
            <span style={{ color: TYPE_COLORS[entry.type] }}>{entry.message}</span>
          </div>
        )
      })}
    </div>
  )
}
