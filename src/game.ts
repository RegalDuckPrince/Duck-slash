// ============================================================
// Main Game class
// ============================================================
import type { GameState, Flower, Cloud, CharacterType, WeaponType, SkillId, HpDrop } from './types.ts';
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
} from './drawing.ts';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const TOTAL_WAVES = 10;
const WAVE_COMPLETE_DURATION = 3.5; // seconds before next wave auto-starts
const HP_DROP_AMOUNT = 20;
const HP_DROP_PICKUP_RADIUS = 36;

const CHAR_TYPES: CharacterType[] = ['duck', 'penguin', 'parrot'];
const WEAPON_TYPES: WeaponType[] = [
  'sword', 'axe', 'spear', 'dagger', 'mace',
  'pistol', 'shotgun', 'rifle', 'sniper', 'uzi', 'minigun', 'cannon', 'burst_rifle',
];

// Character card layout for selection screen
const CHAR_CARD_W = 280;
const CHAR_CARD_H = 360;
const CHAR_CARD_Y = 140;
const CHAR_CARD_STARTS = [180, 500, 820]; // x positions for each card

const ALL_SKILL_IDS: SkillId[] = [
  'sharp_claws', 'duck_boost', 'iron_feathers', 'swift_wings',
  'long_reach', 'lifesteal', 'armor', 'battle_frenzy', 'double_shot',
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
      // Transition to wave_complete / next wave
      this._state = 'wave_complete';
      this._waveTimer = 0;
      this._player.isDancing = true;
      this._player.danceFrame = 0;
    }
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
              this._bossHpFlash = enemy.type === 'boss' ? 0.5 : 0;
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
      for (const enemy of livingEnemies) {
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        if (dx * dx + dy * dy < (enemy.size + 8) * (enemy.size + 8)) {
          const result = enemy.takeDamage(proj.damage, dx, dy, this._particles);
          if (result.damage > 0) {
            this._particles.spawnFloatingText(enemy.x, enemy.y - 45, `${proj.damage}`, '#ffe066', 20);
            // Lifesteal
            if (this._player.lifestealPct > 0) {
              const heal = Math.max(1, Math.round(proj.damage * this._player.lifestealPct));
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
              this._bossHpFlash = enemy.type === 'boss' ? 0.5 : 0;
              if (result.hpDropPos) {
                this._hpDrops.push({ x: result.hpDropPos.x, y: result.hpDropPos.y, hp: HP_DROP_AMOUNT, alpha: 1, pulseTimer: 0 });
              }
            }
          }
          this._particles.projectiles.splice(i, 1);
          break;
        }
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
            this._player.weaponType);
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
    this._generateScenery();
    this._startWave(1);
  }

  private _startWave(wave: number) {
    this._wave = wave;
    this._enemies = spawnEnemiesForWave(wave);
    // Assign a random weapon for this wave
    const weapon = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    this._player.setWeapon(weapon);
    this._state = 'playing';
    this._hpDrops = [];
    // Flash and shake to signal new wave
    this._flashAlpha = 0.4;
    this._flashColor = '#ffffff';
    // Floating wave text
    this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.4,
      wave === TOTAL_WAVES ? '💀 BOSS WAVE! 💀' : `⚔️  Wave ${wave}!`,
      wave === TOTAL_WAVES ? '#ff3344' : '#ffe066', 34);
    // Floating weapon text
    const wCfg = WEAPON_CONFIGS[weapon];
    this._particles.spawnFloatingText(CANVAS_W / 2, CANVAS_H * 0.5,
      `${wCfg.emoji} ${wCfg.label}!`, '#aaddff', 26);
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
