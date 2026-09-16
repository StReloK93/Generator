<template>
  <UiModal
    :is-open="isOpen"
    :title="t('towers.selectProjectileTitle') || 'Snaryad Turini Tanlash'"
    :subtitle="t('towers.selectProjectileSubtitle') || 'Bazoviy va maxsus yaratilgan snaryadlar to\'plami'"
    :icon="Crosshair"
    icon-color="amber"
    size="4xl"
    @close="emit('close')"
  >
    <div class="flex flex-col gap-3.5 select-none max-h-[82vh]">
      <!-- 1. LIVE PROJECTILE FIRING & IMPACT ARENA STAGE -->
      <div class="relative w-full rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden shadow-2xl flex flex-col">
        <!-- Live Animation Canvas -->
        <div class="relative w-full h-32 sm:h-36 bg-linear-to-b from-slate-950 via-slate-900/60 to-slate-950 overflow-hidden">
          <canvas ref="arenaCanvasRef" class="w-full h-full block"></canvas>

          <!-- Top-Left Active Projectile Info HUD -->
          <div class="absolute top-2 left-2 z-10 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg">
            <span 
              class="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
              :style="{ backgroundColor: activeSelectedDef?.colorCss || '#f59e0b' }"
            />
            <span class="text-xs font-bold text-slate-100 truncate max-w-40 sm:max-w-56">
              {{ getLocalizedName(activeSelectedDef) }}
            </span>
            <span 
              class="text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider border"
              :style="{
                color: activeSelectedDef?.colorCss,
                borderColor: `${activeSelectedDef?.colorCss}40`,
                backgroundColor: `${activeSelectedDef?.colorCss}15`
              }"
            >
              {{ activeSelectedDef?.category }}
            </span>
            <span v-if="activeSelectedDef?.isLaser" class="text-[9px] font-mono font-bold text-purple-300 bg-purple-950/80 px-1 py-0.2 rounded border border-purple-800/60">
              BEAM
            </span>
          </div>

          <!-- Bottom-Right Live Action Badges -->
          <div class="absolute bottom-2 right-2 z-10 pointer-events-none flex items-center gap-1.5">
            <span class="text-[10px] font-mono text-slate-400 bg-slate-900/80 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-800">
              {{ activeSelectedDef?.description }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Top Search & Category Filter Header -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <!-- Search Input -->
        <div class="w-full sm:w-64">
          <UiInput
            v-model="searchQuery"
            size="sm"
            :placeholder="t('projectiles.search')"
            :leading-icon="Search"
          />
        </div>

        <!-- Right: Open Studio Button & Count Badge -->
        <div class="flex items-center gap-2">
          <UiButton
            variant="ghost"
            size="xs"
            :leading-icon="Wrench"
            custom-class="text-amber-300 hover:bg-amber-500/20 border border-amber-500/40"
            @click="openProjectileStudio"
          >
            {{ t('towers.projectileStudio') }}
          </UiButton>

          <UiBadge variant="amber" size="sm">
            {{ filteredProjectiles.length }} / {{ allAvailableProjectiles.length }} {{ t('towers.projectilesLabel') || 'Turlari' }}
          </UiBadge>
        </div>
      </div>

      <!-- 3. Elemental Category Tabs -->
      <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 pt-0.5">
        <button
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0',
            selectedCategory === 'all'
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm ring-1 ring-amber-400/40'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
          ]"
          @click="selectedCategory = 'all'"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>{{ t('sidebar.allCategories') || 'Barchasi' }} ({{ allAvailableProjectiles.length }})</span>
        </button>

        <button
          v-for="cat in availableCategories"
          :key="cat.id"
          type="button"
          :class="[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0',
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

      <!-- 4. Spacious Responsive Projectiles Grid -->
      <div class="overflow-y-auto custom-scrollbar pr-1 max-h-[38vh] p-1">
        <div v-if="filteredProjectiles.length === 0" class="flex flex-col items-center justify-center py-10 text-slate-500 text-xs gap-2 text-center">
          <Crosshair class="w-8 h-8 text-slate-600" />
          <span>Mos keladigan snaryadlar topilmadi.</span>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          <div
            v-for="proj in filteredProjectiles"
            :key="proj.id"
            :class="[
              'group relative flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer select-none text-left',
              tempSelectedId === proj.id
                ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-[1.02]'
                : 'bg-slate-900/90 border-slate-800/80 hover:bg-slate-800/90 hover:border-slate-700'
            ]"
            @click="tempSelectedId = proj.id"
            @mouseenter="previewHoverId = proj.id"
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

      <!-- 5. Modal Action Buttons Footer -->
      <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <!-- Selected Preview Hint -->
        <div class="flex items-center gap-2 min-w-0">
          <span class="text-xs text-slate-400 hidden sm:inline">{{ t('common.selected') }}:</span>
          <span class="text-xs font-bold text-amber-300 truncate">
            {{ getLocalizedName(activeSelectedDef) }} ({{ activeSelectedDef?.category.toUpperCase() }})
          </span>
        </div>

        <div class="flex items-center gap-2">
          <UiButton
            variant="secondary"
            size="sm"
            @click="emit('close')"
          >
            {{ t('common.cancel') || 'Bekor qilish' }}
          </UiButton>

          <UiButton
            variant="game-amber"
            size="sm"
            :leading-icon="Check"
            @click="applySelection"
          >
            {{ t('common.save') || 'Tanlash' }}
          </UiButton>
        </div>
      </div>
    </div>
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
import { getProjectileTheme, renderCanvasProjectileHead } from '../../utils/projectileEffectRenderer'
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

