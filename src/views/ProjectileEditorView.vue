<template>
  <div class="h-dvh max-h-dvh w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
    <!-- TOP HEADER -->
    <header class="h-14 shrink-0 bg-slate-900/90 border-b border-slate-800/80 px-4 flex items-center justify-between z-20 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="ArrowLeft"
          @click="handleBack"
        >
          {{ t('common.back') }}
        </UiButton>

        <div class="h-5 w-px bg-slate-800" />

        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crosshair class="w-4 h-4" />
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-100 leading-none">
              {{ t('projectiles.studioTitle') }}
            </h1>
            <span class="text-[10px] text-slate-400 font-medium">
              {{ t('projectiles.studioSubtitle') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="Download"
          @click="projectileStore.exportProjectilesJson"
        >
          {{ t('projectiles.exportJson') }}
        </UiButton>

        <label class="cursor-pointer">
          <input
            type="file"
            accept=".json"
            class="hidden"
            @change="handleImportJson"
          />
          <span class="inline-flex items-center justify-center font-semibold rounded-xl text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer">
            <Upload class="w-3.5 h-3.5 mr-1.5" />
            {{ t('projectiles.importJson') }}
          </span>
        </label>

        <UiButton
          variant="danger"
          size="sm"
          :leading-icon="RotateCcw"
          @click="confirmResetDefaults"
        >
          {{ t('projectiles.resetDefaults') }}
        </UiButton>

        <div class="h-5 w-px bg-slate-800 mx-1" />

        <!-- Language Switcher -->
        <UiLanguageSwitcher />
      </div>
    </header>

    <!-- MAIN 3-COLUMN STUDIO WORKSPACE -->
    <div class="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-slate-950">
      <!-- 1. LEFT COLUMN: SQUARE 1:1 LIVE ISOMETRIC ARENA STAGE -->
      <div class="w-full lg:w-96 xl:w-115 shrink-0 flex flex-col justify-between p-3.5 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-y-auto custom-scrollbar">
        <!-- Top HUD Badge -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg">
            <span 
              class="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
              :style="{ backgroundColor: currentForm.colorCss }"
            />
            <span class="text-xs font-bold text-slate-100 truncate max-w-36 sm:max-w-48">
              {{ getLocalizedName(currentForm) }}
            </span>
            <UiBadge variant="amber" size="xs">
              {{ currentForm.category.toUpperCase() }}
            </UiBadge>
            <span v-if="currentForm.isCustom" class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-pink-950/80 text-pink-300 border border-pink-800/60">
              {{ t('common.custom').toUpperCase() }}
            </span>
          </div>

          <span class="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
            2.5D Arena
          </span>
        </div>

        <!-- Dedicated Square 1:1 Live Arena Canvas Container -->
        <div class="relative w-full aspect-square max-w-88 sm:max-w-96 xl:max-w-105 mx-auto rounded-3xl bg-slate-950 border border-slate-800/90 shadow-2xl overflow-hidden my-auto flex items-center justify-center group">
          <canvas ref="arenaCanvasRef" class="w-full h-full block"></canvas>

          <!-- Top-Right Mode Badge inside Canvas -->
          <div class="absolute top-3 right-3 pointer-events-none flex flex-col items-end gap-1">
            <span v-if="currentForm.isLaser" class="text-[9px] font-mono font-bold text-purple-300 bg-purple-950/90 px-2 py-0.5 rounded-md border border-purple-800/60 shadow-md">
              BEAM
            </span>
            <span v-if="currentForm.hasArc" class="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-800/60 shadow-md">
              ARC (Ballistic)
            </span>
          </div>
        </div>

        <!-- Bottom Live Arena Controls -->
        <div class="flex flex-col gap-2 mt-3">
          <div class="flex items-center justify-between gap-2">
            <UiButton
              variant="game-amber"
              size="sm"
              :leading-icon="Zap"
              custom-class="flex-1"
              @click="spawnManualShot"
            >
              {{ t('header.playTest') }} ({{ t('common.start') }})
            </UiButton>
            <div class="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <span>{{ t('common.speed') }}:</span>
              <span class="font-mono text-amber-400 font-bold">{{ shootIntervalSec }}s</span>
            </div>
          </div>

          <div class="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/70 text-[11px] font-mono text-slate-400">
            <span>{{ t('projectiles.formation') }}: <b class="text-slate-200">{{ currentForm.formation }}</b></span>
            <span>{{ t('projectiles.shape') }}: <b class="text-slate-200">{{ currentForm.shape }}</b></span>
          </div>
        </div>
      </div>

      <!-- 2. CENTER COLUMN: PROPERTIES INSPECTOR TABS & FORMS -->
      <div class="flex-1 flex flex-col overflow-hidden bg-slate-900/40 border-b lg:border-b-0 min-w-0">
        <!-- Tab Navigation -->
        <div class="px-4 pt-3 border-b border-slate-800/80 bg-slate-900/60">
          <UiTabs
            v-model="activeTab"
            :items="[
              { id: 'shape', label: t('projectiles.tabShape') },
              { id: 'colors', label: t('projectiles.tabColors') },
              { id: 'impact', label: t('projectiles.tabImpact') }
            ]"
            variant="pills"
            size="sm"
          />
        </div>

          <!-- Form Content -->
          <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
            <!-- TAB 1: SHAPE & FORMATION -->
            <div v-if="activeTab === 'shape'" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UiInput
                  v-model="currentForm.name"
                  :label="t('projectiles.englishName')"
                  placeholder="e.g. Blazing Phoenix Bolt"
                />
                <UiInput
                  v-model="currentForm.nameUz"
                  :label="t('projectiles.uzbekName')"
                  placeholder="e.g. Olovli Fenix Nayzasi"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">{{ t('projectiles.category') }}</label>
                  <select
                    v-model="currentForm.category"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="fire">🔥 {{ t('projectiles.catFire') }}</option>
                    <option value="frost">❄️ {{ t('projectiles.catFrost') }}</option>
                    <option value="electro">⚡ {{ t('projectiles.catElectro') }}</option>
                    <option value="poison">🧪 {{ t('projectiles.catPoison') }}</option>
                    <option value="arcane">🔮 {{ t('projectiles.catArcane') }}</option>
                    <option value="void">💀 {{ t('projectiles.catVoid') }}</option>
                    <option value="siege">🏹 {{ t('projectiles.catSiege') }}</option>
                    <option value="holy">✨ {{ t('projectiles.catHoly') }}</option>
                    <option value="custom">🌟 {{ t('projectiles.catCustom') }}</option>
                  </select>
                </div>

                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">{{ t('projectiles.formation') }}</label>
                  <select
                    v-model="currentForm.formation"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="single">{{ t('projectiles.formSingle') }}</option>
                    <option value="volley_3">{{ t('projectiles.formVolley3') }}</option>
                    <option value="twin_helix">{{ t('projectiles.formTwinHelix') }}</option>
                    <option value="satellites">{{ t('projectiles.formSatellites') }}</option>
                    <option value="laser_beam">{{ t('projectiles.formLaserBeam') }}</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">{{ t('projectiles.shape') }}</label>
                  <select
                    v-model="currentForm.shape"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="circle">{{ t('projectiles.shapeCircle') }}</option>
                    <option value="arrow">{{ t('projectiles.shapeArrow') }}</option>
                    <option value="diamond_shard">{{ t('projectiles.shapeDiamondShard') }}</option>
                    <option value="star">{{ t('projectiles.shapeStar') }}</option>
                    <option value="sawblade">{{ t('projectiles.shapeSawblade') }}</option>
                    <option value="skull">{{ t('projectiles.shapeSkull') }}</option>
                    <option value="greatsword">{{ t('projectiles.shapeGreatsword') }}</option>
                    <option value="hammer">{{ t('projectiles.shapeHammer') }}</option>
                    <option value="boulder">{{ t('projectiles.shapeBoulder') }}</option>
                    <option value="feather">{{ t('projectiles.shapeFeather') }}</option>
                  </select>
                </div>

                <div class="flex items-center gap-4 pt-4">
                  <UiSwitch
                    v-model="currentForm.hasArc"
                    :label="t('projectiles.parabolicArc')"
                    size="sm"
                  />
                  <UiSwitch
                    v-model="currentForm.isLaser"
                    :label="t('projectiles.laserMode')"
                    size="sm"
                  />
                </div>
              </div>

              <!-- Sliders for Geometry -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <UiSlider
                  v-model="currentForm.size"
                  :label="t('projectiles.size')"
                  :min="4"
                  :max="70"
                  :step="1"
                  unit="px"
                />

                <UiSlider
                  v-if="currentForm.shape === 'arrow' || currentForm.shape === 'greatsword' || currentForm.shape === 'feather' || currentForm.shape === 'hammer'"
                  v-model="lengthModel"
                  :label="t('projectiles.length')"
                  :min="10"
                  :max="100"
                  :step="1"
                  unit="px"
                />

                <UiSlider
                  v-if="currentForm.formation === 'satellites'"
                  v-model="satellitesModel"
                  :label="t('projectiles.satelliteCount')"
                  :min="1"
                  :max="8"
                  :step="1"
                />

                <UiSlider
                  v-if="currentForm.shape === 'star'"
                  v-model="pointsModel"
                  :label="t('projectiles.starPoints')"
                  :min="4"
                  :max="12"
                  :step="2"
                />
              </div>

              <UiInput
                v-model="currentForm.description"
                :label="t('projectiles.description')"
                placeholder="..."
              />
            </div>

            <!-- TAB 2: COLORS & TRAILS -->
            <div v-if="activeTab === 'colors'" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="block text-xs font-semibold text-slate-400">{{ t('projectiles.headColor') }}</label>
                  <UiColorPicker v-model="currentForm.colorCss" />
                </div>

                <div class="space-y-2">
                  <label class="block text-xs font-semibold text-slate-400">{{ t('projectiles.trailColor') }}</label>
                  <UiColorPicker v-model="currentForm.trailColorCss" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div class="space-y-2">
                  <label class="block text-xs font-semibold text-slate-400">{{ t('projectiles.sparkColor') }}</label>
                  <UiColorPicker v-model="currentForm.sparkColorCss" />
                </div>

                <div class="space-y-2">
                  <label class="block text-xs font-semibold text-slate-400">{{ t('projectiles.shockwaveColor') }}</label>
                  <UiColorPicker v-model="currentForm.shockwaveColorCss" />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                <UiSlider
                  v-model="currentForm.trailAlpha"
                  :label="t('projectiles.trailAlpha')"
                  :min="0.1"
                  :max="1.0"
                  :step="0.05"
                />
                <UiSlider
                  v-model="currentForm.trailWidth"
                  :label="t('projectiles.trailWidth')"
                  :min="1"
                  :max="25"
                  :step="1"
                  unit="px"
                />
                <UiSlider
                  v-model="currentForm.trailLength"
                  :label="t('projectiles.trailLength')"
                  :min="4"
                  :max="35"
                  :step="1"
                />
              </div>
            </div>

            <!-- TAB 3: IMPACT & EXPLOSIONS -->
            <div v-if="activeTab === 'impact'" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">{{ t('projectiles.sparkType') }}</label>
                  <select
                    v-model="currentForm.sparkType"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="fire_ember">🔥 {{ t('projectiles.sparkFireEmber') }}</option>
                    <option value="ice_shard">❄️ {{ t('projectiles.sparkIceShard') }}</option>
                    <option value="snowflake">❄️ {{ t('projectiles.sparkSnowflake') }}</option>
                    <option value="lightning_arc">⚡ {{ t('projectiles.sparkLightningArc') }}</option>
                    <option value="acid_drop">🧪 {{ t('projectiles.sparkAcidDrop') }}</option>
                    <option value="arcane_star">🔮 {{ t('projectiles.sparkArcaneStar') }}</option>
                    <option value="void_blood">💀 {{ t('projectiles.sparkVoidBlood') }}</option>
                    <option value="shrapnel">🏹 {{ t('projectiles.sparkShrapnel') }}</option>
                    <option value="holy_cross">✨ {{ t('projectiles.sparkHolyCross') }}</option>
                  </select>
                </div>

                <div class="flex items-center gap-4 pt-4">
                  <UiSwitch
                    v-model="currentForm.hasDoubleRing"
                    :label="t('projectiles.doubleRing')"
                    size="sm"
                  />
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <UiSlider
                  v-model="currentForm.sparkCount"
                  :label="t('projectiles.sparkCount')"
                  :min="6"
                  :max="60"
                  :step="2"
                />
                <UiSlider
                  v-model="currentForm.shockwaveRadius"
                  :label="t('projectiles.shockwaveRadius')"
                  :min="10"
                  :max="80"
                  :step="1"
                  unit="px"
                />
              </div>
            </div>
          </div>

          <!-- Bottom Footer Action Bar -->
          <div class="h-14 shrink-0 bg-slate-900/90 border-t border-slate-800 px-4 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-400">ID:</span>
              <span class="text-xs font-mono font-bold text-amber-400">{{ currentForm.id }}</span>
            </div>

            <div class="flex items-center gap-2">
              <UiButton
                variant="secondary"
                size="sm"
                :leading-icon="Copy"
                @click="handleDuplicate"
              >
                {{ t('projectiles.duplicate') }}
              </UiButton>

              <UiButton
                variant="game-amber"
                size="sm"
                :leading-icon="Save"
                @click="handleSave"
              >
                {{ t('projectiles.save') }}
              </UiButton>
            </div>
          </div>
        </div>

      <!-- RIGHT SIDEBAR: PROJECTILES EXPLORER LIST -->
      <div class="w-full lg:w-88 xl:w-96 flex flex-col bg-slate-900/80 border-l border-slate-800/80 overflow-hidden">
        <!-- Sidebar Header -->
        <div class="p-3 border-b border-slate-800 space-y-2.5 bg-slate-900/90">
          <div class="flex items-center justify-between gap-2">
            <UiInput
              v-model="searchQuery"
              size="sm"
              :placeholder="t('projectiles.search')"
              :leading-icon="Search"
              class="flex-1"
            />
            <UiButton
              variant="game-green"
              size="sm"
              :leading-icon="Plus"
              @click="handleCreateNew"
            >
              {{ t('common.create') }}
            </UiButton>
          </div>

          <!-- Category filter buttons -->
          <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
            <button
              type="button"
              :class="[
                'px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border',
                selectedCategory === 'all'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              ]"
              @click="selectedCategory = 'all'"
            >
              {{ t('common.all') }} ({{ projectileStore.allProjectiles.length }})
            </button>
            <button
              v-for="cat in PROJECTILE_CATEGORIES"
              :key="cat.id"
              type="button"
              :class="[
                'px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer shrink-0 border',
                selectedCategory === cat.id
                  ? 'bg-slate-800 border-amber-400 text-amber-300 ring-1 ring-amber-400/40'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              ]"
              :style="{ color: selectedCategory === cat.id ? cat.color : undefined }"
              @click="selectedCategory = cat.id"
            >
              {{ getCategoryLabel(cat.id) }}
            </button>
          </div>
        </div>

        <!-- Scrollable Projectiles List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
          <div
            v-for="proj in filteredList"
            :key="proj.id"
            :class="[
              'group relative flex items-center gap-2.5 p-2 rounded-2xl border transition-all cursor-pointer select-none',
              currentForm.id === proj.id
                ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                : 'bg-slate-900/90 border-slate-800/80 hover:bg-slate-800/90 hover:border-slate-700'
            ]"
            @click="selectProjectile(proj)"
          >
            <!-- Miniature Live Canvas Thumbnail -->
            <div 
              class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border overflow-hidden bg-slate-950/90"
              :style="{ borderColor: `${proj.colorCss}50` }"
            >
              <canvas
                :ref="(el) => setSidebarCanvas(el, proj.id)"
                width="44"
                height="44"
                class="w-full h-full block"
              />
            </div>

            <!-- Middle Text Info -->
            <div class="flex flex-col min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <span 
                  class="text-xs font-bold truncate"
                  :class="currentForm.id === proj.id ? 'text-amber-300' : 'text-slate-200 group-hover:text-white'"
                >
                  {{ getLocalizedName(proj) }}
                </span>
                <span v-if="proj.isCustom" class="text-[8px] font-bold px-1 py-0.2 rounded bg-pink-950/80 text-pink-300 border border-pink-800/60">
                  {{ t('common.custom').toUpperCase() }}
                </span>
              </div>

              <div class="flex items-center gap-1.5 mt-0.5">
                <span 
                  class="text-[9px] font-semibold px-1.5 py-0.2 rounded-md border uppercase tracking-wider"
                  :style="{
                    color: proj.colorCss,
                    borderColor: `${proj.colorCss}40`,
                    backgroundColor: `${proj.colorCss}15`
                  }"
                >
                  {{ proj.category }}
                </span>
                <span class="text-[9px] font-mono text-slate-400">
                  {{ proj.formation }}
                </span>
              </div>

              <span class="text-[10px] text-slate-400 truncate mt-0.5">
                {{ proj.description }}
              </span>
            </div>

            <!-- Right Actions -->
            <div class="flex items-center gap-1">
              <UiIconButton
                v-if="proj.isCustom"
                variant="danger"
                size="xs"
                :icon="Trash2"
                :tooltip="t('common.delete')"
                @click.stop="handleDelete(proj.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Crosshair,
  Download,
  Upload,
  RotateCcw,
  Zap,
  Save,
  Copy,
  Plus,
  Trash2,
  Search,
} from 'lucide-vue-next'
import {
  UiButton,
  UiIconButton,
  UiInput,
  UiSlider,
  UiSwitch,
  UiTabs,
  UiBadge,
  UiColorPicker,
  UiLanguageSwitcher,
} from '../components/ui'
import {
  useProjectileStore,
  ProjectileConfig,
  ProjectileCategory,
} from '../stores/projectileStore'
import { PROJECTILE_CATEGORIES } from '../utils/projectileCatalog'
import {
  getProjectileTheme,
  renderCanvasProjectileHead,
} from '../utils/projectileEffectRenderer'
import { useI18n } from '../stores/i18nStore'

