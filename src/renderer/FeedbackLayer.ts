import type { Container, Ticker } from 'pixi.js'
import type { EventBus } from '@/engine/core/EventBus'
import type { GameEventMap } from '@/engine/core/events'
import { Synth } from './Synth'
import { TweenManager } from './TweenManager'
import { DamageNumberSystem } from './DamageNumberSystem'
import { ParticleSystem } from './ParticleSystem'
import type { Text } from 'pixi.js'

type TileToScreen = (index: number) => { x: number; y: number }

export class FeedbackLayer {
  private tweenManager: TweenManager
  private damageNumbers: DamageNumberSystem
  private particles: ParticleSystem
  private tileToScreen: TileToScreen
  private cameraPos: number
  private playerId: number

  constructor(
    bus: EventBus<GameEventMap>,
    ticker: Ticker,
    damageNumberContainer: Container,
    effectContainer: Container,
    entitySprites: Map<number, Text>,
    animatedIds: Set<number>,
    tileToScreen: TileToScreen,
    cameraPos: () => number,
    setCameraPos: (v: number) => void,
    playerId: number,
  ) {
    this.tileToScreen = tileToScreen
    this.cameraPos = cameraPos()
    this.playerId = playerId
    this.tweenManager = new TweenManager(entitySprites, animatedIds)
    this.damageNumbers = new DamageNumberSystem(damageNumberContainer)
    this.particles = new ParticleSystem(effectContainer, () => Synth.buff())

    bus.on('damage:dealt', (data) => {
      Synth.hit()
      this.damageNumbers.enqueue({
        amount: data.amount,
        damageType: data.damageType,
        position: data.position,
        tileToScreen: this.convertScreen,
      })
    })

    bus.on('entity:died', (data) => {
      Synth.death()
      this.particles.enqueueDeath({
        position: data.position,
        glyph: data.glyph,
        glyphColor: data.glyphColor,
        tileToScreen: this.convertScreen,
        isPlayer: data.entityId === this.playerId,
      })
    })

    bus.on('entity:moved', (data) => {
      if (data.entityId === this.playerId) {
        Synth.walk()
        this.tweenManager.tweenCamera(this.cameraPos, data.to, (v) => {
          setCameraPos(v)
          this.cameraPos = v
        })
      } else {
        this.tweenManager.tweenEntityMove(
          data.entityId, data.from, data.to, this.convertScreen,
        )
      }
    })

    bus.on('status:applied', (_data) => {
      this.particles.enqueueStatus({
        position: _data.position,
        label: _data.statusName,
        isBuff: _data.isBuff,
        tileToScreen: this.convertScreen,
      })
    })

    ticker.add(() => {
      this.damageNumbers.flush()
      this.particles.flush()
    })
  }

  private convertScreen = (index: number): { x: number; y: number } => {
    return this.tileToScreen(index)
  }
}
