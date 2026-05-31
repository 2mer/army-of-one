import type { Tile, TileComponent, POI } from '@/engine/core/types'
import type { WorldState, Entity } from '@/engine/core/types'
import { DamageType, defaultAttributes } from '@/engine/core/types'
import { TargetTile } from '@/engine/ability/components/TargetTile'
import { TargetNearestEnemy } from '@/engine/ability/components/TargetNearestEnemy'
import { ResourceCost } from '@/engine/ability/components/ResourceCost'
import { Cooldown } from '@/engine/ability/components/Cooldown'
import { Damage } from '@/engine/ability/components/Damage'
import { MoveToTile } from '@/engine/ability/components/MoveToTile'
import { InteractWithTile } from '@/engine/ability/components/InteractWithTile'

let nextEntityId = 1

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
        new ResourceCost([{ type: 'mana', amount: 5 }]),
        new Cooldown(1),
        new Damage(DamageType.PHYSICAL, 10),
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

function createSlimeAbilities() {
  return [
    {
      id: 'slime-attack',
      name: 'Attack',
      components: [
        new TargetNearestEnemy(1),
        new Damage(DamageType.PHYSICAL, 5),
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
    {
      id: 'slime-move-forward',
      name: 'MoveForward',
      components: [
        new TargetTile(1, (_w, t) => t.occupant === null),
        new MoveToTile(),
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
    {
      id: 'slime-move-back',
      name: 'MoveBack',
      components: [
        new TargetTile(-1, (_w, t) => t.occupant === null),
        new MoveToTile(),
      ],
      currentCooldown: 0,
      consumeTurn: true,
    },
  ]
}

function createPlayerEntity(): Entity {
  const id = nextEntityId++
  return {
    id,
    name: 'Player',
    glyph: '@',
    glyphColor: '#67e8f9',
    hp: 100,
    maxHp: 100,
    mana: 50,
    maxMana: 50,
    position: 0,
    viewRange: 5,
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

function createSlimeEntity(index: number): Entity {
  const id = nextEntityId++
  return {
    id,
    name: 'Slime',
    glyph: '⯊',
    glyphColor: '#4ade80',
    hp: 30,
    maxHp: 30,
    mana: 0,
    maxMana: 0,
    position: index,
    viewRange: 0,
    abilities: createSlimeAbilities(),
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
  const staticPOIs: Record<number, POI> = {
    0: { type: 'spawn' },
    10: { type: 'win' },
  }

  if (index in staticPOIs) return staticPOIs[index]

  if (index >= 1 && index <= 5) return { type: 'blank' }
  if (index >= 6 && index <= 8) return { type: 'blank' }
  if (index === 9) return { type: 'blank' }

  return { type: 'blank' }
}

function materialiseTile(index: number, poi: POI): Tile {
  const components: TileComponent[] = []

  switch (poi.type) {
    case 'spawn':
      components.push({ type: 'Renderable', glyph: '.', fgColor: '#666' })
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

export function createInitialState(): WorldState {
  const world: WorldState = {
    entities: new Map(),
    playerId: 0,
    tiles: new Map(),
    turn: 0,
    gameResult: 'playing',
    log: [],
    _nextLogId: 1,
  }

  const player = createPlayerEntity()
  world.playerId = player.id
  world.entities.set(player.id, player)

  const spawnPOI = getPOI(0)
  const spawnTile = materialiseTile(0, spawnPOI)
  spawnTile.occupant = player.id
  world.tiles.set(0, spawnTile)

  for (let i = 1; i <= 5; i++) {
    const poi = getPOI(i)
    world.tiles.set(i, materialiseTile(i, poi))
  }

  for (let i = 6; i <= 8; i++) {
    const slime = createSlimeEntity(i)
    world.entities.set(slime.id, slime)
    const poi = getPOI(i)
    const tile = materialiseTile(i, poi)
    tile.occupant = slime.id
    world.tiles.set(i, tile)
  }

  const poi9 = getPOI(9)
  world.tiles.set(9, materialiseTile(9, poi9))

  const winPOI = getPOI(10)
  world.tiles.set(10, materialiseTile(10, winPOI))

  return world
}
