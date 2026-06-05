import type { WorldState, Entity } from '@/engine/core/types'
import { isDead } from '@/engine/core/types'
import { processDeath } from '@/engine/core/death'

export function processStatusEffects(world: WorldState, entity: Entity): void {
  for (const effect of entity.statusEffects) {
    effect.tick(world, entity)
  }

  entity.statusEffects = entity.statusEffects.filter(e => e.remainingTurns > 0)

  if (isDead(entity)) {
    for (const effect of entity.statusEffects) {
      effect.onRemoved?.(world, entity)
    }
    entity.statusEffects = []
    processDeath(world, entity)
  }
}
