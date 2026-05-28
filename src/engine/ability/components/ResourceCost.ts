import type { WorldState, Entity, ActContext, CanCastResult, AbilityComponent } from '@/engine/core/types'

interface Cost {
  type: 'mana' | 'hp'
  amount: number
}

export class ResourceCost implements AbilityComponent {
  private costs: Cost[]

  constructor(costs: Cost[]) {
    this.costs = costs
  }

  canCast(_world: WorldState, caster: Entity, _ctx: ActContext): CanCastResult {
    for (const cost of this.costs) {
      const current = caster[cost.type]
      if (current < cost.amount) {
        return {
          ok: false,
          reason: `not enough ${cost.type} (${current} < ${cost.amount})`,
        }
      }
    }
    return { ok: true }
  }

  act(_world: WorldState, caster: Entity, _ctx: ActContext): void {
    for (const cost of this.costs) {
      caster[cost.type] -= cost.amount
    }
  }
}
