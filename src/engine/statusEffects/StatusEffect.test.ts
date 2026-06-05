import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState } from '@/engine/map/initialState'
import type { WorldState, Entity, EntityAttributes } from '@/engine/core/types'
import { isDead } from '@/engine/core/types'
import { processStatusEffects } from './system'
import { BuffStatusEffect } from './BuffStatusEffect'
import { AppliesStatus } from '@/engine/ability/components/AppliesStatus'
import { StatusEffect } from './StatusEffect'
import { cleanupEntity, processDeath } from '@/engine/core/death'

let world: WorldState

beforeEach(() => {
  world = createInitialState()
})

describe('BuffStatusEffect', () => {
  it('applies stat modifiers on add', () => {
    const player = world.entities.get(world.playerId)!
    const buff = new BuffStatusEffect({ name: 'Power', turns: 3, stats: { physical_bonus: 0.5 } })

    buff.onAdded?.(world, player)

    expect(player.attributes.physical_bonus).toBe(0.5)
  })

  it('reverts stat modifiers on remove', () => {
    const player = world.entities.get(world.playerId)!
    const buff = new BuffStatusEffect({ name: 'Power', turns: 3, stats: { physical_bonus: 0.5 } })

    buff.onAdded?.(world, player)
    buff.onRemoved?.(world, player)

    expect(player.attributes.physical_bonus).toBe(0)
  })

  it('handles multiple stats', () => {
    const player = world.entities.get(world.playerId)!
    const buff = new BuffStatusEffect({ name: 'Fire Dance', turns: 3, stats: { fire_bonus: 1, fire_resistance: -0.5 } })

    buff.onAdded?.(world, player)

    expect(player.attributes.fire_bonus).toBe(1)
    expect(player.attributes.fire_resistance).toBe(-0.5)

    buff.onRemoved?.(world, player)

    expect(player.attributes.fire_bonus).toBe(0)
    expect(player.attributes.fire_resistance).toBe(0)
  })

  it('stacks additive with existing modifiers', () => {
    const player = world.entities.get(world.playerId)!
    player.attributes.physical_bonus = 0.25

    const buff = new BuffStatusEffect({ name: 'Power', turns: 3, stats: { physical_bonus: 0.5 } })
    buff.onAdded?.(world, player)

    expect(player.attributes.physical_bonus).toBe(0.75)

    buff.onRemoved?.(world, player)

    expect(player.attributes.physical_bonus).toBe(0.25)
  })

  it('affects damage calculation through entity attributes', () => {
    const player = world.entities.get(world.playerId)!
    const buff = new BuffStatusEffect({ name: 'Power', turns: 3, stats: { physical_bonus: 1 } })
    buff.onAdded?.(world, player)

    expect(player.attributes.physical_bonus).toBe(1)
  })
})

describe('StatusEffect tick/expiry', () => {
  it('tick decrements remainingTurns', () => {
    const player = world.entities.get(world.playerId)!
    const effect = new BuffStatusEffect({ name: 'Power', turns: 3, stats: { physical_bonus: 0.5 } })
    effect.onAdded?.(world, player)
    player.statusEffects.push(effect)

    processStatusEffects(world, player)

    expect(effect.remainingTurns).toBe(2)
  })

  it('buff persists while turns remain', () => {
    const player = world.entities.get(world.playerId)!
    const effect = new BuffStatusEffect({ name: 'Power', turns: 2, stats: { physical_bonus: 0.5 } })
    effect.onAdded?.(world, player)
    player.statusEffects.push(effect)

    processStatusEffects(world, player)

    expect(player.attributes.physical_bonus).toBe(0.5)

    processStatusEffects(world, player)

    expect(player.attributes.physical_bonus).toBe(0)
    expect(player.statusEffects.length).toBe(0)
  })

  it('calls onRemoved when effect expires', () => {
    const player = world.entities.get(world.playerId)!
    let removed = false
    const effect = new BuffStatusEffect({ name: 'Power', turns: 1, stats: { physical_bonus: 0.5 } })
    const origOnRemoved = effect.onRemoved?.bind(effect)
    effect.onRemoved = (w, t) => {
      removed = true
      origOnRemoved?.(w, t)
    }
    effect.onAdded?.(world, player)
    player.statusEffects.push(effect)

    processStatusEffects(world, player)

    expect(removed).toBe(true)
    expect(player.attributes.physical_bonus).toBe(0)
  })
})

describe('AppliesStatus component', () => {
  it('applies a buff to a target entity', () => {
    const player = world.entities.get(world.playerId)!
    const enemy = Array.from(world.entities.values()).find(e => e.name !== 'Player')!
    world.entities.set(enemy.id, enemy)

    const component = new AppliesStatus(target => new BuffStatusEffect({ name: 'Weaken', turns: 2, stats: { physical_resistance: -0.3 } }))
    component.act(world, player, { caster: player, targets: [enemy.position] })

    expect(enemy.statusEffects.length).toBe(1)
    expect(enemy.statusEffects[0].name).toBe('Weaken')
    expect(enemy.attributes.physical_resistance).toBe(-0.3)
  })

  it('handles conflict via onConflict callback', () => {
    const player = world.entities.get(world.playerId)!
    const enemy = Array.from(world.entities.values()).find(e => e.name !== 'Player')!

    let conflictCalled = false
    class RefreshEffect extends StatusEffect {
      id = 'test'
      name = 'TestBuff'
      onConflict(_incoming: any) { conflictCalled = true }
    }

    const first = new RefreshEffect(3)
    first.onAdded?.(world, enemy)
    enemy.statusEffects.push(first)

    const component = new AppliesStatus(() => new RefreshEffect(3))
    component.act(world, player, { caster: player, targets: [enemy.position] })

    expect(conflictCalled).toBe(true)
  })

  it('does not push new effect when onConflict exists', () => {
    const player = world.entities.get(world.playerId)!
    const enemy = Array.from(world.entities.values()).find(e => e.name !== 'Player')!

    const existing = new BuffStatusEffect({ name: 'Power', turns: 2, stats: { physical_bonus: 0.5 } })
    existing.onAdded?.(world, enemy)
    enemy.statusEffects.push(existing)

    const component = new AppliesStatus(() => new BuffStatusEffect({ name: 'Power', turns: 3, stats: { physical_bonus: 1 } }))
    component.act(world, player, { caster: player, targets: [enemy.position] })

    expect(enemy.statusEffects.length).toBe(1)
  })
})

describe('processDeath', () => {
  it('calls onRemoved on all remaining effects before cleanup', () => {
    const player = world.entities.get(world.playerId)!
    const buff = new BuffStatusEffect({ name: 'Power', turns: 5, stats: { physical_bonus: 0.5 } })
    buff.onAdded?.(world, player)
    player.statusEffects.push(buff)

    player.hp = 0

    processDeath(world, player)

    expect(player.attributes.physical_bonus).toBe(0)
    expect(world.entities.has(player.id)).toBe(false)
  })

  it('removes entity from its tile', () => {
    const player = world.entities.get(world.playerId)!
    player.hp = 0

    processDeath(world, player)

    const tile = world.tiles.get(5)
    expect(tile?.occupant).toBeNull()
  })
})
