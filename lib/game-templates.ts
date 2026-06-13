export const GAME_TEMPLATES = [
  {
    id: 'platformer',
    name: 'Platformer',
    icon: '🎮',
    description: 'Side-scrolling platformer with jumping, coins, and lives',
    difficulty: 'Easy',
    prompt:
      'Build a Phaser.js side-scrolling platformer with a player that can jump, collect coins, avoid enemies, and display lives. Use colorful pixel-style graphics.',
  },
  {
    id: 'puzzle',
    name: 'Puzzle Match',
    icon: '🧩',
    description: 'Color-matching puzzle on a grid',
    difficulty: 'Easy',
    prompt:
      'Build a Phaser.js match-3 puzzle game on a 8x8 grid with swap mechanics, score counter, and level complete animation.',
  },
  {
    id: 'runner',
    name: 'Endless Runner',
    icon: '🏃',
    description: 'Auto-scrolling runner with increasing speed',
    difficulty: 'Medium',
    prompt:
      'Build a Phaser.js endless runner with auto-scroll, jump to avoid obstacles, increasing speed over time, and high score display.',
  },
] as const;

export type GameTemplateId = (typeof GAME_TEMPLATES)[number]['id'];

export function getGameTemplate(id: string) {
  return GAME_TEMPLATES.find((t) => t.id === id);
}
