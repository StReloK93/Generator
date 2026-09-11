<template>
  <div 
    class="fixed top-14 right-3 z-40 pointer-events-auto select-none font-sans max-w-[calc(100vw-1.5rem)] sm:max-w-sm"
    @mousedown.stop 
    @mouseup.stop 
    @click.stop 
    @touchstart.stop 
    @touchend.stop 
    @touchmove.stop
  >
    <!-- Collapsed Toggle Button -->
    <div v-if="!isExpanded" class="flex justify-end">
      <button
        type="button"
        @click="isExpanded = true"
        class="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/90 hover:bg-slate-900 border-2 border-amber-400 text-amber-300 shadow-xl shadow-amber-500/10 backdrop-blur-md transition-all cursor-pointer group active:scale-95"
      >
        <div class="w-5 h-5 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:rotate-12 transition-transform">
          <Wrench class="w-3.5 h-3.5" />
        </div>
        <span class="text-xs font-black tracking-wide uppercase">{{ $t('sandbox.title') }}</span>
        <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
      </button>
    </div>

    <!-- Expanded Sandbox Tools Card -->
    <UiCard
      v-else
      variant="slate"
      padding="sm"
      custom-class="border-amber-400/80 shadow-2xl bg-slate-950/95 backdrop-blur-2xl flex flex-col gap-2.5 max-h-[85vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-150"
    >
      <!-- Header Bar -->
      <div class="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Wrench class="w-3.5 h-3.5" />
          </div>
          <div class="flex flex-col">
            <span class="text-xs font-black text-amber-300 uppercase tracking-wide leading-tight">{{ $t('sandbox.title') }}</span>
            <span class="text-[10px] text-slate-400 leading-tight">{{ $t('sandbox.editorModeOnly') }}</span>
          </div>
        </div>

        <div class="flex items-center gap-1">
          <!-- Live TD Settings Modal Open Button -->
          <UiButton
            variant="game-amber"
            size="xs"
            :leading-icon="Settings"
            @click="openLiveConfigModal"
            :title="$t('sandbox.openTdSettings')"
          >
            {{ $t('sandbox.tdSettings') }}
          </UiButton>

          <UiIconButton
            :icon="X"
            size="xs"
            variant="ghost"
            @click="isExpanded = false"
          />
        </div>
      </div>

      <!-- Prominent Full Match Reset Action (Wave 1, Custom Gold, Clear Towers) -->
      <div class="flex flex-col gap-1 p-2 rounded-xl bg-linear-to-r from-amber-950/40 to-rose-950/30 border border-amber-500/40 shadow-inner">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-black text-amber-200 uppercase tracking-wide flex items-center gap-1">
            <RotateCcw class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ $t('sandbox.restartGame') }}</span>
          </span>
          <UiBadge variant="amber" size="xs">{{ $t('sandbox.wave1') }}</UiBadge>
        </div>
        <p class="text-[10px] text-slate-400 leading-tight">
          {{ $t('sandbox.restartGameDesc') }}
        </p>
        <div class="pt-1">
          <UiButton
            variant="game-amber"
            size="sm"
            class="w-full justify-center text-xs font-black shadow-md"
            :leading-icon="RotateCcw"
            @click="handleRestartTestGame"
          >
            {{ $t('sandbox.restartGame') }} ({{ testStartingGold }} {{ $t('common.gold') }})
          </UiButton>
        </div>
      </div>

      <!-- Quick Section Tabs -->
      <UiTabs
        v-model="activeTab"
        :items="sandboxTabs"
        size="xs"
        variant="amber"
      />

      <!-- ========================================================================= -->
      <!-- TAB 1: ECONOMY & LIVES CONTROLS                                           -->
      <!-- ========================================================================= -->
      <div v-if="activeTab === 'economy'" class="flex flex-col gap-2.5">
        <!-- 1. Starting Gold Configuration (Initial for Match Reset) -->
        <div class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-amber-300 flex items-center gap-1">
              <Coins class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ $t('sandbox.startingGold') }}</span>
            </span>
            <span class="font-mono text-[10px] text-slate-400">{{ testStartingGold }} {{ $t('common.gold') }}</span>
          </div>

          <!-- Direct Numeric Input for Starting Gold -->
          <UiNumberInput
            v-model="testStartingGold"
            :min="0"
            :max="99999"
            :step="50"
            size="sm"
            variant="stepper"
            @change="handleStartingGoldChange"
          />

          <!-- Quick Delta Steppers for Starting Gold -->
          <div class="grid grid-cols-5 gap-1 pt-0.5">
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="adjustStartingGold(-500)"
            >
              -500
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="adjustStartingGold(-100)"
            >
              -100
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="adjustStartingGold(100)"
            >
              +100
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="adjustStartingGold(500)"
            >
              +500
            </UiButton>
            <UiButton
              variant="game-amber"
              size="xs"
              class="px-1! text-[10px]!"
              @click="adjustStartingGold(1000)"
            >
              +1k
            </UiButton>
          </div>
        </div>

        <!-- 2. Live Gold Cheats & Manual Input (Current Match Gold) -->
        <div class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-yellow-300 flex items-center gap-1">
              <Coins class="w-3.5 h-3.5 text-yellow-400" />
              <span>{{ $t('sandbox.currentGold') }}</span>
            </span>
            <UiBadge variant="amber" size="xs">{{ characterStore.gold }} {{ $t('common.gold') }}</UiBadge>
          </div>

          <!-- Direct Input for Live Gold -->
          <UiNumberInput
            v-model="characterStore.gold"
            :min="0"
            :max="999999"
            :step="100"
            size="sm"
            variant="stepper"
          />

          <!-- Quick Delta Add / Subtract buttons -->
          <div class="grid grid-cols-6 gap-1 pt-0.5">
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddGold(-500)"
            >
              -500
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddGold(-100)"
            >
              -100
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddGold(100)"
            >
              +100
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddGold(500)"
            >
              +500
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddGold(2000)"
            >
              +2k
            </UiButton>
            <UiButton
              variant="game-amber"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devSetGold(99999)"
            >
              {{ $t('sandbox.max') }} (99k)
            </UiButton>
          </div>
        </div>

        <!-- 3. Lives Cheats & Direct Input -->
        <div class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-rose-300 flex items-center gap-1">
              <Heart class="w-3.5 h-3.5 text-rose-400" />
              <span>{{ $t('sandbox.currentLives') }}</span>
            </span>
            <UiBadge variant="rose" size="xs">{{ characterStore.playerLives }} {{ $t('common.lives') }}</UiBadge>
          </div>

          <UiNumberInput
            v-model="characterStore.playerLives"
            :min="1"
            :max="999"
            :step="1"
            size="sm"
            variant="stepper"
          />

          <div class="grid grid-cols-5 gap-1 pt-0.5">
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddLives(-5)"
            >
              -5
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddLives(-1)"
            >
              -1
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddLives(1)"
            >
              +1
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devAddLives(5)"
            >
              +5
            </UiButton>
            <UiButton
              variant="danger"
              size="xs"
              class="px-1! text-[10px]!"
              @click="characterStore.devSetLives(99)"
            >
              {{ $t('sandbox.max99') }}
            </UiButton>
          </div>
        </div>

        <!-- 4. Battlefield Quick Cleanup Tools -->
        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <UiButton
            variant="danger"
            size="xs"
            :leading-icon="Trash2"
            @click="handleClearTowers"
          >
            {{ $t('sandbox.clearTowers') }}
          </UiButton>
          <UiButton
            variant="secondary"
            size="xs"
            :leading-icon="Skull"
            @click="characterStore.devClearAllCreeps()"
          >
            {{ $t('sandbox.clearCreeps') }}
          </UiButton>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- TAB 2: WAVES CONTROLLER & LIVE CREAP TUNER                                -->
      <!-- ========================================================================= -->
      <div v-if="activeTab === 'waves'" class="flex flex-col gap-2.5">
        <!-- Wave Switcher & Spawner Row -->
        <div class="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div class="flex items-center justify-between gap-1 flex-wrap">
            <span class="text-[11px] font-bold text-sky-300 flex items-center gap-1">
              <ShieldAlert class="w-3.5 h-3.5 text-sky-400" />
              <span>{{ $t('config.tabWaves') }} ({{ characterStore.currentWaveIndex + 1 }} / {{ characterStore.waveConfigs.length }})</span>
            </span>

            <UiButton
              variant="secondary"
              size="xs"
              :leading-icon="Plus"
              @click="handleAddNewWave"
            >
              {{ $t('sandbox.addWave') }}
            </UiButton>
          </div>

          <!-- Wave Jump Pills -->
          <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 max-h-18">
            <button
              v-for="(w, idx) in characterStore.waveConfigs"
              :key="idx"
              type="button"
              :class="[
                'px-2 py-1 rounded-lg border text-[11px] font-bold transition-all cursor-pointer shrink-0',
                characterStore.currentWaveIndex === idx
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300 shadow-sm ring-1 ring-sky-400/40'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              ]"
              @click="characterStore.devJumpToWave(idx)"
            >
              W{{ idx + 1 }}
            </button>
          </div>

          <!-- Wave Action Buttons -->
          <div class="grid grid-cols-3 gap-1.5 pt-1">
            <UiButton
              variant="game-amber"
              size="xs"
              :leading-icon="Play"
              @click="characterStore.devSpawnWaveNow()"
            >
              {{ $t('sandbox.spawnNow') }}
            </UiButton>
            <UiButton
              variant="secondary"
              size="xs"
              :leading-icon="RotateCcw"
              @click="characterStore.devRestartCurrentWave()"
            >
              {{ $t('sandbox.restart') }}
            </UiButton>
            <UiButton
              variant="danger"
              size="xs"
              :leading-icon="Trash2"
              @click="characterStore.devClearAllCreeps()"
            >
              {{ $t('sandbox.clearCreeps') }}
            </UiButton>
          </div>
        </div>

        <!-- Live Wave Creep Property Tweakers (Real-Time!) -->
        <div v-if="activeWave" class="flex flex-col gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <span class="text-[11px] font-bold text-slate-200">{{ activeWave.name }} ({{ $t('sandbox.liveTweak') }})</span>
            <UiBadge variant="cyan" size="xs">{{ activeWave.unitHp }} HP</UiBadge>
          </div>

          <!-- Unit HP Stepper -->
          <UiSlider
            :model-value="activeWave.unitHp"
            :label="$t('config.unitHp')"
            :min="10"
            :max="5000"
            :step="20"
            unit=" HP"
            @update:model-value="(val) => characterStore.devUpdateActiveWaveHp(val)"
          />

          <!-- Unit Speed -->
          <UiSlider
            :model-value="activeWave.unitSpeed"
            :label="$t('config.unitSpeed')"
            :min="0.5"
            :max="6.0"
            :step="0.1"
            :unit="' ' + $t('common.tilesPerSec')"
            @update:model-value="(val) => characterStore.devUpdateActiveWaveSpeed(val)"
          />

          <!-- Unit Count -->
          <UiSlider
            :model-value="activeWave.unitCount"
            :label="$t('config.unitCount')"
            :min="1"
            :max="50"
            :step="1"
            :unit="' ' + $t('common.units')"
            @update:model-value="(val) => characterStore.devUpdateActiveWaveCount(val)"
          />

          <!-- Live Immunities Toggle Pills -->
          <div class="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
            <span class="text-[10px] font-semibold text-slate-400">{{ $t('traits.immunities') }} ({{ $t('sandbox.toggleLive') }})</span>
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-1">
              <button
                v-for="trait in TOWER_TRAITS"
                :key="trait.id"
                type="button"
                :class="[
                  'flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer',
                  isTraitImmune(trait.id)
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                ]"
                @click="characterStore.devToggleActiveWaveImmunity(trait.id)"
              >
                <component :is="trait.icon" class="w-3 h-3" :style="{ color: isTraitImmune(trait.id) ? trait.color : '#94a3b8' }" />
                <span class="truncate">{{ $t(trait.nameKey) }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </UiCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  Wrench,
  Coins,
  Heart,
  ShieldAlert,
  Plus,
  Play,
  RotateCcw,
  Trash2,
  Settings,
  Skull,
  X,
} from 'lucide-vue-next'
import {
  UiCard,
  UiButton,
  UiIconButton,
  UiTabs,
  UiSlider,
  UiNumberInput,
  UiBadge,
  TabItem,
} from '../ui'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useToolStore } from '../../stores/toolStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { TOWER_TRAITS } from '../../utils/towerTraits'
import { TowerTraitType } from '../../types/map'

