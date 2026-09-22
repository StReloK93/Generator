<template>
  <UiModal :is-open="towerStore.isClanSelectModalOpen" :title="$t('clans.chooseClan')"
    :subtitle="$t('clans.chooseClanDesc')" :icon="Swords" icon-color="amber" size="4xl" :close-on-backdrop="false"
    :show-close="!!towerStore.selectedClanId" @close="towerStore.closeClanSelectModal()">
    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 items-stretch select-none">
      <!-- Faction Cards Grid (2 columns on tablet/desktop, 1 on mobile) -->
      <UiCard v-for="clan in towerStore.clans" :key="clan.id" :custom-class="[
        'cursor-pointer border',
        towerStore.selectedClanId === clan.id
          ? 'bg-slate-900/95 ring-2 ring-amber-400/30 '
          : 'bg-slate-950/80 '
      ]" @click="selectFaction(clan.id)">
        <!-- Clan Header with Icon & Banner Glow -->
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border " :style="{
              backgroundColor: `${clan.color || '#38bdf8'}20`,
              borderColor: `${clan.color || '#38bdf8'}60`,
              color: clan.color || '#38bdf8'
            }">
              <component :is="getClanIcon(clan.iconName)" class="w-6 h-6" />
            </div>

            <div class="flex flex-col min-w-0 text-left">
              <div class="flex items-center gap-1.5 flex-wrap">
                <h3 class="font-black text-white text-base leading-tight truncate">
                  {{ clan.name }}
                </h3>
              </div>

            </div>
          </div>

          <div v-if="towerStore.selectedClanId === clan.id"
            class="shrink-0 text-amber-400 animate-in zoom-in-50 duration-150">
            <CheckCircle2 class="w-6 h-6 fill-amber-400/20" />
          </div>
        </div>
        <p class="text-xs text-slate-400 mt-4 line-clamp-2 leading-relaxed">
          {{ clan.description || $t('clans.defaultClanName') }}
        </p>

      </UiCard>

    </div>

  </UiModal>
</template>

<script setup lang="ts">
import { Swords, CheckCircle2 } from 'lucide-vue-next'
import {
  UiModal,
  UiCard,
} from '../ui'
import { useTowerStore } from '../../stores/towerStore'
import { getClanIcon } from '../../utils/towerClans'

const towerStore = useTowerStore()


function selectFaction(clanId: string) {
  towerStore.setPlayerClan(clanId)
}
</script>
