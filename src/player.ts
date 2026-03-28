// ============================================================
// Player – duck hero
// ============================================================
import type { InputHandler } from './input.ts';
import type { ParticleSystem } from './particles.ts';
import { type CharacterType, type WeaponType, type SkillId, CHARACTER_CONFIGS, WEAPON_CONFIGS } from './types.ts';

const BASE_SPEED = 210;
const BASE_MAX_HP = 100;
const BASE_ATTACK_COOLDOWN = 0.38;   // seconds
const BASE_ATTACK_DURATION = 0.28;   // seconds
const BASE_ATTACK_RANGE = 92;        // pixels from player center
const BASE_DAMAGE_MIN = 28;
const BASE_DAMAGE_MAX = 42;
const ROLL_SPEED = 500;
const ROLL_DURATION = 0.32;
const ROLL_COOLDOWN = 0.9;
const INVINCIBILITY_AFTER_HIT = 1.4; // seconds
const COMBO_WINDOW = 1.6;       // seconds between hits to keep combo
const PROJECTILE_SPREAD_DISTANCE = 200; // px radius used to calculate pellet offsets

export class Player {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  hp = BASE_MAX_HP;
  maxHp = BASE_MAX_HP;
  facing = 1;            // 1 = right, -1 = left

  walkFrame = 0;
  isAttacking = false;
  attackTimer = 0;
  attackCooldown = 0;
  attackProgress = 0;
  attackAngle = 0;

  isRolling = false;
  rollTimer = 0;
  rollCooldown = 0;
  rollDirX = 0;
  rollDirY = 0;

  invincibleTimer = 0;   // seconds of invincibility
  hitFlash = 0;

  combo = 0;
  comboTimer = 0;

  dead = false;

  // Dance state (used during wave_complete)
  isDancing = false;
  danceFrame = 0;

  charType: CharacterType = 'duck';
  weaponType: WeaponType = 'sword';
  private _speedMult = 1.0;
  private _damageMult = 1.0;
  private _cooldownMult = 1.0;
  private _rangeMult = 1.0;
  private _armorMult = 1.0;     // multiplier applied to incoming damage
  comboWindowMult = 1.0;
  lifestealPct = 0;
  doubleShot = false;

  // Canvas bounds
  private _minX = 30;
  private _maxX = 1250;
  private _minY = 420;
  private _maxY = 690;

  constructor(startX: number, startY: number) {
    this.x = startX;
    this.y = startY;
  }

  get isInvincible() { return this.invincibleTimer > 0; }
  get attackRange() { return BASE_ATTACK_RANGE * WEAPON_CONFIGS[this.weaponType].rangeMult * this._rangeMult; }
  get attackDamage() {
    const wMult = WEAPON_CONFIGS[this.weaponType].damageMult;
    const mult = wMult * this._damageMult;
    const min = Math.round(BASE_DAMAGE_MIN * mult);
    const max = Math.round(BASE_DAMAGE_MAX * mult);
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  update(dt: number, input: InputHandler, particles: ParticleSystem) {
    if (this.dead) return;

    if (this.isDancing) {
      this.danceFrame += dt * 60;
      return; // freeze movement while dancing
    }

    this._handleMovement(dt, input);
    this._handleAttack(dt, input, particles);
    this._handleRoll(dt, input);
    this._tickTimers(dt);
    this._clamp();
    this.walkFrame += dt * 60 * (Math.abs(this.vx) + Math.abs(this.vy) > 10 ? 1 : 0.2);
  }

  private _handleMovement(dt: number, input: InputHandler) {
    if (this.isRolling) return;

    let mx = 0, my = 0;
    if (input.keys.has('KeyW') || input.keys.has('ArrowUp'))    my -= 1;
    if (input.keys.has('KeyS') || input.keys.has('ArrowDown'))  my += 1;
    if (input.keys.has('KeyA') || input.keys.has('ArrowLeft'))  mx -= 1;
    if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) mx += 1;

    // Normalize diagonal
    const len = Math.sqrt(mx * mx + my * my);
    if (len > 0) { mx /= len; my /= len; }

    const speed = BASE_SPEED * this._speedMult;
    this.vx += (mx * speed - this.vx) * Math.min(dt * 15, 1);
    this.vy += (my * speed - this.vy) * Math.min(dt * 15, 1);

    // Face toward mouse
    const dx = input.mouseX - this.x;
    this.facing = dx >= 0 ? 1 : -1;
  }

