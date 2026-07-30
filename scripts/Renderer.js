/**
 * Renderer.js
 * Owns the canvas, handles responsive scaling of the fixed 720x1280
 * virtual playfield onto whatever device viewport it's running in, and
 * draws the full scene each frame (background, fog, level, entities,
 * particles, trajectory prediction).
 */
class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.virtualW = 720;
    this.virtualH = 1280;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.fogT = Math.random() * 100;
    this.dustSpawnTimer = 0;
    this.ambient = new ParticleSystem(120);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.scale = Math.min(w / this.virtualW, h / this.virtualH);
    this.offsetX = (w - this.virtualW * this.scale) / 2;
    this.offsetY = (h - this.virtualH * this.scale) / 2;
    this.screenW = w;
    this.screenH = h;
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale,
    };
  }

  beginWorldTransform(camera) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.offsetX + camera.shakeX, this.offsetY + camera.shakeY);
    const cx = this.virtualW / 2, cy = this.virtualH / 2;
    ctx.translate(cx * this.scale, cy * this.scale);
    ctx.scale(this.scale * camera.zoom, this.scale * camera.zoom);
    ctx.translate(-cx, -cy);
  }

  endWorldTransform() {
    this.ctx.restore();
  }

  renderBackground(dt) {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const grad = ctx.createLinearGradient(0, 0, 0, this.screenH);
    grad.addColorStop(0, '#0c0c0e');
    grad.addColorStop(0.55, '#111114');
    grad.addColorStop(1, '#050506');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.screenW, this.screenH);

    // Soft vignette
    const vg = ctx.createRadialGradient(
      this.screenW / 2, this.screenH * 0.4, this.screenH * 0.2,
      this.screenW / 2, this.screenH * 0.5, this.screenH * 0.9
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, this.screenW, this.screenH);
    ctx.restore();

    // Ambient fog bands (drawn in world space so they scroll with the arena)
    this.fogT += dt * 0.05;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.06;
    for (let i = 0; i < 3; i++) {
      const y = this.offsetY + ((Math.sin(this.fogT + i * 2) * 0.5 + 0.5) * this.virtualH) * this.scale;
      const fg = ctx.createLinearGradient(0, y - 80, 0, y + 80);
      fg.addColorStop(0, 'rgba(255,255,255,0)');
      fg.addColorStop(0.5, 'rgba(255,255,255,0.6)');
      fg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = fg;
      ctx.fillRect(0, y - 80, this.screenW, 160);
    }
    ctx.restore();

    // Ambient dust particles, in world space
    this.dustSpawnTimer -= dt;
    if (this.dustSpawnTimer <= 0) {
      this.ambient.emitDust(0, 0, this.virtualW, this.virtualH);
      this.dustSpawnTimer = 0.12;
    }
    this.ambient.update(dt);
  }

  renderAmbientParticles() {
    this.ambient.render(this.ctx);
  }

  renderTrajectory(points, bounceMarkers, glowColor) {
    const ctx = this.ctx;
    if (points.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const b of bounceMarkers) {
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = glowColor;
      ctx.fill();
    }
    ctx.restore();
  }

  clearWorld() {
    // no-op: full-frame background redraw already clears the canvas
  }
}