const router = useRouter()
const projectileStore = useProjectileStore()
const { t, currentLocale } = useI18n()

function getLocalizedName(proj: any): string {
  if (!proj) return ''
  if (currentLocale.value === 'uz' && proj.nameUz) return proj.nameUz
  if (currentLocale.value === 'ru' && proj.nameRu) return proj.nameRu
  return proj.name || proj.nameUz || proj.id
}

function getCategoryLabel(catId: string): string {
  const catKey = `projectiles.cat${catId.charAt(0).toUpperCase() + catId.slice(1)}`
  const translated = t(catKey)
  if (translated !== catKey) return translated
  const found = PROJECTILE_CATEGORIES.find(c => c.id === catId)
  return found ? (currentLocale.value === 'uz' ? found.nameUz : found.name) : catId
}

const activeTab = ref('shape')
const searchQuery = ref('')
const selectedCategory = ref<ProjectileCategory | 'all'>('all')

const arenaCanvasRef = ref<HTMLCanvasElement | null>(null)
const sidebarCanvasMap = new Map<string, HTMLCanvasElement>()

function setSidebarCanvas(el: any, id: string) {
  if (el && el instanceof HTMLCanvasElement) {
    sidebarCanvasMap.set(id, el)
  } else {
    sidebarCanvasMap.delete(id)
  }
}