  private _handleAttack(dt: number, input: InputHandler, particles: ParticleSystem) {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    const wantsAttack = input.mouseClicked || input.keys.has('Space');
    const effectiveCooldown = BASE_ATTACK_COOLDOWN * this._cooldownMult * WEAPON_CONFIGS[this.weaponType].cooldownMult;
    const wCfg = WEAPON_CONFIGS[this.weaponType];

    if (!this.isAttacking && this.attackCooldown <= 0 && wantsAttack) {
      this.isAttacking = true;
      this.attackTimer = 0;
      this.attackCooldown = effectiveCooldown;
      // Store the angle toward mouse
      this.attackAngle = Math.atan2(input.mouseY - this.y, input.mouseX - this.x);

      if (wCfg.isGun) {
        // Fire projectile(s) toward cursor
        const count = (wCfg.projectileCount ?? 1) + (this.doubleShot ? 1 : 0);
        const spread = wCfg.projectileSpread ?? 0;
        const speed = wCfg.projectileSpeed ?? 14;
        const dmg = this.attackDamage;
        for (let i = 0; i < count; i++) {
          const offset = count > 1 ? (i / (count - 1) - 0.5) * spread * 2 : 0;
          particles.spawnProjectile(
            this.x, this.y - 20,
            input.mouseX + Math.cos(this.attackAngle + Math.PI / 2) * offset * PROJECTILE_SPREAD_DISTANCE,
            input.mouseY + Math.sin(this.attackAngle + Math.PI / 2) * offset * PROJECTILE_SPREAD_DISTANCE,
            speed, dmg, false,
          );
        }
      } else {
        // Slash trail for melee
        particles.addSlashTrail(this.x, this.y, this.attackAngle, this.attackRange);
      }
    }

    if (this.isAttacking) {
      this.attackTimer += dt;
      this.attackProgress = Math.min(this.attackTimer / BASE_ATTACK_DURATION, 1);
      if (this.attackTimer >= BASE_ATTACK_DURATION) {
        this.isAttacking = false;
        this.attackProgress = 0;
      }
    }
  }

  private _handleRoll(dt: number, input: InputHandler) {
    if (this.rollCooldown > 0) this.rollCooldown -= dt;

    if (!this.isRolling && this.rollCooldown <= 0 &&
        (input.keys.has('ShiftLeft') || input.keys.has('ShiftRight'))) {
      // Roll in movement direction (or facing direction)
      let rdx = 0, rdy = 0;
      if (input.keys.has('KeyW') || input.keys.has('ArrowUp'))    rdy -= 1;
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown'))  rdy += 1;
      if (input.keys.has('KeyA') || input.keys.has('ArrowLeft'))  rdx -= 1;
      if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) rdx += 1;
      if (rdx === 0 && rdy === 0) rdx = this.facing;
      const rl = Math.sqrt(rdx * rdx + rdy * rdy);
      this.rollDirX = rdx / rl;
      this.rollDirY = rdy / rl;
      this.isRolling = true;
      this.rollTimer = 0;
      this.rollCooldown = ROLL_COOLDOWN;
      this.invincibleTimer = Math.max(this.invincibleTimer, ROLL_DURATION + 0.05);
    }

