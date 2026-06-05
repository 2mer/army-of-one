import type { WorldState } from '@/engine/core/types'
import { getHordeEntry } from '@/engine/horde/queue'

export interface DebugEntry {
  idx: number
  type: 'monster' | 'blank'
  name?: string
  glyph?: string
  hp?: number
  pos: number
  skipped: boolean
}

export function resolveVirtualHorde(world: WorldState): {
  state: Record<string, unknown>
  virtualEntries: DebugEntry[]
} {
  const player = world.entities.get(world.playerId)
  if (!player) return { state: { reason: 'no player' }, virtualEntries: [] }

  const horde = world.horde
  if (horde.activeEnemies.length === 0) return { state: { reason: 'no active enemies' }, virtualEntries: [] }

  let rightmostPos = -Infinity
  for (const id of horde.activeEnemies) {
    const e = world.entities.get(id)
    if (e && e.position > rightmostPos) rightmostPos = e.position
  }

  const endTile = player.position + player.viewRange
  if (rightmostPos === -Infinity || rightmostPos > endTile) {
    return { state: { reason: 'rightmost past end tile' }, virtualEntries: [] }
  }

  const virtualEntries: DebugEntry[] = []
  let remaining = horde.delay
  let entryOffset = 0
  let pos = rightmostPos + 1

  while (pos <= endTile) {
    const entry = getHordeEntry(horde.pointer + entryOffset)
    if (entry.type === 'monster') {
      virtualEntries.push({
        idx: horde.pointer + entryOffset,
        type: 'monster',
        name: entry.spec.name,
        glyph: entry.spec.glyph,
        hp: entry.spec.hp,
        pos,
        skipped: false,
      })
      pos++
      entryOffset++
    } else {
      if (remaining > 0) {
        virtualEntries.push({
          idx: horde.pointer + entryOffset,
          type: 'blank',
          pos,
          skipped: true,
        })
        remaining--
        entryOffset++
      } else {
        virtualEntries.push({
          idx: horde.pointer + entryOffset,
          type: 'blank',
          pos,
          skipped: false,
        })
        pos++
        entryOffset++
      }
    }
  }

  const activeEnemyInfo: { id: number; name: string; pos: number }[] = []
  for (const id of horde.activeEnemies) {
    const e = world.entities.get(id)
    if (e) activeEnemyInfo.push({ id, name: e.name, pos: e.position })
  }

  return {
    state: {
      turn: world.turn,
      pointer: horde.pointer,
      delay: horde.delay,
      distance: horde.distance,
      lastFarthestEnemyPos: horde.lastFarthestEnemyPos,
      rightmostEnemyPos: rightmostPos,
      activeEnemies: activeEnemyInfo,
      playerPos: player.position,
      playerViewRange: player.viewRange,
      endTile,
    },
    virtualEntries,
  }
}

export function materializeHorde(world: WorldState, count: number): {
  state: Record<string, unknown>
  entries: DebugEntry[]
} {
  const horde = world.horde
  const player = world.entities.get(world.playerId)

  let rightmostPos = -Infinity
  for (const id of horde.activeEnemies) {
    const e = world.entities.get(id)
    if (e && e.position > rightmostPos) rightmostPos = e.position
  }

  const entries: DebugEntry[] = []
  let pos = rightmostPos > -Infinity ? rightmostPos + 1 : 0
  let remaining = horde.delay
  let entryOffset = 0

  for (let i = 0; i < count; i++) {
    const entry = getHordeEntry(horde.pointer + entryOffset)
    if (entry.type === 'monster') {
      entries.push({
        idx: horde.pointer + entryOffset,
        type: 'monster',
        name: entry.spec.name,
        glyph: entry.spec.glyph,
        hp: entry.spec.hp,
        pos,
        skipped: false,
      })
      pos++
      entryOffset++
    } else {
      if (remaining > 0) {
        entries.push({
          idx: horde.pointer + entryOffset,
          type: 'blank',
          pos,
          skipped: true,
        })
        remaining--
        entryOffset++
      } else {
        entries.push({
          idx: horde.pointer + entryOffset,
          type: 'blank',
          pos,
          skipped: false,
        })
        pos++
        entryOffset++
      }
    }
  }

  const activeEnemyInfo: { id: number; name: string; pos: number }[] = []
  for (const id of horde.activeEnemies) {
    const e = world.entities.get(id)
    if (e) activeEnemyInfo.push({ id, name: e.name, pos: e.position })
  }

  return {
    state: {
      turn: world.turn,
      pointer: horde.pointer,
      delay: horde.delay,
      distance: horde.distance,
      lastFarthestEnemyPos: horde.lastFarthestEnemyPos,
      rightmostEnemyPos: rightmostPos,
      activeEnemies: activeEnemyInfo,
      playerPos: player?.position,
      playerViewRange: player?.viewRange,
      endTile: player ? player.position + player.viewRange : undefined,
    },
    entries,
  }
}

export function fullHordeDebug(world: WorldState, count = 20): {
  materialized: ReturnType<typeof materializeHorde>
  virtual: ReturnType<typeof resolveVirtualHorde>
} {
  return {
    materialized: materializeHorde(world, count),
    virtual: resolveVirtualHorde(world),
  }
}
