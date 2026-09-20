<template>
  <UiModal
    :is-open="isOpen"
    :title="t('towers.selectProjectileTitle') || 'Snaryad Turini Tanlash'"
    :subtitle="t('towers.selectProjectileSubtitle') || 'Bazoviy va maxsus yaratilgan snaryadlar to\'plami'"
    :icon="Crosshair"
    icon-color="amber"
    size="6xl"
    @close="emit('close')"
  >
    <div class="flex flex-col lg:flex-row items-stretch gap-4 select-none overflow-x-hidden">
      <!-- 1. LEFT COLUMN: EXACT 1:1 SQUARE 2.5D ISOMETRIC ARENA STAGE -->
      <div class="w-full lg:w-84 xl:w-92 shrink-0 flex flex-col gap-2.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
        <!-- Top HUD Active Projectile Badge -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg min-w-0 flex-1">
            <span 
              class="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm shrink-0"
              :style="{ backgroundColor: activeSelectedDef?.colorCss || '#f59e0b' }"
            />
            <span class="text-xs font-bold text-slate-100 truncate">
              {{ getLocalizedName(activeSelectedDef) }}
            </span>
            <span 
              class="text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider border shrink-0"
              :style="{
                color: activeSelectedDef?.colorCss,
                borderColor: `${activeSelectedDef?.colorCss}40`,
                backgroundColor: `${activeSelectedDef?.colorCss}15`
              }"
            >
              {{ activeSelectedDef?.category }}
            </span>
          </div>

          <span class="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 shrink-0">
            2.5D Arena
          </span>
        </div>

        <!-- Dedicated Square 1:1 Live Arena Canvas Container -->
        <div 
          class="relative w-full aspect-square rounded-2xl bg-slate-950 border border-slate-800/90 shadow-2xl overflow-hidden flex items-center justify-center group cursor-crosshair"
          @click="handleArenaClick"
        >
          <canvas ref="arenaCanvasRef" class="w-full h-full block"></canvas>

          <!-- Top-Right Type Badges inside Canvas -->
          <div class="absolute top-2.5 right-2.5 pointer-events-none flex flex-col items-end gap-1">
            <span v-if="activeSelectedDef?.isLaser" class="text-[9px] font-mono font-bold text-purple-300 bg-purple-950/90 px-2 py-0.5 rounded-md border border-purple-800/60 shadow-md">
              BEAM
            </span>
            <span v-if="activeSelectedDef?.hasArc" class="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-800/60 shadow-md">
              ARC
            </span>
            <span v-if="activeSelectedDef?.isInstant" class="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-md border border-cyan-800/60 shadow-md uppercase">
              {{ activeSelectedDef?.instantType || 'INSTANT' }}
            </span>
          </div>

          <!-- Bottom hint overlay -->
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-slate-700/80 text-[10px] text-slate-300 shadow-lg whitespace-nowrap">
            {{ t('projectiles.clickArenaHint') }}
          </div>
        </div>

        <!-- Projectile Info & Details Card -->
        <div class="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
          <p class="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
            {{ activeSelectedDef?.description || t('projectiles.defaultDesc') }}
          </p>

          <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800 text-[10px] font-mono text-slate-400">
            <span class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              {{ t('projectiles.shapeLabel') }}: {{ activeSelectedDef?.shape || 'circle' }}
            </span>
            <span class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              {{ t('projectiles.formationLabel') }}: {{ activeSelectedDef?.formation || 'single' }}
            </span>
            <span class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              {{ t('projectiles.sparkLabel') }}: {{ activeSelectedDef?.sparkType || 'default' }}
            </span>
          </div>
        </div>

        <!-- Open Studio Button -->
        <UiButton
          variant="ghost"
          size="xs"
          :leading-icon="Wrench"
          custom-class="text-amber-300 hover:bg-amber-500/20 border border-amber-500/40 w-full justify-center"
          @click="openProjectileStudio"
        >
          {{ t('towers.projectileStudio') }}
        </UiButton>
      </div>

      <!-- 2. RIGHT COLUMN: SEARCH, CATEGORIES & PROJECTILES GRID -->
      <div class="flex-1 min-w-0 flex flex-col gap-2.5 overflow-x-hidden">
        <!-- Top Search Input & Count Badge -->
        <div class="flex items-center justify-between gap-2.5">
          <div class="flex-1 min-w-0">
            <UiInput
              v-model="searchQuery"
              size="sm"
              :placeholder="t('projectiles.search')"
              :leading-icon="Search"
            />
          </div>

          <UiBadge variant="amber" size="sm" class="shrink-0">
            {{ filteredProjectiles.length }} / {{ allAvailableProjectiles.length }} {{ t('towers.projectilesLabel') }}
          </UiBadge>
        </div>

        <!-- Category Filter Tabs (Wrapping cleanly with NO horizontal scroll) -->
        <div class="flex flex-wrap items-center gap-1.5 py-0.5">
          <button
            type="button"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0',
              selectedCategory === 'all'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            @click="selectedCategory = 'all'"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ t('common.all') }} ({{ allAvailableProjectiles.length }})</span>
          </button>

          <button
            v-for="cat in availableCategories"
            :key="cat.id"
            type="button"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0',
              selectedCategory === cat.id
                ? 'bg-slate-800 ring-2 shadow-sm font-bold ' + cat.borderClass + ' ' + cat.glowClass
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            :style="{ color: selectedCategory === cat.id ? cat.color : undefined }"
            @click="selectedCategory = cat.id"
          >
            <component :is="cat.icon" class="w-3.5 h-3.5" :style="{ color: cat.color }" />
            <span>{{ getCategoryLabel(cat.id) }} ({{ getCategoryCount(cat.id) }})</span>
          </button>
        </div>

        <!-- Scrollable Projectiles Grid -->
        <div class="overflow-y-auto overflow-x-hidden custom-scrollbar pr-1 max-h-[46vh] lg:max-h-[52vh] p-0.5">
          <div v-if="filteredProjectiles.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-500 text-xs gap-2 text-center">
            <Crosshair class="w-8 h-8 text-slate-600" />
            <span>{{ t('projectiles.noResultsFound') }}</span>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            <div
              v-for="proj in filteredProjectiles"
              :key="proj.id"
              :class="[
                'group relative flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer select-none text-left',
                tempSelectedId === proj.id
                  ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-[1.01]'
                  : 'bg-slate-900/90 border-slate-800/80 hover:bg-slate-800/90 hover:border-slate-700'
              ]"
              @click="tempSelectedId = proj.id"
              @mouseenter="previewHoverId = proj.id"
              @mouseleave="previewHoverId = null"
              @dblclick="selectAndApply(proj.id)"
            >
              <!-- Left Animated Mini Preview Canvas -->
              <div 
                class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 shadow-inner overflow-hidden relative bg-slate-950/80"
                :style="{ 
                  borderColor: `${proj.colorCss}50`
                }"
              >
                <canvas
                  :ref="(el) => setCardCanvas(el, proj.id)"
                  width="44"
                  height="44"
                  class="w-full h-full block relative z-10"
                />
              </div>

              <!-- Middle Text Info -->
              <div class="flex flex-col min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span 
                    class="text-xs font-bold truncate"
                    :class="tempSelectedId === proj.id ? 'text-amber-300' : 'text-slate-200 group-hover:text-white'"
                  >
                    {{ getLocalizedName(proj) }}
                  </span>
                </div>

                <div class="flex items-center gap-1.5 mt-0.5">
                  <span 
                    class="text-[9px] font-semibold px-1.5 py-0.2 rounded-md border uppercase tracking-wider"
                    :style="{
                      color: proj.colorCss,
                      borderColor: `${proj.colorCss}40`,
                      backgroundColor: `${proj.colorCss}15`
                    }"
                  >
                    {{ proj.category }}
                  </span>
                  <span v-if="proj.isLaser" class="text-[9px] font-mono text-purple-300 bg-purple-950/60 px-1 py-0.2 rounded border border-purple-800/60">
                    Beam
                  </span>
                  <span v-if="proj.isInstant" class="text-[9px] font-mono text-cyan-300 bg-cyan-950/60 px-1 py-0.2 rounded border border-cyan-800/60">
                    Instant
                  </span>
                </div>

                <span class="text-[10px] text-slate-400 truncate mt-0.5">
                  {{ proj.description }}
                </span>
              </div>

              <!-- Right Active Checkmark Badge -->
              <div v-if="tempSelectedId === proj.id" class="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
                <Check class="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. MODAL ACTION BUTTONS FOOTER -->
    <template #footer>
      <div class="flex items-center justify-between gap-2 w-full">
        <!-- Selected Preview Hint -->
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs text-slate-400 hidden sm:inline">{{ t('common.selected') || 'Tanlangan' }}:</span>
          <span class="text-xs font-bold text-amber-300 truncate">
            {{ getLocalizedName(activeSelectedDef) }} ({{ activeSelectedDef?.category.toUpperCase() }})
          </span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <UiButton
            variant="secondary"
            size="sm"
            @click="emit('close')"
          >
            {{ t('common.cancel') }}
          </UiButton>

          <UiButton
            variant="game-amber"
            size="sm"
            :leading-icon="Check"
            @click="applySelection"
          >
            {{ t('common.confirm') }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Crosshair, Search, Sparkles, Check, Wrench } from 'lucide-vue-next'
