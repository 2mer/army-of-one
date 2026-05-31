import { useState } from 'react'
import { clsx } from 'clsx'
import { ActionProcessor } from '@/engine/processor/ActionProcessor'

interface ScriptIndicatorProps {
  processor: ActionProcessor
  paused: boolean
  onRun?: () => void
}

const SPEEDS = [
  { label: '1×', value: 200 },
  { label: '2×', value: 100 },
  { label: '4×', value: 50 },
]

export function ScriptIndicator({ processor, paused, onRun }: ScriptIndicatorProps) {
  const [activeSpeed, setActiveSpeed] = useState(() => processor.speed)
  const running = processor.mode === 'auto'

  function handleSpeed(value: number) {
    processor.speed = value
    setActiveSpeed(value)
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[#2a2a35] rounded border border-[var(--game-accent)] text-xs">
      <span className={clsx('font-bold', !running ? 'text-[#555]' : paused ? 'text-yellow-400' : 'text-[var(--game-accent)]')}>
        {!running ? '○' : paused ? '⏸' : '▶'}
      </span>
      <span className={clsx(!running && 'text-[#555]')}>
        {!running ? 'No script' : paused ? 'Paused' : 'Running'}
      </span>

      <div className="flex items-center gap-0 border-l border-[#444] pl-2 ml-1">
        <span className="text-[10px] text-[#666] mr-1">⏱</span>
        <div className="flex">
          {SPEEDS.map((s, i) => (
            <button
              key={s.value}
              className={clsx(
                'px-1.5 py-0.5 cursor-pointer text-[10px]',
                i === 0 && 'rounded-l',
                i === SPEEDS.length - 1 && 'rounded-r',
                activeSpeed === s.value
                  ? 'bg-[var(--game-accent)] text-black font-bold'
                  : 'bg-[#1a1a22] text-[#888] hover:bg-[#2a2a35] border border-[#333]'
              )}
              onClick={() => handleSpeed(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {onRun && (
        <button
          className="px-2 py-0.5 bg-[var(--game-accent)] text-black rounded text-xs cursor-pointer hover:opacity-80"
          onClick={onRun}
        >
          {running ? '↻ Re-run' : '▶ Run'}
        </button>
      )}

      <button
        disabled={!running}
        className={clsx(
          'px-2 py-0.5 rounded border',
          running
            ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/40 cursor-pointer border-yellow-600/30'
            : 'bg-[#1a1a22] text-[#555] border-[#333] opacity-40 cursor-not-allowed'
        )}
        onClick={() => processor.togglePause()}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>

      <button
        disabled={!running || !paused}
        className={clsx(
          'px-2 py-0.5 rounded border',
          running && paused
            ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 cursor-pointer border-blue-600/30'
            : 'bg-[#1a1a22] text-[#555] border-[#333] opacity-40 cursor-not-allowed'
        )}
        onClick={() => processor.step()}
      >
        Step
      </button>

      <button
        disabled={!running}
        className={clsx(
          'px-1.5 py-0.5 rounded border',
          running
            ? 'bg-red-600/20 text-red-400 hover:bg-red-600/40 cursor-pointer border-red-600/30'
            : 'bg-[#1a1a22] text-[#555] border-[#333] opacity-40 cursor-not-allowed'
        )}
        onClick={() => processor.stop()}
      >
        ✕
      </button>
    </div>
  )
}
