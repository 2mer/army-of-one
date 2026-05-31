import type { WorldState, Entity, ActContext, CanCastResult, AbilityComponent } from '@/engine/core/types'

export class Cooldown implements AbilityComponent {
  private turns: number

  constructor(turns: number) {
    this.turns = turns
  }

  canCast(_world: WorldState, _caster: Entity, _ctx: ActContext): CanCastResult {
    return { ok: true, reasons: [] }
  }

  act(_world: WorldState, caster: Entity, _ctx: ActContext): void {
    const ability = caster.abilities.find(a => a.currentCooldown === 0)
    if (ability) ability.currentCooldown = this.turns
  }
}
