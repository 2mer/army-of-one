# DamageNumberSystem

Status: `ready-for-agent`

## Summary

Floating damage numbers that rise and fade, color-coded by `DamageType`.

## Files

- `src/renderer/DamageNumberSystem.ts` — new

## Design

- Queue-based: events push `{ amount, color, position }` to a per-frame queue
- On ticker: drain queue, batch-create `PIXI.Text` objects in `damageNumberContainer`
- Each text rises 30px + fades alpha over 600ms
- Multiple hits on same tile offset vertically by 15px (calculated during batch flush)
- Color mapping: PHYSICAL → `#f87171`, FIRE → `#fb923c`, SHADOW → `#c084fc`
- Text destroyed on tween complete

## Acceptance

- Damage numbers appear at correct screen position derived from tile index
- Correct color per damage type
- Multiple hits on same entity stack with vertical offset
