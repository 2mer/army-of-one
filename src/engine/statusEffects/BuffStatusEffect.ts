import type { EntityAttributes, WorldState, Entity } from '@/engine/core/types'
import { StatusEffect } from './StatusEffect'

let nextBuffId = 1

interface BuffStatusEffectConfig {
  name: string
  turns: number
  stats: Partial<EntityAttributes>
}

export class BuffStatusEffect extends StatusEffect {
  id: string
  name: string
  stats: Partial<EntityAttributes>

  constructor(config: BuffStatusEffectConfig) {
    super(config.turns)
    this.id = `buff-${nextBuffId++}`
    this.name = config.name
    this.stats = config.stats
  }

  onAdded(_world: WorldState, target: Entity): void {
    for (const [key, value] of Object.entries(this.stats)) {
      const k = key as keyof EntityAttributes
      target.attributes[k] = ((target.attributes[k] as number) || 0) + (value as number)
    }
  }

  onRemoved(_world: WorldState, target: Entity): void {
    for (const [key, value] of Object.entries(this.stats)) {
      const k = key as keyof EntityAttributes
      target.attributes[k] = ((target.attributes[k] as number) || 0) - (value as number)
    }
  }
}
