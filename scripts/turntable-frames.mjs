// Wandelt die gerenderten Drehteller-Frames (scripts/turntable/frames/*.png, 1600 px)
// in WebP-Sequenzen für 1280 und 720 px um. Rendern: siehe scripts/turntable/README.md
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2] ?? 'scripts/turntable/frames';
const files = readdirSync(SRC).filter((f) => f.endsWith('.png')).sort();
for (const w of [720, 1280]) {
  const dir = join('public/media/seq/turntable', String(w));
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  await Promise.all(
    files.map((f, i) =>
      sharp(join(SRC, f))
        .resize({ width: w, kernel: 'lanczos3' })
        .webp({ quality: w > 1000 ? 76 : 70 })
        .toFile(join(dir, `${String(i + 1).padStart(3, '0')}.webp`)),
    ),
  );
}
console.log(`Drehteller: ${files.length} Frames`);