// Editable Form State
const currentForm = reactive<ProjectileConfig>({
  id: 'fireball',
  name: 'Classic Fireball',
  nameUz: 'Klassik Olov Shari',
  category: 'fire',
  description: 'Yorqin olov shari va yonuvchi cho\'g\' dumi',
  formation: 'single',
  shape: 'circle',
  size: 10,
  length: 24,
  points: 4,
  satelliteCount: 3,
  hasArc: true,
  isLaser: false,
  colorHex: 0xf97316,
  colorCss: '#f97316',
  trailColorHex: 0xf97316,
  trailColorCss: 'rgba(249, 115, 22, 0.7)',
  sparkColorHex: 0xfbbf24,
  sparkColorCss: '#fbbf24',
  shockwaveColorHex: 0xef4444,
  shockwaveColorCss: '#ef4444',
  trailAlpha: 0.7,
  trailLength: 8,
  trailWidth: 4,
  sparkType: 'fire_ember',
  sparkCount: 16,
  shockwaveRadius: 22,
  hasDoubleRing: true,
})

const lengthModel = computed<number>({
  get: () => currentForm.length ?? 24,
  set: (val: number) => { currentForm.length = val }
})

const satellitesModel = computed<number>({
  get: () => currentForm.satelliteCount ?? 3,
  set: (val: number) => { currentForm.satelliteCount = val }
})

