// ============================================================
// Type definitions for Duck Slash: Quack of Doom
// ============================================================

export type EnemyType = 'goose' | 'crow' | 'zombie_chicken' | 'boss';
export type GameState = 'menu' | 'playing' | 'wave_complete' | 'game_over' | 'victory';
export type EnemyState = 'idle' | 'chase' | 'attack' | 'stagger' | 'dying' | 'dead';

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
