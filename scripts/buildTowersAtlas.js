import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const TOWERS_DIR = path.resolve('src/assets/towers')
const PUBLIC_ATLAS_DIR = path.resolve('public/assets/atlases')
const SRC_GENERATED_DIR = path.resolve('src/assets/generated')

const towerNamesMap = {
  tower_stone_guard: 'Stone Guard Tower',
  tower_wood_archer: 'Wooden Archer Tower',
  tower_ballista_siege: 'Stone Ballista Tower',
  tower_red_cannon: 'Red Fortress Cannon Tower',
  tower_siege_mortar: 'Heavy Mortar Tower',
  tower_poison_cauldron: 'Poison Cauldron Tower',
  tower_frost_crystal: 'Frost Crystal Spire',
  tower_arcane_orb: 'Arcane Energy Orb Tower',
  tower_electro: 'Electro Shock Tower',
  tower_missile: 'Missile Launcher Tower',
  tower_plazma: 'Plasma Beam Tower',
  tower_stone_g: 'Stone Golem Tower',
  tower_suck: 'Vortex Gravity Tower',
  new_tower: 'Advanced Watchtower',
}

// Analyze image and extract trimmed bounds & raw buffer
async function analyzeAndTrim(filePath) {
  const rawFile = path.basename(filePath)
  const rawName = rawFile.replace(/\.[^/.]+$/, '').trim()
  const cleanBaseName = rawName.replace(/\s+/g, '_').toLowerCase()

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

  const trimmedBuffer = await sharp(filePath)
    .extract({ left: minX, top: minY, width: trimW, height: trimH })
    .toBuffer()

  return {
    file: rawFile,
    name: cleanBaseName,
    rawName,
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

// Shelf Bin-Packer for zero-clipping guarantee
function packFramesIntoPages(frames, maxAtlasW = 2048, maxAtlasH = 4096) {
  const PADDING = 2
  const sorted = [...frames].sort((a, b) => b.trimH - a.trimH)

  const pages = []
  let curPageFrames = []
  let curX = PADDING
  let curY = PADDING
  let rowH = 0
  let usedW = 0

  for (const f of sorted) {
    if (curX + f.trimW + PADDING > maxAtlasW) {
      curX = PADDING
      curY += rowH + PADDING
      rowH = 0
    }

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

// Build multi-page WebP atlas + PixiJS JSON manifest
async function buildAtlas(baseName, frames, maxW = 2048, maxH = 4096) {
  const pages = packFramesIntoPages(frames, maxW, maxH)
  const isMulti = pages.length > 1
  const generatedSheetNames = []
  let totalWebpSize = 0

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const page = pages[pageIdx]
    const sheetName = isMulti ? `${baseName}_${pageIdx}` : baseName
    generatedSheetNames.push(sheetName)

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
    const webpBuf = await baseImage.webp({ quality: 80, alphaQuality: 80 }).toBuffer()
    fs.writeFileSync(webpPath, webpBuf)

    const webpSize = webpBuf.length
    totalWebpSize += webpSize

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

    console.log(`  ✅ ${sheetName} (${page.packed.length} towers, ${page.atlasW}x${page.atlasH}): ${(webpSize / 1024).toFixed(1)} KB WebP`)
  }

  return { generatedSheetNames, totalWebpSize }
}

async function run() {
  const startTime = performance.now()
  console.log('🏰 Fast Generating Towers Atlas from src/assets/towers...')

  if (!fs.existsSync(TOWERS_DIR)) {
    console.error(`❌ Error: Towers directory not found at "${TOWERS_DIR}"`)
    process.exit(1)
  }

  fs.mkdirSync(PUBLIC_ATLAS_DIR, { recursive: true })
  fs.mkdirSync(SRC_GENERATED_DIR, { recursive: true })

  const files = fs.readdirSync(TOWERS_DIR).filter((f) => f.endsWith('.webp') || f.endsWith('.png'))
  if (files.length === 0) {
    console.log('⚠️ No tower images found in src/assets/towers/')
    return
  }

  const towerFrames = []
  const manifestTowerItems = []

  for (const file of files) {
    const meta = await analyzeAndTrim(path.join(TOWERS_DIR, file))
    towerFrames.push(meta)

    const baseName = meta.name
    let formattedName = towerNamesMap[baseName] || meta.rawName
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
    formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1)

    // Standard anchor calculation for isometric towers (exact bottom-most pixel)
    const standardAnchorY = Number((meta.maxY / meta.origH).toFixed(4))

    manifestTowerItems.push({
      id: `sprite-${baseName}`,
      name: formattedName,
      baseName,
      fileRelativePath: `towers/${file}`,
      category: 'Towers',
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

  // 1. Build Towers Atlas
  const atlasRes = await buildAtlas('towers_atlas', towerFrames, 2048, 2048)

  // 2. Merge into spriteManifest.json without touching other categories (Ground, Props, Walls, etc.)
  const manifestPath = path.join(SRC_GENERATED_DIR, 'spriteManifest.json')
  let existingManifest = []
  if (fs.existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch {
      existingManifest = []
    }
  }

  const newTowerIds = new Set(manifestTowerItems.map((item) => item.id))
  // Keep non-tower sprites or old towers that are being replaced
  const filteredManifest = existingManifest.filter((item) => !newTowerIds.has(item.id))
  const mergedManifest = [...filteredManifest, ...manifestTowerItems]

  mergedManifest.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category)
    return a.name.localeCompare(b.name)
  })

  fs.writeFileSync(manifestPath, JSON.stringify(mergedManifest, null, 2))
  console.log(`  ✅ Precomputed sprite manifest updated (+${manifestTowerItems.length} towers, total: ${mergedManifest.length} items)`)

  // 3. Update atlasIndex.json to register towers in bundle index
  const atlasIndexPath = path.join(SRC_GENERATED_DIR, 'atlasIndex.json')
  let existingAtlasIndex = {}
  if (fs.existsSync(atlasIndexPath)) {
    try {
      existingAtlasIndex = JSON.parse(fs.readFileSync(atlasIndexPath, 'utf-8'))
    } catch {
      existingAtlasIndex = {}
    }
  }

  // Ensure structures bundle includes towers_atlas sheets so loadEditor and loadGame automatically load them
  const structuresList = Array.isArray(existingAtlasIndex.structures) ? [...existingAtlasIndex.structures] : []
  for (const sheet of atlasRes.generatedSheetNames) {
    if (!structuresList.includes(sheet)) {
      structuresList.push(sheet)
    }
  }
  existingAtlasIndex.structures = structuresList

  // Also provide explicit 'towers' bundle
  existingAtlasIndex.towers = [...atlasRes.generatedSheetNames]

  fs.writeFileSync(atlasIndexPath, JSON.stringify(existingAtlasIndex, null, 2))
  console.log(`  ✅ Atlas index updated (structures & towers bundles updated with: ${atlasRes.generatedSheetNames.join(', ')})`)

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(2)
  console.log(`\n✨ Towers Atlas generated in ${elapsed}s! Total: ${(atlasRes.totalWebpSize / 1024).toFixed(1)} KB WebP.`)
}

run().catch((err) => {
  console.error('Failed to build towers atlas:', err)
  process.exit(1)
})
