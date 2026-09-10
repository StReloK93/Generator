<template>
  <UiModal
    :is-open="towerStore.isCreateTowerModalOpen"
    :title="$t('towers.createModalTitle')"
    :subtitle="$t('towers.createModalSubtitle')"
    :icon="Plus"
    icon-color="amber"
    size="4xl"
    @close="closeModal"
  >
    <div class="flex flex-col gap-3.5 select-none">
      
      <!-- 0. Clan / Faction Destination Banner -->
      <UiCard variant="subtle" padding="sm" custom-class="flex items-center justify-between gap-3 flex-wrap border-amber-500/30 bg-slate-900/90">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs font-bold text-amber-300 flex items-center gap-1">
            <Swords class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ $t('clans.belongsToClan') }}:</span>
          </span>
          <div class="flex items-center gap-1.5 flex-wrap">
            <button
              v-for="clan in towerStore.clans"
              :key="clan.id"
              type="button"
              :class="[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                form.clanId === clan.id
                  ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-2 ring-amber-400/40 shadow-xs'
                  : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              ]"
              @click="form.clanId = clan.id"
            >
              <component :is="getClanIcon(clan.iconName)" class="w-3.5 h-3.5" :style="{ color: clan.color || '#38bdf8' }" />
              <span>{{ clan.name }}</span>
            </button>
          </div>
        </div>
      </UiCard>

      <!-- 1. Visual Asset Image Selector with Live Preview, Categories & Search -->
      <UiCard variant="amber" padding="sm" custom-class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-amber-500/20">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-amber-300">{{ $t('towers.selectAppearance') }}</span>
            <UiBadge variant="amber" size="xs">{{ $t('towers.availableCount', { count: filteredAssets.length }) }}</UiBadge>
          </div>
          <span v-if="selectedAsset" class="text-[11px] font-mono font-bold text-slate-300 truncate max-w-50">
            {{ $t('towers.selectedPrefix') }} <span class="text-amber-400">{{ selectedAsset.name }}</span>
          </span>
        </div>

        <!-- Search & Category Filters (Full Width Row) -->
        <div class="flex items-center gap-2 flex-wrap justify-between">
          <UiInput
            v-model="assetSearchQuery"
            :placeholder="$t('towers.searchPlaceholder')"
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
              {{ $t('config.noSpriteSelected') }}
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
          :label="$t('towers.towerNameLabel')"
          :placeholder="$t('towers.towerNamePlaceholder')"
        />

        <UiNumberInput
          v-model="form.cost"
          :label="$t('towers.buildCostLabel')"
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
            :label="$t('towers.damageLabel')"
            :min="5"
            :max="500"
            :step="5"
          />

          <UiSlider
            v-model="form.attackSpeed"
            :label="$t('towers.attackRateLabel')"
            :min="0.1"
            :max="3.0"
            :step="0.1"
            unit="s"
          />

          <UiSlider
            v-model="form.range"
            :label="$t('towers.attackRangeLabel')"
            :min="1.5"
            :max="10.0"
            :step="0.5"
            unit=" cells"
          />
        </div>
      </UiCard>

      <!-- 4. Projectile Type -->
      <div class="flex flex-col gap-1.5">
        <span class="text-xs font-semibold text-slate-300">{{ $t('towers.projectileTypeLabel') }}</span>
        <UiTabs
          v-model="form.projectileType"
          :items="projectileTypes"
          variant="amber"
          size="sm"
        />
      </div>

      <!-- 5. Splash Damage Toggle & Radius -->
      <UiCard variant="subtle" padding="md">
        <div class="flex items-center justify-between">
          <UiSwitch
            v-model="form.isSplash"
            :label="$t('towers.areaDamageLabel')"
            variant="amber"
          />

          <div v-if="form.isSplash" class="flex items-center gap-1 text-[11px] font-mono text-amber-300">
            <span>{{ $t('towers.radiusLabel', { radius: form.splashRadius }) }}</span>
          </div>
        </div>

        <div v-if="form.isSplash" class="flex flex-col gap-2 pt-2 mt-2 border-t border-slate-800/80">
          <UiSlider
            v-model="form.splashRadius"
            :label="$t('towers.splashRadiusLabel')"
            :min="0.5"
            :max="5.0"
            :step="0.5"
            unit=" cells"
          />

          <UiTabs
            v-model="form.splashType"
            :items="splashTypeOptions"
            variant="amber"
            size="xs"
          />
        </div>
      </UiCard>

      <!-- 6. Multi-Traits & Elemental Properties Card -->
      <div class="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
        <div class="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-slate-800">
          <div class="flex items-center gap-1.5">
            <Sparkles class="w-4 h-4 text-amber-400" />
            <span class="text-xs font-bold text-slate-200">{{ $t('traits.title') }}</span>
          </div>
          <UiBadge 
            :variant="(form.traits && form.traits.length > 0) ? 'amber' : 'slate'" 
            size="xs"
          >
            {{ (form.traits && form.traits.length > 0) ? $t('traits.traitsActiveCount', { count: form.traits.length }) : $t('traits.noTraitsActive') }}
          </UiBadge>
        </div>
        <p class="text-[10px] text-slate-400 leading-tight">
          {{ $t('traits.subtitle') }}
        </p>

        <!-- Trait Toggle Buttons Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
          <button
            v-for="trait in TOWER_TRAITS"
            :key="trait.id"
            type="button"
            @click="toggleFormTrait(trait.id)"
            :title="$t(trait.descKey)"
            class="flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer select-none group"
            :class="hasFormTrait(trait.id)
              ? 'ring-1 ring-white/40 shadow-sm scale-102 ' + trait.bgClass + ' ' + trait.borderClass
              : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-400'"
          >
            <component 
              :is="trait.icon" 
              class="w-4 h-4 transition-transform group-hover:scale-110"
              :style="{ color: hasFormTrait(trait.id) ? trait.color : '#94a3b8' }"
            />
            <span 
              class="text-[10px] font-medium truncate max-w-full mt-1"
              :class="hasFormTrait(trait.id) ? 'font-bold text-slate-100' : 'text-slate-400'"
            >
              {{ $t(trait.nameKey) }}
            </span>
          </button>
        </div>

        <!-- Active Trait Parameter Sub-Sliders -->
        <div v-if="form.traits && form.traits.length > 0" class="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
          <!-- Fire Parameters -->
          <UiCard v-if="hasFormTrait('fire')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-3 gap-2 border-orange-500/30 bg-orange-950/20">
            <div class="sm:col-span-3 flex items-center gap-1.5 text-[11px] font-bold text-orange-400">
              <Flame class="w-3.5 h-3.5" />
              <span>{{ $t('traits.fireName') }}</span>
            </div>
            <UiSlider 
              v-model="form.fireBonusDamage"
              :label="$t('traits.fireBonusDamage')"
              :min="1"
              :max="200"
              :step="1"
              unit=" DMG"
            />
            <UiSlider 
              v-model="form.burnDps"
              :label="$t('traits.burnDps')"
              :min="1"
              :max="100"
              :step="1"
              unit="/s"
            />
            <UiSlider 
              v-model="form.burnDuration"
              :label="$t('traits.burnDuration')"
              :min="0.5"
              :max="10.0"
              :step="0.5"
              unit="s"
            />
          </UiCard>

          <!-- Frost Parameters -->
          <UiCard v-if="hasFormTrait('frost')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-3 gap-2 border-cyan-500/30 bg-cyan-950/20">
            <div class="sm:col-span-3 flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
              <Snowflake class="w-3.5 h-3.5" />
              <span>{{ $t('traits.frostName') }}</span>
            </div>
            <UiSlider 
              v-model="form.frostBonusDamage"
              :label="$t('traits.frostBonusDamage')"
              :min="0"
              :max="100"
              :step="1"
              unit=" DMG"
            />
            <UiSlider 
              v-model="form.slowPercent"
              :label="$t('traits.slowPercent')"
              :min="5"
              :max="80"
              :step="5"
              unit="%"
            />
            <UiSlider 
              v-model="form.slowDuration"
              :label="$t('traits.slowDuration')"
              :min="0.5"
              :max="10.0"
              :step="0.5"
              unit="s"
            />
          </UiCard>

          <!-- Poison Parameters -->
          <UiCard v-if="hasFormTrait('poison')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-3 gap-2 border-emerald-500/30 bg-emerald-950/20">
            <div class="sm:col-span-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <Skull class="w-3.5 h-3.5" />
              <span>{{ $t('traits.poisonName') }}</span>
            </div>
            <UiSlider 
              v-model="form.poisonDps"
              :label="$t('traits.poisonDps')"
              :min="1"
              :max="100"
              :step="1"
              unit="/s"
            />
            <UiSlider 
              v-model="form.poisonDuration"
              :label="$t('traits.poisonDuration')"
              :min="1.0"
              :max="15.0"
              :step="0.5"
              unit="s"
            />
            <UiSlider 
              v-model="form.poisonSlowPercent"
              :label="$t('traits.poisonSlowPercent')"
              :min="0"
              :max="50"
              :step="5"
              unit="%"
            />
          </UiCard>

          <!-- Stacking Ramp Parameters -->
          <UiCard v-if="hasFormTrait('stacking')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-amber-500/30 bg-amber-950/20">
            <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
              <TrendingUp class="w-3.5 h-3.5" />
              <span>{{ $t('traits.stackingName') }}</span>
            </div>
            <UiSlider 
              v-model="form.stackBonusDamage"
              :label="$t('traits.stackBonusDamage')"
              :min="1"
              :max="100"
              :step="1"
              unit=" DMG/hit"
            />
            <UiSlider 
              v-model="form.maxStacks"
              :label="$t('traits.maxStacks')"
              :min="2"
              :max="50"
              :step="1"
              unit=" stacks"
            />
          </UiCard>

          <!-- Blood Parameters -->
          <UiCard v-if="hasFormTrait('blood')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-rose-500/30 bg-rose-950/20">
            <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
              <Droplet class="w-3.5 h-3.5" />
              <span>{{ $t('traits.bloodName') }}</span>
            </div>
            <UiSlider 
              v-model="form.bleedDps"
              :label="$t('traits.bleedDps')"
              :min="1"
              :max="120"
              :step="1"
              unit="/s"
            />
            <UiSlider 
              v-model="form.bleedDuration"
              :label="$t('traits.bleedDuration')"
              :min="1.0"
              :max="10.0"
              :step="0.5"
              unit="s"
            />
          </UiCard>

          <!-- Electric Parameters -->
          <UiCard v-if="hasFormTrait('electric')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-sky-500/30 bg-sky-950/20">
            <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-400">
              <Zap class="w-3.5 h-3.5" />
              <span>{{ $t('traits.electricName') }}</span>
            </div>
            <UiSlider 
              v-model="form.electricBonusDamage"
              :label="$t('traits.electricBonusDamage')"
              :min="1"
              :max="150"
              :step="1"
              unit=" DMG"
            />
            <UiSlider 
              v-model="form.stunDuration"
              :label="$t('traits.stunDuration')"
              :min="0.1"
              :max="2.0"
              :step="0.1"
              unit="s"
            />
          </UiCard>

          <!-- Void Parameters -->
          <UiCard v-if="hasFormTrait('void')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-purple-500/30 bg-purple-950/20">
            <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
              <Ghost class="w-3.5 h-3.5" />
              <span>{{ $t('traits.voidName') }}</span>
            </div>
            <UiSlider 
              v-model="form.voidVulnPercent"
              :label="$t('traits.voidVulnPercent')"
              :min="5"
              :max="100"
              :step="5"
              unit="%"
            />
            <UiSlider 
              v-model="form.voidDuration"
              :label="$t('traits.voidDuration')"
              :min="1.0"
              :max="15.0"
              :step="0.5"
              unit="s"
            />
          </UiCard>
        </div>
      </div>

    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <UiButton
        variant="ghost"
        size="sm"
        @click="closeModal"
      >
        {{ $t('common.cancel') }}
      </UiButton>

      <UiButton
        variant="game-amber"
        size="md"
        :leading-icon="ShieldAlert"
        @click="handleCreateTower"
      >
        {{ $t('towers.createTowerBtn') }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Plus, ShieldAlert, Search, Flame, ArrowRight, Zap, CircleDot, Snowflake, Radio, Rocket, TrendingDown, Equal, Sparkles, Skull, Droplet, Ghost, TrendingUp, Swords } from 'lucide-vue-next'
