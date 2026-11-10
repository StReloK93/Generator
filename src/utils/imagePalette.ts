/**
 * Main colors of an image (e.g. a tower or tile asset), so a projectile can be recolored to match it.
 * Pixels are bucketed (4 bits per channel); buckets are ranked by how often they appear and how colorful they are,
 * and only clearly different colors are kept.
 */
export async function extractPalette(src: string, count = 5): Promise<string[]> {
  const img = await loadImage(src)
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return []
  ctx.drawImage(img, 0, 0, size, size)
  const { data } = ctx.getImageData(0, 0, size, size)

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 140) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.r += r
      bucket.g += g
      bucket.b += b
      bucket.n++
    } else {
      buckets.set(key, { r, g, b, n: 1 })
    }
  }

  const ranked = [...buckets.values()]
    .map(c => {
      const r = c.r / c.n
      const g = c.g / c.n
      const b = c.b / c.n
      const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255
      return { r, g, b, score: c.n * (0.35 + saturation) }
    })
    .sort((a, b) => b.score - a.score)

  const picked: { r: number; g: number; b: number }[] = []
  for (const c of ranked) {
    if (picked.every(p => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) > 60)) picked.push(c)
    if (picked.length >= count) break
  }
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, '0')
  return picked.map(c => `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}`)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image could not be loaded'))
    img.src = src
  })
}
