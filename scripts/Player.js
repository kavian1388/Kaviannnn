/**
 * Player.js
 * Draws a minimal, premium silhouette operator: visible body, arms and
 * hands gripping the pistol at all times. No sprite assets are used -
 * the whole character is procedural vector art so it stays crisp at any
 * resolution and costs zero load time.
 */
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.aimAngle = -Math.PI / 2;
    this.breathT = Math.random() * 10;
    this.recoil = 0;
    this.weapon = new Weapon(this);
  }

  update(dt, aiming) {
    this.breathT += dt;
    this.recoil = Utils.lerp(this.recoil, 0, Math.min(1, dt * 10));
    this.aimingAmount = Utils.lerp(this.aimingAmount || 0, aiming ? 1 : 0, Math.min(1, dt * 8));
  }

  setAim(angle) {
    this.aimAngle = angle;
  }

  fireRecoil() {
    this.recoil = 1;
  }

  render(ctx) {
    const breathe = Math.sin(this.breathT * 1.6) * 2.5 * (1 - (this.aimingAmount || 0));
    ctx.save();
    ctx.translate(this.x, this.y + breathe);

    // Soft ground contact shadow for depth against the dark gradient bg.
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 46, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Legs
    ctx.fillStyle = '#1c1c1f';
    ctx.beginPath();
    ctx.moveTo(-12, 10);
    ctx.lineTo(-16, 44);
    ctx.lineTo(-6, 44);
    ctx.lineTo(-4, 12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 10);
    ctx.lineTo(16, 44);
    ctx.lineTo(6, 44);
    ctx.lineTo(4, 12);
    ctx.closePath();
    ctx.fill();

    // Torso (slight lean toward aim direction for readability)
    const lean = Math.cos(this.aimAngle) * 4;
    ctx.save();
    ctx.translate(lean, 0);
    const grad = ctx.createLinearGradient(0, -30, 0, 14);
    grad.addColorStop(0, '#3a3a3e');
    grad.addColorStop(1, '#141416');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-15, 12);
    ctx.quadraticCurveTo(-17, -12, -10, -28);
    ctx.quadraticCurveTo(0, -34, 10, -28);
    ctx.quadraticCurveTo(17, -12, 15, 12);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#232326';
    ctx.beginPath();
    ctx.ellipse(0, -38, 9.5, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Arms + weapon, rotated toward aim angle
    ctx.save();
    ctx.translate(lean, -14);
    ctx.rotate(this.aimAngle + Math.PI / 2);
    ctx.translate(0, this.recoil * -3);

    // Back arm
    ctx.fillStyle = '#2a2a2e';
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.quadraticCurveTo(-10, 20, -4, 34);
    ctx.lineTo(4, 32);
    ctx.quadraticCurveTo(2, 16, 4, 2);
    ctx.closePath();
    ctx.fill();

    this.weapon.render(ctx);

    // Front arm (drawn over weapon grip for a gripped look)
    ctx.fillStyle = '#323236';
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.quadraticCurveTo(10, 18, 6, 30);
    ctx.lineTo(-2, 28);
    ctx.quadraticCurveTo(0, 14, -2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }
}
