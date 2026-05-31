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
    const reasons: string[] = []

    if (targetTile !== expectedTile) {
      reasons.push(`target tile ${targetTile} does not match ability range (expected ${expectedTile})`)
    }

    if (targetTile < 0) reasons.push('target out of bounds')

    const tile = world.tiles.get(targetTile)
    if (this.canTargetPredicate && tile && !this.canTargetPredicate(world, { index: tile.index, occupant: tile.occupant })) {
      reasons.push('target tile does not meet requirements')
    }

    if (this.canTargetPredicate && !tile) {
      reasons.push('target tile does not meet requirements')
    }

    return { ok: reasons.length === 0, reasons }
  }
}
