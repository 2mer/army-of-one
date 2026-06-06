# Juice & Feedback

Status: `ready-for-agent`

Implementation broken into 7 sequential issues under `.scratch/juice-and-feedback/issues/`.

## Problem Statement

The game currently plays as a silent, motionless sequence of glyph swaps. Damage is a number that disappears into a side-panel log. Death is an entity vanishing from the canvas. Movement is a teleport. Status effects apply with zero visual cue. There is no audio at all. The game works, but it lacks tactile feedback — it feels like reading a spreadsheet, not playing a game.

Adding particle effects, floating damage numbers, movement tweens, status effect indicators, and procedural audio will transform the feel from "mechanical" to "responsive" without changing any game logic.

## Solution

A set of visual and audio feedback systems that sit in the renderer layer and subscribe to game events via a synchronous typed `EventBus` attached to `WorldState`. The engine emits events as it mutates state; the feedback layer reacts. Zero coupling between engine and presentation.

### Event bus

A lightweight typed `EventEmitter` (`bus.on(event, handler)` / `bus.emit(event, data)`) lives on `WorldState.bus`. Engine components emit events during `act()`. Handlers fire synchronously — particle systems queue visual requests for the next render frame, audio plays immediately. Tests can mock events by checking emitted payloads.

Events:
```
damage:dealt   { sourceId, targetId, damageType, amount, position, targetHp }
entity:died    { entityId, entityName, position, glyph, glyphColor }
entity:moved   { entityId, from, to }
status:applied { targetId, statusName, position, isBuff }
```

### Visual feedback

| Effect | Mechanism | Details |
|---|---|---|
| Floating damage numbers | `PIXI.Text` in `damageNumberContainer` | Rising 30px + fade over 600ms, color-coded by `DamageType`. Multiple hits on same entity offset vertically by 15px. |
| Status effect particle | Glyph color pulse + floating `PIXI.Text` label | Target glyph pulses color (debuff = sickly green, buff = gold) for 300ms. A small label with the status `name` rises and fades above the entity (reuses the damage-number rendering path). |
| Death particles | 6-8 `PIXI.Text` glyph shards | Dead entity's glyph bursts outward in random directions, fades alpha + shrinks scale over 500ms. Color matches `glyphColor`. |
| Player death | Same as enemy death but 12-15 shards | Larger burst. |
| Movement tween | Entity glyph interpolates between old/new tile position | 200ms, easeOutQuad via animejs. |
| Camera follow | Camera offset interpolates toward target | 300ms, easeOutQuad via animejs. |

### Scene graph additions

```
app.stage
  ├── highlightContainer
  ├── tileContainer
  ├── virtualHordeContainer
  ├── entityContainer
  ├── effectContainer        ← NEW: death particles, status flash labels
  └── damageNumberContainer  ← NEW: floating damage numbers (topmost)
```

### Audio feedback

Procedural sound synthesis using the Web Audio API. No audio files. A `Synth` class with methods:

| Method | Sound character |
|---|---|
| `hit()` | Short noise burst — white noise gated through a quick envelope (~80ms) |
| `death()` | Descending tone — sawtooth oscillator dropping pitch over ~300ms |
| `walk()` | Soft click — very short sine pip (~30ms) |
| `buff()` | Rising chime — two sine tones ascending (~150ms) |

The `Synth` creates `OscillatorNode` / `AudioBufferSourceNode` on each call, connects through a `GainNode` for envelope shaping, and automatically disconnects. No preloading, no pools.

### Event → feedback mapping

| Engine event | Visual response | Audio response |
|---|---|---|
| `damage:dealt` | Spawn floating `-{amount}` text at target position | `hit()` |
| `entity:died` | Spawn death particle burst at position | `death()` |
| `entity:moved` | Start position tween on entity sprite | `walk()` (player only) |
| `status:applied` | Flash target glyph + spawn label | `buff()` |

### Tween system

animejs v4 animates plain JS objects. Each tween-worthy visual stores an intermediate position object `{ x, y, alpha }`. animejs interpolates it; `onUpdate` syncs to the `PIXI.Text` sprite. This keeps animejs decoupled from Pixi.js — it only touches numbers, never display objects directly.

### Audio system architecture

A singleton `AudioContext` created on first user interaction (to satisfy browser autoplay policy). The `Synth` class owns all oscillator/noise logic. `GameField` (or a new `FeedbackLayer` orchestrator) subscribes to `world.bus` and calls `Synth` methods in EventBus handlers.

## User Stories

