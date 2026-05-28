import type { WorldState } from '@/engine/core/types'

interface HUDProps {
  world: WorldState
}

export function HUD({ world }: HUDProps) {
  const player = world.entities.get(world.playerId)

  if (!player) {
    return (
      <div className="text-xs text-[#666]">No player</div>
    )
  }

  return (
    <div className="flex gap-4 text-xs text-[#888] items-center">
      <span className="flex items-center gap-1">
        <span className="text-red-400">♥</span>
        <span className="text-[var(--game-fg)]">{player.hp}/{player.maxHp}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-blue-400">♦</span>
        <span className="text-[var(--game-fg)]">{player.mana}/{player.maxMana}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-[#666]">📍</span>
        <span className="text-[var(--game-fg)]">{player.position}</span>
      </span>
      <span className="flex items-center gap-1">
        <span className="text-[#666]">Turn</span>
        <span className="text-[var(--game-fg)]">{world.turn}</span>
      </span>
    </div>
  )
}