import { UiModal, UiInput, UiCard, UiSlider, UiNumberInput, UiButton, UiBadge, UiTabs, UiSwitch } from './ui'
import { useTowerStore, ProjectileType, SplashType } from '../stores/towerStore'
import { useAssetStore } from '../stores/assetStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import { AssetItem, TowerTraitType } from '../types/map'
import { TOWER_TRAITS, getTraitDef } from '../utils/towerTraits'
import { getClanIcon } from '../utils/towerClans'

const towerStore = useTowerStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()
const { t } = useI18n()

const assetSearchQuery = ref('')
const selectedCategory = ref('all')

const categories = computed(() => [
  { id: 'all', label: t('assets.catAll') },
  { id: 'walls', label: t('assets.catWalls') },
  { id: 'ground', label: t('assets.catGround') },
  { id: 'stairs', label: t('assets.catStairs') },
  { id: 'props', label: t('assets.catProps') },
])

const projectileTypes = computed(() => [
  { id: 'fireball', label: t('towers.projectileFireball'), icon: Flame },
  { id: 'arrow', label: t('towers.projectileArrow'), icon: ArrowRight },
  { id: 'magic_bolt', label: t('towers.projectileMagic'), icon: Zap },
  { id: 'cannonball', label: t('towers.projectileCannonball'), icon: CircleDot },
  { id: 'frost_bolt', label: t('towers.projectileFrost'), icon: Snowflake },
  { id: 'laser', label: t('towers.projectileLaser'), icon: Radio },
  { id: 'missile', label: t('towers.projectileMissile'), icon: Rocket },
])

