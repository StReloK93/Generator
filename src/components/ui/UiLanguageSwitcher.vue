<template>
  <div class="relative inline-flex items-center text-xs font-semibold select-none" ref="dropdownRef">
    <!-- Ghost / Transparent Trigger -->
    <button
      type="button"
      @click="isOpen = !isOpen"
      :class="[
        'flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition-all duration-200 cursor-pointer',
        'bg-transparent hover:bg-slate-800/80 text-slate-300 hover:text-white border-0 shadow-none active:scale-95',
        isOpen ? 'bg-slate-800/80 text-white' : ''
      ]"
      :title="'Language: ' + activeLocaleOption.label"
    >
      <Languages class="w-4 h-4 text-slate-300 shrink-0" />
      <span class="tracking-wider uppercase font-bold text-[11px] text-slate-300">{{ currentLocale }}</span>
      <ChevronDown class="w-3 h-3 text-slate-400 transition-transform duration-200" :class="{ 'rotate-180': isOpen }" />
    </button>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="transform scale-95 opacity-0 -translate-y-1"
      enter-to-class="transform scale-100 opacity-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="transform scale-100 opacity-100 translate-y-0"
      leave-to-class="transform scale-95 opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute right-0 top-full mt-1.5 w-36 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-xl shadow-black/50 py-1 z-100 overflow-hidden"
      >
        <button
          v-for="loc in locales"
          :key="loc.code"
          type="button"
          @click="selectLocale(loc.code)"
          :class="[
            'w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors duration-150 cursor-pointer',
            loc.code === currentLocale
              ? 'bg-brand-500/20 text-brand-300 font-bold border-l-2 border-brand-500'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border-l-2 border-transparent'
          ]"
        >
          <div class="flex items-center gap-2">
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
              {{ loc.flag }}
            </span>
            <span>{{ loc.nativeName }}</span>
          </div>
          <Check v-if="loc.code === currentLocale" class="w-3.5 h-3.5 text-brand-400 shrink-0" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Languages, ChevronDown, Check } from 'lucide-vue-next'
import { useI18nStore, type SupportedLocale } from '@/stores/i18nStore'

const i18n = useI18nStore()
const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const currentLocale = computed(() => i18n.currentLocale)
const locales = computed(() => i18n.locales)
const activeLocaleOption = computed(() => 
  locales.value.find(l => l.code === currentLocale.value) || locales.value[0]
)

function selectLocale(code: SupportedLocale) {
  i18n.setLocale(code)
  isOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  window.removeEventListener('click', handleClickOutside)
})
</script>
