<template>
  <UiModal
    :is-open="toolStore.isShortcutsModalOpen"
    :title="$t('shortcuts.title')"
    :subtitle="$t('shortcuts.subtitle')"
    :icon="Keyboard"
    icon-color="brand"
    size="4xl"
    @close="toolStore.isShortcutsModalOpen = false"
  >
    <div class="flex flex-col gap-6">
      
      <!-- Categorized Sections Separated by Clean Lines -->
      <div 
        v-for="cat in shortcutCategories" 
        :key="cat.id"
        class="flex flex-col gap-3"
      >
        <!-- Section Header with Line Divider -->
        <div class="flex items-center gap-2.5">
          <div 
            class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
            :class="cat.badgeClass"
          >
            <component :is="cat.icon" class="w-3.5 h-3.5" />
          </div>
          <span class="text-xs font-bold text-slate-200 tracking-wider uppercase font-sans whitespace-nowrap">
            {{ $t(cat.titleKey) }}
          </span>
          <div class="flex-1 h-px bg-slate-800/90 ml-2"></div>
        </div>

        <!-- 2-Column Wide Grid with Dotted Connectors -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <div
            v-for="item in cat.items"
            :key="item.actionKey"
            class="flex items-center justify-between gap-2.5 py-1.5 px-2.5 rounded-xl hover:bg-slate-800/30 transition-colors group"
          >
            <!-- Action Title (Guaranteed Single-Line) -->
            <span class="text-xs text-slate-300 font-medium whitespace-nowrap group-hover:text-slate-100">
              {{ $t(item.actionKey) }}
            </span>

            <!-- Subtle Dotted Connector Line -->
            <div class="flex-1 border-b border-dotted border-slate-700/60 mx-1.5 hidden sm:block"></div>

            <!-- Shortcut Key Badges -->
            <div class="flex items-center gap-1 shrink-0">
              <template v-for="(keyGroup, kIdx) in item.keys" :key="kIdx">
                <span v-if="kIdx > 0" class="text-[10px] text-slate-500 font-bold px-0.5">/</span>
                <div class="flex items-center gap-1">
                  <kbd 
                    v-for="(subKey, sIdx) in keyGroup" 
                    :key="sIdx"
                    class="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-700/90 text-brand-300 font-mono text-[11px] font-bold shadow-xs flex items-center justify-center min-w-5 whitespace-nowrap"
                  >
                    {{ subKey }}
                  </kbd>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Footer -->
    <template #footer>
      <div class="flex items-center justify-end w-full">
        <UiButton
          variant="primary"
          size="sm"
          @click="toolStore.isShortcutsModalOpen = false"
        >
          {{ $t('shortcuts.gotIt') }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { Keyboard, Paintbrush, Sparkles, Compass, Zap } from 'lucide-vue-next'
import { UiModal, UiButton } from './ui'
import { useToolStore } from '../stores/toolStore'

const toolStore = useToolStore()

interface ShortcutItem {
  actionKey: string
  keys: string[][]
}

interface ShortcutCategory {
  id: string
  titleKey: string
  icon: any
  badgeClass: string
  items: ShortcutItem[]
}

const shortcutCategories: ShortcutCategory[] = [
  {
    id: 'tools',
    titleKey: 'shortcuts.categoryTools',
    icon: Paintbrush,
    badgeClass: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    items: [
      { actionKey: 'shortcuts.selectInspect', keys: [['V']] },
      { actionKey: 'shortcuts.brush', keys: [['B']] },
      { actionKey: 'shortcuts.eraser', keys: [['E']] },
      { actionKey: 'shortcuts.bucketFill', keys: [['G']] },
      { actionKey: 'shortcuts.eyedropper', keys: [['I']] },
      { actionKey: 'shortcuts.lineTool', keys: [['L']] },
      { actionKey: 'shortcuts.boxFill', keys: [['F'], ['U']] },
      { actionKey: 'shortcuts.boxClear', keys: [['C']] },
    ]
  },
  {
    id: 'mapFill',
    titleKey: 'shortcuts.categoryMapFill',
    icon: Sparkles,
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    items: [
      { actionKey: 'shortcuts.quickFillEmpty', keys: [['Shift', 'E']] },
      { actionKey: 'shortcuts.fillGroundModal', keys: [['Shift', 'G']] },
    ]
  },
  {
    id: 'navigation',
    titleKey: 'shortcuts.categoryNavigation',
    icon: Compass,
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    items: [
      { actionKey: 'shortcuts.panCanvas', keys: [['Space', 'Drag']] },
      { actionKey: 'shortcuts.zoomCanvas', keys: [['Wheel']] },
      { actionKey: 'shortcuts.focusCenter', keys: [['Home'], ['Ctrl', '0']] },
      { actionKey: 'shortcuts.toggleGrid', keys: [['H']] },
      { actionKey: 'shortcuts.toggleCoordinates', keys: [['K']] },
    ]
  },
  {
    id: 'actions',
    titleKey: 'shortcuts.categoryActions',
    icon: Zap,
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    items: [
      { actionKey: 'shortcuts.undo', keys: [['Ctrl', 'Z']] },
      { actionKey: 'shortcuts.redo', keys: [['Ctrl', 'Y'], ['Ctrl', 'Shift', 'Z']] },
      { actionKey: 'shortcuts.deleteItem', keys: [['Delete'], ['Backspace']] },
      { actionKey: 'shortcuts.cancelDeselect', keys: [['Esc']] },
      { actionKey: 'shortcuts.stackModifier', keys: [['Shift', 'Click']] },
      { actionKey: 'shortcuts.replaceModifier', keys: [['Ctrl', 'Click']] },
      { actionKey: 'shortcuts.gameConfigModal', keys: [['T']] },
      { actionKey: 'shortcuts.routeSimulation', keys: [['P']] },
      { actionKey: 'shortcuts.shortcutsHelp', keys: [['?'], ['F1']] },
    ]
  }
]
</script>

