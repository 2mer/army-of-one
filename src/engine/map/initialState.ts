import type { Tile, TileComponent, POI } from '@/engine/core/types'
import type { WorldState, Entity, HordeState } from '@/engine/core/types'
import { DamageType, defaultAttributes } from '@/engine/core/types'
import { getHordeEntry } from '@/engine/horde/queue'
import { spawnHordeMonster } from '@/engine/horde/system'
import { TargetTile } from '@/engine/ability/components/TargetTile'
import { TargetNearestEnemy } from '@/engine/ability/components/TargetNearestEnemy'
import { ResourceCost } from '@/engine/ability/components/ResourceCost'
import { Cooldown } from '@/engine/ability/components/Cooldown'
import { Damage } from '@/engine/ability/components/Damage'
import { MoveToTile } from '@/engine/ability/components/MoveToTile'
import { InteractWithTile } from '@/engine/ability/components/InteractWithTile'

function createPlayerAbilities() {
	return [
		{
			id: 'move-forward',
			name: 'MoveForward',
			components: [
				new TargetTile(1, (_w, t) => t.occupant === null),
				new MoveToTile(),
			],
			currentCooldown: 0,
			consumeTurn: true,
		},
		{
			id: 'move-back',
			name: 'MoveBack',
			components: [
				new TargetTile(-1, (_w, t) => t.occupant === null),
				new MoveToTile(),
			],
			currentCooldown: 0,
			consumeTurn: true,
		},
		{
			id: 'attack',
			name: 'Attack',
			components: [
				new TargetNearestEnemy(1),
				new Cooldown(1),
				new Damage(DamageType.PHYSICAL, 10),
			],
			currentCooldown: 0,
			consumeTurn: true,
		},
		{
			id: 'strong-attack',
			name: 'StrongAttack',
			components: [
				new TargetNearestEnemy(1),
				new ResourceCost([{ type: 'mana', amount: 5 }]),
				new Cooldown(2),
				new Damage(DamageType.PHYSICAL, 100),
			],
			currentCooldown: 0,
			consumeTurn: true,
		},
		{
			id: 'interact',
			name: 'Interact',
			components: [
				new TargetTile(1, (w, t) => {
					const tile = w.tiles.get(t.index)
					return tile?.components.some(c => c.type === 'Interactable') ?? false
				}),
				new InteractWithTile(),
			],
			currentCooldown: 0,
			consumeTurn: true,
		},
		{
			id: 'wait',
			name: 'Wait',
			components: [],
			currentCooldown: 0,
			consumeTurn: true,
		},
	]
}

function createPlayerEntity(): Entity {
	const id = 1
	return {
		id,
		name: 'Player',
		glyph: '@',
		glyphColor: '#67e8f9',
		hp: 100,
		maxHp: 100,
		mana: 50,
		maxMana: 50,
		position: 5,
		viewRange: 50,
		abilities: createPlayerAbilities(),
		statusEffects: [],
		equipment: {
			head: null, body: null, legs: null, boots: null,
			leftHand: null, rightHand: null,
			ring1: null, ring2: null,
			cape: null, neck: null,
		},
		attributes: defaultAttributes(),
	}
}

export function getPOI(index: number): POI {
	if (index === 0) return { type: 'king' }
	if (index === 1000) return { type: 'win' }
	return { type: 'blank' }
}

function materialiseTile(index: number, poi: POI): Tile {
	const components: TileComponent[] = []

	switch (poi.type) {
		case 'king':
			components.push({ type: 'Renderable', glyph: '♛', fgColor: '#fbbf24' })
			break
		case 'blank':
			components.push({ type: 'Renderable', glyph: '.', fgColor: '#444' })
			break
		case 'win':
			components.push({ type: 'Renderable', glyph: '>', fgColor: '#c084fc' })
			components.push({
				type: 'Interactable',
				onInteract(w: WorldState) {
					w.gameResult = 'won'
				},
			})
			break
	}

	return { index, occupant: null, components }
}

function createHordeState(): HordeState {
	return {
		pointer: 0,
		distance: 0,
		activeEnemies: [],
		lastPlayerPosition: 5,
	}
}

export function createInitialState(): WorldState {
	const world: WorldState = {
		entities: new Map(),
		playerId: 1,
		tiles: new Map(),
		turn: 0,
		gameResult: 'playing',
		log: [],
		_nextLogId: 1,
		_nextEntityId: 2,
		horde: createHordeState(),
	}

	const player = createPlayerEntity()
	world.entities.set(player.id, player)

	for (let i = 0; i <= 60; i++) {
		const poi = getPOI(i)
		const tile = materialiseTile(i, poi)
		world.tiles.set(i, tile)
	}

	const playerTile = world.tiles.get(player.position)
	if (playerTile) playerTile.occupant = player.id

	const firstEntry = getHordeEntry(0)
	if (firstEntry.type === 'monster') {
		spawnHordeMonster(world, firstEntry.spec, 10)
		world.horde.activeEnemies.push(world._nextEntityId - 1)
		world.horde.pointer = 1
	}

	return world
}
