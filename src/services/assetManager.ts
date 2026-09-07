import { Assets, Texture, Spritesheet } from 'pixi.js'
import { ref } from 'vue'
import { AssetItem } from '../types/map'
import spriteManifestRaw from '../assets/generated/spriteManifest.json'
import atlasIndexRaw from '../assets/generated/atlasIndex.json'
import characterManifest from '../assets/generated/characterManifest.json'

export type AssetBundleName = 'core' | 'structures' | 'props' | 'characters' | 'editor' | 'game'

export interface BundleDiagnostics {
  bundleName: string
  status: 'pending' | 'loading' | 'loaded' | 'failed'
  loadTimeMs: number
  texturesCount: number
}

class AssetManagerService {
  private static _instance: AssetManagerService | null = null

  public static get instance(): AssetManagerService {
    if (!this._instance) {
      this._instance = new AssetManagerService()
    }
    return this._instance
  }

  // Reactive revision counter so Vue components update when atlases load
  public readonly atlasRevision = ref<number>(0)

  // Loaded & in-flight states
  private loadedBundles = new Set<string>()
  private loadingPromises = new Map<string, Promise<any>>()
  private bundleDiagnostics = new Map<string, BundleDiagnostics>()

  // Central Fast Texture Cache
  private textureMap = new Map<string, Texture>()
  private spritesheets = new Map<string, Spritesheet>()
  private previewCache = new Map<string, string>()
  private isBundlesRegistered = false

  // Precomputed manifest list
  public readonly manifest: AssetItem[] = (spriteManifestRaw as unknown) as AssetItem[]

  constructor() {
    this.registerBundles()
  }

  // Get base URL for static assets (compatible with Vite base e.g. /Generator/)
  private getBaseUrl(): string {
    const base = import.meta.env.BASE_URL || '/'
    return base.endsWith('/') ? base : `${base}/`
  }

  // Register PixiJS 8 Asset Bundles dynamically from atlasIndex.json
  public registerBundles(): void {
    if (this.isBundlesRegistered) return
    this.isBundlesRegistered = true

    const base = this.getBaseUrl()
    const index = atlasIndexRaw as Record<string, string[]>

    for (const [bundleName, sheets] of Object.entries(index)) {
      const bundleAssets: Record<string, string> = {}
      for (const sheet of sheets) {
        if (!Assets.resolver.hasKey(sheet)) {
          bundleAssets[sheet] = `${base}assets/atlases/${sheet}.json`
        }
      }
      if (Object.keys(bundleAssets).length > 0) {
        Assets.addBundle(bundleName, bundleAssets)
      }
    }
  }

  // Load a specific bundle with in-flight deduplication and progress callback
  public async loadBundle(
    bundleName: AssetBundleName,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    if (bundleName === 'editor') {
      return this.loadEditor(onProgress)
    }
    if (bundleName === 'game') {
      return this.loadGame(onProgress)
    }

    this.registerBundles()

    if (this.loadedBundles.has(bundleName)) {
      if (onProgress) onProgress(1.0)
      return
    }

    if (this.loadingPromises.has(bundleName)) {
      return this.loadingPromises.get(bundleName)
    }

    const startTime = performance.now()
    this.bundleDiagnostics.set(bundleName, {
      bundleName,
      status: 'loading',
      loadTimeMs: 0,
      texturesCount: 0,
    })

    const loadPromise = (async () => {
      try {
        const loadedAssets = await Assets.loadBundle(bundleName, (prog) => {
          if (onProgress) onProgress(prog)
        })

        // Index all textures from loaded spritesheets into textureMap for O(1) instant retrieval
        let count = 0
        for (const [sheetKey, asset] of Object.entries(loadedAssets)) {
          if (asset && typeof asset === 'object' && 'textures' in asset) {
            const sheet = asset as Spritesheet
            this.spritesheets.set(sheetKey, sheet)

            for (const [frameKey, tex] of Object.entries(sheet.textures)) {
              this.indexTexture(frameKey, tex)
              count++
            }
          } else if (asset instanceof Texture) {
            this.indexTexture(sheetKey, asset)
            count++
          }
        }

        const duration = Math.round(performance.now() - startTime)
        this.loadedBundles.add(bundleName)
        this.atlasRevision.value++
        this.bundleDiagnostics.set(bundleName, {
          bundleName,
          status: 'loaded',
          loadTimeMs: duration,
          texturesCount: count,
        })

        if (import.meta.env.DEV) {
          console.log(`[AssetManager] Bundle "${bundleName}" loaded in ${duration}ms (${count} textures indexed)`)
        }

        if (onProgress) onProgress(1.0)
      } catch (err) {
        this.bundleDiagnostics.set(bundleName, {
          bundleName,
          status: 'failed',
          loadTimeMs: Math.round(performance.now() - startTime),
          texturesCount: 0,
        })
        console.error(`[AssetManager] Failed to load bundle "${bundleName}":`, err)
        throw err
      } finally {
        this.loadingPromises.delete(bundleName)
      }
    })()

    this.loadingPromises.set(bundleName, loadPromise)
    return loadPromise
  }

