<template>
  <div class="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-xl select-none flex flex-col">
    <!-- Main Live Simulation Pixi Canvas -->
    <div ref="containerRef" class="relative w-full h-52 sm:h-56 bg-slate-950 overflow-hidden">
      <canvas ref="canvasRef" class="w-full h-full block"></canvas>

      <!-- Absolute Top-Left Asset / Sprite Name Badge -->
      <div class="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-slate-200">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span class="text-[11px] font-mono font-bold text-amber-300 truncate max-w-40 sm:max-w-48">
          {{ blueprint.assetName || blueprint.name || 'Custom' }}
        </span>
      </div>

      <!-- Live Speed & Projectile Info -->
      <div class="absolute bottom-2.5 right-2.5 z-10 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-300">
        <span class="text-amber-400 font-bold truncate max-w-32">{{ activeDef.identity.name }}</span>
        <span>|</span>
        <span>{{ currentAttackSpeed }}s</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { Application, Container, Graphics, Sprite, Texture, Assets } from 'pixi.js'
import { TowerBlueprint, TowerLevelConfig } from '../../types/tower'
import { useAssetStore } from '../../stores/assetStore'
import { getProjectileDefinition, getProjectileArchetype } from '../../utils/projectileCatalog'
import { ProjectileRenderer } from '../../rendering/pixi/ProjectileRenderer'
import { ProjectileDefinition, ProjectileArchetype } from '../../types/projectile'

const props = defineProps<{
  blueprint: TowerBlueprint
  levelConfig?: TowerLevelConfig
}>()

const assetStore = useAssetStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let app: Application | null = null
let stageContainer: Container | null = null
let towerSprite: Sprite | null = null
let rangeGraphics: Graphics | null = null
let combatGraphics: Graphics | null = null

let cooldownTimer = 0
let shotAngleIndex = 0

interface LiveProj {
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  progress: number
  speed: number
  offsetPerp?: number
  phaseOffset?: number
  isHelix?: boolean
  def: ProjectileDefinition
  trail: { x: number; y: number; alpha: number; size: number }[]
}

interface LiveSpark {
  x: number
  y: number
  vx: number
  vy: number
  color: number
  alpha: number
  size: number
  life: number
}

interface LiveRing {
  x: number
  y: number
  r: number
  maxR: number
  color: number
  alpha: number
}

interface LiveStrike {
  x: number
  y: number
  life: number
  def: ProjectileDefinition
}

const activeProjectiles: LiveProj[] = []
const activeSparks: LiveSpark[] = []
const activeRings: LiveRing[] = []
const activeStrikes: LiveStrike[] = []

const activeDef = computed<ProjectileDefinition>(() => {
  const projId =
    props.levelConfig?.projectileId ||
    props.levelConfig?.projectileType ||
    props.blueprint.projectileId ||
    props.blueprint.projectileType ||
    'fireball'
  return getProjectileDefinition(projId)
})

const activeArchetype = computed<ProjectileArchetype>(() => {
  return getProjectileArchetype(activeDef.value)
})

const currentAttackSpeed = computed(() => {
  return props.levelConfig?.attackSpeed || props.blueprint.attackSpeed || 1.0
})

const currentRange = computed(() => {
  return props.levelConfig?.range || props.blueprint.range || 3
})

