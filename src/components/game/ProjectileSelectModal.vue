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
      <!-- 1. LEFT COLUMN: LIVE ARENA STAGE -->
      <div class="w-full lg:w-84 xl:w-92 shrink-0 flex flex-col gap-2.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80">
        <!-- Top HUD Active Projectile Badge -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg min-w-0 flex-1">
            <span 
              class="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm shrink-0"
              :style="{ backgroundColor: activeDef?.visual.colorCss || '#f59e0b' }"
            />
            <span class="text-xs font-bold text-slate-100 truncate">
              {{ getLocalizedName(activeDef) }}
            </span>
            <span 
              class="text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider border shrink-0"
              :class="activeArchetypeMeta.badgeClass"
            >
              {{ activeArchetypeMeta.nameUz.split(' ')[0] }}
            </span>
          </div>

          <span class="text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 shrink-0">
            PixiJS Arena
          </span>
        </div>

        <!-- Dedicated Square 1:1 Live Arena Canvas -->
        <div 
          class="relative w-full aspect-square rounded-2xl bg-slate-950 border border-slate-800/90 shadow-2xl overflow-hidden flex items-center justify-center group cursor-crosshair"
          @click="spawnManualShot"
        >
          <canvas ref="arenaCanvasRef" class="w-full h-full block"></canvas>

          <!-- Top-Right Type Badges -->
          <div class="absolute top-2.5 right-2.5 pointer-events-none flex flex-col items-end gap-1">
            <span 
              class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-md"
              :class="activeArchetypeMeta.badgeClass"
            >
              {{ activeArchetypeMeta.nameUz.toUpperCase() }}
            </span>
            <span v-if="activeDef?.movement.hasArc" class="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-800/60 shadow-md">
              ARC
            </span>
          </div>

          <!-- Bottom hint overlay -->
          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-slate-700/80 text-[10px] text-slate-300 shadow-lg whitespace-nowrap">
            {{ t('projectiles.clickArenaHint') || 'Bosing: snaryad otish' }}
          </div>
        </div>

        <!-- Projectile Info & Details Card -->
        <div class="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-xs">
          <p class="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
            {{ activeDef?.identity.description || t('projectiles.defaultDesc') }}
          </p>

          <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-800 text-[10px] font-mono text-slate-400">
            <span class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              {{ t('projectiles.shapeLabel') || 'Shakl' }}: {{ activeDef?.movement.isInstant ? activeDef?.movement.instantType : activeDef?.visual.shape }}
            </span>
            <span class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">
              {{ t('projectiles.sparkLabel') || 'Zarba' }}: {{ activeDef?.impact.sparkType }}
            </span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <UiButton
            variant="game-amber"
            size="sm"
            :leading-icon="Check"
            custom-class="flex-1 justify-center"
            @click="selectAndApply(selectedId)"
          >
            {{ t('common.select') }}
          </UiButton>
          <UiButton
            variant="ghost"
            size="sm"
            :leading-icon="Wrench"
            custom-class="text-amber-300 hover:bg-amber-500/20 border border-amber-500/40"
            @click="openProjectileStudio"
          >
            {{ t('towers.projectileStudio') }}
          </UiButton>
        </div>
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
            {{ filteredProjectiles.length }} / {{ projectileStore.allProjectiles.length }}
          </UiBadge>
        </div>

        <!-- Archetype Filter Tabs (Uchuvchi, Osmondan, Yerdan, Aura, Lazer) -->
        <div class="flex flex-wrap items-center gap-1.5 py-0.5">
          <button
            type="button"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0',
              selectedArchetypeTab === 'all'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            @click="selectedArchetypeTab = 'all'"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ t('common.all') }}</span>
          </button>

          <button
            v-for="arch in PROJECTILE_ARCHETYPES"
            :key="arch.id"
            type="button"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer shrink-0',
              selectedArchetypeTab === arch.id
                ? 'bg-slate-800 border-amber-400 text-amber-300 shadow-xs ring-1 ring-amber-400/40 font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            @click="selectedArchetypeTab = arch.id"
          >
            <component :is="arch.icon" class="w-3.5 h-3.5" />
            <span>{{ arch.nameUz }}</span>
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
              :key="proj.identity.id"
              :class="[
                'group relative flex items-center gap-2.5 p-2.5 rounded-2xl border transition-all cursor-pointer select-none text-left',
                selectedId === proj.identity.id
                  ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg scale-[1.01]'
                  : 'bg-slate-900/90 border-slate-800/80 hover:bg-slate-800/90 hover:border-slate-700'
              ]"
              @click="selectedId = proj.identity.id"
              @dblclick="selectAndApply(proj.identity.id)"
            >
              <div 
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner relative bg-slate-950"
                :style="{ 
                  borderColor: `${proj.visual.colorCss}50`
                }"
              >
                <div 
                  class="w-3.5 h-3.5 rounded-full shadow-md"
                  :style="{ backgroundColor: proj.visual.colorCss }"
                />
              </div>

              <div class="flex flex-col min-w-0 flex-1">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-slate-100 truncate group-hover:text-amber-300 transition-colors">
                    {{ getLocalizedName(proj) }}
                  </span>
                  <span 
                    class="text-[8px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider"
                    :class="getArchetypeMeta(proj).badgeClass"
                  >
                    {{ getArchetypeMeta(proj).nameUz.split(' ')[0] }}
                  </span>
                </div>
                <div class="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                  <span class="capitalize">{{ proj.movement.isInstant ? (proj.movement.instantType || 'instant') : proj.visual.shape }}</span>
                  <span>•</span>
                  <span class="capitalize">{{ proj.identity.category }}</span>
                </div>
              </div>

              <Check 
                v-if="selectedId === proj.identity.id"
                class="w-4 h-4 text-amber-400 shrink-0" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Application, Graphics } from 'pixi.js'
