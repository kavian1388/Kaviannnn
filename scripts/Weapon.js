/**
 * Weapon.js
 * Renders the pistol the player is always holding. Geometry is fixed;
 * only material (color/gloss/glow) changes per equipped skin so skins
 * feel meaningfully different without needing separate art.
 */
class Weapon {
  constructor(owner) {
    this.owner = owner;
    this.muzzleFlash = 0;
  }

  triggerMuzzleFlash() {
    this.muzzleFlash = 1;
  }

  update(dt) {
    this.muzzleFlash = Utils.lerp(this.muzzleFlash, 0, Math.min(1, dt * 14));
  }

  render(ctx) {
    const skin = SkinManager.getEquippedSkinData();

    ctx.save();
    // Slide + frame
    const bodyGrad = ctx.createLinearGradient(-4, -8, 4, 30);
    bodyGrad.addColorStop(0, skin.metalLight);
    bodyGrad.addColorStop(1, skin.metalDark);
    ctx.fillStyle = bodyGrad;

    // Grip
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.lineTo(4, 6);
    ctx.lineTo(6, 26);
    ctx.lineTo(-6, 26);
    ctx.closePath();
    ctx.fill();

    // Slide/barrel
    ctx.beginPath();
    ctx.moveTo(-5, 4);
    ctx.lineTo(5, 4);
    ctx.lineTo(5, -30);
    ctx.lineTo(-5, -30);
    ctx.closePath();
    ctx.fill();

    // Trigger guard
    ctx.strokeStyle = skin.metalDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 10, 5, 0, Math.PI);
    ctx.stroke();

    // Subtle rim light along the top of the slide for premium feel
    ctx.strokeStyle = skin.rim;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, -30);
    ctx.lineTo(5, -30);
    ctx.stroke();

    // Muzzle flash
    if (this.muzzleFlash > 0.02) {
      ctx.save();
      ctx.globalAlpha = this.muzzleFlash;
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = skin.glow;
      ctx.beginPath();
      const s = 6 + this.muzzleFlash * 10;
      ctx.moveTo(0, -32);
      ctx.lineTo(-s * 0.4, -32 - s);
      ctx.lineTo(0, -32 - s * 1.6);
      ctx.lineTo(s * 0.4, -32 - s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }
}
