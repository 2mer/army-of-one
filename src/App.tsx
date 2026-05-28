import { useEffect, useRef, useState } from 'react'
import { GameField } from '@/renderer/GameField'
import { ActionProcessor } from '@/engine/processor/ActionProcessor'
import { createInitialState } from '@/engine/map/initialState'
import { HUD } from '@/ui/components/HUD'
import { GameLog } from '@/ui/components/GameLog'
import { ScriptIndicator } from '@/ui/components/ScriptIndicator'
import { ScriptEditor } from '@/ui/editor/ScriptEditor'
import type { ProcessorState } from '@/engine/processor/ActionProcessor'

function useGameState() {
  const [world] = useState(createInitialState)
  const [processor] = useState(() => new ActionProcessor(world))
  const [mode, setMode] = useState<'idle' | 'auto'>('idle')
  const [log] = useState<string[]>([])
  const [editorOpen, setEditorOpen] = useState(true)

  useEffect(() => {
    processor.onStateChange((s: ProcessorState) => {
      setMode(s.mode)
    })
  }, [processor])

  return { world, processor, mode, log, editorOpen, setEditorOpen }
}

function App() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { world, processor, mode, log, editorOpen, setEditorOpen } = useGameState()

  useEffect(() => {
    if (!canvasRef.current) return

    let field: GameField | null = null

    GameField.create(canvasRef.current).then(f => {
      field = f
      f.update(processor.world)
    })

    let frameId: number
    const loop = () => {
      if (field) field.update(processor.world)
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frameId)
      field?.destroy()
    }
  }, [processor])

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--game-bg)] text-[var(--game-fg)]">
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div
          ref={canvasRef}
          className={`flex-1 relative ${mode === 'auto' ? 'ring-1 ring-[var(--game-accent)]' : ''}`}
        />

        <div className="absolute top-2 left-2 right-2">
          <HUD world={world} />
        </div>

        {mode === 'auto' && (
          <div className="absolute top-2 right-2">
            <ScriptIndicator processor={processor} />
          </div>
        )}

        <GameLog entries={log} />

        {world.gameResult !== 'playing' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center">
              <div className={`text-2xl font-bold mb-2 ${world.gameResult === 'won' ? 'text-green-400' : 'text-red-400'}`}>
                {world.gameResult === 'won' ? 'YOU WIN' : 'YOU LOSE'}
              </div>
              <div className="text-[#888] text-sm">
                Turn {world.turn}
              </div>
            </div>
          </div>
        )}
      </div>

      {editorOpen && (
        <div className="h-1/2 border-t border-[#333] flex flex-col min-h-0">
          <ScriptEditor processor={processor} />
        </div>
      )}

      <button
        className="absolute bottom-2 right-2 px-3 py-1 text-xs bg-[#2a2a35] rounded border border-[#333] cursor-pointer hover:bg-[#3a3a45]"
        onClick={() => setEditorOpen(e => !e)}
      >
        {editorOpen ? 'Close Editor' : 'Open Editor'}
      </button>
    </div>
  )
}

export default App
