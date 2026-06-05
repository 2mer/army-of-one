import { useCallback, useRef } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import type { OnMount } from '@monaco-editor/react'
import type { ActionProcessor } from '@/engine/processor/ActionProcessor'
import type { PlayerFacade, Sentinel } from '@/engine/ability/Ability'
import { ScriptIndicator } from '@/ui/components/ScriptIndicator'
import { pushLog } from '@/engine/core/types'

loader.config({ monaco })

export const DEFAULT_SCRIPT = `act(async function*(player) {
  while (true) {
    const event = await waitForInput()

    if (event.key === 'z') {
      yield player.abilities.Wait.at(player.position).cast()
    } else if (event.key === 'ArrowLeft') {
      const there = player.position - 1
      if (player.abilities.MoveBack.at(there).canCast) {
        yield player.abilities.MoveBack.at(there).cast()
      }
    } else if (event.key === 'ArrowRight') {
      const there = player.position + 1
      if (player.abilities.MoveForward.at(there).canCast) {
        yield player.abilities.MoveForward.at(there).cast()
      }
    } else if (event.key === 'f') {
      const there = player.position + 1
      if (player.abilities.Attack.at(there).canCast) {
        yield player.abilities.Attack.at(there).cast()
      }
    } else if (event.key === 'r') {
      const there = player.position + 1
      if (player.abilities.StrongAttack.at(there).canCast) {
        yield player.abilities.StrongAttack.at(there).cast()
      }
    }
  }
})
`

const DECLARATIONS = `
declare function waitForInput(): Promise<KeyboardEvent>

declare function act(factory: (player: PlayerFacade) => Generator<Sentinel, void, unknown> | AsyncGenerator<Sentinel, void, unknown>): void

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
  onCodeChange: (code: string) => void
  onRun: () => void
}

export function ScriptEditor({ processor, mode, onCodeChange, onRun }: ScriptEditorProps) {
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

	return (
		<div className="flex-1 flex flex-col min-h-0">
			<div className="flex items-center gap-2 px-3 py-1 bg-[#1a1a22] border-b border-[#333] text-xs text-[#888]">
				<span>script.strategy.ts</span>
				<span className="flex-1" />
          {processor && (
            <ScriptIndicator processor={processor} paused={processor.paused} onRun={onRun} />
          )}
			</div>
			<div className="flex-1">
        <Editor
          height="100%"
          defaultLanguage="typescript"
          theme="vs-dark"
          defaultValue={DEFAULT_SCRIPT}
          onMount={handleMount}
          onChange={(value) => value !== undefined && onCodeChange(value)}
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
