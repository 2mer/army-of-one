import { useCallback, useRef } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { OnMount } from '@monaco-editor/react'
import type { ActionProcessor } from '@/engine/processor/ActionProcessor'
import type { PlayerFacade, Sentinel } from '@/engine/ability/Ability'
import { pushLog } from '@/engine/core/types'

loader.config({ monaco })

const DEFAULT_SCRIPT = `act(function*(player) {
  while (true) {
    const there = player.position + 1

    if (player.inspect(there).occupant && player.abilities.Attack.at(there).canCast) {
      yield player.abilities.Attack.at(there).cast()
    } else if (player.abilities.MoveForward.at(there).canCast) {
      yield player.abilities.MoveForward.at(there).cast()
    } else {
      yield player.abilities.Wait.at(player.position).cast()
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
  viewRange: number
  inspect(tileIndex: number): InspectResult
}

interface InspectResult {
  occupant: { name: string; glyph: string } | null
  poi: { type: string } | null
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
  mode: 'idle' | 'auto'
}

export function ScriptEditor({ processor, mode }: ScriptEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)

  const handleMount: OnMount = useCallback((editor, monacoNs) => {
    editorRef.current = editor

    monacoNs.languages.typescript.typescriptDefaults.addExtraLib(
      DECLARATIONS,
      'globals.d.ts'
    )

    monacoNs.editor.setTheme('vs-dark')
    editor.focus()
  }, [])

  const handleRun = useCallback(() => {
    const code = editorRef.current?.getValue()
    if (!code || !processor) return

    if (processor.mode === 'auto') {
      processor.stop()
    }

    try {
      const factory = new Function('act', code)
      factory((fn: (player: PlayerFacade) => Generator<Sentinel, void, unknown>) => {
        processor.act(fn)
      })
    } catch (e) {
      pushLog(processor.world, `Script compile error: ${e instanceof Error ? e.message : e}`, 'error')
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
          {mode === 'auto' ? '↻ Re-run' : '▶ Run'}
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
