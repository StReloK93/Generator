<template>
  <div class="flex flex-col h-dvh max-h-dvh w-screen bg-slate-950 text-slate-100 overflow-hidden select-none pt-safe pb-safe">
    <!-- Header -->
    <header class="h-14 shrink-0 bg-slate-900/95 border-b border-slate-800 px-2 sm:px-4 flex items-center justify-between gap-2 z-20">
      <div class="flex items-center gap-2 min-w-0">
        <UiIconButton :icon="ArrowLeft" :title="$t('common.back')" @click="goBack" />
        <div class="size-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0">
          <Wand2 class="size-4" />
        </div>
        <div class="min-w-0 hidden sm:block">
          <h1 class="text-sm font-black tracking-wide truncate">{{ $t('pe.title') }}</h1>
          <p class="text-[10px] text-slate-400 truncate">{{ $t('pe.subtitle', { count: store.presets.length }) }}</p>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <UiIconButton :icon="Undo2" size="sm" variant="ghost" :disabled="!canUndo" :title="`${$t('header.undo')} (Ctrl+Z)`" @click="undo" />
        <UiIconButton :icon="Redo2" size="sm" variant="ghost" :disabled="!canRedo" :title="`${$t('header.redo')} (Ctrl+Y)`" @click="redo" />
        <div class="h-5 w-px bg-slate-800 mx-1" />
        <UiIconButton :icon="ClipboardCopy" size="sm" variant="ghost" :title="$t('pe.copyJson')" @click="copyJson" />
        <UiIconButton :icon="ClipboardPaste" size="sm" variant="ghost" :title="$t('pe.pasteJson')" @click="pasteJson" />
        <UiButton variant="secondary" size="sm" :leading-icon="Upload" @click="fileInput?.click()">
          <span class="hidden md:inline">{{ $t('common.import') }}</span>
        </UiButton>
        <UiButton variant="primary" size="sm" :leading-icon="Download" @click="exportCurrent">
          <span class="hidden md:inline">{{ $t('common.export') }}</span>
        </UiButton>
        <UiLanguageSwitcher />
        <input ref="fileInput" type="file" accept=".json" class="hidden" @change="importFile" />
      </div>
    </header>

    <!-- Phones and tablets: one panel at a time -->
    <div class="lg:hidden px-2 pt-2 shrink-0">
      <UiTabs v-model="mobilePanel" :items="mobileTabs" fill size="sm" />
    </div>

    <div class="flex-1 min-h-0 flex flex-col lg:flex-row gap-2 p-2">
      <!-- Library -->
      <aside
        class="lg:w-72 xl:w-80 shrink-0 min-h-0 flex-col bg-slate-900/60 border border-slate-800 rounded-2xl p-2"
        :class="mobilePanel === 'library' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'"
      >
        <ProjectileLibrary ref="libraryRef" v-model="librarySelection">
          <template #actions>
            <div class="flex items-center gap-1">
              <UiIconButton :icon="Plus" size="xs" variant="success" :title="$t('pe.newBlank')" @click="createBlank" />
              <UiIconButton :icon="Copy" size="xs" variant="ghost" :title="$t('pe.duplicate')" @click="duplicate" />
              <UiIconButton :icon="Trash2" size="xs" variant="danger" :disabled="!draft.isCustom" :title="$t('common.delete')" @click="removeCurrent" />
            </div>
          </template>
        </ProjectileLibrary>
      </aside>

      <!-- Firing range + generator -->
      <main class="flex-1 min-w-0 min-h-0 flex flex-col gap-2" :class="mobilePanel === 'library' ? 'hidden lg:flex' : 'flex'">
        <div class="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 shrink-0 h-56 sm:h-72 lg:h-auto lg:flex-1 lg:min-h-0">
          <ProjectilePreview ref="previewRef" :def="draft" :interval="autoFire ? fireInterval : 0" :moving-target="movingTarget" :time-scale="timeScale" :ground="ground" />
          <div class="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
            <ProjectileSwatch :def="draft" size="sm" />
            <div class="flex flex-col bg-slate-950/80 backdrop-blur-md rounded-lg px-2 py-1 border border-slate-800">
              <span class="text-xs font-bold truncate max-w-48">{{ projectileName(draft, t) }}</span>
              <span class="text-[10px] text-slate-400">
                {{ $t(`pe.element.${draft.element}`) }} · {{ $t(BEHAVIOR_INFO[draft.behavior].label) }} ·
                {{ draft.isCustom ? $t('pe.mineShort') : $t('pe.presetShort') }}
              </span>
            </div>
          </div>
          <div class="absolute bottom-2 left-2 right-2 flex flex-wrap items-center gap-1.5 justify-between">
            <div class="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md rounded-xl p-1 border border-slate-800">
              <UiIconButton :icon="autoFire ? Pause : Play" size="sm" variant="tool" :active="autoFire" :title="$t('pe.autoFire')" @click="autoFire = !autoFire" />
              <UiIconButton :icon="Crosshair" size="sm" variant="tool" :title="$t('pe.fireOnce')" @click="previewRef?.fireNow()" />
              <UiIconButton :icon="Move" size="sm" variant="tool" :active="movingTarget" :title="$t('pe.movingTarget')" @click="movingTarget = !movingTarget" />
              <UiTabs v-model="timeScale" :items="speedTabs" size="xs" />
            </div>
            <UiTabs v-model="ground" :items="groundTabs" size="xs" custom-class="bg-slate-950/80 backdrop-blur-md" />
          </div>
        </div>

        <!-- Generator: endless new projectiles and quick restyles -->
        <div class="shrink-0 flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-slate-900/60 border border-slate-800">
          <UiButton variant="game-amber" size="sm" :leading-icon="Dices" @click="generate()">{{ $t('pe.generate') }}</UiButton>
          <UiButton variant="secondary" size="sm" :leading-icon="ELEMENT_INFO[draft.element].icon" @click="generate(draft.element)">
            {{ $t('pe.generateElement', { element: $t(`pe.element.${draft.element}`) }) }}
          </UiButton>
          <UiButton variant="secondary" size="sm" :leading-icon="Shuffle" @click="mutate">{{ $t('pe.mutate') }}</UiButton>
          <div class="flex items-center gap-0.5">
            <UiIconButton :icon="RotateCcw" size="sm" variant="ghost" :title="$t('pe.hueLeft')" @click="hue(-30)" />
            <Palette class="size-4 text-slate-400" />
            <UiIconButton :icon="RotateCw" size="sm" variant="ghost" :title="$t('pe.hueRight')" @click="hue(30)" />
          </div>
          <UiButton variant="secondary" size="sm" :leading-icon="Pipette" @click="openAssetPicker('palette')">{{ $t('pe.paletteFromAsset') }}</UiButton>
          <div v-if="lastPalette.length" class="flex items-center gap-0.5" :title="$t('pe.assetPalette')">
            <span v-for="c in lastPalette" :key="c" class="size-4 rounded border border-slate-700" :style="{ backgroundColor: c }" />
          </div>
        </div>
      </main>

      <!-- Inspector -->
      <aside
        class="lg:w-96 shrink-0 min-h-0 overflow-y-auto custom-scrollbar bg-slate-900/60 border border-slate-800 rounded-2xl p-3"
        :class="mobilePanel === 'edit' ? 'block flex-1 lg:flex-none' : 'hidden lg:block'"
      >
        <ProjectileInspector :key="draft.id" v-model="draft" @pick-sprite="openAssetPicker('sprite', $event)" />
      </aside>
    </div>

    <AssetPickerModal
      :is-open="assetPicker !== null"
      :title="assetPicker === 'sprite' ? $t('pe.chooseAsset') : $t('pe.paletteFromAsset')"
      :subtitle="assetPicker === 'sprite' ? $t('pe.spriteHint') : $t('pe.paletteHint')"
      @close="assetPicker = null"
      @pick="onAssetPicked"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  ArrowLeft, Wand2, Undo2, Redo2, ClipboardCopy, ClipboardPaste, Upload, Download, Plus, Copy, Trash2,
  Pause, Play, Crosshair, Move, Dices, Shuffle, RotateCcw, RotateCw, Palette, Pipette, Library, SlidersHorizontal, Target,
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiTabs, UiLanguageSwitcher, type TabItem } from '../components/ui'
import ProjectileLibrary from '../components/projectile/ProjectileLibrary.vue'
import ProjectilePreview, { type PreviewGround } from '../components/projectile/ProjectilePreview.vue'
import ProjectileSwatch from '../components/projectile/ProjectileSwatch.vue'
import ProjectileInspector from '../components/projectile/studio/ProjectileInspector.vue'
import AssetPickerModal from '../components/projectile/AssetPickerModal.vue'
import { BEHAVIOR_INFO, ELEMENT_INFO, projectileName } from '../components/projectile/projectileLabels'
import { useProjectileStore } from '../stores/projectileStore'
import { useAssetStore } from '../stores/assetStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import {
  applyPalette, cloneProjectile, createLayer, createProjectile, DEFAULT_PROJECTILE_ID, generateProjectile,
  mutateProjectile, newProjectileId, shiftHue,
} from '../domain/projectile'
import { extractPalette } from '../utils/imagePalette'
import type { ProjectileDefinition, ProjectileElement } from '../types/projectile'
import type { AssetItem } from '../types/map'