import { UiModal, UiButton, UiInput, UiBadge } from '../ui'
import { ProjectileType } from '../../types/map'
import { 
  PROJECTILE_CATEGORIES, 
  ProjectileCategory, 
  getProjectileDef 
} from '../../utils/projectileCatalog'
import { getProjectileTheme, renderCanvasProjectileHead, renderCanvasProjectileTrail } from '../../utils/projectileEffectRenderer'
import { useProjectileStore } from '../../stores/projectileStore'
import { useI18n } from '../../stores/i18nStore'

const props = defineProps<{
  isOpen: boolean
  modelValue: ProjectileType
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: ProjectileType): void
  (e: 'close'): void
}>()

const router = useRouter()
const { t, currentLocale } = useI18n()
const projectileStore = useProjectileStore()

function getLocalizedName(proj: any): string {
  if (!proj) return ''
  if (currentLocale.value === 'uz' && proj.nameUz) return proj.nameUz
  if (currentLocale.value === 'ru' && proj.nameRu) return proj.nameRu
  return proj.name || proj.nameUz || proj.id
}

function getCategoryLabel(catId: string): string {
  const catKey = `projectiles.cat${catId.charAt(0).toUpperCase() + catId.slice(1)}`
  const translated = t(catKey)
  if (translated !== catKey) return translated
  const found = PROJECTILE_CATEGORIES.find(c => c.id === catId)
  return found ? (currentLocale.value === 'uz' ? found.nameUz : found.name) : catId
}

