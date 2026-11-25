import * as THREE from 'three';

/** Prozedurale Canvas-Texturen: keine Bild-Downloads, gestochen scharf in jeder Auflösung. */

function canvas(w: number, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D-Canvas nicht verfügbar');
  return { c, ctx };
}

function toTexture(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Deterministischer Zufall, damit jede Ladung gleich aussieht. */
export function rng(seed = 7) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const DISPLAY = '"Bricolage Grotesque Variable", ui-sans-serif, system-ui, sans-serif';

/** Nussbaum mit feiner Maserung (für Griff, Paddel, Dampfknauf). */
export function walnutTexture() {
  const { c, ctx } = canvas(512, 128);
  const r = rng(11);
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#5a3420');
  g.addColorStop(0.5, '#6e4128');
  g.addColorStop(1, '#4e2c1b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 70; i++) {
    const y0 = r() * 128;
    ctx.strokeStyle = `rgba(${30 + r() * 30},${16 + r() * 12},${8},${0.18 + r() * 0.25})`;
    ctx.lineWidth = 0.6 + r() * 1.8;
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const y = y0 + Math.sin(x * 0.012 + i) * (2 + r() * 2.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const t = toTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Manometer: cremefarbenes Zifferblatt 0–15 bar, Brühbereich hervorgehoben. */
export function gaugeTexture() {
  const S = 512;
  const { c, ctx } = canvas(S);
  const cx = S / 2;
  const grd = ctx.createRadialGradient(cx, cx * 0.8, 20, cx, cx, cx);
  grd.addColorStop(0, '#fffaf2');
  grd.addColorStop(1, '#efe4d2');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cx, cx, 0, Math.PI * 2);
  ctx.fill();
  const a0 = Math.PI * 0.75;
  const span = Math.PI * 1.5;
  // Brühbereich 8–11 bar
  ctx.strokeStyle = '#a9693b';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.arc(cx, cx, cx * 0.78, a0 + (span * 8) / 15, a0 + (span * 11) / 15);
  ctx.stroke();
  ctx.strokeStyle = '#2a1a13';
  ctx.fillStyle = '#2a1a13';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 30; i++) {
    const a = a0 + (span * i) / 30;
    const major = i % 2 === 0;
    const r1 = cx * 0.86;
    const r2 = cx * (major ? 0.72 : 0.78);
    ctx.lineWidth = major ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cx + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cx + Math.sin(a) * r2);
    ctx.stroke();
    if (major && (i / 2) % 3 === 0) {
      ctx.font = `700 44px ${DISPLAY}`;
      ctx.fillText(String(i / 2), cx + Math.cos(a) * cx * 0.57, cx + Math.sin(a) * cx * 0.57);
    }
  }
  ctx.font = `800 34px ${DISPLAY}`;
  ctx.fillText('BAR', cx, cx * 1.32);
  ctx.font = `600 22px ${DISPLAY}`;
  ctx.fillStyle = '#864d28';
  ctx.fillText('MORGEN KLUB', cx, cx * 0.62);
  return toTexture(c);
}

/** Gravierte Typo-Plakette für die Haube. */
export function badgeTexture() {
  const { c, ctx } = canvas(1024, 256);
  ctx.clearRect(0, 0, 1024, 256);
  ctx.fillStyle = '#f8f2e7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 132px ${DISPLAY}`;
  ctx.fillText('MORGEN KLUB', 512, 118);
  ctx.font = `600 34px ${DISPLAY}`;
  ctx.globalAlpha = 0.75;
  ctx.fillText('K Ö L N  ·  S E I T  2 0 1 9', 512, 212);
  return toTexture(c);
}

/** Crema von oben: Haselnuss mit Tigerung und feinen Bläschen. */
export function cremaTexture() {
  const S = 512;
  const { c, ctx } = canvas(S);
  const r = rng(3);
  const g = ctx.createRadialGradient(S / 2, S / 2, 10, S / 2, S / 2, S / 2);
  g.addColorStop(0, '#c88c55');
  g.addColorStop(0.55, '#b0703c');
  g.addColorStop(0.92, '#7d4421');
  g.addColorStop(1, '#5b2e16');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 900; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * S * 0.47;
    const x = S / 2 + Math.cos(a) * d;
    const y = S / 2 + Math.sin(a) * d;
    const rad = 0.6 + r() * r() * 4;
    ctx.fillStyle = r() > 0.5 ? 'rgba(90,45,20,0.35)' : 'rgba(240,200,150,0.35)';
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(c);
}

/** Weicher Dampf-Puff für Sprites. */
export function puffTexture() {
  const S = 128;
  const { c, ctx } = canvas(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c);
}

/** Weicher Kontaktschatten (wird unter Maschine/Mühle gelegt). */
export function contactShadowTexture() {
  const S = 256;
  const { c, ctx } = canvas(S);
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(42,26,19,0.55)');
  g.addColorStop(0.6, 'rgba(42,26,19,0.18)');
  g.addColorStop(1, 'rgba(42,26,19,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c, false);
}
