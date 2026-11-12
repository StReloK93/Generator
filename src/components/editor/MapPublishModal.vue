<template>
  <UiModal
    :is-open="store.isOpen"
    :title="$t(store.entry ? 'publish.title' : 'publish.addTitle')"
    :subtitle="store.entry?.file ? $t('publish.file', { file: `src/maps/${store.entry.file}.json` }) : $t('publish.addSubtitle')"
    :icon="store.entry ? Save : CloudUpload"
    icon-color="amber"
    size="2xl"
    @close="store.isOpen = false"
  >
    <!-- Why saving is not possible / did not work -->
    <div v-if="notice" class="flex items-start gap-2.5 p-3 rounded-xl border text-xs" :class="notice.cls">
      <component :is="notice.icon" class="size-4 shrink-0 mt-0.5" />
      <span>{{ notice.text }}</span>
    </div>

    <!-- Only the admin changes the game maps -->
    <div v-if="store.needsLogin" class="flex items-center justify-between gap-3 p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-200">
      <span class="flex items-center gap-2.5"><ShieldCheck class="size-4 shrink-0" />{{ $t('admin.needed') }}</span>
      <UiButton variant="game-amber" size="xs" :leading-icon="LogIn" @click="admin.openSignIn()">{{ $t('admin.submit') }}</UiButton>
    </div>

    <!-- A map made in the editor: it becomes one of the game's maps -->
    <UiInput
      v-if="!store.entry"
      v-model="newName"
      size="md"
      :label="$t('publish.addName')"
      :hint="$t('publish.addHint')"
      :leading-icon="Map"
      @keyup.enter="addToGame"
    />

    <div v-else-if="!diff || diff.count === 0" class="flex flex-col items-center gap-2 py-8 text-center text-slate-400">
      <CheckCircle2 class="size-8 text-emerald-400" />
      <p class="text-sm">{{ $t('publish.noChanges') }}</p>
    </div>

    <template v-else-if="diff">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <UiBadge variant="amber" size="sm">{{ $t('publish.count', { n: diff.count }) }}</UiBadge>
        <span v-if="diff.layers.length > 0" class="flex items-center gap-1.5"><MousePointerClick class="size-3.5" />{{ $t('publish.cellHint') }}</span>
      </div>

      <!-- Name, size, colors, picture, labyrinth -->
      <section v-if="diff.fields.length > 0" class="flex flex-col gap-1.5">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ $t('publish.sectionMap') }}</h3>
        <div v-for="field in diff.fields" :key="field.key" class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/70 text-xs">
          <span class="font-mono text-slate-300">{{ field.key }}</span>
          <span class="flex items-center gap-1.5 font-mono text-[11px] min-w-0">
            <span class="text-rose-300/80 line-through">{{ show(field.before) }}</span>
            <ArrowRight class="size-3 shrink-0 text-slate-500" />
            <span class="text-emerald-300">{{ show(field.after) }}</span>
          </span>
        </div>
      </section>

      <!-- Painted cells per layer -->
      <section v-if="diff.layers.length > 0" class="flex flex-col gap-2">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ $t('publish.sectionLayers') }}</h3>
        <div v-for="layer in diff.layers" :key="layer.id" class="flex flex-col gap-2 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
          <div class="flex items-center gap-2 flex-wrap">
            <Layers class="size-4 text-amber-400" />
            <span class="text-sm font-bold text-slate-100">{{ layer.name }}</span>
            <UiBadge v-if="layer.status !== 'changed'" :variant="STATUS_BADGE[layer.status]" size="xs">{{ $t(`publish.status.${layer.status}`) }}</UiBadge>
            <span class="ml-auto flex items-center gap-2 font-mono text-[11px]">
              <span v-if="tally(layer.cells, 'added')" class="text-emerald-300">+{{ tally(layer.cells, 'added') }}</span>
              <span v-if="tally(layer.cells, 'changed')" class="text-amber-300">~{{ tally(layer.cells, 'changed') }}</span>
              <span v-if="tally(layer.cells, 'removed')" class="text-rose-300">−{{ tally(layer.cells, 'removed') }}</span>
            </span>
          </div>
          <p v-if="layer.fields.length > 0" class="text-[11px] text-slate-400">{{ $t('publish.layerProps', { fields: layer.fields.join(', ') }) }}</p>
          <div v-if="layer.cells.length > 0" class="flex flex-wrap gap-1">
            <UiButton
              v-for="cell in visibleCells(layer)"
              :key="`${cell.col},${cell.row}`"
              variant="ghost"
              size="xs"
              :custom-class="`font-mono text-[11px] px-1.5! py-0.5! h-auto! ${STATUS_TEXT[cell.status]}`"
              :title="$t(`publish.status.${cell.status}`)"
              @click="focus(cell.col, cell.row)"
            >
              {{ cell.col }},{{ cell.row }}
            </UiButton>
            <UiButton
              v-if="layer.cells.length > visibleCells(layer).length"
              variant="ghost"
              size="xs"
              custom-class="text-[11px] px-1.5! py-0.5! h-auto! text-slate-400"
              @click="expanded.add(layer.id)"
            >
              {{ $t('publish.cellsMore', { n: layer.cells.length - visibleCells(layer).length }) }}
            </UiButton>
          </div>
        </div>
      </section>

      <!-- Collision, building and water zones -->
      <section v-if="diff.cellSets.length > 0" class="flex flex-col gap-1.5">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ $t('publish.sectionZones') }}</h3>
        <div v-for="set in diff.cellSets" :key="set.key" class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/70 text-xs">
          <span class="text-slate-300">{{ $t(`publish.key.${set.key}`) }}</span>
          <span class="flex items-center gap-2 font-mono text-[11px]">
            <span v-if="set.added" class="text-emerald-300">+{{ set.added }}</span>
            <span v-if="set.removed" class="text-rose-300">−{{ set.removed }}</span>
          </span>
        </div>
      </section>

      <!-- Game / labyrinth settings -->
      <section v-for="settings in diff.settings" :key="settings.key" class="flex flex-col gap-1.5">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ $t(`publish.key.${settings.key}`) }}</h3>
        <div v-for="field in settings.changes" :key="field.key" class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/70 text-xs">
          <span class="font-mono text-slate-300">{{ field.key }}</span>
          <span class="flex items-center gap-1.5 font-mono text-[11px] min-w-0">
            <span class="text-rose-300/80 line-through">{{ show(field.before) }}</span>
            <ArrowRight class="size-3 shrink-0 text-slate-500" />
            <span class="text-emerald-300">{{ show(field.after) }}</span>
          </span>
        </div>
      </section>

      <!-- Routes, waves, towers, clans, ... -->
      <section v-for="list in diff.lists" :key="list.key" class="flex flex-col gap-1.5">
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-400">{{ $t(`publish.key.${list.key}`) }}</h3>
        <div v-for="(item, i) in list.items" :key="`${item.label}-${i}`" class="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-950/40 border border-slate-800/70 text-xs">
          <span class="flex items-center gap-2 min-w-0">
            <UiBadge :variant="STATUS_BADGE[item.status]" size="xs">{{ $t(`publish.status.${item.status}`) }}</UiBadge>
            <span class="text-slate-200 truncate">{{ item.label }}</span>
          </span>
          <span v-if="item.fields.length > 0" class="font-mono text-[11px] text-slate-400 truncate">{{ item.fields.join(', ') }}</span>
        </div>
      </section>
    </template>

    <template #footer>
      <UiButton
        v-if="store.entry && (store.error === 'changed' || store.changeCount > 0)"
        variant="ghost"
        size="sm"
        :leading-icon="store.error === 'changed' ? Download : RotateCcw"
        custom-class="mr-auto text-rose-300"
        :disabled="store.isBusy"
        @click="discard"
      >
        {{ store.error === 'changed' ? $t('publish.loadServer') : $t('publish.discard') }}
      </UiButton>
      <UiButton variant="secondary" size="sm" @click="store.isOpen = false">{{ $t('common.close') }}</UiButton>
      <UiButton
        v-if="store.entry"
        variant="game-amber"
        size="sm"
        :leading-icon="Save"
        :loading="store.isBusy"
        :disabled="!canSaveEntry || store.changeCount === 0"
        @click="save"
      >
        {{ store.error === 'changed' ? $t('publish.overwrite') : $t('publish.save') }}
      </UiButton>
      <UiButton
        v-else
        variant="game-amber"
        size="sm"
        :leading-icon="CloudUpload"
        :loading="store.isBusy"
        :disabled="!store.canWrite || !newName.trim()"
        @click="addToGame"
      >
        {{ $t('publish.addButton') }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle, ArrowRight, CheckCircle2, CloudOff, CloudUpload, Download, Layers, LogIn, Map, MousePointerClick, RotateCcw, Save, ShieldCheck } from 'lucide-vue-next'