import { Crosshair, Search, Sparkles, Check, Wrench } from 'lucide-vue-next'
import { useI18n } from '../../stores/i18nStore'
import { useProjectileStore } from '../../stores/projectileStore'
import {
  PROJECTILE_ARCHETYPES,
  getProjectileArchetype
} from '../../utils/projectileCatalog'
import { ProjectileRenderer } from '../../rendering/pixi/ProjectileRenderer'
import { ProjectileDefinition, ProjectileArchetype } from '../../types/projectile'
import UiModal from '../ui/UiModal.vue'
import UiInput from '../ui/UiInput.vue'
import UiBadge from '../ui/UiBadge.vue'
import UiButton from '../ui/UiButton.vue'

const props = defineProps<{
  isOpen: boolean
  currentProjectileId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', projectileId: string): void
}>()

const router = useRouter()
const { t, currentLocale } = useI18n()
const projectileStore = useProjectileStore()

const searchQuery = ref('')
const selectedArchetypeTab = ref<string>('all')
const selectedId = ref<string>(props.currentProjectileId || 'fireball')

const arenaCanvasRef = ref<HTMLCanvasElement | null>(null)
let app: Application | null = null
let combatGraphics: Graphics | null = null

interface ArenaProj {
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  progress: number
  speed: number
  def: ProjectileDefinition
  trail: { x: number; y: number; alpha: number; size: number }[]
}

interface ArenaStrike {
  x: number
  y: number
  life: number
  def: ProjectileDefinition
}

const activeProjectiles: ArenaProj[] = []
const activeStrikes: ArenaStrike[] = []

const activeDef = computed<ProjectileDefinition>(() => {
  return projectileStore.getProjectile(selectedId.value)
})

const activeArchetype = computed<ProjectileArchetype>(() => {
  return getProjectileArchetype(activeDef.value)
})

const activeArchetypeMeta = computed(() => {
  return PROJECTILE_ARCHETYPES.find(a => a.id === activeArchetype.value) || PROJECTILE_ARCHETYPES[0]
})

function getArchetypeMeta(proj: ProjectileDefinition) {
  const arch = getProjectileArchetype(proj)
  return PROJECTILE_ARCHETYPES.find(a => a.id === arch) || PROJECTILE_ARCHETYPES[0]
}

const filteredProjectiles = computed(() => {
  let list = projectileStore.allProjectiles
  if (selectedArchetypeTab.value !== 'all') {
    list = list.filter(p => getProjectileArchetype(p) === selectedArchetypeTab.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p =>
      p.identity.name.toLowerCase().includes(q) ||
      (p.identity.nameUz && p.identity.nameUz.toLowerCase().includes(q)) ||
      p.visual.shape.toLowerCase().includes(q) ||
      (p.movement.instantType && p.movement.instantType.toLowerCase().includes(q))
    )
  }
  return list
})

function getLocalizedName(proj?: ProjectileDefinition): string {
  if (!proj) return ''
  return (currentLocale.value === 'uz' && proj.identity.nameUz) ? proj.identity.nameUz : proj.identity.name
}

function selectAndApply(id: string) {
  emit('select', id)
  emit('close')
}

function openProjectileStudio() {
  emit('close')
  router.push('/projectile-editor')
}

async function initArenaPixi() {
  if (!arenaCanvasRef.value) return

  app = new Application()
  await app.init({
    canvas: arenaCanvasRef.value,
    width: 320,
    height: 320,
    background: 0x020617,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  })

  combatGraphics = new Graphics()
  app.stage.addChild(combatGraphics)

  arenaTickerFn = (ticker: any) => {
    updateArena(ticker.deltaTime / 60)
  }
  app.ticker.add(arenaTickerFn)
}

let arenaTickerFn: ((ticker: any) => void) | null = null

function cleanArenaPixi() {
  if (app) {
    const curApp = app
    app = null
    try {
      if (arenaTickerFn && curApp.ticker) {
        curApp.ticker.remove(arenaTickerFn)
      }
      curApp.stop()
    } catch {}
    arenaTickerFn = null

    try {
      if (combatGraphics && !(combatGraphics as any).destroyed) {
        combatGraphics.destroy()
      }
    } catch {}
    combatGraphics = null

    try {
      curApp.destroy(false)
    } catch {}
  }
  activeProjectiles.length = 0
  activeStrikes.length = 0
  autoSpawnTimer = 0
}

