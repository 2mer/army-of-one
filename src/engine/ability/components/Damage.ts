import type { WorldState, Entity, ActContext, AbilityComponent, EntityAttributes } from '@/engine/core/types'
import { DamageType, DAMAGE_TYPE_META } from '@/engine/core/types'
import { pushLog, pushLogSegments } from '@/engine/core/types'
import { isDead } from '@/engine/core/types'
import { processDeath } from '@/engine/core/death'
import type { GameEventMap } from '@/engine/core/events'

export class Damage implements AbilityComponent {
  private damageType: DamageType
  private amount: number

  constructor(damageType: DamageType, amount: number) {
    this.damageType = damageType
    this.amount = amount
  }

  act(world: WorldState, caster: Entity, ctx: ActContext): void {
    for (const tileIndex of ctx.targets) {
      const tile = world.tiles.get(tileIndex)
      if (!tile || tile.occupant === null) continue
      const target = world.entities.get(tile.occupant)
      if (target) {
        const bonusKey = `${this.damageType}_bonus` as keyof EntityAttributes
        const resistKey = `${this.damageType}_resistance` as keyof EntityAttributes
        const bonus = (caster.attributes[bonusKey] as number) || 0
        const resist = (target.attributes[resistKey] as number) || 0
        const multiplier = 1 + bonus - resist
        const finalDamage = Math.max(0, Math.round(this.amount * multiplier))

        const oldHp = target.hp
        target.hp = Math.max(0, target.hp - finalDamage)

        world.bus.emit('damage:dealt', {
          sourceId: caster.id,
          targetId: target.id,
          damageType: this.damageType,
          amount: finalDamage,
          position: target.position,
          targetHp: target.hp,
        })

        const meta = DAMAGE_TYPE_META[this.damageType]
        const label = this.damageType.charAt(0).toUpperCase() + this.damageType.slice(1)
        pushLogSegments(world, [
          { text: `${caster.name} hits ${target.name} for ` },
          { text: `${finalDamage} [${meta.glyph} ${label}]`, color: meta.color },
          { text: ` (${oldHp} → ${target.hp})` },
        ])

        if (isDead(target) && oldHp > 0) {
          pushLog(world, `${target.name} dies`, 'highlight')
          processDeath(world, target)
        }
      }
    }
  }
}
