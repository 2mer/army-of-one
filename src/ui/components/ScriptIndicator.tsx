import { ActionProcessor } from '@/engine/processor/ActionProcessor'

interface ScriptIndicatorProps {
  processor: ActionProcessor
  paused: boolean
}

export function ScriptIndicator({ processor, paused }: ScriptIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-[#2a2a35] rounded border border-[var(--game-accent)] text-xs">
      <span className={`font-bold ${paused ? 'text-yellow-400' : 'text-[var(--game-accent)]'}`}>
        {paused ? '⏸' : '▶'}
      </span>
      <span className="text-[var(--game-fg)]">
        {paused ? 'Paused' : 'Script running'}
      </span>
      <button
        className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/40 cursor-pointer border border-yellow-600/30"
        onClick={() => processor.togglePause()}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>
      {paused && (
        <button
          className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 cursor-pointer border border-blue-600/30"
          onClick={() => processor.step()}
        >
          Step
        </button>
      )}
      <button
        className="px-1.5 py-0.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 cursor-pointer border border-red-600/30"
        onClick={() => processor.stop()}
      >
        ✕
      </button>
    </div>
  )
}
