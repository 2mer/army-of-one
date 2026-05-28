import type { WorldState, Entity, ActContext, AbilityComponent } from '@/engine/core/types'

export class InteractWithTile implements AbilityComponent {
  act(world: WorldState, _caster: Entity, ctx: ActContext): void {
    const tileIndex = ctx.targets[0]
    const tile = world.tiles.get(tileIndex)
    if (!tile) throw new Error('no tile at target')

    const interactable = tile.components.find((c): c is { type: 'Interactable'; onInteract: (w: WorldState, a: Entity) => void } => c.type === 'Interactable')
    if (!interactable) throw new Error('tile is not interactable')

    interactable.onInteract(world, _caster)
  }
}
