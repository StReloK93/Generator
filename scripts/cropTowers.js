import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const inputImagePath = 'C:/Users/user/.gemini/antigravity-ide/brain/b48dc430-f4c2-434a-9b4a-2d5855a3a808/.user_uploaded/media_1788632579351.jpg'
const outputDir = path.resolve('src/assets/sprites')

const towersConfig = [
  // Row 1 (Top)
  {
    name: 'tower_stone_guard',
    title: 'Stone Guard Tower',
    rect: { left: 0, top: 0, width: 256, height: 341 },
  },
  {
    name: 'tower_wood_archer',
    title: 'Wooden Archer Tower',
    rect: { left: 256, top: 0, width: 256, height: 341 },
  },
  {
    name: 'tower_ballista_siege',
    title: 'Stone Ballista Tower',
    rect: { left: 512, top: 0, width: 256, height: 341 },
  },
  {
    name: 'tower_red_cannon',
    title: 'Red Fortress Cannon Tower',
    rect: { left: 768, top: 0, width: 256, height: 341 },
  },
  // Row 2 (Bottom)
  {
    name: 'tower_siege_mortar',
    title: 'Heavy Mortar Tower',
    rect: { left: 0, top: 341, width: 256, height: 341 },
  },
  {
    name: 'tower_poison_cauldron',
    title: 'Poison Cauldron Tower',
    rect: { left: 256, top: 341, width: 256, height: 341 },
  },
  {
    name: 'tower_frost_crystal',
    title: 'Frost Crystal Spire',
    rect: { left: 512, top: 341, width: 256, height: 341 },
  },
  {
    name: 'tower_arcane_orb',
    title: 'Arcane Energy Orb Tower',
    rect: { left: 768, top: 341, width: 256, height: 341 },
  },
]

async function process() {
  const img = sharp(inputImagePath)
  const meta = await img.metadata()
  console.log(`Original image: ${meta.width}x${meta.height}`)

  for (const item of towersConfig) {
    console.log(`Extracting ${item.name}...`)

    // Extract sub-region
    const { data, info } = await sharp(inputImagePath)
      .extract(item.rect)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const width = info.width
    const height = info.height

    // Flood fill background from borders
    const visited = new Uint8Array(width * height)
    const isBg = new Uint8Array(width * height)
    const queue = []

    function getBrightness(x, y) {
      const idx = (y * width + x) * 4
      const r = data[idx]
      const g = data[idx + 1]
      const b = data[idx + 2]
      return (r * 0.299 + g * 0.587 + b * 0.114)
    }

    // Push boundary pixels to queue
    for (let x = 0; x < width; x++) {
      queue.push([x, 0])
      queue.push([x, height - 1])
    }
    for (let y = 0; y < height; y++) {
      queue.push([0, y])
      queue.push([width - 1, y])
    }

    const BG_MAX_BRIGHTNESS = 20

    let head = 0
    while (head < queue.length) {
      const [x, y] = queue[head++]
      const pIdx = y * width + x
      if (visited[pIdx]) continue
      visited[pIdx] = 1

      const b = getBrightness(x, y)
      if (b <= BG_MAX_BRIGHTNESS) {
        isBg[pIdx] = 1

        if (x > 0 && !visited[y * width + (x - 1)]) queue.push([x - 1, y])
        if (x < width - 1 && !visited[y * width + (x + 1)]) queue.push([x + 1, y])
        if (y > 0 && !visited[(y - 1) * width + x]) queue.push([x, y - 1])
        if (y < height - 1 && !visited[(y + 1) * width + x]) queue.push([x, y + 1])
      }
    }

    const outData = Buffer.from(data)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4
        const pIdx = y * width + x

        if (isBg[pIdx]) {
          outData[idx + 3] = 0
        } else {
          // Check anti-aliasing near boundary
          let nearBg = false
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx
              const ny = y + dy
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (isBg[ny * width + nx]) {
                  nearBg = true
                  break
                }
              }
            }
            if (nearBg) break
          }

          if (nearBg) {
            const br = getBrightness(x, y)
            if (br < 40) {
              const alphaRatio = Math.max(0, (br - 6) / (40 - 6))
              outData[idx + 3] = Math.min(255, Math.round(alphaRatio * 255))
            }
          }
        }
      }
    }

    // Convert raw processed buffer to PNG image
    const croppedPng = await sharp(outData, {
      raw: {
        width,
        height,
        channels: 4
      }
    })
    .png()
    .toBuffer()

    // Now analyze trimmed bounding box from this clean PNG
    const trimmed = await sharp(croppedPng)
      .trim()
      .toBuffer({ resolveWithObject: true })

    const trimW = trimmed.info.width
    const trimH = trimmed.info.height

    // Standard canvas size 256x512
    const targetW = 256
    const targetH = 512

    // Scale to fit nicely on standard 256x512 sprite slot (like existing stone pillars & structures)
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
    // Align base to bottom area (Y ~ 470)
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

    const outFilePath = path.join(outputDir, `${item.name}.png`)
    fs.writeFileSync(outFilePath, finalImage)
    console.log(`Saved ${outFilePath} (${targetW}x${targetH})`)
  }

  console.log('🎉 All 8 towers cropped and saved to src/assets/sprites successfully!')
}

process().catch(console.error)