const pointsModel = computed<number>({
  get: () => currentForm.points ?? 4,
  set: (val: number) => { currentForm.points = val }
})

function selectProjectile(proj: ProjectileConfig) {
  Object.assign(currentForm, JSON.parse(JSON.stringify(proj)))
  // Keep hex colors in sync with CSS
  syncHexColors()
}

function syncHexColors() {
  currentForm.colorHex = parseInt(currentForm.colorCss.replace('#', ''), 16) || 0xf97316
  currentForm.sparkColorHex = parseInt(currentForm.sparkColorCss.replace('#', ''), 16) || 0xfbbf24
  currentForm.shockwaveColorHex = parseInt(currentForm.shockwaveColorCss.replace('#', ''), 16) || 0xef4444
}

watch(() => [currentForm.colorCss, currentForm.sparkColorCss, currentForm.shockwaveColorCss], () => {
  syncHexColors()
})

const filteredList = computed(() => {
  let list = projectileStore.allProjectiles
  if (selectedCategory.value !== 'all') {
    list = list.filter((p) => p.category === selectedCategory.value)
  }
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter((p) =>
      p.name.toLowerCase().includes(query) ||
      p.nameUz.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
    )
  }
  return list
})

function handleCreateNew() {
  const newProj = projectileStore.addCustomProjectile({
    id: `custom_${Date.now()}`,
    name: 'New Custom Projectile',
    nameUz: 'Yangi Maxsus Snaryad',
    category: selectedCategory.value === 'all' ? 'fire' : selectedCategory.value,
    description: 'Yangi yaratilgan maxsus snaryad',
    formation: 'single',
    shape: 'circle',
    size: 10,
    length: 22,
    points: 4,
    satelliteCount: 3,
    hasArc: true,
    isLaser: false,
    colorHex: 0xf97316,
    colorCss: '#f97316',
    trailColorHex: 0xf97316,
    trailColorCss: 'rgba(249, 115, 22, 0.75)',
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xef4444,
    shockwaveColorCss: '#ef4444',
    trailAlpha: 0.75,
    trailLength: 8,
    trailWidth: 4,
    sparkType: 'fire_ember',
    sparkCount: 16,
    shockwaveRadius: 22,
    hasDoubleRing: false,
  })
  selectProjectile(newProj)
}

