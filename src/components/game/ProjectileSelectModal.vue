<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('pe.pickTitle')"
    :subtitle="$t('pe.pickSubtitle', { count: store.presets.length })"
    :icon="Crosshair"
    icon-color="amber"
    size="5xl"
    @close="emit('close')"
  >
    <div class="flex flex-col md:flex-row gap-3 h-[70vh] md:h-[62vh]">
      <!-- Live firing range of the highlighted projectile -->
      <div class="md:w-96 shrink-0 flex flex-col gap-2">
        <div class="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 h-48 md:h-auto md:flex-1">
          <ProjectilePreview v-if="isOpen" :def="active" />
        </div>
        <div class="flex items-center gap-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <ProjectileSwatch :def="active" />
          <div class="flex flex-col min-w-0 flex-1">
            <span class="text-sm font-bold text-slate-100 truncate">{{ projectileName(active, t) }}</span>
            <span class="flex items-center gap-1.5 flex-wrap mt-0.5">
              <UiBadge :variant="ELEMENT_INFO[active.element].badge" size="xs" :icon="ELEMENT_INFO[active.element].icon">{{ $t(`pe.element.${active.element}`) }}</UiBadge>
              <UiBadge variant="slate" size="xs" :icon="BEHAVIOR_INFO[active.behavior].icon">{{ $t(BEHAVIOR_INFO[active.behavior].label) }}</UiBadge>
              <UiBadge v-if="active.launch.count > 1 && active.behavior === 'flying'" variant="brand" size="xs">×{{ active.launch.count }}</UiBadge>
            </span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UiButton variant="secondary" size="sm" :leading-icon="Wand2" custom-class="flex-1" @click="openStudio">{{ $t('pe.openStudio') }}</UiButton>
          <UiButton variant="game-green" size="sm" :leading-icon="Check" custom-class="flex-1" @click="apply(selectedId)">{{ $t('common.apply') }}</UiButton>
        </div>
      </div>

      <!-- Library -->
      <div class="flex-1 min-h-0 min-w-0">
        <ProjectileLibrary v-model="selectedId" @pick="apply" />
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Crosshair, Wand2, Check } from 'lucide-vue-next'
import { UiModal, UiButton, UiBadge } from '../ui'
import { useProjectileStore } from '../../stores/projectileStore'
import { useI18n } from '../../stores/i18nStore'
import ProjectileLibrary from '../projectile/ProjectileLibrary.vue'
import ProjectilePreview from '../projectile/ProjectilePreview.vue'
import ProjectileSwatch from '../projectile/ProjectileSwatch.vue'
import { BEHAVIOR_INFO, ELEMENT_INFO, projectileName } from '../projectile/projectileLabels'

const props = defineProps<{
  isOpen: boolean
  currentProjectileId?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', projectileId: string): void
}>()

const router = useRouter()
const store = useProjectileStore()
const { t } = useI18n()

const selectedId = ref(store.get(props.currentProjectileId).id)
const active = computed(() => store.get(selectedId.value))

watch(() => props.isOpen, open => {
  if (open) selectedId.value = store.get(props.currentProjectileId).id
})

function apply(id: string): void {
  emit('select', id)
  emit('close')
}

function openStudio(): void {
  emit('close')
  router.push({ path: '/projectile-editor', query: { id: selectedId.value } })
}
</script>
