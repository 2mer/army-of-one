# Horde System

Status: `completed`

## Problem Statement

The game had three static slimes at fixed positions (indices 6-8) on an 11-tile map. There was no sense of progression, no pressure, and no replayability. Once the three slimes were killed, the game was over (reach the win tile at index 10).

## Solution

Replace static enemy placement with a virtual horde queue. Enemies spawn procedurally from a defined queue, approach the player over several turns, and spawn one at a time at the edge of the player's vision. A distance counter creates natural pacing — blanks between clusters give breathing room, while player movement affects how fast the horde closes in.

## User Stories

1. As a player, I want enemies to approach me from a distance, so that the combat feels dynamic rather than walking into stationary targets.
2. As a player, I want to face only a few enemies at a time (max 3), so that combat is manageable and tactical.
3. As a player, I want breaks between combat clusters, so that I can recover and prepare for the next wave.
4. As a player, I want the game to feel like it can go on indefinitely, with increasing difficulty.
5. As a developer, I want enemies to be defined by a deterministic queue, so that the horde is predictable and testable.
6. As a developer, I want the distance mechanic to respond to player movement (moving forward speeds the horde, retreating cancels its advance), so that positioning is meaningful.
7. As a developer, I want the existing enemy AI (moving toward player, attacking when adjacent) to work without changes, so that the horde system integrates cleanly.

## Implementation Decisions

### Architecture

Three files under `src/engine/horde/`:
- **types.ts** — `MonsterSpec`, `HordeEntry` types
- **queue.ts** — 100-entry horde queue builder + shadow slime fallback
- **system.ts** — `processHordeTick()`, `spawnHordeMonster()`

Core types (`HordeState`) live in `src/engine/core/types.ts` alongside `WorldState` to avoid circular imports.

### Horde State

```typescript
interface HordeState {
  pointer: number          // current index in queue
  distance: number         // tiles until next entry reaches player
  activeEnemies: number[]  // entity IDs of on-field enemies
  lastPlayerPosition: number
}
```

### Horde Queue

100 entries built procedurally with alternating clusters of 3 monster variants:
- Green Slime: 30 HP, physical damage 5 (most common)
- Red Slime: 40 HP, physical damage 8 (tougher)
- Blue Slime: 25 HP, fire damage 6 (elemental)

Blank entries (adding N tiles of distance) separate clusters. Beyond index 99, the Shadow Slime (999 HP, 999999 shadow damage) serves as a soft cap.

### Distance formula

Each turn, distance adjusts based on player movement:
- `distance -= 1` (base: enemy advances)
- `distance -= 1` (extra if player moved right)
- `distance += 1` (if player moved left, cancels base advance)
- Clamped to ≥ 0

### Spawning

Called after each player action (after enemy AI). Per tick:
1. Clean dead enemies from `activeEnemies`
2. Adjust distance
3. If `activeEnemies.length < 3` and `distance <= player.viewRange` (default 5):
   - Process one entry from queue
   - Monster: spawn at `playerPos + viewRange + activeCount`
   - Blank: add tiles to distance

### Map changes

- Player spawns at position 5 (was 0)
- King POI at index 0 (narrative only, glyph ♛)
- Win POI at index 1000 (unreachable for MVP)
- Static slimes removed; enemies come only from horde

### Existing AI unchanged

`processEnemyAI` in `enemyAI.ts` already moves enemies toward the player using the MoveBack ability (since player is at lower index). Horde enemies use the same ability set (Attack, MoveForward, MoveBack) with parameterized damage type/amount.

## Testing Decisions

- **Unit tests via smoke test**: 30 assertions covering spawning, capping, approach, movement deltas, blank gaps, POI layout, and ability validation.
- **Test pattern**: `processHordeTick` is tested directly (unit-testable module). Full integration (ActionProcessor → AI → HordeTick) tested through sequenced calls.
- **No vitest**: Environment runs Node 18 but vitest requires 21+. Tests verified via `tsx` runner with identical assertion patterns.

## Out of Scope

- Enemy variety beyond the three slime types (deferred to B3)
- Boss behaviors and scripted attack patterns (B3)
- Visual indicators of horde distance (future UI)
- 100+ tile cluster variety (only first 100 entries defined)
- Horde advancement toward king index 0 (narrative integration deferred)
- Procedural beyond first 100 entries (uses Shadow Slime fallback)
- Win condition via reaching index 1000 (unreachable by design)

## Further Notes

- The distance mechanic serves as the core pacing tool. By adjusting blank tile counts or monster cluster sizes in `queue.ts`, difficulty can be tuned without engine changes.
- The Shadow Slime fallback means the game is effectively endless — a player who survives long enough will face infinite 999-HP enemies that one-shot them.