const searchQuery = ref('')
const selectedCategory = ref<ProjectileCategory | 'all'>('all')
const tempSelectedId = ref<string>(props.modelValue || 'fireball')
const previewHoverId = ref<string | null>(null)

const arenaCanvasRef = ref<HTMLCanvasElement | null>(null)
const cardCanvasMap = new Map<string, HTMLCanvasElement>()

function setCardCanvas(el: any, id: string) {
  if (el && el instanceof HTMLCanvasElement) {
    cardCanvasMap.set(id, el)
  } else {
    cardCanvasMap.delete(id)
  }
}

function openProjectileStudio() {
  emit('close')
  router.push('/projectile-editor')
}

const allAvailableProjectiles = computed(() => {
  return projectileStore.allProjectiles
})

const availableCategories = computed(() => {
  return PROJECTILE_CATEGORIES.filter(c => {
    if (c.id === 'custom') {
      return projectileStore.customProjectiles.length > 0
    }
    return true
  })
})

function getCategoryCount(catId: ProjectileCategory): number {
  return allAvailableProjectiles.value.filter(p => p.category === catId).length
}

// ========================================================
// 2.5D ISOMETRIC SQUARE ARENA SIMULATION (1:1 with Editor)
// ========================================================
let arenaAnimId: number | null = null
let lastTime = 0
let arenaShootTimer = 0
let turretAngle = 0
let projSeq = 0

// Target dummy state
let dummyHitTimer = 0
let dummyHealth = 1.0
let customTargetPos: { x: number; y: number } | null = null

interface ArenaProj {
  id: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  progress: number
  speed: number
  offsetPerp: number
  phaseOffset: number
  type: string
  color: number
  trail: { x: number; y: number; alpha: number; size: number }[]
}

interface ArenaShockwave {
  x: number
  y: number
  rx: number
  ry: number
  maxRadius: number
  color: string
  alpha: number
  life: number
}