1. As a player, I want to see floating damage numbers appear on the target when damage is dealt, so that I immediately feel the impact of my actions.
2. As a player, I want the floating numbers to be colour-coded by damage type (red for PHYSICAL, orange for FIRE, purple for SHADOW), so that I can visually distinguish damage types at a glance.
3. As a player, I want enemies to burst into glyph shards when they die, so that death feels consequential rather than invisible.
4. As a player, I want my character to slide smoothly between tiles when moving, so that the game feels responsive and fluid.
5. As a player, I want the camera to follow my character smoothly rather than snapping, so that movement feels polished.
6. As a player, I want to see a brief flash and label when an enemy gains a status effect, so that I know when buffs/debuffs are applied.
7. As a player, I want to hear a sound when I hit an enemy, so that combat has tactile feedback.
8. As a player, I want to hear a sound when an enemy dies, so that kills feel satisfying.
9. As a player, I want to hear a footstep sound when my character moves, so that movement feels grounded.
10. As a player, I want sounds to be short and not overlap chaotically, so that the audio stays clean during fast auto-play.

## Implementation Decisions

### EventBus on WorldState

Adding `bus: EventBus` to `WorldState` is the simplest injection point — every `act()` method already has `world`. Engine components emit events alongside state mutations:

```ts
world.bus.emit('damage:dealt', { sourceId, targetId, damageType, amount, position, targetHp })
```

The bus is populated when `WorldState` is initialised (`world.bus = new EventBus()`), available to both engine components and renderer listeners. Tests create a fresh `EventBus()` and assert emission counts or payloads.

### Events vs. renderer-driven delta detection

Delta detection (comparing `update(world)` snapshots) is rejected because it's brittle, couples feedback to frame timing, and duplicates the engine's own knowledge of what changed. Events are precise, immediate, and carry exactly the right payload.

### Frame-driven animation loop

Tweens and particle lifetimes run independently on `app.ticker` (Pixi.js's rAF loop). The action processor continues at its own pace — movement tweens may still be playing when the next turn starts, but the entity's logical position is already set, so targeting and AI works correctly. The tween just interpolates the *visual* glyph position toward the already-updated logical position.

### In-place vs pooled particle objects

Simple approach: create `PIXI.Text` objects on demand, tween them, destroy on complete. For the scale of this game (at most 3 active enemies, ~8 death particles, ~3 damage numbers per turn), GC pressure is negligible. No object pooling needed.

### Web Audio API over Howler.js

Procedurally generated sounds don't fit Howler.js's file-based model. Web Audio API's oscillator + gain node approach is simpler for short synthesized blips and avoids encoding generated buffers to WAV blobs.

## Modules

**New files:**
- `src/engine/core/EventBus.ts` — typed event emitter
- `src/renderer/FeedbackLayer.ts` — subscribes to EventBus, spawns particles/damage numbers, triggers audio
- `src/renderer/ParticleSystem.ts` — manages particle lifecycle (spawn, tween, cleanup)
- `src/renderer/DamageNumberSystem.ts` — manages floating damage numbers
- `src/renderer/Synth.ts` — procedural audio (hit, death, walk, buff)
- `src/renderer/TweenManager.ts` — wraps animejs for movement/camera tweens

**Modified files:**
- `src/engine/core/types.ts` — add `bus: EventBus` to `WorldState`
- `src/engine/ability/components/Damage.ts` — emit `damage:dealt` and `entity:died`
- `src/engine/ability/components/MoveToTile.ts` — emit `entity:moved`
- `src/engine/ability/components/AppliesStatus.ts` — emit `status:applied`
- `src/engine/core/death.ts` — emit `entity:died`
- `src/engine/map/initialState.ts` — add `bus` to initial world state
- `src/renderer/GameField.ts` — add `effectContainer`, `damageNumberContainer`, init `FeedbackLayer`
- `src/App.tsx` — pass `bus` through, handle AudioContext first-interaction policy

**Dependencies added:**
- `animejs` (v4) — JS object tweening

## Testing Decisions

**Engine tests**: Test that the correct events are emitted with the correct payloads. Set up a `WorldState` with a `bus`, run an ability component's `act()`, assert `bus.on('damage:dealt', ...)` fires with expected values.

**Visual tests**: Lower priority — the feedback layer is inherently visual. Manual testing in the browser is the primary validation. If needed, vitest DOM tests can assert that `PIXI.Text` children are created/removed from containers.

**Audio tests**: Not practical in CI. The Synth class can be manually verified by ear.

## Out of Scope

- Screen shake — deferred to a future pass
- Parallax background (C5) — separate scope item
- Cast animations (flash, ring, beam) — deferred beyond the basic events listed here
- Ability miss / block feedback — requires game mechanics not yet built
- Particle pooling / optimisation — not needed at current scale
- Volume controls or audio settings UI
- Spatial audio (pan based on entity position)
- Background music
- UI sound effects (dial open, button click, script start/stop)
