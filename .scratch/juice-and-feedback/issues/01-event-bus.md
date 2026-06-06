# EventBus + event map + WorldState integration

Status: `ready-for-agent`

## Summary

Create the typed `EventBus`, define the shared event map, add `bus` to `WorldState`, populate it in `createInitialState`.

## Files

- `src/engine/core/EventBus.ts` — new: generic typed event emitter
- `src/engine/core/events.ts` — new: event map interface + payload types
- `src/engine/core/types.ts` — modify: add `bus: EventBus` to `WorldState`
- `src/engine/map/initialState.ts` — modify: add `bus = new EventBus()` to world

## Design

- Generic `EventBus<Events extends Record<string, unknown>>` with `on<K>(event, handler)` and `emit<K>(event, data)`.
- Event map defined as an interface in `events.ts` — engine and renderer both import from here.
- Payloads (all use tile index for `position`):
  - `damage:dealt` — `{ sourceId: EntityId, targetId: EntityId, damageType: DamageType, amount: number, position: number, targetHp: number }`
  - `entity:died` — `{ entityId: EntityId, entityName: string, position: number, glyph: string, glyphColor?: string }`
  - `entity:moved` — `{ entityId: EntityId, from: number, to: number }`
  - `status:applied` — `{ targetId: EntityId, statusName: string, position: number, isBuff: boolean }`
- `bus` is populated in `createInitialState()` and never reassigned.

## Acceptance

- New `EventBus` instance is created with `WorldState`
- Engine tests: can subscribe and verify event emission
