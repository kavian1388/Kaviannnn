/**
 * Input.js
 * Single pointer drag-to-aim, release-to-shoot control scheme. Works
 * identically for touch and mouse via the Pointer Events API. The drag
 * vector is measured from the current pointer position back to the
 * anchor (finger position when the drag started), pulled "slingshot"
 * style - dragging down-left aims up-right, which is what people expect
 * from this genre.
 */
class InputController {
  constructor(canvas, renderer, callbacks) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.callbacks = callbacks || {};
    this.dragging = false;
    this.anchor = { x: 0, y: 0 };
    this.current = { x: 0, y: 0 };
    this.enabled = true;

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    canvas.addEventListener('pointerup', (e) => this.onUp(e));
    canvas.addEventListener('pointercancel', (e) => this.onUp(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this.dragging = false;
  }

  onDown(e) {
    if (!this.enabled) return;
    AudioEngine.unlock();
    this.dragging = true;
    const w = this.renderer.screenToWorld(e.clientX, e.clientY);
    this.anchor = w;
    this.current = w;
    if (this.callbacks.onDragStart) this.callbacks.onDragStart(w);
  }

  onMove(e) {
    if (!this.enabled || !this.dragging) return;
    const w = this.renderer.screenToWorld(e.clientX, e.clientY);
    this.current = w;
    const dx = this.anchor.x - w.x;
    const dy = this.anchor.y - w.y;
    if (this.callbacks.onDragMove) this.callbacks.onDragMove(dx, dy, w);
  }

  onUp(e) {
    if (!this.enabled || !this.dragging) return;
    this.dragging = false;
    const w = this.renderer.screenToWorld(e.clientX, e.clientY);
    const dx = this.anchor.x - w.x;
    const dy = this.anchor.y - w.y;
    if (this.callbacks.onDragEnd) this.callbacks.onDragEnd(dx, dy);
  }
}
