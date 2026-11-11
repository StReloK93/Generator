<template>
  <div class="relative overflow-hidden bg-slate-950/60">
    <Transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
    >
      <img
        v-if="src"
        :key="src"
        :src="src"
        alt=""
        draggable="false"
        class="absolute inset-0 size-full object-cover"
      />
    </Transition>
    <div v-if="!src" class="absolute inset-0 flex items-center justify-center">
      <component :is="failed ? ImageOff : Loader2" :class="['size-5 text-slate-600', failed ? '' : 'animate-spin']" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ImageOff, Loader2 } from 'lucide-vue-next'
import type { MapSummary } from '../../services/mapManager'
import { getMapPreview } from '../../services/mapPreview'

/** The map's picture: the one its author attached, otherwise the map drawn small (once per map) */
const props = defineProps<{ map: MapSummary }>()

const src = ref<string | null>(null)
const failed = ref(false)

watch(
  () => props.map.id,
  async (id) => {
    src.value = null
    failed.value = false
    try {
      const url = await getMapPreview(props.map)
      if (props.map.id === id) src.value = url
    } catch (err) {
      console.warn('[MapPreview]', err)
      if (props.map.id === id) failed.value = true
    }
  },
  { immediate: true },
)
</script>
