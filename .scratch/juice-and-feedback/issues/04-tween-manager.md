# TweenManager + camera follow + movement tweens

Status: `ready-for-agent`

## Summary

Create `TweenManager` wrapping animejs v4 for movement tweens and camera follow.

## Files

- `src/renderer/TweenManager.ts` — new: wraps animejs, manages active tweens
- `src/renderer/GameField.ts` — modify: use `cameraPos` for `tileToScreen`, integrate TweenManager

## Design

- `cameraPos: number` (float) stored in GameField, defaults to `player.position`
- `tileToScreen` uses `cameraPos` instead of `player.position` for centering
- On `entity:moved` for player entity: tween `cameraPos` from current → target over 300ms easeOutQuad
- On `entity:moved` for non-player: get entity sprite ref, tween its `.x`/`.y` over 200ms easeOutQuad
- Track animated entity IDs in a Set — `renderEntities` skips those IDs
- On tween complete: remove ID from set

## Dependencies

- `animejs` v4 — add to `package.json`

## Acceptance

- Player moves: camera slides, tiles scroll smoothly, player glyph stays centered
- Enemy moves: enemy glyph slides to new position while camera stays stable
- Entity sprites are not repositioned by `renderEntities` while tweening
