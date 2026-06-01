# Army of One — Scope Overview

## 1. Implemented (Tasks 1–10)

### Engine Core
- Entity, Tile, WorldState, POI types defined
- Ability component system (`TargetTile`, `TargetNearestEnemy`, `ResourceCost`, `Cooldown`, `Damage`, `MoveToTile`, `InteractWithTile`)
- Ability pipeline (`gather → canCast → act`)
- Script-facing API: `player.abilities.<name>.at(tile).canCast` / `.cast()` returning `Sentinel`

### Action Processor
- `requestAnimationFrame` loop with 150ms delay between actions
- Generator stepping (single generator at a time, `act()` throws if one exists)
- Turn scheduling: player action → enemy AI → next turn
- Pause support (cancels generator before next `next()`)

### Map — First Slice
- Index 0: player spawn (`@`)
- Index 1–5: blank floor (`.`)
- Index 6–8: slimes (`s`)
- Index 9: blank floor
- Index 10: win tile (`>`, Interactable → `gameResult = 'won'`)

### Enemy AI (Slimes)
- If adjacent tile toward player occupied → attack (5 damage)
- Else if can move toward player → move forward/back
- Otherwise skip turn

### Renderer
- Pixi.js v8 canvas
- ASCII glyph rendering (`PIXI.Text`), 24px tiles
- Auto-follow camera (player centered)
- Occupied tiles rendered at reduced opacity

### UI Shell
- HUD (HP, Mana, Position, Turn)
- Game log panel (scrollable)
- Script indicator (auto-mode badge + pause button)
- Monaco editor (split layout, collapsible, TypeScript declarations)
- Default script: attack → move forward → move back loop

### Win/Lose
- Win: interact with win tile (index 10)
- Lose: player HP reaches 0
- Game-over overlay (YOU WIN / YOU LOSE)

### Tech Stack
Vite 8, React 19, TypeScript 6, TailwindCSS v4, shadcn/ui, Pixi.js v8, @monaco-editor/react

---

## 2. Remaining Scope (Not Yet Grilled/PRD'd)

### A. Combat & Abilities

#### A1 ✓ — Damage Types & Resistances
- DamageType enum: PHYSICAL (red ◧), FIRE (orange ▲), SHADOW (purple ◬)
- Per-type resistances: percentage-based, applied via `1 + attackerBonus - defenderResistance` formula
- EntityAttributes captures both `*_bonus` and `*_resistance` per type; defaults to zero
- Equipment integration deferred to D1

#### A2 — Advanced Ability Components
- `MultiTarget(count)` — ability hits N enemies (cleave, AoE)
- `DamageWithFalloff(formula)` — damage decreases per target beyond the first
- `Heal(amount)` — restores target's HP
- `BuffStat(stat, amount, duration)` — temporarily modifies a stat
- `ResourceCost` with formula-based costs (e.g. `10% of maxHp`)
- Cooldown with dynamic duration set by ability code
- `Conditional(canCastPredicate)` — gates the ability behind arbitrary state checks (e.g. "target has buff X")

#### A3 — Status Effects
- Each effect has: `id`, `name`, `remainingTurns`, `type`
- Tick at start of affected entity's turn
- Types: Damage Over Time (bleed/poison), Vulnerability (reduced defense vs type), Buff (increased stat), Debuff (decreased stat), Swap (heal/damage swapped for N turns), Stun (skip turn)
- Stacking rules (same effect refreshes or stacks?)
- Status effects can be applied by ability components (e.g. `ApplyStatus(type, turns)`)

### B. Horde System

#### B1 ✓ — Full Horde Generation
- Horde queue: 100 indexed entries (slime clusters + blank gaps) plus shadow slime fallback
- Only 3 enemies active at a time; spawn at `playerPos + viewRange`
- Blanks add tiles to distance counter, creating natural gaps between clusters
- Spawns one enemy per turn when distance ≤ viewRange and field has room
- Shadow slime (999 HP, 999999 shadow damage) at index 100+ acts as soft cap

#### B2 ✓ — Horde Advancement
- Distance counter ticks down each turn: -1 base, -2 if player moves right, net 0 if player moves left
- Enemies approach player via existing AI (MoveBack ability moves left)
- When an enemy dies, next queue entry is processed (spawn or blank gap)
- King at index 0 is a narrative POI (glyph ♛)
- Game ends when player dies

#### B3 — Advanced Enemy AI
- Boss behaviors (scripted attack patterns, phase transitions)
- Enemy types beyond slimes (archers, mages, tanks)
- Enemies with abilities that target allies (healing, buffing)
- Enemy resistances and damage types

### C. Map & Exploration

