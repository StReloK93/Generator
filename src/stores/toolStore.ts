import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ToolType, GridCoord, Point2D, PlacementMode, SelectedElementRef } from '../types/map'

export const useToolStore = defineStore('toolStore', () => {
  const activeTool = ref<ToolType>('brush')
  const hoveredCell = ref<GridCoord | null>(null)
  const isMouseDown = ref<boolean>(false)
  const dragStartCell = ref<GridCoord | null>(null)
  const previewCells = ref<GridCoord[]>([])

  // Selected element on canvas
  const selectedElement = ref<SelectedElementRef | null>(null)
  const isMovingElement = ref<boolean>(false)

  // Placement Conflict prompt (when placing on existing occupied cell)
  const placementConflict = ref<{ col: number; row: number; assetId: string } | null>(null)
  const placementMode = ref<PlacementMode>('ask') // 'ask' | 'stack' | 'replace'

  // Viewport camera
  const zoom = ref<number>(1.0)
  const pan = ref<Point2D>({ x: 0, y: 0 })

  // UI Modals & Panels
  const isNewProjectModalOpen = ref<boolean>(false)
  const isExportModalOpen = ref<boolean>(false)
  const isShortcutsModalOpen = ref<boolean>(false)
  const isLayerPanelOpen = ref<boolean>(true)
  const isAssetManagerOpen = ref<boolean>(true)
  const isGameConfigModalOpen = ref<boolean>(false)
  const gameConfigActiveTab = ref<'towers' | 'waves' | 'placed' | 'spawns'>('towers')

  function openGameConfig(tab?: 'towers' | 'waves' | 'placed' | 'spawns') {
    if (tab) gameConfigActiveTab.value = tab
    isGameConfigModalOpen.value = true
  }

  function closeGameConfig() {
    isGameConfigModalOpen.value = false
  }

  // Editor Display Settings
  const showGrid = ref<boolean>(true)
  const showCoordinates = ref<boolean>(false)
  const showCenterMarker = ref<boolean>(true)
  const showSymmetryAxes = ref<boolean>(true)
  const gridOpacity = ref<number>(0.35)
  const snapToGrid = ref<boolean>(true)

  function setTool(tool: ToolType) {
    activeTool.value = tool
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
    hoveredCell,
    isMouseDown,
    dragStartCell,
    previewCells,
    selectedElement,
    isMovingElement,
    placementConflict,
    placementMode,
    zoom,
    pan,
    isNewProjectModalOpen,
    isExportModalOpen,
    isShortcutsModalOpen,
    isLayerPanelOpen,
    isAssetManagerOpen,
    isGameConfigModalOpen,
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
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
  }
})
