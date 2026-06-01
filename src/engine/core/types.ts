export type EntityId = number

export enum DamageType {
  PHYSICAL = 'physical',
  FIRE = 'fire',
  SHADOW = 'shadow',
}

export const DAMAGE_TYPE_META: Record<DamageType, { glyph: string; color: string }> = {
  [DamageType.PHYSICAL]: { glyph: '◧', color: '#f87171' },
  [DamageType.FIRE]: { glyph: '▲', color: '#fb923c' },
  [DamageType.SHADOW]: { glyph: '◬', color: '#c084fc' },
}

type DamageTypeAttributes = {
  [K in DamageType as `${K}_resistance`]: number
} & {
  [K in DamageType as `${K}_bonus`]: number
}

export type EntityAttributes = DamageTypeAttributes & {
  // future stats added here
}

export function defaultAttributes(): EntityAttributes {
  return {
    physical_resistance: 0,
    physical_bonus: 0,
    fire_resistance: 0,
    fire_bonus: 0,
    shadow_resistance: 0,
    shadow_bonus: 0,
  }
}

export interface LogSegment {
  text: string
  color?: string
}

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
  type: 'blank' | 'king' | 'win'
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
  segments?: LogSegment[]
}

export function pushLog(world: WorldState, message: string, type: LogEntryType = 'info'): void {
  world.log.push({ id: world._nextLogId++, message, type })
  if (world.log.length > 100) {
    world.log.shift()
  }
}

export function pushLogSegments(world: WorldState, segments: LogSegment[], type: LogEntryType = 'info'): void {
  const message = segments.map(s => s.text).join('')
  world.log.push({ id: world._nextLogId++, message, type, segments })
  if (world.log.length > 100) {
    world.log.shift()
  }
}

export interface HordeState {
  pointer: number
  distance: number
  activeEnemies: number[]
  lastPlayerPosition: number
}

export interface WorldState {
  entities: Map<EntityId, Entity>
  playerId: EntityId
  tiles: Map<number, Tile>
  turn: number
  gameResult: 'playing' | 'won' | 'lost'
  log: LogEntry[]
  _nextLogId: number
  _nextEntityId: number
  horde: HordeState
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
  attributes: EntityAttributes
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
