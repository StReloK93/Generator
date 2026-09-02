import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AssetItem } from '../types/map'
import { useToolStore } from './toolStore'

export const useAssetStore = defineStore('assetStore', () => {
  const assets = ref<AssetItem[]>([])
  const selectedAssetId = ref<string | null>(null)
  const selectedCategory = ref<string>('All')
  const searchQuery = ref<string>('')
  const isLoading = ref<boolean>(false)
  const uploadProgress = ref<{ total: number; current: number; active: boolean }>({
    total: 0,
    current: 0,
    active: false,
  })

  const isLoaded = ref(false)
  let loadPromise: Promise<void> | null = null

  // Automatically load all sprites from src/assets/sprites/*.png through analyzeImage pipeline
  async function loadBuiltinSprites() {
    if (loadPromise) return loadPromise
    loadPromise = (async () => {
      try {
        const spriteModules = import.meta.glob<string>('../assets/sprites/*.png', { eager: true, import: 'default' })
        const entries = Object.entries(spriteModules)
        const loadedList: AssetItem[] = []

        for (const [path, url] of entries) {
          const filename = path.split('/').pop() || ''
          const baseName = filename.replace(/\.[^/.]+$/, '')
          
          let category = 'Boshqa'
          const lower = baseName.toLowerCase()

          if (lower.startsWith('dirt') || lower.startsWith('planks') || (lower.startsWith('stone') && !lower.includes('wall') && !lower.includes('column'))) {
            category = 'Yer (Ground)'
          } else if (lower.includes('wall') || lower.includes('gate') || lower.includes('door') || lower.includes('archway')) {
            category = 'Devorlar (Walls)'
          } else if (lower.includes('stairs') || lower.includes('bridge')) {
            category = "Zinalar & Ko'priklar (Stairs)"
          } else if (lower.includes('column') || lower.includes('support')) {
            category = 'Ustunlar (Supports & Columns)'
          } else if (lower.includes('barrel') || lower.includes('chest') || lower.includes('chair') || lower.includes('table') || lower.includes('crate') || lower.includes('pile')) {
            category = 'Obyektlar & Mebel (Props)'
          }

          // Format name: stoneWallAgedLeft_E -> Stone Wall Aged Left (E)
          let formattedName = baseName
            .replace(/_([A-Z])$/, ' ($1)')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
          formattedName = formattedName.charAt(0).toUpperCase() + formattedName.slice(1)

          const analysis = await analyzeImage(url)

          loadedList.push({
            id: `sprite-${baseName}`,
            name: formattedName,
            src: url,
            previewSrc: analysis.previewSrc,
            category,
            width: analysis.width,
            height: analysis.height,
            anchorX: analysis.anchorX,
            anchorY: analysis.anchorY,
            contentBounds: analysis.bounds,
            spanX: 1,
            spanY: 1,
            scale: 1.0,
            isSample: true,
            fileRelativePath: filename,
          })
        }

        // Sort nicely by category then name
        loadedList.sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category)
          return a.name.localeCompare(b.name)
        })

        assets.value = loadedList
        isLoaded.value = true
        // Leave selectedAssetId as null until user explicitly selects an asset
      } catch (e) {
        console.warn('Failed to load builtin sprites:', e)
        isLoaded.value = true
      }
    })()
    return loadPromise
  }

  // Load automatically on store creation
  loadBuiltinSprites()

  const selectedAsset = computed(() => {
    return assets.value.find(a => a.id === selectedAssetId.value) || null
  })

  const categories = computed(() => {
    const set = new Set<string>(['All'])
    for (const a of assets.value) {
      if (a.category) set.add(a.category)
    }
    return Array.from(set)
  })

  const filteredAssets = computed(() => {
    return assets.value.filter(a => {
      const matchCat = selectedCategory.value === 'All' || a.category === selectedCategory.value
      const matchSearch = searchQuery.value.trim() === '' || 
        a.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.value.toLowerCase())
      return matchCat && matchSearch
    })
  })

  // Upload user files / folder: automatically analyzes content bounding box & centers preview in gallery
  async function uploadFiles(files: FileList | File[]): Promise<number> {
    const fileArray = Array.from(files).filter(file => {
      const type = file.type.toLowerCase()
      const name = file.name.toLowerCase()
      return type.startsWith('image/') || 
             name.endsWith('.png') || 
             name.endsWith('.jpg') || 
             name.endsWith('.jpeg') || 
             name.endsWith('.webp') || 
             name.endsWith('.svg')
    })

    if (fileArray.length === 0) return 0

    isLoading.value = true
    uploadProgress.value = { total: fileArray.length, current: 0, active: true }

    let addedCount = 0

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i]
      try {
        const dataUrl = await readFileAsDataUrl(file)
        const analysis = await analyzeImage(dataUrl)
        
        let category = 'Yuklanganlar'
        const relativePath = (file as any).webkitRelativePath || file.name
        if (relativePath.includes('/')) {
          const parts = relativePath.split('/')
          if (parts.length > 1) {
            category = parts[parts.length - 2]
            category = category.charAt(0).toUpperCase() + category.slice(1)
          }
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')

        const newAsset: AssetItem = {
          id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: cleanName,
          src: dataUrl,
          previewSrc: analysis.previewSrc,
          category,
          width: analysis.width,
          height: analysis.height,
          anchorX: analysis.anchorX,
          anchorY: analysis.anchorY,
          contentBounds: analysis.bounds,
          spanX: 1,
          spanY: 1,
          scale: 1.0,
          isSample: false,
          fileRelativePath: relativePath,
        }

        assets.value.push(newAsset)
        addedCount++

        if (!selectedAssetId.value) {
          selectedAssetId.value = newAsset.id
        }
      } catch (err) {
        console.error('Failed to load asset file:', file.name, err)
      } finally {
        uploadProgress.value.current = i + 1
      }
    }

    uploadProgress.value.active = false
    isLoading.value = false

    return addedCount
  }

  function selectAsset(id: string | null) {
    selectedAssetId.value = id
    if (id) {
      const toolStore = useToolStore()
      toolStore.setTool('brush')
    }
  }

  function updateAssetProperties(id: string, updates: Partial<AssetItem>) {
    const index = assets.value.findIndex(a => a.id === id)
    if (index !== -1) {
      assets.value[index] = { ...assets.value[index], ...updates }
    }
  }

  function updateAssetAnchor(id: string, anchorX: number, anchorY: number) {
    updateAssetProperties(id, { anchorX, anchorY })
  }

  function deleteAsset(id: string) {
    assets.value = assets.value.filter(a => a.id !== id)
    if (selectedAssetId.value === id) {
      selectedAssetId.value = null
    }
  }

  function clearAllAssets() {
    assets.value = []
    selectedAssetId.value = null
  }

  function clearCustomAssets() {
    clearAllAssets()
  }

  function reconcileImportedAssets(importedAssets: AssetItem[]): AssetItem[] {
    if (!importedAssets || importedAssets.length === 0) return assets.value

    if (assets.value.length === 0) {
      loadBuiltinSprites()
    }

    const mapById = new Map<string, AssetItem>()
    const mapByName = new Map<string, AssetItem>()
    const mapByFile = new Map<string, AssetItem>()

    for (const a of assets.value) {
      if (a.src) {
        mapById.set(a.id, a)
        mapByName.set(a.name.toLowerCase(), a)
        if (a.fileRelativePath) {
          mapByFile.set(a.fileRelativePath.toLowerCase(), a)
          const baseNoExt = a.fileRelativePath.replace(/\.[^/.]+$/, '').toLowerCase()
          mapByFile.set(baseNoExt, a)
        }
        const cleanId = a.id.replace(/^sprite-/, '').toLowerCase()
        mapById.set(cleanId, a)
      }
    }

    const mergedList: AssetItem[] = [...assets.value]

    for (const imp of importedAssets) {
      const impCleanId = imp.id.replace(/^sprite-/, '').toLowerCase()
      const impBaseFile = imp.fileRelativePath ? imp.fileRelativePath.replace(/\.[^/.]+$/, '').toLowerCase() : ''
      const impSrcFileName = (imp.src && typeof imp.src === 'string') ? imp.src.split('/').pop()?.toLowerCase() || '' : ''
      const impSrcBase = impSrcFileName ? impSrcFileName.replace(/\.[^/.]+$/, '').toLowerCase() : ''

      const match = mapById.get(imp.id) ||
                    mapById.get(impCleanId) ||
                    (imp.fileRelativePath ? mapByFile.get(imp.fileRelativePath.toLowerCase()) : null) ||
                    (impBaseFile ? mapByFile.get(impBaseFile) : null) ||
                    (impSrcFileName ? mapByFile.get(impSrcFileName) : null) ||
                    (impSrcBase ? mapByFile.get(impSrcBase) : null) ||
                    (imp.name ? mapByName.get(imp.name.toLowerCase()) : null)

      if (match && match.src) {
        // Built-in asset matched: attach valid src, previewSrc and dimensions
        imp.src = match.src
        imp.previewSrc = match.previewSrc || match.src
        imp.width = match.width
        imp.height = match.height
        imp.anchorX = match.anchorX
        imp.anchorY = match.anchorY
        imp.contentBounds = match.contentBounds
        imp.fileRelativePath = match.fileRelativePath || imp.fileRelativePath

        // Ensure this item is in mergedList
        const existingIdx = mergedList.findIndex(a => a.id === imp.id || a.id === match.id)
        if (existingIdx === -1) {
          mergedList.push({ ...match, id: imp.id })
        }
      } else if (imp.src && imp.src.startsWith('data:')) {
        // Custom asset with embedded data URL
        const existingIdx = mergedList.findIndex(a => a.id === imp.id)
        if (existingIdx !== -1) {
          mergedList[existingIdx] = { ...mergedList[existingIdx], ...imp }
        } else {
          mergedList.push(imp)
        }
      }
    }

    assets.value = mergedList
    return mergedList
  }

  return {
    assets,
    selectedAssetId,
    selectedAsset,
    selectedCategory,
    categories,
    searchQuery,
    filteredAssets,
    isLoading,
    isLoaded,
    uploadProgress,
    loadBuiltinSprites,
    uploadFiles,
    selectAsset,
    updateAssetProperties,
    updateAssetAnchor,
    deleteAsset,
    clearAllAssets,
    clearCustomAssets,
    reconcileImportedAssets,
  }
})

