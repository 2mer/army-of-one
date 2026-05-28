import type { WorldState, Entity, ActContext, AbilityComponent } from '@/engine/core/types'

export class Damage implements AbilityComponent {
  private amount: number

  constructor(amount: number) {
    this.amount = amount
  }

  act(world: WorldState, _caster: Entity, ctx: ActContext): void {
    for (const tileIndex of ctx.targets) {
      const tile = world.tiles.get(tileIndex)
      if (!tile || tile.occupant === null) continue
      const target = world.entities.get(tile.occupant)
      if (target) {
        target.hp = Math.max(0, target.hp - this.amount)
      }
    }
  }
}
