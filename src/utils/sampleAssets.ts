import { AssetItem } from '../types/map'

/**
 * Creates high quality procedural isometric SVG data URLs for sample tiles & props
 */
function createSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`
}

/**
 * Generate sample tiles with proper isometric 2:1 projection (All 1x1 by default)
 */
export function generateSampleAssets(): AssetItem[] {
  const assets: AssetItem[] = []

  // 1. Grass Tile (1x1)
  const grassSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80" width="128" height="80">
      <polygon points="0,32 64,64 64,80 0,48" fill="#4d7c0f" />
      <polygon points="64,64 128,32 128,48 64,80" fill="#3f6212" />
      <polygon points="64,0 128,32 64,64 0,32" fill="#65a30d" />
      <polygon points="64,0 128,32 64,64 0,32" fill="url(#grassGrad)" opacity="0.4" />
      <path d="M45,28 L43,20 L47,26 M55,38 L58,30 L60,37 M80,24 L82,18 L85,25 M30,35 L28,29 L32,34 M95,35 L98,28 L100,34" 
            stroke="#a3e635" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <defs>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#84cc16"/>
          <stop offset="100%" stop-color="#4d7c0f"/>
        </linearGradient>
      </defs>
    </svg>
  `
  assets.push({
    id: 'sample-grass',
    name: 'Grass Tile',
    src: createSvgDataUrl(grassSvg),
    category: 'Terrain',
    width: 128,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.4,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 2. Dirt Tile (1x1)
  const dirtSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80" width="128" height="80">
      <polygon points="0,32 64,64 64,80 0,48" fill="#78350f" />
      <polygon points="64,64 128,32 128,48 64,80" fill="#451a03" />
      <polygon points="64,0 128,32 64,64 0,32" fill="#92400e" />
      <circle cx="50" cy="30" r="2.5" fill="#b45309" />
      <circle cx="80" cy="35" r="3" fill="#78350f" />
      <circle cx="65" cy="20" r="2" fill="#b45309" />
      <circle cx="35" cy="38" r="2" fill="#451a03" />
    </svg>
  `
  assets.push({
    id: 'sample-dirt',
    name: 'Dirt Tile',
    src: createSvgDataUrl(dirtSvg),
    category: 'Terrain',
    width: 128,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.4,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 3. Water Tile (1x1)
  const waterSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80" width="128" height="80">
      <polygon points="0,32 64,64 64,80 0,48" fill="#0369a1" />
      <polygon points="64,64 128,32 128,48 64,80" fill="#075985" />
      <polygon points="64,0 128,32 64,64 0,32" fill="#0284c7" />
      <path d="M35,30 Q45,26 55,30 T75,30" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.8" />
      <path d="M50,42 Q60,38 70,42 T90,42" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.8" />
      <path d="M60,18 Q70,14 80,18 T100,18" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.7" />
    </svg>
  `
  assets.push({
    id: 'sample-water',
    name: 'Water Tile',
    src: createSvgDataUrl(waterSvg),
    category: 'Terrain',
    width: 128,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.4,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 4. Stone / Cobblestone Tile (1x1)
  const stoneSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80" width="128" height="80">
      <polygon points="0,32 64,64 64,80 0,48" fill="#334155" />
      <polygon points="64,64 128,32 128,48 64,80" fill="#1e293b" />
      <polygon points="64,0 128,32 64,64 0,32" fill="#64748b" />
      <polygon points="64,8 84,18 64,28 44,18" fill="#475569" stroke="#334155" stroke-width="1" />
      <polygon points="90,22 110,32 90,42 70,32" fill="#475569" stroke="#334155" stroke-width="1" />
      <polygon points="38,22 58,32 38,42 18,32" fill="#475569" stroke="#334155" stroke-width="1" />
      <polygon points="64,36 84,46 64,56 44,46" fill="#475569" stroke="#334155" stroke-width="1" />
    </svg>
  `
  assets.push({
    id: 'sample-stone',
    name: 'Stone Road',
    src: createSvgDataUrl(stoneSvg),
    category: 'Terrain',
    width: 128,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.4,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 5. Sand Tile (1x1)
  const sandSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80" width="128" height="80">
      <polygon points="0,32 64,64 64,80 0,48" fill="#b45309" />
      <polygon points="64,64 128,32 128,48 64,80" fill="#78350f" />
      <polygon points="64,0 128,32 64,64 0,32" fill="#f59e0b" />
      <polygon points="64,0 128,32 64,64 0,32" fill="url(#sandGrad)" opacity="0.3" />
      <defs>
        <linearGradient id="sandGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#fde68a"/>
          <stop offset="100%" stop-color="#d97706"/>
        </linearGradient>
      </defs>
    </svg>
  `
  assets.push({
    id: 'sample-sand',
    name: 'Sand Tile',
    src: createSvgDataUrl(sandSvg),
    category: 'Terrain',
    width: 128,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.4,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 6. Pine Tree (1x1)
  const pineTreeSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 160" width="128" height="160">
      <ellipse cx="64" cy="140" rx="30" ry="15" fill="#000000" opacity="0.25" />
      <polygon points="60,110 68,110 70,140 58,140" fill="#78350f" />
      <polygon points="64,110 68,110 70,140 64,140" fill="#451a03" />
      <polygon points="64,70 110,120 18,120" fill="#15803d" />
      <polygon points="64,70 110,120 64,120" fill="#166534" />
      <polygon points="64,40 100,85 28,85" fill="#16a34a" />
      <polygon points="64,40 100,85 64,85" fill="#15803d" />
      <polygon points="64,10 88,50 40,50" fill="#22c55e" />
      <polygon points="64,10 88,50 64,50" fill="#16a34a" />
    </svg>
  `
  assets.push({
    id: 'sample-tree',
    name: 'Pine Tree',
    src: createSvgDataUrl(pineTreeSvg),
    category: 'Nature',
    width: 128,
    height: 160,
    anchorX: 0.5,
    anchorY: 0.88,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 7. Oak Tree (1x1)
  const oakTreeSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 150" width="128" height="150">
      <ellipse cx="64" cy="132" rx="34" ry="17" fill="#000000" opacity="0.25" />
      <polygon points="58,95 70,95 73,135 55,135" fill="#854d0e" />
      <circle cx="64" cy="65" r="42" fill="#16a34a" />
      <circle cx="50" cy="55" r="30" fill="#22c55e" />
      <circle cx="78" cy="72" r="28" fill="#15803d" />
      <circle cx="64" cy="40" r="24" fill="#4ade80" />
      <circle cx="52" cy="42" r="8" fill="#86efac" opacity="0.6" />
    </svg>
  `
  assets.push({
    id: 'sample-oak-tree',
    name: 'Oak Tree',
    src: createSvgDataUrl(oakTreeSvg),
    category: 'Nature',
    width: 128,
    height: 150,
    anchorX: 0.5,
    anchorY: 0.88,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 8. Cottage House (1x1 by default, can be set to 2x2 in Inspector)
  const houseSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 220" width="240" height="220">
      <ellipse cx="120" cy="180" rx="90" ry="40" fill="#000000" opacity="0.25" />
      <polygon points="40,130 120,170 120,205 40,165" fill="#d97706" />
      <polygon points="120,170 200,130 200,165 120,205" fill="#b45309" />
      <polygon points="65,150 95,165 95,195 65,180" fill="#451a03" />
      <circle cx="72" cy="173" r="2" fill="#fbbf24" />
      <polygon points="145,150 175,135 175,155 145,170" fill="#38bdf8" stroke="#78350f" stroke-width="2.5" />
      <polygon points="30,125 120,65 210,125 120,170" fill="#ef4444" />
      <polygon points="120,65 210,125 120,170" fill="#dc2626" />
      <polygon points="155,75 172,66 172,95 155,104" fill="#71717a" />
      <circle cx="175" cy="52" r="8" fill="#e4e4e7" opacity="0.6" />
      <circle cx="183" cy="38" r="10" fill="#e4e4e7" opacity="0.4" />
    </svg>
  `
  assets.push({
    id: 'sample-house',
    name: 'Cottage House',
    src: createSvgDataUrl(houseSvg),
    category: 'Buildings',
    width: 240,
    height: 220,
    anchorX: 0.5,
    anchorY: 0.88,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 9. Stone Tower (1x1 by default)
  const towerSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 240" width="160" height="240">
      <ellipse cx="80" cy="210" rx="55" ry="25" fill="#000000" opacity="0.25" />
      <polygon points="40,100 80,122 80,215 40,193" fill="#64748b" />
      <polygon points="80,122 120,100 120,193 80,215" fill="#475569" />
      <rect x="52" y="140" width="6" height="18" fill="#0f172a" transform="skewY(15)" />
      <rect x="98" y="152" width="6" height="18" fill="#0f172a" transform="skewY(-15)" />
      <polygon points="80,25 130,98 80,115" fill="#3b82f6" />
      <polygon points="80,25 30,98 80,115" fill="#60a5fa" />
      <circle cx="80" cy="22" r="5" fill="#fbbf24" />
    </svg>
  `
  assets.push({
    id: 'sample-tower',
    name: 'Stone Tower',
    src: createSvgDataUrl(towerSvg),
    category: 'Buildings',
    width: 160,
    height: 240,
    anchorX: 0.5,
    anchorY: 0.9,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 10. Magic Crystal (1x1)
  const crystalSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120">
      <ellipse cx="50" cy="100" rx="25" ry="12" fill="#a855f7" opacity="0.35" />
      <polygon points="50,15 72,55 50,85 28,55" fill="#c084fc" />
      <polygon points="50,15 72,55 50,105" fill="#9333ea" />
      <polygon points="50,15 28,55 50,105" fill="#a855f7" />
      <polygon points="50,15 50,105 38,65" fill="#e9d5ff" opacity="0.7" />
      <polygon points="20,40 26,45 22,50 18,45" fill="#c084fc" />
      <polygon points="80,60 85,64 82,68 78,65" fill="#e9d5ff" />
    </svg>
  `
  assets.push({
    id: 'sample-crystal',
    name: 'Magic Crystal',
    src: createSvgDataUrl(crystalSvg),
    category: 'Props',
    width: 100,
    height: 120,
    anchorX: 0.5,
    anchorY: 0.85,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 11. Treasure Chest (1x1)
  const chestSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
      <ellipse cx="50" cy="78" rx="28" ry="14" fill="#000000" opacity="0.3" />
      <polygon points="20,50 50,65 50,85 20,70" fill="#92400e" />
      <polygon points="50,65 80,50 80,70 50,85" fill="#78350f" />
      <polygon points="18,45 50,28 82,45 50,62" fill="#b45309" />
      <polygon points="46,55 54,55 54,67 46,67" fill="#fbbf24" stroke="#d97706" stroke-width="1" />
      <circle cx="50" cy="60" r="1.5" fill="#451a03" />
    </svg>
  `
  assets.push({
    id: 'sample-chest',
    name: 'Treasure Chest',
    src: createSvgDataUrl(chestSvg),
    category: 'Props',
    width: 100,
    height: 100,
    anchorX: 0.5,
    anchorY: 0.8,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  // 12. Wooden Fence (1x1)
  const fenceSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 80" width="128" height="80">
      <polygon points="25,30 35,25 35,65 25,70" fill="#b45309" />
      <polygon points="95,65 105,60 105,30 95,35" fill="#78350f" />
      <polygon points="25,40 105,80 105,72 25,32" fill="#d97706" />
      <polygon points="25,58 105,98 105,90 25,50" fill="#92400e" opacity="0.9" />
    </svg>
  `
  assets.push({
    id: 'sample-fence',
    name: 'Wooden Fence',
    src: createSvgDataUrl(fenceSvg),
    category: 'Props',
    width: 128,
    height: 80,
    anchorX: 0.5,
    anchorY: 0.75,
    spanX: 1,
    spanY: 1,
    scale: 1.0,
    isSample: true,
  })

  return assets
}
