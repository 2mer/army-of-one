import type { WorldState } from '@/engine/core/types'
import { executeSentinel } from '@/engine/ability/pipeline'
import { Sentinel, PlayerFacade } from '@/engine/ability/Ability'
import { processEnemyAI } from './enemyAI'

export interface ProcessorState {
  mode: 'idle' | 'auto'
  speed: number
  paused: boolean
  tick: number
}

export class ActionProcessor {
  world: WorldState
  private generator: Generator<Sentinel, void, unknown> | null = null
  private frameId: number | null = null
  private lastActionTime: number = 0
  speed: number = 150
  paused: boolean = false
  private tickNum: number = 0
  private stateListener: ((state: ProcessorState) => void) | null = null

  constructor(world: WorldState) {
    this.world = world
  }

  onStateChange(listener: (state: ProcessorState) => void): void {
    this.stateListener = listener
  }

  get mode(): 'idle' | 'auto' {
    return this.generator ? 'auto' : 'idle'
  }

  act(factory: (player: PlayerFacade) => Generator<Sentinel, void, unknown>): void {
    if (this.generator) {
      throw new Error('a script is already running')
    }
    const player = new PlayerFacade(this.world)
    this.generator = factory(player)
    this.paused = false
    this.lastActionTime = 0
    this.notify()
    this.startLoop()
  }

  togglePause(): void {
    this.paused = !this.paused
    this.notify()
  }

  stop(): void {
    this.generator = null
    this.paused = false
    this.notify()
    this.stopLoop()
  }

  private startLoop(): void {
    if (this.frameId !== null) return
    const loop = (now: number) => {
      this.frameId = requestAnimationFrame(loop)
      this.tick(now)
    }
    this.frameId = requestAnimationFrame(loop)
  }

  private stopLoop(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
  }

  step(): void {
    if (!this.generator) return
    this.executeAction()
  }

  private tick(now: number): void {
    if (!this.generator || this.paused) return

    if (now - this.lastActionTime < this.speed) return
    this.lastActionTime = now

    this.executeAction()
  }

  private executeAction(): void {
    if (!this.generator) return

    const { value: sentinel, done } = this.generator.next()

    if (done) {
      this.generator = null
      this.notify()
      this.stopLoop()
      return
    }

    try {
      const result = executeSentinel(this.world, sentinel)

      this.checkPlayerDeath()

      if (result.consumeTurn && this.world.gameResult === 'playing') {
        try {
          processEnemyAI(this.world)
        } catch {
          // enemy AI error, continue
        }
        this.checkPlayerDeath()
        this.world.turn++
      }
    } catch {
      this.generator = null
      this.paused = false
      this.notify()
      this.stopLoop()
    }

    this.checkGameResult()
    this.tickNum++
    this.notify()
  }

  private checkPlayerDeath(): void {
    const player = this.world.entities.get(this.world.playerId)
    if (player && player.hp <= 0) {
      this.world.gameResult = 'lost'
    }
  }

  private checkGameResult(): void {
    if (this.world.gameResult !== 'playing') {
      this.generator = null
      this.paused = false
      this.notify()
      this.stopLoop()
    }
  }

  private notify(): void {
    this.stateListener?.({
      mode: this.mode,
      speed: this.speed,
      paused: this.paused,
      tick: this.tickNum,
    })
  }
}
