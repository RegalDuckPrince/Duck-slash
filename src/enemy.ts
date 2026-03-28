// ============================================================
// Enemy entities
// ============================================================
import type { EnemyType, EnemyState } from './types.ts';
import type { ParticleSystem } from './particles.ts';
import type { Player } from './player.ts';

const ARENA_W = 1280;
const ARENA_H = 720;
const GROUND_Y = 590;

// ── Base stats per type ──────────────────────────────────────

interface EnemyStats {
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  scoreValue: number;
  size: number;
}

const STATS: Record<EnemyType, EnemyStats> = {
  goose: {
    maxHp: 55,
    speed: 88,
    damage: 15,
    attackRange: 48,
    attackCooldown: 1.2,
    scoreValue: 100,
    size: 30,
  },
  crow: {
    maxHp: 38,
    speed: 130,
    damage: 12,
    attackRange: 260,
    attackCooldown: 2.0,
    scoreValue: 140,
    size: 22,
  },
  zombie_chicken: {
    maxHp: 90,
    speed: 52,
    damage: 28,
    attackRange: 50,
    attackCooldown: 1.8,
    scoreValue: 180,
    size: 28,
  },
  boss: {
    maxHp: 600,
    speed: 75,
    damage: 30,
    attackRange: 90,
    attackCooldown: 1.0,
    scoreValue: 2000,
    size: 54,
  },
  archer_boss: {
    maxHp: 450,
    speed: 55,
    damage: 22,
    attackRange: 380,
    attackCooldown: 0.7,   // fires 3-shot burst quickly
    scoreValue: 2500,
    size: 48,
  },
  berserker_boss: {
    maxHp: 900,
    speed: 110,
    damage: 45,
    attackRange: 80,
    attackCooldown: 0.9,
    scoreValue: 3500,
    size: 58,
  },
};

// ── Enemy class ──────────────────────────────────────────────

export class Enemy {
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: EnemyState = 'chase';
  facing = -1;

  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  attackTimer = 0;
  scoreValue: number;
  size: number;

  walkFrame = 0;
  staggerTimer = 0;       // visual flash
  dyingAlpha = 1;

  private _wave: number;

  constructor(type: EnemyType, x: number, y: number, wave: number) {
    this.type = type;
    this.x = x;
    this.y = y;
    this._wave = wave;

    const s = STATS[type];
    // Scale stats with wave
    const waveBonus = 1 + (wave - 1) * 0.07;
    this.maxHp = Math.round(s.maxHp * waveBonus);
    this.hp = this.maxHp;
    this.speed = s.speed * (1 + (wave - 1) * 0.04);
    this.damage = Math.round(s.damage * waveBonus);
    this.attackRange = s.attackRange;
    this.attackCooldown = s.attackCooldown;
    this.scoreValue = s.scoreValue;
    this.size = s.size;
  }

  get isDead() { return this.state === 'dead'; }

  update(dt: number, player: Player, particles: ParticleSystem, allEnemies: Enemy[]): number {
    if (this.state === 'dead') return 0;

    // Tick attack cooldown
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.staggerTimer > 0) this.staggerTimer -= dt;

    if (this.state === 'dying') {
      this.dyingAlpha -= dt * 2.5;
      if (this.dyingAlpha <= 0) {
        this.dyingAlpha = 0;
        this.state = 'dead';
      }
      return 0;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.facing = dx < 0 ? 1 : -1;

    if (this.type === 'crow') {
      return this._updateCrow(dt, player, particles, dist, dx, dy);
    } else if (this.type === 'archer_boss') {
      return this._updateArcherBoss(dt, player, particles, dist, dx, dy);
    } else if (this.type === 'berserker_boss') {
      return this._updateBerserker(dt, player, particles, dist, dx, dy, allEnemies);
    } else {
      return this._updateMelee(dt, player, particles, dist, dx, dy, allEnemies);
    }
  }

