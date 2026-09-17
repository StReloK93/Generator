/**
 * Image Cropping & Transparency Trimming Utilities for Defensor Asset Editor
 */

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageTransformOptions {
  rotation?: number // 0, 90, 180, 270
  flipH?: boolean
  flipV?: boolean
}

/**
 * Loads an image from a URL or DataURL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(new Error(`Rasmni yuklashda xatolik: ${err}`))
    img.src = src
  })
}

/**
 * Analyzes non-transparent pixels and calculates the tight bounding box (Auto-Trim).
 */
export async function getAutoTrimRect(src: string, alphaTolerance = 5): Promise<CropRect> {
  const img = await loadImage(src)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth || img.width
  canvas.height = img.naturalHeight || img.height

  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height }
  }

  ctx.drawImage(img, 0, 0)
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > alphaTolerance) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // If entirely transparent or empty, return the whole image
  if (maxX === -1 || maxY === -1) {
    return { x: 0, y: 0, width, height }
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX + 1),
    height: Math.max(1, maxY - minY + 1),
  }
}

/**
 * Crops an image to the specified rectangle and applies optional transforms (rotation, flip).
 * Returns a high-quality transparent PNG data URL.
 */
export async function cropAndTransformImage(
  src: string,
  rect: CropRect,
  transform?: ImageTransformOptions
): Promise<string> {
  const img = await loadImage(src)
  const rot = ((transform?.rotation || 0) % 360 + 360) % 360
  const flipH = Boolean(transform?.flipH)
  const flipV = Boolean(transform?.flipV)

  // 1. First create an intermediate canvas with the rotation/flip applied if needed
  let sourceCanvas: HTMLCanvasElement | HTMLImageElement = img

  if (rot !== 0 || flipH || flipV) {
    const isSideways = rot === 90 || rot === 270
    const tw = isSideways ? img.height : img.width
    const th = isSideways ? img.width : img.height

    const tCanvas = document.createElement('canvas')
    tCanvas.width = tw
    tCanvas.height = th
    const tCtx = tCanvas.getContext('2d')
    if (tCtx) {
      tCtx.translate(tw / 2, th / 2)
      tCtx.rotate((rot * Math.PI) / 180)
      tCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
      tCtx.drawImage(img, -img.width / 2, -img.height / 2)
      sourceCanvas = tCanvas
    }
  }

  // 2. Crop the specified rectangle
  const clampedX = Math.max(0, Math.min(rect.x, sourceCanvas.width - 1))
  const clampedY = Math.max(0, Math.min(rect.y, sourceCanvas.height - 1))
  const clampedW = Math.max(1, Math.min(rect.width, sourceCanvas.width - clampedX))
  const clampedH = Math.max(1, Math.min(rect.height, sourceCanvas.height - clampedY))

  const destCanvas = document.createElement('canvas')
  destCanvas.width = Math.round(clampedW)
  destCanvas.height = Math.round(clampedH)

  const destCtx = destCanvas.getContext('2d')
  if (!destCtx) {
    throw new Error('Canvas 2D context not available')
  }

  destCtx.imageSmoothingEnabled = true
  destCtx.imageSmoothingQuality = 'high'
  destCtx.drawImage(
    sourceCanvas,
    clampedX,
    clampedY,
    clampedW,
    clampedH,
    0,
    0,
    destCanvas.width,
    destCanvas.height
  )

  return destCanvas.toDataURL('image/png')
}

/**
 * Automatically trims transparent edges from an image and returns the trimmed PNG data URL.
 */
export async function autoTrimImage(src: string, alphaTolerance = 5): Promise<{ dataUrl: string; rect: CropRect }> {
  const rect = await getAutoTrimRect(src, alphaTolerance)
  const dataUrl = await cropAndTransformImage(src, rect)
  return { dataUrl, rect }
}
