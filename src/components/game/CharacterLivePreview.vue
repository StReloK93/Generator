<template>
  <div class="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-xl select-none flex flex-col">
    
    <!-- Top Model Selection Bar / Header -->
    <div class="flex items-center justify-between gap-2 p-2.5 bg-slate-900/90 border-b border-slate-800/80">
      <div v-if="showModelSelector" class="flex items-center gap-1.5">
        <span class="text-xs font-bold text-slate-300">Unit Model:</span>
        <div class="flex items-center gap-1 bg-slate-950 p-0.5 rounded-xl border border-slate-800">
          <button
            v-for="modelOption in availableModels"
            :key="modelOption.id"
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer capitalize"
            :class="currentModel === modelOption.id ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
            @click="selectModel(modelOption.id)"
          >
            <span>{{ getModelEmoji(modelOption.id) }}</span>
            <span>{{ modelOption.name }}</span>
          </button>
        </div>
      </div>

      <div v-else class="flex items-center gap-2">
        <span class="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <span>{{ getModelEmoji(currentModel) }}</span>
          <span class="capitalize text-purple-300">{{ currentModel }}</span>
        </span>
      </div>

      <!-- Action State Badge -->
      <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] font-mono text-purple-300 ml-auto">
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-semibold capitalize">{{ currentAction }}</span>
        <span class="text-slate-500">({{ currentFrameIndex + 1 }}/{{ totalFramesForAction }})</span>
      </div>
    </div>

    <!-- Main Live Canvas Viewport -->
    <div ref="containerRef" class="relative w-full h-52 sm:h-56 bg-slate-950 overflow-hidden">
      <canvas ref="canvasRef" class="w-full h-full block"></canvas>

      <!-- Absolute Top-Left Asset Badge -->
      <div class="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-slate-200">
        <span class="w-2 h-2 rounded-full bg-purple-400"></span>
        <span class="text-[11px] font-mono font-bold truncate max-w-40 sm:max-w-48 text-purple-300 capitalize">
          {{ currentModel }}
        </span>
      </div>

      <!-- Direction Compass Floating Pad (Bottom-Right) -->
      <div class="absolute bottom-2.5 right-2.5 z-10 flex flex-col items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-xl">
        <div class="grid grid-cols-3 gap-1">
          <!-- Row 1: North-West, North, North-East -->
          <button
            type="button"
            title="Direction 6 (North-West)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 6 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(6)"
          >
            ↖
          </button>
          <button
            type="button"
            title="Direction 7 (North)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 7 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(7)"
          >
            ↑
          </button>
          <button
            type="button"
            title="Direction 0 (North-East)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 0 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(0)"
          >
            ↗
          </button>

          <!-- Row 2: West, Auto-Rotate, East -->
          <button
            type="button"
            title="Direction 5 (West)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 5 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(5)"
          >
            ←
          </button>
          <button
            type="button"
            title="Toggle Auto-Rotate"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="isAutoRotating ? 'bg-emerald-600 text-white animate-spin' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="isAutoRotating = !isAutoRotating"
          >
            🔄
          </button>
          <button
            type="button"
            title="Direction 1 (East)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 1 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(1)"
          >
            →
          </button>

          <!-- Row 3: South-West, South, South-East -->
          <button
            type="button"
            title="Direction 4 (South-West)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 4 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(4)"
          >
            ↙
          </button>
          <button
            type="button"
            title="Direction 3 (South)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 3 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(3)"
          >
            ↓
          </button>
          <button
            type="button"
            title="Direction 2 (South-East)"
            class="w-6 h-6 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer"
            :class="currentDirection === 2 ? 'bg-purple-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'"
            @click="setDirection(2)"
          >
            ↘
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom Dynamic Animation Action Tester Buttons -->
    <div class="flex items-center justify-between gap-2 p-2.5 bg-slate-900/90 border-t border-slate-800/80 flex-wrap">
      <div class="flex items-center gap-1.5 flex-wrap">
        <span class="text-[11px] font-semibold text-slate-400 mr-1">Test Animation:</span>

        <button
          v-for="act in currentModelActions"
          :key="act.id"
          type="button"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          :class="currentAction.toLowerCase() === act.id.toLowerCase() ? (act.id === 'Run' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30' : act.id === 'Idle' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30' : 'bg-amber-600 text-white shadow-lg shadow-amber-600/30') : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
          @click="setAction(act.id)"
        >
          <span>{{ act.icon }}</span>
          <span>{{ act.label }}</span>
          <span class="text-[10px] opacity-75">({{ act.frameCount }}f)</span>
        </button>
      </div>

      <!-- Play / Speed Controls -->
      <div class="flex items-center gap-1.5 ml-auto">
        <button
          type="button"
          class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-300 transition-all cursor-pointer"
          :class="playbackSpeed === 0.5 ? 'bg-purple-600! text-white!' : ''"
          @click="playbackSpeed = 0.5"
        >
          0.5x
        </button>
        <button
          type="button"
          class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-300 transition-all cursor-pointer"
          :class="playbackSpeed === 1.0 ? 'bg-purple-600! text-white!' : ''"
          @click="playbackSpeed = 1.0"
        >
          1x
        </button>
        <button
          type="button"
          class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-300 transition-all cursor-pointer"
          :class="playbackSpeed === 2.0 ? 'bg-purple-600! text-white!' : ''"
          @click="playbackSpeed = 2.0"
        >
          2x
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { assetManager } from '../../services/assetManager'
import { CharacterAction, CharacterModel } from '../../stores/characterStore'
import characterManifest from '../../assets/generated/characterManifest.json'

