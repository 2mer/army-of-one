# Scene graph: new containers + FeedbackLayer init

Status: `ready-for-agent`

## Summary

Add `effectContainer` and `damageNumberContainer` to `GameField`, initialize `FeedbackLayer` on first `update(world)`.

## Files

- `src/renderer/GameField.ts` — modify: add two new containers, init FeedbackLayer, set up app.ticker subscription

## Scene graph order

```
app.stage
  ├── highlightContainer
  ├── tileContainer
  ├── virtualHordeContainer
  ├── entityContainer
  ├── effectContainer          ← NEW: death particles, status flash labels
  └── damageNumberContainer    ← NEW: floating damage numbers (topmost)
```

## Rules

- `FeedbackLayer` is constructed once with refs to: the two containers, `app.ticker`, and `world.bus`.
- On each ticker frame, advance active tweens, decay particle lifetimes, drain damage queue.
- `renderEntities` now checks an "animated entity IDs" set before resetting sprite positions.
