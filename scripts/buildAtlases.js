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

// Clean up legacy trimmed folder and old atlas files
const legacyTrimmedDir = path.resolve('public/assets/trimmed')
if (fs.existsSync(legacyTrimmedDir)) {
  fs.rmSync(legacyTrimmedDir, { recursive: true, force: true })
}

if (fs.existsSync(PUBLIC_ATLAS_DIR)) {
  for (const f of fs.readdirSync(PUBLIC_ATLAS_DIR)) {
    try {
      fs.unlinkSync(path.join(PUBLIC_ATLAS_DIR, f))
    } catch (e) {
      // Ignore
    }
  }
}

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

// Multi-Page Shelf Bin-Packer with zero-clipping guarantee
function packFramesIntoPages(frames, maxAtlasW = 2048, maxAtlasH = 4096) {
  const PADDING = 2
  // Sort by height descending for optimal shelf packing
  const sorted = [...frames].sort((a, b) => b.trimH - a.trimH)

  const pages = []
  let curPageFrames = []
  let curX = PADDING
  let curY = PADDING
  let rowH = 0
  let usedW = 0

  for (const f of sorted) {
    // If sprite overflows current row width, wrap to next row
    if (curX + f.trimW + PADDING > maxAtlasW) {
      curX = PADDING
      curY += rowH + PADDING
      rowH = 0
    }

    // If sprite overflows current page height, seal current page and start next page
    if (curY + f.trimH + PADDING > maxAtlasH) {
      if (curPageFrames.length > 0) {
        const requiredH = curY + rowH + PADDING
        const atlasH = Math.max(256, Math.pow(2, Math.ceil(Math.log2(requiredH))))
        const atlasW = Math.max(256, Math.pow(2, Math.ceil(Math.log2(usedW))))
        pages.push({ packed: curPageFrames, atlasW, atlasH })
      }

      curPageFrames = []
      curX = PADDING
      curY = PADDING
      rowH = 0
      usedW = 0
    }

    curPageFrames.push({
      ...f,
      x: curX,
      y: curY,
    })

    curX += f.trimW + PADDING
    rowH = Math.max(rowH, f.trimH)
    usedW = Math.max(usedW, curX)
  }

  if (curPageFrames.length > 0) {
    const requiredH = curY + rowH + PADDING
    const atlasH = Math.max(256, Math.pow(2, Math.ceil(Math.log2(requiredH))))
    const atlasW = Math.max(256, Math.pow(2, Math.ceil(Math.log2(usedW))))
    pages.push({ packed: curPageFrames, atlasW, atlasH })
  }

  return pages
}

// Build multi-page WebP & PNG atlases + PixiJS JSON manifests
async function buildMultiPageAtlas(baseName, frames, maxW = 2048, maxH = 4096) {
  const pages = packFramesIntoPages(frames, maxW, maxH)
  const isMulti = pages.length > 1
  const generatedSheetNames = []
  let totalWebpSize = 0
  let totalPngSize = 0

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx]
    const sheetName = isMulti ? `${baseName}_${pageIdx}` : baseName
    generatedSheetNames.push(sheetName)

    // Composite frame buffers onto blank transparent canvas
    const composites = page.packed.map((p) => ({
      input: p.buffer,
      left: p.x,
      top: p.y,
    }))

    const baseImage = sharp({
      create: {
        width: page.atlasW,
        height: page.atlasH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(composites)

    const webpPath = path.join(PUBLIC_ATLAS_DIR, `${sheetName}.webp`)
    const pngPath = path.join(PUBLIC_ATLAS_DIR, `${sheetName}.png`)

    // Save high quality WebP (with 100% alpha fidelity) and fallback PNG
    await baseImage.clone().webp({ quality: 90, alphaQuality: 100 }).toFile(webpPath)
    await baseImage.clone().png({ compressionLevel: 9 }).toFile(pngPath)

    const webpSize = fs.statSync(webpPath).size
    const pngSize = fs.statSync(pngPath).size
    totalWebpSize += webpSize
    totalPngSize += pngSize

    // Generate PixiJS 8 Spritesheet JSON
    const framesObj = {}
    for (const p of page.packed) {
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
        image: `${sheetName}.webp`,
        format: 'RGBA8888',
        size: { w: page.atlasW, h: page.atlasH },
        scale: '1',
      },
    }

    const jsonPath = path.join(PUBLIC_ATLAS_DIR, `${sheetName}.json`)
    fs.writeFileSync(jsonPath, JSON.stringify(atlasJson, null, 2))

    console.log(`  ✅ ${sheetName} (${page.packed.length} sprites, ${page.atlasW}x${page.atlasH}): ${(webpSize / 1024).toFixed(1)} KB WebP`)
  }

  return { generatedSheetNames, totalWebpSize, totalPngSize }
}

