<template>
  <div ref="hostRef" class="relative w-full h-full overflow-hidden cursor-crosshair" @pointerdown="fireNow">
    <canvas ref="canvasRef" class="block w-full h-full" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, toRaw } from 'vue'
import { Application, Graphics } from 'pixi.js'
import type { ProjectileDefinition } from '../../types/projectile'
import { ProjectilePreviewStage, type StagePoint } from '../../rendering/pixi/projectile/ProjectilePreviewStage'

export type PreviewGround = 'night' | 'grass' | 'sand' | 'snow' | 'stone'

const props = withDefaults(defineProps<{
  def: ProjectileDefinition
  /** Seconds between automatic shots (0 = only on click) */
  interval?: number
  movingTarget?: boolean
  timeScale?: number
  ground?: PreviewGround
}>(), {
  interval: 1.1,
  movingTarget: true,
  timeScale: 1,
  ground: 'night',
})

const GROUNDS: Record<PreviewGround, { bg: number; a: number; b: number; line: number }> = {
  night: { bg: 0x050814, a: 0x0b1222, b: 0x0e1629, line: 0x1e293b },
  grass: { bg: 0x1a2e12, a: 0x3f6b2a, b: 0x4a7a31, line: 0x335a22 },
  sand: { bg: 0x3b2f1c, a: 0xc9a66b, b: 0xd4b27a, line: 0xa88a55 },
  snow: { bg: 0x1e293b, a: 0xdbe7f3, b: 0xe8f0f8, line: 0xb9c9db },
  stone: { bg: 0x1c1917, a: 0x57534e, b: 0x625d57, line: 0x44403c },
}

const hostRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let app: Application | null = null
let groundG: Graphics | null = null
let propsG: Graphics | null = null
let stage: ProjectilePreviewStage | null = null
let clock = 0
let cooldown = 0.3
let destroyed = false

function muzzle(): StagePoint {
  const w = app?.screen.width ?? 300
  const h = app?.screen.height ?? 200
  return { x: w * 0.2, y: h * 0.68 }
}

function target(): StagePoint {
  const w = app?.screen.width ?? 300
  const h = app?.screen.height ?? 200
  const cx = w * 0.72
  const cy = h * 0.5
  if (!props.movingTarget) return { x: cx, y: cy }
  return { x: cx + Math.cos(clock * 0.9) * w * 0.12, y: cy + Math.sin(clock * 0.9) * h * 0.12 }
}

function drawGround(): void {
  if (!app || !groundG) return
  const w = app.screen.width
  const h = app.screen.height
  const c = GROUNDS[props.ground]
  const tw = Math.max(48, w / 7)
  const th = tw / 2
  groundG.clear()
  groundG.rect(0, 0, w, h).fill({ color: c.bg })
  for (let row = -2; row < h / (th / 2) + 2; row++) {
    for (let col = -1; col < w / tw + 1; col++) {
      const x = col * tw + (row % 2 ? tw / 2 : 0)
      const y = row * (th / 2)
      groundG.poly([x, y - th / 2, x + tw / 2, y, x, y + th / 2, x - tw / 2, y])
        .fill({ color: (row + col) % 2 ? c.a : c.b })
        .stroke({ width: 1, color: c.line, alpha: 0.5 })
    }
  }
  if (stage) stage.pxPerTile = Math.max(14, w / 22)
}

function drawProps(): void {
  if (!propsG) return
  const m = muzzle()
  const t = target()
  propsG.clear()
  // Tower: a stone post the shots leave from
  propsG.ellipse(m.x, m.y + 26, 18, 8).fill({ color: 0x000000, alpha: 0.3 })
  propsG.roundRect(m.x - 11, m.y - 2, 22, 30, 4).fill({ color: 0x64748b }).stroke({ width: 1.5, color: 0x1e293b })
  propsG.circle(m.x, m.y, 8).fill({ color: 0x94a3b8 }).stroke({ width: 1.5, color: 0x1e293b })
  // Target dummy
  propsG.ellipse(t.x, t.y + 16, 16, 7).fill({ color: 0x000000, alpha: 0.3 })
  propsG.roundRect(t.x - 7, t.y - 14, 14, 30, 6).fill({ color: 0x9a6b3f }).stroke({ width: 1.5, color: 0x3f2a14 })
  propsG.circle(t.x, t.y - 16, 7).fill({ color: 0xc08a54 }).stroke({ width: 1.5, color: 0x3f2a14 })
  propsG.ellipse(t.x, t.y + 16, 22, 10).stroke({ width: 1.5, color: 0xef4444, alpha: 0.5 })
}

function fireNow(): void {
  // The raw object: edits in the studio still show on shots already flying, without proxy cost per frame
  stage?.fire(toRaw(props.def), muzzle(), target())
  cooldown = props.interval > 0 ? props.interval : 0
}

async function init(): Promise<void> {
  if (!canvasRef.value || !hostRef.value) return
  const instance = new Application()
  await instance.init({
    canvas: canvasRef.value,
    resizeTo: hostRef.value,
    background: 0x050814,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  })
  if (destroyed) {
    instance.destroy(false)
    return
  }
  app = instance
  groundG = new Graphics()
  propsG = new Graphics()
  const fxG = new Graphics()
  app.stage.addChild(groundG, propsG, fxG)
  stage = new ProjectilePreviewStage(fxG)
  stage.timeScale = props.timeScale
  drawGround()
  app.renderer.on('resize', drawGround)

  app.ticker.add(ticker => {
    if (!stage) return
    const dt = Math.min(0.1, ticker.deltaMS / 1000)
    clock += dt * props.timeScale
    drawProps()
    if (props.interval > 0) {
      cooldown -= dt * props.timeScale
      if (cooldown <= 0) fireNow()
    }
    stage.update(dt, target())
  })
}

watch(() => props.ground, drawGround)
watch(() => props.timeScale, scale => {
  if (stage) stage.timeScale = scale
})
// A different projectile: start clean so the old one's trails and particles do not linger
watch(() => props.def.id, () => {
  stage?.clear()
  cooldown = 0.15
})

onMounted(init)

onUnmounted(() => {
  destroyed = true
  stage?.clear()
  stage = null
  app?.destroy(false, { children: true })
  app = null
})

defineExpose({ fireNow })
</script>
