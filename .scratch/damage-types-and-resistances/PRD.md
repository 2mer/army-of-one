# Damage Types & Resistances

Status: `completed`

## Problem Statement

Damage was typeless — a flat number that ignored attacker strength and defender weakness. There was no way to express elemental affinities, no way for equipment to modify damage output or mitigation, and the game log showed only a raw number with no visual indication of damage flavour.

## Solution

Introduce a `DamageType` enum (PHYSICAL, FIRE, SHADOW), each with a display glyph and colour. Entities gain an `EntityAttributes` record with per-type `*_bonus` and `*_resistance` floats. Damage calculation uses a contest-of-strength formula: `finalDamage = base * (1 + attackerBonus - defenderResistance)`. The game log renders the damage type with its glyph and colour inline.

## User Stories

1. As a game designer, I want damage to have a type, so that I can differentiate physical attacks from elemental magic.
2. As a game designer, I want entities to have per-type resistance, so that some enemies are tough against physical but weak to fire.
3. As a game designer, I want entities to have per-type damage bonus, so that certain characters or equipment amplify specific damage types.
4. As a player, I want to see the damage type in the game log (coloured glyph), so that I can tell at a glance what kind of damage was dealt.
5. As a developer, I want the formula to be a single pass (`bonus - resist` additive), so that it is easy to reason about and test.
6. As a developer, I want all existing abilities to default to PHYSICAL with zero bonuses/resistances, so that current balance is untouched.
7. As a developer, I want negative final damage clamped to zero (no healing from damage), so that over-protection doesn't break combat.
8. As a developer, I want the type system to generate attribute keys dynamically from `DamageType`, so that adding a new type later (e.g. ICE) requires only one enum entry.

## Implementation Decisions

### DamageType enum

```typescript
enum DamageType { PHYSICAL = 'physical', FIRE = 'fire', SHADOW = 'shadow' }
```

Each type gets a `DAMAGE_TYPE_META` entry with glyph and color:

| Type | Glyph | Color |
|------|-------|-------|
| physical | ◧ | red `#f87171` |
| fire | ▲ | orange `#fb923c` |
| shadow | ◬ | purple `#c084fc` |

### EntityAttributes

Keys derived from `DamageType` via template literals:

```typescript
type DamageTypeAttributes = {
  [K in DamageType as `${K}_resistance`]: number
} & {
  [K in DamageType as `${K}_bonus`]: number
}
```

Default values are all zeros — existing entities are unaffected. Additional stat keys (e.g. `maxHp_bonus`) are added via intersection as needed.

### Damage formula

```
finalDamage = max(0, round(baseAmount * (1 + bonus - resist)))
```

- `bonus` = attacker's `{type}_bonus` (default 0)
- `resist` = defender's `{type}_resistance` (default 0)
- No upper/lower cap on `bonus - resist` — over-protection (net negative) yields zero damage
- No healing from negative final damage (future event hooks may override this)

### Log segments

`LogEntry` gains an optional `segments` field — an array of `{ text, color? }` objects. The `Damage` component pushes segments like:

```
"Player hits Slime for " + "10 [◧ Physical]" (red) + " (30 → 20)"
```

`GameLog` renders segments inline with per-segment color when present, falling back to plain message text otherwise. A `pushLogSegments()` function builds the concatenated `message` string for backwards compatibility and stores the structured segments.

### Modules modified

- **types.ts** — `DamageType`, `DAMAGE_TYPE_META`, `EntityAttributes`, `defaultAttributes()`, `LogSegment`, `pushLogSegments()`, `attributes` on `Entity`
- **components/Damage.ts** — Constructor takes `(DamageType, amount)`, applies formula, logs with segments
- **map/initialState.ts** — Default attributes on player/slime, `Damage(PHYSICAL, ...)` for existing abilities
- **GameLog.tsx** — Renders `segments` when present

## Testing Decisions

Existing core-loop tests assert damage values (slime 30→20, mana 50→45). With zero bonus/resist on both sides the formula reduces to `base * 1`, matching current expected values. All existing tests pass without changes.

New tests should follow the same pattern: set up a known WorldState with attribute overrides, execute a sentinel, assert final HP. Examples:

- Attacker with +0.5 fire bonus → fire damage increased by 50%
- Defender with 0.3 physical resistance → physical damage reduced by 30%
- Defender with -0.5 shadow resistance → shadow damage increased by 50%
- Defender with 1.0 physical resistance → zero physical damage
- Net negative formula → zero damage (no healing)

## Out of Scope

- Equipment-granted attributes (deferred to Player Systems D1)
- Status-effect-granted attributes (deferred to Status Effects A3)
- Damage type additions beyond PHYSICAL/FIRE/SHADOW
- Damage type icons in HUD or radial dial
- Event hooks for negative-damage healing

## Further Notes

- The `EntityAttributes` type uses an intersection pattern (`DamageTypeAttributes & { ... }`) so future stats can be added without refactoring existing keys.
