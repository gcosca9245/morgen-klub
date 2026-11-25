export type Hotspot = 'power' | 'hopper' | 'grinder' | 'paddle';

/** Gemeinsame Schnittstelle der 3D-Szene und der 2D-Ersatzvariante. */
export interface GameScene {
  powerOn(): Promise<void>;
  fillBeans(): Promise<void>;
  grind(): Promise<void>;
  brew(onProgress?: (p: number) => void): Promise<void>;
  reset(): void;
  setHint(h: Hotspot | null): void;
  setVisible(v: boolean): void;
  resize(): void;
  dispose(): void;
}
