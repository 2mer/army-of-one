import type { WorldState, Entity, ActContext, CanCastResult, AbilityComponent } from '@/engine/core/types'

export class TargetNearestEnemy implements AbilityComponent {
  private range: number

  constructor(range: number) {
    this.range = range
  }

  canCast(world: WorldState, caster: Entity, ctx: ActContext): CanCastResult {
    const targetTile = ctx.targets[0]
    const distance = Math.abs(targetTile - caster.position)
    if (distance > this.range) {
      return { ok: false, reason: `target outside of ability range (${distance} > ${this.range})` }
    }

    const targetEntity = resolveEntityAt(world, targetTile)
    if (!targetEntity) {
      return { ok: false, reason: 'no entity at target tile' }
    }

    if (targetEntity.id === caster.id) {
      return { ok: false, reason: 'cannot target self' }
    }

    return { ok: true }
  }
}

function resolveEntityAt(world: WorldState, tileIndex: number): Entity | null {
  const tile = world.tiles.get(tileIndex)
  if (!tile || tile.occupant === null) return null
  return world.entities.get(tile.occupant) ?? null
}
