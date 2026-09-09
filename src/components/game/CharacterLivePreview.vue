<template>
  <div class="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-xl select-none flex flex-col">
    
    <!-- Top Model Selection Bar / Header -->
    <div class="flex items-center justify-between gap-2 p-2.5 bg-slate-900/90 border-b border-slate-800/80">
      <div v-if="showModelSelector" class="flex items-center gap-1.5">
        <span class="text-xs font-bold text-slate-300">Unit Model:</span>
        <UiTabs
          :model-value="currentModel"
          :items="availableModels.map(m => ({ id: m.id, label: m.name }))"
          size="xs"
          @update:model-value="(id) => selectModel(id as CharacterModel)"
        />
      </div>

      <div v-else class="flex items-center gap-2">
        <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <span class="capitalize text-purple-300">{{ currentModel }}</span>
        </span>
      </div>

      <!-- Action State Badge -->
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-purple-300 ml-auto">
        <span class="font-semibold capitalize">{{ currentAction }}</span>
        <span class="text-slate-500">({{ currentFrameIndex + 1 }}/{{ totalFramesForAction }})</span>
      </div>
    </div>

    <!-- Main Live Canvas Viewport -->
    <div ref="containerRef" class="relative w-full h-52 sm:h-56 bg-slate-950 overflow-hidden">
      <canvas ref="canvasRef" class="w-full h-full block"></canvas>

      <!-- Absolute Top-Left Asset Badge -->
      <div class="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-slate-200">
        <span class="text-[11px] font-mono font-bold truncate max-w-40 sm:max-w-48 text-purple-300 capitalize">
          {{ currentModel }}
        </span>
        <span v-if="unitScale && unitScale !== 1" class="text-[10px] font-mono text-purple-300 bg-purple-950/70 px-1 py-0.2 rounded border border-purple-800/60">
          {{ unitScale }}x
        </span>
        <span v-if="offsetY" class="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/60">
          +{{ offsetY }}px
        </span>
      </div>
    </div>

    <!-- 8 Directions Control Bar (Beneath Canvas) -->
    <div class="flex items-center justify-center flex-wrap gap-1.5 px-2 py-1.5 bg-slate-900/95 border-t border-slate-800/80">
      <UiButton
        v-for="d in directionItems"
        :key="d.dir"
        :leading-icon="d.icon"
        size="xs"
        variant="tool"
        :active="currentDirection === d.dir"
        :title="d.name"
        @click="setDirection(d.dir)"
      />
    </div>

    <!-- Bottom Dynamic Animation Action Tester Buttons -->
    <div class="flex items-center justify-center gap-1.5 p-2 bg-slate-900/90 border-t border-slate-800/80 flex-wrap">
      <UiButton
        v-for="act in currentModelActions"
        :key="act.id"
        :variant="currentAction.toLowerCase() === act.id.toLowerCase() ? 'primary' : 'secondary'"
        size="xs"
        @click="setAction(act.id)"
      >
        <span>{{ act.label }}</span>
        <span class="text-[10px] opacity-75">({{ act.frameCount }}f)</span>
      </UiButton>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  ArrowUpLeft, ArrowUp, ArrowUpRight, ArrowLeft, ArrowRight, 
  ArrowDownLeft, ArrowDown, ArrowDownRight,
  Swords, Crosshair, Wand2, User, Skull, Shield 
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiTabs } from '../ui'
import { CharacterAction, CharacterModel } from '../../stores/characterStore'
import characterManifest from '../../assets/generated/characterManifest.json'
import { assetManager } from '../../services/assetManager'

