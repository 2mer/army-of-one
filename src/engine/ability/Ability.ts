import type { WorldState, AbilityInstance } from '@/engine/core/types'
import { getPOI } from '@/engine/map/initialState'

export function singleAction(sentinel: Sentinel): (player: PlayerFacade) => Generator<Sentinel, void, unknown> {
	return function* () { yield sentinel }
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
	tile: number
	canCastResult: () => { ok: boolean; reasons: string[] }
	cast: () => Sentinel

	constructor(ability: AbilityInstance, world: WorldState, tile: number) {
		this.tile = tile

		Object.defineProperty(this, 'canCast', {
			get: () => this.canCastResult().ok,
			enumerable: true,
		})

		this.canCastResult = (): { ok: boolean; reasons: string[] } => {
			const caster = world.entities.get(world.playerId)
			if (!caster) return { ok: false, reasons: ['player not found'] }
			const ctx = { caster, targets: [this.tile] }
			for (const c of ability.components) c.gather?.(world, caster, ctx)
			const reasons: string[] = []
			for (const c of ability.components) {
				const result = c.canCast?.(world, caster, ctx)
				if (result && !result.ok) {
					reasons.push(...result.reasons)
				}
			}
			return { ok: reasons.length === 0, reasons }
		}

		this.cast = (): Sentinel => {
			return new Sentinel(ability.id, world.playerId, this.tile)
		}
	}
}

export class AbilityFacade {
	at: (tile: number) => Action

	constructor(ability: AbilityInstance, world: WorldState) {
		this.at = (tile: number): Action => {
			return new Action(ability, world, tile)
		}
	}
}

export class PlayerFacade {
	abilities: Record<string, AbilityFacade>
	inspect: (tileIndex: number) => InspectResult

	constructor(world: WorldState) {
		const player = world.entities.get(world.playerId)
		this.abilities = Object.fromEntries(
			(player?.abilities ?? []).map(a => [a.name, new AbilityFacade(a, world)]),
		)

		Object.defineProperties(this, {
			hp: { get: () => world.entities.get(world.playerId)?.hp ?? 0, enumerable: true },
			maxHp: { get: () => world.entities.get(world.playerId)?.maxHp ?? 0, enumerable: true },
			mana: { get: () => world.entities.get(world.playerId)?.mana ?? 0, enumerable: true },
			maxMana: { get: () => world.entities.get(world.playerId)?.maxMana ?? 0, enumerable: true },
			position: { get: () => world.entities.get(world.playerId)?.position ?? 0, enumerable: true },
			viewRange: { get: () => world.entities.get(world.playerId)?.viewRange ?? 0, enumerable: true },
		})

		this.inspect = (tileIndex: number): InspectResult => {
			const player = world.entities.get(world.playerId)
			if (!player) throw new Error('player not found')

			const distance = Math.abs(tileIndex - player.position)
			if (distance > player.viewRange) {
				throw new Error('tile is not visible from here')
			}

			const tile = world.tiles.get(tileIndex)
			if (!tile) {
				throw new Error('tile is not visible from here')
			}

			const poi = getPOI(tileIndex)

			let occupant: { name: string; glyph: string } | null = null
			if (tile.occupant !== null) {
				const entity = world.entities.get(tile.occupant)
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
}
