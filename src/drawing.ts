// ============================================================
// Drawing helpers – all procedural canvas art
// ============================================================
import type { EnemyType, BloodPool, BloodParticle, FeatherParticle, BodyPart,
  SlashTrail, FloatingText, Sparkle, Projectile, Flower, Cloud } from './types.ts';

// ── Utility ──────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Background ───────────────────────────────────────────────

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, flowers: Flower[], clouds: Cloud[]) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
  sky.addColorStop(0, '#c9b8f5');
  sky.addColorStop(0.5, '#e8d5f5');
  sky.addColorStop(1, '#ffd6e7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.65);

  // Clouds
  ctx.save();
  for (const c of clouds) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.width, c.height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.width * 0.5, c.y - c.height * 0.4, c.width * 0.7, c.height * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.width * 0.5, c.y - c.height * 0.3, c.width * 0.6, c.height * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Rolling hill
  const hillGrad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  hillGrad.addColorStop(0, '#90e067');
  hillGrad.addColorStop(0.4, '#6abf3e');
  hillGrad.addColorStop(1, '#4a9e28');
  ctx.fillStyle = hillGrad;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.68);
  ctx.bezierCurveTo(w * 0.25, h * 0.56, w * 0.75, h * 0.60, w, h * 0.65);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Darker ground strip
  const gnd = ctx.createLinearGradient(0, h * 0.82, 0, h);
  gnd.addColorStop(0, '#4a9e28');
  gnd.addColorStop(1, '#2e6b15');
  ctx.fillStyle = gnd;
  ctx.fillRect(0, h * 0.82, w, h * 0.18);

  // Flowers
  for (const f of flowers) {
    drawFlower(ctx, f.x, f.y, f.color, f.size, f.rotation);
  }
}

function drawFlower(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, size: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // stem
  ctx.strokeStyle = '#3a7d12';
  ctx.lineWidth = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, size * 1.5);
  ctx.stroke();
  // petals
  ctx.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7, size * 0.45, size * 0.3, a, 0, Math.PI * 2);
    ctx.fill();
  }
  // center
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Player Duck ──────────────────────────────────────────────