const props = withDefaults(
  defineProps<{
    modelValue?: CharacterModel
    initialAction?: CharacterAction
    showModelSelector?: boolean
  }>(),
  {
    modelValue: 'male',
    initialAction: 'Run',
    showModelSelector: true,
  }
)

const emit = defineEmits<{
  (e: 'update:modelValue', val: CharacterModel): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Current Selection States
const currentModel = ref<CharacterModel>(props.modelValue || 'male')
const currentAction = ref<CharacterAction>(props.initialAction || 'Run')
const currentDirection = ref<number>(2) // Default 2: South-East (Down-Right)
const currentFrameIndex = ref<number>(0)
const isAutoRotating = ref(false)
const playbackSpeed = ref(1.0)

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

function getModelEmoji(id: string): string {
  const lower = String(id).toLowerCase()
  if (lower.includes('warrior') || lower.includes('knight')) return '⚔️'
  if (lower.includes('archer') || lower.includes('hunter') || lower.includes('bow')) return '🏹'
  if (lower.includes('mage') || lower.includes('wizard') || lower.includes('sorcerer')) return '🧙'
  if (lower.includes('male') || lower.includes('peasant') || lower.includes('villager') || lower.includes('worker')) return '🧑'
  if (lower.includes('female') || lower.includes('woman') || lower.includes('girl')) return '👩'
  if (lower.includes('orc') || lower.includes('goblin') || lower.includes('monster') || lower.includes('ogre')) return '👹'
  if (lower.includes('skeleton') || lower.includes('zombie') || lower.includes('undead')) return '💀'
  if (lower.includes('dragon') || lower.includes('beast') || lower.includes('demon')) return '🐉'
  return '👤'
}

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
      { id: 'Idle', label: 'Idle', icon: '🧘', frameCount: 24 },
      { id: 'Run', label: 'Run', icon: '🏃', frameCount: 24 },
    ]
  }
  return [
    { id: 'Idle', label: 'Idle', icon: '🧘', frameCount: 4 },
    { id: 'Run', label: 'Run', icon: '🏃', frameCount: 10 },
    { id: 'Pickup', label: 'Pickup / Die', icon: '💥', frameCount: 10 },
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
let autoRotateTimer = 0

// Image Cache for 2D Canvas Drawing
const imageCache = new Map<string, { img: HTMLImageElement; width: number; height: number; anchorX: number; anchorY: number }>()

watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== currentModel.value) {
    selectModel(newVal)
  }
})

