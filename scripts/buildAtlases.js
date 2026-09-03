import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SPRITES_DIR = path.resolve('src/assets/sprites')
const CHARS_DIR = path.resolve('src/assets/characters/male')
const PUBLIC_ATLAS_DIR = path.resolve('public/assets/atlases')
const SRC_GENERATED_DIR = path.resolve('src/assets/generated')

// Ensure target directories exist
fs.mkdirSync(PUBLIC_ATLAS_DIR, { recursive: true })
fs.mkdirSync(SRC_GENERATED_DIR, { recursive: true })

// Analyze image and extract trimmed bounds & raw buffer
async function analyzeAndTrim(filePath) {
  const file = path.basename(filePath)
  const name = file.replace(/\.[^/.]+$/, '')
  const img = sharp(filePath)
  const meta = await img.metadata()
  const origW = meta.width || 256
  const origH = meta.height || 512

  const raw = await img.raw().toBuffer()
  let minX = origW
  let minY = origH
  let maxX = 0
  let maxY = 0
  let hasPixels = false

  for (let y = 0; y < origH; y++) {
    for (let x = 0; x < origW; x++) {
      const alpha = raw[(y * origW + x) * 4 + 3]
      if (alpha > 10) {
        hasPixels = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (!hasPixels) {
    minX = 0
    minY = 0
    maxX = origW - 1
    maxY = origH - 1
  }

  const trimW = Math.max(1, maxX - minX + 1)
  const trimH = Math.max(1, maxY - minY + 1)

  // Extract trimmed sub-image buffer
  const trimmedBuffer = await sharp(filePath)
    .extract({ left: minX, top: minY, width: trimW, height: trimH })
    .toBuffer()

  return {
    file,
    name,
    origW,
    origH,
    minX,
    minY,
    maxX,
    maxY,
    trimW,
    trimH,
    buffer: trimmedBuffer,
  }
}

// Simple Shelf Bin-Packer with 2px padding
function packFrames(frames, maxAtlasW = 2048) {
  const PADDING = 2
  // Sort by height descending for efficient packing
  const sorted = [...frames].sort((a, b) => b.trimH - a.trimH)

  let curX = PADDING
  let curY = PADDING
  let rowH = 0
  let usedW = 0
  const packed = []

  for (const f of sorted) {
    if (curX + f.trimW + PADDING > maxAtlasW) {
      curX = PADDING
      curY += rowH + PADDING
      rowH = 0
    }

    packed.push({
      ...f,
      x: curX,
      y: curY,
    })

    curX += f.trimW + PADDING
    rowH = Math.max(rowH, f.trimH)
    usedW = Math.max(usedW, curX)
  }

  const atlasH = Math.min(4096, Math.max(256, Math.pow(2, Math.ceil(Math.log2(curY + rowH + PADDING)))))
  const atlasW = Math.min(maxAtlasW, Math.max(256, Math.pow(2, Math.ceil(Math.log2(usedW)))))

  return { packed, atlasW, atlasH }
}

async function buildAtlas(atlasName, frames, maxW = 2048) {
  const { packed, atlasW, atlasH } = packFrames(frames, maxW)

  // Composite frames onto blank canvas
  const composites = packed.map((p) => ({
    input: p.buffer,
    left: p.x,
    top: p.y,
  }))

  const baseImage = sharp({
    create: {
      width: atlasW,
      height: atlasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  }).composite(composites)

  const webpPath = path.join(PUBLIC_ATLAS_DIR, `${atlasName}.webp`)
  const pngPath = path.join(PUBLIC_ATLAS_DIR, `${atlasName}.png`)

  // Save both high quality WebP (with 100% alpha fidelity) and fallback PNG
  await baseImage.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(webpPath)
  await baseImage.clone().png({ compressionLevel: 9 }).toFile(pngPath)

  const webpSize = fs.statSync(webpPath).size
  const pngSize = fs.statSync(pngPath).size

  // Generate PixiJS 8 Spritesheet JSON
  const framesObj = {}
  for (const p of packed) {
    framesObj[p.name] = {
      frame: { x: p.x, y: p.y, w: p.trimW, h: p.trimH },
      rotated: false,
      trimmed: true,
      spriteSourceSize: { x: p.minX, y: p.minY, w: p.trimW, h: p.trimH },
      sourceSize: { w: p.origW, h: p.origH },
    }
  }

  const atlasJson = {
    frames: framesObj,
    meta: {
      image: `${atlasName}.webp`,
      format: 'RGBA8888',
      size: { w: atlasW, h: atlasH },
      scale: '1',
    },
  }

  const jsonPath = path.join(PUBLIC_ATLAS_DIR, `${atlasName}.json`)
  fs.writeFileSync(jsonPath, JSON.stringify(atlasJson, null, 2))

  return { atlasJson, webpSize, pngSize }
}

async function run() {
  console.log('🚀 Generating optimized PixiJS WebP Atlases & Precomputed Manifest...')

  // 1. Pack Characters Male (168 animation frames)
  console.log('📦 Processing character animations (168 frames)...')
  const charFiles = fs.readdirSync(CHARS_DIR).filter((f) => f.endsWith('.png'))
  const charFrames = []
  for (const f of charFiles) {
    charFrames.push(await analyzeAndTrim(path.join(CHARS_DIR, f)))
  }
  const charRes = await buildAtlas('characters_male', charFrames, 2048)
  console.log(`  ✅ characters_male: ${(charRes.webpSize / 1024).toFixed(1)} KB WebP (PNG: ${(charRes.pngSize / 1024).toFixed(1)} KB)`)

  // 2. Separate environment sprites into 3 logical categories
  console.log('📦 Processing environment sprites (288 sprites)...')
  const spriteFiles = fs.readdirSync(SPRITES_DIR).filter((f) => f.endsWith('.png'))

  const terrainFrames = []
  const structuresFrames = []
  const propsFrames = []

  const manifestItems = []

  for (const file of spriteFiles) {
    const meta = await analyzeAndTrim(path.join(SPRITES_DIR, file))
    const baseName = meta.name
    const lower = baseName.toLowerCase()

    let category = 'Boshqa'
    if (lower.startsWith('dirt') || lower.startsWith('planks') || (lower.startsWith('stone') && !lower.includes('wall') && !lower.includes('column'))) {
      category = 'Yer (Ground)'
      terrainFrames.push(meta)
    } else if (lower.includes('wall') || lower.includes('gate') || lower.includes('door') || lower.includes('archway') || lower.includes('column') || lower.includes('support')) {
      category = 'Devorlar (Walls)'
      structuresFrames.push(meta)
    } else if (lower.includes('stairs') || lower.includes('bridge')) {
      category = "Zinalar & Ko'priklar (Stairs)"
      terrainFrames.push(meta)
    } else {
      category = 'Obyektlar & Mebel (Props)'
      propsFrames.push(meta)
    }

    let formattedName = baseName
      .replace(/_([A-Z])$/, ' ($1)')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
    formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1)

    // Calculate smart anchor
    const standardAnchorY = meta.maxY < meta.origH * 0.4 
      ? Number((meta.maxY / meta.origH).toFixed(4)) 
      : (meta.origH > meta.origW * 0.8 ? 0.88 : 0.5)

    manifestItems.push({
      id: `sprite-${baseName}`,
      name: formattedName,
      baseName,
      fileRelativePath: file,
      category,
      width: meta.origW,
      height: meta.origH,
      anchorX: 0.5,
      anchorY: standardAnchorY,
      contentBounds: { minX: meta.minX, minY: meta.minY, maxX: meta.maxX, maxY: meta.maxY },
      spanX: 1,
      spanY: 1,
      scale: 1.0,
      isSample: true,
    })
  }

  // Sort manifest nicely
  manifestItems.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.name.localeCompare(b.name)
  })

  // Write precomputed manifest
  const manifestPath = path.join(SRC_GENERATED_DIR, 'spriteManifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifestItems, null, 2))
  console.log(`  ✅ Precomputed sprite manifest written (${manifestItems.length} items)`)

  // Build Terrain Atlas
  const terrainRes = await buildAtlas('terrain_atlas', terrainFrames, 2048)
  console.log(`  ✅ terrain_atlas (${terrainFrames.length} sprites): ${(terrainRes.webpSize / 1024).toFixed(1)} KB WebP`)

  // Build Structures Atlas
  const structRes = await buildAtlas('structures_atlas', structuresFrames, 2048)
  console.log(`  ✅ structures_atlas (${structuresFrames.length} sprites): ${(structRes.webpSize / 1024).toFixed(1)} KB WebP`)

  // Build Props Atlas
  const propsRes = await buildAtlas('props_atlas', propsFrames, 2048)
  console.log(`  ✅ props_atlas (${propsFrames.length} sprites): ${(propsRes.webpSize / 1024).toFixed(1)} KB WebP`)

  const totalWebp = (charRes.webpSize + terrainRes.webpSize + structRes.webpSize + propsRes.webpSize) / 1024 / 1024
  console.log(`\n🎉 Total Atlas Size: ${totalWebp.toFixed(2)} MB across 4 WebP files (Was 5.44 MB across 456 PNG files)!`)
}

run().catch((err) => {
  console.error('Failed to build atlases:', err)
  process.exit(1)
})