const router = useRouter()
const route = useRoute()
const store = useProjectileStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()
const { t } = useI18n()

const libraryRef = ref<InstanceType<typeof ProjectileLibrary> | null>(null)
const previewRef = ref<InstanceType<typeof ProjectilePreview> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// ==========================================
// Firing range settings
// ==========================================

const autoFire = ref(true)
const fireInterval = 1.1
const movingTarget = ref(true)
const timeScale = ref(1)
const ground = ref<PreviewGround>('night')
const mobilePanel = ref<'library' | 'preview' | 'edit'>('preview')

const speedTabs: TabItem[] = [
  { id: 0.25, label: '¼×' },
  { id: 0.5, label: '½×' },
  { id: 1, label: '1×' },
]
const groundTabs = computed<TabItem[]>(() => (['night', 'grass', 'sand', 'snow', 'stone'] as const).map(g => ({ id: g, label: t(`pe.ground.${g}`) })))
const mobileTabs = computed<TabItem[]>(() => [
  { id: 'library', label: t('pe.library'), icon: Library },
  { id: 'preview', label: t('pe.range'), icon: Target },
  { id: 'edit', label: t('pe.edit'), icon: SlidersHorizontal },
])

// ==========================================
// The projectile being edited
// ==========================================

const draft = ref<ProjectileDefinition>(cloneProjectile(store.get(String(route.query.id ?? DEFAULT_PROJECTILE_ID))))
/** Set while the draft is swapped in from outside (selection, undo), so the swap is not saved as an edit */
let swapping = false
let saveTimer: ReturnType<typeof setTimeout> | null = null
const history = ref<string[]>([JSON.stringify(draft.value)])
const historyIndex = ref(0)

