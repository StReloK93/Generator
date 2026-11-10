<template>
  <UiModal :is-open="isOpen" :title="title" :subtitle="subtitle" :icon="ImageIcon" icon-color="cyan" size="4xl" @close="emit('close')">
    <div class="flex flex-col gap-3">
      <div class="flex flex-col sm:flex-row gap-2">
        <UiInput v-model="query" size="sm" :leading-icon="Search" :placeholder="$t('pe.assetSearch')" custom-class="flex-1" />
        <UiTabs v-model="category" :items="categoryTabs" variant="pills" size="xs" custom-class="flex-wrap gap-1" />
      </div>
      <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar p-0.5">
        <button
          v-for="asset in visible"
          :key="asset.id"
          type="button"
          class="aspect-square rounded-xl border border-slate-800 bg-slate-950/80 hover:border-cyan-400 p-1.5 flex flex-col items-center gap-1 cursor-pointer transition-colors"
          :title="asset.name"
          @click="emit('pick', asset)"
        >
          <img :src="assetStore.getAssetPreview(asset)" :alt="asset.name" class="flex-1 min-h-0 w-full object-contain" loading="lazy" />
          <span class="text-[9px] text-slate-400 truncate w-full text-center">{{ asset.name }}</span>
        </button>
      </div>
      <UiButton v-if="filtered.length > visible.length" variant="ghost" size="xs" block @click="limit += 96">
        {{ $t('pe.showMore', { count: filtered.length - visible.length }) }}
      </UiButton>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Image as ImageIcon, Search } from 'lucide-vue-next'
import { UiModal, UiInput, UiTabs, UiButton, type TabItem } from '../ui'
import { useAssetStore } from '../../stores/assetStore'
import { useI18n } from '../../stores/i18nStore'
import type { AssetItem } from '../../types/map'

defineProps<{ isOpen: boolean; title: string; subtitle?: string }>()
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'pick', asset: AssetItem): void
}>()

const assetStore = useAssetStore()
const { t } = useI18n()
const query = ref('')
const category = ref('all')
const limit = ref(96)

const categoryTabs = computed<TabItem[]>(() => [
  { id: 'all', label: t('common.all') },
  ...[...new Set(assetStore.assets.map(a => a.category))].map(c => ({ id: c, label: t(`assets.cat${c}`) !== `assets.cat${c}` ? t(`assets.cat${c}`) : c })),
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return assetStore.assets.filter(a => (category.value === 'all' || a.category === category.value) && (!q || a.name.toLowerCase().includes(q)))
})

const visible = computed(() => filtered.value.slice(0, limit.value))
</script>
