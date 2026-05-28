import { useRef, useEffect } from 'react'

interface GameLogProps {
  entries: string[]
}

export function GameLog({ entries }: GameLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries])

  return (
    <div className="h-24 overflow-y-auto border-t border-[#333] bg-black/40 text-xs p-2">
      {entries.length === 0 && (
        <div className="text-[#555] italic">Game log</div>
      )}
      {entries.map((entry, i) => (
        <div key={i} className="text-[#888] leading-5">
          <span className="text-[#555]">{'>'}</span> {entry}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
