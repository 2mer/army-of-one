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

A component that declares an ability deals damage of a given type and formula.

## Cooldown

A component that declares an ability cannot be re-used for N turns after activation.

## Component

A self-contained slice of ability behaviour. Each component can participate in `canCast` evaluation and/or `act` mutation. Abilities are composed by adding the relevant components.

## WorldState

The root game state object. Contains:
- `entities: Map<EntityId, Entity>` — all characters (player and enemies), keyed by ID
- `playerId: EntityId` — references the player within `entities`
- `tiles: Map<number, Tile>` — sparse; only materialised tiles
- `turn: number` — global turn counter, starts at 1
- `gameResult: 'playing' | 'won' | 'lost'`

## Entity

A character in the game. Player and enemies share the same `Entity` type.

Fields: `id: EntityId`, `name: string`, `glyph: string` (rendering character), `hp: number`, `maxHp: number`, `mana: number`, `maxMana: number`, `position: number` (map index), `viewRange: number` (tiles observable in each direction), `abilities: AbilityInstance[]`, `statusEffects: StatusEffect[]`, `equipment: EquipmentSlots`.

Default player stats: HP 100, Mana 50, viewRange 5, glyph `@`. Default slime stats: HP 30, Mana 0, viewRange 0, glyph `s`.

## Tile

A position on the map. Fields: `index: number`, `occupant: EntityId | null`, `components: TileComponent[]`. The renderer draws the tile's Renderable component first, then overlays the occupant entity's glyph on top. Occupied tiles may have reduced opacity.

Tiles are materialised lazily like Minecraft chunks — only created when they come into view. Once materialised they persist in `world.tiles`.

## POI (Point of Interest)

A blueprint for what exists at a world index. Returned by `getPoiAtWorldIndex(index: number)`. Static POIs (bosses, shops, win tiles) are looked up from a `Map<number, POI>`; otherwise a procedural rule generates the POI (e.g. "indices 1-5 are blanks, 6-8 have slimes").

Example POI types: `'blank'`, `'spawn'`, `'slime'`, `'win'`, `'shop'`, `'boss'`, `'gate'`.

Materialising a POI creates a Tile (and optionally an Entity for enemy POIs) and adds them to WorldState.

## Horde generation

Two lookup functions:
- `getPoiAtWorldIndex(i: number): POI` — returns the POI at a map index, with static entries taking priority over procedural fallback.
- `getEnemyAtHordeIndex(i: number): EnemyBlueprint` — returns an enemy definition for enemy POIs.

Procedural rules for the first slice: indices 1-5 → blank, 6-8 → slime, 9 → blank, 10 → win. Everything else → blank.

## EntityId

A numeric identifier for entities. `type EntityId = number`. Wrapped in a type alias so the underlying type can be changed without refactoring the API surface.

## AbilityInstance

A concrete ability attached to an entity. Fields: `id: string` (unique per instance), `name: string`, `components: Component[]`, `currentCooldown: number` (0 = ready). Each entity owns its own instances so cooldowns are per-entity.

## Death

When an entity's HP reaches 0, it is removed from WorldState immediately. The tile it occupied becomes unoccupied. Optionally, a loot drop may be spawned on the tile (non-blocking, so the tile is immediately traversable).

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
| 0 | Player spawn | `@` |
| 1-5 | Empty floor | `.` |
| 6 | Slime | `s` |
| 7 | Slime | `s` |
| 8 | Slime | `s` |
| 9 | Empty floor | `.` |
| 10 | Win tile | `>` |

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

Basic enemy type. Shares the same entity/ability/pipeline model as the player. Simple AI: if an adjacent tile in the player's direction is occupied by an entity (friendly or player), use its attack ability; else use its move ability. If neither is possible, skip turn.

## Horde turn processing

All entities (player and enemies) act in map-index order (ascending). Each entity executes its script/AI for exactly one action per turn. The turn ends when all living entities have acted.

## ActContext

The shared object passed through the ability pipeline phases. Contains at minimum `{ caster, targets: number[] }`. Targeting components populate `targets` with tile indices during the `gather` phase. Effect components (Damage, etc.) read `targets` to determine which entities to apply effects to.

## Ability pipeline

Three phases executed in order:

1. **`gather`** — components collect information and populate `ActContext` (e.g. resolve nearest enemy tile, resolve target tile offset).
2. **`canCast`** — components check preconditions against world state and `ActContext` (e.g. resources available, cooldown ready, target valid). Any component can reject the cast.
3. **`act`** — components mutate `WorldState` (e.g. apply damage, move caster, deduct resources, set cooldown).

## Action processor

The engine's central loop that drives turns. Uses `requestAnimationFrame` loop with a 150ms delay between actions (configurable in the future via speed controls). Flow:

1. Player has active generator → step it → yields a Sentinel
2. Dispatch sentinel to ability pipeline (gather → canCast → act) → action result includes `{ consumeTurn: boolean }`
3. If `consumeTurn: false` → immediately step generator again (same player turn)
4. If `consumeTurn: true` → for each living enemy, compute and dispatch one AI action → begin a new turn → step generator again
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
