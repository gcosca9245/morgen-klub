import type { GameScene } from './game-scene';

/**
 * Ersatz ohne WebGL (oder nach Kontextverlust): gleiche Schritte und Zeiten, die Bühne zeigt
 * vorgerenderte Standbilder. So bleibt das Spiel auf jedem Gerät spielbar.
 */
export class FallbackScene implements GameScene {
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly reducedMotion: boolean) {}

  private wait(ms: number) {
    return new Promise<void>((resolve) => {
      const t = setTimeout(
        () => {
          this.timers.delete(t);
          resolve();
        },
        this.reducedMotion ? Math.min(ms, 250) : ms,
      );
      this.timers.add(t);
    });
  }

  powerOn() {
    return this.wait(1800);
  }
  fillBeans() {
    return this.wait(1400);
  }
  grind() {
    return this.wait(2600);
  }
  async brew(onProgress?: (p: number) => void) {
    const steps = this.reducedMotion ? 2 : 27;
    for (let i = 1; i <= steps; i++) {
      await this.wait(200);
      onProgress?.(i / steps);
    }
  }
  reset() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }
  setHint() {}
  setVisible() {}
  resize() {}
  dispose() {
    this.reset();
  }
}
