import type { WorldState, Entity, ActContext, CanCastResult, AbilityComponent } from '@/engine/core/types'

type CanTargetPredicate = (world: WorldState, tile: { index: number; occupant: number | null }) => boolean

export class TargetTile implements AbilityComponent {
  private offset: number
  private canTargetPredicate?: CanTargetPredicate

  constructor(offset: number, canTarget?: CanTargetPredicate) {
    this.offset = offset
    this.canTargetPredicate = canTarget
  }

  canCast(world: WorldState, caster: Entity, ctx: ActContext): CanCastResult {
    const targetTile = ctx.targets[0]
    const expectedTile = caster.position + this.offset

    if (targetTile !== expectedTile) {
      return { ok: false, reason: `target tile ${targetTile} does not match ability range (expected ${expectedTile})` }
    }

    if (targetTile < 0) return { ok: false, reason: 'target out of bounds' }

    const tile = world.tiles.get(targetTile)
    if (this.canTargetPredicate && tile && !this.canTargetPredicate(world, { index: tile.index, occupant: tile.occupant })) {
      return { ok: false, reason: 'target tile does not meet requirements' }
    }

    if (this.canTargetPredicate && !tile) {
      return { ok: false, reason: 'target tile does not meet requirements' }
    }

    return { ok: true }
  }
}
