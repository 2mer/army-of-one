# Interactive UI Controls

Status: `completed`

## Problem Statement

The player can currently only interact with the game by writing TypeScript code in the Monaco editor. There is no way to play manually — clicking the game field does nothing, tiles have no hover feedback, and auto-play runs at a fixed speed with no controls. This makes the game inaccessible to players who want a more traditional roguelike feel or who want to test individual actions before scripting them.

## Solution

Add three interactive UI features that let the player control the game without touching the code editor:

1. **Tile interactivity** — clicking a tile opens a radial ability dial in manual mode. Hovering a tile highlights it.
2. **Radial ability dial** — an 8-slot circular menu at the click position showing all player abilities. Abilities that cannot target the clicked tile are disabled with a tooltip explaining why.
3. **Speed controls** — a 1×/2×/4× toggle in the Script Indicator panel that changes the auto-play delay.

Manual actions execute through the same generator + Sentinel pipeline as scripts by wrapping the chosen Sentinel in a single-yield generator.

## User Stories

1. As a player, I want to click a tile on the game field in manual mode, so that I can choose an action without writing code.
2. As a player, I want a radial ability dial to appear at my click position, so that I can see all available abilities for that tile.
3. As a player, I want disabled abilities shown in the dial (not hidden), so that I can learn what an ability does even when I cannot use it right now.
4. As a player, I want to hover a disabled ability in the dial and see a tooltip explaining why it cannot be cast, so that I understand the game's mechanics.
5. As a player, I want to click an enabled ability in the dial to cast it immediately, so that my character acts on the chosen tile.
6. As a player, I want to dismiss the radial dial by clicking anywhere outside it or pressing Escape, so that I can cancel my action choice.
7. As a player, I want the game field in manual mode to show all 5 default abilities (MoveForward, MoveBack, Attack, Interact, Wait) in the dial's 8 slots, with 3 empty slots reserved for future assignment, so that I can act with any ability.
8. As a player, I want tiles to highlight when I hover over them in manual mode, so that I know which tile I am about to target.
9. As a player in auto mode, I want a speed toggle (1×/2×/4×) visible in the Script Indicator, so that I can control how fast the script plays.
10. As a player, I want the speed toggle to immediately apply when clicked, so that auto-play responds at the new speed on the next action.
11. As a player, I want the game to switch to manual mode when I pause a running script, so that I can take over with the radial dial.

## Implementation Decisions

### Manual action execution

A utility function wraps a single Sentinel into a one-shot generator and passes it to the existing `processor.act()`. This keeps all actions through the same requestAnimationFrame + pipeline path:

```ts
function singleAction(sentinel: Sentinel): (player: PlayerFacade) => Generator<Sentinel, void, unknown> {
  return function*() { yield sentinel }
}
```

### Canvas click architecture

The Pixi.js Application stage gets an `eventMode: 'static'` pointerdown handler that converts screen coordinates to a tile index (reverse of `tileToScreen()`). GameField exposes an `onTileClick(tileIndex: number, screenX: number, screenY: number)` callback. App.tsx wires this to open the radial dial.

The same approach handles tile hover: `pointerover`/`pointerout` events drive a highlight sprite (semi-transparent rectangle behind the tile glyph, colour `#c084fc`).

### Radial dial

- **Rendering**: React DOM overlay (absolute positioning at click coordinates), not Pixi.js. TailwindCSS for styling.
- **Layout**: Single ring, 8 equally-spaced slots (45° apart).
- **Default slot mapping**: slots 0–4 = MoveForward, MoveBack, Attack, Interact, Wait (in that order). Slots 5–7 = empty (faint placeholder circle).
- **Each slot shows**: ability name, enabled/disabled visual state, tooltip on hover.
- **Targeting-first flow**: click tile → dial opens with all abilities evaluated against that tile via `A.at(tile).canCast` → player picks a (non-disabled) ability → Sentinel is created and executed via `processor.act(singleAction(sentinel))`.
- **Cancel**: click outside the dial element, or press Escape. Both close the dial without casting.

### canCast reasons

`Action` gains a `canCastResult()` method that runs all component canCast checks without short-circuiting, collecting every failure reason into a `{ ok: boolean, reasons: string[] }` result. The existing `canCast` getter delegates to it (checking `ok`). The radial dial uses `canCastResult()` to determine disabled states and populate tooltips.

