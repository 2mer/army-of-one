import type { WorldState, Entity, ActContext, AbilityComponent, StatusEffect } from '@/engine/core/types'

export class AppliesStatus implements AbilityComponent {
  private factory: (target: Entity) => StatusEffect

  constructor(factory: (target: Entity) => StatusEffect) {
    this.factory = factory
  }

  act(world: WorldState, _caster: Entity, ctx: ActContext): void {
    for (const tileIndex of ctx.targets) {
      const tile = world.tiles.get(tileIndex)
      if (!tile || tile.occupant === null) continue
      const target = world.entities.get(tile.occupant)
      if (!target) continue

      const newEffect = this.factory(target)

      const existing = target.statusEffects.find(e => e.name === newEffect.name)
      if (existing) {
        existing.onConflict?.(newEffect, target, world)
        return
      }

      target.statusEffects.push(newEffect)
      newEffect.onAdded?.(world, target)
    }
  }
}
