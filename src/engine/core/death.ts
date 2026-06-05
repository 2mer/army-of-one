import type { WorldState, Entity, EntityId } from './types'
import { isDead } from './types'

export function cleanupEntity(world: WorldState, entity: Entity): void {
  const tile = world.tiles.get(entity.position)
  if (tile && tile.occupant === entity.id) {
    tile.occupant = null
  }
  world.entities.delete(entity.id)
}

export function processDeath(world: WorldState, entity: Entity): void {
  if (!isDead(entity)) return

  for (const effect of entity.statusEffects) {
    effect.onRemoved?.(world, entity)
  }
  entity.statusEffects = []

  cleanupEntity(world, entity)
}

export function sweepDeadEntities(world: WorldState): void {
  const deadIds: EntityId[] = []
  for (const [id, entity] of world.entities) {
    if (entity.hp <= 0) deadIds.push(id)
  }
  for (const id of deadIds) {
    const entity = world.entities.get(id)
    if (entity) processDeath(world, entity)
  }
}