#### C1 — Full Map Layout
- Index 0: King's throne
- Index 5: Player start
- Index 20: Prestige shop
- Index 22: Weapon shop  
- Index 30: Town gate
- Procedurally generated terrain between static points

#### C2 — Map Events
- Static POIs that trigger when player is in range or interacts
- Examples: archer tower at specific index (grants "cover fire" buff), treasure chests, lore nodes
- Event configuration in POI data (which events, what they do, any costs)

#### C3 — Shops
- Shop UI accessible via interaction at shop indices
- Also script-accessible (player can write scripts to automate shopping)
- Shops sell equipment, consumables, prestige points (rare)
- Better shops at higher indices (better gear, more prestige)

#### C4 — Secrets & Loot
- Hidden indices with special loot
- Random loot generation on certain tiles
- Persistence of loot between visits (once picked up, gone)

#### C5 — Parallax Background
- ASCII art layer behind the tile grid
- Multiple depth layers that scroll at different speeds
- Rendered as additional Renderable components or separate Pixi.js layers

### D. Player Systems

#### D1 — Equipment
- Slots: body, head, legs, boots, left hand, right hand, ring1, ring2, cape, neck
- Equipment modifies stats (damage, HP, mana, resistances)
- Rarity tiers, stat ranges

#### D2 — Inventory
- Limited inventory slots (stackable? how many?)
- Pick up loot from defeated enemies / found on map
- Manage inventory: drop, equip, move to stash
- Sell items at shops
- Script-accessible (player can write inventory management code)

#### D3 — XP & Leveling
- Enemies drop XP on death
- XP accumulates, levels grant stat increases or ability unlocks
- Level affects which equipment can be used (level gates)

### E. Economy & Meta-Progression

#### E1 — Gold
- Dropped by enemies (amount scales with enemy strength)
- Used to buy gear at shops
- Resets on death

#### E2 — Prestige Points  
- Awarded on death from special events (boss kills)
- Can be bought from a vendor for a large sum of gold (once per run)
- Permanent meta-currency — persists across runs

#### E3 — Meta-Progression Skill Tree
- Spend prestige points to unlock permanent upgrades
- Examples: +% gold drop, +% damage, +10 initial gold, +10 base mana, +10 base HP
- Unlocks gated behind prestige point thresholds

### F. Scripting & Automation

#### F1 — Multiple Script Files
- Player can author several strategy files
- "Frankenstein" execution model: run one file at a time, switch mid-run
- Each file is an independent generator

#### F2 — Script Lifecycle Hooks
- `onMount` / `onUnmount` events for listener cleanup
- Keyboard event listeners (`'z'` to sleep like ADOM)
- Window event integration

#### F3 — Script Utility API
- `writeLog(message: string)` — writes to game log
- `pauseExecution()` — pauses the generator and returns to manual mode
- `sleep(turns?: number)` — does nothing for N turns
- Guard: each game action checks a state flag before executing (scripts cannot bypass turn logic)

#### F4 — Code Persistence
- Scripts persisted in localStorage (or equivalent)
- Survives page refresh
- Multiple named scripts, player picks which to run

### G. UI / UX

#### G1 — Radial Dial
- Clicking a tile opens a radial ability selector at click position
- 8 slots per ring, additional rings for 9+
- Abilities greyed out if `.canCast` is false for that tile
- Targeting-first: pick the tile, then pick the ability

#### G2 — Manual Mode Controls
- Ability buttons / radial dial for players who haven't written scripts
- Tutorial / onboarding for new players

#### G3 — Speed Controls
- x1 / x2 / x4 toggle for auto-play speed
- Configurable delay between actions
- Option to gate faster speeds behind prestige upgrades

#### G4 — Monaco Deep Integration
- Full TypeScript intellisense for game API
- Auto-completion for ability names, component properties
- Error highlighting for script syntax
- File tree for multiple scripts

#### G5 — Zoom
- Zoom in/out on the play field
- Bounded range (min/max zoom level)
- Keyboard shortcuts or scroll wheel

#### G6 — Visual Polish
- Tile hover highlighting
- Ability cast animations (flash, shake, fade)
- Death animation (glyph fades out)
- Smooth movement transitions
- Screen shake on damage

### H. Run Lifecycle

#### H1 — Run Start
- Initial gold grant
- Player spawns at index 5
- 100 "blanks" before horde reaches index 0
- Equipment reset, gold reset, all temporary progression cleared

#### H2 — Run End (Death)
- Gold resets to 0
- Equipment lost
- Temporary progression lost
- Prestige points calculated and awarded
- Stats screen (turns survived, enemies killed, gold earned, etc.)
- Option to spend prestige points before next run

#### H3 — Run End (Win)
- Player reaches town gate (index 30)?
- Or last static index?
- Triggers victory sequence
- Prestige awarded, run stats shown
