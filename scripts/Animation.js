/**
 * Animation.js
 * Camera juice (shake + micro zoom) and the global slow-motion time
 * scale used on every bounce. GSAP drives the actual tweening so easing
 * feels premium; this module just exposes a tiny, game-friendly API.
 */
class Camera {
  constructor() {
    this.shakeX = 0;
    this.shakeY = 0;
    this.zoom = 1;
    this._shakeTween = null;
    this._zoomTween = null;
  }

  shake(amount = 8, duration = 0.18) {
    if (this._shakeTween) this._shakeTween.kill();
    const proxy = { t: 0 };
    this._shakeTween = gsap.to(proxy, {
      t: 1,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        const remaining = 1 - proxy.t;
        this.shakeX = (Math.random() - 0.5) * amount * remaining;
        this.shakeY = (Math.random() - 0.5) * amount * remaining;
      },
      onComplete: () => { this.shakeX = 0; this.shakeY = 0; },
    });
  }

  punchZoom(amount = 0.04, duration = 0.22) {
    if (this._zoomTween) this._zoomTween.kill();
    this.zoom = 1 + amount;
    this._zoomTween = gsap.to(this, { zoom: 1, duration, ease: 'power2.out' });
  }

  reset() {
    if (this._shakeTween) this._shakeTween.kill();
    if (this._zoomTween) this._zoomTween.kill();
    this.shakeX = 0; this.shakeY = 0; this.zoom = 1;
  }
}

class SlowMotion {
  constructor() {
    this.scale = 1;
    this._tween = null;
  }

  pulse(dipTo = 0.18, holdFor = 0.05, recover = 0.35) {
    if (this._tween) this._tween.kill();
    this.scale = dipTo;
    this._tween = gsap.to(this, { scale: 1, duration: recover, delay: holdFor, ease: 'power1.inOut' });
  }

  reset() {
    if (this._tween) this._tween.kill();
    this.scale = 1;
  }
}