import { UiBadge, UiButton, UiInput, UiModal } from '../ui'
import { useMapLibraryStore } from '../../stores/mapLibraryStore'
import { useMapStore } from '../../stores/mapStore'
import { useAdminStore } from '../../stores/adminStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18nStore } from '../../stores/i18nStore'
import type { MapChangeStatus, MapCellChange, MapLayerChange } from '../../domain/map/MapDiff'

const emit = defineEmits<{ (e: 'focus-cell', pos: { col: number; row: number }): void }>()

const store = useMapLibraryStore()
const mapStore = useMapStore()
const admin = useAdminStore()
const router = useRouter()

/** The name a map made in the editor is added to the game under */
const newName = ref('')
watch(() => store.isOpen, open => {
  if (open) newName.value = mapStore.project.name || ''
})
/** The open game map can be written back: the server takes changes and it has the server's copy */
const canSaveEntry = computed(() => store.canWrite && !!store.entry?.version)
const notify = useNotificationStore()
const { t } = useI18nStore()

/** Cells listed per layer before "more" */
const CELL_PREVIEW = 48
const STATUS_BADGE = { added: 'emerald', removed: 'rose', changed: 'amber' } as const
const STATUS_TEXT: Record<MapChangeStatus, string> = { added: 'text-emerald-300!', removed: 'text-rose-300!', changed: 'text-amber-300!' }

