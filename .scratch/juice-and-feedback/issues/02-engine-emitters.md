# Engine event emitters (Damage, MoveToTile, AppliesStatus, death)

Status: `ready-for-agent`

## Summary

Wire `world.bus.emit()` calls into the four engine mutation sites.

## Files

- `src/engine/ability/components/Damage.ts` — modify: emit `damage:dealt` for each target hit
- `src/engine/ability/components/MoveToTile.ts` — modify: emit `entity:moved` **before** mutating position
- `src/engine/ability/components/AppliesStatus.ts` — modify: emit `status:applied` after applying
- `src/engine/core/death.ts` — modify: emit `entity:died` in `processDeath` before `cleanupEntity`

## Rules

- `MoveToTile`: capture `from = caster.position` first, then emit, then mutate.
- `Death.ts`: entity data is still intact when `entity:died` fires (position, glyph, color all available).
- `Damage.ts` does NOT emit `entity:died` — that's `death.ts`'s job.

## Acceptance

- Engine tests assert each event fires with correct payload shape and values
- Events fire synchronously during `act()` — no async concerns
