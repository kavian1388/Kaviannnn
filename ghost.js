import * as THREE from './assets/three.module.js';

export function sampleGhostPath(samples, elapsed) {
  if (!Array.isArray(samples) || samples.length < 2 || elapsed < samples[0].t || elapsed > samples[samples.length - 1].t) {
    return null;
  }

  let low = 0;
  let high = samples.length - 1;
  while (low < high - 1) {
    const middle = Math.floor((low + high) / 2);
    if (samples[middle].t <= elapsed) low = middle;
    else high = middle;
  }

  const start = samples[low];
  const end = samples[high];
  const duration = end.t - start.t;
  const amount = duration > 0 ? THREE.MathUtils.clamp((elapsed - start.t) / duration, 0, 1) : 0;
  return {
    x: THREE.MathUtils.lerp(start.x, end.x, amount),
    y: THREE.MathUtils.lerp(start.y, end.y, amount),
    scaleY: THREE.MathUtils.lerp(start.scaleY ?? 1, end.scaleY ?? 1, amount),
    score: THREE.MathUtils.lerp(start.score, end.score, amount),
    distance: THREE.MathUtils.lerp(start.distance, end.distance, amount),
    sliding: amount < 0.5 ? start.sliding === true : end.sliding === true
  };
}

export class GhostRunner {
  constructor(scene, samples) {
    this.samples = samples;
    this.group = new THREE.Group();
    this.body = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.1, 1.1),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.22, depthWrite: false })
    );
    this.edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(this.body.geometry),
      new THREE.LineBasicMaterial({ color: 0xa5f3fc, transparent: true, opacity: 0.88 })
    );
    this.edges.scale.setScalar(1.025);
    this.group.add(this.body, this.edges);
    this.group.visible = false;
    this.group.position.z = 0.12;
    scene.add(this.group);
  }

  update(elapsed) {
    const sample = sampleGhostPath(this.samples, elapsed);
    if (!sample) {
      this.group.visible = false;
      return null;
    }

    this.group.visible = true;
    this.group.position.x = sample.x;
    this.group.position.y = sample.y;
    this.group.scale.y = sample.scaleY;
    this.group.rotation.y += 0.015;
    this.body.material.opacity = sample.sliding ? 0.14 : 0.22;
    return sample;
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  dispose() {
    this.group.parent?.remove(this.group);
    this.body.geometry.dispose();
    this.body.material.dispose();
    this.edges.geometry.dispose();
    this.edges.material.dispose();
  }
}
