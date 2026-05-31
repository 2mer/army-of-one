import { useCallback, useEffect, useRef, useState } from 'react'
import { GameField } from '@/renderer/GameField'
import { ActionProcessor } from '@/engine/processor/ActionProcessor'
import { createInitialState } from '@/engine/map/initialState'
import { HUD } from '@/ui/components/HUD'
import { GameLog } from '@/ui/components/GameLog'
import { ScriptIndicator } from '@/ui/components/ScriptIndicator'
import { ScriptEditor } from '@/ui/editor/ScriptEditor'
import { RadialDial } from '@/ui/components/RadialDial'
import type { DialAbility } from '@/ui/components/RadialDial'
import { singleAction, PlayerFacade, Sentinel } from '@/engine/ability/Ability'
import { getPOI } from '@/engine/map/initialState'
import type { ProcessorState } from '@/engine/processor/ActionProcessor'

interface DialState {
  x: number
  y: number
  tileIndex: number
  abilities: DialAbility[]
}

interface HoverState {
  tileIndex: number
  screenX: number
  screenY: number
}

function useGameState() {
  const [world] = useState(createInitialState)
  const [processor] = useState(() => new ActionProcessor(world))
  const [mode, setMode] = useState<'idle' | 'auto'>('idle')
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const [editorMainView, setEditorMainView] = useState(false)
  const [dial, setDial] = useState<DialState | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  useEffect(() => {
    processor.onStateChange((s: ProcessorState) => {
      setMode(s.mode)
      setPaused(s.paused)
      setTick(s.tick)
    })
  }, [processor])

  return { world, processor, mode, paused, tick, editorMainView, setEditorMainView, dial, setDial, hover, setHover }
}

