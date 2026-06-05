import type { WorldState, Entity, StatusEffect as StatusEffectInterface } from '@/engine/core/types'

export abstract class StatusEffect implements StatusEffectInterface {
  abstract id: string
  abstract name: string
  remainingTurns: number

  constructor(turns: number) {
    this.remainingTurns = turns
  }

  tick(world: WorldState, target: Entity): void {
    this.onTick?.(world, target)
    this.remainingTurns--
    if (this.remainingTurns <= 0) {
      this.onRemoved?.(world, target)
    }
  }

  onAdded?(world: WorldState, target: Entity): void
  protected onTick?(world: WorldState, target: Entity): void
  onRemoved?(world: WorldState, target: Entity): void
  onConflict?(incoming: StatusEffectInterface, target: Entity, world: WorldState): void
}
