<template>
  <UiModal
    :is-open="towerStore.isClanSelectModalOpen"
    :title="$t('clans.chooseClan')"
    :subtitle="$t('clans.chooseClanDesc')"
    :icon="Swords"
    icon-color="amber"
    size="4xl"
    :close-on-backdrop="false"
    :show-close="!!towerStore.selectedClanId"
    body-class="p-3! sm:p-4!"
    @close="towerStore.closeClanSelectModal()"
  >
    <!-- One clan per row on an upright phone, side by side on wide screens: each shows its towers -->
    <div class="grid grid-cols-1 landscape:grid-cols-3 gap-2 select-none">
      <UiCard
        v-for="clan in clans"
        :key="clan.id"
        interactive
        padding="none"
        :custom-class="[
          'cursor-pointer border p-3 flex flex-col gap-2.5 transition-all',
          towerStore.selectedClanId === clan.id ? 'bg-slate-900/95 ring-2 ring-amber-400/50 border-amber-400/60' : 'bg-slate-950/80 border-slate-800',
        ]"
        @click="towerStore.setPlayerClan(clan.id)"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div
            class="size-11 rounded-xl flex items-center justify-center shrink-0 border"
            :style="{ backgroundColor: `${clan.color}20`, borderColor: `${clan.color}60`, color: clan.color }"
          >
            <component :is="getClanIcon(clan.iconName)" class="size-6" />
          </div>
          <div class="flex flex-col min-w-0 flex-1">
            <h3 class="font-black text-white text-base leading-tight">{{ clan.name }}</h3>
            <p v-if="clan.description" class="text-xs text-slate-400 leading-snug mt-0.5">{{ clan.description }}</p>
          </div>
          <CheckCircle2 v-if="towerStore.selectedClanId === clan.id" class="size-6 shrink-0 text-amber-400 fill-amber-400/20 animate-in zoom-in-50 duration-150" />
        </div>

        <!-- The clan's towers, cheapest first -->
        <div v-if="clan.towers.length" class="flex items-end gap-1.5 overflow-x-auto no-scrollbar">
          <div
            v-for="bp in clan.towers"
            :key="bp.id"
            class="shrink-0 w-11 flex flex-col items-center gap-0.5 rounded-lg bg-slate-950/60 border border-slate-800 pt-1 pb-0.5"
            :title="bp.name"
          >
            <img v-if="assetStore.getTowerAssetPreview(bp.asset)" :src="assetStore.getTowerAssetPreview(bp.asset)" :alt="bp.name" class="size-8 object-contain" />
            <span class="text-[9px] font-bold text-amber-300 tabular-nums">{{ bp.levels[0]?.cost ?? 0 }}</span>
          </div>
        </div>
      </UiCard>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Swords, CheckCircle2 } from 'lucide-vue-next'
import { UiModal, UiCard } from '../ui'
import { useTowerStore } from '../../stores/towerStore'
import { useAssetStore } from '../../stores/assetStore'
import { getClanIcon } from '../../utils/towerClans'

const towerStore = useTowerStore()
const assetStore = useAssetStore()

const clans = computed(() =>
  towerStore.clans.map(clan => ({
    ...clan,
    color: clan.color || '#38bdf8',
    towers: towerStore.blueprints
      .filter(bp => bp.clanId === clan.id)
      .sort((a, b) => (a.levels[0]?.cost ?? 0) - (b.levels[0]?.cost ?? 0)),
  }))
)
</script>