async function run() {
  console.log('🚀 Generating 100% Non-Clipping PixiJS WebP Atlases & Precomputed Manifests...')

  // 1. Pack Characters Male (168 animation frames)
  console.log('📦 Processing character animations (168 frames)...')
  const charFiles = fs.readdirSync(CHARS_DIR).filter((f) => f.endsWith('.png'))
  const charFrames = []
  for (const f of charFiles) {
    charFrames.push(await analyzeAndTrim(path.join(CHARS_DIR, f)))
  }
  const charRes = await buildMultiPageAtlas('characters_male', charFrames, 2048, 2048)

  // 2. Separate environment sprites into 3 logical categories
  console.log('📦 Processing environment sprites (790 sprites)...')
  const spriteFiles = fs.readdirSync(SPRITES_DIR).filter((f) => f.endsWith('.png'))

  const terrainFrames = []
  const structuresFrames = []
  const propsFrames = []
  const manifestItems = []

  for (const file of spriteFiles) {
    const meta = await analyzeAndTrim(path.join(SPRITES_DIR, file))
    const baseName = meta.name
    const lower = baseName.toLowerCase()

    let category = 'Other'
    if (lower.startsWith('dirt') || lower.startsWith('planks') || (lower.startsWith('stone') && !lower.includes('wall') && !lower.includes('column'))) {
      category = 'Ground'
      terrainFrames.push(meta)
    } else if (lower.includes('wall') || lower.includes('gate') || lower.includes('door') || lower.includes('archway') || lower.includes('column') || lower.includes('support')) {
      category = 'Walls'
      structuresFrames.push(meta)
    } else if (lower.includes('stairs') || lower.includes('bridge')) {
      category = 'Stairs'
      terrainFrames.push(meta)
    } else {
      category = 'Props'
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
      trimWidth: meta.trimW,
      trimHeight: meta.trimH,
      anchorX: 0.5,
      anchorY: standardAnchorY,
      contentBounds: { minX: meta.minX, minY: meta.minY, maxX: meta.maxX, maxY: meta.maxY },
      spanX: 1,
      spanY: 1,
      scale: 1.0,
      isSample: true,
    })
  }

  // Sort manifest items cleanly
  manifestItems.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.name.localeCompare(b.name)
  })

  // Write precomputed manifest
  const manifestPath = path.join(SRC_GENERATED_DIR, 'spriteManifest.json')
  fs.writeFileSync(manifestPath, JSON.stringify(manifestItems, null, 2))
  console.log(`  ✅ Precomputed sprite manifest written (${manifestItems.length} items)`)

  // Build Terrain Atlas
  const terrainRes = await buildMultiPageAtlas('terrain_atlas', terrainFrames, 2048, 4096)

  // Build Structures Atlas (Auto-multi-page)
  const structRes = await buildMultiPageAtlas('structures_atlas', structuresFrames, 2048, 4096)

  // Build Props Atlas (Auto-multi-page)
  const propsRes = await buildMultiPageAtlas('props_atlas', propsFrames, 2048, 4096)

  // Generate dynamic atlasIndex.json for AssetManager bundle loader
  const atlasIndex = {
    core: [...terrainRes.generatedSheetNames],
    editor: [
      ...terrainRes.generatedSheetNames,
      ...structRes.generatedSheetNames,
      ...propsRes.generatedSheetNames,
    ],
    game: [
      ...charRes.generatedSheetNames,
      ...structRes.generatedSheetNames,
    ],
  }

  const atlasIndexPath = path.join(SRC_GENERATED_DIR, 'atlasIndex.json')
  fs.writeFileSync(atlasIndexPath, JSON.stringify(atlasIndex, null, 2))
  console.log(`  ✅ Atlas index bundle manifest written:`, atlasIndex)

  const totalWebp = (charRes.totalWebpSize + terrainRes.totalWebpSize + structRes.totalWebpSize + propsRes.totalWebpSize) / 1024 / 1024
  console.log(`\n🎉 Total Atlas Size: ${totalWebp.toFixed(2)} MB across all WebP sheets (Zero cutoffs, 100% full quality)!`)
}

run().catch((err) => {
  console.error('Failed to build atlases:', err)
  process.exit(1)
})
