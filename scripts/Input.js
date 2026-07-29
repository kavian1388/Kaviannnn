/**
 * Input.js
 * The entire control scheme is one finger: tap the left half of the screen
 * to rotate the city left, tap the right half to rotate right. Input is
 * locked out while a rotation animation is in flight or while the game is
 * not actively "playing".
 */
(function (RC) {
  'use strict';

  function Input(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.enabled = true;
    this._bind();
  }

  Input.prototype._bind = function () {
    const self = this;
    const handler = function (clientX) {
      if (!self.enabled) return;
      if (!self.game.canAcceptInput()) return;
      const rect = self.canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const half = rect.width / 2;
      if (x < half) self.game.rotateWorld('left');
      else self.game.rotateWorld('right');
    };

    this.canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      handler(e.clientX);
    }, { passive: false });

    // Fallback for very old browsers without Pointer Events.
    this.canvas.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches.length) {
        e.preventDefault();
        handler(e.touches[0].clientX);
      }
    }, { passive: false });
  };

  Input.prototype.setEnabled = function (v) { this.enabled = v; };

  RC.Input = Input;

})(window.RC = window.RC || {});
