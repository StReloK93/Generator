<template>
  <div class="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-xl select-none flex flex-col">
    <!-- Main Live Simulation Canvas -->
    <div ref="containerRef" class="relative w-full h-52 sm:h-56 bg-slate-950 overflow-hidden">
      <canvas ref="canvasRef" class="w-full h-full block"></canvas>

      <!-- Absolute Top-Left Asset / Sprite Name Badge -->
      <div class="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-slate-200">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span class="text-[11px] font-mono font-bold text-amber-300 truncate max-w-40 sm:max-w-48">
          {{ blueprint.assetName || blueprint.name || 'Custom' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { TowerBlueprint } from '../../stores/towerStore'
import { useAssetStore } from '../../stores/assetStore'

const props = defineProps<{
  blueprint: TowerBlueprint
}>()

const assetStore = useAssetStore()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Internal Animation State
let animationFrameId: number | null = null
let lastTimestamp = 0
let cooldownTimer = 0

// Tower Visual Recoil & Flash
let towerRecoil = 0
let muzzleFlashTimer = 0
let shotAngleIndex = 0

// Active Live Objects in Mini Arena
interface LiveProjectile {
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  progress: number // 0.0 to 1.0
  speed: number // per second
  type: string
  color: number
  isSplash: boolean
  splashRadius: number
  damage: number
  trail: { x: number; y: number; alpha: number; size: number }[]
}

interface LiveShockwave {
  x: number
  y: number
  rx: number
  ry: number
  maxRadius: number
  color: string
  alpha: number
  life: number
}

interface LiveSpark {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  size: number
  life: number
}

const activeProjectiles: LiveProjectile[] = []
const activeShockwaves: LiveShockwave[] = []
const activeSparks: LiveSpark[] = []

// Loaded Tower Image
let towerImage: HTMLImageElement | null = null
let loadedAssetSrc = ''

function loadTowerSprite() {
  const src = assetStore.getAssetPreview(props.blueprint.assetId || props.blueprint.assetName) || props.blueprint.assetPath
  if (src && src !== loadedAssetSrc) {
    loadedAssetSrc = src
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => {
      towerImage = img
    }
  }
}

watch(() => [props.blueprint.assetId, props.blueprint.assetName, props.blueprint.assetPath], () => {
  loadTowerSprite()
}, { immediate: true })

function spawnProjectile() {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const w = rect.width
  const h = rect.height

  // Building placed exactly in the DEAD CENTER
  const targetH = Math.min(100, Math.max(56, h * 0.52))
  const towerCenterX = w * 0.5
  const muzzleX = towerCenterX
  const muzzleY = h * 0.5 - targetH * 0.35

  // Target angles (cycles through dynamic firing directions)
  const targetAngles = [
    -Math.PI * 0.25, // Upper-right
    -Math.PI * 0.75, // Upper-left
    -Math.PI * 0.12, // Forward-right
    -Math.PI * 0.88, // Forward-left
    -Math.PI * 0.50, // Straight-up
    Math.PI * 0.20,  // Lower-right
    Math.PI * 0.80,  // Lower-left
  ]
  const angle = targetAngles[shotAngleIndex % targetAngles.length]
  shotAngleIndex++

  // Distance scaled by Range
  const range = Math.max(1, Math.min(12, props.blueprint.range || 3))
  const maxRangeDist = Math.min(w * 0.44, h * 0.44)
  const normDist = 0.55 + Math.min(1.0, range / 10) * 0.45
  const dist = maxRangeDist * normDist

  const targetX = muzzleX + Math.cos(angle) * dist
  const targetY = muzzleY + Math.sin(angle) * dist * 0.75

  const speedTilesSec = Math.max(4, props.blueprint.projectileSpeed || 12)
  const durationSec = Math.max(0.2, (range * 0.8) / speedTilesSec)

  activeProjectiles.push({
    startX: muzzleX,
    startY: muzzleY,
    targetX,
    targetY,
    currentX: muzzleX,
    currentY: muzzleY,
    progress: 0,
    speed: 1 / durationSec,
    type: props.blueprint.projectileType || 'fireball',
    color: props.blueprint.projectileColor || 0xf97316,
    isSplash: Boolean(props.blueprint.isSplash),
    splashRadius: props.blueprint.splashRadius || 1.5,
    damage: props.blueprint.damage || 25,
    trail: []
  })
}

function handleImpact(p: LiveProjectile) {
  // 1. Spawn Splash Shockwave Ring if AoE or standard impact
  const splashPx = Math.max(18, (p.splashRadius || 1.5) * 22)
  activeShockwaves.push({
    x: p.targetX,
    y: p.targetY,
    rx: 4,
    ry: 2,
    maxRadius: p.isSplash ? splashPx : 14,
    color: p.type === 'frost_bolt' ? '#06b6d4' : (p.type === 'laser' ? '#f43f5e' : (p.type === 'magic_bolt' ? '#38bdf8' : '#f97316')),
    alpha: 1.0,
    life: 0.5
  })

  // 2. Spawn Impact Spark Particles
  const sparkCount = p.isSplash ? 16 : 9
  for (let i = 0; i < sparkCount; i++) {
    const ang = Math.random() * Math.PI * 2
    const spd = 25 + Math.random() * 80
    activeSparks.push({
      x: p.targetX,
      y: p.targetY,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.7,
      color: p.type === 'frost_bolt' ? '#67e8f9' : (p.type === 'laser' ? '#f43f5e' : (p.type === 'magic_bolt' ? '#a855f7' : '#fbbf24')),
      alpha: 1.0,
      size: 2 + Math.random() * 2.5,
      life: 0.35 + Math.random() * 0.25
    })
  }
}

function renderFrame(time: number) {
  if (!canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const width = canvas.width / dpr
  const height = canvas.height / dpr

  if (lastTimestamp === 0) lastTimestamp = time
  const dt = Math.min(0.1, (time - lastTimestamp) / 1000)
  lastTimestamp = time

  // Auto Attack Cooldown Loop
  const attackInterval = Math.max(0.1, props.blueprint.attackSpeed || 1.0)
  cooldownTimer += dt

  if (cooldownTimer >= attackInterval) {
    cooldownTimer = 0
    spawnProjectile()
    towerRecoil = 1.0
    muzzleFlashTimer = 0.15
  }

  // Decay visual timers
  if (towerRecoil > 0) towerRecoil = Math.max(0, towerRecoil - dt * 6)
  if (muzzleFlashTimer > 0) muzzleFlashTimer = Math.max(0, muzzleFlashTimer - dt)

  // Clear background
  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, width, height)

  // Clean Ambient Background Gradient
  const bgGrad = ctx.createRadialGradient(width * 0.5, height * 0.5, 10, width * 0.5, height * 0.5, width * 0.65)
  bgGrad.addColorStop(0, '#0f172a')
  bgGrad.addColorStop(1, '#020617')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Exact Center Calculations
  const targetH = Math.min(100, Math.max(56, height * 0.52))
  const towerCenterX = width * 0.5
  const towerBaseY = height * 0.5 + targetH * 0.5 - 4

  // Subtle Base Ground Aura
  ctx.beginPath()
  ctx.ellipse(towerCenterX, towerBaseY, 36, 18, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(245, 158, 11, 0.08)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // 2. Render Active Shockwaves (Burst / Splash Explosions)
  for (let i = activeShockwaves.length - 1; i >= 0; i--) {
    const sw = activeShockwaves[i]
    sw.life -= dt
    sw.rx += (sw.maxRadius - sw.rx) * dt * 10
    sw.ry = sw.rx * 0.5
    sw.alpha = Math.max(0, sw.life / 0.5)

    ctx.beginPath()
    ctx.ellipse(sw.x, sw.y, sw.rx, sw.ry, 0, 0, Math.PI * 2)
    ctx.strokeStyle = sw.color
    ctx.globalAlpha = sw.alpha * 0.85
    ctx.lineWidth = 2.5
    ctx.stroke()

    ctx.fillStyle = sw.color
    ctx.globalAlpha = sw.alpha * 0.2
    ctx.fill()
    ctx.globalAlpha = 1.0

    if (sw.life <= 0) activeShockwaves.splice(i, 1)
  }

  // 3. Render Centered Tower (Strictly preserving natural aspect ratio)
  const recoilOffset = -towerRecoil * 4
  const towerX = towerCenterX
  const towerY = towerBaseY + recoilOffset
  const muzzleY = height * 0.5 - targetH * 0.35 + recoilOffset

  // Soft Ground Shadow
  ctx.beginPath()
  ctx.ellipse(towerCenterX, towerBaseY, 26, 13, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.fill()

  if (towerImage && towerImage.complete && towerImage.naturalWidth > 0) {
    const naturalW = towerImage.naturalWidth
    const naturalH = towerImage.naturalHeight
    const aspect = naturalW / naturalH
    const targetW = targetH * aspect

    ctx.drawImage(
      towerImage, 
      towerX - targetW / 2, 
      towerY - targetH + 4, 
      targetW, 
      targetH
    )
  } else {
    // Stylized Fallback Tower Column
    ctx.fillStyle = '#1e293b'
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.fillRect(towerX - 16, towerY - 50, 32, 50)
    ctx.strokeRect(towerX - 16, towerY - 50, 32, 50)

    ctx.fillStyle = '#f59e0b'
    ctx.beginPath()
    ctx.arc(towerX, towerY - 52, 11, 0, Math.PI * 2)
    ctx.fill()
  }

  // Muzzle Flash on Shot
  if (muzzleFlashTimer > 0) {
    const flashAlpha = muzzleFlashTimer / 0.15
    ctx.beginPath()
    ctx.arc(towerX, muzzleY, 14, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(254, 240, 138, ${flashAlpha})`
    ctx.fill()

    ctx.beginPath()
    ctx.arc(towerX, muzzleY, 7, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
    ctx.fill()
  }

  // 4. Update and Render Active Flying Projectiles
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]
    p.progress += p.speed * dt
    p.currentX = p.startX + (p.targetX - p.startX) * p.progress

    // Parabolic Arc Height calculation
    const arcHeight = (p.type === 'magic_bolt' || p.type === 'laser') ? 0 : Math.sin(p.progress * Math.PI) * 22
    p.currentY = p.startY + (p.targetY - p.startY) * p.progress - arcHeight

    // Store Trail Points
    p.trail.push({ x: p.currentX, y: p.currentY, alpha: 1.0, size: 3.5 })
    if (p.trail.length > 8) p.trail.shift()

    // Render Trail
    for (let t = 0; t < p.trail.length; t++) {
      const pt = p.trail[t]
      pt.alpha -= dt * 3.5
      if (pt.alpha <= 0) continue

      ctx.beginPath()
      ctx.arc(pt.x, pt.y, (t / p.trail.length) * 3.5, 0, Math.PI * 2)
      ctx.fillStyle = p.type === 'fireball' ? `rgba(249, 115, 22, ${pt.alpha * 0.7})` : 
                     (p.type === 'frost_bolt' ? `rgba(6, 182, 212, ${pt.alpha * 0.7})` :
                     (p.type === 'laser' ? `rgba(244, 63, 94, ${pt.alpha * 0.8})` :
                     (p.type === 'magic_bolt' ? `rgba(56, 189, 248, ${pt.alpha * 0.7})` : `rgba(148, 163, 184, ${pt.alpha * 0.5})`)))
      ctx.fill()
    }

    // Render Projectile Head by Type
    const angle = Math.atan2(p.targetY - p.startY, p.targetX - p.startX)
    
    if (p.type === 'arrow') {
      // Arrow
      ctx.save()
      ctx.translate(p.currentX, p.currentY)
      const arcDy = -Math.cos(p.progress * Math.PI) * 22 * Math.PI / (p.targetX - p.startX)
      ctx.rotate(angle + arcDy * 0.4)

      ctx.strokeStyle = '#78350f'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-10, 0)
      ctx.lineTo(5, 0)
      ctx.stroke()

      ctx.fillStyle = '#e2e8f0'
      ctx.beginPath()
      ctx.moveTo(7, 0)
      ctx.lineTo(2, -2.5)
      ctx.lineTo(2, 2.5)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(-10, 0)
      ctx.lineTo(-7, -2.5)
      ctx.moveTo(-10, 0)
      ctx.lineTo(-7, 2.5)
      ctx.stroke()
      ctx.restore()

    } else if (p.type === 'fireball') {
      // Fireball
      ctx.beginPath()
      ctx.arc(p.currentX, p.currentY, 7.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.currentX, p.currentY, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#f97316'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.currentX, p.currentY, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#fef08a'
      ctx.fill()

    } else if (p.type === 'frost_bolt') {
      // Frost Bolt
      ctx.save()
      ctx.translate(p.currentX, p.currentY)
      ctx.rotate(time * 0.01)

      ctx.fillStyle = 'rgba(6, 182, 212, 0.5)'
      ctx.beginPath()
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#0891b2'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(0, -6)
      ctx.lineTo(4, 0)
      ctx.lineTo(0, 6)
      ctx.lineTo(-4, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

    } else if (p.type === 'laser') {
      // Laser Beam Ray
      ctx.beginPath()
      ctx.moveTo(p.startX, p.startY)
      ctx.lineTo(p.currentX, p.currentY)
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)'
      ctx.lineWidth = 5
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(p.startX, p.startY)
      ctx.lineTo(p.currentX, p.currentY)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.8
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(p.currentX, p.currentY, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

    } else if (p.type === 'missile') {
      // Missile
      ctx.save()
      ctx.translate(p.currentX, p.currentY)
      ctx.rotate(angle)

      ctx.fillStyle = '#334155'
      ctx.fillRect(-8, -2.5, 11, 5)

      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(3, -2.5)
      ctx.lineTo(7, 0)
      ctx.lineTo(3, 2.5)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(-9, 0, 2.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

    } else if (p.type === 'cannonball') {
      // Cannonball
      ctx.beginPath()
      ctx.arc(p.currentX, p.currentY, 5.5, 0, Math.PI * 2)
      ctx.fillStyle = '#1e293b'
      ctx.fill()
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 1.2
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(p.currentX - 1.5, p.currentY - 1.5, 1.6, 0, Math.PI * 2)
      ctx.fillStyle = '#94a3b8'
      ctx.fill()

    } else {
      // Magic Bolt
      ctx.beginPath()
      ctx.arc(p.currentX, p.currentY, 6.5, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(56, 189, 248, 0.5)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(p.currentX, p.currentY, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(p.currentX - 5, p.currentY)
      ctx.lineTo(p.currentX + 5, p.currentY)
      ctx.moveTo(p.currentX, p.currentY - 5)
      ctx.lineTo(p.currentX, p.currentY + 5)
      ctx.stroke()
    }

    // Impact Check
    if (p.progress >= 1.0) {
      handleImpact(p)
      activeProjectiles.splice(i, 1)
    }
  }

  // 5. Render Impact Sparks
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const sp = activeSparks[i]
    sp.x += sp.vx * dt
    sp.y += sp.vy * dt
    sp.life -= dt
    sp.alpha = Math.max(0, sp.life / 0.45)

    ctx.beginPath()
    ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
    ctx.fillStyle = sp.color
    ctx.globalAlpha = sp.alpha
    ctx.fill()
    ctx.globalAlpha = 1.0

    if (sp.life <= 0) activeSparks.splice(i, 1)
  }

  ctx.restore()

  animationFrameId = requestAnimationFrame(renderFrame)
}

function handleResize() {
  if (!containerRef.value || !canvasRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvasRef.value.width = rect.width * dpr
  canvasRef.value.height = rect.height * dpr
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  handleResize()
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(containerRef.value)
  }

  animationFrameId = requestAnimationFrame(renderFrame)
})

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value)
    resizeObserver = null
  }
})
</script>
