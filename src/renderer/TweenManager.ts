import { animate } from 'animejs'
import type { Text } from 'pixi.js'

export class TweenManager {
  private entitySprites: Map<number, Text>
  private animatedIds: Set<number>

  constructor(entitySprites: Map<number, Text>, animatedIds: Set<number>) {
    this.entitySprites = entitySprites
    this.animatedIds = animatedIds
  }

  tweenCamera(
    from: number,
    to: number,
    onUpdate: (value: number) => void,
  ): void {
    const target = { value: from }
    animate(target, {
      value: to,
      duration: 300,
      easing: 'easeOutQuad',
      onUpdate: () => {
        onUpdate(target.value)
      },
    })
  }

  tweenEntityMove(
    entityId: number,
    from: number,
    to: number,
    tileToScreen: (index: number) => { x: number; y: number },
  ): void {
    const sprite = this.entitySprites.get(entityId)
    if (!sprite) return

    const fromScreen = tileToScreen(from)
    const toScreen = tileToScreen(to)

    sprite.x = fromScreen.x
    sprite.y = fromScreen.y

    this.animatedIds.add(entityId)

    animate(sprite, {
      x: toScreen.x,
      y: toScreen.y,
      duration: 200,
      easing: 'easeOutQuad',
      onComplete: () => {
        this.animatedIds.delete(entityId)
      },
    })
  }
}
