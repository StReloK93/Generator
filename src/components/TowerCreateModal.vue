<template>
  <UiModal
    :is-open="towerStore.isCreateTowerModalOpen"
    title="Create Defense Tower"
    subtitle="Choose any sprite from the library and configure its combat parameters"
    :icon="Plus"
    icon-color="amber"
    size="3xl"
    @close="closeModal"
  >
    <div class="flex flex-col gap-3.5 select-none">
      
      <!-- 1. Visual Asset Image Selector with Live Preview, Categories & Search -->
      <UiCard variant="amber" padding="sm" custom-class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-amber-500/20">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-amber-300">1. Select Tower Appearance</span>
            <UiBadge variant="amber" size="xs">{{ filteredAssets.length }} available</UiBadge>
          </div>
          <span v-if="selectedAsset" class="text-[11px] font-mono font-bold text-slate-300 truncate max-w-50">
            Selected: <span class="text-amber-400">{{ selectedAsset.name }}</span>
          </span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <!-- Left: Big Live Preview Box -->
          <div class="md:col-span-4 flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner h-36 relative overflow-hidden checker-pattern">
            <img 
              v-if="selectedAssetPreview"
              :src="selectedAssetPreview" 
              :alt="selectedAsset?.name"
              class="max-w-full max-h-full object-contain filter drop-shadow-xl scale-105"
            />
            <div v-else class="text-slate-500 text-xs font-mono text-center">
              No sprite selected
            </div>
            <div v-if="selectedAsset" class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-amber-300 font-mono text-[8px] border border-slate-700">
              {{ selectedAsset.category || 'Sprite' }}
            </div>
          </div>

          <!-- Right: Search, Category Tabs & Sprites Grid -->
          <div class="md:col-span-8 flex flex-col gap-1.5">
            <!-- Search & Categories -->
            <div class="flex items-center gap-1.5">
              <UiInput
                v-model="assetSearchQuery"
                placeholder="Search sprites..."
                :leading-icon="Search"
                size="sm"
                clearable
                custom-class="flex-1"
              />
            </div>

            <!-- Category Pills -->
            <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                v-for="cat in categories"
                :key="cat.id"
                type="button"
                class="px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer select-none"
                :class="selectedCategory === cat.id 
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'"
                @click="selectedCategory = cat.id"
              >
                {{ cat.label }}
              </button>
            </div>

            <!-- Assets Grid -->
            <div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div 
                v-for="asset in filteredAssets" 
                :key="asset.id"
                :class="selectedAsset?.id === asset.id ? 'ring-2 ring-amber-400 bg-amber-500/30 border-amber-400 scale-105' : 'bg-slate-950 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'"
                class="flex flex-col items-center justify-center p-1 rounded-lg border transition-all cursor-pointer group aspect-square select-none overflow-hidden"
                :title="asset.name"
                @click="selectAsset(asset)"
              >
                <img 
                  :src="getAssetThumbnail(asset)" 
                  :alt="asset.name"
                  class="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform pointer-events-none" 
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </UiCard>

      <!-- 2. Name & Cost -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <UiInput
          v-model="form.name"
          label="Tower Name:"
          placeholder="e.g. Flame Cannon"
        />

        <UiNumberInput
          v-model="form.cost"
          label="Build Cost (Gold):"
          :min="10"
          :max="5000"
          :step="10"
          unit=" 🪙"
        />
      </div>

      <!-- 3. Damage, Attack Speed, Range -->
      <UiCard variant="subtle" padding="md">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <UiSlider
            v-model="form.damage"
            label="💥 Damage:"
            :min="5"
            :max="500"
            :step="5"
          />

          <UiSlider
            v-model="form.attackSpeed"
            label="⚡ Cooldown (Atk Speed):"
            :min="0.1"
            :max="3.0"
            :step="0.1"
            unit="s"
          />

          <UiSlider
            v-model="form.range"
            label="🎯 Range:"
            :min="1.5"
            :max="10.0"
            :step="0.5"
            unit=" cells"
          />
        </div>
      </UiCard>

      <!-- 4. Projectile Type -->
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold text-slate-300">Projectile Type:</span>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button 
            v-for="pType in projectileTypes" 
            :key="pType.id"
            type="button"
            :class="form.projectileType === pType.id ? 'bg-amber-600/40 text-amber-300 border-amber-500 font-bold ring-1 ring-amber-400' : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'"
            class="py-2 px-2.5 rounded-xl border text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-target"
            @click="form.projectileType = pType.id as ProjectileType"
          >
            <span>{{ pType.icon }}</span>
            <span>{{ pType.name }}</span>
          </button>
        </div>
      </div>

      <!-- 5. Splash Damage Toggle & Radius -->
      <UiCard variant="subtle" padding="md">
        <div class="flex items-center justify-between">
          <label class="flex items-center gap-2 cursor-pointer">
            <input 
              v-model="form.isSplash"
              type="checkbox" 
              class="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <span class="text-xs font-semibold text-slate-200">💥 Area Damage (Splash AoE)</span>
          </label>

          <div v-if="form.isSplash" class="flex items-center gap-1 text-[11px] font-mono text-amber-300">
            <span>Radius: {{ form.splashRadius }} cells</span>
          </div>
        </div>

        <div v-if="form.isSplash" class="flex flex-col gap-2 pt-2 mt-2 border-t border-slate-800/80">
          <UiSlider
            v-model="form.splashRadius"
            label="Splash Radius:"
            :min="0.5"
            :max="5.0"
            :step="0.5"
            unit=" cells"
          />

          <div class="flex items-center gap-2">
            <button 
              type="button"
              :class="form.splashType === 'falloff' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
              class="py-1 px-2.5 rounded-lg text-xs cursor-pointer touch-target"
              @click="form.splashType = 'falloff'"
            >
              📉 Falloff
            </button>
            <button 
              type="button"
              :class="form.splashType === 'constant' ? 'bg-rose-600 text-white font-bold' : 'bg-slate-900 text-slate-400 border border-slate-700'"
              class="py-1 px-2.5 rounded-lg text-xs cursor-pointer touch-target"
              @click="form.splashType = 'constant'"
            >
              🟩 Constant
            </button>
          </div>
        </div>
      </UiCard>

    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <UiButton
        variant="ghost"
        size="sm"
        @click="closeModal"
      >
        Cancel
      </UiButton>

      <UiButton
        variant="game-amber"
        size="md"
        :leading-icon="ShieldAlert"
        @click="handleCreateTower"
      >
        🏰 Create Tower
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, ShieldAlert, Search } from 'lucide-vue-next'
import { UiModal, UiInput, UiCard, UiSlider, UiNumberInput, UiButton, UiBadge } from './ui'
import { useTowerStore, ProjectileType, SplashType } from '../stores/towerStore'
import { useAssetStore } from '../stores/assetStore'
import { useNotificationStore } from '../stores/notificationStore'
import { AssetItem } from '../types/map'

