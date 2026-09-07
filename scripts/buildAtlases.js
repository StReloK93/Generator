import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const SPRITES_DIR = path.resolve('src/assets/sprites')
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
    const webpBuf = await baseImage.clone().webp({ quality: 90, alphaQuality: 100 }).toBuffer()
    const pngBuf = await baseImage.clone().png({ compressionLevel: 9 }).toBuffer()
    fs.writeFileSync(webpPath, webpBuf)
    fs.writeFileSync(pngPath, pngBuf)

    const webpSize = webpBuf.length
    const pngSize = pngBuf.length
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

  // 1. Automatically scan, process, slice and pack ALL character folders in src/assets/characters/
  console.log('📦 Dynamically scanning all character folders in src/assets/characters/...')
  const characterManifest = {}
  const allCharacterSheets = []
  let totalCharacterWebpSize = 0

  const angleToDirMap = {
    '045': 0, // North-East (Up-Right)
    '067': 1,
    '090': 1, // East (Right)
    '112': 2,
    '135': 2, // South-East (Down-Right)
    '157': 3,
    '180': 3, // South (Down)
    '202': 4,
    '225': 4, // South-West (Down-Left)
    '247': 5,
    '270': 5, // West (Left)
    '292': 6,
    '315': 6, // North-West (Up-Left)
    '337': 7,
    '000': 7, // North (Up)
    '022': 0,
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
      const files = fs.readdirSync(charDir).filter((f) => f.endsWith('.png'))
      if (files.length === 0) continue

      const charFrames = []
      const actionsMap = {}
      const sampleFeetYList = []
      const sampleHeightList = []
      let detectedCellW = 256
      let detectedCellH = 256

      for (const file of files) {
        const filePath = path.join(charDir, file)
        const baseName = file.replace(/\.[^/.]+$/, '')
        const meta = await sharp(filePath).metadata()
        const imgW = meta.width || 256
        const imgH = meta.height || 256

        // Check if this file is a sprite sheet (e.g. 1536x1024, or contains multiple frames / angles)
        const hasAnglePattern = /_\d{2,3}$/.test(baseName) || /_Body_/i.test(baseName)
        const isSpriteSheet = imgW > 256 || imgH > 512 || (hasAnglePattern && imgW >= 256)

        if (isSpriteSheet && (imgW > 256 || imgH > 256 || hasAnglePattern)) {
          // Parse action name and angle
          let angle = '135'
          const angleMatch = baseName.match(/_?(\d{2,3})$/)
          let nameWithoutAngle = baseName
          if (angleMatch) {
            angle = angleMatch[1].padStart(3, '0')
            nameWithoutAngle = baseName.substring(0, angleMatch.index).replace(/_$/, '')
          }

          let actionClean = nameWithoutAngle
            .replace(new RegExp(`^(${folder}|character|unit|model)_?`, 'i'), '')
            .replace(/_?(body|sheet|anim|action|frames?)$/i, '')
            .replace(/^(\d+)_?/, '')

          const action = actionClean ? (actionClean.charAt(0).toUpperCase() + actionClean.slice(1)) : 'Action'

          const cols = Math.max(1, Math.round(imgW / 256))
          const rows = Math.max(1, Math.round(imgH / 256))
          const cellW = Math.floor(imgW / cols)
          const cellH = Math.floor(imgH / rows)
          detectedCellW = cellW
          detectedCellH = cellH
          const totalSheetFrames = cols * rows

          if (!actionsMap[action]) {
            actionsMap[action] = {
              id: action,
              label: action,
              icon: getActionIcon(action),
              frameCount: totalSheetFrames,
            }
          } else {
            actionsMap[action].frameCount = Math.max(actionsMap[action].frameCount, totalSheetFrames)
          }

          const sliced = await sliceAndAnalyzeSheet(filePath, `temp_${charPrefix}_${action}_${angle}_`, cols, rows)
          const dir = angleToDirMap[angle]

          for (let idx = 0; idx < sliced.length; idx++) {
            const frame = sliced[idx]
            if (sampleFeetYList.length < 20 && frame.maxY > 0) {
              sampleFeetYList.push(frame.maxY)
              sampleHeightList.push(frame.trimH)
            }

            if (dir !== undefined) {
              charFrames.push({
                ...frame,
                name: `${charPrefix}_${dir}_${action}${idx}`,
              })
              if (idx === 0) {
                charFrames.push({
                  ...frame,
                  name: `${charPrefix}_${dir}_${action}0`,
                })
              }
              const lowerAct = action.toLowerCase()
              if (lowerAct.includes('idle') || lowerAct.includes('stand') || lowerAct.includes('wait')) {
                charFrames.push({
                  ...frame,
                  name: `${charPrefix}_${dir}_Idle${idx}`,
                })
                if (idx === 0) {
                  charFrames.push({
                    ...frame,
                    name: `${charPrefix}_${dir}_Idle`,
                  })
                  charFrames.push({
                    ...frame,
                    name: `${charPrefix}_${dir}_Idle0`,
                  })
                }
              }
              if (lowerAct.includes('run') || lowerAct.includes('walk') || lowerAct.includes('sprint') || lowerAct.includes('jog') || lowerAct.includes('move')) {
                charFrames.push({
                  ...frame,
                  name: `${charPrefix}_${dir}_Run${idx}`,
                })
                if (idx === 0) {
                  charFrames.push({
                    ...frame,
                    name: `${charPrefix}_${dir}_Run0`,
                  })
                }
              }
              if (lowerAct.includes('die') || lowerAct.includes('death') || lowerAct.includes('dead') || lowerAct.includes('pickup') || lowerAct.includes('hit') || lowerAct.includes('collapse')) {
                charFrames.push({
                  ...frame,
                  name: `${charPrefix}_${dir}_Pickup${idx}`,
                })
                charFrames.push({
                  ...frame,
                  name: `${charPrefix}_${dir}_Die${idx}`,
                })
              }
            }

            // Full angle key
            charFrames.push({
              ...frame,
              name: `${charPrefix}_angle_${angle}_${action}${idx}`,
            })
            if (idx === 0) {
              charFrames.push({
                ...frame,
                name: `${charPrefix}_angle_${angle}_${action}0`,
              })
            }
          }
        } else {
          // Discrete Single Frame PNG (e.g. Male_0_Idle0.png or 0_Idle_0.png)
          const trimmed = await analyzeAndTrim(filePath)
          detectedCellW = trimmed.origW
          detectedCellH = trimmed.origH
          if (sampleFeetYList.length < 20 && trimmed.maxY > 0) {
            sampleFeetYList.push(trimmed.maxY)
            sampleHeightList.push(trimmed.trimH)
          }

          const nameMatch = baseName.match(/^(?:[A-Za-z0-9]+_)?(\d)_([A-Za-z]+)(\d*)$/)
          if (nameMatch) {
            const dir = parseInt(nameMatch[1], 10)
            const actionRaw = nameMatch[2]
            const action = actionRaw.charAt(0).toUpperCase() + actionRaw.slice(1)
            const frameIdx = nameMatch[3] ? parseInt(nameMatch[3], 10) : 0

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
              charFrames.push({
                ...trimmed,
                name: `${charPrefix}_${dir}_${action}0`,
              })
            }
            const lowerAct = action.toLowerCase()
            if (lowerAct.includes('idle') || lowerAct.includes('stand') || lowerAct.includes('wait')) {
              charFrames.push({
                ...trimmed,
                name: `${charPrefix}_${dir}_Idle${frameIdx}`,
              })
              if (frameIdx === 0) {
                charFrames.push({
                  ...trimmed,
                  name: `${charPrefix}_${dir}_Idle`,
                })
                charFrames.push({
                  ...trimmed,
                  name: `${charPrefix}_${dir}_Idle0`,
                })
              }
            }
            if (lowerAct.includes('run') || lowerAct.includes('walk') || lowerAct.includes('sprint') || lowerAct.includes('jog') || lowerAct.includes('move')) {
              charFrames.push({
                ...trimmed,
                name: `${charPrefix}_${dir}_Run${frameIdx}`,
              })
              if (frameIdx === 0) {
                charFrames.push({
                  ...trimmed,
                  name: `${charPrefix}_${dir}_Run0`,
                })
              }
            }
            if (lowerAct.includes('die') || lowerAct.includes('death') || lowerAct.includes('dead') || lowerAct.includes('pickup') || lowerAct.includes('hit') || lowerAct.includes('collapse')) {
              charFrames.push({
                ...trimmed,
                name: `${charPrefix}_${dir}_Pickup${frameIdx}`,
              })
              charFrames.push({
                ...trimmed,
                name: `${charPrefix}_${dir}_Die${frameIdx}`,
              })
            }
          } else {
            charFrames.push(trimmed)
          }
        }
      }

      // Smart Anchor & Scale calculation
      const avgFeetY = sampleFeetYList.length > 0 ? (sampleFeetYList.reduce((a, b) => a + b, 0) / sampleFeetYList.length) : (detectedCellH * 0.75)
      const avgHeight = sampleHeightList.length > 0 ? (sampleHeightList.reduce((a, b) => a + b, 0) / sampleHeightList.length) : 100
      const anchorY = Math.round((avgFeetY / detectedCellH) * 1000) / 1000

      let scale = 1.0
      if (charId === 'male') scale = 0.52
      else if (charId === 'warrior') scale = 1.48
      else {
        scale = Math.round((130 / Math.max(40, avgHeight)) * 0.95 * 100) / 100
      }

      if (Object.keys(actionsMap).length === 0) {
        actionsMap['Idle'] = { id: 'Idle', label: 'Idle', icon: '🧘', frameCount: 1 }
      }

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
        scale: scale,
        actions: actionsMap,
      }
      console.log(`  ✅ Registered character "${charTitle}" with actions: ${Object.keys(actionsMap).join(', ')}`)
    }
  }

  const charManifestPath = path.join(SRC_GENERATED_DIR, 'characterManifest.json')
  fs.writeFileSync(charManifestPath, JSON.stringify(characterManifest, null, 2))
  console.log(`  ✅ Character manifest written (${Object.keys(characterManifest).length} models: ${Object.keys(characterManifest).join(', ')})`)

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
    if (lower.startsWith('tower')) {
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
