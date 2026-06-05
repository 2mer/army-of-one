import { DamageType } from '@/engine/core/types'
import type { MonsterSpec, HordeEntry } from './types'

const GREEN: MonsterSpec = {
  name: 'Slime', glyph: '⯊', glyphColor: '#4ade80',
  hp: 30, maxHp: 30, damageType: DamageType.PHYSICAL, damageAmount: 5,
}

const RED: MonsterSpec = {
  name: 'Red Slime', glyph: '⯊', glyphColor: '#ef4444',
  hp: 40, maxHp: 40, damageType: DamageType.PHYSICAL, damageAmount: 8,
}

const BLUE: MonsterSpec = {
  name: 'Blue Slime', glyph: '⯊', glyphColor: '#3b82f6',
  hp: 25, maxHp: 25, damageType: DamageType.FIRE, damageAmount: 6,
}

const SHADOW: MonsterSpec = {
  name: 'Shadow Slime', glyph: '⯊', glyphColor: '#a855f7',
  hp: 999, maxHp: 999, damageType: DamageType.SHADOW, damageAmount: 999999,
}

function m(spec: MonsterSpec): HordeEntry[] {
  return [{ type: 'monster', spec }]
}

function b(tiles: number): HordeEntry[] {
  return Array.from({ length: tiles }, () => ({ type: 'blank' } as HordeEntry))
}

function buildQueue(): HordeEntry[] {
  const q: HordeEntry[] = []

  const patterns: HordeEntry[] = [
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(3),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(5),
    ...m(RED), ...m(RED), ...m(RED), ...b(3),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(2),
    ...m(BLUE), ...m(BLUE), ...m(BLUE), ...b(4),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(3),
    ...m(RED), ...m(RED), ...m(RED), ...m(RED), ...m(RED), ...b(5),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(3),
    ...m(BLUE), ...m(BLUE), ...b(2),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(3),
    ...m(RED), ...m(RED), ...m(RED), ...m(RED), ...b(3),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(3),
    ...m(BLUE), ...m(BLUE), ...m(BLUE), ...m(BLUE), ...b(4),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(2),
    ...m(RED), ...m(RED), ...m(RED), ...m(RED), ...m(RED), ...b(3),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(3),
    ...m(BLUE), ...m(BLUE), ...m(BLUE), ...b(3),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(3),
    ...m(RED), ...m(RED), ...m(RED), ...m(RED), ...m(RED), ...b(5),
    ...m(GREEN), ...m(GREEN), ...m(GREEN), ...m(GREEN), ...b(2),
    ...m(BLUE), ...m(BLUE), ...m(BLUE), ...b(3),
    ...m(RED), ...m(RED), ...m(RED), ...m(RED),
  ]

  q.push(...patterns)
  return q.slice(0, 100)
}

let HORDE_QUEUE = buildQueue()

export function getHordeEntry(index: number): HordeEntry {
  if (index < HORDE_QUEUE.length) return HORDE_QUEUE[index]
  return { type: 'monster', spec: SHADOW }
}

/** @internal for tests */
export function __setHordeQueue(queue: HordeEntry[]): void {
  HORDE_QUEUE = queue
}
