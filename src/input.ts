// ============================================================
// Input Handler – keyboard + mouse
// ============================================================

export class InputHandler {
  readonly keys = new Set<string>();
  mouseX = 640;
  mouseY = 360;
  mouseDown = false;
  /** Mouse button just pressed this frame */
  mouseClicked = false;

  private _pendingClick = false;
  private _canvas: HTMLCanvasElement;
  private _scaleX = 1;
  private _scaleY = 1;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;

    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      // prevent arrow / space scroll
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    canvas.addEventListener('mousemove', (e) => this._updateMouse(e));
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.mouseDown = true;
        this._pendingClick = true;
      }
    });
    canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    // prevent context menu on right click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private _updateMouse(e: MouseEvent) {
    const rect = this._canvas.getBoundingClientRect();
    this._scaleX = this._canvas.width / rect.width;
    this._scaleY = this._canvas.height / rect.height;
    this.mouseX = (e.clientX - rect.left) * this._scaleX;
    this.mouseY = (e.clientY - rect.top) * this._scaleY;
  }

  /** Call once per frame to latch click state */
  frameUpdate() {
    this.mouseClicked = this._pendingClick;
    this._pendingClick = false;
  }
}
