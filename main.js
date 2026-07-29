/**
 * main.js
 * Boots the game once the DOM is ready. Loads saved progress, hides the tap
 * hint after the first input, and starts the player on whatever level they
 * last reached (Level 1 on first ever launch).
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    RC.Save.load();

    const canvas = document.getElementById('game-canvas');
    const game = new RC.Game(canvas);

    const startLevel = RC.Save.data.currentLevel || 1;
    game.loadLevelNumber(startLevel);

    // Hide the directional hint text after the player's first tap.
    const hint = document.getElementById('tap-hint');
    canvas.addEventListener('pointerdown', function once() {
      hint.style.transition = 'opacity 0.4s ease';
      hint.style.opacity = '0';
      canvas.removeEventListener('pointerdown', once);
    });
  });
})();
