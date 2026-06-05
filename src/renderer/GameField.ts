import { Application, Container, Text, Graphics } from 'pixi.js'
import type { WorldState, Tile, RenderableComponent } from '@/engine/core/types'
import { getHordeEntry } from '@/engine/horde/queue'

const TILE_SIZE = 24
const FONT_SIZE = 18
const FONT_FAMILY = 'ui-monospace, Courier New, monospace'
const BASE_TILE_Y = 100
const HIGHLIGHT_COLOR = 0xc084fc
const HIGHLIGHT_ALPHA = 0.4

export type TileClickCallback = (tileIndex: number, screenX: number, screenY: number) => void
export type TileHoverCallback = (tileIndex: number | null, screenX?: number, screenY?: number) => void

export class GameField {
  private app: Application
  private tileContainer: Container
  private entityContainer: Container
  private highlightContainer: Container
  private virtualHordeContainer: Container
  private tileSprites: Map<number, Text> = new Map()
  private entitySprites: Map<number, Text> = new Map()
  private highlightSprites: Map<number, Graphics> = new Map()
  private virtualHordeSprites: Map<number, Text> = new Map()
  private interactive: boolean = false
  private onTileClickCb: TileClickCallback | null = null
  private onTileHoverCb: TileHoverCallback | null = null
  private playerPosition: number = 0
  private _hoveredTile: number | null = null
  private _boundPointerDown: (e: PointerEvent) => void
  private _boundPointerMove: (e: PointerEvent) => void
  private _boundPointerLeave: (e: PointerEvent) => void

