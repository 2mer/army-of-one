import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState } from '@/engine/map/initialState'
import type { WorldState } from '@/engine/core/types'
import { executeSentinel } from '@/engine/ability/pipeline'
import { PlayerFacade, Sentinel } from '@/engine/ability/Ability'
import { processHordeTick } from '@/engine/horde/system'

let world: WorldState

beforeEach(() => {
  world = createInitialState()
})

function makeSentinel(abilityId: string, target: number): Sentinel {
  return new Sentinel(abilityId, world.playerId, target)
}

function advanceTurns(n: number): void {
  for (let i = 0; i < n; i++) {
    const player = world.entities.get(world.playerId)!
    const pos = player.position
    executeSentinel(world, makeSentinel('wait', pos))
    processHordeTick(world, 0)
    world.turn++
  }
}

describe('core-loop regression', () => {
  it('player starts at position 5', () => {
    const player = world.entities.get(world.playerId)!
    expect(player.position).toBe(5)
  })

  it('Wait action increments turn without moving', () => {
    const player = world.entities.get(world.playerId)!
    expect(player.position).toBe(5)

    const result = executeSentinel(world, makeSentinel('wait', 5))

    expect(result.consumeTurn).toBe(true)
    expect(player.position).toBe(5)
    expect(player.hp).toBe(100)
    expect(player.mana).toBe(50)
  })

  it('MoveForward moves player to adjacent empty tile', () => {
    const player = world.entities.get(world.playerId)!
    expect(player.position).toBe(5)

    const result = executeSentinel(world, makeSentinel('move-forward', 6))

    expect(player.position).toBe(6)
    expect(result.consumeTurn).toBe(true)
  })

  it('MoveBack moves player to adjacent empty tile behind', () => {
    const player = world.entities.get(world.playerId)!
    expect(player.position).toBe(5)

    const result = executeSentinel(world, makeSentinel('move-back', 4))

    expect(player.position).toBe(4)
    expect(result.consumeTurn).toBe(true)
  })

  it('MoveForward canCast fails when tile is occupied by horde enemy', () => {
    const facade = new PlayerFacade(world)

    const okResult = facade.abilities.MoveForward.at(6).canCastResult()
    expect(okResult.ok).toBe(true)

    processHordeTick(world, 0)

    const blockedResult = facade.abilities.MoveForward.at(6).canCastResult()
    expect(blockedResult.ok).toBe(true)
  })

  it('horde spawns enemy after first tick', () => {
    const enemiesBefore = [...world.entities.values()].filter(e => e.name !== 'Player')
    expect(enemiesBefore.length).toBe(0)

    processHordeTick(world, 0)

    const enemiesAfter = [...world.entities.values()].filter(e => e.name !== 'Player')
    expect(enemiesAfter.length).toBe(1)
    expect(enemiesAfter[0].position).toBe(10)
  })

  it('horde spawns up to 3 enemies over 3 ticks', () => {
    for (let i = 0; i < 3; i++) {
      processHordeTick(world, 0)
    }

    const enemies = [...world.entities.values()].filter(e => e.name !== 'Player')
    expect(enemies.length).toBe(3)
    expect(enemies.map(e => e.position).sort()).toEqual([10, 11, 12])
  })

  it('horde does not spawn beyond 3 when player stays', () => {
    for (let i = 0; i < 10; i++) {
      processHordeTick(world, 0)
    }

    const enemies = [...world.entities.values()].filter(e => e.name !== 'Player')
    expect(enemies.length).toBe(3)
  })

  it('horde distance increments on blank entries after enemies are killed', () => {
    for (let i = 0; i < 3; i++) {
      processHordeTick(world, 0)
    }

    const enemies = [...world.entities.values()].filter(e => e.name !== 'Player')
    expect(enemies.length).toBe(3)

    enemies.forEach(e => {
      world.entities.delete(e.id)
      const tile = world.tiles.get(e.position)
      if (tile) tile.occupant = null
    })
    world.horde.activeEnemies = []

    processHordeTick(world, 0)

    expect(world.horde.distance).toBeGreaterThan(0)
  })

  it('horde distance approaches player over successive turns', () => {
    world.horde.distance = 5
    processHordeTick(world, 0)
    expect(world.horde.distance).toBe(4)
  })

  it('Attack hits spawned enemy after it approaches', () => {
    advanceTurns(5)

    const player = world.entities.get(world.playerId)!
    player.position = 9

    const targetTile = 10
    const enemies = [...world.entities.values()].filter(e => e.name !== 'Player')
    const enemy = enemies.find(e => e.position === targetTile)
    expect(enemy).toBeDefined()

    const result = executeSentinel(world, makeSentinel('attack', targetTile))

    expect(result.consumeTurn).toBe(true)
    expect(enemy!.hp).toBeLessThan(30)
  })

  it('canCast Attack returns errors for empty tile', () => {
    const facade = new PlayerFacade(world)

    const result = facade.abilities.Attack.at(6).canCastResult()

    expect(result.ok).toBe(false)
    expect(result.reasons.some(r => r.includes('no entity at target tile'))).toBe(true)
  })

  it('player moving right speeds up horde distance', () => {
    const distBefore = world.horde.distance

    processHordeTick(world, 1)

    expect(world.horde.distance).toBe(distBefore)
  })

  it('player moving left cancels enemy advance (net zero when distance > 0)', () => {
    world.horde.distance = 2

    processHordeTick(world, -1)

    expect(world.horde.distance).toBe(2)
  })

  it('Interact on king tile at position 0', () => {
    const player = world.entities.get(world.playerId)!
    player.position = 0

    const tile = world.tiles.get(0)
    expect(tile).toBeDefined()
    expect(tile!.components.some(c => c.type === 'Renderable')).toBe(true)
  })

  it('game ends when player hp reaches 0', () => {
    const player = world.entities.get(world.playerId)!
    player.hp = 0

    world.gameResult = 'lost'
    expect(world.gameResult).toBe('lost')
  })
})