const canUndo = computed(() => historyIndex.value > 0)
const canRedo = computed(() => historyIndex.value < history.value.length - 1)

function swapDraft(def: ProjectileDefinition, resetHistory: boolean): void {
  swapping = true
  draft.value = cloneProjectile(def)
  if (resetHistory) {
    history.value = [JSON.stringify(draft.value)]
    historyIndex.value = 0
  }
  nextTick(() => {
    swapping = false
  })
}

const librarySelection = computed({
  get: () => draft.value.id,
  set: (id: string) => {
    flushSave()
    swapDraft(store.get(id), true)
    if (window.innerWidth < 1024) mobilePanel.value = 'preview'
  },
})

function flushSave(): void {
  if (!saveTimer) return
  clearTimeout(saveTimer)
  saveTimer = null
  commit()
}

/** Saves the draft and records it for undo */
function commit(): void {
  store.save(draft.value)
  const snapshot = JSON.stringify(draft.value)
  if (history.value[historyIndex.value] === snapshot) return
  history.value = [...history.value.slice(0, historyIndex.value + 1), snapshot].slice(-60)
  historyIndex.value = history.value.length - 1
}

watch(draft, () => {
  if (swapping) return
  // Library presets are read-only: the first change makes the player's own copy
  if (!draft.value.isCustom) {
    const name = projectileName(draft.value, t)
    draft.value.id = newProjectileId()
    draft.value.isCustom = true
    draft.value.name = name
    libraryRef.value?.showMine()
    notify.info(t('pe.forked', { name }))
  }
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    commit()
  }, 300)
}, { deep: true })

function undo(): void {
  if (!canUndo.value) return
  flushSave()
  historyIndex.value--
  swapDraft(JSON.parse(history.value[historyIndex.value]), false)
  store.save(draft.value)
}

function redo(): void {
  if (!canRedo.value) return
  historyIndex.value++
  swapDraft(JSON.parse(history.value[historyIndex.value]), false)
  store.save(draft.value)
}

/** Replaces the draft's look but keeps it the same projectile (id, name, owner) */
function restyle(next: ProjectileDefinition): void {
  draft.value = { ...next, id: draft.value.id, name: draft.value.name, isCustom: draft.value.isCustom }
}

