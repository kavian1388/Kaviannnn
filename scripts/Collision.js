/**
 * Collision.js
 * Orchestrates a single bullet-vs-world collision test per substep.
 * Kept separate from Physics.js (raw math) so Bullet.js reads like a
 * clean state machine.
 */
const Collision = (() => {
  function testWalls(bullet, walls) {
    for (const wall of walls) {
      if (wall.broken) continue;
      let res;
      if (wall.type === 'rotating') {
        res = Physics.reflectCircleRotatedRect(bullet.x, bullet.y, bullet.vx, bullet.vy, bullet.radius, wall);
      } else {
        const rect = wall.getCollisionRect ? wall.getCollisionRect() : wall;
        res = Physics.reflectCircleRect(bullet.x, bullet.y, bullet.vx, bullet.vy, bullet.radius, rect);
      }
      if (res) return { wall, res };
    }
    return null;
  }

  function testEnemies(bullet, enemies) {
    const hits = [];
    for (const enemy of enemies) {
      if (enemy.dead) continue;
      const d = Utils.dist(bullet.x, bullet.y, enemy.x, enemy.y);
      if (d <= bullet.radius + enemy.radius) hits.push(enemy);
    }
    return hits;
  }

  function testTeleporters(bullet, teleporters) {
    for (const tp of teleporters) {
      const d = Utils.dist(bullet.x, bullet.y, tp.x, tp.y);
      if (d <= tp.radius) return tp;
    }
    return null;
  }

  function outOfBounds(x, y, w, h, margin = 60) {
    return x < -margin || x > w + margin || y < -margin || y > h + margin;
  }

  return { testWalls, testEnemies, testTeleporters, outOfBounds };
})();
