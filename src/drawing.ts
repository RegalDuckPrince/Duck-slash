// ============================================================
// Drawing helpers – all procedural canvas art
// ============================================================
import type { EnemyType, BloodPool, BloodParticle, FeatherParticle, BodyPart,
  SlashTrail, FloatingText, Sparkle, Projectile, Flower, Cloud,
  CharacterType, WeaponType, HpDrop, SkillId } from './types.ts';
import { CHARACTER_CONFIGS, WEAPON_CONFIGS, SKILL_DEFS } from './types.ts';

// ── Constants ─────────────────────────────────────────────────

/** Angular frequency used for the player dance animation (radians per frame unit) */
const DANCE_FREQ = 0.18;

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
  charType: CharacterType = 'duck',
  weaponType: WeaponType = 'sword',
  isDancing = false,
  danceFrame = 0,
) {
  ctx.save();
  ctx.translate(x, y);

  // Invincibility flash
  if (invincible && Math.floor(Date.now() / 80) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  if (facing < 0) ctx.scale(-1, 1);

  // Dance mode – exaggerated bobbing and spinning
  if (isDancing) {
    const dSpin = Math.sin(danceFrame * (DANCE_FREQ * 0.67)) * 0.35;
    const dBounce = Math.abs(Math.sin(danceFrame * DANCE_FREQ)) * -12;
    ctx.rotate(dSpin);
    ctx.translate(Math.sin(danceFrame * (DANCE_FREQ * 0.5)) * 14, dBounce);
  }

  const bob = isDancing
    ? Math.sin(danceFrame * DANCE_FREQ) * 5
    : Math.sin(walkFrame * DANCE_FREQ) * 2.5;

  // Character colour palette
  let bodyColor1: string, bodyColor2: string, bodyOutline: string,
      bellyColor: string, helmetColor: string, helmetOutline: string,
      crestColor: string, billColor: string, billOutline: string;

  if (charType === 'penguin') {
    bodyColor1 = '#2a2a3a'; bodyColor2 = '#111122'; bodyOutline = '#4a4a6a';
    bellyColor = '#e8e8f0'; helmetColor = '#223344'; helmetOutline = '#445566';
    crestColor = '#4488cc'; billColor = '#ffcc00'; billOutline = '#cc9900';
  } else if (charType === 'parrot') {
    bodyColor1 = '#cc2222'; bodyColor2 = '#991100'; bodyOutline = '#ff5500';
    bellyColor = '#ffdd66'; helmetColor = '#116622'; helmetOutline = '#228833';
    crestColor = '#ffaa00'; billColor = '#ffcc00'; billOutline = '#cc9900';
  } else {
    // duck (default)
    bodyColor1 = '#ffe033'; bodyColor2 = '#e8b800'; bodyOutline = '#c9a000';
    bellyColor = '#fff8d0'; helmetColor = '#b0c8e8'; helmetOutline = '#7898b8';
    crestColor = '#ff6b9d'; billColor = '#ff8c00'; billOutline = '#c96000';
  }

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
    _drawWeapon(ctx, weaponType, 0.75);
    ctx.restore();
  }

  // ── Body ─────────────────────────────────────────────────
  // Tail feathers
  ctx.fillStyle = bodyColor2;
  ctx.beginPath();
  ctx.ellipse(-14, 4 + bob, 9, 14, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyColor1;
  ctx.beginPath();
  ctx.ellipse(-13, 2 + bob, 7, 11, -0.4, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyGrad = ctx.createRadialGradient(2, 0 + bob, 2, 2, 2 + bob, 28);
  bodyGrad.addColorStop(0, bodyColor1);
  bodyGrad.addColorStop(1, bodyColor2);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 5 + bob, 22, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  // outline
  ctx.strokeStyle = bodyOutline;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Belly
  ctx.fillStyle = bellyColor;
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
  const wf = isRolling ? 0.9
    : isDancing ? -0.8 + Math.sin(danceFrame * DANCE_FREQ) * 0.5
    : Math.sin(walkFrame * DANCE_FREQ) * 0.25;
  ctx.fillStyle = bodyColor2;
  ctx.save();
  ctx.translate(-8, 0 + bob);
  ctx.rotate(-wf);
  ctx.beginPath();
  ctx.ellipse(0, 4, 8, 17, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bodyOutline;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Head
  const headGrad = ctx.createRadialGradient(6, -22 + bob, 3, 6, -22 + bob, 16);
  headGrad.addColorStop(0, bodyColor1);
  headGrad.addColorStop(1, bodyColor2);
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(6, -22 + bob, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = bodyOutline;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Tiny helmet/cap
  ctx.fillStyle = helmetColor;
  ctx.beginPath();
  ctx.ellipse(6, -32 + bob, 14, 9, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = helmetOutline;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Helmet crest
  ctx.fillStyle = crestColor;
  ctx.beginPath();
  ctx.ellipse(6, -39 + bob, 3, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bill
  ctx.fillStyle = billColor;
  ctx.beginPath();
  ctx.moveTo(20, -21 + bob);
  ctx.lineTo(32, -24 + bob);
  ctx.lineTo(30, -19 + bob);
  ctx.lineTo(20, -18 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = billOutline;
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

  // ── Attacking weapon swing ────────────────────────────────
  if (isAttacking) {
    ctx.save();
    // weapon pivots at player's arm
    ctx.translate(12, -8 + bob);
    // attackAngle is in world space; facing already flipped ctx via scale
    const localAngle = -Math.PI * 0.8 + attackProgress * Math.PI * 1.5;
    ctx.rotate(localAngle);
    _drawWeapon(ctx, weaponType, 1);
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

  // ── Dance music notes ────────────────────────────────────
  if (isDancing) {
    const notes = ['♪', '♫', '🎵', '♩'];
    ctx.save();
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    for (let n = 0; n < 4; n++) {
      const angle = danceFrame * 0.04 + n * (Math.PI * 2 / 4);
      const noteX = x + Math.cos(angle) * 55;
      const noteY = y - 60 + Math.sin(angle * 0.7) * 20 - Math.abs(Math.sin(danceFrame * 0.06 + n)) * 30;
      const noteAlpha = 0.5 + 0.5 * Math.sin(danceFrame * 0.1 + n);
      ctx.globalAlpha = noteAlpha;
      ctx.fillStyle = ['#ffe066', '#aaffcc', '#ff99cc', '#99ccff'][n % 4];
      ctx.fillText(notes[n % notes.length], noteX, noteY);
    }
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

// Dispatch to correct weapon drawing
function _drawWeapon(ctx: CanvasRenderingContext2D, weapon: WeaponType, scale: number) {
  switch (weapon) {
    case 'axe':         _drawAxe(ctx, scale);         break;
    case 'spear':       _drawSpear(ctx, scale);       break;
    case 'dagger':      _drawDagger(ctx, scale);      break;
    case 'mace':        _drawMace(ctx, scale);        break;
    case 'pistol':      _drawPistol(ctx, scale);      break;
    case 'shotgun':     _drawShotgun(ctx, scale);     break;
    case 'rifle':       _drawRifle(ctx, scale);       break;
    case 'sniper':      _drawSniper(ctx, scale);      break;
    case 'uzi':         _drawUzi(ctx, scale);         break;
    case 'minigun':     _drawMinigun(ctx, scale);     break;
    case 'cannon':      _drawCannon(ctx, scale);      break;
    case 'burst_rifle': _drawBurstRifle(ctx, scale);  break;
    default:            _drawSword(ctx, scale);       break;
  }
}

// ── Gun drawing functions ────────────────────────────────────

function _drawPistol(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#888'; ctx.shadowBlur = 6;
  // barrel
  ctx.fillStyle = '#444'; roundRect(ctx, -3, -40, 6, 28, 2); ctx.fill();
  // grip
  ctx.fillStyle = '#5a3010'; roundRect(ctx, -4, -14, 8, 18, 3); ctx.fill();
  // trigger guard
  ctx.strokeStyle = '#666'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(-2, -4, 7, 0.3, Math.PI - 0.3); ctx.stroke();
  // muzzle shine
  ctx.fillStyle = 'rgba(180,220,255,0.5)';
  ctx.beginPath(); ctx.arc(0, -40, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawShotgun(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#aa4400'; ctx.shadowBlur = 8;
  // double barrel
  ctx.fillStyle = '#555';
  roundRect(ctx, -5, -70, 4, 56, 2); ctx.fill();
  roundRect(ctx, 1, -70, 4, 56, 2); ctx.fill();
  // stock
  ctx.fillStyle = '#7a4420'; roundRect(ctx, -5, -14, 10, 24, 3); ctx.fill();
  ctx.fillStyle = '#9a5428'; roundRect(ctx, -4, -10, 8, 10, 2); ctx.fill();
  // shells hint
  ctx.fillStyle = '#cc4400';
  ctx.beginPath(); ctx.arc(-2, -16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -16, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawRifle(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#336699'; ctx.shadowBlur = 8;
  // barrel (long)
  ctx.fillStyle = '#333'; roundRect(ctx, -2.5, -80, 5, 68, 2); ctx.fill();
  // body
  ctx.fillStyle = '#555'; roundRect(ctx, -4, -16, 8, 20, 2); ctx.fill();
  // stock
  ctx.fillStyle = '#7a4420'; roundRect(ctx, -4, 0, 9, 18, 3); ctx.fill();
  // scope
  ctx.fillStyle = '#222'; roundRect(ctx, -2, -60, 4, 14, 2); ctx.fill();
  ctx.fillStyle = 'rgba(100,200,255,0.6)';
  ctx.beginPath(); ctx.arc(0, -60, 3, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawSniper(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 12;
  // very long barrel
  ctx.fillStyle = '#2a2a2a'; roundRect(ctx, -2, -95, 4, 78, 2); ctx.fill();
  // bipod hint
  ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-6, -22); ctx.lineTo(0, -18); ctx.lineTo(6, -22); ctx.stroke();
  // body
  ctx.fillStyle = '#444'; roundRect(ctx, -4, -22, 8, 20, 2); ctx.fill();
  // stock
  ctx.fillStyle = '#5a3010'; roundRect(ctx, -4, -3, 9, 20, 3); ctx.fill();
  // big scope
  ctx.fillStyle = '#181818'; roundRect(ctx, -3, -72, 6, 20, 3); ctx.fill();
  ctx.fillStyle = 'rgba(0,200,255,0.7)';
  ctx.beginPath(); ctx.arc(0, -72, 4, 0, Math.PI * 2); ctx.fill();
  // muzzle flash hint
  ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(0,200,255,0.4)';
  ctx.beginPath(); ctx.arc(0, -95, 4, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawUzi(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#ff9900'; ctx.shadowBlur = 6;
  // stubby barrel
  ctx.fillStyle = '#333'; roundRect(ctx, -3, -38, 6, 22, 2); ctx.fill();
  // boxy body
  ctx.fillStyle = '#4a4a4a'; roundRect(ctx, -5, -18, 10, 16, 2); ctx.fill();
  // grip / mag
  ctx.fillStyle = '#666'; roundRect(ctx, -3, -4, 6, 18, 2); ctx.fill();
  // mag clip detail
  ctx.fillStyle = '#333'; roundRect(ctx, -2, 4, 4, 8, 1); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawMinigun(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 12;
  // 6 barrels rotated
  ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 5, -20 + Math.sin(a) * 5);
    ctx.lineTo(Math.cos(a) * 5, -70 + Math.sin(a) * 5);
    ctx.stroke();
  }
  // center hub
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -70, 6, 0, Math.PI * 2); ctx.fill();
  // handle
  ctx.fillStyle = '#5a3010'; roundRect(ctx, -4, -4, 8, 20, 3); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawCannon(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#cc4400'; ctx.shadowBlur = 14;
  // fat barrel
  const barrelGrad = ctx.createLinearGradient(-8, 0, 8, 0);
  barrelGrad.addColorStop(0, '#555'); barrelGrad.addColorStop(0.5, '#888'); barrelGrad.addColorStop(1, '#444');
  ctx.fillStyle = barrelGrad;
  roundRect(ctx, -8, -68, 16, 52, 4); ctx.fill();
  // muzzle ring
  ctx.fillStyle = '#777'; roundRect(ctx, -9, -68, 18, 6, 3); ctx.fill();
  // base
  ctx.fillStyle = '#7a4420'; roundRect(ctx, -7, -18, 14, 22, 4); ctx.fill();
  // cannonball hint
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(0, -62, 6, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawBurstRifle(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save(); ctx.scale(scale, scale);
  ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 8;
  // barrel
  ctx.fillStyle = '#2a2a2a'; roundRect(ctx, -2.5, -75, 5, 56, 2); ctx.fill();
  // flash hider
  ctx.fillStyle = '#555'; roundRect(ctx, -3, -80, 6, 6, 1); ctx.fill();
  // body
  ctx.fillStyle = '#4a4a4a'; roundRect(ctx, -5, -20, 10, 18, 2); ctx.fill();
  // foregrip
  ctx.fillStyle = '#333'; roundRect(ctx, -3, -40, 6, 12, 2); ctx.fill();
  // stock
  ctx.fillStyle = '#363636'; roundRect(ctx, -4, -4, 10, 16, 3); ctx.fill();
  // burst indicator dots
  ctx.fillStyle = '#ff4400';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath(); ctx.arc(3, -8 + i * 4, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.shadowBlur = 0; ctx.restore();
}

function _drawAxe(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.shadowColor = '#cc6633';
  ctx.shadowBlur = 8;
  // Handle
  ctx.fillStyle = '#7a4420';
  roundRect(ctx, -3, -50, 6, 64, 2);
  ctx.fill();
  ctx.strokeStyle = '#4a2810'; ctx.lineWidth = 1; ctx.stroke();
  // Axe head
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.moveTo(-2, -50);
  ctx.lineTo(-22, -62);
  ctx.lineTo(-18, -42);
  ctx.lineTo(-2, -36);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#666'; ctx.lineWidth = 1.2; ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(-5, -52);
  ctx.lineTo(-18, -60);
  ctx.lineTo(-14, -52);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function _drawSpear(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.shadowColor = '#66cc88';
  ctx.shadowBlur = 8;
  // Shaft (long)
  ctx.fillStyle = '#9a6430';
  ctx.beginPath();
  ctx.rect(-2, -78, 4, 92);
  ctx.fill();
  ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 1; ctx.stroke();
  // Tip
  ctx.fillStyle = '#d8d8d8';
  ctx.beginPath();
  ctx.moveTo(0, -92);
  ctx.lineTo(-5, -78);
  ctx.lineTo(5, -78);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(-1, -92);
  ctx.lineTo(-4, -80);
  ctx.lineTo(0, -82);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();
}

function _drawDagger(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.shadowColor = '#aabbcc';
  ctx.shadowBlur = 6;
  // Blade (short)
  const bladeGrad = ctx.createLinearGradient(-2, -38, 2, -38);
  bladeGrad.addColorStop(0, '#e8f0ff');
  bladeGrad.addColorStop(1, '#90aacc');
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(-1, -32);
  ctx.lineTo(0, -38);
  ctx.lineTo(1, -32);
  ctx.lineTo(2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6080a0'; ctx.lineWidth = 1; ctx.stroke();
  ctx.shadowBlur = 0;
  // Guard
  ctx.fillStyle = '#c8a040';
  roundRect(ctx, -8, -6, 16, 5, 2);
  ctx.fill();
  ctx.strokeStyle = '#806020'; ctx.lineWidth = 1; ctx.stroke();
  // Handle
  ctx.fillStyle = '#5a3010';
  roundRect(ctx, -2.5, -2, 5, 12, 2);
  ctx.fill();
  ctx.restore();
}

function _drawMace(ctx: CanvasRenderingContext2D, scale: number) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.shadowColor = '#ddaa33';
  ctx.shadowBlur = 10;
  // Handle
  ctx.fillStyle = '#7a4420';
  roundRect(ctx, -3.5, -2, 7, 48, 2);
  ctx.fill();
  ctx.strokeStyle = '#4a2810'; ctx.lineWidth = 1; ctx.stroke();
  // Mace head
  ctx.fillStyle = '#aaaaaa';
  ctx.beginPath();
  ctx.arc(0, -52, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#777'; ctx.lineWidth = 1.5; ctx.stroke();
  // Spikes
  ctx.fillStyle = '#888';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.save();
    ctx.translate(Math.cos(a) * 14, -52 + Math.sin(a) * 14);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-3, -6);
    ctx.lineTo(3, -6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(-5, -58, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
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

    if (p.fromEnemy) {
      // Feather projectile (enemy)
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
    } else {
      // Player bullet – glowing yellow/orange capsule
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const len = Math.max(8, Math.min(speed * 2.5, 28));
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // hot core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, len * 0.25, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}

// ── HP drops ─────────────────────────────────────────────────

export function drawHpDrops(ctx: CanvasRenderingContext2D, drops: HpDrop[]) {
  for (const drop of drops) {
    const pulse = 0.85 + 0.15 * Math.sin(drop.pulseTimer * 4);
    ctx.save();
    ctx.globalAlpha = drop.alpha;
    ctx.translate(drop.x, drop.y);
    ctx.scale(pulse, pulse);

    // Glow
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 18;

    // Heart shape
    ctx.fillStyle = '#ff4477';
    ctx.beginPath();
    ctx.moveTo(0, 3);
    ctx.bezierCurveTo(-14, -6, -14, -18, 0, -10);
    ctx.bezierCurveTo(14, -18, 14, -6, 0, 3);
    ctx.fill();
    ctx.strokeStyle = '#ff88aa';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // White shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(-4, -12, 3, 2, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // HP text
    ctx.shadowBlur = 0;
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#aa0033';
    ctx.lineWidth = 2;
    ctx.strokeText(`+${drop.hp}`, 0, 18);
    ctx.fillText(`+${drop.hp}`, 0, 18);

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
  weaponType: WeaponType = 'sword',
) {
  ctx.save();

  // HP bar
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffe0f0';
  ctx.textAlign = 'left';
  ctx.fillText('❤️ HP', 18, 30);
  _drawBar(ctx, 18, 36, 200, 16, playerHp / playerMaxHp, '#ff4466', '#ff99bb', '#2a0010');

  // Weapon indicator
  const wCfg = WEAPON_CONFIGS[weaponType];
  ctx.font = 'bold 14px "Segoe UI", sans-serif';
  ctx.fillStyle = '#aaddff';
  ctx.fillText(`${wCfg.emoji} ${wCfg.label}`, 18, 68);

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

// Draws a mini-character silhouette for character select cards
function _drawCharPreview(ctx: CanvasRenderingContext2D, charType: CharacterType) {
  ctx.save();
  ctx.scale(0.8, 0.8);
  let bodyC1: string, bodyC2: string, bellyC: string, billC: string;
  if (charType === 'penguin') {
    bodyC1 = '#2a2a3a'; bodyC2 = '#111122'; bellyC = '#e8e8f0'; billC = '#ffcc00';
  } else if (charType === 'parrot') {
    bodyC1 = '#cc2222'; bodyC2 = '#991100'; bellyC = '#ffdd66'; billC = '#ffcc00';
  } else {
    bodyC1 = '#ffe033'; bodyC2 = '#e8b800'; bellyC = '#fff8d0'; billC = '#ff8c00';
  }
  // Body
  const bg = ctx.createRadialGradient(2, 5, 2, 2, 7, 30);
  bg.addColorStop(0, bodyC1); bg.addColorStop(1, bodyC2);
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.ellipse(0, 10, 24, 30, 0, 0, Math.PI * 2); ctx.fill();
  // Belly
  ctx.fillStyle = bellyC;
  ctx.beginPath(); ctx.ellipse(4, 14, 13, 20, 0.1, 0, Math.PI * 2); ctx.fill();
  // Head
  ctx.fillStyle = bodyC1;
  ctx.beginPath(); ctx.arc(6, -18, 18, 0, Math.PI * 2); ctx.fill();
  // Bill
  ctx.fillStyle = billC;
  ctx.beginPath();
  ctx.moveTo(20, -16); ctx.lineTo(34, -19); ctx.lineTo(32, -14); ctx.lineTo(20, -14);
  ctx.closePath(); ctx.fill();
  // Eye
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(14, -20, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath(); ctx.arc(15, -20, 4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(17, -22, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawCharSelect(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  selectedIdx: number,
  hoveredIdx: number,
  cardStarts: number[],
  cardW: number,
  cardH: number,
  cardY: number,
  time: number,
) {
  // Background
  const bg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h));
  bg.addColorStop(0, '#1a0840');
  bg.addColorStop(1, '#0a0318');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 60; i++) {
    const sx = (i * 211 + 7) % w;
    const sy = (i * 331 + 23) % (h * 0.85);
    const blink = 0.3 + 0.7 * Math.sin(time * 0.001 * (1 + (i % 4) * 0.4) + i);
    ctx.globalAlpha = blink * 0.7;
    ctx.beginPath();
    ctx.arc(sx, sy, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Title
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = '#cc88ff';
  ctx.shadowBlur = 30;
  ctx.font = 'bold 52px "Segoe UI Black", "Segoe UI", sans-serif';
  ctx.fillStyle = '#f0ddff';
  ctx.strokeStyle = '#6600aa';
  ctx.lineWidth = 5;
  ctx.strokeText('Choose Your Fighter!', w / 2, 90);
  ctx.fillText('Choose Your Fighter!', w / 2, 90);
  ctx.shadowBlur = 0;
  ctx.restore();

  const chars: CharacterType[] = ['duck', 'penguin', 'parrot'];
  for (let i = 0; i < chars.length; i++) {
    const cx = cardStarts[i];
    const cfg = CHARACTER_CONFIGS[chars[i]];
    const isSelected = i === selectedIdx;
    const isHovered = i === hoveredIdx;
    const pulse = 0.85 + 0.15 * Math.sin(time * 0.004 + i * 2);

    ctx.save();

    // Card glow / highlight
    if (isSelected) {
      ctx.shadowColor = '#cc88ff';
      ctx.shadowBlur = 28 * pulse;
    } else if (isHovered) {
      ctx.shadowColor = '#8866cc';
      ctx.shadowBlur = 18;
    }

    // Card background
    const cardGrad = ctx.createLinearGradient(cx, cardY, cx, cardY + cardH);
    if (isSelected) {
      cardGrad.addColorStop(0, 'rgba(100,50,160,0.92)');
      cardGrad.addColorStop(1, 'rgba(50,20,90,0.92)');
    } else if (isHovered) {
      cardGrad.addColorStop(0, 'rgba(70,40,120,0.85)');
      cardGrad.addColorStop(1, 'rgba(30,15,70,0.85)');
    } else {
      cardGrad.addColorStop(0, 'rgba(40,20,80,0.8)');
      cardGrad.addColorStop(1, 'rgba(15,8,40,0.8)');
    }
    ctx.fillStyle = cardGrad;
    roundRect(ctx, cx, cardY, cardW, cardH, 18);
    ctx.fill();

    // Card border
    ctx.strokeStyle = isSelected ? '#cc88ff' : isHovered ? '#8866cc' : '#442266';
    ctx.lineWidth = isSelected ? 3 : 1.5;
    roundRect(ctx, cx, cardY, cardW, cardH, 18);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Character preview (mini sprite)
    ctx.save();
    ctx.translate(cx + cardW / 2, cardY + 110);
    _drawCharPreview(ctx, chars[i]);
    ctx.restore();

    // Emoji + Name
    ctx.textAlign = 'center';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.fillStyle = isSelected ? '#f0ddff' : '#c8b8e8';
    ctx.fillText(`${cfg.emoji} ${cfg.label}`, cx + cardW / 2, cardY + 200);

    // Description
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#a090c0';
    // Word-wrap simplified: just display as-is (descriptions are short)
    ctx.fillText(cfg.description, cx + cardW / 2, cardY + 226);

    // Stats
    const statY = cardY + 255;
    const statLabels = [
      { label: '❤️ HP',     val: cfg.hpMult },
      { label: '👟 Speed',  val: cfg.speedMult },
      { label: '⚔️ Damage', val: cfg.damageMult },
    ];
    for (let s = 0; s < statLabels.length; s++) {
      const sy = statY + s * 28;
      ctx.textAlign = 'left';
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillStyle = '#c0b0d8';
      ctx.fillText(statLabels[s].label, cx + 18, sy + 12);
      // Stat bar (0–2x scale mapped to full bar at 1.8x)
      const barX = cx + 100;
      const barW = cardW - 118;
      const fraction = Math.min(statLabels[s].val / 1.8, 1);
      const barColor = statLabels[s].val >= 1.3 ? '#88ff88' : statLabels[s].val >= 0.9 ? '#ffe066' : '#ff8866';
      _drawBar(ctx, barX, sy + 2, barW, 12, fraction, barColor, barColor, '#1a0830');
    }

    // Selected checkmark
    if (isSelected) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillStyle = '#aaffcc';
      ctx.fillText('✓ Selected', cx + cardW / 2, cardY + cardH - 14);
    }

    ctx.restore();
  }

  // Bottom prompt
  const pulse2 = 0.75 + 0.25 * Math.sin(time * 0.003);
  ctx.save();
  ctx.globalAlpha = pulse2;
  ctx.textAlign = 'center';
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffe066';
  ctx.shadowColor = '#ff9900';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#3a1800';
  ctx.lineWidth = 3;
  const promptText = '▶  Click a card or press ENTER to start  ◀';
  ctx.strokeText(promptText, w / 2, h - 28);
  ctx.fillText(promptText, w / 2, h - 28);
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

// ── Skill Tree screen ────────────────────────────────────────

export function drawSkillTree(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  skillIds: SkillId[],
  hoveredIdx: number,
  time: number,
) {
  // Semi-transparent overlay
  ctx.save();
  const ov = ctx.createLinearGradient(0, 0, 0, h);
  ov.addColorStop(0, 'rgba(10,0,30,0.88)');
  ov.addColorStop(1, 'rgba(5,0,15,0.92)');
  ctx.fillStyle = ov;
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.textAlign = 'center';
  ctx.shadowColor = '#aa88ff';
  ctx.shadowBlur = 28;
  ctx.font = 'bold 52px "Segoe UI Black", "Segoe UI", sans-serif';
  ctx.fillStyle = '#ddc8ff';
  ctx.strokeStyle = '#4400aa';
  ctx.lineWidth = 5;
  ctx.strokeText('✨ Choose an Upgrade! ✨', w / 2, 88);
  ctx.fillText('✨ Choose an Upgrade! ✨', w / 2, 88);
  ctx.shadowBlur = 0;

  const cardW = 260, cardH = 320, gap = 40;
  const totalW = cardW * skillIds.length + gap * (skillIds.length - 1);
  const startX = (w - totalW) / 2;
  const cardY = h / 2 - cardH / 2;

  for (let i = 0; i < skillIds.length; i++) {
    const id = skillIds[i];
    const def = SKILL_DEFS[id];
    const cx = startX + i * (cardW + gap);
    const isHovered = i === hoveredIdx;
    const pulse = 0.85 + 0.15 * Math.sin(time * 0.004 + i * 1.8);

    ctx.save();

    if (isHovered) {
      ctx.shadowColor = '#aa88ff';
      ctx.shadowBlur = 30 * pulse;
    }

    // Card background
    const cardGrad = ctx.createLinearGradient(cx, cardY, cx, cardY + cardH);
    if (isHovered) {
      cardGrad.addColorStop(0, 'rgba(90,50,160,0.95)');
      cardGrad.addColorStop(1, 'rgba(40,20,90,0.95)');
    } else {
      cardGrad.addColorStop(0, 'rgba(40,20,80,0.85)');
      cardGrad.addColorStop(1, 'rgba(15,8,40,0.85)');
    }
    ctx.fillStyle = cardGrad;
    roundRect(ctx, cx, cardY, cardW, cardH, 20);
    ctx.fill();

    // Card border
    ctx.strokeStyle = isHovered ? '#cc88ff' : '#553388';
    ctx.lineWidth = isHovered ? 3 : 1.5;
    roundRect(ctx, cx, cardY, cardW, cardH, 20);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Emoji (big)
    ctx.font = '72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    const emojiY = cardY + 100 + (isHovered ? Math.sin(time * 0.006) * 5 : 0);
    ctx.fillText(def.emoji, cx + cardW / 2, emojiY);

    // Skill name
    ctx.font = `bold 22px "Segoe UI", sans-serif`;
    ctx.fillStyle = isHovered ? '#f0e0ff' : '#c8b8e8';
    ctx.fillText(def.label, cx + cardW / 2, cardY + 148);

    // Description
    ctx.font = '15px "Segoe UI", sans-serif';
    ctx.fillStyle = '#9080b8';
    ctx.fillText(def.description, cx + cardW / 2, cardY + 178);

    // Hover prompt
    if (isHovered) {
      ctx.font = 'bold 16px "Segoe UI", sans-serif';
      ctx.fillStyle = '#aaffcc';
      ctx.fillText('Click to choose!', cx + cardW / 2, cardY + cardH - 20);
    }

    ctx.restore();
  }

  // Bottom hint
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.textAlign = 'center';
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillStyle = '#c0b0d8';
  ctx.fillText('Click a card to claim your upgrade', w / 2, h - 22);
  ctx.restore();
}