// ==========================================
// Library actions
// ==========================================

function openNew(def: ProjectileDefinition): void {
  flushSave()
  const saved = store.save(def)
  swapDraft(saved, true)
  libraryRef.value?.showMine()
}

function generate(element?: ProjectileElement): void {
  openNew(generateProjectile({ element }))
}

function createBlank(): void {
  openNew(createProjectile({
    id: newProjectileId(),
    name: t('pe.newName'),
    isCustom: true,
    body: [createLayer({ shape: 'orb', color: '#fbbf24', size: 14, alpha: 0.3, glow: 1 }), createLayer({ shape: 'orb', color: '#f97316', size: 7 }), createLayer({ shape: 'orb', color: '#ffffff', size: 3 })],
  }))
}

function duplicate(): void {
  flushSave()
  const copy = store.fork(draft.value, `${projectileName(draft.value, t)} 2`)
  swapDraft(copy, true)
  libraryRef.value?.showMine()
}

async function removeCurrent(): Promise<void> {
  if (!draft.value.isCustom) return
  const ok = await notify.confirm({
    title: t('pe.deleteTitle'),
    message: t('pe.deleteMessage', { name: draft.value.name }),
    variant: 'danger',
    confirmText: t('common.delete'),
  })
  if (!ok) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  store.remove(draft.value.id)
  swapDraft(store.customProjectiles[0] ?? store.get(DEFAULT_PROJECTILE_ID), true)
}

function mutate(): void {
  restyle(mutateProjectile(draft.value, 0.3))
}

function hue(degrees: number): void {
  restyle(shiftHue(draft.value, degrees))
}

// ==========================================
// Game assets: palette and sprite bodies
// ==========================================

const assetPicker = ref<'palette' | 'sprite' | null>(null)
let spriteLayer = 0
const lastPalette = ref<string[]>([])

function openAssetPicker(mode: 'palette' | 'sprite', layerIndex = 0): void {
  spriteLayer = layerIndex
  assetPicker.value = mode
}

async function onAssetPicked(asset: AssetItem): Promise<void> {
  const mode = assetPicker.value
  assetPicker.value = null
  if (mode === 'sprite') {
    const layer = draft.value.body[spriteLayer]
    if (layer) {
      layer.shape = 'sprite'
      layer.assetId = asset.id
    }
    return
  }
  try {
    const palette = await extractPalette(assetStore.getAssetPreview(asset))
    if (palette.length === 0) throw new Error('empty')
    lastPalette.value = palette
    restyle(applyPalette(draft.value, palette))
    notify.success(t('pe.paletteApplied', { name: asset.name }))
  } catch {
    notify.error(t('pe.paletteFailed'))
  }
}

// ==========================================
// Sharing
// ==========================================

function download(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function exportCurrent(): void {
  flushSave()
  const safe = (draft.value.isCustom ? draft.value.name : draft.value.id).replace(/[^a-z0-9_-]+/gi, '_')
  download(`projectile_${safe}.json`, store.exportJson([draft.value]))
}

function importText(text: string): void {
  try {
    const added = store.importJson(text)
    if (added.length === 0) throw new Error('empty')
    swapDraft(added[0], true)
    libraryRef.value?.showMine()
    notify.success(t('pe.imported', { count: added.length }))
  } catch {
    notify.error(t('pe.importFailed'))
  }
}

async function importFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) importText(await file.text())
}

async function copyJson(): Promise<void> {
  flushSave()
  try {
    await navigator.clipboard.writeText(store.exportJson([draft.value]))
    notify.success(t('pe.copied'))
  } catch {
    notify.error(t('pe.clipboardFailed'))
  }
}

async function pasteJson(): Promise<void> {
  try {
    importText(await navigator.clipboard.readText())
  } catch {
    notify.error(t('pe.clipboardFailed'))
  }
}

function goBack(): void {
  flushSave()
  if (window.history.length > 1) router.back()
  else router.push('/')
}

function onKey(e: KeyboardEvent): void {
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
  if (!(e.ctrlKey || e.metaKey)) return
  const key = e.key.toLowerCase()
  if (key === 'z' && !e.shiftKey) {
    e.preventDefault()
    undo()
  } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
    e.preventDefault()
    redo()
  }
}

onMounted(() => {
  assetStore.loadBuiltinSprites()
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  flushSave()
})
</script>
