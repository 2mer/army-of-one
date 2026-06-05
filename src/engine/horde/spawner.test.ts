import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState } from '@/engine/map/initialState'
import type { WorldState, Entity } from '@/engine/core/types'
import { DamageType, defaultAttributes } from '@/engine/core/types'
import { processEnemyAI } from '@/engine/processor/enemyAI'
import { processHordeTick, spawnHordeMonster } from './system'
import { __setHordeQueue } from './queue'
import type { HordeEntry, MonsterSpec } from './types'

const GREEN: MonsterSpec = {
  name: 'Slime', glyph: '⯊', glyphColor: '#4ade80',
  hp: 30, maxHp: 30, damageType: DamageType.PHYSICAL, damageAmount: 5,
}

function buildTestQueue(): HordeEntry[] {
  return [
    { type: 'monster', spec: GREEN },   // 0
    { type: 'monster', spec: GREEN },   // 1
    { type: 'monster', spec: GREEN },   // 2
    { type: 'blank' },                   // 3
    { type: 'blank' },                   // 4
    { type: 'monster', spec: GREEN },   // 5
    { type: 'monster', spec: GREEN },   // 6
    { type: 'monster', spec: GREEN },   // 7
    { type: 'blank' },                   // 8
    { type: 'blank' },                   // 9
    { type: 'blank' },                   // 10
    { type: 'monster', spec: GREEN },   // 11
    { type: 'monster', spec: GREEN },   // 12
    { type: 'monster', spec: GREEN },   // 13
  ]
}

