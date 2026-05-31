import type { WorldState, Entity, ActContext, CanCastResult, AbilityComponent } from '@/engine/core/types'

export class TargetNearestEnemy implements AbilityComponent {
  private range: number

  constructor(range: number) {
    this.range = range
  }

  canCast(world: WorldState, caster: Entity, ctx: ActContext): CanCastResult {
    const targetTile = ctx.targets[0]
    const distance = Math.abs(targetTile - caster.position)
    const reasons: string[] = []

    if (distance > this.range) {
      reasons.push(`target outside of ability range (${distance} > ${this.range})`)
    }

    const targetEntity = resolveEntityAt(world, targetTile)
    if (!targetEntity) {
      reasons.push('no entity at target tile')
    } else if (targetEntity.id === caster.id) {
      reasons.push('cannot target self')
    }

    return { ok: reasons.length === 0, reasons }
  }
}

function resolveEntityAt(world: WorldState, tileIndex: number): Entity | null {
  const tile = world.tiles.get(tileIndex)
  if (!tile || tile.occupant === null) return null
  return world.entities.get(tile.occupant) ?? null
}
