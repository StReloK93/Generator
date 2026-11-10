<template>
  <div class="flex flex-col gap-2 min-h-0 h-full">
    <UiTabs v-model="source" :items="sourceTabs" fill size="sm" />
    <UiInput v-model="query" size="sm" :leading-icon="Search" :placeholder="$t('pe.searchPlaceholder')" />
    <UiTabs v-model="behavior" :items="behaviorTabs" fill size="xs" />
    <div class="flex flex-wrap gap-1">
      <UiIconButton
        v-for="el in elementButtons"
        :key="el.id"
        :icon="el.icon"
        size="sm"
        variant="tool"
        :active="element === el.id"
        :title="el.label"
        @click="element = element === el.id ? 'all' : el.id"
      />
    </div>

    <div class="flex items-center justify-between px-0.5 text-[11px] text-slate-400">
      <span>{{ $t('pe.found', { count: filtered.length }) }}</span>
      <slot name="actions" />
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar -mx-1 px-1">
      <div v-if="visible.length > 0" class="grid grid-cols-1 gap-1">
        <button
          v-for="def in visible"
          :key="def.id"
          type="button"
          class="flex items-center gap-2.5 p-1.5 rounded-xl border text-left transition-colors cursor-pointer"
          :class="modelValue === def.id
            ? 'bg-brand-500/15 border-brand-400/70'
            : 'bg-slate-900/60 border-slate-800 hover:border-slate-600'"
          @click="emit('update:modelValue', def.id)"
          @dblclick="emit('pick', def.id)"
        >
          <ProjectileSwatch :def="def" size="sm" />
          <span class="flex flex-col min-w-0 flex-1">
            <span class="text-xs font-bold text-slate-100 truncate">{{ projectileName(def, t) }}</span>
            <span class="flex items-center gap-1 text-[10px] text-slate-400">
              <component :is="ELEMENT_INFO[def.element].icon" class="size-3 shrink-0" />
              <span class="truncate">{{ $t(`pe.element.${def.element}`) }} · {{ $t(BEHAVIOR_INFO[def.behavior].label) }}</span>
            </span>
          </span>
        </button>
      </div>
      <p v-else class="text-xs text-slate-500 text-center py-6">
        {{ source === 'mine' ? $t('pe.noMine') : $t('pe.nothingFound') }}
      </p>
      <UiButton v-if="filtered.length > visible.length" variant="ghost" size="xs" block custom-class="mt-1" @click="limit += 60">
        {{ $t('pe.showMore', { count: filtered.length - visible.length }) }}
      </UiButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Library, User, Layers } from 'lucide-vue-next'
import { UiTabs, UiInput, UiIconButton, UiButton, type TabItem } from '../ui'
import { useProjectileStore } from '../../stores/projectileStore'
import { useI18n } from '../../stores/i18nStore'
import { PROJECTILE_ELEMENTS } from '../../domain/projectile'
import type { ProjectileBehavior, ProjectileElement } from '../../types/projectile'
import ProjectileSwatch from './ProjectileSwatch.vue'
import { BEHAVIOR_INFO, ELEMENT_INFO, projectileName } from './projectileLabels'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  (e: 'update:modelValue', id: string): void
  (e: 'pick', id: string): void
}>()

const store = useProjectileStore()
const { t } = useI18n()

const source = ref<'library' | 'mine'>(store.customProjectiles.some(p => p.id === props.modelValue) ? 'mine' : 'library')
const query = ref('')
const behavior = ref<'all' | ProjectileBehavior>('all')
const element = ref<'all' | ProjectileElement>('all')
const limit = ref(60)

const sourceTabs = computed<TabItem[]>(() => [
  { id: 'library', label: t('pe.library'), icon: Library, count: store.presets.length },
  { id: 'mine', label: t('pe.mine'), icon: User, count: store.customProjectiles.length },
])

const behaviorTabs = computed<TabItem[]>(() => [
  { id: 'all', label: t('common.all'), icon: Layers },
  ...(['flying', 'strike', 'beam'] as const).map(b => ({ id: b, label: t(BEHAVIOR_INFO[b].label), icon: BEHAVIOR_INFO[b].icon })),
])

const elementButtons = computed(() => PROJECTILE_ELEMENTS.map(el => ({ id: el, icon: ELEMENT_INFO[el].icon, label: t(`pe.element.${el}`) })))

const filtered = computed(() => {
  const list = source.value === 'mine' ? store.customProjectiles : store.presets
  const q = query.value.trim().toLowerCase()
  return list.filter(def =>
    (behavior.value === 'all' || def.behavior === behavior.value) &&
    (element.value === 'all' || def.element === element.value) &&
    (!q || projectileName(def, t).toLowerCase().includes(q) || def.id.includes(q)))
})

const visible = computed(() => filtered.value.slice(0, limit.value))

watch([source, query, behavior, element], () => {
  limit.value = 60
})

/** The studio switches to "mine" when it saves a new projectile */
defineExpose({ showMine: () => (source.value = 'mine') })
</script>