interface ArenaSpark {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  size: number
  life: number
  maxLife: number
  type: string
  rot: number
  vRot: number
}

interface ArenaDamageText {
  x: number
  y: number
  vy: number
  text: string
  color: string
  alpha: number
  life: number
}

const arenaProjectiles: ArenaProj[] = []
const arenaShockwaves: ArenaShockwave[] = []
const arenaSparks: ArenaSpark[] = []
const arenaDamageTexts: ArenaDamageText[] = []

const activeSelectedDef = computed(() => {
  return getProjectileDef(previewHoverId.value || tempSelectedId.value)
})

watch(() => props.isOpen, (open) => {
  if (open) {
    tempSelectedId.value = props.modelValue || 'fireball'
    previewHoverId.value = null
    searchQuery.value = ''
    customTargetPos = null
    dummyHealth = 1.0
    dummyHitTimer = 0
    const current = getProjectileDef(tempSelectedId.value)
    if (current) {
      selectedCategory.value = current.category
    }
    arenaProjectiles.length = 0
    arenaShockwaves.length = 0
    arenaSparks.length = 0
    arenaDamageTexts.length = 0
    arenaShootTimer = 0.5
    startArenaLoop()
  } else {
    stopArenaLoop()
  }
})

const filteredProjectiles = computed(() => {
  let list = allAvailableProjectiles.value

  if (selectedCategory.value !== 'all') {
    list = list.filter(p => p.category === selectedCategory.value)
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.nameUz?.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    )
  }

  return list
})

function handleArenaClick(e: MouseEvent) {
  if (!arenaCanvasRef.value) return
  const canvas = arenaCanvasRef.value
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const clickX = ((e.clientX - rect.left) / rect.width) * (canvas.width / dpr)
  const clickY = ((e.clientY - rect.top) / rect.height) * (canvas.height / dpr)
  customTargetPos = { x: clickX, y: clickY }
  spawnArenaShot()
}

function spawnArenaShot() {
  if (!arenaCanvasRef.value) return
  const canvas = arenaCanvasRef.value
  const dpr = window.devicePixelRatio || 1
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  const startX = w * 0.22
  const startY = h * 0.74 - 18

  const curDef = activeSelectedDef.value
  const defaultTargetX = w * 0.78
  const defaultTargetY = h * 0.26 - 12
  const targetX = customTargetPos ? customTargetPos.x : defaultTargetX
  const targetY = customTargetPos ? customTargetPos.y : defaultTargetY

  const isInstant = Boolean(curDef.isInstant || curDef.shape === 'instant_strike')
  const effStartX = isInstant ? targetX : startX
  const effStartY = isInstant ? targetY - (curDef.instantType === 'sky_strike' ? 120 : 0) : startY
  const dur = isInstant ? 0.3 : (curDef.isLaser ? 0.35 : 0.65)
  const form = curDef.formation || 'single'

  if (form === 'volley_3') {
    const offsets = [-14, 0, 14]
    offsets.forEach(off => {
      arenaProjectiles.push({
        id: ++projSeq,
        startX: effStartX,
        startY: effStartY,
        targetX,
        targetY,
        currentX: effStartX,
        currentY: effStartY,
        progress: 0,
        speed: 1 / dur,
        offsetPerp: off,
        phaseOffset: 0,
        type: curDef.id,
        color: curDef.colorHex,
        trail: []
      })
    })
  } else if (form === 'twin_helix') {
    arenaProjectiles.push({
      id: ++projSeq,
      startX: effStartX,
      startY: effStartY,
      targetX,
      targetY,
      currentX: effStartX,
      currentY: effStartY,
      progress: 0,
      speed: 1 / dur,
      offsetPerp: 10,
      phaseOffset: 0,
      type: curDef.id,
      color: curDef.colorHex,
      trail: []
    })
    arenaProjectiles.push({
      id: ++projSeq,
      startX: effStartX,
      startY: effStartY,
      targetX,
      targetY,
      currentX: effStartX,
      currentY: effStartY,
      progress: 0,
      speed: 1 / dur,
      offsetPerp: -10,
      phaseOffset: Math.PI,
      type: curDef.id,
      color: curDef.colorHex,
      trail: []
    })
  } else {
    arenaProjectiles.push({
      id: ++projSeq,
      startX: effStartX,
      startY: effStartY,
      targetX,
      targetY,
      currentX: effStartX,
      currentY: effStartY,
      progress: 0,
      speed: 1 / dur,
      offsetPerp: 0,
      phaseOffset: 0,
      type: curDef.id,
      color: curDef.colorHex,
      trail: []
    })
  }
}

