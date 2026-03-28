// ============================================================
// Entry point
// ============================================================
import { Game } from './game.ts';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas element not found');

// Resize canvas to fill window while preserving 16:9 aspect ratio
function resizeCanvas() {
  const container = canvas.parentElement!;
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  const aspect = 1280 / 720;
  let w = winW;
  let h = winW / aspect;
  if (h > winH) {
    h = winH;
    w = winH * aspect;
  }
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  container.style.width = `${w}px`;
  container.style.height = `${h}px`;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const game = new Game(canvas);
game.start();
