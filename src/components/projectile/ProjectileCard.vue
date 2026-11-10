<template>
  <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
    <div class="flex items-center gap-2.5 min-w-0">
      <ProjectileSwatch :def="def" />
      <div class="flex flex-col min-w-0">
        <span class="text-xs font-bold text-slate-100 truncate">{{ projectileName(def, t) }}</span>
        <span class="flex items-center gap-1.5 flex-wrap mt-0.5">
          <UiBadge :variant="ELEMENT_INFO[def.element].badge" size="xs" :icon="ELEMENT_INFO[def.element].icon">{{ $t(`pe.element.${def.element}`) }}</UiBadge>
          <UiBadge variant="slate" size="xs" :icon="BEHAVIOR_INFO[def.behavior].icon">{{ $t(BEHAVIOR_INFO[def.behavior].label) }}</UiBadge>
        </span>
      </div>
    </div>
    <UiButton variant="secondary" size="xs" :leading-icon="Crosshair" @click="emit('change')">
      {{ $t('common.change') }}
    </UiButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Crosshair } from 'lucide-vue-next'
import { UiBadge, UiButton } from '../ui'
import { useProjectileStore } from '../../stores/projectileStore'
import { useI18n } from '../../stores/i18nStore'
import ProjectileSwatch from './ProjectileSwatch.vue'
import { BEHAVIOR_INFO, ELEMENT_INFO, projectileName } from './projectileLabels'

const props = defineProps<{ projectileId: string | null | undefined }>()
const emit = defineEmits<{ (e: 'change'): void }>()

const store = useProjectileStore()
const { t } = useI18n()
const def = computed(() => store.get(props.projectileId))
</script>
