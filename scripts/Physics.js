/**
 * Physics.js
 * Lightweight 2D physics helpers for the bullet simulation. Kept
 * deliberately simple (AABB reflection) so it is fast, deterministic and
 * cheap to re-run many times per frame for the trajectory prediction.
 */
const Physics = (() => {
  const BULLET_SPEED = 980; // px/sec at launch, scaled by drag strength
  const FRICTION = 0.0; // bullet does not slow down - keeps shots feeling snappy
  const GRAVITY_ZONE_ACCEL = 480; // px/sec^2 inside a gravity zone
  const SPEED_ZONE_MULT = 1.9;
  const MAGNET_RADIUS = 140;
  const MAGNET_STRENGTH = 260;
  const MAX_BOUNCES_BEFORE_DEATH = 40;
  const MIN_LAUNCH_SPEED = 620;
  const MAX_LAUNCH_SPEED = 1500;

  /**
   * Resolves a moving circle against an axis aligned wall, reflecting the
   * velocity across whichever axis was penetrated. Returns null if no
   * collision, otherwise the resolved position + velocity + which side hit.
   */
  function reflectCircleRect(px, py, vx, vy, radius, wall) {
    const nearestX = Utils.clamp(px, wall.x, wall.x + wall.w);
    const nearestY = Utils.clamp(py, wall.y, wall.y + wall.h);
    const dx = px - nearestX;
    const dy = py - nearestY;
    const distSq = dx * dx + dy * dy;
    if (distSq > radius * radius) return null;

    const distV = Math.sqrt(distSq) || 0.0001;
    const nx = dx / distV;
    const ny = dy / distV;

    // Push the bullet back out along the collision normal so it doesn't
    // tunnel/stick inside the wall on the next frame.
    const pushX = px + nx * (radius - distV + 0.5);
    const pushY = py + ny * (radius - distV + 0.5);

    // Reflect velocity: v' = v - 2(v.n)n
    const dot = vx * nx + vy * ny;
    const rvx = vx - 2 * dot * nx;
    const rvy = vy - 2 * dot * ny;

    return { x: pushX, y: pushY, vx: rvx, vy: rvy, nx, ny };
  }

  function applyZones(vx, vy, dt, zones, bx, by) {
    let outVx = vx;
    let outVy = vy;
    for (const zone of zones) {
      const inside =
        bx >= zone.x && bx <= zone.x + zone.w && by >= zone.y && by <= zone.y + zone.h;
      if (!inside) continue;
      if (zone.type === 'gravity') {
        outVy += GRAVITY_ZONE_ACCEL * dt;
      } else if (zone.type === 'speed') {
        outVx *= SPEED_ZONE_MULT ** dt;
        outVy *= SPEED_ZONE_MULT ** dt;
      }
    }
    return { vx: outVx, vy: outVy };
  }

  function applyMagnets(vx, vy, dt, walls, bx, by) {
    let outVx = vx;
    let outVy = vy;
    for (const wall of walls) {
      if (wall.type !== 'magnetic') continue;
      const cx = wall.x + wall.w / 2;
      const cy = wall.y + wall.h / 2;
      const d = Utils.dist(bx, by, cx, cy);
      if (d < MAGNET_RADIUS && d > 4) {
        const pull = (1 - d / MAGNET_RADIUS) * MAGNET_STRENGTH;
        outVx += ((cx - bx) / d) * pull * dt;
        outVy += ((cy - by) / d) * pull * dt;
      }
    }
    return { vx: outVx, vy: outVy };
  }

  /**
   * Collision for rotating walls, represented as an oriented rectangle
   * {cx, cy, length, thickness, angle}. We transform the bullet position
   * into the rectangle's local (unrotated) space, run the same AABB
   * style test, then rotate the resulting normal back into world space.
   */
  function reflectCircleRotatedRect(px, py, vx, vy, radius, wall) {
    const cos = Math.cos(-wall.angle);
    const sin = Math.sin(-wall.angle);
    const dxw = px - wall.cx;
    const dyw = py - wall.cy;
    const lx = dxw * cos - dyw * sin;
    const ly = dxw * sin + dyw * cos;

    const hw = wall.length / 2;
    const hh = wall.thickness / 2;
    const nearestX = Utils.clamp(lx, -hw, hw);
    const nearestY = Utils.clamp(ly, -hh, hh);
    const ddx = lx - nearestX;
    const ddy = ly - nearestY;
    const distSq = ddx * ddx + ddy * ddy;
    if (distSq > radius * radius) return null;

    const distV = Math.sqrt(distSq) || 0.0001;
    const lnx = ddx / distV;
    const lny = ddy / distV;

    const wcos = Math.cos(wall.angle);
    const wsin = Math.sin(wall.angle);
    const nx = lnx * wcos - lny * wsin;
    const ny = lnx * wsin + lny * wcos;

    const pushLX = nearestX + lnx * (radius - distV + 0.5);
    const pushLY = nearestY + lny * (radius - distV + 0.5);
    const pushX = wall.cx + pushLX * wcos - pushLY * wsin;
    const pushY = wall.cy + pushLX * wsin + pushLY * wcos;

    const dot = vx * nx + vy * ny;
    const rvx = vx - 2 * dot * nx;
    const rvy = vy - 2 * dot * ny;

    return { x: pushX, y: pushY, vx: rvx, vy: rvy, nx, ny };
  }

  return {
    BULLET_SPEED,
    FRICTION,
    MAX_BOUNCES_BEFORE_DEATH,
    MIN_LAUNCH_SPEED,
    MAX_LAUNCH_SPEED,
    reflectCircleRect,
    reflectCircleRotatedRect,
    applyZones,
    applyMagnets,
  };
})();
