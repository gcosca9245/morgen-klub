/**
 * Lädt eine Bildsequenz progressiv (grob → fein) und zeichnet den passenden Frame
 * per „object-fit: cover“ auf ein Canvas. So ist Scrubbing sofort möglich, auch wenn
 * erst ein Teil der Frames geladen ist: es wird immer der nächstliegende geladene Frame gezeigt.
 */
export interface FrameSequenceOptions {
  urlFor: (index: number) => string;
  count: number;
  /** Horizontaler Fokuspunkt beim Zuschneiden (0 = links, 1 = rechts). */
  focusX?: number;
  focusY?: number;
}

export class FrameSequence {
  private readonly frames: (HTMLImageElement | null)[];
  private readonly opts: Required<FrameSequenceOptions>;
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastDrawn = -1;
  private lastSize = '';
  private target = 0;
  private disposed = false;
  private started = false;

  constructor(opts: FrameSequenceOptions) {
    this.opts = { focusX: 0.5, focusY: 0.5, ...opts };
    this.frames = Array.from({ length: opts.count }, () => null);
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize();
  }

  /** Lädt zuerst jeden 8., dann 4., 2. und schließlich jeden Frame. */
  load(): Promise<void> {
    if (this.started) return Promise.resolve();
    this.started = true;
    const order: number[] = [];
    const seen = new Set<number>();
    for (const step of [8, 4, 2, 1]) {
      for (let i = 0; i < this.opts.count; i += step) {
        if (!seen.has(i)) {
          seen.add(i);
          order.push(i);
        }
      }
    }
    const last = this.opts.count - 1;
    if (!seen.has(last)) order.splice(1, 0, last);

    const queue = [...order];
    const worker = async () => {
      while (queue.length && !this.disposed) {
        const i = queue.shift()!;
        const img = new Image();
        img.decoding = 'async';
        img.src = this.opts.urlFor(i);
        try {
          await img.decode();
          this.frames[i] = img;
          if (Math.abs(i - this.target) <= Math.abs(this.lastDrawn - this.target)) this.render(true);
        } catch {
          /* Einzelner Frame fehlgeschlagen – der Nachbar übernimmt. */
        }
      }
    };
    return Promise.all(Array.from({ length: 6 }, worker)).then(() => undefined);
  }

  resize() {
    const c = this.canvas;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
    }
    this.render(true);
  }

  /** progress 0..1 → Frame */
  setProgress(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    this.target = Math.round(p * (this.opts.count - 1));
    this.render(false);
  }

  private nearestLoaded(target: number): number {
    for (let d = 0; d < this.opts.count; d++) {
      if (this.frames[target - d]) return target - d;
      if (this.frames[target + d]) return target + d;
    }
    return -1;
  }

  private render(force: boolean) {
    const { ctx, canvas } = this;
    if (!ctx || !canvas || canvas.width === 0) return;
    const index = this.nearestLoaded(this.target);
    if (index < 0) return;
    const size = `${canvas.width}x${canvas.height}`;
    if (!force && index === this.lastDrawn && size === this.lastSize) return;
    const img = this.frames[index]!;
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (canvas.width - dw) * this.opts.focusX;
    const dy = (canvas.height - dh) * this.opts.focusY;
    ctx.drawImage(img, dx, dy, dw, dh);
    this.lastDrawn = index;
    this.lastSize = size;
  }

  dispose() {
    this.disposed = true;
    this.canvas = null;
    this.ctx = null;
  }
}
