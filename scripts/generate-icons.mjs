/**
 * Generate PWA icons as simple SVG-based PNGs.
 * Run: node scripts/generate-icons.mjs
 *
 * Creates placeholder icons with a microphone symbol on a dark background,
 * matching the app's monochromatic design.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

function createSvgIcon(size, maskable = false) {
  const padding = maskable ? size * 0.2 : 0;
  const iconSize = size - padding * 2;
  const cx = size / 2;
  const cy = size / 2;
  const micScale = iconSize / 512;

  // Microphone path (centered around 256, 256 in a 512x512 space)
  const micBody = `M${cx - 40 * micScale},${cy - 100 * micScale}
    a${40 * micScale},${40 * micScale} 0 0 1 ${80 * micScale},0
    v${100 * micScale}
    a${40 * micScale},${40 * micScale} 0 0 1 -${80 * micScale},0 z`;

  const arcRadius = 65 * micScale;
  const arcY = cy + 10 * micScale;
  const standTop = cy + 75 * micScale;
  const standBottom = cy + 110 * micScale;
  const baseHalf = 35 * micScale;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0a" rx="${maskable ? 0 : size * 0.18}"/>
  <g fill="none" stroke="#ffffff" stroke-width="${4 * micScale}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${micBody}" fill="#ffffff" stroke="none"/>
    <path d="M${cx - arcRadius},${arcY} a${arcRadius},${arcRadius} 0 0 0 ${arcRadius * 2},0"/>
    <line x1="${cx}" y1="${standTop}" x2="${cx}" y2="${standBottom}"/>
    <line x1="${cx - baseHalf}" y1="${standBottom}" x2="${cx + baseHalf}" y2="${standBottom}"/>
  </g>
</svg>`;
}

// Write SVG files (these will serve as the icons directly, and we also keep them as SVG for the manifest)
const sizes = [
  { name: 'icon-192.svg', size: 192, maskable: false },
  { name: 'icon-512.svg', size: 512, maskable: false },
  { name: 'icon-maskable-512.svg', size: 512, maskable: true },
];

for (const { name, size, maskable } of sizes) {
  const svg = createSvgIcon(size, maskable);
  writeFileSync(join(outDir, name), svg);
  console.log(`Created ${name}`);
}

console.log('\nIcon SVGs generated in public/icons/');
console.log('Note: For production, convert these SVGs to PNG using a tool like sharp or an online converter.');
console.log('For now, update manifest.json to reference SVG files or convert manually.');
