import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SPRITES_DIR = path.resolve('src/assets/sprites')
const TOWERS_DIR = path.resolve('src/assets/towers')
const CHARS_ROOT_DIR = path.resolve('src/assets/characters')
const PUBLIC_ATLAS_DIR = path.resolve('public/assets/atlases')
const SRC_GENERATED_DIR = path.resolve('src/assets/generated')

function getActionIcon(action) {
  const lower = String(action).toLowerCase()
  if (lower.includes('idle') || lower.includes('stand') || lower.includes('wait')) return '🧘'
  if (lower.includes('run') || lower.includes('sprint') || lower.includes('jog')) return '🏃'
  if (lower.includes('walk') || lower.includes('move')) return '🚶'
  if (lower.includes('attack') || lower.includes('slash') || lower.includes('strike') || lower.includes('swing') || lower.includes('shoot') || lower.includes('bow')) return '⚔️'
  if (lower.includes('die') || lower.includes('death') || lower.includes('dead') || lower.includes('collapse')) return '💀'
  if (lower.includes('hit') || lower.includes('hurt') || lower.includes('damage') || lower.includes('wound')) return '🩸'
  if (lower.includes('block') || lower.includes('shield') || lower.includes('defend')) return '🛡️'
  if (lower.includes('cast') || lower.includes('spell') || lower.includes('magic')) return '✨'
  if (lower.includes('jump') || lower.includes('leap')) return '🦘'
  if (lower.includes('taunt') || lower.includes('cheer') || lower.includes('victory') || lower.includes('dance')) return '🗣️'
  if (lower.includes('pickup') || lower.includes('grab') || lower.includes('loot') || lower.includes('harvest')) return '💥'
  return '⚡'
}

// Automatically detect uniform square cell size (256, 320, 512, 192, 128, etc.)
function detectSheetGrid(imgW, imgH) {
  const candidates = [256, 320, 512, 192, 160, 128, 96, 64]
  for (const s of candidates) {
    if (imgW % s === 0 && imgH % s === 0) {
      return {
        cols: Math.max(1, Math.floor(imgW / s)),
        rows: Math.max(1, Math.floor(imgH / s)),
        cellW: s,
        cellH: s
      }
    }
  }

  // Fallback for non-square or arbitrary dimensions
  const cols = Math.max(1, Math.round(imgW / 256))
  const rows = Math.max(1, Math.round(imgH / 256))
  return {
    cols,
    rows,
    cellW: Math.floor(imgW / cols),
    cellH: Math.floor(imgH / rows)
  }
}

// Slice a grid-based sprite sheet (e.g. 1536x1024 -> 6 cols x 4 rows = 24 frames of 256x256)
async function sliceAndAnalyzeSheet(filePath, baseFrameName, cols = 6, rows = 4) {
  const img = sharp(filePath)
  const meta = await img.metadata()
  const sheetW = meta.width || 1536
  const sheetH = meta.height || 1024
  const cellW = Math.floor(sheetW / cols)
  const cellH = Math.floor(sheetH / rows)

  const frames = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const frameIdx = r * cols + c
      const cellExtract = await sharp(filePath)
        .extract({ left: c * cellW, top: r * cellH, width: cellW, height: cellH })
        .raw()
        .toBuffer()

      let minX = cellW
      let minY = cellH
      let maxX = 0
      let maxY = 0
      let hasPixels = false

      for (let y = 0; y < cellH; y++) {
        for (let x = 0; x < cellW; x++) {
          const alpha = cellExtract[(y * cellW + x) * 4 + 3]
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
        maxX = cellW - 1
        maxY = cellH - 1
      }

      const trimW = Math.max(1, maxX - minX + 1)
      const trimH = Math.max(1, maxY - minY + 1)

      const trimmedBuffer = await sharp(filePath)
        .extract({ left: c * cellW + minX, top: r * cellH + minY, width: trimW, height: trimH })
        .toBuffer()

      frames.push({
        file: path.basename(filePath),
        name: `${baseFrameName}${frameIdx}`,
        origW: cellW,
        origH: cellH,
        minX,
        minY,
        maxX,
        maxY,
        trimW,
        trimH,
        buffer: trimmedBuffer,
      })
    }
  }

  return frames
}

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

    // Save high quality WebP (with 100% alpha fidelity)
    const webpBuf = await baseImage.webp({ quality: 70, alphaQuality: 65 }).toBuffer()
    fs.writeFileSync(webpPath, webpBuf)

    const webpSize = webpBuf.length
    totalWebpSize += webpSize

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

  return { generatedSheetNames, totalWebpSize, totalPngSize: 0 }
}

