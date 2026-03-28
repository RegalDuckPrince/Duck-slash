// ============================================================
// Type definitions for Duck Slash: Quack of Doom
// ============================================================

export type EnemyType = 'goose' | 'crow' | 'zombie_chicken' | 'boss';
export type GameState = 'menu' | 'char_select' | 'playing' | 'wave_complete' | 'game_over' | 'victory';
export type EnemyState = 'idle' | 'chase' | 'attack' | 'stagger' | 'dying' | 'dead';
export type CharacterType = 'duck' | 'penguin' | 'parrot';
export type WeaponType = 'sword' | 'axe' | 'spear' | 'dagger' | 'mace';

export interface Vec2 {
  x: number;
  y: number;
}

// ── Particles ────────────────────────────────────────────────

export interface BloodParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
  gravity: number;
  bounced: boolean;
}

export interface FeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  color: string;
  alpha: number;
  size: number;
  gravity: number;
}

export interface BodyPart {
  partType: 'wing' | 'head' | 'guts';
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  alpha: number;
  enemyType: EnemyType;
  size: number;
  gravity: number;
  bounced: boolean;
}

export interface BloodPool {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
  size: number;
  timer: number;
  maxTimer: number;
}

export interface Sparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  timer: number;
}

export interface SlashTrail {
  x: number;
  y: number;
  angle: number;
  startAngle: number;
  endAngle: number;
  radius: number;
  alpha: number;
  timer: number;
  maxTimer: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  damage: number;
  fromEnemy: boolean;
}

// ── Scene decoration ─────────────────────────────────────────

export interface Flower {
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

export interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

// ── Wave config ──────────────────────────────────────────────

export interface WaveEnemyConfig {
  type: EnemyType;
  count: number;
}

export interface WaveConfig {
  enemies: WaveEnemyConfig[];
  label: string;
}

// ── Character & Weapon configs ───────────────────────────────

export interface CharacterConfig {
  type: CharacterType;
  label: string;
  description: string;
  emoji: string;
  hpMult: number;
  speedMult: number;
  damageMult: number;
  attackCooldownMult: number;
}

export interface WeaponConfig {
  type: WeaponType;
  label: string;
  emoji: string;
  damageMult: number;
  cooldownMult: number;
  rangeMult: number;
}

export const CHARACTER_CONFIGS: Record<CharacterType, CharacterConfig> = {
  duck: {
    type: 'duck', label: 'Duck', emoji: '🦆',
    description: 'The balanced warrior. Reliable in every situation.',
    hpMult: 1.0, speedMult: 1.0, damageMult: 1.0, attackCooldownMult: 1.0,
  },
  penguin: {
    type: 'penguin', label: 'Penguin', emoji: '🐧',
    description: 'Tanky brawler. High HP and heavy hits, but slow.',
    hpMult: 1.65, speedMult: 0.68, damageMult: 1.4, attackCooldownMult: 1.2,
  },
  parrot: {
    type: 'parrot', label: 'Parrot', emoji: '🦜',
    description: 'Swift slasher. Lightning-fast attacks, but fragile.',
    hpMult: 0.65, speedMult: 1.45, damageMult: 0.75, attackCooldownMult: 0.55,
  },
};

export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  sword:  { type: 'sword',  label: 'Sword',  emoji: '⚔️',  damageMult: 1.0,  cooldownMult: 1.0,  rangeMult: 1.0  },
  axe:    { type: 'axe',    label: 'Axe',    emoji: '🪓',  damageMult: 1.65, cooldownMult: 1.5,  rangeMult: 0.85 },
  spear:  { type: 'spear',  label: 'Spear',  emoji: '🗡️',  damageMult: 0.75, cooldownMult: 0.65, rangeMult: 1.5  },
  dagger: { type: 'dagger', label: 'Dagger', emoji: '🔪',  damageMult: 0.55, cooldownMult: 0.38, rangeMult: 0.7  },
  mace:   { type: 'mace',   label: 'Mace',   emoji: '🔨',  damageMult: 2.0,  cooldownMult: 2.2,  rangeMult: 0.9  },
};
