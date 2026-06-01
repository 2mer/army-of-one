import type { WorldState, Entity, AbilityInstance } from '@/engine/core/types'
import { DamageType, defaultAttributes, pushLog } from '@/engine/core/types'
import { TargetTile } from '@/engine/ability/components/TargetTile'
import { TargetNearestEnemy } from '@/engine/ability/components/TargetNearestEnemy'
import { Damage } from '@/engine/ability/components/Damage'
import { MoveToTile } from '@/engine/ability/components/MoveToTile'
import { getHordeEntry } from './queue'
import type { MonsterSpec } from './types'

let nextAbilityId = 1

function createHordeAbilities(damageType: DamageType, damageAmount: number): AbilityInstance[] {
  const prefix = `horde-${nextAbilityId++}`
  return [
    {
      id: `${prefix}-attack`,
      name: 'Attack',
      components: [
        new TargetNearestEnemy(1),
        new Damage(damageType, damageAmount),
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
    {
      id: `${prefix}-move-forward`,
      name: 'MoveForward',
      components: [
        new TargetTile(1, (_w: WorldState, t: { occupant: unknown }) => t.occupant === null),
        new MoveToTile(),
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
    {
      id: `${prefix}-move-back`,
      name: 'MoveBack',
      components: [
        new TargetTile(-1, (_w: WorldState, t: { occupant: unknown }) => t.occupant === null),
        new MoveToTile(),
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
  ]
}

export function spawnHordeMonster(world: WorldState, spec: MonsterSpec, position: number): void {
  const id = world._nextEntityId++
  const entity: Entity = {
    id,
    name: spec.name,
    glyph: spec.glyph,
    glyphColor: spec.glyphColor,
    hp: spec.hp,
    maxHp: spec.maxHp,
    mana: 0,
    maxMana: 0,
    position,
    viewRange: 0,
    abilities: createHordeAbilities(spec.damageType, spec.damageAmount),
    statusEffects: [],
    equipment: {
      head: null, body: null, legs: null, boots: null,
      leftHand: null, rightHand: null,
      ring1: null, ring2: null,
      cape: null, neck: null,
    },
    attributes: defaultAttributes(),
  }

  world.entities.set(id, entity)

  let tile = world.tiles.get(position)
  if (!tile) {
    tile = { index: position, occupant: id, components: [] }
    world.tiles.set(position, tile)
  } else {
    tile.occupant = id
  }

  pushLog(world, `A ${spec.name} appears in the distance!`, 'highlight')
}

export function processHordeTick(world: WorldState, playerDelta: number): void {
  const horde = world.horde
  const player = world.entities.get(world.playerId)
  if (!player) return

  horde.activeEnemies = horde.activeEnemies.filter(id => {
    const e = world.entities.get(id)
    return e && e.hp > 0
  })

  let dist = horde.distance
  dist = Math.max(0, dist - 1)
  if (playerDelta > 0) dist = Math.max(0, dist - 1)
  else if (playerDelta < 0) dist = dist + 1

  horde.distance = dist

  if (horde.activeEnemies.length >= 3) return

  const entry = getHordeEntry(horde.pointer)

  if (horde.activeEnemies.length > 0) {
    horde.pointer++
    if (entry.type === 'blank') {
      horde.distance += entry.tiles
      return
    }
    let maxPos = -Infinity
    for (const id of horde.activeEnemies) {
      const e = world.entities.get(id)
      if (e && e.position > maxPos) maxPos = e.position
    }
    spawnHordeMonster(world, entry.spec, maxPos + 1)
    horde.activeEnemies.push(world._nextEntityId - 1)
    return
  }

  if (horde.distance > player.viewRange) return

  horde.pointer++

  if (entry.type === 'blank') {
    horde.distance += entry.tiles
    return
  }

  const spawnPos = player.position + player.viewRange
  spawnHordeMonster(world, entry.spec, spawnPos)
  horde.activeEnemies.push(world._nextEntityId - 1)
}