const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const toolStore = useToolStore()
const notify = useNotificationStore()
const { t } = useI18n()

const isExpanded = ref(false)
const activeTab = ref('economy')

// Local editable test starting gold, default from store
const testStartingGold = ref(characterStore.startingGold || 250)

watch(() => characterStore.startingGold, (newVal) => {
  if (newVal !== undefined && newVal !== testStartingGold.value) {
    testStartingGold.value = newVal
  }
})

const sandboxTabs = computed<TabItem[]>(() => [
  { id: 'economy', label: t('common.gold') + ' & ' + t('common.lives'), icon: Coins },
  { id: 'waves', label: t('config.tabWaves'), icon: ShieldAlert },
])

const activeWave = computed(() => characterStore.currentWaveConfig)

function isTraitImmune(traitId: TowerTraitType): boolean {
  return activeWave.value?.immunities?.includes(traitId) ?? false
}

function handleStartingGoldChange(val: number) {
  testStartingGold.value = Math.max(0, val)
  characterStore.devSetStartingGold(testStartingGold.value)
}

function adjustStartingGold(delta: number) {
  testStartingGold.value = Math.max(0, testStartingGold.value + delta)
  characterStore.devSetStartingGold(testStartingGold.value)
}

function handleRestartTestGame() {
  characterStore.devResetGame(testStartingGold.value, true)
  notify.success(t('sandbox.resetSuccess'), t('sandbox.restartGame'))
}

function handleClearTowers() {
  towerStore.clearAllTowers()
  notify.info(t('sandbox.clearTowers'))
}

function handleAddNewWave() {
  const newWave = characterStore.devAddWave()
  if (newWave) {
    characterStore.devJumpToWave(characterStore.waveConfigs.length - 1)
  }
}

function openLiveConfigModal() {
  toolStore.openGameConfig('towers')
}
</script>
