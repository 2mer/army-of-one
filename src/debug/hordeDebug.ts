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