function selectModel(model: CharacterModel) {
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
  isAutoRotating.value = false
}

function getStabilizedImageForFrame(model: CharacterModel, direction: number, action: CharacterAction, frame: number) {
  const isWarrior = model === 'warrior'
  const prefix = isWarrior ? 'Warrior' : 'Male'
  const actionPrefix = action || 'Idle'
  const frameIdx = actionPrefix === 'Idle' ? (isWarrior ? 0 : frame) : frame
  const key = `${prefix}_${direction}_${actionPrefix}${frameIdx}`

  if (imageCache.has(key)) {
    return imageCache.get(key) || null
  }

  // Generate Stabilized Data URL from AssetManager
  const data = assetManager.getCharacterStabilizedPreview(model, direction, action, frameIdx)
  if (!data || !data.dataUrl) return null

  const img = new Image()
  img.src = data.dataUrl
  const entry = { img, width: data.width, height: data.height, anchorX: data.anchorX, anchorY: data.anchorY }
  imageCache.set(key, entry)
  return entry
}

function renderFrame(timestamp: number) {
  if (!lastTimestamp) lastTimestamp = timestamp
  const dt = Math.min(0.1, (timestamp - lastTimestamp) / 1000) * playbackSpeed.value
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

  // Advance Auto-Rotation
  if (isAutoRotating.value) {
    autoRotateTimer += dt
    if (autoRotateTimer >= 0.8) {
      autoRotateTimer = 0
      currentDirection.value = (currentDirection.value + 1) % 8
    }
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

  // 1. Isometric Grid Background Platform
  const centerX = width / 2
  const centerY = height * 0.65

  // Isometric Ground Diamond
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(centerX, centerY - 32)
  ctx.lineTo(centerX + 64, centerY)
  ctx.lineTo(centerX, centerY + 32)
  ctx.lineTo(centerX - 64, centerY)
  ctx.closePath()

  const floorGrad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 70)
  if (isWarrior) {
    floorGrad.addColorStop(0, 'rgba(245, 158, 11, 0.15)')
    floorGrad.addColorStop(1, 'rgba(245, 158, 11, 0.02)')
  } else {
    floorGrad.addColorStop(0, 'rgba(168, 85, 247, 0.15)')
    floorGrad.addColorStop(1, 'rgba(168, 85, 247, 0.02)')
  }
  ctx.fillStyle = floorGrad
  ctx.fill()

  ctx.strokeStyle = isWarrior ? 'rgba(245, 158, 11, 0.3)' : 'rgba(168, 85, 247, 0.3)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // Inner decorative circles
  ctx.beginPath()
  ctx.ellipse(centerX, centerY, 36, 18, 0, 0, Math.PI * 2)
  ctx.strokeStyle = isWarrior ? 'rgba(245, 158, 11, 0.15)' : 'rgba(168, 85, 247, 0.15)'
  ctx.stroke()
  ctx.restore()

  // 2. Draw Character Sprite (Fixed, steady, non-jumping stabilized frame)
  const entry = getStabilizedImageForFrame(currentModel.value, currentDirection.value, currentAction.value, currentFrameIndex.value)

  if (entry && entry.img.complete && entry.img.naturalWidth > 0) {
    const isW = currentModel.value === 'warrior'
    // Draw at exact constant display scale
    const drawScale = isW ? 0.88 : 0.52
    const drawW = entry.width * drawScale
    const drawH = entry.height * drawScale

    const drawX = centerX - drawW * entry.anchorX
    const drawY = centerY - drawH * entry.anchorY

    ctx.drawImage(entry.img, drawX, drawY, drawW, drawH)
  } else {
    // Loading / Fallback Silhouette
    ctx.beginPath()
    ctx.arc(centerX, centerY - 35, 14, 0, Math.PI * 2)
    ctx.fillStyle = isWarrior ? '#d97706' : '#9333ea'
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(centerX, centerY - 12, 16, 20, 0, 0, Math.PI * 2)
    ctx.fillStyle = isWarrior ? '#b45309' : '#7e22ce'
    ctx.fill()
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