async function initPixi() {
  if (!canvasRef.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  const w = rect.width || 300
  const h = rect.height || 220

  app = new Application()
  await app.init({
    canvas: canvasRef.value,
    width: w,
    height: h,
    background: 0x020617,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  })

  stageContainer = new Container()
  app.stage.addChild(stageContainer)

  rangeGraphics = new Graphics()
  towerSprite = new Sprite()
  towerSprite.anchor.set(0.5, 0.75)
  combatGraphics = new Graphics()

  stageContainer.addChild(rangeGraphics)
  stageContainer.addChild(towerSprite)
  stageContainer.addChild(combatGraphics)

  updateTowerTexture()

  app.ticker.add((ticker) => {
    updateSimulation(ticker.deltaTime / 60)
  })
}

function updateTowerTexture() {
  if (!towerSprite) return
  const src = assetStore.getAssetPreview(props.blueprint.assetId || props.blueprint.assetName) || props.blueprint.assetPath
  if (src) {
    Assets.load<Texture>(src).then((tex) => {
      if (towerSprite && tex) {
        towerSprite.texture = tex
        const maxDim = 80
        const scale = Math.min(maxDim / tex.width, maxDim / tex.height) * (props.blueprint.scale || 1.0)
        towerSprite.scale.set(scale)
      }
    }).catch(() => {})
  }
}

watch(() => [props.blueprint.assetId, props.blueprint.assetName, props.blueprint.assetPath, props.blueprint.scale], () => {
  updateTowerTexture()
})

function spawnShot(w: number, h: number) {
  const muzzleX = w * 0.5 + (props.blueprint.muzzleOffsetX ?? 0)
  const muzzleY = h * 0.5 - 20 + (props.blueprint.muzzleOffsetY ?? 0)

  const targetAngles = [
    -Math.PI * 0.25,
    -Math.PI * 0.75,
    -Math.PI * 0.12,
    -Math.PI * 0.88,
    -Math.PI * 0.50,
    Math.PI * 0.20,
    Math.PI * 0.80,
  ]
  const angle = targetAngles[shotAngleIndex % targetAngles.length]
  shotAngleIndex++

  const range = Math.max(1, Math.min(10, currentRange.value))
  const dist = Math.min(w * 0.44, h * 0.44) * (0.55 + Math.min(1.0, range / 8) * 0.45)
  const targetX = muzzleX + Math.cos(angle) * dist
  const targetY = muzzleY + Math.sin(angle) * dist * 0.75

  const def = activeDef.value
  const arch = activeArchetype.value

  if (arch === 'sky_strike' || arch === 'ground_burst') {
    activeStrikes.push({
      x: targetX,
      y: targetY,
      life: 0.45,
      def
    })
    handleImpact({ targetX, targetY, def } as LiveProj)
    return
  }

  if (arch === 'unit_aura') {
    handleImpact({ targetX, targetY, def } as LiveProj)
    return
  }

  if (arch === 'laser') {
    return
  }

  const speedTilesSec = Math.max(4, def.movement.speed || props.blueprint.projectileSpeed || 12)
  const durationSec = Math.max(0.2, (range * 0.8) / speedTilesSec)
  const formationType = def.formation?.type || 'single'

  const pushProj = (offsetPerp = 0, phaseOffset = 0, isHelix = false, progOffset = 0) => {
    activeProjectiles.push({
      startX: muzzleX,
      startY: muzzleY,
      targetX,
      targetY,
      currentX: muzzleX,
      currentY: muzzleY,
      progress: progOffset,
      speed: 1 / durationSec,
      offsetPerp,
      phaseOffset,
      isHelix,
      def,
      trail: []
    })
  }

  if (formationType === 'single_helix') {
    pushProj(14, 0, true)
  } else if (formationType === 'volley_3') {
    pushProj(-18, 0, false)
    pushProj(0, 0, false)
    pushProj(18, 0, false)
  } else if (formationType === 'volley_5') {
    pushProj(-28, 0, false)
    pushProj(-14, 0, false)
    pushProj(0, 0, false)
    pushProj(14, 0, false)
    pushProj(28, 0, false)
  } else if (formationType === 'twin_helix') {
    pushProj(14, 0, true)
    pushProj(14, Math.PI, true)
  } else if (formationType === 'triple_helix') {
    pushProj(15, 0, true)
    pushProj(15, (2 * Math.PI) / 3, true)
    pushProj(15, (4 * Math.PI) / 3, true)
  } else if (formationType === 'fan_spread') {
    const fanOffsets = [-32, -16, 0, 16, 32]
    fanOffsets.forEach((off) => pushProj(off, 0, false))
  } else if (formationType === 'ring_burst') {
    const ringCount = 6
    for (let r = 0; r < ringCount; r++) {
      const ang = (Math.PI * 2 * r) / ringCount
      pushProj(Math.sin(ang) * 22, ang, false)
    }
  } else if (formationType === 'cluster_burst') {
    pushProj(-10, 0, false)
    pushProj(0, 0.4, false)
    pushProj(10, 0.8, false)
  } else if (formationType === 'staggered_burst') {
    pushProj(-6, 0, false, 0)
    pushProj(0, 0, false, -0.15)
    pushProj(6, 0, false, -0.30)
  } else {
    pushProj(0, 0, false)
  }
}

function handleImpact(p: { targetX: number; targetY: number; def: ProjectileDefinition }) {
  const def = p.def
  const sparkCount = def.impact.sparkCount || 16
  const sparkColor = def.impact.sparkColorHex || 0xfbbf24

  activeRings.push({
    x: p.targetX,
    y: p.targetY,
    r: 4,
    maxR: def.impact.shockwaveRadius || 24,
    color: def.impact.shockwaveColorHex || 0xef4444,
    alpha: 0.9
  })

  if (def.impact.hasDoubleRing) {
    activeRings.push({
      x: p.targetX,
      y: p.targetY,
      r: 2,
      maxR: (def.impact.shockwaveRadius || 24) * 0.65,
      color: def.visual.glowColorHex || 0xffffff,
      alpha: 0.75
    })
  }

  for (let s = 0; s < sparkCount; s++) {
    const angle = (Math.PI * 2 * s) / sparkCount + (Math.random() - 0.5) * 0.5
    const spd = 30 + Math.random() * 60
    activeSparks.push({
      x: p.targetX,
      y: p.targetY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd * 0.7,
      color: sparkColor,
      alpha: 1.0,
      size: 1.5 + Math.random() * 2.0,
      life: 0.35 + Math.random() * 0.2,
    })
  }
}

function updateSimulation(dt: number) {
  if (!app || !combatGraphics || !rangeGraphics || !canvasRef.value) return
  if (combatGraphics.destroyed || rangeGraphics.destroyed) return

  const w = app.screen.width
  const h = app.screen.height

  if (towerSprite && !towerSprite.destroyed) {
    towerSprite.position.set(w * 0.5, h * 0.5)
  }

  // Range ring
  try {
    if (rangeGraphics && !(rangeGraphics as any).destroyed && typeof rangeGraphics.clear === 'function') {
      rangeGraphics.clear()
      const rangeRadius = Math.min(w * 0.44, h * 0.44) * (0.55 + Math.min(1.0, currentRange.value / 8) * 0.45)
      rangeGraphics.ellipse(w * 0.5, h * 0.5, rangeRadius, rangeRadius * 0.6)
        .stroke({ width: 1, color: 0x38bdf8, alpha: 0.25 })
    }

    if (combatGraphics && !(combatGraphics as any).destroyed && typeof combatGraphics.clear === 'function') {
      combatGraphics.clear()
    }
  } catch {
    return
  }

  // Cooldown & Shooting
  const attackRate = Math.max(0.2, currentAttackSpeed.value)
  cooldownTimer -= dt
  if (cooldownTimer <= 0) {
    cooldownTimer = attackRate
    spawnShot(w, h)
  }

  const nowTime = performance.now()
  const arch = activeArchetype.value
  const muzzleX = w * 0.5 + (props.blueprint.muzzleOffsetX ?? 0)
  const muzzleY = h * 0.5 - 20 + (props.blueprint.muzzleOffsetY ?? 0)
  const previewTargetX = w * 0.78
  const previewTargetY = h * 0.38

  // 1. CONTINUOUS LASER
  if (arch === 'laser') {
    ProjectileRenderer.renderHead(
      combatGraphics,
      activeDef.value,
      previewTargetX,
      previewTargetY,
      0,
      muzzleX,
      muzzleY,
      nowTime
    )
    if (Math.random() < 0.3) {
      activeSparks.push({
        x: previewTargetX,
        y: previewTargetY,
        vx: (Math.random() - 0.5) * 45,
        vy: (Math.random() - 0.5) * 35,
        color: activeDef.value.visual.glowColorHex || 0xfbbf24,
        alpha: 1.0,
        size: 1.5 + Math.random() * 2,
        life: 0.2
      })
    }
  }

  // 2. CONTINUOUS UNIT AURA
  if (arch === 'unit_aura') {
    ProjectileRenderer.renderHead(
      combatGraphics,
      activeDef.value,
      previewTargetX,
      previewTargetY,
      0,
      previewTargetX,
      previewTargetY,
      nowTime
    )
  }

  // 3. SKY & GROUND STRIKES
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

  // 4. FLYING PROJECTILES
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]
    p.progress += p.speed * dt
    if (p.progress < 0) continue

    const prog = Math.min(1.0, p.progress)

    const dx = p.targetX - p.startX
    const dy = p.targetY - p.startY
    const totalDist = Math.hypot(dx, dy) || 1
    const perpX = -dy / totalDist
    const perpY = dx / totalDist

    const groundX = p.startX + dx * prog
    const groundY = p.startY + dy * prog

    let lateralX = 0
    let lateralY = 0
    if (p.isHelix) {
      const swirl = Math.sin(prog * Math.PI * 6 + (p.phaseOffset || 0)) * (p.offsetPerp || 14)
      lateralX = perpX * swirl
      lateralY = perpY * swirl * 0.5
    } else if (p.offsetPerp) {
      lateralX = perpX * p.offsetPerp
      lateralY = perpY * p.offsetPerp * 0.5
    }

    const hasArc = Boolean(p.def.movement.hasArc)
    const maxArc = hasArc ? Math.min(45, totalDist * 0.22) : 0
    const arcHeight = maxArc > 0 ? Math.sin(prog * Math.PI) * maxArc : 0
    const renderX = groundX + lateralX
    const renderY = groundY - arcHeight + lateralY

    // Ground Shadow
    const shadowAlpha = Math.max(0.1, 0.4 * (1 - (arcHeight / (maxArc || 1)) * 0.6))
    combatGraphics.ellipse(groundX + lateralX, groundY + lateralY, 8, 4).fill({ color: 0x000000, alpha: shadowAlpha })

    p.trail.push({ x: renderX, y: renderY, alpha: 1.0, size: p.def.trail.width || 4 })
    if (p.trail.length > (p.def.trail.length || 8)) p.trail.shift()

    const vx = dx
    const vy = dy - (hasArc ? Math.cos(prog * Math.PI) * Math.PI * 20 : 0)
    const angle = Math.atan2(vy, vx)

    ProjectileRenderer.renderTrail(combatGraphics, p.def, p.trail, nowTime)
    ProjectileRenderer.renderHead(combatGraphics, p.def, renderX, renderY, angle, p.startX, p.startY, nowTime)

    if (p.progress >= 1.0) {
      handleImpact({ targetX: p.targetX + lateralX, targetY: p.targetY + lateralY, def: p.def })
      activeProjectiles.splice(i, 1)
    }
  }

  // Shockwave Rings
  for (let i = activeRings.length - 1; i >= 0; i--) {
    const ring = activeRings[i]
    ring.r += (ring.maxR - ring.r) * dt * 10
    ring.alpha -= dt * 2.5
    if (ring.alpha <= 0 || ring.r >= ring.maxR * 0.95) {
      activeRings.splice(i, 1)
    } else {
      combatGraphics.ellipse(ring.x, ring.y, ring.r, ring.r * 0.55)
        .stroke({ width: 2, color: ring.color, alpha: ring.alpha })
    }
  }

  // Sparks
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const sp = activeSparks[i]
    sp.x += sp.vx * dt
    sp.y += sp.vy * dt
    sp.alpha -= dt * 2.8
    if (sp.alpha <= 0) {
      activeSparks.splice(i, 1)
    } else {
      combatGraphics.circle(sp.x, sp.y, sp.size).fill({ color: sp.color, alpha: sp.alpha })
    }
  }
}

onMounted(() => {
  initPixi()
})

onUnmounted(() => {
  if (app) {
    const curApp = app
    app = null
    stageContainer = null
    towerSprite = null
    rangeGraphics = null
    combatGraphics = null
    try {
      curApp.destroy(true, { children: true, texture: false })
    } catch {
      // Ignored
    }
  }
})
</script>