function handleArenaImpact(p: ArenaProj) {
  const curDef = getProjectileDef(p.type)
  const theme = getProjectileTheme(p.type, p.color)

  dummyHitTimer = 0.22
  dummyHealth = Math.max(0.15, dummyHealth - 0.25)
  if (dummyHealth <= 0.15) dummyHealth = 1.0

  // 1. Shockwave
  const shockR = curDef.shockwaveRadius || 24
  arenaShockwaves.push({
    x: p.targetX,
    y: p.targetY,
    rx: 4,
    ry: 2,
    maxRadius: shockR,
    color: curDef.shockwaveColorCss || theme.shockwaveColorCss,
    alpha: 1.0,
    life: 0.45,
  })

  if (curDef.hasDoubleRing) {
    arenaShockwaves.push({
      x: p.targetX,
      y: p.targetY,
      rx: 2,
      ry: 1,
      maxRadius: shockR * 0.6,
      color: '#fef08a',
      alpha: 1.0,
      life: 0.35,
    })
  }

  // 2. Sparks
  const count = curDef.sparkCount || 16
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2
    const spd = 40 + Math.random() * 95
    const sLife = 0.32 + Math.random() * 0.22

    arenaSparks.push({
      x: p.targetX,
      y: p.targetY,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.75,
      color: curDef.sparkColorCss || theme.sparkColorCss,
      alpha: 1.0,
      size: 1.8 + Math.random() * 2.5,
      life: sLife,
      maxLife: sLife,
      type: curDef.sparkType || 'default',
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 12,
    })
  }

  // 3. Floating Damage Number
  const isCrit = Math.random() > 0.6
  arenaDamageTexts.push({
    x: p.targetX + (Math.random() - 0.5) * 20,
    y: p.targetY - 14,
    vy: -45,
    text: isCrit ? '-380 CRIT!' : `-${120 + Math.floor(Math.random() * 50)}`,
    color: isCrit ? '#fbbf24' : '#ef4444',
    alpha: 1.0,
    life: 0.6,
  })
}