  private _updateMelee(
    dt: number,
    player: Player,
    particles: ParticleSystem,
    dist: number,
    dx: number,
    dy: number,
    allEnemies: Enemy[],
  ): number {
    // Chase player
    if (dist > this.attackRange * 0.8 && this.staggerTimer <= 0) {
      const spd = this.type === 'boss'
        ? this.speed * (this.hp < this.maxHp * 0.33 ? 1.5 : this.hp < this.maxHp * 0.5 ? 1.2 : 1)
        : this.speed;
      this.x += (dx / dist) * spd * dt;
      this.y += (dy / dist) * spd * dt;
      this.walkFrame += dt * 60;
      // Separate from other enemies
      this._separate(allEnemies);
    }

    this._clamp();

    // Attack
    if (dist <= this.attackRange && this.attackTimer <= 0) {
      if (player.takeDamage(this.damage)) {
        particles.spawnBloodSplat(player.x, player.y, -dx / dist, -dy / dist, 8);
        particles.spawnFloatingText(player.x, player.y - 40, `-${this.damage}`, '#ff4466', 20);
        return this.damage;
      }
      this.attackTimer = this.attackCooldown;
    }
    return 0;
  }

  private _updateCrow(
    dt: number,
    player: Player,
    particles: ParticleSystem,
    dist: number,
    dx: number,
    dy: number,
  ): number {
    // Crows keep a comfortable distance and shoot
    const idealDist = 200;
    if (dist < idealDist - 30 && this.staggerTimer <= 0) {
      // Back away
      this.x -= (dx / dist) * this.speed * 0.6 * dt;
      this.y -= (dy / dist) * this.speed * 0.6 * dt;
    } else if (dist > idealDist + 50 && this.staggerTimer <= 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    this.walkFrame += dt * 60;
    this._clamp();

    // Ranged attack
    if (dist <= this.attackRange && this.attackTimer <= 0) {
      particles.spawnProjectile(this.x, this.y - 20, player.x, player.y, 7, this.damage, true);
      this.attackTimer = this.attackCooldown;
    }
    return 0;
  }

  private _updateArcherBoss(
    dt: number,
    player: Player,
    particles: ParticleSystem,
    dist: number,
    dx: number,
    dy: number,
  ): number {
    // Archer boss: keeps medium distance and fires 3-shot spreads
    const idealDist = 320;
    if (dist < idealDist - 60 && this.staggerTimer <= 0) {
      this.x -= (dx / dist) * this.speed * 0.7 * dt;
      this.y -= (dy / dist) * this.speed * 0.7 * dt;
    } else if (dist > idealDist + 80 && this.staggerTimer <= 0) {
      this.x += (dx / dist) * this.speed * dt;
      this.y += (dy / dist) * this.speed * dt;
    }
    this.walkFrame += dt * 60;
    this._clamp();

    // 3-shot spread attack
    if (dist <= this.attackRange && this.attackTimer <= 0) {
      const baseAngle = Math.atan2(player.y - this.y, player.x - this.x);
      for (let i = -1; i <= 1; i++) {
        const angle = baseAngle + i * 0.22;
        particles.spawnProjectile(
          this.x, this.y - 30,
          this.x + Math.cos(angle) * 400,
          this.y - 30 + Math.sin(angle) * 400,
          9, this.damage, true,
        );
      }
      this.attackTimer = this.attackCooldown;
    }
    return 0;
  }

  private _updateBerserker(
    dt: number,
    player: Player,
    particles: ParticleSystem,
    dist: number,
    dx: number,
    dy: number,
    allEnemies: Enemy[],
  ): number {
    const hpFrac = this.hp / this.maxHp;
    // Berserker charges at full speed when below 50% HP
    const chargeMultiplier = hpFrac < 0.25 ? 2.2 : hpFrac < 0.5 ? 1.6 : 1.0;

    if (dist > this.attackRange * 0.7 && this.staggerTimer <= 0) {
      const spd = this.speed * chargeMultiplier;
      this.x += (dx / dist) * spd * dt;
      this.y += (dy / dist) * spd * dt;
      this.walkFrame += dt * 60 * chargeMultiplier;
      this._separate(allEnemies);
    }
    this._clamp();

    // Attack – at low HP also AOE slam
    if (dist <= this.attackRange && this.attackTimer <= 0) {
      if (player.takeDamage(this.damage)) {
        particles.spawnBloodSplat(player.x, player.y, -dx / dist, -dy / dist, 12);
        particles.spawnFloatingText(player.x, player.y - 40, `-${this.damage}`, '#ff4466', 20);
      }
      // Below 50% HP: also fire shockwave projectiles outward
      if (hpFrac < 0.5) {
        const shockCount = 6;
        for (let i = 0; i < shockCount; i++) {
          const angle = (i / shockCount) * Math.PI * 2;
          particles.spawnProjectile(
            this.x, this.y - 20,
            this.x + Math.cos(angle) * 300,
            this.y - 20 + Math.sin(angle) * 300,
            8, Math.round(this.damage * 0.6), true,
          );
        }
      }
      this.attackTimer = this.attackCooldown;
    }
    return 0;
  }

  private _separate(others: Enemy[]) {
    for (const o of others) {
      if (o === this || o.isDead) continue;
      const dx = this.x - o.x;
      const dy = this.y - o.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (this.size + o.size) * 0.9;
      if (dist < minDist && dist > 0.1) {
        const push = (minDist - dist) / dist * 0.4;
        this.x += dx * push;
        this.y += dy * push;
      }
    }
  }

  private _clamp() {
    this.x = Math.max(30, Math.min(ARENA_W - 30, this.x));
    this.y = Math.max(420, Math.min(GROUND_Y + 10, this.y));
  }

  /** Deal damage to this enemy. Returns actual damage done and whether it died, plus optional HP drop. */
  takeDamage(amount: number, knockbackX: number, knockbackY: number, particles: ParticleSystem): { died: boolean; damage: number; hpDropPos?: { x: number; y: number } } {
    if (this.state === 'dying' || this.state === 'dead') return { died: false, damage: 0 };

    this.hp -= amount;
    this.staggerTimer = 0.18;
    // Knockback
    const kbLen = Math.sqrt(knockbackX * knockbackX + knockbackY * knockbackY);
    if (kbLen > 0) {
      this.x += (knockbackX / kbLen) * 25;
      this.y += (knockbackY / kbLen) * 12;
    }
    // Blood splat
    particles.spawnHitGore(this.x, this.y - 20, knockbackX, knockbackY);

    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dying';
      particles.spawnDeathGore(this.x, this.y, this.type);
      // ~30% chance to drop HP (boss always drops)
      const drops = this.type === 'boss' || Math.random() < 0.3;
      return {
        died: true,
        damage: amount,
        hpDropPos: drops ? { x: this.x, y: this.y } : undefined,
      };
    }
    return { died: false, damage: amount };
  }
}

