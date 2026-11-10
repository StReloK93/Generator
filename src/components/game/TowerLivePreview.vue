<template>
  <div class="relative w-full rounded-2xl bg-slate-950 border border-slate-800/80 overflow-hidden shadow-xl select-none flex flex-col">
    <!-- Main Live Simulation Pixi Canvas -->
    <div ref="containerRef" class="relative w-full h-52 sm:h-56 bg-slate-950 overflow-hidden">
      <canvas ref="canvasRef" class="w-full h-full block"></canvas>

      <!-- Absolute Top-Left Asset / Sprite Name Badge -->
      <div class="absolute top-2.5 left-2.5 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-slate-200">
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        <span class="text-[11px] font-bold text-amber-300 truncate max-w-40 sm:max-w-48">
          {{ blueprint.asset.assetName || blueprint.name || 'Custom' }}
        </span>
      </div>

      <!-- Live Speed & Projectile Info -->
      <div class="absolute bottom-2.5 right-2.5 z-10 pointer-events-none flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[10px] text-slate-300">
        <span class="text-amber-400 font-bold truncate max-w-32">{{ projectileName(activeDef, t) }}</span>
        <span>|</span>
        <span>{{ currentAttackSpeed }}s</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { Application, Assets, Container, Graphics, Sprite, Texture } from 'pixi.js'
import { TowerBlueprint, TowerLevel } from '../../types/tower'
import { useAssetStore } from '../../stores/assetStore'
import { useProjectileStore } from '../../stores/projectileStore'
import { useI18n } from '../../stores/i18nStore'
import { ProjectilePreviewStage, type StagePoint } from '../../rendering/pixi/projectile/ProjectilePreviewStage'
import { projectileName } from '../projectile/projectileLabels'

const props = defineProps<{
  blueprint: TowerBlueprint
  levelConfig?: TowerLevel
}>()

const assetStore = useAssetStore()
const projectileStore = useProjectileStore()
const { t } = useI18n()
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let app: Application | null = null
let towerSprite: Sprite | null = null
let rangeGraphics: Graphics | null = null
let stage: ProjectilePreviewStage | null = null
let cooldownTimer = 0
let shotIndex = 0
let currentTarget: StagePoint = { x: 0, y: 0 }
let destroyed = false

const activeDef = computed(() => projectileStore.get(props.blueprint.projectileId))
const currentAttackSpeed = computed(() => props.levelConfig?.attackSpeed || props.blueprint.levels[0].attackSpeed || 1.0)
const currentRange = computed(() => props.levelConfig?.range || props.blueprint.levels[0].range || 3)

/** Shots go to points around the tower, one after another */
const TARGET_ANGLES = [-0.25, -0.75, -0.12, -0.88, -0.5, 0.2, 0.8].map(k => k * Math.PI)

function rangeRadius(w: number, h: number): number {
  return Math.min(w * 0.44, h * 0.44) * (0.55 + Math.min(1.0, currentRange.value / 8) * 0.45)
}

function muzzle(w: number, h: number): StagePoint {
  return { x: w * 0.5 + (props.blueprint.asset.muzzleOffsetX ?? 0), y: h * 0.5 - 20 + (props.blueprint.asset.muzzleOffsetY ?? 0) }
}

async function initPixi() {
  if (!canvasRef.value || !containerRef.value) return
  const instance = new Application()
  await instance.init({
    canvas: canvasRef.value,
    resizeTo: containerRef.value,
    background: 0x020617,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  })
  if (destroyed) {
    instance.destroy(false)
    return
  }
  app = instance
  const root = new Container()
  rangeGraphics = new Graphics()
  towerSprite = new Sprite()
  towerSprite.anchor.set(0.5, 0.75)
  const fxGraphics = new Graphics()
  root.addChild(rangeGraphics, towerSprite, fxGraphics)
  app.stage.addChild(root)
  stage = new ProjectilePreviewStage(fxGraphics)

  updateTowerTexture()
  app.ticker.add(ticker => updateSimulation(Math.min(0.1, ticker.deltaMS / 1000)))
}

function updateTowerTexture() {
  if (!towerSprite || towerSprite.destroyed) return
  const src = assetStore.getAssetPreview(props.blueprint.asset.assetId || props.blueprint.asset.assetName) || props.blueprint.asset.assetPath
  if (!src) return
  Assets.load<Texture>(src).then((tex) => {
    if (towerSprite && !towerSprite.destroyed && tex) {
      towerSprite.texture = tex
      const scale = Math.min(80 / tex.width, 80 / tex.height) * (props.blueprint.asset.scale || 1.0)
      towerSprite.scale.set(scale)
    }
  }).catch(() => {})
}

function updateSimulation(dt: number) {
  if (!app || !stage || !rangeGraphics || rangeGraphics.destroyed) return
  const w = app.screen.width
  const h = app.screen.height
  towerSprite?.position.set(w * 0.5, h * 0.5)

  const radius = rangeRadius(w, h)
  rangeGraphics.clear()
  rangeGraphics.ellipse(w * 0.5, h * 0.5, radius, radius * 0.6).stroke({ width: 1, color: 0x38bdf8, alpha: 0.25 })

  cooldownTimer -= dt
  if (cooldownTimer <= 0) {
    cooldownTimer = Math.max(0.2, currentAttackSpeed.value)
    const from = muzzle(w, h)
    const angle = TARGET_ANGLES[shotIndex++ % TARGET_ANGLES.length]
    currentTarget = { x: from.x + Math.cos(angle) * radius, y: from.y + Math.sin(angle) * radius * 0.75 }
    stage.fire(activeDef.value, from, currentTarget)
  }
  stage.update(dt, currentTarget)
}

watch(() => [props.blueprint.asset.assetId, props.blueprint.asset.assetName, props.blueprint.asset.assetPath, props.blueprint.asset.scale], updateTowerTexture)

watch(() => [props.blueprint.projectileId, props.blueprint.id], () => {
  stage?.clear()
  cooldownTimer = 0
})

onMounted(initPixi)

onUnmounted(() => {
  destroyed = true
  stage?.clear()
  stage = null
  app?.destroy(false, { children: true })
  app = null
})
</script>
