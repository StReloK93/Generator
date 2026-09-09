<template>
  <UiModal
    :is-open="towerStore.isCreateTowerModalOpen"
    title="Create Defense Tower"
    subtitle="Choose any sprite from the library and configure its combat parameters"
    :icon="Plus"
    icon-color="amber"
    size="4xl"
    @close="closeModal"
  >
    <div class="flex flex-col gap-3.5 select-none">
      
      <!-- 1. Visual Asset Image Selector with Live Preview, Categories & Search -->
      <UiCard variant="amber" padding="sm" custom-class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-amber-500/20">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-amber-300">1. Select Tower Appearance</span>
            <UiBadge variant="amber" size="xs">{{ filteredAssets.length }} available</UiBadge>
          </div>
          <span v-if="selectedAsset" class="text-[11px] font-mono font-bold text-slate-300 truncate max-w-50">
            Selected: <span class="text-amber-400">{{ selectedAsset.name }}</span>
          </span>
        </div>

        <!-- Search & Category Filters (Full Width Row) -->
        <div class="flex items-center gap-2 flex-wrap justify-between">
          <UiInput
            v-model="assetSearchQuery"
            placeholder="Search sprites (wall, tower, stone)..."
            :leading-icon="Search"
            size="sm"
            clearable
            custom-class="w-full sm:w-72"
          />

          <!-- Category Pills -->
          <div class="overflow-x-auto custom-scrollbar py-0.5">
            <UiTabs
              v-model="selectedCategory"
              :items="categories"
              variant="amber"
              size="xs"
            />
          </div>
        </div>

        <!-- Preview & Sprites Grid (Matched 1-to-1 with Select Tower Sprite modal) -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
          <!-- Left: Big Live Preview Box -->
          <div class="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 checker-pattern h-60 relative overflow-hidden shadow-inner">
            <img 
              v-if="selectedAssetPreview"
              :src="selectedAssetPreview" 
              :alt="selectedAsset?.name"
              class="w-full h-full object-contain filter drop-shadow-xl"
            />
            <div v-else class="text-slate-500 text-xs font-mono text-center">
              No sprite selected
            </div>
            <div v-if="selectedAsset" class="absolute bottom-2 inset-x-2 px-2.5 py-1 rounded-xl bg-slate-900/95 border border-slate-700 text-center shadow-md">
              <span class="text-xs font-bold text-amber-300 truncate block">{{ selectedAsset.name }}</span>
            </div>
          </div>

          <!-- Right: Spacious Sprites Grid -->
          <div class="md:col-span-8 max-h-60 overflow-y-auto custom-scrollbar p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
              <div 
                v-for="asset in filteredAssets" 
                :key="asset.id"
                :class="selectedAsset?.id === asset.id 
                  ? 'ring-2 ring-amber-400 bg-amber-500/30 border-amber-400 scale-105' 
                  : 'hover:bg-slate-800/80 bg-slate-950/80 border border-slate-800/80'"
                class="aspect-square p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all overflow-hidden group select-none"
                :title="asset.name"
                @click="selectAsset(asset)"
              >
                <img 
                  :src="getAssetThumbnail(asset)" 
                  :alt="asset.name"
                  width="64"
                  height="64"
                  decoding="async"
                  class="w-full h-full aspect-square object-contain pointer-events-none group-hover:scale-110 transition-transform" 
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
          unit=" Gold"
        />
      </div>

      <!-- 3. Damage, Attack Speed, Range -->
      <UiCard variant="subtle" padding="md">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <UiSlider
            v-model="form.damage"
            label="Damage:"
            :min="5"
            :max="500"
            :step="5"
          />

          <UiSlider
            v-model="form.attackSpeed"
            label="Attack Rate (per sec):"
            :min="0.1"
            :max="3.0"
            :step="0.1"
            unit="s"
          />

          <UiSlider
            v-model="form.range"
            label="Attack Range:"
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
        <UiTabs
          v-model="form.projectileType"
          :items="projectileTypes.map(p => ({ id: p.id, label: p.name, icon: p.icon }))"
          variant="amber"
          size="sm"
        />
      </div>

      <!-- 5. Splash Damage Toggle & Radius -->
      <UiCard variant="subtle" padding="md">
        <div class="flex items-center justify-between">
          <UiSwitch
            v-model="form.isSplash"
            label="Area Damage (Splash AoE)"
            variant="amber"
          />

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

          <UiTabs
            v-model="form.splashType"
            :items="[
              { id: 'falloff', label: 'Falloff', icon: TrendingDown },
              { id: 'constant', label: 'Constant', icon: Equal }
            ]"
            variant="amber"
            size="xs"
          />
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
        Create Tower
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, ShieldAlert, Search, Flame, ArrowRight, Zap, CircleDot, Snowflake, Radio, Rocket, TrendingDown, Equal } from 'lucide-vue-next'
import { UiModal, UiInput, UiCard, UiSlider, UiNumberInput, UiButton, UiBadge, UiTabs, UiSwitch } from './ui'
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
  { id: 'fireball', name: 'Fireball', icon: Flame },
  { id: 'arrow', name: 'Arrow', icon: ArrowRight },
  { id: 'magic_bolt', name: 'Magic Bolt', icon: Zap },
  { id: 'cannonball', name: 'Cannonball', icon: CircleDot },
  { id: 'frost_bolt', name: 'Frost Bolt', icon: Snowflake },
  { id: 'laser', name: 'Laser Beam', icon: Radio },
  { id: 'missile', name: 'Missile', icon: Rocket },
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
    form.value.name = asset.name.replace(/_W|_N|_E|_S|\.png|\.webp/g, '').trim()
  }
}

function closeModal() {
  towerStore.isCreateTowerModalOpen = false
}

function handleCreateTower() {
  if (!form.value.name.trim()) {
    notify.warning("Please enter a tower name!", "Name Required")
    return
  }

  const asset = selectedAsset.value || assetStore.assets[0]
  const assetId = asset ? asset.id : 'sprite-stoneColumn_W'
  const assetName = asset ? `${asset.name}.webp` : 'stoneColumn_W.webp'
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
  } else if (form.value.projectileType === 'frost_bolt') {
    projColor = 0x06b6d4
    projSpeed = 14.0
  } else if (form.value.projectileType === 'laser') {
    projColor = 0xec4899
    projSpeed = 26.0
  } else if (form.value.projectileType === 'missile') {
    projColor = 0xe11d48
    projSpeed = 12.0
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
  notify.success(`Tower "${newBlueprint.name}" created successfully!`)
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