const splashTypeOptions = computed(() => [
  { id: 'falloff', label: t('traits.splashFalloff'), icon: TrendingDown },
  { id: 'constant', label: t('traits.splashConstant'), icon: Equal }
])

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
  clanId: towerStore.selectedEditorClanId || towerStore.clans[0]?.id || 'clan-iron',
  damage: 60,
  attackSpeed: 0.5,
  range: 4.0,
  projectileType: 'fireball' as ProjectileType,
  isSplash: true,
  splashRadius: 1.5,
  splashType: 'falloff' as SplashType,
  cost: 100,
  traits: ['fire'] as TowerTraitType[],
  fireBonusDamage: 5,
  burnDps: 4,
  burnDuration: 3.0,
  slowPercent: 30,
  slowDuration: 2.5,
  frostBonusDamage: 2,
  poisonDps: 6,
  poisonDuration: 4.0,
  poisonSlowPercent: 10,
  stackBonusDamage: 4,
  maxStacks: 10,
  bleedDps: 7,
  bleedDuration: 3.5,
  electricBonusDamage: 6,
  chainTargets: 2,
  stunDuration: 0.3,
  voidVulnPercent: 25,
  voidDuration: 4.0,
})

watch(() => towerStore.isCreateTowerModalOpen, (isOpen) => {
  if (isOpen) {
    form.value.clanId = towerStore.selectedEditorClanId || towerStore.clans[0]?.id || 'clan-iron'
  }
})

