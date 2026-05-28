import type { WorldState, Entity } from '@/engine/core/types'
import { executeSentinel } from '@/engine/ability/pipeline'

export function processEnemyAI(world: WorldState): void {
  const player = world.entities.get(world.playerId)
  if (!player) return

  for (const [id, entity] of world.entities) {
    if (id === world.playerId) continue
    if (entity.hp <= 0) continue

    actForSlime(world, entity, player)
  }
}

function actForSlime(world: WorldState, slime: Entity, player: Entity): void {
  const direction = player.position > slime.position ? 1 : -1
  const forwardTile = slime.position + direction
  const forwardTileData = world.tiles.get(forwardTile)

  const attackAbility = slime.abilities.find(a => a.name === 'Attack')
  const moveForward = slime.abilities.find(a => a.name === 'MoveForward')
  const moveBack = slime.abilities.find(a => a.name === 'MoveBack')

  const isOccupied = forwardTileData?.occupant !== null && forwardTileData?.occupant !== undefined

  if (attackAbility && isOccupied) {
    executeSentinel(world, {
      abilityId: attackAbility.id,
      casterId: slime.id,
      target: forwardTile,
    })
    return
  }

  if (moveForward && direction === 1) {
    executeSentinel(world, {
      abilityId: moveForward.id,
      casterId: slime.id,
      target: forwardTile,
    })
    return
  }

  if (moveBack && direction === -1) {
    executeSentinel(world, {
      abilityId: moveBack.id,
      casterId: slime.id,
      target: forwardTile,
    })
    return
  }
}