export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  walkFrame: number,
  isAttacking: boolean,
  attackProgress: number,
  attackAngle: number,
  hp: number,
  maxHp: number,
  isRolling: boolean,
  rollAlpha: number,
  combo: number,
  invincible: boolean,
) {
  ctx.save();
  ctx.translate(x, y);

  // Invincibility flash
  if (invincible && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  if (facing < 0) ctx.scale(-1, 1);

  const bob = Math.sin(walkFrame * 0.18) * 2.5;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 30 + bob, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Sword (draw behind body if not attacking) ────────────
  if (!isAttacking) {
    ctx.save();
    ctx.translate(16, -8 + bob);
    ctx.rotate(0.35);
    _drawSword(ctx, 0.75);
    ctx.restore();
  }

  // ── Body ─────────────────────────────────────────────────
  // Tail feathers
  ctx.fillStyle = '#e8c800';
  ctx.beginPath();
  ctx.ellipse(-14, 4 + bob, 9, 14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.ellipse(-13, 2 + bob, 7, 11, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(2, 0 + bob, 2, 2, 2 + bob, 28);
  bodyGrad.addColorStop(0, '#ffe033');
  bodyGrad.addColorStop(1, '#e8b800');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 5 + bob, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  // outline
  ctx.strokeStyle = '#c9a000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belly
  ctx.fillStyle = '#fff8d0';
  ctx.beginPath();
  ctx.ellipse(4, 10 + bob, 12, 19, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Armor breastplate
  ctx.fillStyle = '#a0b4cc';
  ctx.beginPath();
  ctx.ellipse(3, 6 + bob, 11, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6e8ca8';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  // Armor detail lines
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(3 + i * 4, -5 + bob);
    ctx.lineTo(3 + i * 4, 18 + bob);
    ctx.stroke();
  }

  // Wing
  const wf = isRolling ? 0.9 : Math.sin(walkFrame * 0.18) * 0.25;
  ctx.fillStyle = '#f0c800';
  ctx.save();
  ctx.translate(-8, 0 + bob);
  ctx.rotate(-wf);
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 17, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a000';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Head
  const headGrad = ctx.createRadialGradient(6, -22 + bob, 3, 6, -22 + bob, 16);
  headGrad.addColorStop(0, '#ffe033');
  headGrad.addColorStop(1, '#e8b800');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(6, -22 + bob, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a000';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tiny helmet/cap
  ctx.fillStyle = '#b0c8e8';
  ctx.beginPath();
  ctx.ellipse(6, -32 + bob, 14, 9, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7898b8';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Helmet crest
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  ctx.ellipse(6, -39 + bob, 3, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bill
  ctx.fillStyle = '#ff8c00';
  ctx.beginPath();
  ctx.moveTo(20, -21 + bob);
  ctx.lineTo(32, -24 + bob);
  ctx.lineTo(30, -19 + bob);
  ctx.lineTo(20, -18 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c96000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Eye white
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(14, -24 + bob, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Eye pupil (tracks attack angle loosely)
  const eyeOffX = isAttacking ? 2 : 1;
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(14 + eyeOffX, -24 + bob, 4.5, 0, Math.PI * 2);
  ctx.fill();

  // Eye highlight
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(16 + eyeOffX, -26 + bob, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(13 + eyeOffX, -23 + bob, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Blush
  ctx.fillStyle = 'rgba(255, 130, 160, 0.45)';
  ctx.beginPath();
  ctx.ellipse(10, -19 + bob, 5.5, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Attacking sword swing ─────────────────────────────────
  if (isAttacking) {
    ctx.save();
    // sword pivots at player's arm
    ctx.translate(12, -8 + bob);
    // attackAngle is in world space; facing already flipped ctx via scale
    const localAngle = -Math.PI * 0.8 + attackProgress * Math.PI * 1.5;
    ctx.rotate(localAngle);
    _drawSword(ctx, 1);
    ctx.restore();

    // Slash arc glow
    ctx.save();
    ctx.translate(12, -8 + bob);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    const a0 = -Math.PI * 0.8;
    const a1 = a0 + attackProgress * Math.PI * 1.5;
    ctx.arc(0, 0, 55, a0, a1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(180, 220, 255, 0.3)';
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // ── HP bar (above player) ────────────────────────────────
  _drawBar(ctx, x - 30, y - 75, 60, 9, hp / maxHp, '#ff4466', '#ff99bb', '#2a0010');

  // ── Combo display ────────────────────────────────────────
  if (combo >= 2) {
    ctx.save();
    ctx.font = `bold ${14 + Math.min(combo, 10)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = combo >= 8 ? '#ff3344' : combo >= 4 ? '#ff9900' : '#ffe066';
    ctx.strokeStyle = '#2a1000';
    ctx.lineWidth = 3;
    ctx.strokeText(`${combo}x COMBO!`, x, y - 85);
    ctx.fillText(`${combo}x COMBO!`, x, y - 85);
    ctx.restore();
  }
}

function _drawSword(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  // Blade glow
  ctx.shadowColor = '#88ccff';
  ctx.shadowBlur = 8;
  // Blade
  const bladeGrad = ctx.createLinearGradient(-3, -65, 3, -65);
  bladeGrad.addColorStop(0, '#e0eeff');
  bladeGrad.addColorStop(0.5, '#c0d8f8');
  bladeGrad.addColorStop(1, '#a0bcf0');
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(-2.5, 0);
  ctx.lineTo(-1.5, -55);
  ctx.lineTo(0, -65);
  ctx.lineTo(1.5, -55);
  ctx.lineTo(2.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7090d0';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.shadowBlur = 0;
  // Crossguard
  ctx.fillStyle = '#c8a040';
  roundRect(ctx, -12, -8, 24, 6, 3);
  ctx.fill();
  ctx.strokeStyle = '#806020';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Handle
  ctx.fillStyle = '#7a4420';
  roundRect(ctx, -3.5, -2, 7, 16, 2);
  ctx.fill();
  ctx.strokeStyle = '#4a2810';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Handle wrapping
  ctx.strokeStyle = '#c8a040';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-3.5, 2 + i * 4);
    ctx.lineTo(3.5, 2 + i * 4);
    ctx.stroke();
  }
  // Pommel
  ctx.fillStyle = '#c8a040';
  ctx.beginPath();
  ctx.arc(0, 14, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#806020';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// ── Enemy drawing ────────────────────────────────────────────

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  type: EnemyType,
  x: number,
  y: number,
  facing: number,
  walkFrame: number,
  hp: number,
  maxHp: number,
  staggerAlpha: number,
  dyingAlpha: number,
) {
  ctx.save();
  ctx.translate(x, y);
  if (facing < 0) ctx.scale(-1, 1);
  ctx.globalAlpha = dyingAlpha;

  // Hit flash
  if (staggerAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(staggerAlpha * dyingAlpha, 1);
    ctx.globalCompositeOperation = 'source-over';
  }

  switch (type) {
    case 'goose': _drawGoose(ctx, walkFrame, staggerAlpha); break;
    case 'crow':  _drawCrow(ctx, walkFrame, staggerAlpha);  break;
    case 'zombie_chicken': _drawZombieChicken(ctx, walkFrame, staggerAlpha); break;
    case 'boss':  _drawBoss(ctx, walkFrame, staggerAlpha, hp, maxHp); break;
  }

  if (staggerAlpha > 0) ctx.restore();
  ctx.restore();

  // HP bar
  if (dyingAlpha > 0.5 && hp > 0) {
    const bw = type === 'boss' ? 100 : 50;
    _drawBar(ctx, x - bw / 2, y - (type === 'boss' ? 90 : 60), bw, 6, hp / maxHp, '#ff3322', '#ff8877', '#200000');
  }
}

function _drawGoose(ctx: CanvasRenderingContext2D, frame: number, hit: number) {
  const bob = Math.sin(frame * 0.18) * 2;
  if (hit > 0) {
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 20 * hit;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 35, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.strokeStyle = '#ff8800';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const footWobble = Math.sin(frame * 0.2) * 8;
  for (const [ox, fw] of [[-6, footWobble], [6, -footWobble]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(ox, 32);
    ctx.lineTo(ox + fw, 42);
    ctx.stroke();
    // toes
    ctx.beginPath();
    ctx.moveTo(ox + fw, 42);
    for (const ta of [-0.35, 0, 0.35]) {
      ctx.moveTo(ox + fw, 42);
      ctx.lineTo(ox + fw + Math.cos(ta + 1.2) * 8, 42 + Math.sin(ta + 1.2) * 5);
    }
    ctx.stroke();
  }

  // Body
  const bodyGrad = ctx.createRadialGradient(0, 5, 2, 2, 5 + bob, 26);
  bodyGrad.addColorStop(0, '#ffffff');
  bodyGrad.addColorStop(1, '#d0d0e8');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 8 + bob, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a0a0c0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wing
  ctx.fillStyle = '#c8c8e0';
  ctx.beginPath();
  ctx.ellipse(-10, 5 + bob + Math.sin(frame * 0.18) * 3, 9, 20, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Long neck
  ctx.fillStyle = '#f0f0ff';
  ctx.beginPath();
  ctx.moveTo(-5, -10 + bob);
  ctx.bezierCurveTo(-8, -25 + bob, 2, -40 + bob, 8, -50 + bob);
  ctx.bezierCurveTo(15, -52 + bob, 15, -50 + bob, 12, -48 + bob);
  ctx.bezierCurveTo(8, -38 + bob, 0, -22 + bob, 5, -10 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c0c0d8';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Head
  ctx.fillStyle = '#f5f5ff';
  ctx.beginPath();
  ctx.arc(10, -52 + bob, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b0b0d0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Evil eye (orange)
  ctx.fillStyle = '#ff7700';
  ctx.beginPath();
  ctx.arc(17, -55 + bob, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0000';
  ctx.beginPath();
  ctx.arc(18, -55 + bob, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(19, -57 + bob, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Beak (menacing)
  ctx.fillStyle = '#e07000';
  ctx.beginPath();
  ctx.moveTo(22, -52 + bob);
  ctx.lineTo(34, -53 + bob);
  ctx.lineTo(32, -49 + bob);
  ctx.lineTo(22, -50 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d06000';
  ctx.beginPath();
  ctx.moveTo(22, -52 + bob);
  ctx.lineTo(33, -53 + bob);
  ctx.lineTo(33, -52 + bob);
  ctx.lineTo(22, -52 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
}

function _drawCrow(ctx: CanvasRenderingContext2D, frame: number, hit: number) {
  const bob = Math.sin(frame * 0.22) * 2;
  if (hit > 0) {
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 20 * hit;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 28, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const fw = Math.sin(frame * 0.22) * 6;
  for (const [ox, f] of [[-4, fw], [4, -fw]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(ox, 25);
    ctx.lineTo(ox + f, 35);
    ctx.stroke();
    ctx.beginPath();
    for (const ta of [-0.4, 0, 0.4]) {
      ctx.moveTo(ox + f, 35);
      ctx.lineTo(ox + f + Math.cos(ta + 1.3) * 7, 35 + Math.sin(ta + 1.3) * 4);
    }
    ctx.stroke();
  }

  // Body
  const bodyGrad = ctx.createRadialGradient(0, 3, 2, 2, 3 + bob, 20);
  bodyGrad.addColorStop(0, '#3a3a4e');
  bodyGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 5 + bob, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#505060';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wings (spread for cool look)
  ctx.fillStyle = '#252535';
  ctx.save();
  ctx.translate(-8, 0 + bob);
  ctx.rotate(Math.sin(frame * 0.22) * 0.3 - 0.3);
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(-18, 5);
  ctx.lineTo(-12, 20);
  ctx.lineTo(0, 15);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Head
  const headGrad = ctx.createRadialGradient(4, -22, 2, 4, -22 + bob, 13);
  headGrad.addColorStop(0, '#3a3a4e');
  headGrad.addColorStop(1, '#1a1a2e');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(4, -22 + bob, 13, 0, Math.PI * 2);
  ctx.fill();

  // Glowing red eyes
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#ff2222';
  ctx.beginPath();
  ctx.arc(10, -25 + bob, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0000';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(11, -25 + bob, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,100,100,0.8)';
  ctx.beginPath();
  ctx.arc(12, -26.5 + bob, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Sharp beak
  ctx.fillStyle = '#555560';
  ctx.beginPath();
  ctx.moveTo(15, -22 + bob);
  ctx.lineTo(26, -25 + bob);
  ctx.lineTo(24, -21 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#333340';
  ctx.beginPath();
  ctx.moveTo(15, -22 + bob);
  ctx.lineTo(25, -23 + bob);
  ctx.lineTo(25, -22 + bob);
  ctx.lineTo(15, -22 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;
}

function _drawZombieChicken(ctx: CanvasRenderingContext2D, frame: number, hit: number) {
  const bob = Math.sin(frame * 0.12) * 1.5;
  const wobble = Math.sin(frame * 0.12) * 0.08;
  if (hit > 0) {
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 20 * hit;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(0, 38, 19, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.strokeStyle = '#887766';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const fw = Math.sin(frame * 0.12) * 5;
  for (const [ox, f] of [[-5, fw], [5, -fw]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(ox, 34);
    ctx.lineTo(ox + f, 44);
    ctx.stroke();
    ctx.beginPath();
    for (const ta of [-0.3, 0, 0.35]) {
      ctx.moveTo(ox + f, 44);
      ctx.lineTo(ox + f + Math.cos(ta + 1.2) * 7, 44 + Math.sin(ta + 1.2) * 4);
    }
    ctx.stroke();
  }

  ctx.save();
  ctx.rotate(wobble);

  // Body (rotting brownish-green)
  const bodyGrad = ctx.createRadialGradient(0, 5, 2, 2, 5 + bob, 24);
  bodyGrad.addColorStop(0, '#8a9960');
  bodyGrad.addColorStop(0.6, '#6a7940');
  bodyGrad.addColorStop(1, '#4a5920');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 8 + bob, 20, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a4910';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Stitches on body
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.moveTo(-5, -5 + bob);
  ctx.lineTo(-5, 22 + bob);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, -2 + bob);
  ctx.lineTo(8, 18 + bob);
  ctx.stroke();
  ctx.setLineDash([]);

  // Wing
  ctx.fillStyle = '#78884e';
  ctx.beginPath();
  ctx.ellipse(-9, 3 + bob + Math.sin(frame * 0.12) * 2, 8, 18, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // Head (slightly detached look)
  ctx.fillStyle = '#8a9960';
  ctx.beginPath();
  ctx.arc(4, -22 + bob, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a4910';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Comb
  ctx.fillStyle = '#993322';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-2 + i * 4, -34 + bob + Math.sin(i) * 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // One X eye (dead)
  ctx.strokeStyle = '#cc2222';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(7, -26 + bob);
  ctx.lineTo(13, -20 + bob);
  ctx.moveTo(13, -26 + bob);
  ctx.lineTo(7, -20 + bob);
  ctx.stroke();

  // One regular creepy eye
  ctx.fillStyle = '#ddeebb';
  ctx.beginPath();
  ctx.arc(-1, -24 + bob, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#440044';
  ctx.beginPath();
  ctx.arc(-1, -24 + bob, 3, 0, Math.PI * 2);
  ctx.fill();

  // Broken beak
  ctx.fillStyle = '#c8a040';
  ctx.beginPath();
  ctx.moveTo(16, -20 + bob);
  ctx.lineTo(26, -23 + bob);
  ctx.lineTo(24, -19 + bob);
  ctx.lineTo(16, -19 + bob);
  ctx.closePath();
  ctx.fill();
  // missing chunk
  ctx.fillStyle = '#3a4910';
  ctx.beginPath();
  ctx.arc(22, -21 + bob, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
  ctx.shadowBlur = 0;
}

function _drawBoss(ctx: CanvasRenderingContext2D, frame: number, hit: number, hp: number, maxHp: number) {
  const bob = Math.sin(frame * 0.1) * 4;
  const hpFrac = hp / maxHp;
  const rage = hpFrac < 0.33;
  const enraged = hpFrac < 0.5;

  if (hit > 0) {
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 40 * hit;
  }

  ctx.save();
  ctx.scale(1.8, 1.8);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 42, 30, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Crown
  const crownColor = rage ? '#ff3300' : '#ffd700';
  ctx.fillStyle = crownColor;
  ctx.beginPath();
  ctx.moveTo(-18, -68 + bob);
  ctx.lineTo(-18, -80 + bob);
  ctx.lineTo(-10, -72 + bob);
  ctx.lineTo(0, -84 + bob);
  ctx.lineTo(10, -72 + bob);
  ctx.lineTo(18, -80 + bob);
  ctx.lineTo(18, -68 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rage ? '#cc2200' : '#cc9900';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Crown jewels
  ctx.fillStyle = rage ? '#ff0000' : '#ff4488';
  ctx.beginPath();
  ctx.arc(0, -78 + bob, 4, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.strokeStyle = '#e07800';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const fw = Math.sin(frame * 0.1) * 7;
  for (const [ox, f] of [[-8, fw], [8, -fw]] as [number, number][]) {
    ctx.beginPath();
    ctx.moveTo(ox, 38);
    ctx.lineTo(ox + f, 50);
    ctx.stroke();
    for (const ta of [-0.4, 0, 0.4]) {
      ctx.beginPath();
      ctx.moveTo(ox + f, 50);
      ctx.lineTo(ox + f + Math.cos(ta + 1.2) * 10, 50 + Math.sin(ta + 1.2) * 6);
      ctx.stroke();
    }
  }

  // Body
  const bColor = rage ? '#cc1100' : enraged ? '#553300' : '#e8e8ff';
  const bodyGrad = ctx.createRadialGradient(0, 5, 4, 4, 5 + bob, 32);
  bodyGrad.addColorStop(0, rage ? '#ee2200' : enraged ? '#774400' : '#ffffff');
  bodyGrad.addColorStop(1, bColor);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 10 + bob, 28, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rage ? '#880000' : '#8888aa';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wings
  ctx.fillStyle = rage ? '#cc1100' : '#c0c0d8';
  ctx.save();
  ctx.translate(-14, 0 + bob);
  ctx.rotate(Math.sin(frame * 0.1) * 0.3 - 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 6, 12, 25, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Long neck
  ctx.fillStyle = rage ? '#ee2200' : '#f0f0ff';
  ctx.beginPath();
  ctx.moveTo(-8, -14 + bob);
  ctx.bezierCurveTo(-12, -32 + bob, 4, -52 + bob, 10, -62 + bob);
  ctx.bezierCurveTo(18, -64 + bob, 18, -62 + bob, 14, -60 + bob);
  ctx.bezierCurveTo(8, -50 + bob, -2, -28 + bob, 6, -14 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = rage ? '#880000' : '#c0c0d8';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Head
  ctx.fillStyle = rage ? '#ee2200' : '#f5f5ff';
  ctx.beginPath();
  ctx.arc(12, -64 + bob, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rage ? '#880000' : '#a0a0c0';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes – glowing evil
  ctx.shadowColor = rage ? '#ff0000' : '#ff6600';
  ctx.shadowBlur = 16;
  ctx.fillStyle = rage ? '#ff0000' : '#ff6600';
  ctx.beginPath();
  ctx.arc(19, -68 + bob, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0000';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(20, -68 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,100,0.9)';
  ctx.beginPath();
  ctx.arc(21.5, -70 + bob, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Beak (massive)
  ctx.fillStyle = '#e07000';
  ctx.beginPath();
  ctx.moveTo(27, -64 + bob);
  ctx.lineTo(44, -67 + bob);
  ctx.lineTo(42, -59 + bob);
  ctx.lineTo(27, -60 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c05000';
  ctx.beginPath();
  ctx.moveTo(27, -64 + bob);
  ctx.lineTo(43, -64 + bob);
  ctx.lineTo(43, -63 + bob);
  ctx.lineTo(27, -63 + bob);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
  ctx.shadowBlur = 0;
}

// ── Particles ────────────────────────────────────────────────

export function drawBloodParticles(ctx: CanvasRenderingContext2D, particles: BloodParticle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    // Elongated drop when moving fast
    const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (speed > 3) {
      const angle = Math.atan2(p.vy, p.vx);
      ctx.translate(p.x, p.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.radius * Math.min(speed * 0.25, 3), p.radius, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawFeatherParticles(ctx: CanvasRenderingContext2D, particles: FeatherParticle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.3, p.size, 0.2, 0, Math.PI * 2);
    ctx.fill();
    // quill
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = p.alpha * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.lineTo(0, p.size);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawBodyParts(ctx: CanvasRenderingContext2D, parts: BodyPart[]) {
  for (const bp of parts) {
    ctx.save();
    ctx.globalAlpha = bp.alpha;
    ctx.translate(bp.x, bp.y);
    ctx.rotate(bp.rotation);
    _drawBodyPart(ctx, bp);
    ctx.restore();
  }
}

function _drawBodyPart(ctx: CanvasRenderingContext2D, bp: BodyPart) {
  const s = bp.size;
  switch (bp.partType) {
    case 'wing': {
      const c = bp.enemyType === 'crow' ? '#252535' : bp.enemyType === 'boss' ? '#d0d0ff' : '#dde8dd';
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.45, s, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Feather lines
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.8;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * s * 0.15, -s * 0.8);
        ctx.lineTo(i * s * 0.15, s * 0.8);
        ctx.stroke();
      }
      // blood drip
      ctx.fillStyle = '#cc0000';
      ctx.beginPath();
      ctx.arc(s * 0.1, s * 0.7, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'head': {
      const hc = bp.enemyType === 'crow' ? '#1a1a2e' : bp.enemyType === 'boss' ? '#f0f0ff' : '#f0f5f0';
      ctx.fillStyle = hc;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      // eye (X)
      ctx.strokeStyle = '#ff3333';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.15);
      ctx.lineTo(s * 0.4, s * 0.1);
      ctx.moveTo(s * 0.4, -s * 0.15);
      ctx.lineTo(s * 0.15, s * 0.1);
      ctx.stroke();
      // Beak stub
      ctx.fillStyle = '#cc7700';
      ctx.beginPath();
      ctx.moveTo(s * 0.5, 0);
      ctx.lineTo(s * 0.85, -s * 0.1);
      ctx.lineTo(s * 0.8, s * 0.1);
      ctx.closePath();
      ctx.fill();
      // blood drip from neck
      ctx.fillStyle = '#cc0000';
      ctx.beginPath();
      ctx.arc(0, s * 0.5, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#aa0000';
      ctx.beginPath();
      ctx.rect(-s * 0.15, s * 0.5, s * 0.3, s * 0.4);
      ctx.fill();
      break;
    }
    case 'guts': {
      // Entrails – loops of intestine
      ctx.strokeStyle = '#cc3344';
      ctx.lineWidth = s * 0.25;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.3);
      ctx.bezierCurveTo(s * 0.3, -s * 0.8, s * 0.6, 0, s * 0.2, s * 0.4);
      ctx.bezierCurveTo(-s * 0.4, s * 0.8, -s * 0.5, 0.3, -s * 0.1, -s * 0.2);
      ctx.stroke();
      ctx.strokeStyle = '#ff5566';
      ctx.lineWidth = s * 0.12;
      ctx.stroke();
      break;
    }
  }
}

export function drawBloodPools(ctx: CanvasRenderingContext2D, pools: BloodPool[]) {
  for (const pool of pools) {
    ctx.save();
    ctx.globalAlpha = pool.alpha;
    const grad = ctx.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, pool.radius);
    grad.addColorStop(0, '#880000');
    grad.addColorStop(0.6, '#660000');
    grad.addColorStop(1, 'rgba(44,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(pool.x, pool.y, pool.radius, pool.radius * 0.55, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawSlashTrails(ctx: CanvasRenderingContext2D, trails: SlashTrail[]) {
  for (const t of trails) {
    const a = t.alpha * (t.timer / t.maxTimer);
    if (a <= 0) continue;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(t.x, t.y);
    ctx.rotate(t.angle);
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.9)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, t.radius, t.startAngle, t.endAngle);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200, 160, 255, 0.5)';
    ctx.lineWidth = 16;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawSparkles(ctx: CanvasRenderingContext2D, sparkles: Sparkle[]) {
  for (const s of sparkles) {
    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    // 4-pointed star
    ctx.translate(s.x, s.y);
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? s.size : s.size * 0.3;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: Projectile[]) {
  for (const p of projectiles) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.translate(p.x, p.y);
    const angle = Math.atan2(p.vy, p.vx);
    ctx.rotate(angle);
    // Feather projectile
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#888890';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(20, -4);
    ctx.lineTo(18, 0);
    ctx.lineTo(20, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
  for (const t of texts) {
    ctx.save();
    ctx.globalAlpha = t.alpha;
    ctx.font = `bold ${t.size}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

// ── UI ───────────────────────────────────────────────────────

function _drawBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  fraction: number,
  fillColor: string, glowColor: string, bgColor: string,
) {
  ctx.save();
  // Background
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, (h + 2) / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();
  // Fill
  const fw = Math.max(0, fraction) * w;
  if (fw > 0) {
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, fw, h, h / 2);
    ctx.clip();
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, fw, h);
    ctx.restore();
    // Shine
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, fw, h * 0.4, h * 0.2);
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(x, y, fw, h * 0.4);
    ctx.restore();
  }
  // Glow outline when high health / near death
  if (fraction > 0.5) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 4;
  }
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, (h + 2) / 2);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  playerHp: number,
  playerMaxHp: number,
  score: number,
  wave: number,
  totalWaves: number,
  comboTimer: number,
) {
  ctx.save();

  // HP bar
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffe0f0';
  ctx.textAlign = 'left';
  ctx.fillText('❤️ HP', 18, 30);
  _drawBar(ctx, 18, 36, 200, 16, playerHp / playerMaxHp, '#ff4466', '#ff99bb', '#2a0010');

  // Score
  ctx.textAlign = 'right';
  ctx.font = 'bold 20px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.strokeStyle = '#2a1000';
  ctx.lineWidth = 3;
  ctx.strokeText(`⭐ ${score.toLocaleString()}`, w - 16, 32);
  ctx.fillText(`⭐ ${score.toLocaleString()}`, w - 16, 32);

  // Wave indicator
  ctx.textAlign = 'center';
  ctx.font = 'bold 15px "Segoe UI", sans-serif';
  ctx.fillStyle = '#e0d0ff';
  ctx.strokeStyle = '#1a0030';
  ctx.lineWidth = 3;
  ctx.strokeText(`Wave ${wave} / ${totalWaves}`, w / 2, 28);
  ctx.fillText(`Wave ${wave} / ${totalWaves}`, w / 2, 28);

  ctx.restore();
}

// ── Screens ───────────────────────────────────────────────────

export function drawMenu(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  // Background gradient
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
  bg.addColorStop(0, '#2e1055');
  bg.addColorStop(1, '#0d0520');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Decorative stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 80; i++) {
    const sx = ((i * 197 + 13) % w);
    const sy = ((i * 317 + 57) % (h * 0.7));
    const ss = 1 + (i % 3) * 0.8;
    const blink = 0.4 + 0.6 * Math.sin(time * 0.001 * (1 + (i % 5) * 0.3) + i);
    ctx.globalAlpha = blink * 0.8;
    ctx.beginPath();
    ctx.arc(sx, sy, ss, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Title glow
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff99dd';
  ctx.shadowBlur = 40;
  ctx.font = 'bold 78px "Segoe UI Black", "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffe0f5';
  ctx.strokeStyle = '#8800cc';
  ctx.lineWidth = 6;
  ctx.strokeText('🦆 DUCK SLASH', w / 2, h * 0.28);
  ctx.fillText('🦆 DUCK SLASH', w / 2, h * 0.28);
  ctx.shadowBlur = 0;

  ctx.font = 'bold 26px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffccee';
  ctx.strokeStyle = '#330044';
  ctx.lineWidth = 3;
  ctx.strokeText('Quack of Doom', w / 2, h * 0.38);
  ctx.fillText('Quack of Doom', w / 2, h * 0.38);
  ctx.restore();

  // Big cute duck on menu
  ctx.save();
  ctx.translate(w / 2, h * 0.58);
  const menuBob = Math.sin(time * 0.0015) * 8;
  ctx.translate(0, menuBob);
  _drawMenuDuck(ctx, time);
  ctx.restore();

  // Pulsing start button
  const pulse = 0.85 + 0.15 * Math.sin(time * 0.003);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 28px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.shadowColor = '#ff9900';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = '#4a2000';
  ctx.lineWidth = 3;
  const startText = '▶  Click or Press ENTER to Start  ◀';
  ctx.strokeText(startText, w / 2, h * 0.88);
  ctx.fillText(startText, w / 2, h * 0.88);
  ctx.restore();

  // Controls hint
  ctx.save();
  ctx.textAlign = 'center';
  ctx.globalAlpha = 0.7;
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillStyle = '#d0c0ff';
  ctx.fillText('WASD / Arrow Keys: Move  •  Left Click or SPACE: Attack  •  SHIFT: Roll', w / 2, h * 0.95);
  ctx.restore();
}

function _drawMenuDuck(ctx: CanvasRenderingContext2D, time: number) {
  const bob = Math.sin(time * 0.0014) * 3;
  ctx.save();
  ctx.scale(1.6, 1.6);

  // Body
  const bg2 = ctx.createRadialGradient(2, 0, 2, 2, 2 + bob, 30);
  bg2.addColorStop(0, '#ffe033');
  bg2.addColorStop(1, '#e8b800');
  ctx.fillStyle = bg2;
  ctx.beginPath();
  ctx.ellipse(0, 5 + bob, 24, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Belly
  ctx.fillStyle = '#fff8d0';
  ctx.beginPath();
  ctx.ellipse(4, 10 + bob, 13, 20, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = '#ffe033';
  ctx.beginPath();
  ctx.arc(6, -22 + bob, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9a000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bill
  ctx.fillStyle = '#ff8c00';
  ctx.beginPath();
  ctx.moveTo(22, -20 + bob);
  ctx.lineTo(38, -23 + bob);
  ctx.lineTo(36, -17 + bob);
  ctx.lineTo(22, -17 + bob);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(15, -25 + bob, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(16, -25 + bob, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(18, -28 + bob, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(14, -24 + bob, 1, 0, Math.PI * 2);
  ctx.fill();

  // Blush
  ctx.fillStyle = 'rgba(255, 130, 160, 0.5)';
  ctx.beginPath();
  ctx.ellipse(10, -20 + bob, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sword
  ctx.save();
  ctx.translate(16, -8 + bob);
  ctx.rotate(-0.6 + Math.sin(time * 0.002) * 0.3);
  _drawSword(ctx, 1.1);
  ctx.restore();

  ctx.restore();
}

export function drawWaveComplete(ctx: CanvasRenderingContext2D, w: number, h: number, wave: number, score: number, time: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(20, 0, 40, 0.7)';
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffee88';
  ctx.shadowBlur = 30;
  ctx.font = 'bold 58px "Segoe UI Black", sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.strokeStyle = '#4a2000';
  ctx.lineWidth = 5;
  ctx.strokeText(`Wave ${wave} Clear! 🎉`, w / 2, h * 0.38);
  ctx.fillText(`Wave ${wave} Clear! 🎉`, w / 2, h * 0.38);

  ctx.shadowBlur = 0;
  ctx.font = 'bold 28px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffccee';
  ctx.strokeStyle = '#330044';
  ctx.lineWidth = 3;
  ctx.strokeText(`Score: ${score.toLocaleString()}`, w / 2, h * 0.52);
  ctx.fillText(`Score: ${score.toLocaleString()}`, w / 2, h * 0.52);

  const pulse = 0.7 + 0.3 * Math.sin(time * 0.004);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.fillStyle = '#aaffcc';
  ctx.strokeText('Get ready for the next wave...', w / 2, h * 0.65);
  ctx.fillText('Get ready for the next wave...', w / 2, h * 0.65);

  ctx.restore();
}

export function drawGameOver(ctx: CanvasRenderingContext2D, w: number, h: number, score: number, wave: number) {
  // Dark overlay
  ctx.save();
  const ov = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  ov.addColorStop(0, 'rgba(60,0,0,0.85)');
  ov.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';

  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 50;
  ctx.font = 'bold 82px "Segoe UI Black", sans-serif';
  ctx.fillStyle = '#ff3344';
  ctx.strokeStyle = '#4a0000';
  ctx.lineWidth = 6;
  ctx.strokeText('GAME OVER', w / 2, h * 0.35);
  ctx.fillText('GAME OVER', w / 2, h * 0.35);

  ctx.shadowBlur = 0;

  ctx.font = 'bold 28px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffcccc';
  ctx.strokeStyle = '#2a0000';
  ctx.lineWidth = 3;
  ctx.strokeText(`You survived ${wave - 1} wave${wave - 1 !== 1 ? 's' : ''}`, w / 2, h * 0.5);
  ctx.fillText(`You survived ${wave - 1} wave${wave - 1 !== 1 ? 's' : ''}`, w / 2, h * 0.5);

  ctx.strokeText(`Final Score: ${score.toLocaleString()}`, w / 2, h * 0.6);
  ctx.fillText(`Final Score: ${score.toLocaleString()}`, w / 2, h * 0.6);

  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ff9999';
  ctx.strokeText('Click or Press ENTER to try again', w / 2, h * 0.76);
  ctx.fillText('Click or Press ENTER to try again', w / 2, h * 0.76);

  ctx.restore();
}

export function drawVictory(ctx: CanvasRenderingContext2D, w: number, h: number, score: number, time: number) {
  ctx.save();
  const ov = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  ov.addColorStop(0, 'rgba(0,30,60,0.85)');
  ov.addColorStop(1, 'rgba(0,0,20,0.95)');
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.shadowColor = '#ffe066';
  ctx.shadowBlur = 50;
  ctx.font = 'bold 72px "Segoe UI Black", sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.strokeStyle = '#4a2000';
  ctx.lineWidth = 6;
  ctx.strokeText('VICTORY! 🏆', w / 2, h * 0.33);
  ctx.fillText('VICTORY! 🏆', w / 2, h * 0.33);

  ctx.shadowBlur = 0;

  ctx.font = 'bold 30px "Segoe UI", sans-serif';
  ctx.fillStyle = '#fffacc';
  ctx.strokeStyle = '#2a1000';
  ctx.lineWidth = 3;
  ctx.strokeText('The Honkmother has been defeated!', w / 2, h * 0.46);
  ctx.fillText('The Honkmother has been defeated!', w / 2, h * 0.46);

  ctx.strokeText(`Final Score: ${score.toLocaleString()}`, w / 2, h * 0.57);
  ctx.fillText(`Final Score: ${score.toLocaleString()}`, w / 2, h * 0.57);

  const pulse = 0.7 + 0.3 * Math.sin(time * 0.004);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillStyle = '#aaffcc';
  ctx.strokeText('Click or Press ENTER to play again', w / 2, h * 0.72);
  ctx.fillText('Click or Press ENTER to play again', w / 2, h * 0.72);

  ctx.restore();
}

export function drawScreenFlash(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number, color: string) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
