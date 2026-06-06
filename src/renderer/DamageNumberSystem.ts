import { Text } from 'pixi.js'
import { animate } from 'animejs'
import { DamageType } from '@/engine/core/types'
import type { Container } from 'pixi.js'

const DAMAGE_COLORS: Record<string, string> = {
  [DamageType.PHYSICAL]: '#f87171',
  [DamageType.FIRE]: '#fb923c',
  [DamageType.SHADOW]: '#c084fc',
}

interface DamageRequest {
  amount: number
  damageType: DamageType
  position: number
  tileToScreen: (index: number) => { x: number; y: number }
}

export class DamageNumberSystem {
  private container: Container
  private queue: DamageRequest[] = []

  constructor(container: Container) {
    this.container = container
  }

  enqueue(req: DamageRequest): void {
    this.queue.push(req)
  }

  flush(): void {
    const grouped = new Map<number, DamageRequest[]>()
    for (const req of this.queue) {
      let list = grouped.get(req.position)
      if (!list) {
        list = []
        grouped.set(req.position, list)
      }
      list.push(req)
    }
    this.queue = []

    for (const [position, requests] of grouped) {
      requests.forEach((req, i) => {
        const screen = req.tileToScreen(position)
        const color = DAMAGE_COLORS[req.damageType] ?? '#ffffff'
        const text = new Text({
          text: String(req.amount),
          style: {
            fontFamily: 'ui-monospace, Courier New, monospace',
            fontSize: 14,
            fill: color,
            fontWeight: 'bold',
          },
        })
        text.anchor.set(0.5)
        text.x = screen.x
        text.y = screen.y - i * 15
        this.container.addChild(text)

        animate(text, {
          y: text.y - 30,
          alpha: 0,
          duration: 600,
          easing: 'easeOutCubic',
          onComplete: () => {
            this.container.removeChild(text)
            text.destroy()
          },
        })
      })
    }
  }
}