// Helper to read file as Data URL
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Alpha Bounding Box Analyzer & Centered Preview Generator
function analyzeImage(src: string): Promise<{
  width: number
  height: number
  anchorX: number
  anchorY: number
  previewSrc: string
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height

      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })

        if (!ctx) {
          resolve({
            width,
            height,
            anchorX: 0.5,
            anchorY: height > width * 0.8 ? 0.88 : 0.5,
            previewSrc: src,
            bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
          })
          return
        }

        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, width, height)
        const data = imgData.data

        let minX = width
        let minY = height
        let maxX = 0
        let maxY = 0
        let hasVisiblePixels = false

        // Scan non-transparent pixel boundaries
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3]
            if (alpha > 15) {
              hasVisiblePixels = true
              if (x < minX) minX = x
              if (x > maxX) maxX = x
              if (y < minY) minY = y
              if (y > maxY) maxY = y
            }
          }
        }

        if (!hasVisiblePixels) {
          minX = 0
          minY = 0
          maxX = width - 1
          maxY = height - 1
        }

        const contentWidth = Math.max(1, maxX - minX + 1)
        const contentHeight = Math.max(1, maxY - minY + 1)

        // Generate a crisp, centered square thumbnail of the visible content for the gallery
        const previewCanvas = document.createElement('canvas')
        const previewSize = 256
        previewCanvas.width = previewSize
        previewCanvas.height = previewSize
        const pCtx = previewCanvas.getContext('2d')!

        const padding = 16
        const maxContentDim = Math.max(contentWidth, contentHeight)
        const scale = (previewSize - padding * 2) / maxContentDim
        const drawW = contentWidth * scale
        const drawH = contentHeight * scale
        const drawX = (previewSize - drawW) / 2
        const drawY = (previewSize - drawH) / 2

        pCtx.imageSmoothingEnabled = true
        pCtx.imageSmoothingQuality = 'high'
        pCtx.drawImage(
          img,
          minX, minY, contentWidth, contentHeight,
          drawX, drawY, drawW, drawH
        )

        const previewSrc = previewCanvas.toDataURL('image/png')

        // Smart placement anchor: if image has empty space at bottom (maxY < height * 0.4), use maxY / height
        // Otherwise standard 0.88 for tall props, 0.5 for square tiles
        const standardAnchorY = maxY < height * 0.4 
          ? Number((maxY / height).toFixed(4)) 
          : (height > width * 0.8 ? 0.88 : 0.5)

        resolve({
          width,
          height,
          anchorX: 0.5,
          anchorY: standardAnchorY,
          previewSrc,
          bounds: { minX, minY, maxX, maxY }
        })
      } catch (e) {
        console.warn('Canvas pixel analysis fallback:', e)
        resolve({
          width,
          height,
          anchorX: 0.5,
          anchorY: height > width * 0.8 ? 0.88 : 0.5,
          previewSrc: src,
          bounds: { minX: 0, minY: 0, maxX: width, maxY: height }
        })
      }
    }

    img.onerror = () => {
      resolve({
        width: 128,
        height: 128,
        anchorX: 0.5,
        anchorY: 0.5,
        previewSrc: src,
        bounds: { minX: 0, minY: 0, maxX: 128, maxY: 128 }
      })
    }

    img.src = src
  })
}
