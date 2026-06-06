# ParticleSystem (death burst + status labels)

Status: `ready-for-agent`

## Summary

Death particle burst and status effect flash labels, sharing the rising-fade rendering path.

## Files

- `src/renderer/ParticleSystem.ts` — new

## Design

### Death particles (`entity:died`)
- Spawn 6-8 `PIXI.Text` glyph shards (12-15 if entity is player) in `effectContainer`
- Random outward direction, fade alpha + shrink scale over 500ms
- Glyph and color match the dead entity's
- Destroy on complete

### Status labels (`status:applied`)
- Target glyph pulses color for 300ms (debuff = sickly green, buff = gold)
- Small `PIXI.Text` label with status `name` rises and fades above entity
- Lives in `effectContainer` (below damage numbers)

## Acceptance

- Dead enemies burst into colored glyph shards
- Player death produces a larger burst
- Status effects show a brief flash and floating label
