# Synth — procedural audio

Status: `ready-for-agent`

## Summary

Procedural Web Audio API synth for hit, death, walk, and buff sounds.

## Files

- `src/renderer/Synth.ts` — new

## Design

- Singleton `AudioContext` — created lazily on first `Synth` method call (satisfies autoplay policy)
- Four methods, each creates nodes, shapes envelope, auto-disconnects:
  - `hit()` — white noise burst, ~80ms gate
  - `death()` — sawtooth descending pitch, ~300ms
  - `walk()` — short sine pip, ~30ms
  - `buff()` — two ascending sine tones, ~150ms
- `FeedbackLayer` calls `Synth` methods in event handlers (no queue needed — audio plays immediately)

## Acceptance

- Sounds play on corresponding game events
- First sound creates `AudioContext` (no pre-init needed)
- Audio works in both manual and auto mode
