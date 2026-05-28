import type { WorldState, Entity, ActContext, AbilityComponent } from '@/engine/core/types'
import { pushLog } from '@/engine/core/types'

export class Damage implements AbilityComponent {
  private amount: number

  constructor(amount: number) {
    this.amount = amount
  }

  act(world: WorldState, caster: Entity, ctx: ActContext): void {
    for (const tileIndex of ctx.targets) {
      const tile = world.tiles.get(tileIndex)
      if (!tile || tile.occupant === null) continue
      const target = world.entities.get(tile.occupant)
      if (target) {
        const oldHp = target.hp
        target.hp = Math.max(0, target.hp - this.amount)
        pushLog(world, `${caster.name} hits ${target.name} for ${this.amount} damage (${oldHp} → ${target.hp})`)
        if (target.hp === 0 && oldHp > 0) {
          pushLog(world, `${target.name} dies`)
          tile.occupant = null
          world.entities.delete(target.id)
        }
      }
    }
  }
}
