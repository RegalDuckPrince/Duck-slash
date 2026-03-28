// ============================================================
// Main Game class
// ============================================================
import type { GameState, Flower, Cloud, CharacterType, WeaponType, SkillId, HpDrop, SaulAlly, ShopItem } from './types.ts';
import { CHARACTER_CONFIGS, WEAPON_CONFIGS, SKILL_DEFS } from './types.ts';
import { InputHandler } from './input.ts';
import { Player } from './player.ts';
import { Enemy, spawnEnemiesForWave } from './enemy.ts';
import { ParticleSystem } from './particles.ts';
import {
  drawBackground, drawPlayer, drawEnemy,
  drawBloodParticles, drawFeatherParticles, drawBodyParts,
  drawBloodPools, drawSlashTrails, drawSparkles,
  drawProjectiles, drawFloatingTexts, drawHUD,
  drawMenu, drawCharSelect, drawWaveComplete, drawGameOver, drawVictory,
  drawScreenFlash, drawHpDrops, drawSkillTree,
  drawShop, drawSaulAlly, drawUpsideDownBanner,
} from './drawing.ts';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const TOTAL_WAVES = 15;
const WAVE_COMPLETE_DURATION = 3.5; // seconds before next wave auto-starts
const HP_DROP_AMOUNT = 20;
const HP_DROP_PICKUP_RADIUS = 36;

// Waves after which a shop opens (before skill tree → wave_complete)
const SHOP_WAVES = new Set([4, 8, 12]);

// Saul Goodman ally constants
const SAUL_SPAWN_CHANCE = 0.15;   // 15% per wave
const SAUL_MAX_HP = 300;
const SAUL_SPEED = 160;
const SAUL_ATTACK_RANGE = 350;
const SAUL_ATTACK_COOLDOWN = 1.4;
const SAUL_DAMAGE = 45;

const CHAR_TYPES: CharacterType[] = ['duck', 'penguin', 'parrot'];
const WEAPON_TYPES: WeaponType[] = [
  'sword', 'axe', 'spear', 'dagger', 'mace',
  'pistol', 'shotgun', 'rifle', 'sniper', 'uzi', 'minigun', 'cannon', 'burst_rifle',
];
// Bazooka is available but rare (separate roll)
const RARE_WEAPONS: WeaponType[] = ['bazooka'];

// Character card layout for selection screen
const CHAR_CARD_W = 280;
const CHAR_CARD_H = 360;
const CHAR_CARD_Y = 140;
const CHAR_CARD_STARTS = [180, 500, 820]; // x positions for each card

const ALL_SKILL_IDS: SkillId[] = [
  'sharp_claws', 'duck_boost', 'iron_feathers', 'swift_wings',
  'long_reach', 'lifesteal', 'armor', 'battle_frenzy', 'double_shot',
];

const SHOP_ITEMS: ShopItem[] = [
  { id: 'heal',        label: 'Medkit',        description: 'Restore 60 HP',            emoji: '🩹', cost: 300,  isGamble: false },
  { id: 'damage',      label: 'Power Shard',   description: '+25% damage for this run',  emoji: '⚔️',  cost: 500,  isGamble: false },
  { id: 'speed',       label: 'Speed Potion',  description: '+15% move speed',           emoji: '👟', cost: 400,  isGamble: false },
  { id: 'armor',       label: 'Duck Tape',     description: '-20% incoming damage',      emoji: '🛡️', cost: 600,  isGamble: false },
  { id: 'gamble',      label: 'Lucky Roll',    description: 'Win BIG or lose it all!',   emoji: '🎰', cost: 250,  isGamble: true  },
  { id: 'mystery',     label: 'Mystery Box',   description: 'What\'s inside???',         emoji: '🎁', cost: 800,  isGamble: true  },
];

