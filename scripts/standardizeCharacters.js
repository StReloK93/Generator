import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const CHARS_ROOT_DIR = path.resolve('src/assets/characters')
const BACKUP_ROOT_DIR = path.resolve('src/assets/characters_raw_backup')
const TARGET_BASELINE_Y = 458
const TARGET_CENTER_X = 128
const CANVAS_W = 256
const CANVAS_H = 512

// Standard 8 directions mapped to source 3D render angle strings
const PRIMARY_ANGLES = {
  '000': 7, // North (Up)
  '045': 0, // North-East (Up-Right)
  '090': 1, // East (Right)
  '135': 2, // South-East (Down-Right)
  '180': 3, // South (Down)
  '225': 4, // South-West (Down-Left)
  '270': 5, // West (Left)
  '315': 6, // North-West (Up-Left)
}

// Visual scale tuning so all characters stand proportionally on 256x512
const CHAR_CONFIGS = {
  barry: { scale: 1.15, isSheetGrid: true, baselineY: 463 },
  bird: { scale: 1.10, isSheetGrid: true, baselineY: 483 },
  demon: { scale: 1.70, isSheetGrid: true },
  female: { scale: 1.20, isSheetGrid: true },
  male: { scale: 1.0, isAlreadyDiscrete: true },
  medusa: { scale: 1.75, isSheetGrid: true },
  orc: { scale: 1.35, isSheetGrid: true, baselineY: 460 },
  warrior: { scale: 1.75, isSheetGrid: true },
  zombi: { scale: 0.95, isAngleDiscrete: true, baselineY: 463 },
}

// Detect uniform square cell size
function detectGrid(imgW, imgH) {
  const candidates = [256, 320, 512, 192, 160, 128]
  for (const s of candidates) {
    if (imgW % s === 0 && imgH % s === 0) {
      return { cols: Math.floor(imgW / s), rows: Math.floor(imgH / s), cellW: s, cellH: s }
    }
  }
  const cols = Math.max(1, Math.round(imgW / 256))
  const rows = Math.max(1, Math.round(imgH / 256))
  return { cols, rows, cellW: Math.floor(imgW / cols), cellH: Math.floor(imgH / rows) }
}

