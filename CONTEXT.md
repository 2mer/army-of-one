# Army of One — Glossary

## Ability

A discrete action a character can perform. Built from composable components that declare its targeting, costs, cooldown, and effects.

The script-facing API uses a fluent chain: `player.abilities.<name>.at(tileIndex).canCast` and `player.abilities.<name>.at(tileIndex).cast()`. The `.at()` call produces an `Action` object that captures the target once; `canCast` is a synchronous read-only check, and `cast()` returns a `Sentinel`.

## ResourceCost

A component on an Ability that describes what it costs to cast. Generic across resource types (`mana`, `hp`, and later formula-based). E.g. `{ type: 'mana', amount: 5 }`.

## TargetTile

A component that declares an ability targets a tile at a relative offset (e.g. `+1` for forward, `-1` for back). Accepts an optional `canTarget(world, tile): boolean` predicate that gates whether the resolved tile is a valid target. For example, movement abilities pass `canTarget: (w, t) => !t.occupant`; interact abilities pass `canTarget: (w, t) => t.components.some(c => c.type === 'Interactable')`.

## TargetNearestEnemy

A component that declares an ability targets the nearest enemy within a given tile range.

## Damage

A component that declares an ability deals damage of a given type and amount. Applies the contest-of-strength formula: `finalDamage = max(0, round(baseAmount * (1 + caster_bonus - target_resistance)))`.

## DamageType

Enum: `PHYSICAL` (red ◧), `FIRE` (orange ▲), `SHADOW` (purple ◬). Each entry in `DAMAGE_TYPE_META` carries a `glyph` and `color` used in game log display.

## EntityAttributes

A per-entity record of typed bonuses and resistances. Keys are dynamically derived from `DamageType`: `${type}_resistance` and `${type}_bonus`. Both are floats.

- Resistance: 0 = no reduction, 1 = full immunity. Negative values increase damage taken (e.g. -1 = +100% damage taken). Cannot exceed 1.
- Bonus: 0 = base damage, 1 = +100% damage. Cannot go below -1 (floor at 0 damage from that instance).

Default attributes are all zeros. Equipment and status effects can modify them later.

## AppliesStatus

An ability component that applies a status effect to each target entity in `ActContext.targets`. Takes a factory `(target: Entity) => StatusEffect` so each target receives a fresh instance (future-proof for per-target variance). Applied during the `act` phase.

## StatusEffect

An effect applied to an entity that persists for a number of turns. Interface:

- `id: string` — unique per instance
- `name: string` — display name
- `remainingTurns: number` — ticks left (0 = expired)
- `onAdded(world, target)` — called when the effect is first applied
- `tick(world, target)` — called at the end of the affected entity's turn
- `onRemoved(world, target)` — called when the effect expires or is cleansed
- `onConflict?(incoming: StatusEffect, target: Entity, world: WorldState): void` — optional conflict resolver. Called when another effect with the same `name` would be applied. The callback owns splice/replace/refresh logic. When absent, both effects coexist (stack).

Conflicts are detected by matching `name` on the target's `statusEffects` array. The system calls `onConflict` on the **existing** effect, passing the incoming effect, and then skips pushing the incoming (the callback decides what happens).

## BuffStatusEffect

A concrete status effect. Constructor takes `{ name, turns, stats }` where `stats` is a `Partial<EntityAttributes>`. Applies stat modifiers additively in `onAdded` and reverts them in `onRemoved`.

## Turn order — status tick timing

Status effects tick at the **end** of the affected entity's turn, before handing focus to the next entity:

1. Player action executes
2. Player status effects tick (post-action)
3. Enemy 1 AI executes
4. Enemy 1 status effects tick
5. Enemy 2 AI executes
6. Enemy 2 status effects tick
7. Horde tick processes distance and spawning
8. Next turn begins

This is a change from the current batch-AI-then-horde flow.

## Cooldown

A component that declares an ability cannot be re-used for N turns after activation.

## Component

A self-contained slice of ability behaviour. Each component can participate in `canCast` evaluation and/or `act` mutation. Abilities are composed by adding the relevant components.

## WorldState

The root game state object. Contains:
- `entities: Map<EntityId, Entity>` — all characters (player and enemies), keyed by ID
- `playerId: EntityId` — references the player within `entities`
- `tiles: Map<number, Tile>` — sparse; only materialised tiles
- `turn: number` — global turn counter
- `gameResult: 'playing' | 'won' | 'lost'`
- `horde: HordeState` — horde advancement state
- `_nextEntityId: number` — auto-incrementing counter for entity IDs
- `_nextLogId: number` — auto-incrementing counter for log entry IDs

## Entity

A character in the game. Player and enemies share the same `Entity` type.

Fields: `id: EntityId`, `name: string`, `glyph: string` (rendering character), `hp: number`, `maxHp: number`, `mana: number`, `maxMana: number`, `position: number` (map index), `viewRange: number` (tiles observable in each direction), `abilities: AbilityInstance[]`, `statusEffects: StatusEffect[]`, `equipment: EquipmentSlots`, `attributes: EntityAttributes`.