function handleSave() {
  syncHexColors()
  projectileStore.updateProjectile(currentForm.id, { ...currentForm })
}

function handleDuplicate() {
  const cloned = projectileStore.duplicateProjectile(currentForm.id)
  if (cloned) {
    selectProjectile(cloned)
  }
}

function handleDelete(id: string) {
  projectileStore.deleteProjectile(id)
  if (currentForm.id === id && projectileStore.allProjectiles.length > 0) {
    selectProjectile(projectileStore.allProjectiles[0])
  }
}

function handleImportJson(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    const content = evt.target?.result as string
    if (content) {
      const res = projectileStore.importProjectilesFromJson(content)
      if (res.success && projectileStore.allProjectiles.length > 0) {
        selectProjectile(projectileStore.allProjectiles[0])
      }
    }
  }
  reader.readAsText(file)
}

function confirmResetDefaults() {
  if (confirm('Barcha maxsus snaryadlarni o\'chirib, standart holatga qaytarilsinmi?')) {
    projectileStore.resetToDefaults()
    setTimeout(() => {
      if (projectileStore.allProjectiles.length > 0) {
        selectProjectile(projectileStore.allProjectiles[0])
      }
    }, 100)
  }
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    router.push('/')
  }
}

// ========================================================
// LIVE SHOOTING ARENA ANIMATION LOOP (2.5D ISOMETRIC SQUARE)
// ========================================================
let animFrameId: number | null = null
let lastTime = 0
let shootTimer = 0
const shootIntervalSec = 0.65

interface LiveArenaProj {
  id: number
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  progress: number
  speed: number
  offsetPerp: number
  phaseOffset: number
  trail: { x: number; y: number; alpha: number; size: number }[]
}

interface LiveArenaShockwave {
  x: number
  y: number
  rx: number
  ry: number
  maxRadius: number
  color: string
  alpha: number
  life: number
}

interface LiveArenaSpark {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  alpha: number
  size: number
  life: number
  maxLife: number
  type: string
  rot: number
  vRot: number
}

interface LiveFloatingText {
  x: number
  y: number
  vy: number
  text: string
  color: string
  alpha: number
  life: number
}

let projSeq = 0
const arenaProjectiles: LiveArenaProj[] = []
const arenaShockwaves: LiveArenaShockwave[] = []
const arenaSparks: LiveArenaSpark[] = []
const arenaDamageTexts: LiveFloatingText[] = []

// Target dummy state
let dummyHitTimer = 0
let dummyHealth = 1.0

function spawnManualShot() {
  if (!arenaCanvasRef.value) return
  const canvas = arenaCanvasRef.value
  const dpr = window.devicePixelRatio || 1
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  // 2.5D Isometric Positions: Tower at lower-left, Target dummy at upper-right
  const startX = w * 0.22
  const startY = h * 0.74 - 18 // Muzzle height
  const targetX = w * 0.78
  const targetY = h * 0.26 - 12 // Dummy chest height

  const dur = currentForm.isLaser ? 0.35 : 0.65
  const form = currentForm.formation || 'single'

  if (form === 'volley_3') {
    // 3 projectiles fired in a spread fan
    const offsets = [-14, 0, 14]
    offsets.forEach((off, idx) => {
      arenaProjectiles.push({
        id: ++projSeq,
        startX,
        startY,
        targetX: targetX + off * 0.6,
        targetY: targetY + off * 0.3,
        currentX: startX,
        currentY: startY,
        progress: 0,
        speed: 1 / dur,
        offsetPerp: off,
        phaseOffset: idx * 0.3,
        trail: [],
      })
    })
  } else if (form === 'twin_helix') {
    // 2 intertwined swirling projectiles
    arenaProjectiles.push({
      id: ++projSeq,
      startX,
      startY,
      targetX,
      targetY,
      currentX: startX,
      currentY: startY,
      progress: 0,
      speed: 1 / dur,
      offsetPerp: 10,
      phaseOffset: 0,
      trail: [],
    })
    arenaProjectiles.push({
      id: ++projSeq,
      startX,
      startY,
      targetX,
      targetY,
      currentX: startX,
      currentY: startY,
      progress: 0,
      speed: 1 / dur,
      offsetPerp: -10,
      phaseOffset: Math.PI,
      trail: [],
    })
  } else {
    // Single / Satellites / Laser
    arenaProjectiles.push({
      id: ++projSeq,
      startX,
      startY,
      targetX,
      targetY,
      currentX: startX,
      currentY: startY,
      progress: 0,
      speed: 1 / dur,
      offsetPerp: 0,
      phaseOffset: 0,
      trail: [],
    })
  }
}

