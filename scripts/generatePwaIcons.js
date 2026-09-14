import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../public/icons');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 512x512 High-fidelity Isometric Tower Defense App Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="70%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#030712" />
    </radialGradient>
    <radialGradient id="cyanCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="wallLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <linearGradient id="wallRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="topRoof" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#10b981" />
    </linearGradient>
    <linearGradient id="goldCrown" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Squircle / Base -->
  <rect width="512" height="512" rx="112" fill="url(#bgGlow)" />
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="#1e293b" stroke-width="4" stroke-opacity="0.8" />
  
  <!-- Subtle Grid Base Lines -->
  <path d="M 128 384 L 256 448 L 384 384 L 256 320 Z" fill="#0f172a" stroke="#334155" stroke-width="3" stroke-opacity="0.4" />
  <path d="M 64 352 L 256 448 L 448 352" fill="none" stroke="#10b981" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="6,6" />

  <!-- Core Energy Glow -->
  <circle cx="256" cy="240" r="140" fill="url(#cyanCore)" />

  <!-- Isometric Lower Fortress Base -->
  <g transform="translate(0, 40)">
    <!-- Base Left Face -->
    <path d="M 160 300 L 256 348 L 256 380 L 160 332 Z" fill="#064e3b" />
    <!-- Base Right Face -->
    <path d="M 256 348 L 352 300 L 352 332 L 256 380 Z" fill="#022c22" />
  </g>

  <!-- Main Isometric Tower -->
  <!-- Left Wall -->
  <path d="M 176 250 L 256 290 L 256 370 L 176 330 Z" fill="url(#wallLeft)" />
  <!-- Right Wall -->
  <path d="M 256 290 L 336 250 L 336 330 L 256 370 Z" fill="url(#wallRight)" />
  <!-- Center Divide Accent Line -->
  <line x1="256" y1="290" x2="256" y2="370" stroke="#34d399" stroke-width="2.5" stroke-opacity="0.5" />

  <!-- Upper Battlement / Parapet -->
  <!-- Left Rim -->
  <path d="M 160 210 L 256 258 L 256 268 L 160 220 Z" fill="#047857" />
  <!-- Right Rim -->
  <path d="M 256 258 L 352 210 L 352 220 L 256 268 Z" fill="#064e3b" />
  <!-- Top Platform -->
  <path d="M 160 210 L 256 162 L 352 210 L 256 258 Z" fill="url(#topRoof)" />

  <!-- Tower Battlements Teeth -->
  <path d="M 160 210 L 176 202 L 176 186 L 160 194 Z" fill="#34d399" />
  <path d="M 240 170 L 256 162 L 256 146 L 240 154 Z" fill="#6ee7b7" />
  <path d="M 336 202 L 352 210 L 352 194 L 336 186 Z" fill="#059669" />

  <!-- Golden Defense Gem / Spire Crystal -->
  <g filter="url(#glow)">
    <!-- Gem Top Point -->
    <path d="M 256 112 L 280 156 L 256 174 L 232 156 Z" fill="url(#goldCrown)" />
    <!-- Gem Facets -->
    <path d="M 256 112 L 232 156 L 256 174 Z" fill="#fde68a" fill-opacity="0.6" />
    <path d="M 256 112 L 280 156 L 256 174 Z" fill="#b45309" fill-opacity="0.5" />
    <!-- Floating Orbit Ring -->
    <ellipse cx="256" cy="156" rx="42" ry="16" fill="none" stroke="#38bdf8" stroke-width="3.5" stroke-dasharray="14,8" />
  </g>

  <!-- Laser Crosshair Overlay -->
  <circle cx="256" cy="156" r="4" fill="#ffffff" />
  <circle cx="256" cy="156" r="9" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.8" />
</svg>`;

async function buildIcons() {
  const svgPath = path.resolve(targetDir, 'icon.svg');
  fs.writeFileSync(svgPath, svgContent, 'utf-8');
  console.log('✅ Generated public/icons/icon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // 192x192 PNG
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve(targetDir, 'icon-192.png'));
  console.log('✅ Generated public/icons/icon-192.png');

  // 512x512 PNG
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve(targetDir, 'icon-512.png'));
  console.log('✅ Generated public/icons/icon-512.png');

  // 512x512 Maskable Icon (with extra 10% padding for safe area)
  await sharp(svgBuffer)
    .resize(460, 460)
    .extend({
      top: 26,
      bottom: 26,
      left: 26,
      right: 26,
      background: '#090d16'
    })
    .png()
    .toFile(path.resolve(targetDir, 'icon-maskable-512.png'));
  console.log('✅ Generated public/icons/icon-maskable-512.png');

  // Apple Touch Icon 180x180
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.resolve(targetDir, 'apple-touch-icon.png'));
  console.log('✅ Generated public/icons/apple-touch-icon.png');

  // Copy favicon to public root
  fs.writeFileSync(path.resolve(__dirname, '../public/favicon.svg'), svgContent, 'utf-8');
  console.log('✅ Generated public/favicon.svg');
}

buildIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