Default player stats: HP 100, Mana 50, viewRange 5, glyph `@`, start position 5. Default slime stats: HP 30, Mana 0, viewRange 0, glyph `⯊`.

## HordeState

Tracks the virtual horde queue. Fields:
- `pointer: number` — current index in the horde queue
- `distance: number` — tiles until the next unprocessed horde entry reaches the player
- `activeEnemies: EntityId[]` — entity IDs of enemies currently on the field
- `lastPlayerPosition: number` — player position at end of last turn
- `delay: number` — accumulated delay from turns where the farthest enemy did not advance. Consumed by the spawner (skips blanks) and the renderer (compresses gaps visually)
- `lastFarthestEnemyPos: number` — position of the farthest enemy on the previous tick, used to detect when enemies are stuck

## Horde queue

100 indexed entries define the enemy sequence. Each entry is either a monster (with name, glyph, stats, damage type/amount) or a blank (single-tile gap). Beyond index 99, returns a Shadow Slime (999 HP, 999999 shadow damage) as a soft cap.

Built procedurally in `src/engine/horde/queue.ts` with alternating clusters of green/red/blue slimes separated by blank gaps.

## processHordeTick

Called after each player action (after enemy AI). Each tick:
1. Cleans dead enemies from `activeEnemies`
2. If enemies exist: compares farthest enemy position against `lastFarthestEnemyPos`. If unchanged (enemies stuck), increments `delay`.
   - `lastFarthestEnemyPos` is NOT updated here — it's updated after spawning to capture the post-spawn farthest position.
3. Decrements distance: base -1, extra -1 if player moved right, +1 if player moved left (cancels advance)
4. If `activeEnemies.length < 3` and `distance <= player.viewRange`:
   - **Active enemies exist**: walks queue entries to find next monster. Blank entries either advance spawn position (normal) or are consumed by `delay` (skipped without advancing spawn position). Once a monster is found, spawns it at the accumulated position.
   - **No active enemies**: first consumes any `delay` by skipping blanks immediately (or spawning a monster if one is reached). Then processes one queue entry: blank adds 1 to distance, monster spawns at player view range edge.
5. `lastFarthestEnemyPos` is updated at each return point: either recomputed from active enemies (cap reached) or set to the new spawn position (after spawning).

## Distance formula

distance adjusts each turn based on player movement:
- Player stays: `distance -= 1` (enemy advances)
- Player moves right: `distance -= 2` (player closes gap from other side)
- Player moves left: `distance -= 0` (enemy advance cancels with player retreat)

Clamped to >= 0. When distance reaches 0, the next monster spawns at the edge of the player's viewRange.

## Tile

A position on the map. Fields: `index: number`, `occupant: EntityId | null`, `components: TileComponent[]`. The renderer draws the tile's Renderable component first, then overlays the occupant entity's glyph on top.

Tiles are materialised on-demand by MoveToTile. Initial render window is tiles 0-10.

## POI (Point of Interest)

A blueprint for what exists at a world index. Types: `'blank'`, `'king'`, `'win'`. The king tile at index 0 is a narrative element. The win tile at index 1000 is unreachable in MVP. Everything else is blank. Enemies come from the horde system, not from POIs.

## EntityId

A numeric identifier for entities. `type EntityId = number`. Wrapped in a type alias so the underlying type can be changed without refactoring the API surface.

## AbilityInstance

A concrete ability attached to an entity. Fields: `id: string` (unique per instance), `name: string`, `components: Component[]`, `currentCooldown: number` (0 = ready). Each entity owns its own instances so cooldowns are per-entity.

## Death

When an entity's HP reaches 0, death is deferred until after all status effect cleanup. The entity remains in `world.entities` and on its tile until the death sweep runs.

Death sweep order:
1. Status effects tick (damage may drop HP ≤ 0)
2. Expired effects call `onRemoved` (entity still alive in map, HP may mutate)
3. If HP ≤ 0 after step 2, all remaining active effects call `onRemoved`
4. If HP ≤ 0 after step 3, entity is removed from its tile and `world.entities`
5. Horde tick's `activeEnemies` filter double-sweeps stale IDs (harmless)

This deferred model allows effects to react to death (e.g., resurrect, explosion) during their `onRemoved` hook.

## TileComponent