export class Game {
  private _canvas: HTMLCanvasElement;
  private _ctx: CanvasRenderingContext2D;
  private _input: InputHandler;
  private _player: Player;
  private _enemies: Enemy[] = [];
  private _particles: ParticleSystem;
  private _state: GameState = 'menu';
  private _wave = 1;
  private _score = 0;
  private _waveTimer = 0;
  private _lastTime = 0;
  private _screenShake = 0;
  private _flashAlpha = 0;
  private _flashColor = '#ffffff';
  private _flowers: Flower[] = [];
  private _clouds: Cloud[] = [];
  private _time = 0;       // ms since page load
  private _rafId = 0;
  private _bossHpFlash = 0;
  private _selectedChar: CharacterType = 'duck';
  private _hoveredCharIdx = -1;
  private _hpDrops: HpDrop[] = [];
  private _skillChoices: SkillId[] = [];
  private _hoveredSkillIdx = -1;

  // Saul Goodman ally
  private _saulAlly: SaulAlly | null = null;

  // Upside-down effect
  private _upsideDown = false;

  // Shop state
  private _shopHoveredIdx = -1;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._canvas.width = CANVAS_W;
    this._canvas.height = CANVAS_H;
    this._ctx = canvas.getContext('2d')!;
    this._input = new InputHandler(canvas);
    this._player = new Player(CANVAS_W / 2, CANVAS_H * 0.72);
    this._particles = new ParticleSystem();
    this._generateScenery();
  }

  start() {
    this._lastTime = performance.now();
    this._loop(this._lastTime);
  }

  private _loop(timestamp: number) {
    const dt = Math.min((timestamp - this._lastTime) / 1000, 0.05);
    this._lastTime = timestamp;
    this._time = timestamp;

    this._input.frameUpdate();
    this._update(dt);
    this._render();

    this._rafId = requestAnimationFrame((t) => this._loop(t));
  }

  // ── Update ───────────────────────────────────────────────

  private _update(dt: number) {
    switch (this._state) {
      case 'menu':          this._updateMenu(); break;
      case 'char_select':   this._updateCharSelect(); break;
      case 'playing':       this._updatePlaying(dt); break;
      case 'wave_complete': this._updateWaveComplete(dt); break;
      case 'skill_tree':    this._updateSkillTree(); break;
      case 'shop':          this._updateShop(); break;
      case 'game_over':     this._updateGameOver(); break;
      case 'victory':       this._updateVictory(); break;
    }

    // Clouds drift
    for (const c of this._clouds) {
      c.x += c.speed * dt;
      if (c.x - c.width > CANVAS_W) c.x = -c.width;
    }

    // Decay timers
    if (this._screenShake > 0) this._screenShake -= dt * 3;
    if (this._flashAlpha > 0) this._flashAlpha -= dt * 4;

    // Pulse HP drops
    for (const drop of this._hpDrops) {
      drop.pulseTimer += dt;
    }
  }

  private _updateMenu() {
    if (this._input.mouseClicked || this._input.keys.has('Enter')) {
      this._state = 'char_select';
      this._hoveredCharIdx = -1;
    }
  }

  private _updateCharSelect() {
    // Detect which card the mouse is over
    const mx = this._input.mouseX;
    const my = this._input.mouseY;
    this._hoveredCharIdx = -1;
    for (let i = 0; i < CHAR_CARD_STARTS.length; i++) {
      const cx = CHAR_CARD_STARTS[i];
      if (mx >= cx && mx <= cx + CHAR_CARD_W && my >= CHAR_CARD_Y && my <= CHAR_CARD_Y + CHAR_CARD_H) {
        this._hoveredCharIdx = i;
        break;
      }
    }

    // Arrow key navigation
    if (this._input.keys.has('ArrowLeft') || this._input.keys.has('KeyA')) {
      const idx = CHAR_TYPES.indexOf(this._selectedChar);
      this._selectedChar = CHAR_TYPES[(idx + CHAR_TYPES.length - 1) % CHAR_TYPES.length];
      this._input.keys.delete('ArrowLeft');
      this._input.keys.delete('KeyA');
    }
    if (this._input.keys.has('ArrowRight') || this._input.keys.has('KeyD')) {
      const idx = CHAR_TYPES.indexOf(this._selectedChar);
      this._selectedChar = CHAR_TYPES[(idx + 1) % CHAR_TYPES.length];
      this._input.keys.delete('ArrowRight');
      this._input.keys.delete('KeyD');
    }

    // Click to select
    if (this._input.mouseClicked && this._hoveredCharIdx >= 0) {
      this._selectedChar = CHAR_TYPES[this._hoveredCharIdx];
      this._startGame();
      return;
    }

    // Enter to confirm
    if (this._input.keys.has('Enter')) {
      this._startGame();
    }
  }

  private _updateWaveComplete(dt: number) {
    this._particles.update(dt);
    this._waveTimer += dt;
    // Update dance frame
    if (this._player.isDancing) {
      // danceFrame is updated inside player.update, but player is frozen during dance
      this._player.danceFrame += dt * 60;
    }
    if (this._waveTimer >= WAVE_COMPLETE_DURATION || this._input.mouseClicked || this._input.keys.has('Enter')) {
      this._player.isDancing = false;
      this._startWave(this._wave + 1);
    }
  }

  private _updateSkillTree() {
    const mx = this._input.mouseX;
    const my = this._input.mouseY;
    this._hoveredSkillIdx = -1;

    // 3 skill cards, centered
    const cardW = 260, cardH = 320, gap = 40;
    const totalW = cardW * 3 + gap * 2;
    const startX = (CANVAS_W - totalW) / 2;
    const cardY = CANVAS_H / 2 - cardH / 2;

    for (let i = 0; i < this._skillChoices.length; i++) {
      const cx = startX + i * (cardW + gap);
      if (mx >= cx && mx <= cx + cardW && my >= cardY && my <= cardY + cardH) {
        this._hoveredSkillIdx = i;
        break;
      }
    }

    if (this._input.mouseClicked && this._hoveredSkillIdx >= 0) {
      const chosen = this._skillChoices[this._hoveredSkillIdx];
      this._player.applySkill(chosen);
      const def = SKILL_DEFS[chosen];
      this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.3,
        `${def.emoji} ${def.label}!`, '#aaffcc', 28);
      // After picking skill: show shop on shop waves, else dance celebration
      if (SHOP_WAVES.has(this._wave)) {
        this._shopHoveredIdx = -1;
        this._state = 'shop';
      } else {
        this._state = 'wave_complete';
        this._waveTimer = 0;
        this._player.isDancing = true;
        this._player.danceFrame = 0;
      }
    }
  }

  private _updateShop() {
    const mx = this._input.mouseX;
    const my = this._input.mouseY;
    this._shopHoveredIdx = -1;

    // Shop layout: 3 items per row, 2 rows, centered
    const itemW = 200, itemH = 160, gap = 20;
    const cols = 3;
    const totalW = cols * itemW + (cols - 1) * gap;
    const startX = (CANVAS_W - totalW) / 2;
    const startY = CANVAS_H / 2 - 180;

    for (let i = 0; i < SHOP_ITEMS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const ix = startX + col * (itemW + gap);
      const iy = startY + row * (itemH + gap);
      if (mx >= ix && mx <= ix + itemW && my >= iy && my <= iy + itemH) {
        this._shopHoveredIdx = i;
        break;
      }
    }

    if (this._input.mouseClicked && this._shopHoveredIdx >= 0) {
      const item = SHOP_ITEMS[this._shopHoveredIdx];
      if (this._score >= item.cost) {
        this._score -= item.cost;
        this._applyShopItem(item.id);
      } else {
        this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.3,
          '💸 Not enough points!', '#ff4466', 26);
      }
    }

    // "Leave shop" button / press Enter
    const leaveX = CANVAS_W / 2 - 120;
    const leaveY = CANVAS_H - 90;
    const leaveBtnHit = mx >= leaveX && mx <= leaveX + 240 && my >= leaveY && my <= leaveY + 50;
    if ((this._input.mouseClicked && leaveBtnHit) || this._input.keys.has('Enter')) {
      this._state = 'wave_complete';
      this._waveTimer = 0;
      this._player.isDancing = true;
      this._player.danceFrame = 0;
    }
  }

  private _applyShopItem(id: string) {
    switch (id) {
      case 'heal':
        this._player.heal(60);
        this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, '🩹 +60 HP!', '#aaffcc', 30);
        break;
      case 'damage':
        this._player.applySkill('sharp_claws');
        this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, '⚔️ Power Up!', '#ff9900', 30);
        break;
      case 'speed':
        this._player.applySkill('duck_boost');
        this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, '👟 Speed Up!', '#66ddff', 30);
        break;
      case 'armor':
        this._player.applySkill('armor');
        this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, '🛡️ Armored!', '#88ccff', 30);
        break;
      case 'gamble': {
        // Lucky Roll: 40% chance to win (1000 pts), 60% lose (nothing extra)
        if (Math.random() < 0.4) {
          const win = 500 + Math.floor(Math.random() * 1000);
          this._score += win;
          this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, `🎰 JACKPOT! +${win}pts!`, '#ffe066', 34);
          this._flashAlpha = 0.5; this._flashColor = '#ffff00';
        } else {
          this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, '🎰 Better luck next time...', '#ff4466', 26);
        }
        break;
      }
      case 'mystery': {
        // Mystery box: random prize from a pool
        const prizes = ['heal', 'damage', 'speed', 'armor', 'jackpot', 'nothing'];
        const prize = prizes[Math.floor(Math.random() * prizes.length)];
        if (prize === 'jackpot') {
          this._score += 2000;
          this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, '🎁 MEGA WIN! +2000pts!', '#ffe066', 36);
          this._flashAlpha = 0.6; this._flashColor = '#ffaa00';
        } else if (prize === 'nothing') {
          this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.28, '🎁 It was empty... 💀', '#ff8888', 26);
        } else {
          this._applyShopItem(prize);
          this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.2, '🎁 Mystery prize!', '#cc88ff', 30);
        }
        break;
      }
    }
    this._particles.spawnComboSparkles(CANVAS_W / 2, CANVAS_H / 2, 8);
  }

  private _updateGameOver() {
    if (this._input.mouseClicked || this._input.keys.has('Enter')) {
      this._state = 'char_select';
      this._hoveredCharIdx = -1;
    }
  }

  private _updateVictory() {
    if (this._input.mouseClicked || this._input.keys.has('Enter')) {
      this._state = 'char_select';
      this._hoveredCharIdx = -1;
    }
  }

  private _updatePlaying(dt: number) {
    this._player.update(dt, this._input, this._particles);
    this._particles.update(dt);

    // Update Saul ally
    if (this._saulAlly) {
      this._updateSaul(dt);
    }

    // Update enemies
    const livingEnemies = this._enemies.filter(e => !e.isDead);
    for (const enemy of livingEnemies) {
      enemy.update(dt, this._player, this._particles, livingEnemies);
    }

    // Remove fully-dead enemies
    this._enemies = this._enemies.filter(e => !e.isDead || e.dyingAlpha > 0);

    // Collision: player attack vs enemies (melee)
    if (this._player.isAttacking) {
      for (const enemy of livingEnemies) {
        if (this._player.attackHits(enemy.x, enemy.y)) {
          const dmg = this._player.attackDamage;
          const kbX = enemy.x - this._player.x;
          const kbY = enemy.y - this._player.y;
          const result = enemy.takeDamage(dmg, kbX, kbY, this._particles);
          if (result.damage > 0) {
            this._particles.spawnFloatingText(enemy.x, enemy.y - 45, `${dmg}`, '#ffe066', 20);
            // Lifesteal
            if (this._player.lifestealPct > 0) {
              const heal = Math.max(1, Math.round(dmg * this._player.lifestealPct));
              this._player.heal(heal);
            }
            this._player.registerHit(this._particles, enemy.x, enemy.y);
            if (result.died) {
              const comboBonus = Math.floor(this._player.combo * 0.5);
              const pts = enemy.scoreValue + comboBonus * 10;
              this._score += pts;
              this._particles.spawnFloatingText(enemy.x, enemy.y - 60, `+${pts}`, '#aaffcc', 18);
              this._screenShake = Math.min(this._screenShake + 0.4, 1);
              this._flashAlpha = 0.15;
              this._flashColor = '#ff2200';
              this._bossHpFlash = (enemy.type === 'boss' || enemy.type === 'archer_boss' || enemy.type === 'berserker_boss') ? 0.5 : 0;
              if (result.hpDropPos) {
                this._hpDrops.push({ x: result.hpDropPos.x, y: result.hpDropPos.y, hp: HP_DROP_AMOUNT, alpha: 1, pulseTimer: 0 });
              }
            }
          }
        }
      }
    }

    // Collision: player projectiles vs enemies
    for (let i = this._particles.projectiles.length - 1; i >= 0; i--) {
      const proj = this._particles.projectiles[i];
      if (proj.fromEnemy) continue;
      let hitAny = false;
      for (const enemy of livingEnemies) {
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const hitRadius = proj.splashRadius ? proj.splashRadius : enemy.size + 8;
        if (dx * dx + dy * dy < hitRadius * hitRadius) {
          // For bazooka splash: damage all enemies in radius
          const enemiesToDamage = proj.splashRadius
            ? livingEnemies.filter(e => {
                const ex = proj.x - e.x, ey = proj.y - e.y;
                return ex * ex + ey * ey < proj.splashRadius! * proj.splashRadius!;
              })
            : [enemy];
          for (const e of enemiesToDamage) {
            const result = e.takeDamage(proj.damage, dx, dy, this._particles);
            if (result.damage > 0) {
              this._particles.spawnFloatingText(e.x, e.y - 45, `${proj.damage}`, '#ff6600', 24);
              if (this._player.lifestealPct > 0) {
                const heal = Math.max(1, Math.round(proj.damage * this._player.lifestealPct));
                this._player.heal(heal);
              }
              this._player.registerHit(this._particles, e.x, e.y);
              if (result.died) {
                const comboBonus = Math.floor(this._player.combo * 0.5);
                const pts = e.scoreValue + comboBonus * 10;
                this._score += pts;
                this._particles.spawnFloatingText(e.x, e.y - 60, `+${pts}`, '#aaffcc', 18);
                this._screenShake = Math.min(this._screenShake + (proj.splashRadius ? 0.9 : 0.4), 1);
                this._flashAlpha = proj.splashRadius ? 0.35 : 0.15;
                this._flashColor = proj.splashRadius ? '#ff6600' : '#ff2200';
                this._bossHpFlash = (e.type === 'boss' || e.type === 'archer_boss' || e.type === 'berserker_boss') ? 0.5 : 0;
                if (result.hpDropPos) {
                  this._hpDrops.push({ x: result.hpDropPos.x, y: result.hpDropPos.y, hp: HP_DROP_AMOUNT, alpha: 1, pulseTimer: 0 });
                }
              }
            }
          }
          // Bazooka explosion effects
          if (proj.splashRadius) {
            this._particles.spawnBloodBurst(proj.x, proj.y, 20, '#ff8800');
            this._particles.spawnFloatingText(proj.x, proj.y - 30, '💥 BOOM!', '#ff6600', 32);
          }
          hitAny = true;
          break;
        }
      }
      if (hitAny) {
        this._particles.projectiles.splice(i, 1);
      }
    }

    // Collision: enemy projectiles vs player
    for (let i = this._particles.projectiles.length - 1; i >= 0; i--) {
      const proj = this._particles.projectiles[i];
      if (!proj.fromEnemy) continue;
      const dx = proj.x - this._player.x;
      const dy = proj.y - this._player.y;
      if (dx * dx + dy * dy < 30 * 30) {
        if (this._player.takeDamage(proj.damage)) {
          this._particles.spawnBloodBurst(this._player.x, this._player.y, 8);
          this._particles.spawnFloatingText(this._player.x, this._player.y - 40, `-${proj.damage}`, '#ff4466', 18);
          this._flashAlpha = Math.min(this._flashAlpha + 0.2, 0.5);
          this._flashColor = '#ff0000';
        }
        this._particles.projectiles.splice(i, 1);
      }
    }

    // Collision: player vs HP drops
    for (let i = this._hpDrops.length - 1; i >= 0; i--) {
      const drop = this._hpDrops[i];
      const dx = drop.x - this._player.x;
      const dy = drop.y - this._player.y;
      if (dx * dx + dy * dy < HP_DROP_PICKUP_RADIUS * HP_DROP_PICKUP_RADIUS) {
        if (this._player.hp < this._player.maxHp) {
          this._player.heal(drop.hp);
          this._particles.spawnFloatingText(drop.x, drop.y - 30, `+${drop.hp} HP`, '#aaffcc', 20);
          this._particles.spawnComboSparkles(drop.x, drop.y, 4);
          this._hpDrops.splice(i, 1);
        }
      }
    }

    // Check player death
    if (this._player.dead) {
      this._state = 'game_over';
      this._particles.spawnDeathGore(this._player.x, this._player.y, 'goose');
      return;
    }

    // Check wave clear – enemies are removed from the array once fully dead
    if (this._enemies.length === 0) {
      if (this._wave >= TOTAL_WAVES) {
        this._state = 'victory';
      } else {
        // Small heal between waves
        this._player.heal(20);
        this._particles.spawnFloatingText(this._player.x, this._player.y - 60, '+20 HP!', '#aaffcc', 22);
        // Show skill tree first
        this._skillChoices = _pickSkills(3);
        this._state = 'skill_tree';
      }
    }
  }

  private _updateSaul(dt: number) {
    const saul = this._saulAlly!;
    if (saul.hp <= 0) {
      saul.alpha -= dt * 1.5;
      if (saul.alpha <= 0) {
        this._saulAlly = null;
        this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.35, 'Saul is gone! 😢', '#ff8888', 26);
      }
      return;
    }

    // Find nearest living enemy
    const livingEnemies = this._enemies.filter(e => !e.isDead);
    let nearest: Enemy | null = null;
    let nearestDist = Infinity;
    for (const e of livingEnemies) {
      const dx = e.x - saul.x;
      const dy = e.y - saul.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }

    if (nearest) {
      const dx = nearest.x - saul.x;
      const dy = nearest.y - saul.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      saul.facing = dx < 0 ? 1 : -1;

      // Move toward enemy if not in range
      if (dist > SAUL_ATTACK_RANGE * 0.7) {
        const spd = SAUL_SPEED * dt;
        saul.x += (dx / dist) * spd;
        saul.y += (dy / dist) * spd;
        saul.walkFrame += dt * 60;
      }

      // Clamp to arena
      saul.x = Math.max(30, Math.min(CANVAS_W - 30, saul.x));
      saul.y = Math.max(420, Math.min(590 + 10, saul.y));

      // Attack
      saul.attackTimer -= dt;
      if (dist <= SAUL_ATTACK_RANGE && saul.attackTimer <= 0) {
        this._particles.spawnProjectile(
          saul.x, saul.y - 30,
          nearest.x, nearest.y,
          12, SAUL_DAMAGE, false, undefined, undefined, true,
        );
        saul.attackTimer = SAUL_ATTACK_COOLDOWN;
      }
    }

    // Saul takes damage from enemy projectiles
    for (let i = this._particles.projectiles.length - 1; i >= 0; i--) {
      const proj = this._particles.projectiles[i];
      if (!proj.fromEnemy) continue;
      const dx = proj.x - saul.x;
      const dy = proj.y - saul.y;
      if (dx * dx + dy * dy < 28 * 28) {
        saul.hp -= proj.damage;
        this._particles.spawnFloatingText(saul.x, saul.y - 40, `-${proj.damage}`, '#ff8888', 18);
        this._particles.projectiles.splice(i, 1);
      }
    }
  }

  // ── Render ───────────────────────────────────────────────

  private _render() {
    const ctx = this._ctx;
    ctx.save();

    // Screen shake
    if (this._screenShake > 0) {
      const mag = this._screenShake * 8;
      ctx.translate(
        (Math.random() - 0.5) * mag,
        (Math.random() - 0.5) * mag,
      );
    }

    // Upside-down effect (applied to entire canvas)
    if (this._upsideDown && (this._state === 'playing' || this._state === 'wave_complete' || this._state === 'skill_tree' || this._state === 'shop')) {
      ctx.translate(0, CANVAS_H);
      ctx.scale(1, -1);
    }

    switch (this._state) {
      case 'menu':
        drawMenu(ctx, CANVAS_W, CANVAS_H, this._time);
        break;

      case 'char_select':
        drawCharSelect(ctx, CANVAS_W, CANVAS_H,
          CHAR_TYPES.indexOf(this._selectedChar),
          this._hoveredCharIdx,
          CHAR_CARD_STARTS, CHAR_CARD_W, CHAR_CARD_H, CHAR_CARD_Y,
          this._time);
        break;

      case 'skill_tree': {
        drawBackground(ctx, CANVAS_W, CANVAS_H, this._flowers, this._clouds);
        drawSkillTree(ctx, CANVAS_W, CANVAS_H, this._skillChoices, this._hoveredSkillIdx, this._time);
        break;
      }

      case 'shop': {
        drawBackground(ctx, CANVAS_W, CANVAS_H, this._flowers, this._clouds);
        drawShop(ctx, CANVAS_W, CANVAS_H, SHOP_ITEMS, this._shopHoveredIdx, this._score, this._time);
        break;
      }

      case 'playing':
      case 'wave_complete':
      case 'game_over':
      case 'victory': {
        // Background
        drawBackground(ctx, CANVAS_W, CANVAS_H, this._flowers, this._clouds);
        // Blood pools (on ground, behind everything else)
        drawBloodPools(ctx, this._particles.bloodPools);
        // Slash trails (under enemies)
        drawSlashTrails(ctx, this._particles.slashTrails);
        // Body parts
        drawBodyParts(ctx, this._particles.bodyParts);
        // Blood particles
        drawBloodParticles(ctx, this._particles.blood);
        // Feather particles
        drawFeatherParticles(ctx, this._particles.feathers);
        // Projectiles
        drawProjectiles(ctx, this._particles.projectiles);
        // HP drops
        drawHpDrops(ctx, this._hpDrops);

        // Entities – sorted by Y for depth
        const drawables: Array<{ y: number; fn: () => void }> = [];

        // Player
        drawables.push({
          y: this._player.y,
          fn: () => drawPlayer(
            ctx,
            this._player.x, this._player.y,
            this._player.facing,
            this._player.walkFrame,
            this._player.isAttacking,
            this._player.attackProgress,
            this._player.attackAngle,
            this._player.hp,
            this._player.maxHp,
            this._player.isRolling,
            this._player.hitFlash,
            this._player.combo,
            this._player.isInvincible,
            this._player.charType,
            this._player.weaponType,
            this._player.isDancing,
            this._player.danceFrame,
          ),
        });

        // Saul ally
        if (this._saulAlly && this._saulAlly.alpha > 0) {
          const saul = this._saulAlly;
          drawables.push({
            y: saul.y,
            fn: () => drawSaulAlly(ctx, saul.x, saul.y, saul.facing, saul.walkFrame, saul.hp, saul.maxHp, saul.alpha),
          });
        }

        // Enemies
        for (const e of this._enemies) {
          drawables.push({
            y: e.y,
            fn: () => drawEnemy(
              ctx,
              e.type, e.x, e.y,
              e.facing, e.walkFrame,
              e.hp, e.maxHp,
              e.staggerTimer > 0 ? Math.min(e.staggerTimer / 0.18, 1) : 0,
              e.dyingAlpha,
            ),
          });
        }

        drawables.sort((a, b) => a.y - b.y);
        for (const d of drawables) d.fn();

        // Sparkles
        drawSparkles(ctx, this._particles.sparkles);
        // Floating texts
        drawFloatingTexts(ctx, this._particles.floatingTexts);

        // HUD
        if (this._state === 'playing') {
          drawHUD(ctx, CANVAS_W, this._player.hp, this._player.maxHp,
            this._score, this._wave, TOTAL_WAVES, this._player.comboTimer,
            this._player.weaponType, !!this._saulAlly, this._upsideDown);
        }

        // Flash overlay
        drawScreenFlash(ctx, CANVAS_W, CANVAS_H, this._flashAlpha, this._flashColor);

        // Overlay screens
        if (this._state === 'wave_complete') {
          drawWaveComplete(ctx, CANVAS_W, CANVAS_H, this._wave, this._score, this._time);
        } else if (this._state === 'game_over') {
          drawGameOver(ctx, CANVAS_W, CANVAS_H, this._score, this._wave);
        } else if (this._state === 'victory') {
          drawVictory(ctx, CANVAS_W, CANVAS_H, this._score, this._time);
        }

        // Upside-down banner (drawn last, on top)
        if (this._upsideDown && this._state === 'playing') {
          drawUpsideDownBanner(ctx, CANVAS_W, CANVAS_H, this._time);
        }
        break;
      }
    }

    ctx.restore();
  }

  // ── Helpers ───────────────────────────────────────────────

  private _startGame() {
    this._score = 0;
    this._wave = 1;
    this._player.setCharacter(this._selectedChar);
    this._player.reset(CANVAS_W / 2, CANVAS_H * 0.72);
    this._particles.clear();
    this._hpDrops = [];
    this._saulAlly = null;
    this._upsideDown = false;
    this._generateScenery();
    this._startWave(1);
  }

  private _startWave(wave: number) {
    this._wave = wave;
    this._enemies = spawnEnemiesForWave(wave);

    // Upside-down: 10% chance each wave (resets each wave)
    this._upsideDown = Math.random() < 0.10;

    // Saul Goodman: 15% chance to appear (not on boss waves to keep it cleaner)
    if (!this._saulAlly && Math.random() < SAUL_SPAWN_CHANCE) {
      const spawnX = Math.random() < 0.5 ? 80 : CANVAS_W - 80;
      this._saulAlly = {
        x: spawnX,
        y: 540,
        hp: SAUL_MAX_HP,
        maxHp: SAUL_MAX_HP,
        facing: spawnX < CANVAS_W / 2 ? 1 : -1,
        walkFrame: 0,
        attackTimer: 0,
        alpha: 1,
      };
      this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.35,
        '⚖️ Better call Saul! ⚖️', '#aaffcc', 32);
    }

    // Pick weapon (rare bazooka chance: ~3%)
    let weapon: WeaponType;
    if (Math.random() < 0.03) {
      weapon = RARE_WEAPONS[Math.floor(Math.random() * RARE_WEAPONS.length)];
    } else {
      weapon = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    }
    this._player.setWeapon(weapon);
    this._state = 'playing';
    this._hpDrops = [];
    // Flash and shake to signal new wave
    this._flashAlpha = 0.4;
    this._flashColor = '#ffffff';

    // Boss wave labels
    const isBossWave = wave === 5 || wave === 10 || wave === 15;
    const waveLabel = isBossWave
      ? (wave === 15 ? '💀 FINAL BOSS! 💀' : '👑 BOSS WAVE! 👑')
      : `⚔️  Wave ${wave}!`;
    const waveColor = isBossWave ? '#ff3344' : '#ffe066';

    this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.4, waveLabel, waveColor, 34);

    // Weapon text
    const wCfg = WEAPON_CONFIGS[weapon];
    const weaponMsg = weapon === 'bazooka'
      ? `🚀 BAZOOKA!! INSANE DAMAGE!! 🚀`
      : `${wCfg.emoji} ${wCfg.label}!`;
    const weaponColor = weapon === 'bazooka' ? '#ff6600' : '#aaddff';
    this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.5, weaponMsg, weaponColor, weapon === 'bazooka' ? 30 : 26);

    // Upside-down announcement
    if (this._upsideDown) {
      this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.6, '🙃 Reality Inverted! 🙃', '#cc88ff', 28);
    }
  }

  private _generateScenery() {
    this._flowers = [];
    for (let i = 0; i < 35; i++) {
      this._flowers.push({
        x: 40 + Math.random() * (CANVAS_W - 80),
        y: 550 + Math.random() * 100,
        color: ['#ff99bb', '#ffbbdd', '#cc88ff', '#ffddaa', '#aaddff'][Math.floor(Math.random() * 5)],
        size: 5 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
      });
    }
    this._clouds = [];
    for (let i = 0; i < 6; i++) {
      this._clouds.push({
        x: Math.random() * CANVAS_W,
        y: 40 + Math.random() * 160,
        width: 80 + Math.random() * 120,
        height: 30 + Math.random() * 40,
        speed: 8 + Math.random() * 14,
      });
    }
  }
}

/** Pick N unique random skill IDs */
function _pickSkills(n: number): SkillId[] {
  const pool = [...ALL_SKILL_IDS];
  const chosen: SkillId[] = [];
  while (chosen.length < n && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}
