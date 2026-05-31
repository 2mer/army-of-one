import type { WorldState, AbilityInstance } from '@/engine/core/types'
import { getPOI } from '@/engine/map/initialState'

export function singleAction(sentinel: Sentinel): (player: PlayerFacade) => Generator<Sentinel, void, unknown> {
  return function*() { yield sentinel }
}

export interface InspectResult {
  occupant: { name: string; glyph: string } | null
  poi: { type: string } | null
}

export class Sentinel {
  abilityId: string
  casterId: number
  target: number

  constructor(abilityId: string, casterId: number, target: number) {
    this.abilityId = abilityId
    this.casterId = casterId
    this.target = target
  }
}

export class Action {
  private ability: AbilityInstance
  private world: WorldState
  tile: number

  constructor(ability: AbilityInstance, world: WorldState, tile: number) {
    this.ability = ability
    this.world = world
    this.tile = tile
  }

  get canCast(): boolean {
    return this.canCastResult().ok
  }

  canCastResult(): { ok: boolean; reasons: string[] } {
    const caster = this.world.entities.get(this.world.playerId)
    if (!caster) return { ok: false, reasons: ['player not found'] }
    const ctx = { caster, targets: [this.tile] }
    for (const c of this.ability.components) c.gather?.(this.world, caster, ctx)
    const reasons: string[] = []
    for (const c of this.ability.components) {
      const result = c.canCast?.(this.world, caster, ctx)
      if (result && !result.ok) {
        reasons.push(...result.reasons)
      }
    }
    return { ok: reasons.length === 0, reasons }
  }

  cast(): Sentinel {
    return new Sentinel(this.ability.id, this.world.playerId, this.tile)
  }
}

export class AbilityFacade {
  private ability: AbilityInstance
  private world: WorldState

  constructor(ability: AbilityInstance, world: WorldState) {
    this.ability = ability
    this.world = world
  }

  at(tile: number): Action {
    return new Action(this.ability, this.world, tile)
  }
}

export class PlayerFacade {
  abilities: Record<string, AbilityFacade>
  private world: WorldState

  constructor(world: WorldState) {
    this.world = world
    const player = world.entities.get(world.playerId)
    this.abilities = Object.fromEntries(
      (player?.abilities ?? []).map(a => [a.name, new AbilityFacade(a, world)]),
    )
  }

  get hp(): number { return this.world.entities.get(this.world.playerId)?.hp ?? 0 }
  get maxHp(): number { return this.world.entities.get(this.world.playerId)?.maxHp ?? 0 }
  get mana(): number { return this.world.entities.get(this.world.playerId)?.mana ?? 0 }
  get maxMana(): number { return this.world.entities.get(this.world.playerId)?.maxMana ?? 0 }
  get position(): number { return this.world.entities.get(this.world.playerId)?.position ?? 0 }
  get viewRange(): number { return this.world.entities.get(this.world.playerId)?.viewRange ?? 0 }

  inspect(tileIndex: number): InspectResult {
    const player = this.world.entities.get(this.world.playerId)
    if (!player) throw new Error('player not found')

    const distance = Math.abs(tileIndex - player.position)
    if (distance > player.viewRange) {
      throw new Error('tile is not visible from here')
    }

    const tile = this.world.tiles.get(tileIndex)
    if (!tile) {
      throw new Error('tile is not visible from here')
    }

    const poi = getPOI(tileIndex)

    let occupant: { name: string; glyph: string } | null = null
    if (tile.occupant !== null) {
      const entity = this.world.entities.get(tile.occupant)
      if (entity) {
        occupant = { name: entity.name, glyph: entity.glyph }
      }
    }

    return {
      occupant,
      poi: { type: poi.type },
    }
  }
}