function spawnManualShot() {
  if (!app) return
  const w = app.screen.width
  const h = app.screen.height
  const startX = w * 0.25
  const startY = h * 0.75

  const targetX = w * 0.72
  const targetY = h * 0.35

  const def = activeDef.value
  const arch = activeArchetype.value

  if (arch === 'sky_strike' || arch === 'ground_burst') {
    activeStrikes.push({
      x: targetX,
      y: targetY,
      life: 0.45,
      def
    })
    return
  }

  if (arch === 'unit_aura' || arch === 'laser') {
    return
  }

  const dist = Math.hypot(targetX - startX, targetY - startY) || 1
  const speed = Math.max(1, def.movement.speed * 20)
  const durationSec = Math.max(0.25, dist / speed)

  activeProjectiles.push({
    startX,
    startY,
    targetX,
    targetY,
    currentX: startX,
    currentY: startY,
    progress: 0,
    speed: 1 / durationSec,
    def,
    trail: []
  })
}

let autoSpawnTimer = 0

function updateArena(dt: number) {
  if (!app || !combatGraphics || (combatGraphics as any).destroyed) return

  const w = app.screen.width
  const h = app.screen.height
  try {
    if (combatGraphics && !(combatGraphics as any).destroyed && typeof combatGraphics.clear === 'function') {
      combatGraphics.clear()

      // Background Grid / Target glyph
      combatGraphics.ellipse(w * 0.5, h * 0.52, 70, 35).stroke({ width: 1, color: 0x1e293b, alpha: 0.5 })
      combatGraphics.ellipse(w * 0.72, h * 0.35, 20, 10).stroke({ width: 1.2, color: 0xef4444, alpha: 0.6 })
      combatGraphics.circle(w * 0.25, h * 0.75, 5).fill({ color: 0x38bdf8, alpha: 0.85 })
    }
  } catch {
    return
  }

  autoSpawnTimer -= dt
  if (autoSpawnTimer <= 0) {
    autoSpawnTimer = 0.7
    spawnManualShot()
  }

  const nowTime = performance.now()
  const arch = activeArchetype.value
  const targetX = w * 0.72
  const targetY = h * 0.35

  // 1. LASER
  if (arch === 'laser') {
    ProjectileRenderer.renderHead(
      combatGraphics,
      activeDef.value,
      targetX,
      targetY - 6,
      0,
      w * 0.25,
      h * 0.75,
      nowTime
    )
  }

  // 2. AURA
  if (arch === 'unit_aura') {
    ProjectileRenderer.renderHead(
      combatGraphics,
      activeDef.value,
      targetX,
      targetY - 6,
      0,
      targetX,
      targetY - 6,
      nowTime
    )
  }

  // 3. STRIKES (Sky / Ground)
  for (let i = activeStrikes.length - 1; i >= 0; i--) {
    const s = activeStrikes[i]
    s.life -= dt
    if (s.life <= 0) {
      activeStrikes.splice(i, 1)
    } else {
      ProjectileRenderer.renderHead(
        combatGraphics,
        s.def,
        s.x,
        s.y,
        0,
        s.x,
        s.y,
        nowTime
      )
    }
  }

  // 4. FLYING
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]
    p.progress += p.speed * dt
    const prog = Math.min(1.0, p.progress)

    const dx = p.targetX - p.startX
    const dy = p.targetY - p.startY
    const totalDist = Math.hypot(dx, dy) || 1

    const groundX = p.startX + dx * prog
    const groundY = p.startY + dy * prog

    const hasArc = Boolean(p.def.movement.hasArc)
    const arcHeight = hasArc ? Math.sin(prog * Math.PI) * Math.min(50, totalDist * 0.25) : 0
    const renderY = groundY - arcHeight

    combatGraphics.ellipse(groundX, groundY, 10, 5).fill({ color: 0x000000, alpha: 0.25 })

    p.trail.push({ x: groundX, y: renderY, alpha: 1.0, size: p.def.trail.width || 4 })
    if (p.trail.length > (p.def.trail.length || 8)) p.trail.shift()

    const vx = dx
    const vy = dy - (hasArc ? Math.cos(prog * Math.PI) * Math.PI * 25 : 0)
    const angle = Math.atan2(vy, vx)

    ProjectileRenderer.renderTrail(combatGraphics, p.def, p.trail, nowTime)
    ProjectileRenderer.renderHead(combatGraphics, p.def, groundX, renderY, angle, p.startX, p.startY, nowTime)

    if (p.progress >= 1.0) {
      activeProjectiles.splice(i, 1)
    }
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    selectedId.value = props.currentProjectileId || selectedId.value || 'fireball'
    setTimeout(() => {
      if (!app) initArenaPixi()
    }, 50)
  } else {
    cleanArenaPixi()
  }
})

onMounted(() => {
  if (props.isOpen) {
    initArenaPixi()
  }
})

onUnmounted(() => {
  cleanArenaPixi()
})
</script>