function handleArenaImpact(p: LiveArenaProj) {
  const theme = getProjectileTheme(currentForm.id, currentForm.colorHex)

  dummyHitTimer = 0.22
  dummyHealth = Math.max(0.15, dummyHealth - 0.25)

  // 1. Shockwave
  const shockR = currentForm.shockwaveRadius || 26
  arenaShockwaves.push({
    x: p.targetX,
    y: p.targetY,
    rx: 4,
    ry: 2,
    maxRadius: shockR,
    color: currentForm.shockwaveColorCss || theme.shockwaveColorCss,
    alpha: 1.0,
    life: 0.45,
  })

  if (currentForm.hasDoubleRing) {
    arenaShockwaves.push({
      x: p.targetX,
      y: p.targetY,
      rx: 2,
      ry: 1,
      maxRadius: shockR * 0.6,
      color: '#fef08a',
      alpha: 1.0,
      life: 0.35,
    })
  }

  // 2. Sparks
  const count = currentForm.sparkCount || 16
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2
    const spd = 40 + Math.random() * 95
    const sLife = 0.32 + Math.random() * 0.22

    arenaSparks.push({
      x: p.targetX,
      y: p.targetY,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.75,
      color: currentForm.sparkColorCss || theme.sparkColorCss,
      alpha: 1.0,
      size: 1.8 + Math.random() * 2.5,
      life: sLife,
      maxLife: sLife,
      type: currentForm.sparkType || 'default',
      rot: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 12,
    })
  }

  // 3. Floating Damage Number
  const isCrit = Math.random() > 0.6
  arenaDamageTexts.push({
    x: p.targetX + (Math.random() - 0.5) * 20,
    y: p.targetY - 14,
    vy: -45,
    text: isCrit ? '-240 CRIT!' : `-${110 + Math.floor(Math.random() * 40)}`,
    color: isCrit ? '#fbbf24' : '#ef4444',
    alpha: 1.0,
    life: 0.6,
  })
}