    if (this.isRolling) {
      this.rollTimer += dt;
      const t = this.rollTimer / ROLL_DURATION;
      const speed = ROLL_SPEED * (1 - t * t);
      this.vx = this.rollDirX * speed;
      this.vy = this.rollDirY * speed;
      if (this.rollTimer >= ROLL_DURATION) {
        this.isRolling = false;
        this.vx = 0;
        this.vy = 0;
      }
    }
  }

  private _tickTimers(dt: number) {
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt * 3;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
  }

  private _clamp() {
    this.x += this.vx / 60;
    this.y += this.vy / 60;
    this.x = Math.max(this._minX, Math.min(this._maxX, this.x));
    this.y = Math.max(this._minY, Math.min(this._maxY, this.y));
  }

  /** Called when player is hit. Returns whether damage was taken. */
  takeDamage(amount: number): boolean {
    if (this.isInvincible || this.dead) return false;
    this.hp -= Math.round(amount * this._armorMult);
    this.hitFlash = 1;
    this.invincibleTimer = INVINCIBILITY_AFTER_HIT;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    return true;
  }

  heal(amount: number) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  /** Register a successful hit for combo tracking */
  registerHit(particles: ParticleSystem, hitX: number, hitY: number) {
    this.combo++;
    this.comboTimer = COMBO_WINDOW * this.comboWindowMult;

    const comboMilestones: Record<number, string> = {
      3: '3x COMBO!',
      5: '5x COMBO!',
      8: '8x COMBO!',
      12: '12x COMBO! 🔥',
      16: 'QUACKBERSERK!! 💀',
    };
    const label = comboMilestones[this.combo];
    if (label) {
      const color = this.combo >= 12 ? '#ff3344' : this.combo >= 8 ? '#ff9900' : '#ffe066';
      particles.spawnFloatingText(hitX, hitY - 30, label, color, 24);
      particles.spawnComboSparkles(hitX, hitY, this.combo);
    }
  }

  reset(x: number, y: number) {
    this.x = x; this.y = y;
    this.hp = this.maxHp;
    this.vx = 0; this.vy = 0;
    this.combo = 0; this.comboTimer = 0;
    this.isAttacking = false; this.attackTimer = 0; this.attackCooldown = 0;
    this.isRolling = false; this.rollTimer = 0; this.rollCooldown = 0;
    this.invincibleTimer = 0; this.hitFlash = 0;
    this.dead = false;
    this.walkFrame = 0;
    this.isDancing = false; this.danceFrame = 0;
    // Reset skill bonuses
    this._speedMult = 1.0;
    this._damageMult = 1.0;
    this._cooldownMult = 1.0;
    this._rangeMult = 1.0;
    this._armorMult = 1.0;
    this.comboWindowMult = 1.0;
    this.lifestealPct = 0;
    this.doubleShot = false;
  }

  setCharacter(type: CharacterType) {
    this.charType = type;
    const cfg = CHARACTER_CONFIGS[type];
    this._speedMult = cfg.speedMult;
    this._damageMult = cfg.damageMult;
    this._cooldownMult = cfg.attackCooldownMult;
    this.maxHp = Math.round(BASE_MAX_HP * cfg.hpMult);
    this.hp = this.maxHp;
  }

  setWeapon(type: WeaponType) {
    this.weaponType = type;
  }

  /** Apply a skill upgrade */
  applySkill(id: SkillId) {
    switch (id) {
      case 'sharp_claws':   this._damageMult   *= 1.25; break;
      case 'duck_boost':    this._speedMult    *= 1.20; break;
      case 'iron_feathers': this.maxHp += 30; this.hp = Math.min(this.maxHp, this.hp + 30); break;
      case 'swift_wings':   this._cooldownMult *= 0.75; break;
      case 'long_reach':    this._rangeMult    *= 1.30; break;
      case 'lifesteal':     this.lifestealPct  += 0.08; break;
      case 'armor':         this._armorMult    *= 0.80; break;
      case 'battle_frenzy': this.comboWindowMult *= 1.50; break;
      case 'double_shot':   this.doubleShot = true; break;
    }
  }

  /** True if the attack arc currently overlaps the given position (melee only) */
  attackHits(ex: number, ey: number): boolean {
    if (!this.isAttacking) return false;
    if (WEAPON_CONFIGS[this.weaponType].isGun) return false; // guns use projectiles
    const dx = ex - this.x;
    const dy = ey - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.attackRange * 1.1) return false;

    // Arc: swing covers 150° centered on attackAngle (mirrored by facing)
    const dirAngle = this.facing >= 0
      ? this.attackAngle
      : Math.PI - this.attackAngle;
    const arcStart = dirAngle - Math.PI * 0.6;
    const arcEnd   = dirAngle + Math.PI * 0.75;
    let toEnemy = Math.atan2(dy, this.facing >= 0 ? dx : -dx);
    // normalize angle diff
    while (toEnemy < arcStart - Math.PI) toEnemy += Math.PI * 2;
    while (toEnemy > arcStart + Math.PI) toEnemy -= Math.PI * 2;
    return toEnemy >= arcStart && toEnemy <= arcEnd;
  }
}