const towerStore = useTowerStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()

const assetSearchQuery = ref('')
const selectedCategory = ref('all')

const categories = [
  { id: 'all', label: 'All' },
  { id: 'walls', label: 'Walls & Towers' },
  { id: 'ground', label: 'Ground' },
  { id: 'stairs', label: 'Stairs' },
  { id: 'props', label: 'Props & Objects' },
]

const projectileTypes = [
  { id: 'fireball', name: 'Fireball', icon: '🔥' },
  { id: 'magic_bolt', name: 'Magic Bolt', icon: '⚡' },
  { id: 'cannonball', name: 'Cannonball', icon: '💣' },
  { id: 'arrow', name: 'Arrow', icon: '🏹' },
]

function getAssetThumbnail(asset: AssetItem | any): string {
  if (!asset) return ''
  return assetStore.getAssetPreview(asset) || asset.previewSrc || asset.src || ''
}

const filteredAssets = computed(() => {
  let list = assetStore.assets

  // Filter by category
  if (selectedCategory.value !== 'all') {
    list = list.filter(item => {
      const lower = (item.name || item.id || '').toLowerCase()
      if (selectedCategory.value === 'walls') {
        return lower.includes('wall') || lower.includes('gate') || lower.includes('door') || lower.includes('archway') || lower.includes('column') || lower.includes('support')
      }
      if (selectedCategory.value === 'ground') {
        return lower.includes('dirt') || lower.includes('planks') || (lower.includes('stone') && !lower.includes('wall') && !lower.includes('column'))
      }
      if (selectedCategory.value === 'stairs') {
        return lower.includes('stairs') || lower.includes('bridge')
      }
      if (selectedCategory.value === 'props') {
        return lower.includes('barrel') || lower.includes('chest') || lower.includes('crate') || lower.includes('table') || lower.includes('chair') || lower.includes('display') || lower.includes('bookcase')
      }
      return true
    })
  }

  // Filter by search query
  const query = assetSearchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter(item => (item.name || '').toLowerCase().includes(query))
  }

  return list
})

