import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState } from '@/engine/map/initialState'
import type { WorldState } from '@/engine/core/types'
import { executeSentinel } from '@/engine/ability/pipeline'
import { PlayerFacade, Sentinel } from '@/engine/ability/Ability'

let world: WorldState

beforeEach(() => {
  // reset module-level nextEntityId by re-importing
  world = createInitialState()
})

function makeSentinel(abilityId: string, target: number): Sentinel {
  return new Sentinel(abilityId, world.playerId, target)
}

describe('core-loop regression', () => {
  it('Wait action increments turn without moving', () => {
    const player = world.entities.get(world.playerId)!
    const pos = player.position

    const result = executeSentinel(world, makeSentinel('wait', pos))

    expect(result.consumeTurn).toBe(true)
    expect(player.position).toBe(pos)
    expect(player.hp).toBe(100)
    expect(player.mana).toBe(50)
  })

  it('MoveForward moves player to adjacent empty tile', () => {
    const player = world.entities.get(world.playerId)!
    expect(player.position).toBe(0)

    const result = executeSentinel(world, makeSentinel('move-forward', 1))

    expect(player.position).toBe(1)
    expect(result.consumeTurn).toBe(true)
  })

  it('Attack reduces slime HP and consumes mana', () => {
    const player = world.entities.get(world.playerId)!
    player.position = 5
    expect(player.mana).toBe(50)

    executeSentinel(world, makeSentinel('attack', 6))

    const slime = [...world.entities.values()].find(e => e.name === 'Slime')!
    expect(slime.hp).toBe(20) // 30 - 10
    expect(player.mana).toBe(45) // 50 - 5
  })

  it('canCastResult returns reasons when mana is insufficient', () => {
    const player = world.entities.get(world.playerId)!
    player.mana = 0
    const facade = new PlayerFacade(world)

    const result = facade.abilities.Attack.at(6).canCastResult()

    expect(result.ok).toBe(false)
    expect(result.reasons.length).toBeGreaterThanOrEqual(1)
    expect(result.reasons.some(r => r.includes('not enough mana'))).toBe(true)
  })

  it('MoveForward canCastResult fails when tile is occupied', () => {
    const facade = new PlayerFacade(world)

    const okResult = facade.abilities.MoveForward.at(1).canCastResult()
    expect(okResult.ok).toBe(true)

    const badResult = facade.abilities.MoveForward.at(6).canCastResult()
    expect(badResult.ok).toBe(false)
  })

  it('Interact on win tile sets gameResult to won', () => {
    const player = world.entities.get(world.playerId)!
    player.position = 9

    executeSentinel(world, makeSentinel('interact', 10))

    expect(world.gameResult).toBe('won')
  })

  it('canCastResult for Attack on empty tile returns reasons', () => {
    const facade = new PlayerFacade(world)

    const result = facade.abilities.Attack.at(2).canCastResult()

    expect(result.ok).toBe(false)
    expect(result.reasons.some(r => r.includes('no entity at target tile'))).toBe(true)
  })
})
