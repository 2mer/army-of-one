import { ActionProcessor } from '@/engine/processor/ActionProcessor'

interface ScriptIndicatorProps {
  processor: ActionProcessor
}

export function ScriptIndicator({ processor }: ScriptIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[#2a2a35] rounded border border-[var(--game-accent)] text-xs">
      <span className="text-[var(--game-accent)] font-bold">▶</span>
      <span className="text-[var(--game-fg)]">Script running</span>
      <button
        className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 cursor-pointer border border-red-600/30"
        onClick={() => processor.pause()}
      >
        ⏹ Pause
      </button>
    </div>
  )
}