function drawIsoTile(ctx: CanvasRenderingContext2D, cx: number, cy: number, tw: number, th: number, fill?: string, stroke?: string) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - th / 2)
  ctx.lineTo(cx + tw / 2, cy)
  ctx.lineTo(cx, cy + th / 2)
  ctx.lineTo(cx - tw / 2, cy)
  ctx.closePath()
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function renderStudioArena(time: number) {
  if (!arenaCanvasRef.value) return
  const canvas = arenaCanvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const w = canvas.width / dpr
  const h = canvas.height / dpr

  if (lastTime === 0) lastTime = time
  const dt = Math.min(0.1, (time - lastTime) / 1000)
  lastTime = time

  // Auto Shooting Interval
  shootTimer += dt
  if (shootTimer >= shootIntervalSec) {
    shootTimer = 0
    spawnManualShot()
  }

  // Dummy Health Recovery
  if (dummyHealth < 1.0) {
    dummyHealth = Math.min(1.0, dummyHealth + dt * 0.35)
  }
  if (dummyHitTimer > 0) {
    dummyHitTimer -= dt
  }

  ctx.save()
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  // 1. Arena Background
  const bgGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.72)
  bgGrad.addColorStop(0, '#0c1322')
  bgGrad.addColorStop(1, '#020617')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  // 2. Isometric Ground Grid (2:1 standard)
  const tileW = w * 0.16
  const tileH = tileW * 0.5
  const gridRows = 5
  const gridCols = 5
  const originX = w * 0.5
  const originY = h * 0.5 - tileH * 0.5

  ctx.lineWidth = 1
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      const isoX = originX + (c - r) * (tileW * 0.5)
      const isoY = originY + (c + r) * (tileH * 0.5)
      const isAlt = (r + c) % 2 === 0
      drawIsoTile(
        ctx,
        isoX,
        isoY,
        tileW,
        tileH,
        isAlt ? 'rgba(30, 41, 59, 0.35)' : 'rgba(15, 23, 42, 0.45)',
        'rgba(51, 65, 85, 0.35)'
      )
    }
  }

  // 3. Firing Trajectory Path (Dashed Isometric Diagonal Line)
  const towerBaseX = w * 0.22
  const towerBaseY = h * 0.74
  const muzzleX = towerBaseX
  const muzzleY = towerBaseY - 18

  const dummyBaseX = w * 0.78
  const dummyBaseY = h * 0.26
  const dummyHitX = dummyBaseX
  const dummyHitY = dummyBaseY - 12

  ctx.strokeStyle = 'rgba(71, 85, 105, 0.35)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(muzzleX, muzzleY)
  ctx.lineTo(dummyHitX, dummyHitY)
  ctx.stroke()
  ctx.setLineDash([])

  // Range Circle around Tower (Isometric Ellipse)
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 5])
  ctx.beginPath()
  ctx.ellipse(towerBaseX, towerBaseY, w * 0.38, w * 0.19, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // 4. Draw Tower Base Pedestal (Lower-Left)
  // Base shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
  ctx.beginPath()
  ctx.ellipse(towerBaseX, towerBaseY + 6, 26, 13, 0, 0, Math.PI * 2)
  ctx.fill()

  // 2.5D Isometric stone pedestal
  drawIsoTile(ctx, towerBaseX, towerBaseY, 44, 22, '#1e293b', '#334155')
  // Pedestal side thickness
  ctx.fillStyle = '#0f172a'
  ctx.beginPath()
  ctx.moveTo(towerBaseX - 22, towerBaseY)
  ctx.lineTo(towerBaseX, towerBaseY + 11)
  ctx.lineTo(towerBaseX + 22, towerBaseY)
  ctx.lineTo(towerBaseX + 22, towerBaseY + 8)
  ctx.lineTo(towerBaseX, towerBaseY + 19)
  ctx.lineTo(towerBaseX - 22, towerBaseY + 8)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#334155'
  ctx.stroke()

  // Turret Cannon Mount & Barrel angled towards dummy
  const aimAngle = Math.atan2(dummyHitY - muzzleY, dummyHitX - muzzleX)
  ctx.save()
  ctx.translate(muzzleX, muzzleY)

  // Turret base orb
  ctx.fillStyle = '#1e293b'
  ctx.strokeStyle = '#475569'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.arc(0, 0, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Cannon barrel
  ctx.rotate(aimAngle)
  ctx.fillStyle = '#0f172a'
  ctx.strokeStyle = '#334155'
  ctx.lineWidth = 1.8
  ctx.beginPath()
  ctx.roundRect(0, -3.5, 14, 7, 2)
  ctx.fill()
  ctx.stroke()

  // Neutral mechanical core
  ctx.fillStyle = '#64748b'
  ctx.beginPath()
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // 5. Draw Target Dummy (Upper-Right)
  // Dummy shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
  ctx.beginPath()
  ctx.ellipse(dummyBaseX, dummyBaseY + 4, 20, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  // Dummy base tile
  drawIsoTile(ctx, dummyBaseX, dummyBaseY, 36, 18, '#1e293b', '#334155')

  // Dummy figure with shake when hit
  const shakeX = dummyHitTimer > 0 ? (Math.random() - 0.5) * 5 : 0
  const isDummyFlashing = dummyHitTimer > 0.08
  const dummyDrawX = dummyBaseX + shakeX

  ctx.save()
  // Body post
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#78350f'
  ctx.fillRect(dummyDrawX - 2.5, dummyBaseY - 24, 5, 24)

  // Crossarms
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#92400e'
  ctx.fillRect(dummyDrawX - 12, dummyBaseY - 18, 24, 5)

  // Target head/torso shield
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#b45309'
  ctx.strokeStyle = '#78350f'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(dummyDrawX, dummyBaseY - 14, 9, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Target bullseye
  ctx.fillStyle = isDummyFlashing ? '#ffffff' : '#78350f'
  ctx.beginPath()
  ctx.arc(dummyDrawX, dummyBaseY - 14, 4, 0, Math.PI * 2)
  ctx.fill()

  // Floating Health Bar above Dummy
  const barW = 32
  const barH = 4.5
  const barX = dummyDrawX - barW * 0.5
  const barY = dummyBaseY - 32

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2)
  ctx.fillStyle = '#334155'
  ctx.fillRect(barX, barY, barW, barH)

  // Fill HP
  const hpFill = Math.max(0, Math.min(1, dummyHealth))
  ctx.fillStyle = hpFill > 0.4 ? '#22c55e' : '#ef4444'
  ctx.fillRect(barX, barY, barW * hpFill, barH)
  ctx.restore()

  // 6. Shockwaves
  for (let i = arenaShockwaves.length - 1; i >= 0; i--) {
    const sw = arenaShockwaves[i]
    sw.life -= dt
    sw.rx += (sw.maxRadius - sw.rx) * dt * 10
    sw.ry = sw.rx * 0.5
    sw.alpha = Math.max(0, sw.life / 0.45)

    ctx.beginPath()
    ctx.ellipse(sw.x, sw.y, sw.rx, sw.ry, 0, 0, Math.PI * 2)
    ctx.strokeStyle = sw.color
    ctx.lineWidth = 2.2
    ctx.globalAlpha = sw.alpha * 0.85
    ctx.stroke()

    ctx.beginPath()
    ctx.ellipse(sw.x, sw.y, sw.rx * 0.8, sw.ry * 0.8, 0, 0, Math.PI * 2)
    ctx.fillStyle = sw.color
    ctx.globalAlpha = sw.alpha * 0.2
    ctx.fill()
    ctx.globalAlpha = 1.0

    if (sw.life <= 0) arenaShockwaves.splice(i, 1)
  }

  // 7. Projectiles (True Ballistic Derivative Tangent)
  for (let i = arenaProjectiles.length - 1; i >= 0; i--) {
    const p = arenaProjectiles[i]
    p.progress += p.speed * dt

    const dx = p.targetX - p.startX
    const dy = p.targetY - p.startY
    const arcHeight = !currentForm.hasArc ? 0 : w * 0.16

    // Baseline isometric diagonal position
    const baseX = p.startX + dx * p.progress
    const baseY = p.startY + dy * p.progress

    // Height offset from parabolic arc
    const arcY = currentForm.hasArc ? Math.sin(p.progress * Math.PI) * arcHeight : 0

    // Lateral offset for twin helix / volley
    let lateralX = 0
    let lateralY = 0
    if (p.offsetPerp !== 0) {
      const len = Math.hypot(dx, dy)
      const perpX = -dy / len
      const perpY = dx / len
      const swirl = currentForm.formation === 'twin_helix'
        ? Math.sin(p.progress * Math.PI * 6 + p.phaseOffset) * p.offsetPerp
        : p.offsetPerp
      lateralX = perpX * swirl
      lateralY = perpY * swirl * 0.5
    }

    p.currentX = baseX + lateralX
    p.currentY = baseY - arcY + lateralY

    // Record trail
    p.trail.push({ x: p.currentX, y: p.currentY, alpha: 1.0, size: currentForm.trailWidth || 4 })
    if (p.trail.length > (currentForm.trailLength || 8)) p.trail.shift()

    const theme = getProjectileTheme(currentForm.id, currentForm.colorHex)

    // Render Trail
    for (let t = 0; t < p.trail.length; t++) {
      const pt = p.trail[t]
      pt.alpha = Math.max(0, pt.alpha - 0.05)
      if (pt.alpha <= 0) continue

      ctx.beginPath()
      ctx.arc(pt.x, pt.y, Math.max(1, (t / p.trail.length) * (currentForm.trailWidth || 4)), 0, Math.PI * 2)
      ctx.fillStyle = currentForm.trailColorCss || theme.trailColorCss
      ctx.globalAlpha = pt.alpha * (currentForm.trailAlpha || 0.75)
      ctx.fill()
      ctx.globalAlpha = 1.0
    }

    // Exact Ballistic Derivative Angle Calculation
    const vx = dx
    const vy = dy - (currentForm.hasArc ? Math.cos(p.progress * Math.PI) * Math.PI * arcHeight : 0)
    const angle = Math.atan2(vy, vx)

    renderCanvasProjectileHead(
      ctx,
      currentForm.id,
      p.currentX,
      p.currentY,
      angle,
      p.startX,
      p.startY,
      p.progress,
      time,
      currentForm
    )

    if (p.progress >= 1.0) {
      handleArenaImpact(p)
      arenaProjectiles.splice(i, 1)
    }
  }

  // 8. Sparks
  for (let i = arenaSparks.length - 1; i >= 0; i--) {
    const sp = arenaSparks[i]
    sp.x += sp.vx * dt
    sp.y += sp.vy * dt
    sp.rot += (sp.vRot || 0) * dt
    sp.life -= dt
    sp.alpha = Math.max(0, sp.life / (sp.maxLife || 0.45))

    if (sp.alpha > 0) {
      ctx.save()
      ctx.globalAlpha = sp.alpha

      if (sp.type === 'fire_ember') {
        sp.vy -= 120 * dt
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size * (sp.alpha * 0.8 + 0.2), 0, Math.PI * 2)
        ctx.fillStyle = sp.color
        ctx.fill()
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()
      } else if (sp.type === 'ice_shard') {
        ctx.translate(sp.x, sp.y)
        ctx.rotate(sp.rot)
        ctx.beginPath()
        ctx.moveTo(sp.size * 1.5, 0)
        ctx.lineTo(0, sp.size * 0.6)
        ctx.lineTo(-sp.size * 1.5, 0)
        ctx.lineTo(0, -sp.size * 0.6)
        ctx.closePath()
        ctx.fillStyle = sp.color
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 0.8
        ctx.stroke()
      } else if (sp.type === 'snowflake') {
        ctx.translate(sp.x, sp.y)
        ctx.rotate(sp.rot)
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1.2
        for (let spoke = 0; spoke < 3; spoke++) {
          ctx.beginPath()
          ctx.moveTo(-sp.size * 1.2, 0)
          ctx.lineTo(sp.size * 1.2, 0)
          ctx.stroke()
          ctx.rotate(Math.PI / 3)
        }
      } else if (sp.type === 'lightning_arc') {
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(sp.x, sp.y)
        ctx.lineTo(sp.x + sp.vx * dt * 3, sp.y + sp.vy * dt * 3)
        ctx.stroke()
      } else if (sp.type === 'arcane_star' || sp.type === 'holy_cross') {
        ctx.translate(sp.x, sp.y)
        ctx.rotate(sp.rot)
        ctx.strokeStyle = sp.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(-sp.size * 1.3, 0)
        ctx.lineTo(sp.size * 1.3, 0)
        ctx.moveTo(0, -sp.size * 1.3)
        ctx.lineTo(0, -sp.size * 1.3)
        ctx.stroke()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(0, 0, sp.size * 0.35, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2)
        ctx.fillStyle = sp.color
        ctx.fill()
      }
      ctx.restore()
    }

    if (sp.life <= 0) arenaSparks.splice(i, 1)
  }

  // 9. Floating Combat Numbers
  for (let i = arenaDamageTexts.length - 1; i >= 0; i--) {
    const ft = arenaDamageTexts[i]
    ft.y += ft.vy * dt
    ft.life -= dt
    ft.alpha = Math.max(0, ft.life / 0.6)

    ctx.save()
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.globalAlpha = ft.alpha
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.strokeText(ft.text, ft.x, ft.y)
    ctx.fillStyle = ft.color
    ctx.fillText(ft.text, ft.x, ft.y)
    ctx.restore()

    if (ft.life <= 0) arenaDamageTexts.splice(i, 1)
  }

  // 10. Render Sidebar Miniature Canvases
  for (const [projId, canvasEl] of sidebarCanvasMap.entries()) {
    const cCtx = canvasEl.getContext('2d')
    if (!cCtx) continue
    const cw = canvasEl.width
    const ch = canvasEl.height
    cCtx.clearRect(0, 0, cw, ch)
    cCtx.fillStyle = '#060a12'
    cCtx.fillRect(0, 0, cw, ch)
    renderCanvasProjectileHead(
      cCtx,
      projId,
      cw * 0.5,
      ch * 0.5,
      -Math.PI * 0.25,
      cw * 0.2,
      ch * 0.8,
      0.5,
      time,
      projId === currentForm.id ? currentForm : undefined
    )
  }

  ctx.restore()
  animFrameId = requestAnimationFrame(renderStudioArena)
}

function handleResize() {
  if (!arenaCanvasRef.value) return
  const rect = arenaCanvasRef.value.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const size = Math.max(180, Math.round(Math.min(rect.width, rect.height || rect.width)))
  arenaCanvasRef.value.width = Math.round(size * dpr)
  arenaCanvasRef.value.height = Math.round(size * dpr)
}

onMounted(() => {
  handleResize()
  window.addEventListener('resize', handleResize)
  if (projectileStore.allProjectiles.length > 0) {
    selectProjectile(projectileStore.allProjectiles[0])
  }
  animFrameId = requestAnimationFrame(renderStudioArena)
})

onUnmounted(() => {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(245, 158, 11, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(245, 158, 11, 0.6);
}
</style>