function hasFormTrait(traitId: TowerTraitType): boolean {
  return form.value.traits.includes(traitId)
}

function toggleFormTrait(traitId: TowerTraitType) {
  const idx = form.value.traits.indexOf(traitId)
  if (idx !== -1) {
    form.value.traits.splice(idx, 1)
  } else {
    form.value.traits.push(traitId)
    const traitDef = getTraitDef(traitId)
    if (traitDef && traitDef.defaultValues) {
      Object.assign(form.value, traitDef.defaultValues)
    }
  }
}

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
    notify.warning(t('towers.enterTowerName'), t('towers.nameRequired'))
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
    clanId: form.value.clanId || towerStore.selectedEditorClanId || towerStore.clans[0]?.id || 'clan-iron',
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
    traits: [...form.value.traits],
    fireBonusDamage: form.value.fireBonusDamage,
    burnDps: form.value.burnDps,
    burnDuration: form.value.burnDuration,
    slowPercent: form.value.slowPercent,
    slowDuration: form.value.slowDuration,
    frostBonusDamage: form.value.frostBonusDamage,
    poisonDps: form.value.poisonDps,
    poisonDuration: form.value.poisonDuration,
    poisonSlowPercent: form.value.poisonSlowPercent,
    stackBonusDamage: form.value.stackBonusDamage,
    maxStacks: form.value.maxStacks,
    bleedDps: form.value.bleedDps,
    bleedDuration: form.value.bleedDuration,
    electricBonusDamage: form.value.electricBonusDamage,
    chainTargets: form.value.chainTargets,
    stunDuration: form.value.stunDuration,
    voidVulnPercent: form.value.voidVulnPercent,
    voidDuration: form.value.voidDuration,
  }

  towerStore.addNewBlueprint(newBlueprint)
  notify.success(t('towers.towerCreatedSuccess', { name: newBlueprint.name }))
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
