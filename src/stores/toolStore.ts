import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ToolType, GridCoord, Point2D, PlacementMode, SelectedElementRef, BoxClearModalData } from '../types/map'

export const useToolStore = defineStore('toolStore', () => {
  const activeTool = ref<ToolType>('brush')
  const lastDrawingTool = ref<ToolType>('brush')
  const hoveredCell = ref<GridCoord | null>(null)
  const isMouseDown = ref<boolean>(false)
  const dragStartCell = ref<GridCoord | null>(null)
  const previewCells = ref<GridCoord[]>([])

  // Selected element(s) on canvas
  const selectedElement = ref<SelectedElementRef | null>(null)
  const selectedElements = ref<SelectedElementRef[]>([])
  const isMovingElement = ref<boolean>(false)

  // Placement Conflict prompt (when placing on existing occupied cell)
  const placementConflict = ref<{ col: number; row: number; assetId: string } | null>(null)
  const placementMode = ref<PlacementMode>('ask') // 'ask' | 'stack' | 'replace'

  // Viewport camera
  const zoom = ref<number>(1.0)
  const pan = ref<Point2D>({ x: 0, y: 0 })

  // UI Modals & Panels
  const isExportModalOpen = ref<boolean>(false)
  const isShortcutsModalOpen = ref<boolean>(false)
  const isGameConfigModalOpen = ref<boolean>(false)
  const isFillGroundModalOpen = ref<boolean>(false)
  const fillModalTargetLayerId = ref<string | null>(null)
  const isBoxClearModalOpen = ref<boolean>(false)
  const boxClearData = ref<BoxClearModalData | null>(null)
  const gameConfigActiveTab = ref<'towers' | 'waves' | 'balance' | 'spawns'>('towers')

  function openGameConfig(tab?: 'towers' | 'waves' | 'balance' | 'spawns') {
    if (tab) gameConfigActiveTab.value = tab
    isGameConfigModalOpen.value = true
  }

  function closeGameConfig() {
    isGameConfigModalOpen.value = false
  }

  function openFillGroundModal(layerId?: string) {
    fillModalTargetLayerId.value = layerId || null
    isFillGroundModalOpen.value = true
  }

  function closeFillGroundModal() {
    isFillGroundModalOpen.value = false
    fillModalTargetLayerId.value = null
  }

  function openBoxClearModal(data: BoxClearModalData) {
    boxClearData.value = data
    isBoxClearModalOpen.value = true
  }

  function closeBoxClearModal() {
    isBoxClearModalOpen.value = false
    boxClearData.value = null
  }

  // Editor Display Settings
  const showGrid = ref<boolean>(true)
  const showCoordinates = ref<boolean>(false)
  const showCenterMarker = ref<boolean>(true)
  const showSymmetryAxes = ref<boolean>(true)
  const gridOpacity = ref<number>(0.35)
  const snapToGrid = ref<boolean>(true)

  const DRAWING_TOOLS: ToolType[] = ['brush', 'bucket', 'line', 'box-fill']

  function setTool(tool: ToolType) {
    activeTool.value = tool
    if (DRAWING_TOOLS.includes(tool)) {
      lastDrawingTool.value = tool
    }
    previewCells.value = []
    dragStartCell.value = null
    if (tool !== 'select') {
      isMovingElement.value = false
    }
  }

  function setHoveredCell(cell: GridCoord | null) {
    hoveredCell.value = cell
  }

  function setSelectedElement(elem: SelectedElementRef | null) {
    selectedElement.value = elem
    selectedElements.value = elem ? [elem] : []
  }

  function setSelectedElements(elems: SelectedElementRef[]) {
    selectedElements.value = [...elems]
    selectedElement.value = elems.length > 0 ? elems[0] : null
  }

  function toggleSelectedElement(elem: SelectedElementRef) {
    const idx = selectedElements.value.findIndex(e => e.itemId === elem.itemId && e.layerId === elem.layerId)
    if (idx !== -1) {
      selectedElements.value.splice(idx, 1)
      selectedElement.value = selectedElements.value.length > 0 ? selectedElements.value[0] : null
    } else {
      selectedElements.value.push(elem)
      if (!selectedElement.value) {
        selectedElement.value = elem
      }
    }
  }

  function addSelectedElements(elems: SelectedElementRef[]) {
    const existingIds = new Set(selectedElements.value.map(e => `${e.layerId}:${e.itemId}`))
    for (const elem of elems) {
      const key = `${elem.layerId}:${elem.itemId}`
      if (!existingIds.has(key)) {
        selectedElements.value.push(elem)
        existingIds.add(key)
      }
    }
    if (selectedElements.value.length > 0 && !selectedElement.value) {
      selectedElement.value = selectedElements.value[0]
    }
  }

  function clearSelection() {
    selectedElement.value = null
    selectedElements.value = []
    isMovingElement.value = false
  }

  function isElementSelected(itemId: string, layerId?: string): boolean {
    return selectedElements.value.some(e => e.itemId === itemId && (!layerId || e.layerId === layerId))
  }

  function setZoom(newZoom: number) {
    zoom.value = Math.max(0.15, Math.min(4.0, Number(newZoom.toFixed(2))))
  }

  function zoomIn() {
    setZoom(zoom.value * 1.2)
  }

  function zoomOut() {
    setZoom(zoom.value / 1.2)
  }

  function resetZoom() {
    zoom.value = 1.0
  }

  return {
    activeTool,
    lastDrawingTool,
    hoveredCell,
    isMouseDown,
    dragStartCell,
    previewCells,
    selectedElement,
    selectedElements,
    isMovingElement,
    placementConflict,
    placementMode,
    zoom,
    pan,
    isExportModalOpen,
    isShortcutsModalOpen,
    isGameConfigModalOpen,
    isFillGroundModalOpen,
    fillModalTargetLayerId,
    openFillGroundModal,
    closeFillGroundModal,
    isBoxClearModalOpen,
    boxClearData,
    openBoxClearModal,
    closeBoxClearModal,
    gameConfigActiveTab,
    openGameConfig,
    closeGameConfig,
    showGrid,
    showCoordinates,
    showCenterMarker,
    showSymmetryAxes,
    gridOpacity,
    snapToGrid,
    setTool,
    setHoveredCell,
    setSelectedElement,
    setSelectedElements,
    toggleSelectedElement,
    addSelectedElements,
    clearSelection,
    isElementSelected,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  }
})