async function standardizeAllCharacters() {
  console.log('🚀 Starting Universal 256x512 Character Standardization & Stabilization...')

  // Step 1: Backup raw characters if not already backed up
  if (!fs.existsSync(BACKUP_ROOT_DIR)) {
    console.log('📦 Creating backup of raw character files to src/assets/characters_raw_backup...')
    fs.cpSync(CHARS_ROOT_DIR, BACKUP_ROOT_DIR, { recursive: true })
  }

  const charFolders = fs.readdirSync(BACKUP_ROOT_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)

  for (const folder of charFolders) {
    const charId = folder.toLowerCase()
    const charTitle = folder.charAt(0).toUpperCase() + folder.slice(1)
    const srcCharDir = path.join(BACKUP_ROOT_DIR, folder)
    const dstCharDir = path.join(CHARS_ROOT_DIR, folder)
    const cfg = CHAR_CONFIGS[charId] || { scale: 1.0, isSheetGrid: true }

    console.log(`\n🧙 Processing Character: ${charTitle} (ID: ${charId})...`)

    // If male (already discrete 256x512), keep clean files
    if (cfg.isAlreadyDiscrete) {
      console.log(`  ✅ ${charTitle} is already standardized discrete 256x512 files.`)
      continue
    }

    const tempOutputDir = path.join(CHARS_ROOT_DIR, `temp_${charId}`)
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true })
    }
    fs.mkdirSync(tempOutputDir, { recursive: true })

    const rawFiles = fs.readdirSync(srcCharDir).filter((f) => f.endsWith('.png') || f.endsWith('.webp'))

    if (cfg.isAngleDiscrete) {
      // Discrete Angle Sequences (e.g. Zombi: Run_Body_000_0001.png .. Run_Body_315_0012.png)
      for (const [ang, dir] of Object.entries(PRIMARY_ANGLES)) {
        const angFiles = rawFiles
          .filter((f) => f.includes(`_${ang}_`))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

        if (angFiles.length === 0) continue

        // Analyze baseline across all frames of this angle
        let sumFeetY = 0
        let sumCenterX = 0
        let count = 0
        const frameDataList = []

        for (const file of angFiles) {
          const filePath = path.join(srcCharDir, file)
          const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true })
          let minX = info.width, minY = info.height, maxX = 0, maxY = 0
          for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
              if (data[(y * info.width + x) * 4 + 3] > 15) {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
              }
            }
          }
          if (maxX > minX && maxY > minY) {
            sumFeetY += maxY
            sumCenterX += (minX + maxX) / 2
            count++
            frameDataList.push({ file, filePath, minX, minY, maxX, maxY, trimW: maxX - minX + 1, trimH: maxY - minY + 1 })
          }
        }

        const avgFeetY = count > 0 ? sumFeetY / count : 200
        const avgCenterX = count > 0 ? sumCenterX / count : 128

        // Process frames
        for (let idx = 0; idx < frameDataList.length; idx++) {
          const f = frameDataList[idx]
          const trimmedBuf = await sharp(f.filePath)
            .extract({ left: f.minX, top: f.minY, width: f.trimW, height: f.trimH })
            .toBuffer()

          const scaledW = Math.max(1, Math.round(f.trimW * cfg.scale))
          const scaledH = Math.max(1, Math.round(f.trimH * cfg.scale))
          const resizedTrimmed = await sharp(trimmedBuf).resize(scaledW, scaledH, { fit: 'fill' }).toBuffer()

          const relX = f.minX - avgCenterX
          const relY = f.minY - avgFeetY
          const destLeft = Math.min(CANVAS_W - scaledW, Math.max(0, Math.round(TARGET_CENTER_X + relX * cfg.scale)))
          const destTop = Math.min(CANVAS_H - scaledH, Math.max(0, Math.round((cfg.baselineY || TARGET_BASELINE_Y) + relY * cfg.scale)))

          const finalBuf = await sharp({
            create: {
              width: CANVAS_W,
              height: CANVAS_H,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
          })
            .composite([{ input: resizedTrimmed, left: destLeft, top: destTop }])
            .png()
            .toBuffer()

          // Save Run frame
          fs.writeFileSync(path.join(tempOutputDir, `${charTitle}_${dir}_Run${idx}.png`), finalBuf)

          // Frame 0 as Idle
          if (idx === 0) {
            fs.writeFileSync(path.join(tempOutputDir, `${charTitle}_${dir}_Idle0.png`), finalBuf)
          }
        }
      }
    } else if (cfg.isSheetGrid) {
      // Multi-Frame Sprite Sheet Grids (Barry, Bird, Demon, Female, Medusa, Warrior)
      for (const [ang, dir] of Object.entries(PRIMARY_ANGLES)) {
        // 1. Process Idle (Keep 1 clean frame: frame 0)
        const idleSheetName = rawFiles.find((f) => {
          const lower = f.toLowerCase()
          return (lower.includes('idle') || lower.includes('stand')) && f.includes(`_${ang}.`)
        })

        if (idleSheetName) {
          const sheetPath = path.join(srcCharDir, idleSheetName)
          const meta = await sharp(sheetPath).metadata()
          const grid = detectGrid(meta.width || 256, meta.height || 256)
          const cellBuf = await sharp(sheetPath)
            .extract({ left: 0, top: 0, width: grid.cellW, height: grid.cellH })
            .toBuffer()

          const { data, info } = await sharp(cellBuf).raw().toBuffer({ resolveWithObject: true })
          let minX = info.width, minY = info.height, maxX = 0, maxY = 0
          for (let y = 0; y < info.height; y++) {
            for (let x = 0; x < info.width; x++) {
              if (data[(y * info.width + x) * 4 + 3] > 15) {
                if (x < minX) minX = x
                if (x > maxX) maxX = x
                if (y < minY) minY = y
                if (y > maxY) maxY = y
              }
            }
          }

          const trimW = Math.max(1, maxX - minX + 1)
          const trimH = Math.max(1, maxY - minY + 1)
          const trimmedBuf = await sharp(cellBuf).extract({ left: minX, top: minY, width: trimW, height: trimH }).toBuffer()

          const scaledW = Math.max(1, Math.round(trimW * cfg.scale))
          const scaledH = Math.max(1, Math.round(trimH * cfg.scale))
          const resizedTrimmed = await sharp(trimmedBuf).resize(scaledW, scaledH, { fit: 'fill' }).toBuffer()

          const footCenterX = (minX + maxX) / 2
          const footY = maxY
          const relX = minX - footCenterX
          const relY = minY - footY
          const destLeft = Math.min(CANVAS_W - scaledW, Math.max(0, Math.round(TARGET_CENTER_X + relX * cfg.scale)))
          const destTop = Math.min(CANVAS_H - scaledH, Math.max(0, Math.round((cfg.baselineY || TARGET_BASELINE_Y) + relY * cfg.scale)))

          const idleImg = await sharp({
            create: {
              width: CANVAS_W,
              height: CANVAS_H,
              channels: 4,
              background: { r: 0, g: 0, b: 0, alpha: 0 },
            },
          })
            .composite([{ input: resizedTrimmed, left: destLeft, top: destTop }])
            .png()
            .toBuffer()

          fs.writeFileSync(path.join(tempOutputDir, `${charTitle}_${dir}_Idle0.png`), idleImg)
        }

        // 2. Process Run / Walk cycle (Extract all frames with root ground stabilization)
        const runSheetName = rawFiles.find((f) => {
          const lower = f.toLowerCase()
          return (lower.includes('run') || lower.includes('walk') || lower.includes('move')) && f.includes(`_${ang}.`)
        })

        if (runSheetName) {
          const sheetPath = path.join(srcCharDir, runSheetName)
          const meta = await sharp(sheetPath).metadata()
          const grid = detectGrid(meta.width || 256, meta.height || 256)
          const cols = grid.cols
          const rows = grid.rows
          const cellW = grid.cellW
          const cellH = grid.cellH

          // Pass 1: analyze baseline across all frames of this sheet
          let sumFeetY = 0
          let sumCenterX = 0
          let count = 0
          const rawCells = []

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const raw = await sharp(sheetPath)
                .extract({ left: c * cellW, top: r * cellH, width: cellW, height: cellH })
                .raw()
                .toBuffer()

              let minX = cellW, minY = cellH, maxX = 0, maxY = 0
              for (let y = 0; y < cellH; y++) {
                for (let x = 0; x < cellW; x++) {
                  if (raw[(y * cellW + x) * 4 + 3] > 15) {
                    if (x < minX) minX = x
                    if (x > maxX) maxX = x
                    if (y < minY) minY = y
                    if (y > maxY) maxY = y
                  }
                }
              }

              if (maxX > minX && maxY > minY) {
                sumFeetY += maxY
                sumCenterX += (minX + maxX) / 2
                count++
                rawCells.push({ r, c, minX, minY, maxX, maxY, trimW: maxX - minX + 1, trimH: maxY - minY + 1 })
              }
            }
          }

          const avgFeetY = count > 0 ? sumFeetY / count : cellH * 0.8
          const avgCenterX = count > 0 ? sumCenterX / count : cellW * 0.5

          // Pass 2: extract, trim, scale, and composite stabilized onto 256x512 canvas
          for (let idx = 0; idx < rawCells.length; idx++) {
            const cell = rawCells[idx]
            const trimmedBuf = await sharp(sheetPath)
              .extract({
                left: cell.c * cellW + cell.minX,
                top: cell.r * cellH + cell.minY,
                width: cell.trimW,
                height: cell.trimH,
              })
              .toBuffer()

            const scaledW = Math.max(1, Math.round(cell.trimW * cfg.scale))
            const scaledH = Math.max(1, Math.round(cell.trimH * cfg.scale))
            const resizedTrimmed = await sharp(trimmedBuf).resize(scaledW, scaledH, { fit: 'fill' }).toBuffer()

            const relX = cell.minX - avgCenterX
            const relY = cell.minY - avgFeetY
            const destLeft = Math.min(CANVAS_W - scaledW, Math.max(0, Math.round(TARGET_CENTER_X + relX * cfg.scale)))
            const destTop = Math.min(CANVAS_H - scaledH, Math.max(0, Math.round((cfg.baselineY || TARGET_BASELINE_Y) + relY * cfg.scale)))

            const finalBuf = await sharp({
              create: {
                width: CANVAS_W,
                height: CANVAS_H,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            })
              .composite([{ input: resizedTrimmed, left: destLeft, top: destTop }])
              .png()
              .toBuffer()

            fs.writeFileSync(path.join(tempOutputDir, `${charTitle}_${dir}_Run${idx}.png`), finalBuf)

            // If no idle sheet was found, use Run0 as Idle0
            if (!idleSheetName && idx === 0) {
              fs.writeFileSync(path.join(tempOutputDir, `${charTitle}_${dir}_Idle0.png`), finalBuf)
            }
          }
        }
      }
    }

    // Replace original destination folder with standardized files
    const generatedFiles = fs.readdirSync(tempOutputDir)
    console.log(`  ✨ Generated ${generatedFiles.length} standardized 256x512 frames for ${charTitle}`)

    // Clean old folder
    fs.rmSync(dstCharDir, { recursive: true, force: true })
    fs.mkdirSync(dstCharDir, { recursive: true })

    // Move generated files
    for (const gf of generatedFiles) {
      fs.copyFileSync(path.join(tempOutputDir, gf), path.join(dstCharDir, gf))
    }
    fs.rmSync(tempOutputDir, { recursive: true, force: true })
  }

  console.log('\n🎉 ALL CHARACTERS STANDARDIZED TO 256x512 UNIFORM DISCRETE FRAMES!')
}

standardizeAllCharacters().catch((err) => {
  console.error('Error during standardization:', err)
  process.exit(1)
})
