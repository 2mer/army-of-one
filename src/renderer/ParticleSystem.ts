import { Text } from 'pixi.js'
import { animate } from 'animejs'
import type { Container } from 'pixi.js'

interface DeathRequest {
  position: number
  glyph: string
  glyphColor?: string
  tileToScreen: (index: number) => { x: number; y: number }
  isPlayer: boolean
}

interface StatusRequest {
  position: number
  label: string
  isBuff: boolean
  tileToScreen: (index: number) => { x: number; y: number }
}

type ParticleCallback = () => void

export class ParticleSystem {
  private container: Container
  private deathQueue: DeathRequest[] = []
  private statusQueue: StatusRequest[] = []
  private onStatusLabelCreated?: ParticleCallback

  constructor(container: Container, onStatusLabelCreated?: ParticleCallback) {
    this.container = container
    this.onStatusLabelCreated = onStatusLabelCreated
  }

  enqueueDeath(req: DeathRequest): void {
    this.deathQueue.push(req)
  }

  enqueueStatus(req: StatusRequest): void {
    this.statusQueue.push(req)
  }

  flush(): void {
    this.flushDeath()
    this.flushStatus()
  }

  private flushDeath(): void {
    for (const req of this.deathQueue) {
      const screen = req.tileToScreen(req.position)
      const count = req.isPlayer ? 12 : 6

      for (let i = 0; i < count; i++) {
        const glyph = this.randomGlyph(req.glyph)
        const text = new Text({
          text: glyph,
          style: {
            fontFamily: 'ui-monospace, Courier New, monospace',
            fontSize: 14,
            fill: req.glyphColor ?? '#c0c0c0',
            fontWeight: 'bold',
          },
        })
        text.anchor.set(0.5)
        text.x = screen.x
        text.y = screen.y
        this.container.addChild(text)

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5
        const distance = 30 + Math.random() * 20

        const target = { x: text.x, y: text.y, alpha: 1 }
        animate(target, {
          x: screen.x + Math.cos(angle) * distance,
          y: screen.y + Math.sin(angle) * distance,
          alpha: 0,
          duration: 500,
          easing: 'easeOutCubic',
          onUpdate: () => {
            text.x = target.x
            text.y = target.y
            text.alpha = target.alpha
          },
          onComplete: () => {
            this.container.removeChild(text)
            text.destroy()
          },
        })
      }
    }
    this.deathQueue = []
  }

  private flushStatus(): void {
    for (const req of this.statusQueue) {
      const screen = req.tileToScreen(req.position)
      const color = req.isBuff ? '#fbbf24' : '#4ade80'

      const text = new Text({
        text: req.label,
        style: {
          fontFamily: 'ui-monospace, Courier New, monospace',
          fontSize: 11,
          fill: color,
          fontWeight: 'bold',
        },
      })
      text.anchor.set(0.5)
      text.x = screen.x
      text.y = screen.y - 20
      this.container.addChild(text)

      animate(text, {
        y: screen.y - 50,
        alpha: 0,
        duration: 800,
        easing: 'easeOutCubic',
        onComplete: () => {
          this.container.removeChild(text)
          text.destroy()
        },
      })

      this.onStatusLabelCreated?.()
    }
    this.statusQueue = []
  }

  private randomGlyph(base: string): string {
    const variants = ['✦', '·', '*', base]
    return variants[Math.floor(Math.random() * variants.length)]
  }
}
