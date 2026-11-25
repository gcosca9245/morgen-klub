/**
 * Scroll-Bildsequenz, speicherschonend für Mobilgeräte:
 * - Frames werden progressiv (grob → fein) nur als komprimierte Blobs geladen (wenige MB).
 * - Dekodiert wird erst bei Bedarf und abseits des Main-Threads (`createImageBitmap`), direkt in
 *   Canvas-Größe. Ein kleiner LRU-Cache hält nur die gerade benötigten Bitmaps im Speicher.
 * - Gezeichnet wird immer der nächstliegende verfügbare Frame, Scrubbing ist also sofort möglich.
 */
export interface FrameSequenceOptions {
  urlFor: (index: number) => string;
  count: number;
  /** Horizontaler Fokuspunkt beim Zuschneiden (0 = links, 1 = rechts). */
  focusX?: number;
  focusY?: number;
  /** Maximale Pixeldichte des Canvas (Mobil: 1.5). */
  maxDpr?: number;
  /** Anzahl gleichzeitig dekodierter Frames. */
  cacheSize?: number;
}

type Drawable = ImageBitmap | HTMLImageElement;

const canBitmap = typeof window !== 'undefined' && 'createImageBitmap' in window;

/** Grobe Gerätewahl: Touch-Geräte bekommen geringere Pixeldichte und kleineren Cache. */
export function isCoarsePointer() {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

export class FrameSequence {
  private readonly blobs: (Blob | null)[];
  private readonly cache = new Map<number, Drawable>();
  private readonly decoding = new Set<number>();
  private readonly opts: Required<FrameSequenceOptions>;
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private lastDrawn = -1;
  private lastSize = '';
  private target = 0;
  private disposed = false;
  private started = false;
  private abort = new AbortController();
  /** Originalmaße der Frames (alle gleich groß), nach dem ersten Dekodieren bekannt. */
  private natural: { w: number; h: number } | null = null;

  constructor(opts: FrameSequenceOptions) {
    const coarse = isCoarsePointer();
    this.opts = { focusX: 0.5, focusY: 0.5, maxDpr: coarse ? 1.5 : 2, cacheSize: coarse ? 8 : 24, ...opts };
    this.blobs = Array.from({ length: opts.count }, () => null);
  }

  attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize();
  }

  /** Lädt zuerst jeden 8., dann 4., 2. und schließlich jeden Frame (nur Bytes, keine Dekodierung). */
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
        try {
          const res = await fetch(this.opts.urlFor(i), { signal: this.abort.signal });
          if (!res.ok) continue;
          this.blobs[i] = await res.blob();
          // Neu geladener Frame liegt näher am Ziel als der gezeichnete? Dann dekodieren.
          if (Math.abs(i - this.target) < Math.abs(this.lastDrawn - this.target) || this.lastDrawn < 0) this.request(i);
        } catch {
          /* Abbruch oder einzelner Frame fehlgeschlagen – der Nachbar übernimmt. */
        }
      }
    };
    return Promise.all(Array.from({ length: 4 }, worker)).then(() => undefined);
  }

  resize() {
    const c = this.canvas;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.maxDpr);
    const w = Math.round(c.clientWidth * dpr);
    const h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
      // Bitmaps sind auf die alte Größe dekodiert
      this.clearCache();
    }
    this.render(true);
  }

  /** progress 0..1 → Frame */
  setProgress(progress: number) {
    const p = Math.min(1, Math.max(0, progress));
    const next = Math.round(p * (this.opts.count - 1));
    const dir = Math.sign(next - this.target) || 1;
    this.target = next;
    this.request(next);
    this.request(next + dir); // Vorausdekodieren in Scrollrichtung
    this.render(false);
  }

  private clearCache() {
    for (const d of this.cache.values()) if ('close' in d) d.close();
    this.cache.clear();
    this.lastDrawn = -1;
  }

  private nearest<T>(target: number, has: (i: number) => T | null | undefined): number {
    for (let d = 0; d < this.opts.count; d++) {
      if (has(target - d)) return target - d;
      if (has(target + d)) return target + d;
    }
    return -1;
  }

  /** Dekodiert den Frame mit Blob, der dem Index am nächsten liegt (asynchron). */
  private request(index: number) {
    if (index < 0 || index >= this.opts.count) return;
    const i = this.nearest(index, (k) => this.blobs[k]);
    if (i < 0 || this.cache.has(i) || this.decoding.has(i)) return;
    const blob = this.blobs[i];
    const c = this.canvas;
    if (!blob || !c) return;
    this.decoding.add(i);
    void this.decode(blob, c)
      .then((d) => {
        this.decoding.delete(i);
        if (!d) return;
        if (this.disposed) {
          if ('close' in d) d.close();
          return;
        }
        this.cache.set(i, d);
        this.evict();
        if (Math.abs(i - this.target) <= Math.abs(this.lastDrawn - this.target) || this.lastDrawn < 0) this.render(true);
      })
      .catch(() => this.decoding.delete(i));
  }

  private async decode(blob: Blob, c: HTMLCanvasElement): Promise<Drawable | null> {
    if (canBitmap) {
      if (!this.natural) {
        const probe = await createImageBitmap(blob);
        this.natural = { w: probe.width, h: probe.height };
        probe.close();
      }
      // Direkt in Zielgröße dekodieren (cover) – spart Speicher und Zeichenaufwand.
      const scale = Math.min(1, Math.max(c.width / this.natural.w, c.height / this.natural.h));
      return createImageBitmap(blob, {
        resizeWidth: Math.max(1, Math.round(this.natural.w * scale)),
        resizeHeight: Math.max(1, Math.round(this.natural.h * scale)),
        resizeQuality: 'high',
      });
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = URL.createObjectURL(blob);
    try {
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(img.src);
    }
  }

  /** Behält nur die Frames nahe am Ziel. */
  private evict() {
    if (this.cache.size <= this.opts.cacheSize) return;
    const keys = [...this.cache.keys()].sort((a, b) => Math.abs(b - this.target) - Math.abs(a - this.target));
    while (this.cache.size > this.opts.cacheSize) {
      const k = keys.shift();
      if (k === undefined || k === this.lastDrawn) break;
      const d = this.cache.get(k);
      if (d && 'close' in d) d.close();
      this.cache.delete(k);
    }
  }

  private render(force: boolean) {
    const { ctx, canvas } = this;
    if (!ctx || !canvas || canvas.width === 0) return;
    const index = this.nearest(this.target, (k) => this.cache.get(k));
    if (index < 0) {
      this.request(this.target);
      return;
    }
    const size = `${canvas.width}x${canvas.height}`;
    if (!force && index === this.lastDrawn && size === this.lastSize) return;
    const img = this.cache.get(index)!;
    const w = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
    const h = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
    const scale = Math.max(canvas.width / w, canvas.height / h);
    const dw = w * scale;
    const dh = h * scale;
    ctx.drawImage(img, (canvas.width - dw) * this.opts.focusX, (canvas.height - dh) * this.opts.focusY, dw, dh);
    this.lastDrawn = index;
    this.lastSize = size;
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.clearCache();
    this.canvas = null;
    this.ctx = null;
  }
}
