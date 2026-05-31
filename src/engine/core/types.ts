export type EntityId = number

export interface RenderableComponent {
  type: 'Renderable'
  glyph: string
  fgColor: string
  bgColor?: string
  layer?: number
}

export interface InteractableComponent {
  type: 'Interactable'
  onInteract: (world: WorldState, actor: Entity) => void
}

export type TileComponent = RenderableComponent | InteractableComponent

export interface POI {
  type: 'blank' | 'spawn' | 'win'
}

export interface Tile {
  index: number
  occupant: EntityId | null
  components: TileComponent[]
}

export interface StatusEffect {
  id: string
  name: string
  remainingTurns: number
}

export interface EquipmentSlots {
  head: null
  body: null
  legs: null
  boots: null
  leftHand: null
  rightHand: null
  ring1: null
  ring2: null
  cape: null
  neck: null
}

export type LogEntryType = 'info' | 'error' | 'highlight'

export interface LogEntry {
  id: number
  message: string
  type: LogEntryType
}

export function pushLog(world: WorldState, message: string, type: LogEntryType = 'info'): void {
  world.log.push({ id: world._nextLogId++, message, type })
  if (world.log.length > 100) {
    world.log.shift()
  }
}

export interface WorldState {
  entities: Map<EntityId, Entity>
  playerId: EntityId
  tiles: Map<number, Tile>
  turn: number
  gameResult: 'playing' | 'won' | 'lost'
  log: LogEntry[]
  _nextLogId: number
}

export interface Entity {
  id: EntityId
  name: string
  glyph: string
  glyphColor?: string
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  position: number
  viewRange: number
  abilities: AbilityInstance[]
  statusEffects: StatusEffect[]
  equipment: EquipmentSlots
}

export interface CanCastResult {
  ok: boolean
  reasons: string[]
}

export interface ActContext {
  caster: Entity
  targets: number[]
}

export interface AbilityComponent {
  gather?(world: WorldState, caster: Entity, ctx: ActContext): void
  canCast?(world: WorldState, caster: Entity, ctx: ActContext): CanCastResult
  act?(world: WorldState, caster: Entity, ctx: ActContext): void
}

export interface AbilityInstance {
  id: string
  name: string
  components: AbilityComponent[]
  currentCooldown: number
  consumeTurn: boolean
}
