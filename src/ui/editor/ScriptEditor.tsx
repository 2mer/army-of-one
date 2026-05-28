import { useCallback, useRef } from 'react'
import Editor from '@monaco-editor/react'
import type { OnMount } from '@monaco-editor/react'
import type { ActionProcessor } from '@/engine/processor/ActionProcessor'
import type { PlayerFacade } from '@/engine/ability/Ability'
import type { Sentinel } from '@/engine/ability/Ability'

const DEFAULT_SCRIPT = `act(function*(player) {
  while (true) {
    const targetTile = player.position + 1

    if (player.abilities.Attack.at(targetTile).canCast) {
      yield player.abilities.Attack.at(targetTile).cast()
    } else if (player.abilities.MoveForward.at(targetTile).canCast) {
      yield player.abilities.MoveForward.at(targetTile).cast()
    } else {
      yield player.abilities.MoveBack.at(player.position - 1).cast()
    }
  }
})
`

const DECLARATIONS = `
declare function act(factory: (player: PlayerFacade) => Generator<Sentinel, void, unknown>): void

interface PlayerFacade {
  abilities: Record<string, AbilityFacade>
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  position: number
}

interface AbilityFacade {
  at(tile: number): Action
}

interface Action {
  canCast: boolean
  cast(): Sentinel
}

interface Sentinel {
  abilityId: string
  casterId: number
  target: number
}
`

interface ScriptEditorProps {
  processor: ActionProcessor | null
}

export function ScriptEditor({ processor }: ScriptEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      DECLARATIONS,
      'globals.d.ts'
    )

    monaco.editor.setTheme('vs-dark')
  }, [])

  const handleRun = useCallback(() => {
    const code = editorRef.current?.getValue()
    if (!code || !processor) return

    try {
      const factory = new Function('act', code)
      factory((fn: (player: PlayerFacade) => Generator<Sentinel, void, unknown>) => {
        processor.act(fn)
      })
    } catch (e) {
      console.error('Script error:', e)
    }
  }, [processor])

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a22] border-b border-[#333] text-xs text-[#888]">
        <span>script.strategy.ts</span>
        <span className="flex-1" />
        <button
          className="px-2 py-0.5 bg-[var(--game-accent)] text-black rounded text-xs cursor-pointer hover:opacity-80"
          onClick={handleRun}
        >
          ▶ Run
        </button>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          defaultValue={DEFAULT_SCRIPT}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: 'ui-monospace, Consolas, monospace',
            padding: { top: 8 },
          }}
        />
      </div>
    </div>
  )
}
