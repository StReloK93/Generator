import { Assets, Texture, Spritesheet } from 'pixi.js'
import { ref } from 'vue'
import { AssetItem } from '../types/map'
import spriteManifestRaw from '../assets/generated/spriteManifest.json'
import atlasIndexRaw from '../assets/generated/atlasIndex.json'

export type AssetBundleName = 'core' | 'editor' | 'game'

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
        bundleAssets[sheet] = `${base}assets/atlases/${sheet}.json`
      }
      Assets.addBundle(bundleName, bundleAssets)
    }
  }

  // Load a specific bundle with in-flight deduplication and progress callback
  public async loadBundle(
    bundleName: AssetBundleName,
    onProgress?: (progress: number) => void
  ): Promise<void> {
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

  // Route: Load Editor (Core + Editor)
  public async loadEditor(onProgress?: (progress: number) => void): Promise<void> {
    await this.loadCore((p) => onProgress?.(p * 0.4))
    await this.loadBundle('editor', (p) => onProgress?.(0.4 + p * 0.6))
  }

  // Route: Load Game (Core + Game)
  public async loadGame(onProgress?: (progress: number) => void): Promise<void> {
    await this.loadCore((p) => onProgress?.(p * 0.3))
    await this.loadBundle('game', (p) => onProgress?.(0.3 + p * 0.7))
  }

  // Background Preloader (Idle callback)
  public preloadRemainingInBackground(): void {
    const runPreload = async () => {
      try {
        if (!this.loadedBundles.has('core')) await this.loadBundle('core')
        if (!this.loadedBundles.has('game')) await this.loadBundle('game')
        if (!this.loadedBundles.has('editor')) await this.loadBundle('editor')
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

    // Try Pixi Assets cache directly as fallback
    try {
      if (Assets.cache.has(assetIdOrName)) {
        const tex = Assets.get(assetIdOrName)
        if (tex instanceof Texture) {
          this.indexTexture(assetIdOrName, tex)
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

  // Fast Character Frame Texture Lookup
  public getCharacterTexture(
    direction: number | string,
    action: string = 'Idle',
    frame: number | string = 0
  ): Texture | null {
    const actionPrefix = action || 'Idle'
    const frameIndex = actionPrefix === 'Idle' ? '0' : frame
    const key = `Male_${direction}_${actionPrefix}${frameIndex}`

    let tex = this.textureMap.get(key)
    if (tex) return tex

    // Fallbacks
    tex = this.textureMap.get(`Male_${direction}_Idle0`) ||
          this.textureMap.get('Male_2_Idle0') ||
          this.textureMap.get('Male_0_Idle0')

    return tex || null
  }

  public isBundleLoaded(bundleName: AssetBundleName): boolean {
    return this.loadedBundles.has(bundleName)
  }

  public getDiagnostics(): BundleDiagnostics[] {
    return Array.from(this.bundleDiagnostics.values())
  }
}

export const assetManager = AssetManagerService.instance