const selectedAsset = ref<AssetItem | null>(assetStore.assets.find(a => (a.name || '').toLowerCase().includes('column')) || assetStore.assets[0] || null)

const selectedAssetPreview = computed(() => {
  if (!selectedAsset.value) return ''
  return getAssetThumbnail(selectedAsset.value)
})

const form = ref({
  name: "Flame Cannon",
  damage: 60,
  attackSpeed: 0.5,
  range: 4.0,
  projectileType: 'fireball' as ProjectileType,
  isSplash: true,
  splashRadius: 1.5,
  splashType: 'falloff' as SplashType,
  cost: 100,
})

function selectAsset(asset: AssetItem) {
  selectedAsset.value = asset
  if (form.value.name === 'Flame Cannon' || !form.value.name.trim()) {
    form.value.name = asset.name.replace(/_W|_N|_E|_S|\.png/g, '').trim()
  }
}

function closeModal() {
  towerStore.isCreateTowerModalOpen = false
}

function handleCreateTower() {
  if (!form.value.name.trim()) {
    notify.warning("Iltimos, minora nomini kiriting!", "Nom kiritilmadi")
    return
  }

  const asset = selectedAsset.value || assetStore.assets[0]
  const assetId = asset ? asset.id : 'sprite-stoneColumn_W'
  const assetName = asset ? `${asset.name}.png` : 'stoneColumn_W.png'
  const preview = asset ? assetStore.getAssetPreview(asset) : ''

  let projColor = 0xf97316
  let projSpeed = 10.5
  if (form.value.projectileType === 'cannonball') {
    projColor = 0x334155
    projSpeed = 8.5
  } else if (form.value.projectileType === 'magic_bolt') {
    projColor = 0x38bdf8
    projSpeed = 16.0
  } else if (form.value.projectileType === 'arrow') {
    projColor = 0xd97706
    projSpeed = 18.0
  }

  const newBlueprint = {
    id: `tower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: form.value.name.trim(),
    assetId,
    assetName,
    assetPath: preview || '',
    description: `Custom defense tower: ${form.value.name}`,
    damage: form.value.damage,
    attackSpeed: form.value.attackSpeed,
    range: form.value.range,
    projectileType: form.value.projectileType,
    projectileSpeed: projSpeed,
    projectileColor: projColor,
    isSplash: form.value.isSplash,
    splashRadius: form.value.splashRadius,
    splashType: form.value.splashType,
    cost: form.value.cost,
  }

  towerStore.addNewBlueprint(newBlueprint)
  notify.success(`"${newBlueprint.name}" minorasi muvaffaqiyatli yaratildi!`)
  closeModal()
}
</script>

<style scoped>
.checker-pattern {
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.04) 25%, transparent 25%), 
    linear-gradient(-45deg, rgba(255,255,255,0.04) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.04) 75%), 
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.04) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
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