// ── Spawning ─────────────────────────────────────────────────

export function spawnEnemiesForWave(wave: number): Enemy[] {
  const enemies: Enemy[] = [];

  const configs: Array<{ type: EnemyType; count: number }> = getWaveConfig(wave);

  for (const cfg of configs) {
    for (let i = 0; i < cfg.count; i++) {
      const pos = _randomSpawnPos();
      enemies.push(new Enemy(cfg.type, pos.x, pos.y, wave));
    }
  }
  return enemies;
}

function getWaveConfig(wave: number): Array<{ type: EnemyType; count: number }> {
  // Final boss wave (15)
  if (wave === 15) {
    return [
      { type: 'berserker_boss', count: 1 },
      { type: 'zombie_chicken', count: 4 },
      { type: 'crow', count: 3 },
    ];
  }
  // Archer boss (wave 10)
  if (wave === 10) {
    return [
      { type: 'archer_boss', count: 1 },
      { type: 'crow', count: 4 },
      { type: 'goose', count: 3 },
    ];
  }
  // Legacy boss (wave 5 mini-boss)
  if (wave === 5) {
    return [{ type: 'boss', count: 1 }, { type: 'goose', count: 4 }];
  }
  if (wave >= 12) return [
    { type: 'goose', count: 6 + wave },
    { type: 'crow', count: 4 + Math.floor(wave / 2) },
    { type: 'zombie_chicken', count: 3 + Math.floor(wave / 3) },
  ];
  if (wave >= 8) return [
    { type: 'goose', count: 3 + wave },
    { type: 'crow', count: 2 + Math.floor(wave / 2) },
    { type: 'zombie_chicken', count: 2 + Math.floor(wave / 3) },
  ];
  if (wave >= 6) return [
    { type: 'goose', count: 3 + wave },
    { type: 'crow', count: 1 + Math.floor(wave / 2) },
    { type: 'zombie_chicken', count: Math.floor(wave / 2) },
  ];
  if (wave >= 3) return [
    { type: 'goose', count: 3 + wave },
    { type: 'crow', count: Math.floor(wave / 2) },
  ];
  return [{ type: 'goose', count: 2 + wave }];
}

function _randomSpawnPos() {
  // Spawn from edges of arena
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0: return { x: -40, y: 450 + Math.random() * 120 };
    case 1: return { x: ARENA_W + 40, y: 450 + Math.random() * 120 };
    case 2: return { x: 80 + Math.random() * (ARENA_W - 160), y: ARENA_H + 40 };
    default: return { x: 80 + Math.random() * (ARENA_W - 160), y: 420 };
  }
}