A self-contained behaviour attached to a Tile. Follows the same composition philosophy as ability components, though the interface is tile-specific. Examples: `Interactable` (defines what happens when the player uses the Interact ability on this tile), `Renderable` (defines the tile's glyph and colors for the renderer).

## Interactable (tile component)

Fired when the player's Interact ability targets this tile. Carries `onInteract(world, actor): void` callback that mutates world state.

## Renderable (tile component)

Provides visual rendering data: `glyph: string`, `fgColor: string`, `bgColor?: string`, `layer?: number`. Used by the renderer to draw tiles.

## Interact

A player ability that targets an adjacent tile and triggers whatever the tile defines as its interaction. Used to activate win tiles, shops, events, etc. Consumes a turn.

## Wait

A player ability with zero components. Always succeeds, consumes a turn, does nothing. Used as the fallback action in scripts when neither attacking nor moving is possible.

## Map index — first slice

| Index | Content | Glyph |
|-------|---------|-------|
| 0 | King (narrative) | `♛` |
| 1-4 | Empty floor | `.` |
| 5 | Player start | `@` |
| 6-10 | Empty floor (first enemies spawn at 10-12) | `.` |
| 1000 | Win tile (unreachable MVP) | `>` |

## Turn order

Entities act in ascending order of their map index — leftmost (closest to origin/index 0) acts first.

## Script

User-written TypeScript code that controls the player's actions. Runs as a generator function. Each action returns a Sentinel object that must be `yield`ed to the engine. The engine consumes each yield as one atomic game tick (apply action, render, check pause).

Scripts adopt an **observation-driven** pattern: query the world with `player.inspect()` to decide intent, then validate with `.canCast` and execute with `.cast()`.

```ts
function* script(player) {
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
}
```

## Inspect
A method on `PlayerFacade` that returns an `InspectResult` for any tile within the player's `viewRange`. Throws `"tile is not visible from here"` if the tile is out of range or not yet materialised. Used as the primary world-observation API — scripts inspect the world to decide intent, then use `.canCast` to validate against ability-specific constraints.

```ts
type InspectResult = {
  occupant: { name: string; glyph: string } | null
  poi: { type: string } | null
}
```

## Sentinel

A token object returned by action methods like `cast()`. If not yielded, the action never reaches the engine. This prevents scripts from accidentally freezing the browser or skipping renders.

## Slime

Basic enemy type. Spawned by the horde system. Shares the same entity/ability/pipeline model as the player. Simple AI: if an adjacent tile in the player's direction is occupied by an entity (friendly or player), use its attack ability; else use its move ability.

Three slime variants in the first 100 horde entries:
- **Green Slime**: 30 HP, physical damage 5
- **Red Slime**: 40 HP, physical damage 8
- **Blue Slime**: 25 HP, fire damage 6

Beyond index 99: **Shadow Slime** (999 HP, 999999 shadow damage) acting as a soft cap.

## Turn order

1. Player action executes (scripts drive one sentinel per turn)
2. Enemy AI processes each living non-player entity (moves toward player, attacks if adjacent)
3. Horde tick processes distance and spawning

## ActContext

The shared object passed through the ability pipeline phases. Contains at minimum `{ caster, targets: number[] }`. Targeting components populate `targets` with tile indices during the `gather` phase. Effect components (Damage, etc.) read `targets` to determine which entities to apply effects to.

## Ability pipeline

Three phases executed in order:

1. **`gather`** — components collect information and populate `ActContext` (e.g. resolve nearest enemy tile, resolve target tile offset).
2. **`canCast`** — components check preconditions against world state and `ActContext` (e.g. resources available, cooldown ready, target valid). Any component can reject the cast.
3. **`act`** — components mutate `WorldState` (e.g. apply damage, move caster, deduct resources, set cooldown).

## Action processor

The engine's central loop that drives turns. Uses `requestAnimationFrame` loop with a 200ms delay between actions (configurable in the future via speed controls). Flow:

1. Player has active generator → step it → yields a Sentinel
2. Dispatch sentinel to ability pipeline (gather → canCast → act) → action result includes `{ consumeTurn: boolean }`
3. If `consumeTurn: false` → immediately step generator again (same player turn)
4. If `consumeTurn: true` → for each living enemy, compute and dispatch one AI action → call `processHordeTick` with player movement delta → begin a new turn → step generator again
5. When generator has no next value → go idle

Only one generator can be active at a time. Calling `act()` while a generator is active throws.

## act()

The player-facing function to submit a generator (or a sentinel, wrapped as a size-1 generator) to the action processor. Returns a Promise resolved when the generator completes.

## Game Log

A scrollable list of `LogEntry` objects recording game events: ability casts, damage dealt, deaths, and player-suffered damage. Displayed in the sidebar above the Script Editor. Each entry has a stable `id` for React key persistence. Capped at 100 entries (oldest shifted first).

## LogEntry

`{ id: number, message: string }` — a single entry in the Game Log. The `id` auto-increments globally per session and is never reused, ensuring stable React keys even as old entries are evicted.

## Sidebar

The right-hand panel (`w-80`) containing the Game Log and the togglable Script Editor. Always visible — the log stays on-screen even when the editor is open.

## Game mode

Two mutually exclusive modes:
- **Manual** — no active generator. Tiles are interactive. Clicking a tile opens the radial ability dial.
- **Auto** — an active generator is running. Tiles are non-interactive. HUD shows a script indicator with a pause button. Screen has a subtle visual border to indicate automation.

Pausing stops the generator before the next `generator.next()` call, returning to manual mode.