  // Route: Load Core (Ground / Terrain)
  public async loadCore(onProgress?: (progress: number) => void): Promise<void> {
    await this.loadBundle('core', onProgress)
  }

  // Route: Load Editor (Core + Structures + Props)
  public async loadEditor(onProgress?: (progress: number) => void): Promise<void> {
    await this.loadCore((p) => onProgress?.(p * 0.2))
    await this.loadBundle('structures', (p) => onProgress?.(0.2 + p * 0.4))
    await this.loadBundle('props', (p) => onProgress?.(0.6 + p * 0.4))
    if (onProgress) onProgress(1.0)
  }

  // Route: Load Game (Core + Structures + Characters)
  public async loadGame(onProgress?: (progress: number) => void): Promise<void> {
    await this.loadCore((p) => onProgress?.(p * 0.2))
    await this.loadBundle('structures', (p) => onProgress?.(0.2 + p * 0.4))
    await this.loadBundle('characters', (p) => onProgress?.(0.6 + p * 0.4))
    if (onProgress) onProgress(1.0)
  }

  // Background Preloader (Idle callback)
  public preloadRemainingInBackground(): void {
    const runPreload = async () => {
      try {
        if (!this.loadedBundles.has('core')) await this.loadBundle('core')
        if (!this.loadedBundles.has('structures')) await this.loadBundle('structures')
        if (!this.loadedBundles.has('characters')) await this.loadBundle('characters')
        if (!this.loadedBundles.has('props')) await this.loadBundle('props')
      } catch (e) {
        // Silently ignore background preload issues
      }
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => runPreload(), { timeout: 3000 })
    } else {
      setTimeout(runPreload, 1500)
    }
  }

  // Store texture with all possible lookup aliases
  private indexTexture(key: string, texture: Texture): void {
    if (!key || !texture) return
    const cleanKey = key.replace(/\.[^/.]+$/, '') // remove .png if present
    const baseName = cleanKey.replace(/^sprite-/, '')

    this.textureMap.set(key, texture)
    this.textureMap.set(cleanKey, texture)
    this.textureMap.set(baseName, texture)
    this.textureMap.set(`sprite-${baseName}`, texture)
    this.textureMap.set(`${baseName}.png`, texture)
  }

  // Register custom uploaded user texture
  public registerCustomTexture(id: string, texture: Texture): void {
    this.indexTexture(id, texture)
    this.atlasRevision.value++
  }

  // Canonical aliases for deduped assets
  private static readonly ALIASES: Record<string, string> = {
    fenceHigh_E: 'fenceHighBroken_E',
    fenceHigh_N: 'fenceHighBroken_N',
    fenceHigh_S: 'fenceHighBroken_S',
    fenceHigh_W: 'fenceHighBroken_W',
    bookcaseEmptyLadder_W: 'bookcaseBooks_W',
    bookcaseEmpty_W: 'bookcaseBooks_W',
    bookcaseWideEmpty_N: 'bookcaseWideBooks_N',
    woodWallDiagional_N: 'woodWallCross_N',
    woodWallDiagional_W: 'woodWallCross_W',
    woodWall_N: 'woodWallCross_N',
    woodWall_W: 'woodWallCross_W',
  }

  // Fast O(1) Texture Retrieval
  public getTexture(assetIdOrName: string): Texture | null {
    if (!assetIdOrName) return null

    if (this.textureMap.has(assetIdOrName)) {
      return this.textureMap.get(assetIdOrName)!
    }

    const clean = assetIdOrName.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '')
    if (this.textureMap.has(clean)) {
      return this.textureMap.get(clean)!
    }
    if (this.textureMap.has(`sprite-${clean}`)) {
      return this.textureMap.get(`sprite-${clean}`)!
    }

    // Check canonical alias
    const alias = AssetManagerService.ALIASES[clean]
    if (alias) {
      const aliasedTex = this.textureMap.get(alias) || this.textureMap.get(`sprite-${alias}`)
      if (aliasedTex) return aliasedTex
    }

    // Try Pixi Assets cache directly as fallback
    try {
      if (Assets.cache.has(assetIdOrName)) {
        const tex = Assets.get(assetIdOrName)
        if (tex instanceof Texture) {
          this.indexTexture(assetIdOrName, tex)
          return tex
        }
      }
      if (alias && Assets.cache.has(alias)) {
        const tex = Assets.get(alias)
        if (tex instanceof Texture) {
          this.indexTexture(alias, tex)
          return tex
        }
      }
    } catch (e) {
      // Ignore
    }

    return null
  }

  // Extract a standalone cropped preview Data URL directly from the loaded Atlas texture
  public getPreviewDataUrl(assetIdOrName: string): string {
    if (!assetIdOrName) return ''

    const clean = assetIdOrName.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '')
    if (this.previewCache.has(clean)) {
      return this.previewCache.get(clean)!
    }

    const tex = this.getTexture(assetIdOrName)
    if (!tex || !tex.source) return ''

    const res = (tex.source as any)?.resource || (tex.source as any)?.source || (tex.source as any)?._source || (tex.source as any)
    if (!res) return ''

    try {
      const frame = tex.frame
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, frame.width)
      canvas.height = Math.max(1, frame.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return ''

      ctx.drawImage(
        res,
        frame.x, frame.y, frame.width, frame.height,
        0, 0, frame.width, frame.height
      )

      const dataUrl = canvas.toDataURL('image/png')
      this.previewCache.set(clean, dataUrl)
      this.previewCache.set(assetIdOrName, dataUrl)
      return dataUrl
    } catch (e) {
      return ''
    }
  }

  // Fast Multi-Model Character Frame Texture Lookup
  public getCharacterTexture(
    direction: number | string,
    action: string = 'Idle',
    frame: number | string = 0,
    model: string = 'male'
  ): Texture | null {
    const modelStr = String(model || 'male').toLowerCase()
    const prefix = modelStr.charAt(0).toUpperCase() + modelStr.slice(1)
    const actionPrefix = action || 'Idle'
    const frameIndex = actionPrefix === 'Idle' ? '0' : frame

    // 1. Direct match: e.g. Female_2_Run0 or Female_2_Run_Sword0
    const key = `${prefix}_${direction}_${actionPrefix}${frameIndex}`
    let tex = this.textureMap.get(key)
    if (tex) return tex

    // 2. Action alias matching from manifest
    const modelInfo = (characterManifest as any)?.[modelStr]
    if (modelInfo && modelInfo.actions) {
      const actions = Object.values(modelInfo.actions) as any[]
      let matchedAct: any = null
      const actLower = actionPrefix.toLowerCase()
      if (actLower.includes('run') || actLower.includes('walk') || actLower.includes('move')) {
        matchedAct = actions.find((a) => /run|walk|sprint|move/i.test(a.id))
      } else if (actLower.includes('idle') || actLower.includes('stand') || actLower.includes('wait')) {
        matchedAct = actions.find((a) => /idle|stand|wait/i.test(a.id))
      } else if (actLower.includes('pickup') || actLower.includes('die') || actLower.includes('hit')) {
        matchedAct = actions.find((a) => /pickup|die|death|hit|collapse/i.test(a.id))
      }

      if (matchedAct && matchedAct.id !== actionPrefix) {
        tex = this.textureMap.get(`${prefix}_${direction}_${matchedAct.id}${frameIndex}`)
        if (tex) return tex
        tex = this.textureMap.get(`${prefix}_${direction}_${matchedAct.id}0`)
        if (tex) return tex
      }

      // First action in model manifest fallback
      if (!tex && actions.length > 0) {
        const firstAct = actions[0]
        tex = this.textureMap.get(`${prefix}_${direction}_${firstAct.id}${frameIndex}`) ||
              this.textureMap.get(`${prefix}_${direction}_${firstAct.id}0`)
        if (tex) return tex
      }
    }

    // 3. Fallbacks for this model:
    tex = this.textureMap.get(`${prefix}_${direction}_Run${frameIndex}`) ||
          this.textureMap.get(`${prefix}_${direction}_Run0`) ||
          this.textureMap.get(`${prefix}_${direction}_Idle${frameIndex}`) ||
          this.textureMap.get(`${prefix}_${direction}_Idle0`) ||
          this.textureMap.get(`${prefix}_2_Idle0`) ||
          this.textureMap.get(`${prefix}_0_Idle0`)
    if (tex) return tex

    // 4. Global Fallbacks
    tex = this.textureMap.get(`Male_${direction}_${actionPrefix}${frameIndex}`) ||
          this.textureMap.get(`Male_${direction}_Idle0`) ||
          this.textureMap.get('Male_2_Idle0')

    return tex || null
  }

  // Fast Character Frame Data URL for 2D Canvas Previews
  public getCharacterPreviewDataUrl(
    model: string = 'male',
    direction: number | string = 2,
    action: string = 'Idle',
    frame: number | string = 0
  ): string {
    const modelStr = String(model || 'male')
    const prefix = modelStr.charAt(0).toUpperCase() + modelStr.slice(1)
    const actionPrefix = action || 'Idle'
    const frameIndex = actionPrefix === 'Idle' ? '0' : frame
    const key = `${prefix}_${direction}_${actionPrefix}${frameIndex}`

    const cached = this.previewCache.get(key)
    if (cached) return cached

    return this.getPreviewDataUrl(key) || this.getPreviewDataUrl(`${prefix}_${direction}_Idle0`) || this.getPreviewDataUrl(`${prefix}_2_Idle0`)
  }

  // Extract full untrimmed/stabilized positioned character frame for non-jumping preview
  public getCharacterStabilizedPreview(
    model: string = 'male',
    direction: number | string = 2,
    action: string = 'Idle',
    frame: number | string = 0
  ): { dataUrl: string; width: number; height: number; anchorX: number; anchorY: number } | null {
    const modelStr = String(model || 'male')
    const prefix = modelStr.charAt(0).toUpperCase() + modelStr.slice(1)
    const actionPrefix = action || 'Idle'
    const frameIndex = actionPrefix === 'Idle' ? '0' : frame
    const key = `${prefix}_${direction}_${actionPrefix}${frameIndex}`
    const fullKey = `stabilized_${key}`

    const modelInfo = (characterManifest as any)?.[modelStr.toLowerCase()]
    const defaultAnchorX = modelInfo?.anchorX ?? 0.5
    const defaultAnchorY = modelInfo?.anchorY ?? (modelStr.toLowerCase() === 'male' ? 0.898 : 0.67)
    const origW = modelInfo?.cellWidth ?? 256
    const origH = modelInfo?.cellHeight ?? (modelStr.toLowerCase() === 'male' ? 512 : 256)

    const cached = this.previewCache.get(fullKey)
    if (cached) {
      return { dataUrl: cached, width: origW, height: origH, anchorX: defaultAnchorX, anchorY: defaultAnchorY }
    }

    const tex = this.getCharacterTexture(direction, action, frame, model)
    if (!tex || !tex.source) return null

    const res = (tex.source as any)?.resource || (tex.source as any)?.source || (tex.source as any)?._source || (tex.source as any)
    if (!res) return null

    try {
      const frameRect = tex.frame
      const orig = (tex as any).orig || { width: origW, height: origH }
      const trim = (tex as any).trim || { x: 0, y: 0, width: frameRect.width, height: frameRect.height }

      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, orig.width)
      canvas.height = Math.max(1, orig.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      ctx.drawImage(
        res,
        frameRect.x, frameRect.y, frameRect.width, frameRect.height,
        trim.x, trim.y, frameRect.width, frameRect.height
      )

      const dataUrl = canvas.toDataURL('image/png')
      this.previewCache.set(fullKey, dataUrl)
      return { dataUrl, width: orig.width, height: orig.height, anchorX: defaultAnchorX, anchorY: defaultAnchorY }
    } catch (e) {
      return null
    }
  }

  public isBundleLoaded(bundleName: AssetBundleName): boolean {
    return this.loadedBundles.has(bundleName)
  }

  public getDiagnostics(): BundleDiagnostics[] {
    return Array.from(this.bundleDiagnostics.values())
  }
}

export const assetManager = AssetManagerService.instance
