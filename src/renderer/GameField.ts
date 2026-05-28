import { Application, Container, Text } from 'pixi.js'
import type { WorldState, Tile, RenderableComponent } from '@/engine/core/types'

const TILE_SIZE = 24
const FONT_SIZE = 18
const FONT_FAMILY = 'ui-monospace, Courier New, monospace'
const BASE_TILE_Y = 100

export class GameField {
  private app: Application
  private tileContainer: Container
  private entityContainer: Container
  private tileSprites: Map<number, Text> = new Map()
  private entitySprites: Map<number, Text> = new Map()

  private constructor(app: Application) {
    this.app = app
    this.tileContainer = new Container()
    this.entityContainer = new Container()
    app.stage.addChild(this.tileContainer)
    app.stage.addChild(this.entityContainer)
  }

  static async create(parent: HTMLElement): Promise<GameField> {
    const app = new Application()
    await app.init({
      resizeTo: parent,
      background: '#0a0a0f',
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    })
    parent.innerHTML = ''
    parent.appendChild(app.canvas)
    return new GameField(app)
  }

  update(world: WorldState): void {
    this.renderTiles(world)
    this.renderEntities(world)
  }

  private renderTiles(world: WorldState): void {
    const visibleTiles = this.getVisibleTiles(world)
    const existingKeys = new Set(this.tileSprites.keys())

    for (const [index, tile] of visibleTiles) {
      existingKeys.delete(index)

      let sprite = this.tileSprites.get(index)
      const renderable = tile.components.find((c): c is RenderableComponent => c.type === 'Renderable')
      if (!renderable) continue

      if (!sprite) {
        sprite = this.createTileGlyph(renderable)
        this.tileContainer.addChild(sprite)
        this.tileSprites.set(index, sprite)
      }

      const isOccupied = tile.occupant !== null
      sprite.text = renderable.glyph
      sprite.style.fill = renderable.fgColor
      sprite.alpha = isOccupied ? 0.4 : 1

      const screenPos = this.tileToScreen(world, index)
      sprite.x = screenPos.x
      sprite.y = screenPos.y
    }

    for (const staleIndex of existingKeys) {
      const sprite = this.tileSprites.get(staleIndex)
      if (sprite) {
        this.tileContainer.removeChild(sprite)
        sprite.destroy()
      }
      this.tileSprites.delete(staleIndex)
    }
  }

  private renderEntities(world: WorldState): void {
    const existingKeys = new Set(this.entitySprites.keys())

    for (const [id, entity] of world.entities) {
      existingKeys.delete(id)
      if (entity.hp <= 0) continue

      let sprite = this.entitySprites.get(id)

      if (!sprite) {
        sprite = new Text({
          text: entity.glyph,
          style: {
            fontFamily: FONT_FAMILY,
            fontSize: FONT_SIZE,
            fill: '#c0c0c0',
            fontWeight: 'bold',
          },
        })
        sprite.anchor.set(0.5)
        this.entityContainer.addChild(sprite)
        this.entitySprites.set(id, sprite)
      }

      sprite.text = entity.glyph
      sprite.alpha = 1

      const screenPos = this.tileToScreen(world, entity.position)
      sprite.x = screenPos.x
      sprite.y = screenPos.y
    }

    for (const staleId of existingKeys) {
      const sprite = this.entitySprites.get(staleId)
      if (sprite) {
        this.entityContainer.removeChild(sprite)
        sprite.destroy()
      }
      this.entitySprites.delete(staleId)
    }
  }

  private createTileGlyph(renderable: RenderableComponent): Text {
    return new Text({
      text: renderable.glyph,
      style: {
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE,
        fill: renderable.fgColor,
      },
    })
  }

  private getVisibleTiles(world: WorldState): [number, Tile][] {
    const player = world.entities.get(world.playerId)
    if (!player) return []

    const viewRange = Math.ceil(this.app.screen.width / TILE_SIZE / 2) + 2
    const center = player.position
    const visible: [number, Tile][] = []

    for (let i = center - viewRange; i <= center + viewRange; i++) {
      const tile = world.tiles.get(i)
      if (tile) visible.push([i, tile])
    }

    return visible
  }

  private tileToScreen(world: WorldState, index: number): { x: number; y: number } {
    const player = world.entities.get(world.playerId)
    const center = player?.position ?? 0
    const offset = index - center

    return {
      x: this.app.screen.width / 2 + offset * TILE_SIZE,
      y: this.app.screen.height / 2 + BASE_TILE_Y,
    }
  }

  resize(): void {
    this.app.resize()
  }

  destroy(): void {
    this.app.destroy()
  }
}
