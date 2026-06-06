import type { EntityId, DamageType } from './types'

export interface GameEventMap {
  'damage:dealt': {
    sourceId: EntityId
    targetId: EntityId
    damageType: DamageType
    amount: number
    position: number
    targetHp: number
  }
  'entity:died': {
    entityId: EntityId
    entityName: string
    position: number
    glyph: string
    glyphColor?: string
  }
  'entity:moved': {
    entityId: EntityId
    from: number
    to: number
  }
  'status:applied': {
    targetId: EntityId
    statusName: string
    position: number
    isBuff: boolean
  }
}