### Speed controls

- **Location**: within the ScriptIndicator component (the auto-mode badge area).
- **Values**: 1× = 200ms between actions, 2× = 100ms, 4× = 50ms.
- **Visual**: small button group — `1× | 2× | 4×`, active speed highlighted.
- **Mechanism**: clicking a speed button sets `ActionProcessor.speed` directly. Takes effect on the next action.
- **Default**: `ActionProcessor.speed` changed from 150 to 200.

### Game mode flow

- Manual mode (no generator running, mode === `'idle'`): tiles are interactive (hover highlight + click opens dial).
- Auto mode (generator running): tiles are non-interactive. ScriptIndicator shows pause/step/stop + speed controls.
- Pausing a script (togglePause + generator == null?) — actually, pausing currently keeps the generator alive. Returning to manual mode requires the generator to be fully stopped. Pause temporarily suspends the generator loop and re-enables tile interaction. On Resume, the generator continues.

Correction from current behaviour: pause should keep the generator alive (not null it) but re-enable tile interaction. Unpausing resumes the generator loop. Stopping nulls the generator and disables interaction.

### Modules

**New modules:**
- `src/ui/components/RadialDial.tsx` — React DOM radial ability selector
- `src/ui/components/InteractiveGameField.tsx` (or similar) — optional wrapper component that manages highlight state; or inline in App.tsx

**Modified modules:**
- `src/renderer/GameField.ts` — add pointer events, highlight sprite, callbacks
- `src/engine/ability/Ability.ts` — add `canCastResult()` to `Action`
- `src/engine/processor/ActionProcessor.ts` — change default speed 150→200
- `src/ui/components/ScriptIndicator.tsx` — add speed controls
- `src/App.tsx` — wire callbacks, manage dial state

## Testing Decisions

**What makes a good test**: Tests should set up a known WorldState, run a specific generator strategy (or a direct manual action), and assert that the resulting world state is correct. They test external behaviour — the world after action(s) — not internal details of component ordering or pipeline internals.

**Focus: core-loop regression tests**. These are the highest priority. Examples:

- Set up player at position 0 with no enemies → run a "Wait" generator → assert turn incremented, position unchanged.
- Set up player at position 0 adjacent to an empty tile at +1 → run "move-forward" action → assert player position is 1, turn incremented.
- Set up player adjacent to slime with enough mana → run "Attack" action → assert slime HP reduced by 10, mana reduced by 5, cooldown set.
- Set up player adjacent to slime with 0 mana → assert "Attack" cannot cast (reasons include insufficient mana).
- Set up player at win tile → run "Interact" action → assert gameResult = 'won'.
- Set up player adjacent to slime → run a full generator script that attacks then moves → assert both actions executed correctly over multiple turns.

**Test framework**: vitest (add as devDependency). Tests run in Node with no browser needed — the engine core (types, pipeline, processor) is pure TypeScript with no DOM dependency.

**Lower priority** (not in this PRD):
- React component integration tests (RadialDial rendering, ScriptIndicator speed toggle)
- Pixi.js visual tests (highlight sprite, hover rendering)

**Prior art**: No existing tests in the project. These tests establish the pattern for all future engine tests.

## Out of Scope

- Ability assignment UI (choosing which ability goes in which radial slot) — future PRD
- Manual mode tutorial / onboarding
- Ability toolbar (persistent action buttons) — the radial dial is the manual mode interface
- Monaco deep integration (intellisense, autocomplete, file tree) — future PRD
- Zoom in/out — future PRD
- Visual polish beyond tile hover: animations, screen shake, death fade, smooth movement — future PRD
- Gating faster speeds behind prestige upgrades — future PRD
- Multiple named scripts or script persistence — future PRD

## Further Notes

- The radial dial's 3 empty slots exist so the player can later assign abilities (or duplicate existing ones for separate cooldowns). The slot-to-ability mapping should be stored as a simple array config, but assignment UI is out of scope for this PRD.
- The default slot order (MoveForward, MoveBack, Attack, Interact, Wait) matches the order abilities are defined in `initialState.ts`.
- When no ability in the dial can cast (all disabled), the dial still opens — it serves an informational purpose, showing what abilities exist and why each cannot be used.
