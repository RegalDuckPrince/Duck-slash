// ============================================================
// Type definitions for Duck Slash: Quack of Doom
// ============================================================

export type EnemyType = 'goose' | 'crow' | 'zombie_chicken' | 'boss';
export type GameState = 'menu' | 'char_select' | 'playing' | 'wave_complete' | 'skill_tree' | 'game_over' | 'victory';
export type EnemyState = 'idle' | 'chase' | 'attack' | 'stagger' | 'dying' | 'dead';
export type CharacterType = 'duck' | 'penguin' | 'parrot';
export type WeaponType =
  | 'sword' | 'axe' | 'spear' | 'dagger' | 'mace'
  | 'pistol' | 'shotgun' | 'rifle' | 'sniper' | 'uzi' | 'minigun' | 'cannon' | 'burst_rifle';

export type SkillId =
  | 'sharp_claws' | 'duck_boost' | 'iron_feathers'
  | 'swift_wings' | 'long_reach' | 'lifesteal'
  | 'armor' | 'battle_frenzy' | 'double_shot';

export interface SkillDef {
  id: SkillId;
  label: string;
  description: string;
  emoji: string;
}

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

// ── HP Drop ──────────────────────────────────────────────────

export interface HpDrop {
  x: number;
  y: number;
  hp: number;
  alpha: number;
  pulseTimer: number;
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
  isGun: boolean;
  projectileSpeed?: number;
  projectileCount?: number;
  projectileSpread?: number;  // radians half-angle for spread
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
  sword:  { type: 'sword',  label: 'Sword',  emoji: '⚔️',  damageMult: 1.0,  cooldownMult: 1.0,  rangeMult: 1.0,  isGun: false },
  axe:    { type: 'axe',    label: 'Axe',    emoji: '🪓',  damageMult: 1.65, cooldownMult: 1.5,  rangeMult: 0.85, isGun: false },
  spear:  { type: 'spear',  label: 'Spear',  emoji: '🗡️',  damageMult: 0.75, cooldownMult: 0.65, rangeMult: 1.5,  isGun: false },
  dagger: { type: 'dagger', label: 'Dagger', emoji: '🔪',  damageMult: 0.55, cooldownMult: 0.38, rangeMult: 0.7,  isGun: false },
  mace:   { type: 'mace',   label: 'Mace',   emoji: '🔨',  damageMult: 2.0,  cooldownMult: 2.2,  rangeMult: 0.9,  isGun: false },
  // ── Guns ──────────────────────────────────────────────────
  pistol:      { type: 'pistol',      label: 'Pistol',       emoji: '🔫',  damageMult: 0.9,  cooldownMult: 0.7,  rangeMult: 1.0, isGun: true,  projectileSpeed: 14, projectileCount: 1, projectileSpread: 0 },
  shotgun:     { type: 'shotgun',     label: 'Shotgun',      emoji: '💥',  damageMult: 0.55, cooldownMult: 1.6,  rangeMult: 0.6, isGun: true,  projectileSpeed: 10, projectileCount: 6, projectileSpread: 0.32 },
  rifle:       { type: 'rifle',       label: 'Rifle',        emoji: '🎯',  damageMult: 1.2,  cooldownMult: 1.0,  rangeMult: 1.0, isGun: true,  projectileSpeed: 18, projectileCount: 1, projectileSpread: 0 },
  sniper:      { type: 'sniper',      label: 'Sniper',       emoji: '🔭',  damageMult: 3.5,  cooldownMult: 2.8,  rangeMult: 1.0, isGun: true,  projectileSpeed: 28, projectileCount: 1, projectileSpread: 0 },
  uzi:         { type: 'uzi',         label: 'Uzi',          emoji: '⚡',  damageMult: 0.35, cooldownMult: 0.22, rangeMult: 1.0, isGun: true,  projectileSpeed: 12, projectileCount: 1, projectileSpread: 0.08 },
  minigun:     { type: 'minigun',     label: 'Minigun',      emoji: '🌀',  damageMult: 0.28, cooldownMult: 0.15, rangeMult: 1.0, isGun: true,  projectileSpeed: 13, projectileCount: 1, projectileSpread: 0.12 },
  cannon:      { type: 'cannon',      label: 'Cannon',       emoji: '💣',  damageMult: 4.5,  cooldownMult: 3.5,  rangeMult: 1.0, isGun: true,  projectileSpeed: 8,  projectileCount: 1, projectileSpread: 0 },
  burst_rifle: { type: 'burst_rifle', label: 'Burst Rifle',  emoji: '🔥',  damageMult: 0.8,  cooldownMult: 0.9,  rangeMult: 1.0, isGun: true,  projectileSpeed: 16, projectileCount: 3, projectileSpread: 0.06 },
};

export const SKILL_DEFS: Record<SkillId, SkillDef> = {
  sharp_claws:   { id: 'sharp_claws',   label: 'Sharp Claws',      description: '+25% damage',                emoji: '🗡️'  },
  duck_boost:    { id: 'duck_boost',    label: 'Duck Boost',       description: '+20% move speed',            emoji: '👟'  },
  iron_feathers: { id: 'iron_feathers', label: 'Iron Feathers',    description: '+30 max HP & heal',          emoji: '🛡️'  },
  swift_wings:   { id: 'swift_wings',   label: 'Swift Wings',      description: '-25% attack cooldown',       emoji: '🪽'  },
  long_reach:    { id: 'long_reach',    label: 'Long Reach',       description: '+30% attack range',          emoji: '📏'  },
  lifesteal:     { id: 'lifesteal',     label: 'Lifesteal',        description: 'Heal 8% of damage dealt',    emoji: '💉'  },
  armor:         { id: 'armor',         label: 'Duck Tape Armor',  description: '-20% incoming damage',       emoji: '🦺'  },
  battle_frenzy: { id: 'battle_frenzy', label: 'Battle Frenzy',    description: 'Combo window +50%',          emoji: '🔥'  },
  double_shot:   { id: 'double_shot',   label: 'Double Shot',      description: 'Guns fire an extra bullet',  emoji: '🎱'  },
};
