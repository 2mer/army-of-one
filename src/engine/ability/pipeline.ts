import type { WorldState } from '@/engine/core/types'
import { pushLog } from '@/engine/core/types'
import { Sentinel } from './Ability'

export interface ActionResult {
  consumeTurn: boolean
}

export function executeSentinel(world: WorldState, sentinel: Sentinel): ActionResult {
  const caster = world.entities.get(sentinel.casterId)
  if (!caster) throw new Error(`caster ${sentinel.casterId} not found`)

  const ability = caster.abilities.find(a => a.id === sentinel.abilityId)
  if (!ability) throw new Error(`ability ${sentinel.abilityId} not found on caster ${sentinel.casterId}`)

  const ctx = {
    caster,
    targets: [sentinel.target],
  }

  for (const c of ability.components) {
    c.gather?.(world, caster, ctx)
  }

  for (const c of ability.components) {
    const result = c.canCast?.(world, caster, ctx)
    if (result && !result.ok) {
      throw new Error(`cast failed: ${result.reasons.join('; ')}`)
    }
  }

  for (const c of ability.components) {
    c.act?.(world, caster, ctx)
  }

  pushLog(world, `${caster.name} casts ${ability.name}`)

  return { consumeTurn: ability.consumeTurn }
}