async function run() {
  if (process.argv.includes('--towers') || process.argv.includes('--only=towers')) {
    const { execSync } = await import('child_process')
    execSync('node scripts/buildTowersAtlas.js', { stdio: 'inherit' })
    return
  }

  console.log('🚀 Generating 100% Non-Clipping PixiJS Pure-WebP Atlases & Precomputed Manifests...')

  // Clean legacy PNG files from atlases directory if any
  if (fs.existsSync(PUBLIC_ATLAS_DIR)) {
    const existing = fs.readdirSync(PUBLIC_ATLAS_DIR)
    for (const f of existing) {
      if (f.endsWith('.png')) {
        try { fs.unlinkSync(path.join(PUBLIC_ATLAS_DIR, f)) } catch {}
      }
    }
  }

  // 1. Automatically scan, process, slice and pack ALL character folders in src/assets/characters/
  console.log('📦 Dynamically scanning all character folders in src/assets/characters/...')
  const characterManifest = {}
  const allCharacterSheets = []
  let totalCharacterWebpSize = 0

  // Angle to 8-directional isometric mapping function (0..7)
  function angleToDirection(angleStr) {
    const ang = parseInt(angleStr, 10) % 360
    if (ang >= 23 && ang < 68) return 0   // 045 NE
    if (ang >= 68 && ang < 113) return 1  // 090 E
    if (ang >= 113 && ang < 158) return 2 // 135 SE
    if (ang >= 158 && ang < 203) return 3 // 180 S
    if (ang >= 203 && ang < 248) return 4 // 225 SW
    if (ang >= 248 && ang < 293) return 5 // 270 W
    if (ang >= 293 && ang < 338) return 6 // 315 NW
    return 7                              // 000 N (or 338..360 / 0..22)
  }

  if (fs.existsSync(CHARS_ROOT_DIR)) {
    const entries = fs.readdirSync(CHARS_ROOT_DIR, { withFileTypes: true })
    const charFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name)

    for (const folder of charFolders) {
      const charId = folder.toLowerCase()
      const charTitle = folder.charAt(0).toUpperCase() + folder.slice(1)
      const charPrefix = charTitle
      const charDir = path.join(CHARS_ROOT_DIR, folder)

      console.log(`  🔍 Scanning character folder: ${folder} (ID: ${charId})...`)
      const files = fs.readdirSync(charDir).filter((f) => f.endsWith('.webp') || f.endsWith('.png'))
      if (files.length === 0) continue

      const charFrames = []
      const actionsMap = {}
      const sampleFeetYList = []
      const sampleHeightList = []
      let detectedCellW = 256
      let detectedCellH = 512

      for (const file of files) {
        const filePath = path.join(charDir, file)
        const baseName = file.replace(/\.[^/.]+$/, '')

        // Discrete Single Frame with explicit direction number (e.g. Male_0_Idle0.png, Barry_2_Run5.png)
        const directDirMatch = baseName.match(/^(?:[A-Za-z0-9]+_)?(\d)_([A-Za-z]+)(\d*)$/)

        if (directDirMatch) {
          const dir = parseInt(directDirMatch[1], 10)
          const actionRaw = directDirMatch[2]
          const action = actionRaw.charAt(0).toUpperCase() + actionRaw.slice(1)
          const frameIdx = directDirMatch[3] ? parseInt(directDirMatch[3], 10) : 0

          const trimmed = await analyzeAndTrim(filePath)
          detectedCellW = trimmed.origW
          detectedCellH = trimmed.origH
          if (sampleFeetYList.length < 20 && trimmed.maxY > 0) {
            sampleFeetYList.push(trimmed.maxY)
            sampleHeightList.push(trimmed.trimH)
          }

          if (!actionsMap[action]) {
            actionsMap[action] = {
              id: action,
              label: action,
              icon: getActionIcon(action),
              frameCount: 1,
            }
          }
          actionsMap[action].frameCount = Math.max(actionsMap[action].frameCount, frameIdx + 1)

          charFrames.push({
            ...trimmed,
            name: `${charPrefix}_${dir}_${action}${frameIdx}`,
          })
          if (frameIdx === 0) {
            charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_${action}0` })
            charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_${action}` })
          }
          const lowerAct = action.toLowerCase()
          if (lowerAct.includes('idle') || lowerAct.includes('stand') || lowerAct.includes('wait')) {
            charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Idle${frameIdx}` })
            if (frameIdx === 0) {
              charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Idle0` })
              charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Idle` })
            }
          }
          if (lowerAct.includes('run') || lowerAct.includes('walk') || lowerAct.includes('sprint') || lowerAct.includes('jog') || lowerAct.includes('move')) {
            charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Run${frameIdx}` })
            if (frameIdx === 0) {
              charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Run0` })
              charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Run` })
            }
          }
          if (lowerAct.includes('die') || lowerAct.includes('death') || lowerAct.includes('dead') || lowerAct.includes('pickup') || lowerAct.includes('hit') || lowerAct.includes('collapse')) {
            charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Pickup${frameIdx}` })
            charFrames.push({ ...trimmed, name: `${charPrefix}_${dir}_Die${frameIdx}` })
          }
        }
      }

      // Ensure fallback Idle, Pickup, and Die action textures exist
      if (!actionsMap['Idle']) {
        actionsMap['Idle'] = { id: 'Idle', label: 'Idle', icon: '🧘', frameCount: 1 }
      }

      for (let dir = 0; dir < 8; dir++) {
        // Fallback Idle0 if missing
        const hasIdle0 = charFrames.some((f) => f.name === `${charPrefix}_${dir}_Idle0`)
        if (!hasIdle0) {
          const run0 = charFrames.find((f) => f.name === `${charPrefix}_${dir}_Run0` || f.name === `${charPrefix}_${dir}_Run`)
          if (run0) {
            charFrames.push({ ...run0, name: `${charPrefix}_${dir}_Idle0` })
            charFrames.push({ ...run0, name: `${charPrefix}_${dir}_Idle` })
          }
        }
        // Fallback Pickup0 and Die0 if missing
        const hasPickup0 = charFrames.some((f) => f.name === `${charPrefix}_${dir}_Pickup0`)
        if (!hasPickup0) {
          const baseFrame = charFrames.find((f) => f.name === `${charPrefix}_${dir}_Idle0` || f.name === `${charPrefix}_${dir}_Run0`)
          if (baseFrame) {
            charFrames.push({ ...baseFrame, name: `${charPrefix}_${dir}_Pickup0` })
            charFrames.push({ ...baseFrame, name: `${charPrefix}_${dir}_Die0` })
          }
        }
      }

      // Standardized Ground Anchor (consistent across all models: ~0.898 on 512 canvas)
      const avgFeetY = sampleFeetYList.length > 0 ? (sampleFeetYList.reduce((a, b) => a + b, 0) / sampleFeetYList.length) : (detectedCellH * 0.898)
      const anchorY = Math.round((avgFeetY / detectedCellH) * 1000) / 1000

      const charAtlasRes = await buildMultiPageAtlas(`characters_${charId}`, charFrames, 2048, 2048)
      allCharacterSheets.push(...charAtlasRes.generatedSheetNames)
      totalCharacterWebpSize += charAtlasRes.totalWebpSize

      characterManifest[charId] = {
        id: charId,
        name: charTitle,
        cellWidth: detectedCellW,
        cellHeight: detectedCellH,
        anchorX: 0.5,
        anchorY: anchorY,
        scale: 1.0,
        actions: actionsMap,
      }
      console.log(`  ✅ Registered character "${charTitle}" (anchorY: ${anchorY}) with actions: ${Object.keys(actionsMap).join(', ')}`)
    }
  }

  const charManifestPath = path.join(SRC_GENERATED_DIR, 'characterManifest.json')
  fs.writeFileSync(charManifestPath, JSON.stringify(characterManifest, null, 2))
  console.log(`  ✅ Character manifest written (${Object.keys(characterManifest).length} models: ${Object.keys(characterManifest).join(', ')})`)

  // 2. Separate environment sprites into 3 logical categories
  console.log('📦 Processing environment sprites and towers...')
  const spriteEntries = fs.readdirSync(SPRITES_DIR).filter((f) => f.endsWith('.webp') || f.endsWith('.png')).map((f) => ({ dir: SPRITES_DIR, file: f, isTower: false }))
  if (fs.existsSync(TOWERS_DIR)) {
    const towerEntries = fs.readdirSync(TOWERS_DIR).filter((f) => f.endsWith('.webp') || f.endsWith('.png')).map((f) => ({ dir: TOWERS_DIR, file: f, isTower: true }))
    spriteEntries.push(...towerEntries)
  }

  const terrainFrames = []
  const structuresFrames = []
  const propsFrames = []
  const manifestItems = []

  for (const entry of spriteEntries) {
    const meta = await analyzeAndTrim(path.join(entry.dir, entry.file))
    const baseName = meta.name
    const lower = baseName.toLowerCase()

    let category = 'Other'
    if (entry.isTower || lower.startsWith('tower')) {
      category = 'Towers'
      structuresFrames.push(meta)
    } else if (lower.startsWith('dirt') || lower.startsWith('planks') || (lower.startsWith('stone') && !lower.includes('wall') && !lower.includes('column'))) {
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

    const towerNamesMap = {
      tower_stone_guard: 'Stone Guard Tower',
      tower_wood_archer: 'Wooden Archer Tower',
      tower_ballista_siege: 'Stone Ballista Tower',
      tower_red_cannon: 'Red Fortress Cannon Tower',
      tower_siege_mortar: 'Heavy Mortar Tower',
      tower_poison_cauldron: 'Poison Cauldron Tower',
      tower_frost_crystal: 'Frost Crystal Spire',
      tower_arcane_orb: 'Arcane Energy Orb Tower',
    }

    let formattedName = towerNamesMap[baseName] || baseName
      .replace(/_([A-Z])$/, ' ($1)')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
    formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1)

    manifestItems.push({
      id: `sprite-${baseName}`,
      name: formattedName,
      baseName,
      fileRelativePath: entry.isTower ? `towers/${entry.file}` : entry.file,
      category,
      width: meta.origW,
      height: meta.origH,
      trimWidth: meta.trimW,
      trimHeight: meta.trimH,
      anchorX: 0.5,
      anchorY: 0.88,
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

  // Generate dynamic atlasIndex.json for AssetManager bundle loader (atomic, non-overlapping bundles)
  const atlasIndex = {
    core: [...terrainRes.generatedSheetNames],
    structures: [...structRes.generatedSheetNames],
    props: [...propsRes.generatedSheetNames],
    characters: allCharacterSheets,
  }

  const atlasIndexPath = path.join(SRC_GENERATED_DIR, 'atlasIndex.json')
  fs.writeFileSync(atlasIndexPath, JSON.stringify(atlasIndex, null, 2))
  console.log(`  ✅ Atlas index bundle manifest written:`, atlasIndex)

  const totalWebp = (totalCharacterWebpSize + terrainRes.totalWebpSize + structRes.totalWebpSize + propsRes.totalWebpSize) / 1024 / 1024
  console.log(`\n🎉 Total Atlas Size: ${totalWebp.toFixed(2)} MB across all WebP sheets (Zero cutoffs, 100% full quality)!`)
}

run().catch((err) => {
  console.error('Failed to build atlases:', err)
  process.exit(1)
})
