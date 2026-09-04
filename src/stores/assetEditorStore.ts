import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAssetStore } from './assetStore'

export interface CompositePart {
  id: string
  assetId: string
  assetName: string
  src: string
  x: number // Offset X in pixels relative to center
  y: number // Offset Y in pixels relative to center
  scaleX: number // 1 or -1 for flip, or custom scale
  scaleY: number
  rotation: number // Degrees (0, 90, 180, 270 or fine)
  opacity: number // 0 to 1
  visible: boolean
  locked: boolean
  zIndex: number
}

export const useAssetEditorStore = defineStore('assetEditor', () => {
  const assetStore = useAssetStore()

  // State
  const assetName = ref('Custom_Tower_Piece')
  const parts = ref<CompositePart[]>([])
  const selectedPartIds = ref<string[]>([])
  const clipboard = ref<CompositePart[]>([])
  
  // Canvas settings
  const canvasWidth = ref(512)
  const canvasHeight = ref(512)
  const zoom = ref(1.0)
  const panX = ref(0)
  const panY = ref(0)
  const showGridGuide = ref(true)
  const showCenterOrigin = ref(true)
  const nudgeStep = ref<number>(1) // 1px, 5px, 10px, 32px
  
  // History for Undo / Redo
  const history = ref<string[]>([])
  const historyIndex = ref(-1)

  function recordHistory() {
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }
    history.value.push(JSON.stringify(parts.value))
    if (history.value.length > 30) {
      history.value.shift()
    } else {
      historyIndex.value++
    }
  }

  function undo() {
    if (historyIndex.value > 0) {
      historyIndex.value--
      parts.value = JSON.parse(history.value[historyIndex.value])
      // Filter out selected IDs that no longer exist
      selectedPartIds.value = selectedPartIds.value.filter(id => parts.value.some(p => p.id === id))
    }
  }

  function redo() {
    if (historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      parts.value = JSON.parse(history.value[historyIndex.value])
      selectedPartIds.value = selectedPartIds.value.filter(id => parts.value.some(p => p.id === id))
    }
  }

  // Computed
  const selectedPart = computed(() => {
    if (selectedPartIds.value.length === 0) return null
    return parts.value.find(p => p.id === selectedPartIds.value[0]) || null
  })

  const selectedParts = computed(() => {
    return parts.value.filter(p => selectedPartIds.value.includes(p.id))
  })

  const isSelected = (partId: string) => {
    return selectedPartIds.value.includes(partId)
  }

  // Sorted parts for rendering according to Z-Index
  const sortedParts = computed(() => {
    return [...parts.value].sort((a, b) => a.zIndex - b.zIndex)
  })

  // Selection actions
  function selectPart(partId: string | null, isMulti = false) {
    if (!partId) {
      selectedPartIds.value = []
      return
    }

    if (isMulti) {
      // Toggle selection in multi-select mode
      const idx = selectedPartIds.value.indexOf(partId)
      if (idx !== -1) {
        selectedPartIds.value.splice(idx, 1)
      } else {
        selectedPartIds.value.push(partId)
      }
    } else {
      // Single selection
      selectedPartIds.value = [partId]
    }
  }

  function selectAll() {
    selectedPartIds.value = parts.value.map(p => p.id)
  }

  // Add piece to canvas
  function addPartFromAsset(asset: { id: string; name: string; src?: string; previewSrc?: string }) {
    const nextZ = parts.value.length > 0 
      ? Math.max(...parts.value.map(p => p.zIndex)) + 1 
      : 1

    const preview = assetStore.getAssetPreview(asset.id || asset.name)
    const src = asset.src || asset.previewSrc || preview || ''

    const newPart: CompositePart = {
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      assetId: asset.id,
      assetName: asset.name,
      src,
      x: 0,
      y: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      rotation: 0,
      opacity: 1.0,
      visible: true,
      locked: false,
      zIndex: nextZ,
    }

    parts.value.push(newPart)
    selectedPartIds.value = [newPart.id]
    recordHistory()
  }

  function removePart(partId: string) {
    const idx = parts.value.findIndex(p => p.id === partId)
    if (idx !== -1) {
      parts.value.splice(idx, 1)
      selectedPartIds.value = selectedPartIds.value.filter(id => id !== partId)
      if (selectedPartIds.value.length === 0 && parts.value.length > 0) {
        selectedPartIds.value = [parts.value[parts.value.length - 1].id]
      }
      recordHistory()
    }
  }

  function deleteSelected() {
    if (selectedPartIds.value.length === 0) return
    parts.value = parts.value.filter(p => !selectedPartIds.value.includes(p.id))
    selectedPartIds.value = []
    recordHistory()
  }

  // Multi Copy & Paste
  function copySelection() {
    if (selectedParts.value.length === 0) return
    clipboard.value = JSON.parse(JSON.stringify(selectedParts.value))
  }

  function pasteSelection() {
    if (clipboard.value.length === 0) return

    let nextZ = parts.value.length > 0 
      ? Math.max(...parts.value.map(p => p.zIndex)) + 1 
      : 1

    const newPastedIds: string[] = []

    for (const item of clipboard.value) {
      const copy: CompositePart = {
        ...JSON.parse(JSON.stringify(item)),
        id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        x: item.x + 16,
        y: item.y + 16,
        zIndex: nextZ++,
      }
      parts.value.push(copy)
      newPastedIds.push(copy.id)
    }

    // Update clipboard so subsequent pastes cascade
    clipboard.value = clipboard.value.map(item => ({
      ...item,
      x: item.x + 16,
      y: item.y + 16,
    }))

    selectedPartIds.value = newPastedIds
    recordHistory()
  }

  function duplicateSelected() {
    copySelection()
    pasteSelection()
  }

  function duplicatePart(partId: string) {
    const target = parts.value.find(p => p.id === partId)
    if (!target) return

    const nextZ = Math.max(...parts.value.map(p => p.zIndex)) + 1
    const copy: CompositePart = {
      ...JSON.parse(JSON.stringify(target)),
      id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: target.x + 12,
      y: target.y + 12,
      zIndex: nextZ,
    }

    parts.value.push(copy)
    selectedPartIds.value = [copy.id]
    recordHistory()
  }

  // Multi Nudge
  function nudgeSelected(dx: number, dy: number) {
    if (selectedParts.value.length === 0) return

    for (const part of selectedParts.value) {
      if (part.locked) continue
      part.x += dx * nudgeStep.value
      part.y += dy * nudgeStep.value
    }
    recordHistory()
  }

  function moveSelectedPartsBy(deltaX: number, deltaY: number, startPositions: Map<string, { x: number; y: number }>) {
    for (const part of selectedParts.value) {
      if (part.locked) continue
      const start = startPositions.get(part.id)
      if (start) {
        part.x = Math.round(start.x + deltaX)
        part.y = Math.round(start.y + deltaY)
      }
    }
  }

  function setScaleForSelectedParts(
    ratio: number,
    initialScales: Map<string, { scaleX: number; scaleY: number }>,
    step = 0.05
  ) {
    for (const part of selectedParts.value) {
      if (part.locked) continue
      const initial = initialScales.get(part.id)
      if (initial) {
        const signX = Math.sign(initial.scaleX) || 1
        const signY = Math.sign(initial.scaleY) || 1
        const rawMagX = Math.abs(initial.scaleX) * ratio
        const rawMagY = Math.abs(initial.scaleY) * ratio

        let snappedMagX = Math.round(rawMagX / step) * step
        let snappedMagY = Math.round(rawMagY / step) * step

        snappedMagX = Math.max(0.1, Math.min(5.0, snappedMagX))
        snappedMagY = Math.max(0.1, Math.min(5.0, snappedMagY))

        part.scaleX = Number((signX * snappedMagX).toFixed(2))
        part.scaleY = Number((signY * snappedMagY).toFixed(2))
      }
    }
  }

  function setPartPosition(partId: string, x: number, y: number) {
    const p = parts.value.find(item => item.id === partId)
    if (p && !p.locked) {
      p.x = Math.round(x)
      p.y = Math.round(y)
    }
  }

  function updatePartProperties(partId: string, updates: Partial<CompositePart>) {
    const p = parts.value.find(item => item.id === partId)
    if (p) {
      Object.assign(p, updates)
      recordHistory()
    }
  }

  function updateAllSelectedProperties(updates: Partial<CompositePart>) {
    for (const part of selectedParts.value) {
      Object.assign(part, updates)
    }
    recordHistory()
  }

  // Z-Index ordering actions
  function bringToFront(partId?: string) {
    const targetIds = partId ? [partId] : selectedPartIds.value
    if (targetIds.length === 0) return

    let maxZ = Math.max(...parts.value.map(p => p.zIndex))
    for (const id of targetIds) {
      const target = parts.value.find(p => p.id === id)
      if (target) {
        target.zIndex = ++maxZ
      }
    }
    normalizeZIndices()
    recordHistory()
  }

  function sendToBack(partId?: string) {
    const targetIds = partId ? [partId] : selectedPartIds.value
    if (targetIds.length === 0) return

    let minZ = Math.min(...parts.value.map(p => p.zIndex))
    for (const id of targetIds) {
      const target = parts.value.find(p => p.id === id)
      if (target) {
        target.zIndex = --minZ
      }
    }
    normalizeZIndices()
    recordHistory()
  }

  function moveUp(partId?: string) {
    const targetIds = partId ? [partId] : selectedPartIds.value
    if (targetIds.length === 0) return

    const sorted = [...parts.value].sort((a, b) => a.zIndex - b.zIndex)
    // Iterate from top to bottom so adjacent moves work cleanly
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (targetIds.includes(sorted[i].id)) {
        const current = sorted[i]
        const next = sorted[i + 1]
        const temp = current.zIndex
        current.zIndex = next.zIndex
        next.zIndex = temp
        // Swap in sorted array
        sorted[i] = next
        sorted[i + 1] = current
      }
    }
    normalizeZIndices()
    recordHistory()
  }

  function moveDown(partId?: string) {
    const targetIds = partId ? [partId] : selectedPartIds.value
    if (targetIds.length === 0) return

    const sorted = [...parts.value].sort((a, b) => a.zIndex - b.zIndex)
    // Iterate from bottom to top
    for (let i = 1; i < sorted.length; i++) {
      if (targetIds.includes(sorted[i].id)) {
        const current = sorted[i]
        const prev = sorted[i - 1]
        const temp = current.zIndex
        current.zIndex = prev.zIndex
        prev.zIndex = temp
        // Swap in sorted array
        sorted[i] = prev
        sorted[i - 1] = current
      }
    }
    normalizeZIndices()
    recordHistory()
  }

  function normalizeZIndices() {
    const sorted = [...parts.value].sort((a, b) => a.zIndex - b.zIndex)
    sorted.forEach((p, index) => {
      p.zIndex = index + 1
    })
  }

  function clearAll() {
    parts.value = []
    selectedPartIds.value = []
    recordHistory()
  }

  function resetView() {
    zoom.value = 1.0
    panX.value = 0
    panY.value = 0
  }

  return {
    assetName,
    parts,
    selectedPartIds,
    selectedPart,
    selectedParts,
    isSelected,
    sortedParts,
    clipboard,
    canvasWidth,
    canvasHeight,
    zoom,
    panX,
    panY,
    showGridGuide,
    showCenterOrigin,
    nudgeStep,
    history,
    historyIndex,
    recordHistory,
    undo,
    redo,
    selectPart,
    selectAll,
    addPartFromAsset,
    removePart,
    deleteSelected,
    copySelection,
    pasteSelection,
    duplicateSelected,
    duplicatePart,
    nudgeSelected,
    moveSelectedPartsBy,
    setScaleForSelectedParts,
    setPartPosition,
    updatePartProperties,
    updateAllSelectedProperties,
    bringToFront,
    sendToBack,
    moveUp,
    moveDown,
    clearAll,
    resetView,
  }
})
