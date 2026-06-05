import type { WorldState } from '@/engine/core/types'
import { pushLog } from '@/engine/core/types'
import { executeSentinel } from '@/engine/ability/pipeline'
import { Sentinel, PlayerFacade } from '@/engine/ability/Ability'
import { processEnemyAI } from './enemyAI'
import { processHordeTick } from '@/engine/horde/system'

export interface ProcessorState {
  mode: 'idle' | 'auto'
  speed: number
  paused: boolean
  tick: number
}

export class ActionProcessor {
  world: WorldState
  private generator: Generator<Sentinel, void, unknown> | null = null
  private asyncGenerator: AsyncGenerator<Sentinel, void, unknown> | null = null
  private frameId: number | null = null
  private lastActionTime: number = 0
  speed: number = 200
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
    return this.generator || this.asyncGenerator ? 'auto' : 'idle'
  }

  act(factory: (player: PlayerFacade) => Generator<Sentinel, void, unknown> | AsyncGenerator<Sentinel, void, unknown>): void {
    if (this.generator || this.asyncGenerator) {
      throw new Error('a script is already running')
    }
    const player = new PlayerFacade(this.world)
    const gen = factory(player)

    if (Symbol.asyncIterator in gen) {
      this.asyncGenerator = gen as AsyncGenerator<Sentinel, void, unknown>
      this.paused = false
      this.lastActionTime = 0
      this.notify()
      this.runAsyncLoop()
    } else {
      this.generator = gen as Generator<Sentinel, void, unknown>
      this.paused = false
      this.lastActionTime = 0
      this.notify()
      this.startLoop()
    }
  }

  togglePause(): void {
    this.paused = !this.paused
    this.notify()
  }

  stop(): void {
    this.generator = null
    this.asyncGenerator = null
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

    try {
      const playerBefore = this.world.entities.get(this.world.playerId)?.position ?? 0

      const { value: sentinel, done } = this.generator.next()

      if (done) {
        this.generator = null
        this.notify()
        this.stopLoop()
        return
      }

      const result = executeSentinel(this.world, sentinel)

      this.checkPlayerDeath()

      if (result.consumeTurn && this.world.gameResult === 'playing') {
        try {
          processEnemyAI(this.world)
        } catch (e) {
          pushLog(this.world, `Enemy AI error: ${e instanceof Error ? e.message : e}`, 'error')
        }
        this.checkPlayerDeath()

        const playerAfter = this.world.entities.get(this.world.playerId)?.position ?? 0
        const playerDelta = playerAfter - playerBefore
        processHordeTick(this.world, playerDelta)

        this.world.turn++
      }
    } catch (e) {
      pushLog(this.world, `Script error: ${e instanceof Error ? e.message : e}`, 'error')
      this.generator = null
      this.paused = false
      this.notify()
      this.stopLoop()
    }

    this.checkGameResult()
    this.tickNum++
    this.notify()
  }

  private async runAsyncLoop(): Promise<void> {
    while (this.asyncGenerator) {
      try {
        const { value: sentinel, done } = await this.asyncGenerator.next()

        if (done || !this.asyncGenerator) {
          this.asyncGenerator = null
          this.notify()
          return
        }

        const playerBefore = this.world.entities.get(this.world.playerId)?.position ?? 0

        const result = executeSentinel(this.world, sentinel)

        this.checkPlayerDeath()

        if (result.consumeTurn && this.world.gameResult === 'playing') {
          try {
            processEnemyAI(this.world)
          } catch (e) {
            pushLog(this.world, `Enemy AI error: ${e instanceof Error ? e.message : e}`, 'error')
          }
          this.checkPlayerDeath()

          const playerAfter = this.world.entities.get(this.world.playerId)?.position ?? 0
          const playerDelta = playerAfter - playerBefore
          processHordeTick(this.world, playerDelta)

          this.world.turn++
        }
      } catch (e) {
        pushLog(this.world, `Script error: ${e instanceof Error ? e.message : e}`, 'error')
        this.asyncGenerator = null
        this.paused = false
        this.notify()
        return
      }

      this.checkGameResult()
      this.tickNum++
      this.notify()
    }

    this.asyncGenerator = null
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
      this.asyncGenerator = null
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