function drawIsoTile(ctx: CanvasRenderingContext2D, cx: number, cy: number, tw: number, th: number, fill?: string, stroke?: string) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - th / 2)
  ctx.lineTo(cx + tw / 2, cy)
  ctx.lineTo(cx, cy + th / 2)
  ctx.lineTo(cx - tw / 2, cy)
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function renderArenaFrame(time: number) {
  if (!arenaCanvasRef.value) return
  const canvas = arenaCanvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  if (lastTime === 0) lastTime = time
  const dt = Math.min(0.1, (time - lastTime) / 1000)
  lastTime = time

  // Auto Shooting Interval
  arenaShootTimer += dt
  if (arenaShootTimer >= 0.65) {
    arenaShootTimer = 0
    spawnArenaShot()
  }

  // Dummy Health Recovery & hit timer decay
  if (dummyHealth < 1.0) {
    dummyHealth = Math.min(1.0, dummyHealth + dt * 0.35)
  }
  if (dummyHitTimer > 0) {
    dummyHitTimer -= dt
  }

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  // 1. Arena Background (Exact 1:1 match with Editor)
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.72)
  bgGrad.addColorStop(0, '#0c1322')
  bgGrad.addColorStop(1, '#020617')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // 2. Isometric Ground Grid (Exact 1:1 match with Editor)
  const tileW = w * 0.16
  const tileH = tileW * 0.5
  const gridRows = 5
  const gridCols = 5
  const originX = w * 0.5
  const originY = h * 0.5 - tileH * 0.5

  ctx.lineWidth = 1
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const isoX = originX + (c - r) * (tileW * 0.5)
      const isoY = originY + (c + r) * (tileH * 0.5)
      const isAlt = (r + c) % 2 === 0
      drawIsoTile(
        ctx,
        isoX,
        isoY,
        tileW,
        tileH,
        isAlt ? 'rgba(30, 41, 59, 0.35)' : 'rgba(15, 23, 42, 0.45)',
        'rgba(51, 65, 85, 0.35)'
      )
    }
  }

  // 3. Firing Positions
  const towerBaseX = w * 0.22
  const towerBaseY = h * 0.74
  const muzzleX = towerBaseX
  const muzzleY = towerBaseY - 18

  const defaultDummyX = w * 0.78
  const defaultDummyY = h * 0.26
  const dummyBaseX = customTargetPos ? customTargetPos.x : defaultDummyX
  const dummyBaseY = customTargetPos ? customTargetPos.y + 12 : defaultDummyY
  const dummyHitX = dummyBaseX
  const dummyHitY = dummyBaseY - 12

  // Range Circle around Tower (Isometric Ellipse)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.ellipse(towerBaseX, towerBaseY, w * 0.38, w * 0.19, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 4. Draw Tower Base Pedestal
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.beginPath()
  ctx.ellipse(towerBaseX, towerBaseY + 6, 26, 13, 0, 0, Math.PI * 2)
  ctx.fill()

  drawIsoTile(ctx, towerBaseX, towerBaseY, 44, 22, '#1e293b', '#334155')
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.moveTo(towerBaseX - 22, towerBaseY)
  ctx.lineTo(towerBaseX, towerBaseY + 11)
  ctx.lineTo(towerBaseX + 22, towerBaseY)
  ctx.lineTo(towerBaseX + 22, towerBaseY + 8)
  ctx.lineTo(towerBaseX, towerBaseY + 19)
  ctx.lineTo(towerBaseX - 22, towerBaseY + 8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.stroke()

  // Turret Cannon Mount & Barrel angled
  const targetAngle = Math.atan2(dummyHitY - muzzleY, dummyHitX - muzzleX)
  turretAngle = targetAngle

  ctx.save()
  ctx.translate(muzzleX, muzzleY)

  // Turret base orb
  ctx.fillStyle = '#1e293b'
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(0, 0, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Cannon barrel
  ctx.rotate(targetAngle)
  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.roundRect(0, -3.5, 14, 7, 2)
  ctx.fill()
  ctx.stroke()

  // Mechanical energy core
  ctx.fillStyle = activeSelectedDef.value?.colorCss || '#f97316'
  ctx.beginPath()
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 5. Draw Target Dummy (Exact match with Editor)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(dummyBaseX, dummyBaseY + 4, 20, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  drawIsoTile(ctx, dummyBaseX, dummyBaseY, 36, 18, '#1e293b', '#334155')

  const shakeX = dummyHitTimer > 0 ? (Math.random() - 0.5) * 5 : 0
  const isDummyFlashing = dummyHitTimer > 0.08
  const dummyDrawX = dummyBaseX + shakeX

  ctx.save()
  // Body post
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#78350f'
  ctx.fillRect(dummyDrawX - 2.5, dummyBaseY - 24, 5, 24)

  // Crossarms
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#92400e'
  ctx.fillRect(dummyDrawX - 12, dummyBaseY - 18, 24, 5)

  // Target head/torso shield
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#b45309'
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(dummyDrawX, dummyBaseY - 14, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Target bullseye
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#78350f'
  ctx.beginPath()
  ctx.arc(dummyDrawX, dummyBaseY - 14, 4, 0, Math.PI * 2)
  ctx.fill()

  // Floating Health Bar above Dummy
  const barW = 32
  const barH = 4.5
  const barX = dummyDrawX - barW * 0.5
  const barY = dummyBaseY - 32

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2)
  ctx.fillStyle = '#334155'
  ctx.fillRect(barX, barY, barW, barH)

  const hpFill = Math.max(0, Math.min(1, dummyHealth))
  ctx.fillStyle = hpFill > 0.4 ? '#22c55e' : '#ef4444'
  ctx.fillRect(barX, barY, barW * hpFill, barH)
  ctx.restore()

  // 6. Shockwaves
  for (let i = arenaShockwaves.length - 1; i >= 0; i--) {
    const sw = arenaShockwaves[i]
    sw.life -= dt
    sw.rx += (sw.maxRadius - sw.rx) * dt * 10
    sw.ry = sw.rx * 0.5
    sw.alpha = Math.max(0, sw.life / 0.45)

    ctx.beginPath()
    ctx.ellipse(sw.x, sw.y, sw.rx, sw.ry, 0, 0, Math.PI * 2)
    ctx.strokeStyle = sw.color
    ctx.lineWidth = 2.2
    ctx.globalAlpha = sw.alpha * 0.85
    ctx.stroke()

    ctx.beginPath()
    ctx.ellipse(sw.x, sw.y, sw.rx * 0.8, sw.ry * 0.8, 0, 0, Math.PI * 2)
    ctx.fillStyle = sw.color
    ctx.globalAlpha = sw.alpha * 0.2
    ctx.fill()
    ctx.globalAlpha = 1.0

    if (sw.life <= 0) arenaShockwaves.splice(i, 1)
  }

  // 7. Projectiles (True Ballistic Derivative Tangent & Trail styles)
  for (let i = arenaProjectiles.length - 1; i >= 0; i--) {
    const p = arenaProjectiles[i]
    p.progress += p.speed * dt

    const dx = p.targetX - p.startX
    const dy = p.targetY - p.startY
    const curDef = getProjectileDef(p.type)
    const arcHeight = !curDef.hasArc ? 0 : w * 0.16

    const baseX = p.startX + dx * p.progress
    const baseY = p.startY + dy * p.progress
    const arcY = curDef.hasArc ? Math.sin(p.progress * Math.PI) * arcHeight : 0

    let lateralX = 0
    let lateralY = 0
    if (p.offsetPerp !== 0) {
      const len = Math.hypot(dx, dy)
      const perpX = -dy / len
      const perpY = dx / len
      const swirl = curDef.formation === 'twin_helix'
        ? Math.sin(p.progress * Math.PI * 6 + p.phaseOffset) * p.offsetPerp
        : p.offsetPerp
      lateralX = perpX * swirl
      lateralY = perpY * swirl * 0.5
    }

    p.currentX = baseX + lateralX
    p.currentY = baseY - arcY + lateralY

    // Record trail
    p.trail.push({ x: p.currentX, y: p.currentY, alpha: 1.0, size: curDef.trailWidth || 4 })
    const maxTrailLen = Math.max(3, curDef.trailLength || 10)
    if (p.trail.length > maxTrailLen) p.trail.shift()

    // Render Unified Trail
    renderCanvasProjectileTrail(ctx, p.trail, curDef, time)

    // Exact Ballistic Derivative Angle Calculation
    const vx = dx
    const vy = dy - (curDef.hasArc ? Math.cos(p.progress * Math.PI) * Math.PI * arcHeight : 0)
    const angle = Math.atan2(vy, vx)

    renderCanvasProjectileHead(
      ctx,
      curDef.id,
      p.currentX,
      p.currentY,
      angle,
      p.startX,
      p.startY,
      p.progress,
      time,
      curDef
    )

    if (p.progress >= 1.0) {
      handleArenaImpact(p)
      arenaProjectiles.splice(i, 1)
    }
  }

  // 8. Specialized Sparks
  for (let i = arenaSparks.length - 1; i >= 0; i--) {
    const sp = arenaSparks[i]
    sp.x += sp.vx * dt
    sp.y += sp.vy * dt
    sp.rot += (sp.vRot || 0) * dt
    sp.life -= dt
    sp.alpha = Math.max(0, sp.life / (sp.maxLife || 0.45))

    if (sp.alpha > 0) {
      ctx.save()
      ctx.globalAlpha = sp.alpha

      if (sp.type === 'fire_ember') {
        sp.vy -= 120 * dt
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size * (sp.alpha * 0.8 + 0.2), 0, Math.PI * 2)
        ctx.fillStyle = sp.color
        ctx.fill()
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      } else if (sp.type === 'ice_shard') {
        ctx.translate(sp.x, sp.y)
        ctx.rotate(sp.rot)
        ctx.beginPath()
        ctx.moveTo(sp.size * 1.5, 0)
        ctx.lineTo(0, sp.size * 0.6)
        ctx.lineTo(-sp.size * 1.5, 0)
        ctx.lineTo(0, -sp.size * 0.6)
        ctx.closePath()
        ctx.fillStyle = sp.color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 0.8
        ctx.stroke()
      } else if (sp.type === 'snowflake') {
        ctx.translate(sp.x, sp.y)
        ctx.rotate(sp.rot)
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1.2
        for (let spoke = 0; spoke < 3; spoke++) {
          ctx.beginPath()
          ctx.moveTo(-sp.size * 1.2, 0)
          ctx.lineTo(sp.size * 1.2, 0)
          ctx.stroke()
          ctx.rotate(Math.PI / 3)
        }
      } else if (sp.type === 'lightning_arc') {
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(sp.x, sp.y)
        ctx.lineTo(sp.x + sp.vx * dt * 3, sp.y + sp.vy * dt * 3)
        ctx.stroke()
      } else if (sp.type === 'arcane_star' || sp.type === 'holy_cross') {
        ctx.translate(sp.x, sp.y)
        ctx.rotate(sp.rot)
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(-sp.size * 1.3, 0)
        ctx.lineTo(sp.size * 1.3, 0)
        ctx.moveTo(0, -sp.size * 1.3)
        ctx.lineTo(0, -sp.size * 1.3)
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, sp.size * 0.35, 0, Math.PI * 2)
        ctx.fill()
      } else if (sp.type === 'sand_dust') {
        sp.vy += 35 * dt
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, Math.max(0.8, sp.size * 0.8), 0, Math.PI * 2)
        ctx.fillStyle = sp.color
        ctx.fill()
      } else if (sp.type === 'spark_line') {
        ctx.translate(sp.x, sp.y)
        ctx.rotate(sp.rot)
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(-sp.size * 1.5, 0)
        ctx.lineTo(sp.size * 1.5, 0)
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, 1.0, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
        ctx.fillStyle = sp.color
        ctx.fill()
      }
      ctx.restore()
    }

    if (sp.life <= 0) arenaSparks.splice(i, 1)
  }

  // 9. Floating Damage Text Numbers
  for (let i = arenaDamageTexts.length - 1; i >= 0; i--) {
    const dtTxt = arenaDamageTexts[i]
    dtTxt.y += dtTxt.vy * dt
    dtTxt.life -= dt
    dtTxt.alpha = Math.max(0, dtTxt.life / 0.6)

    ctx.save()
    ctx.globalAlpha = dtTxt.alpha
    ctx.font = 'bold 12px monospace'
    ctx.fillStyle = dtTxt.color
    ctx.textAlign = 'center'
    ctx.shadowColor = '#000000'
    ctx.shadowBlur = 4
    ctx.fillText(dtTxt.text, dtTxt.x, dtTxt.y)
    ctx.restore()

    if (dtTxt.life <= 0) arenaDamageTexts.splice(i, 1)
  }

  // 10. Render live animated thumbnails on visible card canvases
  for (const [projId, cardCanvas] of cardCanvasMap.entries()) {
    const cCtx = cardCanvas.getContext('2d')
    if (!cCtx) continue
    const cw = cardCanvas.width
    const ch = cardCanvas.height
    cCtx.clearRect(0, 0, cw, ch)
    cCtx.fillStyle = '#060a12'
    cCtx.fillRect(0, 0, cw, ch)
    renderCanvasProjectileHead(
      cCtx,
      projId,
      cw * 0.5,
      ch * 0.5,
      -Math.PI * 0.25,
      cw * 0.2,
      ch * 0.8,
      0.5,
      time
    )
  }

  ctx.restore()
  arenaAnimId = requestAnimationFrame(renderArenaFrame)
}

function startArenaLoop() {
  if (arenaAnimId !== null) return
  resizeArena()
  arenaAnimId = requestAnimationFrame(renderArenaFrame)
}

function stopArenaLoop() {
  if (arenaAnimId !== null) {
    cancelAnimationFrame(arenaAnimId)
    arenaAnimId = null
  }
}

function resizeArena() {
  if (!arenaCanvasRef.value) return
  const rect = arenaCanvasRef.value.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const side = Math.max(240, Math.floor(rect.width || 320))
  arenaCanvasRef.value.width = side * dpr
  arenaCanvasRef.value.height = side * dpr
}

onMounted(() => {
  if (props.isOpen) {
    startArenaLoop()
  }
})

onUnmounted(() => {
  stopArenaLoop()
})

function selectAndApply(id: string) {
  tempSelectedId.value = id
  applySelection()
}

function applySelection() {
  emit('update:modelValue', tempSelectedId.value as ProjectileType)
  emit('close')
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.6);
}
</style>
