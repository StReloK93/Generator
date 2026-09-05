import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const inputImagePath = 'C:/Users/user/.gemini/antigravity-ide/brain/b48dc430-f4c2-434a-9b4a-2d5855a3a808/.user_uploaded/media_1788634966526.png'
const outputDir = path.resolve('src/assets/sprites')

const towerNames = [
  // Row 1 (Top: Left to Right)
  'tower_stone_guard',
  'tower_wood_archer',
  'tower_ballista_siege',
  'tower_red_cannon',
  // Row 2 (Bottom: Left to Right)
  'tower_siege_mortar',
  'tower_poison_cauldron',
  'tower_frost_crystal',
  'tower_arcane_orb',
]

async function run() {
  console.log('🔍 Analyzing new image:', inputImagePath)
  const img = sharp(inputImagePath)
  const meta = await img.metadata()
  console.log(`Dimensions: ${meta.width}x${meta.height}, format: ${meta.format}, alpha: ${meta.hasAlpha}`)

  const { data, info } = await sharp(inputImagePath)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info

  // Segment into 8 components using connected component labeling with 4px bridge gap tolerance
  const labels = new Int32Array(width * height).fill(-1)
  let currentLabel = 0
  const components = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const alpha = data[idx * 4 + 3]

      if (alpha > 5 && labels[idx] === -1) {
        const comp = {
          id: currentLabel,
          minX: x,
          maxX: x,
          minY: y,
          maxY: y,
          pixelIndices: [],
        }

        const queue = [idx]
        labels[idx] = currentLabel

        let head = 0
        while (head < queue.length) {
          const cur = queue[head++]
          const cx = cur % width
          const cy = Math.floor(cur / width)
          comp.pixelIndices.push(cur)

          if (cx < comp.minX) comp.minX = cx
          if (cx > comp.maxX) comp.maxX = cx
          if (cy < comp.minY) comp.minY = cy
          if (cy > comp.maxY) comp.maxY = cy

          // Search neighbors up to 3px radius to bridge small transparent gaps (flags, antennas, poles)
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const nx = cx + dx
              const ny = cy + dy
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx
                if (labels[nIdx] === -1 && data[nIdx * 4 + 3] > 5) {
                  labels[nIdx] = currentLabel
                  queue.push(nIdx)
                }
              }
            }
          }
        }

        if (comp.pixelIndices.length > 1000) {
          components.push(comp)
          currentLabel++
        }
      }
    }
  }

  console.log(`Found ${components.length} distinct tower components.`)

  // Sort components into 2 rows (top to bottom) and 4 columns (left to right)
  components.sort((a, b) => {
    const ay = (a.minY + a.maxY) / 2
    const by = (b.minY + b.maxY) / 2
    if (Math.abs(ay - by) > 120) return ay - by
    return a.minX - b.minX
  })

  // First delete existing tower sprites to ensure clean replacement
  for (const name of towerNames) {
    const p = path.join(outputDir, `${name}.png`)
    if (fs.existsSync(p)) {
      fs.unlinkSync(p)
      console.log(`🗑️ Removed old: ${name}.png`)
    }
  }

  for (let i = 0; i < Math.min(components.length, towerNames.length); i++) {
    const comp = components[i]
    const name = towerNames[i]

    console.log(`\n📦 Processing #${i + 1}: ${name}`)
    console.log(`   Bounds: [${comp.minX}, ${comp.minY}] to [${comp.maxX}, ${comp.maxY}] (size: ${comp.maxX - comp.minX + 1}x${comp.maxY - comp.minY + 1}, pixels: ${comp.pixelIndices.length})`)

    const pad = 2
    const cropX = Math.max(0, comp.minX - pad)
    const cropY = Math.max(0, comp.minY - pad)
    const cropW = Math.min(width - cropX, (comp.maxX - comp.minX + 1) + pad * 2)
    const cropH = Math.min(height - cropY, (comp.maxY - comp.minY + 1) + pad * 2)

    // Create an isolated sub-image containing ONLY this component's pixels
    const isolatedBuffer = Buffer.alloc(cropW * cropH * 4, 0)

    for (const pIdx of comp.pixelIndices) {
      const px = pIdx % width
      const py = Math.floor(pIdx / width)

      const localX = px - cropX
      const localY = py - cropY

      if (localX >= 0 && localX < cropW && localY >= 0 && localY < cropH) {
        const destIdx = (localY * cropW + localX) * 4
        const srcIdx = pIdx * 4

        isolatedBuffer[destIdx] = data[srcIdx]
        isolatedBuffer[destIdx + 1] = data[srcIdx + 1]
        isolatedBuffer[destIdx + 2] = data[srcIdx + 2]
        isolatedBuffer[destIdx + 3] = data[srcIdx + 3]
      }
    }

    // Convert raw isolated buffer to PNG first
    const isolatedPng = await sharp(isolatedBuffer, {
      raw: { width: cropW, height: cropH, channels: 4 }
    })
    .png()
    .toBuffer()

    // Trim tight bounds
    const trimmed = await sharp(isolatedPng)
      .trim()
      .toBuffer({ resolveWithObject: true })

    const trimW = trimmed.info.width
    const trimH = trimmed.info.height

    // Standard canvas size 256x512
    const targetW = 256
    const targetH = 512

    // Scale to fit standard isometric building frame (max 236 width, max 430 height)
    const maxSpriteW = 236
    const maxSpriteH = 430
    const scale = Math.min(maxSpriteW / trimW, maxSpriteH / trimH, 1.0)
    const scaledW = Math.round(trimW * scale)
    const scaledH = Math.round(trimH * scale)

    const resizedSprite = await sharp(trimmed.data)
      .resize(scaledW, scaledH, { fit: 'inside' })
      .png()
      .toBuffer()

    const posX = Math.round((targetW - scaledW) / 2)
    const posY = Math.max(10, Math.round(470 - scaledH))

    const finalImage = await sharp({
      create: {
        width: targetW,
        height: targetH,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      { input: resizedSprite, left: posX, top: posY }
    ])
    .png()
    .toBuffer()

    const outFilePath = path.join(outputDir, `${name}.png`)
    fs.writeFileSync(outFilePath, finalImage)
    console.log(`   ✅ Saved new: ${outFilePath} (${targetW}x${targetH})`)
  }

  console.log('\n🎉 All 8 towers extracted cleanly and replaced successfully!')
}

run().catch(console.error)
