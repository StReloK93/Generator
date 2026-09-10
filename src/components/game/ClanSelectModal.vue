<template>
  <UiModal
    :is-open="towerStore.isClanSelectModalOpen"
    :title="$t('clans.chooseClan')"
    :subtitle="$t('clans.chooseClanDesc')"
    :icon="Swords"
    icon-color="amber"
    size="4xl"
    :close-on-backdrop="false"
    :show-close-button="!!towerStore.selectedClanId"
    @close="towerStore.closeClanSelectModal()"
  >
    <div class="flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar p-1 select-none">
      
      <!-- Faction Cards Grid (2 columns on tablet/desktop, 1 on mobile) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
        <UiCard
          v-for="clan in towerStore.clans"
          :key="clan.id"
          :variant="towerStore.selectedClanId === clan.id ? 'amber' : 'slate'"
          padding="md"
          :custom-class="[
            'flex flex-col justify-between gap-3 transition-all duration-200 cursor-pointer border-2 relative overflow-hidden group',
            towerStore.selectedClanId === clan.id
              ? 'border-amber-400/90 bg-slate-900/95 ring-2 ring-amber-400/30 shadow-xl shadow-amber-500/10'
              : 'border-slate-800/80 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900/60'
          ]"
          @click="selectFaction(clan.id)"
        >
          <!-- Clan Header with Icon & Banner Glow -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div 
                class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-md transition-transform group-hover:scale-105"
                :style="{ 
                  backgroundColor: `${clan.color || '#38bdf8'}20`, 
                  borderColor: `${clan.color || '#38bdf8'}60`,
                  color: clan.color || '#38bdf8' 
                }"
              >
                <component :is="getClanIcon(clan.iconName)" class="w-6 h-6" />
              </div>

              <div class="flex flex-col min-w-0 text-left">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <h3 class="font-black text-white text-base leading-tight truncate">
                    {{ clan.name }}
                  </h3>
                  <UiBadge v-if="clan.isDefault" variant="slate" size="xs">
                    {{ $t('common.default') }}
                  </UiBadge>
                </div>
                <p class="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {{ clan.description || $t('clans.defaultClanName') }}
                </p>
              </div>
            </div>

            <div v-if="towerStore.selectedClanId === clan.id" class="shrink-0 text-amber-400 animate-in zoom-in-50 duration-150">
              <CheckCircle2 class="w-6 h-6 fill-amber-400/20" />
            </div>
          </div>

          <!-- Clan Dedicated Towers Preview -->
          <div class="flex flex-col gap-1.5 pt-2 border-t border-slate-800/80 mt-1">
            <div class="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span class="flex items-center gap-1">
                <Shield class="w-3.5 h-3.5 text-slate-400" />
                <span>{{ $t('clans.allTowersInClan') }}</span>
              </span>
              <span class="font-mono text-slate-300">
                {{ getClanTowers(clan.id).length }}
              </span>
            </div>

            <!-- Tower Micro Chips Row -->
            <div class="flex items-center gap-1.5 flex-wrap">
              <div
                v-for="tower in getClanTowers(clan.id)"
                :key="tower.id"
                class="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 shadow-xs"
                :title="tower.name"
              >
                <div class="w-4 h-4 rounded-md bg-slate-950 flex items-center justify-center shrink-0 overflow-hidden">
                  <img 
                    v-if="getTowerSprite(tower)" 
                    :src="getTowerSprite(tower)" 
                    :alt="tower.name"
                    class="w-full h-full object-contain"
                  />
                  <Shield v-else class="w-3 h-3 text-slate-400" />
                </div>
                <span class="font-medium truncate max-w-24">{{ tower.name }}</span>
                <span class="font-mono text-amber-400 text-[10px] font-bold">{{ tower.cost }}g</span>
              </div>

              <div 
                v-if="getClanTowers(clan.id).length === 0"
                class="text-[11px] text-slate-500 italic py-1"
              >
                {{ $t('config.noTowers') }}
              </div>
            </div>
          </div>

          <!-- Selection Action Button -->
          <div class="pt-2">
            <UiButton
              :variant="towerStore.selectedClanId === clan.id ? 'game-green' : 'game-amber'"
              size="sm"
              block
              :leading-icon="towerStore.selectedClanId === clan.id ? Check : Swords"
              @click.stop="selectFaction(clan.id)"
            >
              {{ towerStore.selectedClanId === clan.id ? $t('clans.selectedFaction') : $t('clans.selectFactionToPlay') }}
            </UiButton>
          </div>
        </UiCard>
      </div>

    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Swords, Shield, Check, CheckCircle2 } from 'lucide-vue-next'
import { 
  UiModal, 
  UiCard, 
  UiButton, 
  UiBadge 
} from '../ui'
import { useTowerStore, TowerBlueprint } from '../../stores/towerStore'
import { useAssetStore } from '../../stores/assetStore'
import { getClanIcon } from '../../utils/towerClans'

const towerStore = useTowerStore()
const assetStore = useAssetStore()

function getClanTowers(clanId: string): TowerBlueprint[] {
  return towerStore.blueprints.filter(bp => {
    if (bp.clanId) return bp.clanId === clanId
    return clanId === towerStore.clans[0]?.id
  })
}

function getTowerSprite(bp: TowerBlueprint): string {
  if (bp.assetPath && (bp.assetPath.startsWith('http') || bp.assetPath.startsWith('data:'))) {
    return bp.assetPath
  }
  const asset = (bp.assetId ? assetStore.assets.find(a => a.id === bp.assetId) : null) ||
                (bp.assetName ? assetStore.assets.find(a => a.name === bp.assetName) : null)
  if (asset) {
    return assetStore.getAssetPreview(asset) || asset.trimmedSrc || asset.previewSrc || asset.src || ''
  }
  return ''
}

function selectFaction(clanId: string) {
  towerStore.setPlayerClan(clanId)
}
</script>
