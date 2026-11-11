<template>
  <!-- A small card above the tower shop: the tower picked on the map (upgrade, sell, targeting) or the one being built -->
  <UiCard
    v-if="tower || blueprint"
    variant="slate"
    padding="none"
    custom-class="pointer-events-auto w-64 max-w-full flex flex-col gap-2 p-2.5 rounded-2xl border-slate-700/80 bg-slate-950/90 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs"
  >
    <div class="flex items-center gap-2 min-w-0">
      <div class="size-10 rounded-lg bg-slate-900 border p-0.5 flex items-center justify-center shrink-0 overflow-hidden" :class="tower ? 'border-slate-700/80' : 'border-amber-500/40'">
        <img v-if="picture" :src="picture" :alt="name" class="w-full h-full object-contain" />
        <ShieldAlert v-else class="size-5 text-amber-400" />
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="font-extrabold text-slate-50 truncate">{{ name }}</span>
          <UiBadge v-if="tower && hasLevels" variant="cyan" size="xs" class="shrink-0">{{ $t('game.lvl', { level: tower.level }) }}</UiBadge>
          <span v-if="blueprint" class="ml-auto shrink-0 text-[11px] text-amber-300 font-extrabold flex items-center gap-0.5">
            <Coins class="size-3 text-amber-400" />{{ blueprint.levels[0].cost ?? 100 }}
          </span>
        </div>
        <div v-if="traits.length" class="flex items-center gap-1 flex-wrap mt-0.5">
          <span
            v-for="trait in traits"
            :key="trait.nameKey"
            class="px-1 py-px rounded text-[9px] font-bold border flex items-center gap-0.5"
            :class="trait.badgeClass"
          >
            <component :is="trait.icon" class="size-2.5" />{{ $t(trait.nameKey) }}
          </span>
        </div>
      </div>
      <UiIconButton v-if="tower" :icon="X" size="sm" variant="ghost" :title="$t('common.close')" @click="towerStore.selectPlacedTower(null)" />
    </div>

    <div class="grid gap-1" :class="stats.length === 4 ? 'grid-cols-4' : 'grid-cols-3'">
      <div
        v-for="stat in stats"
        :key="stat.label"
        :title="stat.label"
        class="flex flex-col items-center gap-1 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800"
      >
        <component :is="stat.icon" :class="['size-3.5', stat.color]" />
        <span class="text-[11px] font-extrabold text-slate-50 leading-none">{{ stat.value }}</span>
      </div>
    </div>

    <template v-if="tower && isOwner">
      <UiTabs
        :model-value="tower.targetStrategy || 'first'"
        :items="targetStrategies"
        variant="pills"
        size="xs"
        custom-class="grid! grid-cols-3"
        @update:model-value="towerStore.setTowerTargetStrategy(tower.id, $event as TargetStrategy)"
      />
      <div class="flex items-center gap-1.5">
        <UiButton v-if="nextLevel" variant="game-green" size="sm" :leading-icon="Zap" :disabled="towerStore.myGold < upgradeCost" @click="upgrade">
          <Coins class="size-3 inline" /> {{ upgradeCost }}
        </UiButton>
        <UiButton variant="danger" size="sm" class="ml-auto" @click="sell">
          {{ $t('common.sell') }}
          <span class="text-amber-200 inline-flex items-center gap-0.5 ml-1"><Coins class="size-3" />{{ sellRefund }}</span>
        </UiButton>
      </div>
    </template>
  </UiCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Coins, Crosshair, Flame, ShieldAlert, Skull, X, Zap } from 'lucide-vue-next'
import { UiBadge, UiButton, UiCard, UiIconButton, UiTabs } from '../ui'
import { useTowerStore } from '../../stores/towerStore'
import { useAssetStore } from '../../stores/assetStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { getTraitDef } from '../../utils/towerTraits'
import type { TargetStrategy } from '../../types/combat'

const towerStore = useTowerStore()
const assetStore = useAssetStore()
const multiplayerStore = useMultiplayerStore()
const notify = useNotificationStore()
const { t } = useI18n()

/** A placed tower picked on the map wins over the shop's tower being built */
const tower = computed(() => towerStore.selectedPlacedTower)
const blueprint = computed(() => (tower.value || !towerStore.activeBuildTowerId ? null : towerStore.blueprintMap.get(towerStore.activeBuildTowerId) ?? null))
const towerBlueprint = computed(() => (tower.value ? towerStore.blueprintMap.get(tower.value.blueprintId) : undefined))

const name = computed(() => tower.value?.name ?? blueprint.value?.name ?? '')
const picture = computed(() => {
  const asset = towerBlueprint.value?.asset ?? blueprint.value?.asset
  return asset ? assetStore.getTowerAssetPreview(asset) : ''
})
const traits = computed(() => (tower.value?.traits ?? blueprint.value?.levels[0].traits ?? []).map(id => getTraitDef(id)))

/** Compact stat cells (icon + value, label as tooltip) */
const stats = computed(() => {
  const source = tower.value ?? blueprint.value?.levels[0]
  if (!source) return []
  const cells = [
    { icon: Flame, color: 'text-rose-400', value: source.damage, label: t('common.damage') },
    { icon: Zap, color: 'text-amber-400', value: `${(1 / (source.attackSpeed || 1)).toFixed(1)}/s`, label: t('config.attackSpeed') },
    { icon: Crosshair, color: 'text-sky-400', value: source.range, label: t('config.attackRange') },
  ]
  if (tower.value) cells.push({ icon: Skull, color: 'text-rose-300', value: tower.value.killsCount, label: t('game.kills') })
  return cells
})

const targetStrategies = computed(() => [
  { id: 'first', label: t('game.targetFirst') },
  { id: 'strongest', label: t('game.targetStrongest') },
  { id: 'weakest', label: t('game.targetWeakest') },
  { id: 'closest', label: t('game.targetClosest') },
  { id: 'last', label: t('game.targetLast') },
])

/** In a room only the builder manages a tower */
const isOwner = computed(() => !multiplayerStore.roomId || !tower.value?.builderId || tower.value.builderId === multiplayerStore.myPlayerId)

/** Level badge and upgrades only make sense when the blueprint defines more than one level */
const hasLevels = computed(() => (towerBlueprint.value?.levels.length ?? 0) > 1)
const nextLevel = computed(() => (tower.value ? towerStore.getNextLevelConfig(tower.value) : null))
const upgradeCost = computed(() => nextLevel.value?.cost ?? 0)

/** 70% of what went into the tower (its price and its upgrades) */
const sellRefund = computed(() => {
  const bp = towerBlueprint.value
  if (!tower.value || !bp) return 0
  const invested = bp.levels.slice(0, Math.min(tower.value.level, bp.levels.length)).reduce((sum, level, i) => sum + (i === 0 ? (level.cost ?? 100) : level.cost || 0), 0)
  return Math.round(invested * 0.7)
})

function upgrade() {
  const placed = tower.value
  if (!placed) return
  if (towerStore.myGold < upgradeCost.value) {
    notify.gold(t('game.upgradeNeedGold', { cost: upgradeCost.value, current: towerStore.myGold }), t('game.cannotAfford'))
    return
  }
  const level = placed.level + 1
  if (towerStore.upgradePlacedTower(placed.id)) notify.success(t('game.towerUpgraded', { level }), t('game.towerUpgradedTitle'))
}

function sell() {
  const placed = tower.value
  if (!placed) return
  const refund = sellRefund.value
  towerStore.sellPlacedTower(placed.id)
  notify.info(t('game.towerSold', { gold: refund }), t('game.towerSoldTitle'))
}
</script>
