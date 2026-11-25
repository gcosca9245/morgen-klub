// Erzeugt optimierte Bildvarianten (AVIF/WebP) und Scroll-Sequenzen aus assets-src/.
// Voraussetzung: ffmpeg im PATH. Ausgabe: public/media/.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = 'assets-src';
const OUT = 'public/media';
const IMAGES = ['hero-cup-tilt', 'hero-cup-top', 'hero-beans', 'rhythm-bags', 'club-1', 'club-2', 'club-3'];
const WIDTHS = [720, 1280];

/** Scroll-Sequenzen: Quelle, jedes n-te Bild, Zielbreiten. */
const SEQUENCES = [
  { name: 'hero', file: 'hero-transition.mp4', step: 2 },
];

mkdirSync(OUT, { recursive: true });

for (const name of IMAGES) {
  for (const w of WIDTHS) {
    const img = sharp(join(SRC, `${name}.jpg`)).resize({ width: w });
    await img.clone().avif({ quality: 52, effort: 6 }).toFile(join(OUT, `${name}-${w}.avif`));
    await img.clone().webp({ quality: 74 }).toFile(join(OUT, `${name}-${w}.webp`));
  }
}

const manifest = {};
for (const seq of SEQUENCES) {
  for (const w of WIDTHS) {
    const dir = join(OUT, 'seq', seq.name, String(w));
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    execFileSync('ffmpeg', [
      '-loglevel', 'error', '-i', join(SRC, seq.file),
      '-vf', `select='not(mod(n\\,${seq.step}))',scale=${w}:-2:flags=lanczos`,
      '-vsync', 'vfr', '-c:v', 'libwebp', '-quality', w > 1000 ? '70' : '64',
      join(dir, '%03d.webp'),
    ]);
    manifest[seq.name] = readdirSync(dir).filter((f) => f.endsWith('.webp')).length;
  }
}
// Der Drehteller kommt aus der 3D-Szene (scripts/turntable), nicht aus einem Film.
manifest.turntable = readdirSync(join(OUT, 'seq', 'turntable', '720')).filter((f) => f.endsWith('.webp')).length;
writeFileSync('src/lib/sequences.generated.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('Sequenzen:', manifest);

// Produktfotos der Röstungen: Etikett typografisch auf das Banderolen-Feld setzen (multiply).
const BAGS = [
  { file: 'bag-brown', no: '01', name: 'NACHTSCHICHT', ink: '#3a2a22', cx: 405, cy: 722 },
  { file: 'bag-white', no: '02', name: 'ERSTE SONNE', ink: '#5a3226', cx: 404, cy: 728 },
  { file: 'bag-grey', no: '03', name: 'STADTNEBEL', ink: '#2f3640', cx: 412, cy: 720 },
  { file: 'bag-ochre', no: '04', name: 'GOLDENE STUNDE', ink: '#5a3226', cx: 415, cy: 714 },
];
for (const bag of BAGS) {
  const meta = await sharp(join(SRC, `${bag.file}.jpg`)).metadata();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">
    <g fill="${bag.ink}" font-family="Bricolage Grotesque" text-anchor="middle">
      <text x="${bag.cx}" y="${bag.cy - 14}" font-size="30" font-weight="800" letter-spacing="0.5">MORGEN KLUB</text>
      <text x="${bag.cx}" y="${bag.cy + 22}" font-size="15" font-weight="600" letter-spacing="3">Nº ${bag.no} · ${bag.name}</text>
      <text x="${bag.cx}" y="${bag.cy + 46}" font-size="11" font-weight="500" letter-spacing="2" opacity="0.75">250 G · FRISCH GERÖSTET IN KÖLN</text>
    </g></svg>`;
  const labelled = await sharp(join(SRC, `${bag.file}.jpg`))
    .composite([{ input: Buffer.from(svg), blend: 'multiply' }])
    .toBuffer();
  for (const w of [480, 800]) {
    const img = sharp(labelled).resize({ width: w });
    await img.clone().avif({ quality: 54, effort: 6 }).toFile(join(OUT, `${bag.file}-${w}.avif`));
    await img.clone().webp({ quality: 76 }).toFile(join(OUT, `${bag.file}-${w}.webp`));
  }
}
console.log('Produktfotos fertig');