// Animation Loop for Arena Firing Simulation
let arenaAnimId: number | null = null
let lastTime = 0
let arenaShootTimer = 0

interface ArenaProj {
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  progress: number
  speed: number
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
  type: 'ice_shard' | 'snowflake' | 'fire_ember' | 'lightning_arc' | 'acid_drop' | 'arcane_star' | 'void_blood' | 'shrapnel' | 'holy_cross' | 'default'
  rot: number
  vRot: number
}

const arenaProjectiles: ArenaProj[] = []
const arenaShockwaves: ArenaShockwave[] = []
const arenaSparks: ArenaSpark[] = []

const activeSelectedDef = computed(() => {
  return getProjectileDef(previewHoverId.value || tempSelectedId.value)
})

watch(() => props.isOpen, (open) => {
  if (open) {
    tempSelectedId.value = props.modelValue || 'fireball'
    previewHoverId.value = null
    searchQuery.value = ''
    const current = getProjectileDef(tempSelectedId.value)
    if (current) {
      selectedCategory.value = current.category
    }
    arenaProjectiles.length = 0
    arenaShockwaves.length = 0
    arenaSparks.length = 0
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

function spawnArenaShot() {
  if (!arenaCanvasRef.value) return
  const canvas = arenaCanvasRef.value
  const dpr = window.devicePixelRatio || 1
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  const startX = 40
  const startY = h * 0.5 + 4
  const targetX = w - 48
  const targetY = h * 0.5 + 4

  const curDef = activeSelectedDef.value
  const durationSec = curDef.isLaser ? 0.35 : 0.65

  arenaProjectiles.push({
    startX,
    startY,
    targetX,
    targetY,
    currentX: startX,
    currentY: startY,
    progress: 0,
    speed: 1 / durationSec,
    type: curDef.id,
    color: curDef.colorHex,
    trail: []
  })
}

function handleArenaImpact(p: ArenaProj) {
  const theme = getProjectileTheme(p.type, p.color)
  const projDef = getProjectileDef(p.type)
  const cat = projDef?.category || 'siege'
  const isFire = cat === 'fire'

  // 1. Shockwave ring
  arenaShockwaves.push({
    x: p.targetX,
    y: p.targetY,
    rx: 4,
    ry: 2,
    maxRadius: 26,
    color: theme.shockwaveColorCss,
    alpha: 1.0,
    life: 0.45
  })

  if (isFire) {
    arenaShockwaves.push({
      x: p.targetX,
      y: p.targetY,
      rx: 2,
      ry: 1,
      maxRadius: 16,
      color: '#fef08a',
      alpha: 1.0,
      life: 0.35
    })
  }

  // 2. Specialized Elemental Sparks
  const sparkCount = isFire ? 24 : 16
  for (let i = 0; i < sparkCount; i++) {
    const ang = Math.random() * Math.PI * 2
    const spd = (cat === 'electro' ? 80 : 35) + Math.random() * (cat === 'fire' || cat === 'frost' ? 90 : 70)

    let sType: ArenaSpark['type'] = 'default'
    let sCol = theme.sparkColorCss
    let sSize = 1.6 + Math.random() * 2.2
    let sLife = 0.32 + Math.random() * 0.2

    if (cat === 'frost') {
      sType = i % 3 === 0 ? 'snowflake' : 'ice_shard'
      sCol = i % 3 === 0 ? '#ffffff' : (i % 2 === 0 ? '#67e8f9' : '#38bdf8')
      sSize = 2.2 + Math.random() * 2.5
    } else if (cat === 'fire') {
      sType = 'fire_ember'
      sCol = i % 4 === 0 ? '#fef08a' : (i % 3 === 0 ? '#fbbf24' : (i % 2 === 0 ? '#f97316' : '#ef4444'))
      sSize = 1.8 + Math.random() * 3.0
    } else if (cat === 'electro') {
      sType = 'lightning_arc'
      sCol = i % 2 === 0 ? '#38bdf8' : (i % 3 === 0 ? '#ffffff' : '#60a5fa')
      sSize = 1.5 + Math.random() * 2.0
      sLife = 0.2 + Math.random() * 0.12
    } else if (cat === 'poison') {
      sType = 'acid_drop'
      sCol = i % 3 === 0 ? '#d9f99d' : (i % 2 === 0 ? '#84cc16' : '#22c55e')
      sSize = 2.2 + Math.random() * 2.4
    } else if (cat === 'arcane') {
      sType = 'arcane_star'
      sCol = i % 3 === 0 ? '#ffffff' : (i % 2 === 0 ? '#c084fc' : '#a855f7')
      sSize = 2.4 + Math.random() * 2.8
    } else if (cat === 'void') {
      sType = 'void_blood'
      sCol = i % 3 === 0 ? '#881337' : (i % 2 === 0 ? '#f43f5e' : '#7c3aed')
      sSize = 2.0 + Math.random() * 2.4
    } else if (cat === 'holy') {
      sType = 'holy_cross'
      sCol = i % 2 === 0 ? '#ffffff' : '#fde047'
      sSize = 2.6 + Math.random() * 2.8
    } else if (cat === 'siege') {
      sType = 'shrapnel'
      sCol = i % 3 === 0 ? '#f59e0b' : (i % 2 === 0 ? '#94a3b8' : '#64748b')
    }

    arenaSparks.push({
      x: p.targetX,
      y: p.targetY,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      color: sCol,
      alpha: 1.0,
      size: sSize,
      life: sLife,
      maxLife: sLife,
      type: sType,
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 12
    })
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

  // Spawn periodic test shots
  arenaShootTimer += dt
  if (arenaShootTimer >= 0.75) {
    arenaShootTimer = 0
    spawnArenaShot()
  }

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  // Arena Background with subtle grid lines
  ctx.fillStyle = '#060a12'
  ctx.fillRect(0, 0, w, h)

  // Track guideline
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(40, h * 0.5 + 4)
  ctx.lineTo(w - 48, h * 0.5 + 4)
  ctx.stroke()
  ctx.setLineDash([])

  // Left Turret Cannon Muzzle Graphic
  ctx.fillStyle = '#1e293b'
  ctx.strokeStyle = activeSelectedDef.value.colorCss
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(36, h * 0.5 + 4, 12, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = activeSelectedDef.value.colorCss
  ctx.beginPath()
  ctx.arc(36, h * 0.5 + 4, 4, 0, Math.PI * 2)
  ctx.fill()

  // Right Target Dummy Graphic
  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = '#ef4444'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(w - 48, h * 0.5 + 4, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(w - 48, h * 0.5 + 4, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#ef4444'
  ctx.fill()

  // 1. Shockwaves
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

  // 2. Projectiles
  for (let i = arenaProjectiles.length - 1; i >= 0; i--) {
    const p = arenaProjectiles[i]
    p.progress += p.speed * dt
    p.currentX = p.startX + (p.targetX - p.startX) * p.progress

    const theme = getProjectileTheme(p.type, p.color)
    const arcHeight = !theme.hasArc ? 0 : 20
    const dx = p.targetX - p.startX
    const dy = p.targetY - p.startY
    p.currentY = p.startY + dy * p.progress - (theme.hasArc ? Math.sin(p.progress * Math.PI) * arcHeight : 0)

    p.trail.push({ x: p.currentX, y: p.currentY, alpha: 1.0, size: 3.5 })
    if (p.trail.length > 8) p.trail.shift()

    for (let t = 0; t < p.trail.length; t++) {
      const pt = p.trail[t]
      pt.alpha = Math.max(0, pt.alpha - 0.05)
      if (pt.alpha <= 0) continue

      ctx.beginPath()
      ctx.arc(pt.x, pt.y, Math.max(1, (t / p.trail.length) * 3.5), 0, Math.PI * 2)
      ctx.fillStyle = theme.trailColorCss
      ctx.globalAlpha = pt.alpha
      ctx.fill()
      ctx.globalAlpha = 1.0
    }

    const vx = dx
    const vy = dy - (theme.hasArc ? Math.cos(p.progress * Math.PI) * Math.PI * arcHeight : 0)
    const angle = Math.atan2(vy, vx)

    renderCanvasProjectileHead(
      ctx,
      p.type,
      p.currentX,
      p.currentY,
      angle,
      p.startX,
      p.startY,
      p.progress,
      time
    )

    if (p.progress >= 1.0) {
      handleArenaImpact(p)
      arenaProjectiles.splice(i, 1)
    }
  }

  // 3. Sparks
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

  // Render live animated thumbnail on visible card canvases
  for (const [projId, canvas] of cardCanvasMap.entries()) {
    const cCtx = canvas.getContext('2d')
    if (!cCtx) continue
    const cw = canvas.width
    const ch = canvas.height
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
  arenaCanvasRef.value.width = (rect.width || 600) * dpr
  arenaCanvasRef.value.height = (rect.height || 140) * dpr
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
