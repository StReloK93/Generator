import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

// Builds every PWA icon size from one square source image (full-bleed, 1024×1024).

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.resolve(root, 'src/assets/ui/app-icon.webp');
const targetDir = path.resolve(root, 'public/icons');
fs.mkdirSync(targetDir, { recursive: true });

async function buildIcons() {
  const SIZE = 1024;
  const fullBleed = await sharp(SOURCE).resize(SIZE, SIZE, { fit: 'cover' }).png().toBuffer();

  const roundedMask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" rx="224" fill="#fff"/></svg>`,
  );
  const rounded = await sharp(fullBleed).composite([{ input: roundedMask, blend: 'dest-in' }]).png().toBuffer();

  const out = (source, size, file) =>
    sharp(source).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.resolve(targetDir, file));

  await out(rounded, 192, 'icon-192.png');
  await out(rounded, 512, 'icon-512.png');
  await out(rounded, 64, 'favicon-64.png');
  // Maskable and Apple icons are full-bleed: the OS applies its own mask/rounding.
  await out(fullBleed, 512, 'icon-maskable-512.png');
  await out(fullBleed, 180, 'apple-touch-icon.png');

  console.log('Generated PWA icons in public/icons');
}

buildIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