const props = withDefaults(
  defineProps<{
    modelValue?: CharacterModel
    initialAction?: CharacterAction
    showModelSelector?: boolean
    animSpeed?: number
    offsetY?: number
    unitScale?: number
  }>(),
  {
    modelValue: 'male',
    initialAction: 'Run',
    showModelSelector: true,
    animSpeed: 1.0,
    offsetY: 0,
    unitScale: 1.0,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: CharacterModel): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// 8 Directions Clockwise Definition
const directionItems = [
  { dir: 7, name: 'North (7)', icon: ArrowUp },
  { dir: 0, name: 'North-East (0)', icon: ArrowUpRight },
  { dir: 1, name: 'East (1)', icon: ArrowRight },
  { dir: 2, name: 'South-East (2)', icon: ArrowDownRight },
  { dir: 3, name: 'South (3)', icon: ArrowDown },
  { dir: 4, name: 'South-West (4)', icon: ArrowDownLeft },
  { dir: 5, name: 'West (5)', icon: ArrowLeft },
  { dir: 6, name: 'North-West (6)', icon: ArrowUpLeft },
]

// Current Selection States
const currentModel = ref<CharacterModel>(props.modelValue || 'male')
const currentAction = ref<CharacterAction>(props.initialAction || 'Run')
const currentDirection = ref<number>(2) // Default 2: South-East (Down-Right)
const currentFrameIndex = ref<number>(0)

// Dynamic Manifest Data
const availableModels = computed(() => {
  const models = Object.values(characterManifest) as Array<{
    id: string
    name: string
    cellWidth: number
    cellHeight: number
    actions: Record<string, { id: string; label: string; icon: string; frameCount: number }>
  }>
  return models.length > 0 ? models : [
    { id: 'male', name: 'Male (Peasant)', cellWidth: 256, cellHeight: 512, actions: {} },
    { id: 'warrior', name: 'Warrior (Knight)', cellWidth: 256, cellHeight: 256, actions: {} },
  ]
})

const currentModelActions = computed(() => {
  const modelInfo = (characterManifest as any)[currentModel.value]
  if (modelInfo && modelInfo.actions && Object.keys(modelInfo.actions).length > 0) {
    return Object.values(modelInfo.actions) as Array<{
      id: string
      label: string
      icon: string
      frameCount: number
    }>
  }
  if (currentModel.value === 'warrior') {
    return [
      { id: 'Idle', label: 'Idle', icon: 'Idle', frameCount: 24 },
      { id: 'Run', label: 'Run', icon: 'Run', frameCount: 24 },
    ]
  }
  return [
    { id: 'Idle', label: 'Idle', icon: 'Idle', frameCount: 4 },
    { id: 'Run', label: 'Run', icon: 'Run', frameCount: 10 },
    { id: 'Pickup', label: 'Pickup / Die', icon: 'Pickup', frameCount: 10 },
  ]
})

const totalFramesForAction = computed(() => {
  const actions = currentModelActions.value
  const found = actions.find((a) => a.id.toLowerCase() === currentAction.value.toLowerCase())
  if (found && found.frameCount > 0) {
    return found.frameCount
  }
  if (currentModel.value === 'warrior') return 24
  return currentAction.value.toLowerCase() === 'idle' ? 4 : 10
})

// Internal Animation Timing
let animationFrameId: number | null = null
let lastTimestamp = 0
let animTimer = 0

// Image Cache for 2D Canvas Drawing
const imageCache = new Map<string, { img: HTMLImageElement; width: number; height: number; anchorX: number; anchorY: number }>()
let lastRenderedEntry: { img: HTMLImageElement; width: number; height: number; anchorX: number; anchorY: number } | null = null

watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== currentModel.value) {
    selectModel(newVal)
  }
})

function selectModel(model: CharacterModel) {
  if (currentModel.value !== model) {
    lastRenderedEntry = null
  }
  currentModel.value = model
  emit('update:modelValue', model)

  // Auto-select valid action for this model
  const actions = currentModelActions.value
  const exists = actions.some((a) => a.id.toLowerCase() === currentAction.value.toLowerCase())
  if (!exists && actions.length > 0) {
    const runAct = actions.find((a) => a.id.toLowerCase() === 'run')
    currentAction.value = (runAct ? runAct.id : actions[0].id) as CharacterAction
  }

  currentFrameIndex.value = 0
  animTimer = 0
}

function setAction(action: CharacterAction) {
  currentAction.value = action
  currentFrameIndex.value = 0
  animTimer = 0
}

function setDirection(dir: number) {
  currentDirection.value = dir
}

function getStabilizedImageForFrame(model: CharacterModel, direction: number, action: CharacterAction, frame: number) {
  const modelStr = String(model || 'male').toLowerCase()
  const actionPrefix = action || 'Idle'
  const frameIdx = actionPrefix === 'Idle' ? (modelStr === 'warrior' ? 0 : frame) : frame
  const key = `${modelStr}_${direction}_${actionPrefix}${frameIdx}`

  if (imageCache.has(key)) {
    return imageCache.get(key) || null
  }

  // Generate Stabilized Data URL from AssetManager
  const data = assetManager.getCharacterStabilizedPreview(modelStr, direction, action, frameIdx)
  if (!data || !data.dataUrl) return null

  const img = new Image()
  img.src = data.dataUrl
  const entry = { img, width: data.width, height: data.height, anchorX: data.anchorX, anchorY: data.anchorY }
  imageCache.set(key, entry)
  return entry
}