function App() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const fieldRef = useRef<GameField | null>(null)
  const { world, processor, mode, paused, tick, editorMainView, setEditorMainView, dial, setDial, hover, setHover } = useGameState()

  const isInteractive = mode === 'idle' || (mode === 'auto' && paused)

  const handleTileClickRef = useRef<((tileIndex: number, screenX: number, screenY: number) => void) | null>(null)

  const buildDialAbilities = useCallback((tileIndex: number): DialAbility[] => {
    const player = world.entities.get(world.playerId)
    if (!player) return []
    const abilityOrder = ['MoveForward', 'MoveBack', 'Attack', 'Interact', 'Wait']
    const slots: DialAbility[] = []
    for (let i = 0; i < abilityOrder.length; i++) {
      const name = abilityOrder[i]
      const ability = player.abilities.find(a => a.name === name)
      if (!ability) {
        slots.push({ id: `empty-${i}`, name, enabled: false, reasons: ['ability not found'] })
        continue
      }
      const facade = new PlayerFacade(world)
      const action = facade.abilities[name].at(tileIndex)
      const result = action.canCastResult()
      slots.push({ id: ability.id, name, enabled: result.ok, reasons: result.reasons })
    }
    return slots
  }, [world])

  const handleTileClick = useCallback((tileIndex: number, screenX: number, screenY: number) => {
    if (mode === 'auto' && !paused) return
    setDial({ x: screenX, y: screenY, tileIndex, abilities: buildDialAbilities(tileIndex) })
  }, [mode, paused, buildDialAbilities, setDial])

  useEffect(() => { handleTileClickRef.current = handleTileClick }, [handleTileClick])

  const handleDialSelect = useCallback((abilityId: string) => {
    const d = dial
    if (!d) return
    setDial(null)
    const sentinel = new Sentinel(abilityId, world.playerId, d.tileIndex)
    processor.act(singleAction(sentinel))
  }, [dial, world.playerId, processor, setDial])

  const handleDialDismiss = useCallback(() => {
    setDial(null)
  }, [setDial])

  const handleTileHover = useCallback((tileIndex: number | null, sx?: number, sy?: number) => {
    if (tileIndex === null || sx === undefined || sy === undefined) {
      setHover(null)
      return
    }
    setHover({ tileIndex, screenX: sx, screenY: sy })
  }, [setHover])

  useEffect(() => {
    if (!canvasRef.current) return

    let disposed = false
    let field: GameField | null = null

    GameField.create(canvasRef.current).then(f => {
      if (disposed) { f.destroy(); return }
      field = f
      fieldRef.current = f
      f.setInteractive(true)
      f.onTileClick((t, sx, sy) => handleTileClickRef.current?.(t, sx, sy))
      f.onTileHover(handleTileHover)
      f.update(processor.world)
    })

    let frameId: number
    const loop = () => {
      if (field) field.update(processor.world)
      frameId = requestAnimationFrame(loop)
    }
    frameId = requestAnimationFrame(loop)

    return () => {
      disposed = true
      cancelAnimationFrame(frameId)
      field?.destroy()
      fieldRef.current = null
    }
  }, [processor, editorMainView])

  useEffect(() => {
    const f = fieldRef.current
    if (!f) return
    f.setInteractive(isInteractive)
    if (isInteractive) {
      f.onTileClick((t, sx, sy) => handleTileClickRef.current?.(t, sx, sy))
      f.onTileHover(handleTileHover)
    } else {
      f.onTileClick(null)
      f.onTileHover(null)
    }
  }, [isInteractive, handleTileHover])

  const statusBar = (
    <div className="flex items-center gap-2 px-3 py-1 border-b border-[#333] text-xs shrink-0">
      <span className="text-[#555]">{mode === 'auto' ? (paused ? 'Script paused' : `Script running [${tick}]`) : 'No script running'}</span>
      <span className="flex-1" />
      <button
        className="px-2 py-1 bg-[#2a2a35] rounded border border-[#333] cursor-pointer hover:bg-[#3a3a45]"
        onClick={() => setEditorMainView(e => !e)}
      >
        {editorMainView ? 'Show Field' : 'Edit Script'}
      </button>
    </div>
  )

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--game-bg)] text-[var(--game-fg)]">
      <div className="flex-1 flex flex-row min-h-0">
        {editorMainView ? (
          <>
            <div className="flex-1 flex flex-col min-h-0">
              <ScriptEditor processor={processor} mode={mode} />
            </div>
            <div className="w-80 border-l border-[#333] flex flex-col bg-[#1a1a22] min-h-0">
              {statusBar}
              <GameLog entries={world.log} />
              <div
                ref={canvasRef}
                className="h-48 border-t border-[#333] relative shrink-0"
              />
              {hover && (() => {
                const tile = world.tiles.get(hover.tileIndex)
                const poi = getPOI(hover.tileIndex)
                const poiLabel = poi.type === 'spawn' ? 'Spawn' : poi.type === 'win' ? 'Exit' : 'Blank'
                const occupant = tile?.occupant != null ? world.entities.get(tile.occupant) : null
                return (
                  <div
                    className="fixed z-30 pointer-events-none text-xs"
                    style={{ left: hover.screenX + 12, top: hover.screenY - 12 }}
                  >
                    <div className="bg-[#1a1a22] border border-[#444] rounded px-2 py-1 shadow-lg leading-relaxed">
                      <div className="text-[#888]">Tile {hover.tileIndex}</div>
                      {poiLabel !== 'Blank' && <div className="text-[#666]">{poiLabel}</div>}
                      {occupant && (
                        <div className="text-[#c0c0c0]">{occupant.glyph} {occupant.name} ({occupant.hp}/{occupant.maxHp})</div>
                      )}
                    </div>
                  </div>
                )
              })()}
              {dial && (
                <RadialDial
                  x={dial.x}
                  y={dial.y}
                  abilities={dial.abilities}
                  onSelect={handleDialSelect}
                  onDismiss={handleDialDismiss}
                />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1 flex flex-col min-h-0 relative">
              <div
                ref={canvasRef}
                className={`flex-1 relative ${mode === 'auto' ? 'ring-1 ring-[var(--game-accent)]' : ''}`}
              />

              <div className="absolute top-2 left-2 right-2 z-10">
                <HUD world={world} />
              </div>

              {mode === 'auto' && (
                <div className="absolute top-2 right-2 z-10">
                  <ScriptIndicator processor={processor} paused={paused} />
                </div>
              )}

              {hover && (() => {
                const tile = world.tiles.get(hover.tileIndex)
                const poi = getPOI(hover.tileIndex)
                const poiLabel = poi.type === 'spawn' ? 'Spawn' : poi.type === 'win' ? 'Exit' : 'Blank'
                const occupant = tile?.occupant != null ? world.entities.get(tile.occupant) : null
                return (
                  <div
                    className="fixed z-30 pointer-events-none text-xs"
                    style={{ left: hover.screenX + 12, top: hover.screenY - 12 }}
                  >
                    <div className="bg-[#1a1a22] border border-[#444] rounded px-2 py-1 shadow-lg leading-relaxed">
                      <div className="text-[#888]">Tile {hover.tileIndex}</div>
                      {poiLabel !== 'Blank' && <div className="text-[#666]">{poiLabel}</div>}
                      {occupant && (
                        <div className="text-[#c0c0c0]">{occupant.glyph} {occupant.name} ({occupant.hp}/{occupant.maxHp})</div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {dial && (
                <RadialDial
                  x={dial.x}
                  y={dial.y}
                  abilities={dial.abilities}
                  onSelect={handleDialSelect}
                  onDismiss={handleDialDismiss}
                />
              )}

              {world.gameResult !== 'playing' && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
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

            <div className="w-80 border-l border-[#333] flex flex-col bg-[#1a1a22] min-h-0">
              {statusBar}
              <GameLog entries={world.log} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default App