const diff = computed(() => store.diff)
const expanded = reactive(new Set<string>())

const visibleCells = (layer: MapLayerChange) => (expanded.has(layer.id) ? layer.cells : layer.cells.slice(0, CELL_PREVIEW))
const tally = (cells: MapCellChange[], status: MapChangeStatus) => cells.filter(c => c.status === status).length

/** A value as text: a number or word as it is, a list or object only as "changed" */
function show(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'object') return t('publish.status.changed')
  const text = String(value)
  return text.length > 40 ? `${text.slice(0, 37)}…` : text
}

const notice = computed(() => {
  if (store.entry && !store.entry.version) return { icon: CloudOff, text: t('publish.offline'), cls: 'border-slate-700 bg-slate-900/60 text-slate-300' }
  if (!store.canWrite && !store.needsLogin) return{ icon: CloudOff, text: t('publish.savingOff'), cls: 'border-slate-700 bg-slate-900/60 text-slate-300' }
  if (store.error === 'changed') return { icon: AlertTriangle, text: t('publish.changed'), cls: 'border-amber-500/40 bg-amber-500/10 text-amber-200' }
  if (store.error === 'saving-off') return { icon: CloudOff, text: t('publish.savingOff'), cls: 'border-slate-700 bg-slate-900/60 text-slate-300' }
  if (store.error === 'failed') return { icon: AlertTriangle, text: t('publish.failed'), cls: 'border-rose-500/40 bg-rose-500/10 text-rose-200' }
  return null
})

function focus(col: number, row: number) {
  store.isOpen = false
  emit('focus-cell', { col, row })
}

async function save() {
  if (await store.save(store.error === 'changed')) {
    notify.success(t('publish.saved'))
    store.isOpen = false
  }
}

async function addToGame() {
  const map = await store.addOpenMap(newName.value.trim())
  if (!map) return
  notify.success(t('publish.added', { name: map.name }))
  store.isOpen = false
  router.replace(`/editor/${map.id}`)
}

async function discard() {
  const ok = store.error === 'changed' || await notify.confirm({
    title: t('publish.discard'),
    message: t('publish.discardConfirm'),
    confirmText: t('publish.discard'),
    cancelText: t('common.cancel'),
    variant: 'danger',
  })
  if (ok) await store.discard()
}
</script>