function renderFrame(timestamp: number) {
  if (!lastTimestamp) lastTimestamp = timestamp
  const speedMult = Math.max(0.1, props.animSpeed || 1.0)
  const dt = Math.min(0.1, (timestamp - lastTimestamp) / 1000) * speedMult
  lastTimestamp = timestamp

  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) {
    animationFrameId = requestAnimationFrame(renderFrame)
    return
  }

  const rect = container.getBoundingClientRect()
  const width = Math.floor(rect.width)
  const height = Math.floor(rect.height)

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    animationFrameId = requestAnimationFrame(renderFrame)
    return
  }

  // Advance Animation Frame
  animTimer += dt
  const isWarrior = currentModel.value === 'warrior'
  const frameDuration = isWarrior ? 0.045 : 0.08

  if (animTimer >= frameDuration) {
    animTimer = 0
    const maxFrames = totalFramesForAction.value
    currentFrameIndex.value = (currentFrameIndex.value + 1) % maxFrames
  }

  // --- DRAW CANVAS SCENE ---
  ctx.clearRect(0, 0, width, height)

  // 1. Authentic Isometric Grid Tile Platform (Katak)
  const centerX = width / 2
  const centerY = height * 0.70
  const tileRadiusX = 64
  const tileRadiusY = 32
  const slabDepth = 7

  ctx.save()

  // 1A. Bottom 3D slab thickness (Left & Right isometric faces)
  // Left 3D Face
  ctx.beginPath()
  ctx.moveTo(centerX - tileRadiusX, centerY)
  ctx.lineTo(centerX, centerY + tileRadiusY)
  ctx.lineTo(centerX, centerY + tileRadiusY + slabDepth)
  ctx.lineTo(centerX - tileRadiusX, centerY + slabDepth)
  ctx.closePath()
  ctx.fillStyle = '#1e293b'
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1
  ctx.stroke()

  // Right 3D Face
  ctx.beginPath()
  ctx.moveTo(centerX, centerY + tileRadiusY)
  ctx.lineTo(centerX + tileRadiusX, centerY)
  ctx.lineTo(centerX + tileRadiusX, centerY + slabDepth)
  ctx.lineTo(centerX, centerY + tileRadiusY + slabDepth)
  ctx.closePath()
  ctx.fillStyle = '#0f172a'
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1
  ctx.stroke()

  // 1B. Top Isometric Diamond Tile (Katak yuzasi)
  ctx.beginPath()
  ctx.moveTo(centerX, centerY - tileRadiusY)
  ctx.lineTo(centerX + tileRadiusX, centerY)
  ctx.lineTo(centerX, centerY + tileRadiusY)
  ctx.lineTo(centerX - tileRadiusX, centerY)
  ctx.closePath()

  // Clean tile fill gradient
  const tileGrad = ctx.createLinearGradient(centerX - tileRadiusX, centerY - tileRadiusY, centerX + tileRadiusX, centerY + tileRadiusY)
  tileGrad.addColorStop(0, '#1e293b')
  tileGrad.addColorStop(1, '#0f172a')
  ctx.fillStyle = tileGrad
  ctx.fill()

  // Inner grid lines dividing the tile into 4 sub-quadrants
  ctx.beginPath()
  // North-to-South axis line
  ctx.moveTo(centerX, centerY - tileRadiusY)
  ctx.lineTo(centerX, centerY + tileRadiusY)
  // West-to-East axis line
  ctx.moveTo(centerX - tileRadiusX, centerY)
  ctx.lineTo(centerX + tileRadiusX, centerY)
  ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Outer isometric border of the katak
  ctx.beginPath()
  ctx.moveTo(centerX, centerY - tileRadiusY)
  ctx.lineTo(centerX + tileRadiusX, centerY)
  ctx.lineTo(centerX, centerY + tileRadiusY)
  ctx.lineTo(centerX - tileRadiusX, centerY)
  ctx.closePath()
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.8)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.restore()

  // 2. Draw Character Sprite (With smooth flicker-free cache & height elevation offset)
  const entry = getStabilizedImageForFrame(currentModel.value, currentDirection.value, currentAction.value, currentFrameIndex.value)
  const activeEntry = (entry && entry.img.complete && entry.img.naturalWidth > 0) ? entry : lastRenderedEntry

  if (activeEntry && activeEntry.img.complete && activeEntry.img.naturalWidth > 0) {
    lastRenderedEntry = activeEntry
    const modelKey = String(currentModel.value || 'male').toLowerCase()
    const modelMeta = (characterManifest as any)?.[modelKey]
    const baseModelScale = modelMeta?.scale ?? 0.8
    const baseDrawScale = (modelKey === 'male' ? 0.52 : baseModelScale * 0.6)
    const customUnitScale = Number(props.unitScale) || 1.0
    const drawScale = baseDrawScale * customUnitScale

    const drawW = activeEntry.width * drawScale
    const drawH = activeEntry.height * drawScale

    const drawX = centerX - drawW * activeEntry.anchorX
    // Apply vertical height elevation offset (props.offsetY lifts the unit above the katak)
    const heightElevation = Number(props.offsetY) || 0
    const drawY = centerY - drawH * activeEntry.anchorY - heightElevation

    ctx.drawImage(activeEntry.img, drawX, drawY, drawW, drawH)
  }

  animationFrameId = requestAnimationFrame(renderFrame)
}

onMounted(() => {
  animationFrameId = requestAnimationFrame(renderFrame)
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
})
</script>