  private constructor(app: Application) {
    this.app = app
    this.highlightContainer = new Container()
    this.tileContainer = new Container()
    this.virtualHordeContainer = new Container()
    this.virtualHordeContainer.alpha = 0.5
    this.entityContainer = new Container()
    app.stage.addChild(this.highlightContainer)
    app.stage.addChild(this.tileContainer)
    app.stage.addChild(this.virtualHordeContainer)
    app.stage.addChild(this.entityContainer)

    this._boundPointerDown = (e: PointerEvent) => this.handlePointerDown(e)
    this._boundPointerMove = (e: PointerEvent) => this.handlePointerMove(e)
    this._boundPointerLeave = (_e: PointerEvent) => this.handlePointerLeave()
    app.canvas.addEventListener('pointerdown', this._boundPointerDown)
    app.canvas.addEventListener('pointermove', this._boundPointerMove)
    app.canvas.addEventListener('pointerleave', this._boundPointerLeave)
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

  setInteractive(val: boolean): void {
    this.interactive = val
    if (!val) {
      this.clearHighlights()
      this._hoveredTile = null
    }
  }

  onTileClick(cb: TileClickCallback | null): void {
    this.onTileClickCb = cb
  }

  onTileHover(cb: TileHoverCallback | null): void {
    this.onTileHoverCb = cb
  }

  update(world: WorldState): void {
    const player = world.entities.get(world.playerId)
    this.playerPosition = player?.position ?? 0
    this.renderTiles(world)
    this.renderVirtualHorde(world)
    this.renderEntities(world)
  }

  private canvasX(clientX: number): number {
    return clientX - this.app.canvas.getBoundingClientRect().left
  }

  private handlePointerDown(e: PointerEvent): void {
    if (!this.interactive || !this.onTileClickCb) return
    const x = this.canvasX(e.clientX)
    const tileIndex = this.screenToTile(x)
    this.onTileClickCb(tileIndex, e.clientX, e.clientY)
  }

  private handlePointerMove(e: PointerEvent): void {
    const x = this.canvasX(e.clientX)
    const tileIndex = this.screenToTile(x)
    if (tileIndex !== this._hoveredTile) {
      this._hoveredTile = tileIndex
      this.onTileHoverCb?.(tileIndex, e.clientX, e.clientY)
      this.updateHighlights(tileIndex)
    }
  }

  private handlePointerLeave(): void {
    if (this._hoveredTile !== null) {
      this._hoveredTile = null
      this.onTileHoverCb?.(null)
      this.updateHighlights(null)
    }
  }

  private screenToTile(canvasX: number): number {
    const centerX = this.app.screen.width / 2
    const offset = Math.round((canvasX - centerX) / TILE_SIZE)
    return this.playerPosition + offset
  }

  private updateHighlights(hoveredIndex: number | null): void {
    this.clearHighlights()
    if (hoveredIndex === null) return

    const pos = this.tileToScreenRaw(hoveredIndex)
    let highlight = this.highlightSprites.get(hoveredIndex)
    if (!highlight) {
      highlight = new Graphics()
      highlight.rect(-TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE)
      highlight.fill({ color: HIGHLIGHT_COLOR, alpha: HIGHLIGHT_ALPHA })
      this.highlightContainer.addChild(highlight)
      this.highlightSprites.set(hoveredIndex, highlight)
    }
    highlight.x = pos.x
    highlight.y = pos.y
    highlight.visible = true
  }

  private clearHighlights(): void {
    for (const sprite of this.highlightSprites.values()) {
      sprite.visible = false
    }
  }

  private tileToScreenRaw(index: number): { x: number; y: number } {
    return {
      x: this.app.screen.width / 2 + (index - this.playerPosition) * TILE_SIZE,
      y: this.app.screen.height / 2 + Math.min(BASE_TILE_Y, this.app.screen.height * 0.15),
    }
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
            fill: entity.glyphColor ?? '#c0c0c0',
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

  private renderVirtualHorde(world: WorldState): void {
    const player = world.entities.get(world.playerId)
    if (!player) { this.clearVirtualHorde(); return }

    const horde = world.horde
    if (horde.activeEnemies.length === 0) { this.clearVirtualHorde(); return }

    let rightmostPos = -Infinity
    for (const id of horde.activeEnemies) {
      const e = world.entities.get(id)
      if (e && e.position > rightmostPos) rightmostPos = e.position
    }

    const endTile = player.position + player.viewRange
    if (rightmostPos === -Infinity || rightmostPos > endTile) {
      this.clearVirtualHorde()
      return
    }

    const newPositions = new Set<number>()
    let remaining = horde.delay
    let entryOffset = 0
    let pos = rightmostPos + 1

    while (pos <= endTile) {
      const entry = getHordeEntry(horde.pointer + entryOffset)
      if (entry.type === 'monster') {
        newPositions.add(pos)
        let sprite = this.virtualHordeSprites.get(pos)
        if (!sprite) {
          sprite = new Text({
            text: entry.spec.glyph,
            style: {
              fontFamily: FONT_FAMILY,
              fontSize: FONT_SIZE,
              fill: entry.spec.glyphColor,
              fontWeight: 'bold',
            },
          })
          sprite.anchor.set(0.5)
          this.virtualHordeContainer.addChild(sprite)
          this.virtualHordeSprites.set(pos, sprite)
        }
        const screen = this.tileToScreen(world, pos)
        sprite.position.set(screen.x, screen.y)
        pos++
        entryOffset++
      } else {
        if (remaining > 0) {
          remaining--
          entryOffset++
        } else {
          pos++
          entryOffset++
        }
      }
    }

    for (const [pos, sprite] of this.virtualHordeSprites) {
      if (!newPositions.has(pos)) {
        this.virtualHordeContainer.removeChild(sprite)
        sprite.destroy()
        this.virtualHordeSprites.delete(pos)
      }
    }
  }

  private clearVirtualHorde(): void {
    for (const [pos, sprite] of this.virtualHordeSprites) {
      this.virtualHordeContainer.removeChild(sprite)
      sprite.destroy()
    }
    this.virtualHordeSprites.clear()
  }

  private createTileGlyph(renderable: RenderableComponent): Text {
    const text = new Text({
      text: renderable.glyph,
      style: {
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZE,
        fill: renderable.fgColor,
      },
    })
    text.anchor.set(0.5)
    return text
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
      y: this.app.screen.height / 2 + Math.min(BASE_TILE_Y, this.app.screen.height * 0.15),
    }
  }

  resize(): void {
    this.app.resize()
  }

  destroy(): void {
    this.app.canvas.removeEventListener('pointerdown', this._boundPointerDown)
    this.app.canvas.removeEventListener('pointermove', this._boundPointerMove)
    this.app.canvas.removeEventListener('pointerleave', this._boundPointerLeave)
    this.highlightSprites.forEach(s => s.destroy())
    this.highlightSprites.clear()
    this.app.destroy()
  }
}
