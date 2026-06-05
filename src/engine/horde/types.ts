import type { DamageType } from '@/engine/core/types'

export interface MonsterSpec {
  name: string
  glyph: string
  glyphColor: string
  hp: number
  maxHp: number
  damageType: DamageType
  damageAmount: number
}

export type HordeEntry =
  | { type: 'monster'; spec: MonsterSpec }
  | { type: 'blank' }
