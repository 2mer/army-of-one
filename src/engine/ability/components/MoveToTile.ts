import type { WorldState, Entity, ActContext, AbilityComponent } from '@/engine/core/types'

export class MoveToTile implements AbilityComponent {
  act(world: WorldState, caster: Entity, ctx: ActContext): void {
    const targetTile = ctx.targets[0]
    const from = caster.position
    const oldTile = world.tiles.get(from)
    if (oldTile) oldTile.occupant = null

    world.bus.emit('entity:moved', { entityId: caster.id, from, to: targetTile })

    caster.position = targetTile
    let newTile = world.tiles.get(targetTile)
    if (!newTile) {
      newTile = { index: targetTile, occupant: caster.id, components: [] }
      world.tiles.set(targetTile, newTile)
    } else {
      newTile.occupant = caster.id
    }
  }
}