// Slime entity factory — mirrors createHordeAbilities in system.ts
let nextAbilityId = 1
function makeSlimeAbilities(): Entity['abilities'] {
  const prefix = `horde-test-${nextAbilityId++}`
  return [
    {
      id: `${prefix}-attack`,
      name: 'Attack',
      components: [
        { gather: (w: WorldState, _c: Entity, ctx: { targets: number[] }) => {
          const targetTile = ctx.targets[0]
          ctx.targets = [targetTile]
        }, canCast: () => ({ ok: true, reasons: [] as string[] }), act: (w: WorldState, _c: Entity, ctx: { targets: number[] }) => {} },
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
    {
      id: `${prefix}-move-forward`,
      name: 'MoveForward',
      components: [
        { gather: (w: WorldState, c: Entity, ctx: { targets: number[] }) => { ctx.targets = [c.position + 1] },
          canCast: (w: WorldState, c: Entity) => {
            const tile = w.tiles.get(c.position + 1)
            return { ok: !tile?.occupant, reasons: tile?.occupant ? ['blocked'] : [] }
          },
          act: (w: WorldState, c: Entity) => {
            const old = w.tiles.get(c.position)
            if (old) old.occupant = null
            c.position = c.position + 1
            let t = w.tiles.get(c.position)
            if (!t) { t = { index: c.position, occupant: c.id, components: [] }; w.tiles.set(c.position, t) }
            else t.occupant = c.id
          } },
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
    {
      id: `${prefix}-move-back`,
      name: 'MoveBack',
      components: [
        { gather: (w: WorldState, c: Entity, ctx: { targets: number[] }) => { ctx.targets = [c.position - 1] },
          canCast: (w: WorldState, c: Entity) => {
            const tile = w.tiles.get(c.position - 1)
            return { ok: !tile?.occupant, reasons: tile?.occupant ? ['blocked'] : [] }
          },
          act: (w: WorldState, c: Entity) => {
            const old = w.tiles.get(c.position)
            if (old) old.occupant = null
            c.position = c.position - 1
            let t = w.tiles.get(c.position)
            if (!t) { t = { index: c.position, occupant: c.id, components: [] }; w.tiles.set(c.position, t) }
            else t.occupant = c.id
          } },
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
  ]
}

let world: WorldState

beforeEach(() => {
  __setHordeQueue(buildTestQueue())
  world = createInitialState()

  // Move player to position 0
  const player = world.entities.get(world.playerId)!
  const oldPTile = world.tiles.get(player.position)
  if (oldPTile) oldPTile.occupant = null
  player.position = 0
  const pTile = world.tiles.get(0)
  if (pTile) pTile.occupant = player.id
  player.viewRange = 50

  // Wipe existing enemy (spawned by createInitialState)
  for (const [id, e] of world.entities) {
    if (e.name !== 'Player') {
      world.entities.delete(id)
      const t = world.tiles.get(e.position)
      if (t) t.occupant = null
    }
  }
  world.horde.activeEnemies = []

  // Place 3 slimes at positions 1, 2, 3
  world.horde.pointer = 0
  for (let i = 0; i < 3; i++) {
    const id = world._nextEntityId++
    const slime: Entity = {
      id, name: 'Slime', glyph: '⯊', glyphColor: '#4ade80',
      hp: 30, maxHp: 30, mana: 0, maxMana: 0,
      position: i + 1, viewRange: 0,
      abilities: makeSlimeAbilities(),
      statusEffects: [],
      equipment: { head: null, body: null, legs: null, boots: null, leftHand: null, rightHand: null, ring1: null, ring2: null, cape: null, neck: null },
      attributes: defaultAttributes(),
    }
    world.entities.set(id, slime)
    const tile = world.tiles.get(i + 1)
    if (tile) tile.occupant = id
    world.horde.activeEnemies.push(id)
    world.horde.pointer++
  }

  world.horde.distance = 0
  world.horde.delay = 0
  world.horde.lastFarthestEnemyPos = 3
  world._nextLogId = 100
})

function getActiveEnemyPositions(): number[] {
  return world.horde.activeEnemies
    .map(id => world.entities.get(id))
    .filter((e): e is Entity => e !== undefined && e.hp > 0)
    .map(e => e.position)
    .sort((a, b) => a - b)
}

function getMapString(length: number): string {
  let s = ''
  for (let i = 0; i < length; i++) {
    if (i === world.entities.get(world.playerId)?.position) {
      s += 'p'
    } else {
      const tile = world.tiles.get(i)
      if (tile?.occupant) {
        const e = world.entities.get(tile.occupant)
        if (e && e.hp > 0) s += 's'
        else s += 'b'
      } else {
        s += 'b'
      }
    }
  }
  return s
}

function killFrontEnemy(): void {
  const playerPos = world.entities.get(world.playerId)!.position
  const targetTile = world.tiles.get(playerPos + 1)
  if (!targetTile || !targetTile.occupant) return
  const enemy = world.entities.get(targetTile.occupant)
  if (!enemy) return
  enemy.hp = 0
  targetTile.occupant = null
  world.entities.delete(enemy.id)
}

function processTurn(): void {
  processEnemyAI(world)
  processHordeTick(world, 0)
}

describe('horde spawner with delay — ground truth', () => {
  it('initial state is set up correctly', () => {
    expect(getMapString(4)).toBe('psss')
    expect(getActiveEnemyPositions()).toEqual([1, 2, 3])
    expect(world.horde.pointer).toBe(3)
    expect(world.horde.delay).toBe(0)
    expect(world.horde.distance).toBe(0)
    expect(world.horde.activeEnemies.length).toBe(3)
  })

  it('kill front enemy produces pbss...', () => {
    killFrontEnemy()
    expect(getMapString(5)).toBe('pbssb')
    expect(getActiveEnemyPositions()).toEqual([2, 3])
    expect(world.horde.activeEnemies.length).toBe(3) // not yet cleaned
  })

  it('after kill + AI enemies advance left', () => {
    killFrontEnemy()
    processEnemyAI(world)
    expect(getMapString(4)).toBe('pssb')
    expect(getActiveEnemyPositions()).toEqual([1, 2])
  })

  it('after kill + AI + hordeTick spawner handles blanks', () => {
    killFrontEnemy()
    processEnemyAI(world)
    processHordeTick(world, 0)

    // enemies at 1, 2 (AI moved them), plus new spawn past 2 blanks
    const positions = getActiveEnemyPositions()
    expect(positions.length).toBe(3)
    // blanks at entries 3,4 (delay=0 so they shift spawnPos)
    // spawnPos = maxPos+1 = 3, blank@3→spawnPos=4, blank@4→spawnPos=5, monster@5
    expect(positions).toEqual([1, 2, 5])
    expect(world.horde.pointer).toBe(6) // consumed entries 3,4,5
    expect(world.horde.delay).toBe(0)
  })

  it('wait turn advances farthest enemy left by 1 (AI shrinks gap)', () => {
    killFrontEnemy()
    processEnemyAI(world)
    processHordeTick(world, 0)
    const beforeTurn = getActiveEnemyPositions()
    expect(beforeTurn).toEqual([1, 2, 5])

    // Wait turn: AI moves, horde tick (cap=3 → no spawn)
    processTurn()

    const afterTurn = getActiveEnemyPositions()
    // farthest enemy at 5 moved to 4; others are stuck in front
    expect(afterTurn).toEqual([1, 2, 4])
    // gap between rightmost active (2) and farthest (4) = 1 tile
    // delay didn't increase because farthest changed: 5→4
    expect(world.horde.delay).toBe(0)
    expect(world.horde.pointer).toBe(6) // no spawn
  })

  it('delay accumulates when farthest enemy does not move', () => {
    // Create a stack where all enemies are stuck
    // Already 3 enemies at 1,2,3 — all blocked:
    //   pos1 blocked by player, pos2 blocked by pos1, pos3 blocked by pos2
    world.horde.lastFarthestEnemyPos = 3 // farthest is at 3

    processTurn()

    // AI: pos1 attacks player, pos2 blocked, pos3 blocked
    // Farthest stays at 3
    expect(getActiveEnemyPositions()).toEqual([1, 2, 3])
    expect(world.horde.delay).toBe(1)
    expect(world.horde.lastFarthestEnemyPos).toBe(3)
    // cap=3, no spawn
    expect(world.horde.activeEnemies.length).toBe(3)
    expect(world.horde.pointer).toBe(3)
  })

  it('delay accumulates 3 across 3 wait turns with stuck enemies', () => {
    world.horde.lastFarthestEnemyPos = 3
    for (let i = 0; i < 3; i++) {
      processTurn()
    }
    expect(world.horde.delay).toBe(3)
    expect(getActiveEnemyPositions()).toEqual([1, 2, 3])
  })

  it('delay is consumed by spawner when spawning after kill', () => {
    // Accumulate 2 delay
    world.horde.lastFarthestEnemyPos = 3
    processTurn()
    processTurn()
    expect(world.horde.delay).toBe(2)

    // Kill front enemy + AI
    killFrontEnemy()
    processEnemyAI(world)

    // enemies at 2,3 moved to 1,2
    expect(getActiveEnemyPositions()).toEqual([1, 2])

    // Horde tick — delay should consume blanks
    processHordeTick(world, 0)

    // 2 blanks at entries 3,4. delay=2 consumes both:
    //   entry 3: blank, delay→1, entryOffset→1, spawnPos stays 3
    //   entry 4: blank, delay→0, entryOffset→2, spawnPos stays 3
    //   entry 5: monster, spawn at spawnPos=3
    // pointer = 3 + 2 + 1 = 6
    const positions = getActiveEnemyPositions()
    expect(positions).toContain(1)
    expect(positions).toContain(2)
    expect(positions).toContain(3) // new enemy at 3 (not 5!)
    expect(world.horde.pointer).toBe(6)
    expect(world.horde.delay).toBe(0) // both delay consumed
  })

  it('partial delay consumption: delay=1 with 2 blanks spawns at 4 not 5', () => {
    // Accumulate 1 delay
    world.horde.lastFarthestEnemyPos = 3
    processTurn()
    expect(world.horde.delay).toBe(1)

    killFrontEnemy()
    processEnemyAI(world)
    expect(getActiveEnemyPositions()).toEqual([1, 2])

    processHordeTick(world, 0)
    // delay=1: entry 3 blank eaten, entry 4 blank shifts spawnPos, entry 5 monster
    //   spawnPos starts at 3
    //   entry 3 blank: delay=1→0, entryOffset=1, spawnPos stays 3
    //   entry 4 blank: delay=0, spawnPos→4, entryOffset=2
    //   entry 5 monster: spawn at 4
    const positions = getActiveEnemyPositions()
    expect(positions).toEqual([1, 2, 4])
    expect(world.horde.pointer).toBe(6)
    expect(world.horde.delay).toBe(0)
  })
})
