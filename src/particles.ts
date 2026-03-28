// ============================================================
// Particle / Gore system
// ============================================================
import type {
  BloodParticle, FeatherParticle, BodyPart, BloodPool,
  FloatingText, Sparkle, SlashTrail, Projectile, EnemyType,
} from './types.ts';

const GROUND_Y = 590; // approximate ground level for blood pools

export class ParticleSystem {
  blood: BloodParticle[] = [];
  feathers: FeatherParticle[] = [];
  bodyParts: BodyPart[] = [];
  bloodPools: BloodPool[] = [];
  floatingTexts: FloatingText[] = [];
  sparkles: Sparkle[] = [];
  slashTrails: SlashTrail[] = [];
  projectiles: Projectile[] = [];

  // ── Spawn helpers ─────────────────────────────────────────

  spawnBloodBurst(x: number, y: number, count: number, color = '#cc0000') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 12;
      this.blood.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        radius: 2 + Math.random() * 5,
        alpha: 0.85 + Math.random() * 0.15,
        color: Math.random() < 0.3 ? '#880000' : color,
        gravity: 0.25 + Math.random() * 0.1,
        bounced: false,
      });
    }
  }

  spawnBloodSplat(x: number, y: number, dirX: number, dirY: number, count: number) {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 0.9;
      const baseAngle = Math.atan2(dirY, dirX) + spread;
      const speed = 3 + Math.random() * 14;
      this.blood.push({
        x, y,
        vx: Math.cos(baseAngle) * speed,
        vy: Math.sin(baseAngle) * speed - Math.random() * 5,
        radius: 1.5 + Math.random() * 6,
        alpha: 0.9,
        color: Math.random() < 0.25 ? '#880000' : '#cc0011',
        gravity: 0.22 + Math.random() * 0.12,
        bounced: false,
      });
    }
  }

  spawnFeathers(x: number, y: number, count: number, colors: string[]) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 7;
      this.feathers.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.25,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.9,
        size: 6 + Math.random() * 14,
        gravity: 0.08 + Math.random() * 0.08,
      });
    }
  }

  spawnBodyPart(x: number, y: number, partType: BodyPart['partType'], enemyType: EnemyType) {
    const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI;
    const speed = 5 + Math.random() * 10;
    this.bodyParts.push({
      partType,
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      alpha: 1,
      enemyType,
      size: partType === 'guts' ? 12 : (enemyType === 'boss' ? 20 : 14),
      gravity: 0.3,
      bounced: false,
    });
  }

  spawnBloodPool(x: number, y: number, radius: number) {
    // Merge nearby pools
    for (const pool of this.bloodPools) {
      const dx = pool.x - x;
      const dy = pool.y - y;
      if (dx * dx + dy * dy < 40 * 40) {
        pool.radius = Math.min(pool.radius + radius * 0.6, 80);
        return;
      }
    }
    this.bloodPools.push({ x, y: GROUND_Y, radius, alpha: 0.85 });
    if (this.bloodPools.length > 60) this.bloodPools.shift();
  }

  spawnDeathGore(x: number, y: number, type: EnemyType) {
    const isLarge = type === 'boss';
    const count = isLarge ? 60 : 40;

    this.spawnBloodBurst(x, y, count);
    // Extra dark blood
    for (let i = 0; i < count * 0.4; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1 + Math.random() * 8;
      this.blood.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 3,
        radius: 3 + Math.random() * 7,
        alpha: 1,
        color: '#660000',
        gravity: 0.2,
        bounced: false,
      });
    }

    const featherColors = type === 'crow'
      ? ['#222230', '#333340', '#444450', '#555560']
      : type === 'zombie_chicken'
      ? ['#788858', '#8a9968', '#6a7848']
      : type === 'boss'
      ? ['#e0e0ff', '#d0d0ee', '#c8c8f0']
      : ['#e0e0f8', '#d0d0f0', '#c8c8e8'];

    this.spawnFeathers(x, y, isLarge ? 30 : 18, featherColors);

    this.spawnBodyPart(x - 10, y, 'wing', type);
    this.spawnBodyPart(x + 10, y, 'wing', type);
    this.spawnBodyPart(x, y - 10, 'head', type);
    if (isLarge) {
      this.spawnBodyPart(x + 15, y, 'wing', type);
      this.spawnBodyPart(x, y + 5, 'guts', type);
    }
    this.spawnBodyPart(x, y + 5, 'guts', type);
    this.spawnBloodPool(x, GROUND_Y, isLarge ? 50 : 28);
  }

  spawnHitGore(x: number, y: number, dirX: number, dirY: number) {
    this.spawnBloodSplat(x, y, dirX, dirY, 12);
  }

  spawnFloatingText(x: number, y: number, text: string, color: string, size = 22) {
    this.floatingTexts.push({
      x, y,
      text, color,
      alpha: 1,
      vy: -1.5,
      size,
      timer: 0,
      maxTimer: 80,
    });
  }

  spawnSparkle(x: number, y: number, color: string) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    this.sparkles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      color,
      alpha: 1,
      size: 4 + Math.random() * 8,
      timer: 0,
    });
  }

  spawnComboSparkles(x: number, y: number, combo: number) {
    const colors = ['#ffe066', '#ff99cc', '#99ccff', '#aaffcc', '#ffcc99'];
    for (let i = 0; i < Math.min(combo * 2, 16); i++) {
      this.spawnSparkle(x, y, colors[i % colors.length]);
    }
  }

  addSlashTrail(x: number, y: number, angle: number, radius: number) {
    this.slashTrails.push({
      x, y, angle,
      startAngle: -Math.PI * 0.8,
      endAngle: Math.PI * 0.7,
      radius,
      alpha: 1,
      timer: 12,
      maxTimer: 12,
    });
  }

  spawnProjectile(x: number, y: number, targetX: number, targetY: number, speed: number, damage: number, fromEnemy: boolean, splashRadius?: number, isRocket?: boolean, isSaul?: boolean) {
    const angle = Math.atan2(targetY - y, targetX - x);
    this.projectiles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      damage,
      fromEnemy,
      splashRadius,
      isRocket,
      isSaul,
    });
  }

  // ── Update ────────────────────────────────────────────────

  update(dt: number) {
    this._updateBlood(dt);
    this._updateFeathers(dt);
    this._updateBodyParts(dt);
    this._updateFloatingTexts(dt);
    this._updateSparkles(dt);
    this._updateSlashTrails(dt);
    this._updateProjectiles(dt);
  }

  private _updateBlood(dt: number) {
    const s = dt * 60;
    for (let i = this.blood.length - 1; i >= 0; i--) {
      const p = this.blood[i];
      p.vx *= 0.96;
      p.vy += p.gravity * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      // bounce on ground
      if (p.y > GROUND_Y && !p.bounced) {
        p.y = GROUND_Y;
        p.vy = -p.vy * 0.3;
        p.vx *= 0.7;
        p.bounced = true;
        // Spawn tiny pool splatter
        if (Math.random() < 0.12) {
          this.bloodPools.push({
            x: p.x,
            y: GROUND_Y,
            radius: p.radius * 2,
            alpha: 0.5,
          });
        }
      }
      p.alpha -= 0.006 * s;
      if (p.alpha <= 0) this.blood.splice(i, 1);
    }
    // Cap
    if (this.blood.length > 600) this.blood.splice(0, this.blood.length - 600);
  }

  private _updateFeathers(dt: number) {
    const s = dt * 60;
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const p = this.feathers[i];
      p.vx *= 0.97;
      p.vy += p.gravity * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.rotation += p.rotSpeed * s;
      if (p.y > GROUND_Y) { p.y = GROUND_Y; p.vy = 0; p.vx *= 0.6; }
      p.alpha -= 0.004 * s;
      if (p.alpha <= 0) this.feathers.splice(i, 1);
    }
    if (this.feathers.length > 300) this.feathers.splice(0, this.feathers.length - 300);
  }

  private _updateBodyParts(dt: number) {
    const s = dt * 60;
    for (let i = this.bodyParts.length - 1; i >= 0; i--) {
      const p = this.bodyParts[i];
      p.vx *= 0.97;
      p.vy += p.gravity * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.rotation += p.rotSpeed * s;
      if (p.y > GROUND_Y && !p.bounced) {
        p.y = GROUND_Y;
        p.vy = -p.vy * 0.25;
        p.vx *= 0.5;
        p.rotSpeed *= 0.3;
        p.bounced = true;
        // Blood pool where part lands
        this.bloodPools.push({ x: p.x, y: GROUND_Y, radius: p.size * 1.5, alpha: 0.6 });
      }
      p.alpha -= 0.003 * s;
      if (p.alpha <= 0) this.bodyParts.splice(i, 1);
    }
    if (this.bodyParts.length > 80) this.bodyParts.splice(0, this.bodyParts.length - 80);
  }

  private _updateFloatingTexts(dt: number) {
    const s = dt * 60;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * s;
      t.timer += s;
      t.vy *= 0.97;
      t.alpha = Math.max(0, 1 - t.timer / t.maxTimer);
      if (t.alpha <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  private _updateSparkles(dt: number) {
    const s = dt * 60;
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const sp = this.sparkles[i];
      sp.x += sp.vx * s;
      sp.y += sp.vy * s;
      sp.vy += 0.05 * s;
      sp.timer += s;
      sp.alpha = Math.max(0, 1 - sp.timer / 40);
      if (sp.alpha <= 0) this.sparkles.splice(i, 1);
    }
    if (this.sparkles.length > 200) this.sparkles.splice(0, this.sparkles.length - 200);
  }

  private _updateSlashTrails(dt: number) {
    const s = dt * 60;
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      const t = this.slashTrails[i];
      t.timer -= s;
      if (t.timer <= 0) this.slashTrails.splice(i, 1);
    }
  }

  private _updateProjectiles(dt: number) {
    const s = dt * 60;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.alpha -= 0.008 * s;
      if (p.alpha <= 0 || p.x < -50 || p.x > 1330 || p.y < -50 || p.y > 770) {
        this.projectiles.splice(i, 1);
      }
    }
  }

  clear() {
    this.blood = [];
    this.feathers = [];
    this.bodyParts = [];
    this.bloodPools = [];
    this.floatingTexts = [];
    this.sparkles = [];
    this.slashTrails = [];
    this.projectiles = [];
  }
}
