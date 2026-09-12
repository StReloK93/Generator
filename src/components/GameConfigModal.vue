<template>
  <UiModal
    :is-open="toolStore.isGameConfigModalOpen"
    :title="$t('config.modalTitle')"
    :subtitle="$t('config.modalTitle')"
    :icon="Gamepad2"
    icon-color="amber"
    size="5xl"
    @close="toolStore.closeGameConfig()"
  >
    <!-- Header Extra Slot for Gold -->
    <template #title>
      <div class="flex items-center justify-between w-full">
        <span>{{ $t('config.modalTitle') }}</span>
      </div>
    </template>

    <!-- NAVIGATION TABS -->
    <UiTabs
      v-model="toolStore.gameConfigActiveTab"
      :items="configTabItems"
      fill
      size="md"
    />

    <!-- ========================================================================= -->
    <!-- TAB 1: CLANS & TOWER BLUEPRINTS                                           -->
    <!-- ========================================================================= -->
    <div v-if="toolStore.gameConfigActiveTab === 'towers'" class="flex flex-col gap-3">
      
      <!-- 1. CLANS SELECTION & MANAGEMENT BAR -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800/80">
          <div class="flex items-center gap-1.5">
            <span class="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
              <Swords class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ $t('clans.title') }}</span>
            </span>
            <UiBadge variant="amber" size="xs">{{ towerStore.clans.length }}</UiBadge>
          </div>

          <div class="flex items-center gap-1.5 ml-auto">
            <UiButton 
              variant="game-amber"
              size="xs"
              :leading-icon="Plus"
              @click="openCreateClanModal"
            >
              {{ $t('clans.addClan') }}
            </UiButton>
          </div>
        </div>

        <!-- Clans Chips Row -->
        <div class="flex items-center gap-2 overflow-x-auto custom-scrollbar py-0.5">
          <button
            v-for="clan in towerStore.clans"
            :key="clan.id"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer',
              towerStore.selectedEditorClanId === clan.id
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            @click="towerStore.selectEditorClan(clan.id)"
          >
            <component 
              :is="getClanIcon(clan.iconName)" 
              class="w-3.5 h-3.5"
              :style="{ color: clan.color || '#38bdf8' }" 
            />
            <span>{{ clan.name }}</span>
            <span class="px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-400">
              {{ getClanTowerCount(clan.id) }}
            </span>
          </button>
        </div>

        <!-- Active Clan Info & Actions -->
        <div v-if="activeEditorClan" class="flex items-center justify-between gap-3 pt-1.5 border-t border-slate-800/60 text-xs">
          <div class="flex items-center gap-2.5 min-w-0">
            <div 
              class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
              :style="{ 
                backgroundColor: `${activeEditorClan.color || '#38bdf8'}20`, 
                borderColor: `${activeEditorClan.color || '#38bdf8'}60`,
                color: activeEditorClan.color || '#38bdf8' 
              }"
            >
              <component :is="getClanIcon(activeEditorClan.iconName)" class="w-4 h-4" />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-bold text-white text-xs leading-tight truncate">{{ activeEditorClan.name }}</span>
              <span class="text-slate-400 truncate text-[11px] leading-tight">{{ activeEditorClan.description || $t('clans.defaultClanName') }}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Pencil"
              @click="openEditClanModal(activeEditorClan)"
            >
              {{ $t('common.edit') }}
            </UiButton>
            <UiIconButton 
              v-if="towerStore.clans.length > 1"
              variant="ghost"
              size="xs"
              :icon="Trash2"
              custom-class="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
              @click="confirmDeleteClan(activeEditorClan.id)"
            />
          </div>
        </div>
      </UiCard>

      <!-- 2. TOWERS IN ACTIVE CLAN -->
      <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800/80 shrink-0">
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          <span class="text-xs font-bold text-slate-300 mr-1 flex items-center gap-1">
            <Shield class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ activeEditorClan ? `${activeEditorClan.name} Towers:` : 'Towers:' }}</span>
          </span>

          <UiButton 
            v-for="bp in towerStore.editorClanBlueprints" 
            :key="bp.id"
            :variant="towerStore.selectedBlueprintId === bp.id ? 'game-amber' : 'secondary'"
            size="sm"
            @click="towerStore.selectedBlueprintId = bp.id"
          >
            <span class="w-2 h-2 rounded-full bg-amber-400 mr-1"></span>
            <span>{{ bp.name }}</span>
          </UiButton>
        </div>

        <UiButton 
          variant="game-amber"
          size="sm"
          :leading-icon="Plus"
          custom-class="ml-auto"
          @click="openCreateTowerModal"
        >
          {{ activeEditorClan ? `+ Add Tower to ${activeEditorClan.name}` : $t('config.createTower') }}
        </UiButton>
      </div>

      <!-- Clan Has No Towers Empty State -->
      <UiCard 
        v-if="towerStore.editorClanBlueprints.length === 0" 
        variant="subtle"
        padding="lg"
        custom-class="flex flex-col items-center text-center gap-3 my-4 border-dashed border-slate-800"
      >
        <div 
          class="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner"
          :style="{ 
            backgroundColor: `${activeEditorClan?.color || '#f59e0b'}20`, 
            borderColor: `${activeEditorClan?.color || '#f59e0b'}60`,
            color: activeEditorClan?.color || '#f59e0b' 
          }"
        >
          <component :is="getClanIcon(activeEditorClan?.iconName)" class="w-6 h-6" />
        </div>
        <div class="flex flex-col gap-1 max-w-md">
          <span class="font-bold text-sm text-amber-300">
            {{ activeEditorClan ? `No defense towers in ${activeEditorClan.name} yet` : $t('config.noTowers') }}
          </span>
          <span class="text-xs text-slate-400">
            {{ activeEditorClan ? `Towers are exclusive to their Clan. Add unique defense towers for ${activeEditorClan.name}!` : $t('config.noTowersDesc') }}
          </span>
        </div>
        <UiButton 
          variant="game-amber"
          size="md"
          :leading-icon="Plus"
          @click="openCreateTowerModal"
        >
          {{ activeEditorClan ? `Create First Tower for ${activeEditorClan.name}` : $t('config.createFirstTower') }}
        </UiButton>
      </UiCard>

      <!-- Active Selected Blueprint Editor -->
      <div v-else-if="selectedBp" class="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        
        <!-- Left Column: Visual Live Preview & Sprite Select -->
        <UiCard variant="amber" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-300 text-xs truncate">{{ $t('config.towerAppearance') }}</span>
          </div>

          <!-- Live Combat & Range Simulator (Tower sprite + centered firing animation) -->
          <TowerLivePreview :blueprint="selectedBp" />

          <!-- Action Buttons -->
          <div class="flex flex-col gap-2 mt-auto">
            <UiButton 
              variant="game-amber"
              size="sm"
              block
              :leading-icon="Image"
              @click="openChangeSpriteModal()"
            >
              {{ $t('config.changeSprite') }}
            </UiButton>

            <!-- Delete Blueprint -->
            <UiButton 
              v-if="towerStore.blueprints.length > 1"
              variant="danger"
              size="sm"
              block
              :leading-icon="Trash2"
              @click="handleRemoveSelectedBp()"
            >
              {{ $t('config.deleteBlueprint') }}
            </UiButton>
          </div>
        </UiCard>

        <!-- Right Column: Attributes Configuration Form -->
        <UiCard variant="default" padding="md" custom-class="md:col-span-2 flex flex-col gap-3">
          <!-- Name & Clan Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UiInput 
              :model-value="selectedBp.name"
              :label="$t('config.towerName')"
              size="sm"
              @update:model-value="(val) => updateSelectedBp({ name: String(val) })"
            />

            <!-- Clan Assignment Selector -->
            <div class="flex flex-col gap-1">
              <label class="text-[11px] font-semibold text-slate-300">{{ $t('clans.belongsToClan') }}</label>
              <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
                <button
                  v-for="clan in towerStore.clans"
                  :key="clan.id"
                  type="button"
                  :class="[
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] transition-all cursor-pointer shrink-0',
                    (selectedBp.clanId === clan.id || (!selectedBp.clanId && clan.id === towerStore.clans[0]?.id))
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  ]"
                  @click="updateSelectedBp({ clanId: clan.id })"
                >
                  <component :is="getClanIcon(clan.iconName)" class="w-3 h-3" :style="{ color: clan.color || '#38bdf8' }" />
                  <span>{{ clan.name }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- ========================================================================= -->
          <!-- TOWER UPGRADE LEVEL MANAGER                                               -->
          <!-- ========================================================================= -->
          <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2 border-amber-500/30 bg-amber-950/10">
            <div class="flex items-center justify-between gap-2 flex-wrap pb-1.5 border-b border-slate-800">
              <div class="flex items-center gap-1.5">
                <Zap class="w-3.5 h-3.5 text-amber-400" />
                <span class="text-xs font-bold text-amber-300 uppercase tracking-wide">{{ $t('config.towerLevels') }}</span>
                <UiBadge variant="amber" size="xs">{{ currentBlueprintLevels.length }}</UiBadge>
              </div>

              <div class="flex items-center gap-1.5">
                <UiButton
                  variant="game-amber"
                  size="xs"
                  :leading-icon="Plus"
                  @click="handleAddLevel"
                >
                  {{ $t('config.addLevel') }}
                </UiButton>
                <UiButton
                  v-if="selectedLevelIndex > 0"
                  variant="danger"
                  size="xs"
                  :leading-icon="Trash2"
                  @click="handleRemoveLevel"
                >
                  {{ $t('config.deleteLevel') }}
                </UiButton>
              </div>
            </div>

            <!-- Level Pills Row -->
            <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
              <button
                v-for="(lvl, idx) in currentBlueprintLevels"
                :key="idx"
                type="button"
                :class="[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0',
                  selectedLevelIndex === idx
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm ring-1 ring-amber-400/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                ]"
                @click="selectedLevelIndex = idx"
              >
                <Zap class="w-3 h-3 text-amber-400" />
                <span>{{ idx === 0 ? $t('config.levelBase', { lvl: 1 }) : $t('game.lvl', { level: idx + 1 }) }}</span>
                <span class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                  {{ lvl.damage }} DMG
                </span>
                <span v-if="idx > 0" class="font-mono text-[10px] text-amber-400/90 font-normal">
                  +{{ lvl.cost }}g
                </span>
              </button>
            </div>
          </UiCard>

          <!-- Active Level Parameters: Cost, Damage, Speed, Range -->
          <UiCard variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <!-- Cost for this level -->
            <UiNumberInput 
              :model-value="activeLevelConfig.cost"
              :label="selectedLevelIndex === 0 ? $t('config.buildCost') : $t('config.upgradeCost')"
              :min="10"
              :max="5000"
              :step="10"
              unit=" gold"
              @update:model-value="(val) => updateActiveLevel({ cost: val || (selectedLevelIndex === 0 ? 50 : 100) })"
            />

            <!-- Damage -->
            <UiSlider 
              :model-value="activeLevelConfig.damage"
              :label="$t('config.damage')"
              :min="5"
              :max="500"
              :step="5"
              unit=" DMG"
              @update:model-value="(val) => updateActiveLevel({ damage: val })"
            />

            <!-- Attack Speed -->
            <UiSlider 
              :model-value="activeLevelConfig.attackSpeed"
              :label="$t('config.attackSpeed')"
              :min="0.1"
              :max="3.0"
              :step="0.1"
              unit="s"
              @update:model-value="(val) => updateActiveLevel({ attackSpeed: val })"
            />

            <!-- Range -->
            <UiSlider 
              :model-value="activeLevelConfig.range"
              :label="$t('config.attackRange')"
              :min="1"
              :max="12"
              :step="1"
              unit=" cells"
              @update:model-value="(val) => updateActiveLevel({ range: val })"
            />
          </UiCard>

          <!-- Projectile Type & Color -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-semibold text-slate-300">{{ $t('config.projectileTypeAnim') }}</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <UiButton 
                v-for="pType in projectileOptions" 
                :key="pType.id"
                :variant="activeLevelConfig.projectileType === pType.id ? 'game-amber' : 'secondary'"
                size="xs"
                :leading-icon="pType.icon"
                @click="updateActiveLevel({ projectileType: pType.id as any })"
              >
                <span>{{ pType.name }}</span>
              </UiButton>
            </div>
          </div>

          <!-- Splash Damage Options & Distribution Mode -->
          <UiSwitch
            :model-value="!!activeLevelConfig.isSplash"
            :label="$t('config.aoeSplash')"
            :description="$t('config.aoeSplashDesc')"
            variant="amber"
            @update:model-value="(val) => updateActiveLevel({ isSplash: val })"
          />

          <div v-if="activeLevelConfig.isSplash" class="flex flex-col gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
              <UiSlider 
                :model-value="activeLevelConfig.splashRadius || 1.5"
                :label="$t('config.splashRadius')"
                :min="0.5"
                :max="5.0"
                :step="0.5"
                unit=" cells"
                @update:model-value="(val) => updateActiveLevel({ splashRadius: val })"
              />

              <div class="flex flex-col gap-1">
                <span class="text-[11px] font-semibold text-slate-300">{{ $t('traits.splashType') }}</span>
                <UiTabs 
                  :model-value="activeLevelConfig.splashType || 'falloff'"
                  :items="splashTypeOptions"
                  variant="amber"
                  size="xs"
                  @update:model-value="(val) => updateActiveLevel({ splashType: val as any })"
                />
              </div>
            </div>
          </div>

          <!-- Multi-Traits & Elemental Properties Card -->
          <div class="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div class="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-slate-800">
              <div class="flex items-center gap-1.5">
                <Sparkles class="w-4 h-4 text-amber-400" />
                <span class="text-xs font-bold text-slate-200">{{ $t('traits.title') }}</span>
              </div>
              <UiBadge 
                :variant="(activeLevelConfig.traits && activeLevelConfig.traits.length > 0) ? 'amber' : 'slate'" 
                size="xs"
              >
                {{ (activeLevelConfig.traits && activeLevelConfig.traits.length > 0) ? $t('traits.traitsActiveCount', { count: activeLevelConfig.traits.length }) : $t('traits.noTraitsActive') }}
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
                @click="toggleLevelTrait(trait.id)"
                :title="$t(trait.descKey)"
                class="flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer select-none group"
                :class="hasLevelTrait(trait.id)
                  ? 'ring-1 ring-white/40 shadow-sm scale-102 ' + trait.bgClass + ' ' + trait.borderClass
                  : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-400'"
              >
                <component 
                  :is="trait.icon" 
                  class="w-4 h-4 transition-transform group-hover:scale-110"
                  :style="{ color: hasLevelTrait(trait.id) ? trait.color : '#94a3b8' }"
                />
                <span 
                  class="text-[10px] font-medium truncate max-w-full mt-1"
                  :class="hasLevelTrait(trait.id) ? 'font-bold text-slate-100' : 'text-slate-400'"
                >
                  {{ $t(trait.nameKey) }}
                </span>
              </button>
            </div>

            <!-- Active Trait Parameter Sub-Sliders -->
            <div v-if="activeLevelConfig.traits && activeLevelConfig.traits.length > 0" class="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
              <!-- Fire Parameters -->
              <UiCard v-if="hasLevelTrait('fire')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-3 gap-2 border-orange-500/30 bg-orange-950/20">
                <div class="sm:col-span-3 flex items-center gap-1.5 text-[11px] font-bold text-orange-400">
                  <Flame class="w-3.5 h-3.5" />
                  <span>{{ $t('traits.fireName') }}</span>
                </div>
                <UiSlider 
                  :model-value="activeLevelConfig.fireBonusDamage ?? 5"
                  :label="$t('traits.fireBonusDamage')"
                  :min="1"
                  :max="200"
                  :step="1"
                  unit=" DMG"
                  @update:model-value="(val) => updateActiveLevel({ fireBonusDamage: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.burnDps ?? 4"
                  :label="$t('traits.burnDps')"
                  :min="1"
                  :max="100"
                  :step="1"
                  unit="/s"
                  @update:model-value="(val) => updateActiveLevel({ burnDps: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.burnDuration ?? 3.0"
                  :label="$t('traits.burnDuration')"
                  :min="0.5"
                  :max="10.0"
                  :step="0.5"
                  unit="s"
                  @update:model-value="(val) => updateActiveLevel({ burnDuration: val })"
                />
              </UiCard>

              <!-- Frost Parameters -->
              <UiCard v-if="hasLevelTrait('frost')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-3 gap-2 border-cyan-500/30 bg-cyan-950/20">
                <div class="sm:col-span-3 flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
                  <Snowflake class="w-3.5 h-3.5" />
                  <span>{{ $t('traits.frostName') }}</span>
                </div>
                <UiSlider 
                  :model-value="activeLevelConfig.frostBonusDamage ?? 2"
                  :label="$t('traits.frostBonusDamage')"
                  :min="0"
                  :max="100"
                  :step="1"
                  unit=" DMG"
                  @update:model-value="(val) => updateActiveLevel({ frostBonusDamage: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.slowPercent ?? 30"
                  :label="$t('traits.slowPercent')"
                  :min="5"
                  :max="80"
                  :step="5"
                  unit="%"
                  @update:model-value="(val) => updateActiveLevel({ slowPercent: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.slowDuration ?? 2.5"
                  :label="$t('traits.slowDuration')"
                  :min="0.5"
                  :max="10.0"
                  :step="0.5"
                  unit="s"
                  @update:model-value="(val) => updateActiveLevel({ slowDuration: val })"
                />
              </UiCard>

              <!-- Poison Parameters -->
              <UiCard v-if="hasLevelTrait('poison')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-3 gap-2 border-emerald-500/30 bg-emerald-950/20">
                <div class="sm:col-span-3 flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
                  <Skull class="w-3.5 h-3.5" />
                  <span>{{ $t('traits.poisonName') }}</span>
                </div>
                <UiSlider 
                  :model-value="activeLevelConfig.poisonDps ?? 6"
                  :label="$t('traits.poisonDps')"
                  :min="1"
                  :max="100"
                  :step="1"
                  unit="/s"
                  @update:model-value="(val) => updateActiveLevel({ poisonDps: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.poisonDuration ?? 4.0"
                  :label="$t('traits.poisonDuration')"
                  :min="1.0"
                  :max="15.0"
                  :step="0.5"
                  unit="s"
                  @update:model-value="(val) => updateActiveLevel({ poisonDuration: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.poisonSlowPercent ?? 10"
                  :label="$t('traits.poisonSlowPercent')"
                  :min="0"
                  :max="50"
                  :step="5"
                  unit="%"
                  @update:model-value="(val) => updateActiveLevel({ poisonSlowPercent: val })"
                />
              </UiCard>

              <!-- Stacking Ramp Parameters -->
              <UiCard v-if="hasLevelTrait('stacking')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-amber-500/30 bg-amber-950/20">
                <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-amber-400">
                  <TrendingUp class="w-3.5 h-3.5" />
                  <span>{{ $t('traits.stackingName') }}</span>
                </div>
                <UiSlider 
                  :model-value="activeLevelConfig.stackBonusDamage ?? 4"
                  :label="$t('traits.stackBonusDamage')"
                  :min="1"
                  :max="100"
                  :step="1"
                  unit=" DMG/hit"
                  @update:model-value="(val) => updateActiveLevel({ stackBonusDamage: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.maxStacks ?? 10"
                  :label="$t('traits.maxStacks')"
                  :min="2"
                  :max="50"
                  :step="1"
                  unit=" stacks"
                  @update:model-value="(val) => updateActiveLevel({ maxStacks: val })"
                />
              </UiCard>

              <!-- Blood Parameters -->
              <UiCard v-if="hasLevelTrait('blood')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-rose-500/30 bg-rose-950/20">
                <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-rose-400">
                  <Droplet class="w-3.5 h-3.5" />
                  <span>{{ $t('traits.bloodName') }}</span>
                </div>
                <UiSlider 
                  :model-value="activeLevelConfig.bleedDps ?? 7"
                  :label="$t('traits.bleedDps')"
                  :min="1"
                  :max="120"
                  :step="1"
                  unit="/s"
                  @update:model-value="(val) => updateActiveLevel({ bleedDps: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.bleedDuration ?? 3.5"
                  :label="$t('traits.bleedDuration')"
                  :min="1.0"
                  :max="10.0"
                  :step="0.5"
                  unit="s"
                  @update:model-value="(val) => updateActiveLevel({ bleedDuration: val })"
                />
              </UiCard>

              <!-- Electric Parameters -->
              <UiCard v-if="hasLevelTrait('electric')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-sky-500/30 bg-sky-950/20">
                <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-400">
                  <Zap class="w-3.5 h-3.5" />
                  <span>{{ $t('traits.electricName') }}</span>
                </div>
                <UiSlider 
                  :model-value="activeLevelConfig.electricBonusDamage ?? 6"
                  :label="$t('traits.electricBonusDamage')"
                  :min="1"
                  :max="150"
                  :step="1"
                  unit=" DMG"
                  @update:model-value="(val) => updateActiveLevel({ electricBonusDamage: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.stunDuration ?? 0.3"
                  :label="$t('traits.stunDuration')"
                  :min="0.1"
                  :max="2.0"
                  :step="0.1"
                  unit="s"
                  @update:model-value="(val) => updateActiveLevel({ stunDuration: val })"
                />
              </UiCard>

              <!-- Void Parameters -->
              <UiCard v-if="hasLevelTrait('void')" variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-2 border-purple-500/30 bg-purple-950/20">
                <div class="sm:col-span-2 flex items-center gap-1.5 text-[11px] font-bold text-purple-400">
                  <Ghost class="w-3.5 h-3.5" />
                  <span>{{ $t('traits.voidName') }}</span>
                </div>
                <UiSlider 
                  :model-value="activeLevelConfig.voidVulnPercent ?? 25"
                  :label="$t('traits.voidVulnPercent')"
                  :min="5"
                  :max="100"
                  :step="5"
                  unit="%"
                  @update:model-value="(val) => updateActiveLevel({ voidVulnPercent: val })"
                />
                <UiSlider 
                  :model-value="activeLevelConfig.voidDuration ?? 4.0"
                  :label="$t('traits.voidDuration')"
                  :min="1.0"
                  :max="15.0"
                  :step="0.5"
                  unit="s"
                  @update:model-value="(val) => updateActiveLevel({ voidDuration: val })"
                />
              </UiCard>
            </div>
          </div>

          <!-- Apply To Placed Towers Button -->
          <UiButton 
            variant="primary"
            size="md"
            block
            :leading-icon="Sparkles"
            custom-class="mt-auto"
            @click="handleApplySelectedBp()"
          >
            {{ $t('config.applyToAllTowers') }}
          </UiButton>
        </UiCard>

      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- TAB 2: WAVES CONFIGURATOR                                                 -->
    <!-- ========================================================================= -->
    <div v-else-if="toolStore.gameConfigActiveTab === 'waves'" class="flex flex-col gap-3">
      
      <!-- Top Wave Tabs Row + Add Wave Button -->
      <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800/80 shrink-0">
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          <UiButton 
            v-for="(w, idx) in characterStore.waveConfigs" 
            :key="w.waveNumber"
            :variant="characterStore.currentWaveIndex === idx ? 'primary' : 'secondary'"
            size="sm"
            @click="characterStore.selectWave(idx)"
          >
            <span class="font-bold font-mono">{{ idx + 1 }}</span>
            <UiBadge variant="brand" size="xs" custom-class="ml-1">{{ w.unitCount }}x</UiBadge>
          </UiButton>
        </div>

        <UiButton 
          variant="primary"
          size="sm"
          :leading-icon="Plus"
          custom-class="ml-auto"
          @click="characterStore.addNewWave()"
        >
          {{ $t('config.newWave') }}
        </UiButton>
      </div>

      <!-- No Waves State -->
      <UiCard 
        v-if="characterStore.waveConfigs.length === 0" 
        variant="subtle"
        padding="lg"
        custom-class="flex flex-col items-center text-center gap-3 my-4"
      >
        <div class="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
          <Swords class="w-6 h-6" />
        </div>
        <div class="flex flex-col gap-1 max-w-md">
          <span class="font-bold text-sm text-purple-300">{{ $t('config.noWaves') }}</span>
          <span class="text-xs text-slate-400">{{ $t('config.noWavesDesc') }}</span>
        </div>
        <UiButton 
          variant="primary"
          size="md"
          :leading-icon="Plus"
          @click="characterStore.addNewWave()"
        >
          {{ $t('config.createWave1') }}
        </UiButton>
      </UiCard>

      <!-- Active Selected Wave Editor Layout (Split Columns) -->
      <div v-else-if="selectedWave" class="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
        
        <!-- Left Column (1 col): Character Model & Live Animation Preview -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-2.5">

          <!-- Live Character Animation Simulator -->
          <CharacterLivePreview 
            :model-value="selectedWave.characterModel || 'male'" 
            :anim-speed="selectedWave.animSpeed || 1.0"
            :offset-y="selectedWave.offsetY || 0"
            :unit-scale="selectedWave.unitScale || 1.0"
            :unit-variant="selectedWave.unitVariant || 'normal'"
            :variant-tint="selectedWave.variantTint"
            :show-model-selector="false"
          />

          <!-- Elemental Variant Quick Selector -->
          <div class="flex flex-col gap-1.5 pt-1 border-t border-slate-800">
            <div class="flex items-center justify-between">
              <span class="text-[11px] font-semibold text-slate-300">{{ $t('config.unitVariant') }}</span>
              <span class="text-[10px] font-bold" :style="{ color: getVariantDef(selectedWave.unitVariant).color }">
                {{ $t(getVariantDef(selectedWave.unitVariant).nameKey) }}
              </span>
            </div>

            <div class="grid grid-cols-4 gap-1">
              <button
                v-for="v in UNIT_VARIANTS"
                :key="v.id"
                type="button"
                @click="characterStore.setWaveUnitVariant(v.id)"
                :title="$t(v.nameKey) + ' - ' + $t(v.descKey)"
                class="flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all cursor-pointer select-none group"
                :class="(selectedWave.unitVariant || 'normal') === v.id
                  ? 'ring-1 ring-white/40 shadow-sm scale-102 ' + v.bgClass + ' ' + v.borderClass
                  : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-400'"
              >
                <component 
                  :is="getVariantIcon(v.icon)" 
                  class="w-3.5 h-3.5 transition-transform group-hover:scale-110"
                  :style="{ color: v.color }"
                />
                <span 
                  class="text-[9px] font-medium truncate max-w-full mt-0.5"
                  :class="(selectedWave.unitVariant || 'normal') === v.id ? 'font-bold text-slate-100' : 'text-slate-400'"
                >
                  {{ $t(v.nameKey) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Action Button: Change Unit Appearance -->
          <UiButton 
            variant="primary"
            size="sm"
            block
            :leading-icon="Users"
            custom-class="mt-auto shadow-md shadow-purple-900/30"
            @click="openChangeUnitModal()"
          >
            {{ $t('config.changeUnitAppearance') }}
          </UiButton>
        </UiCard>

        <!-- Right Column (2 cols): Parameters & Wave Difficulty -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3 lg:col-span-2">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="font-bold text-purple-300 text-sm">{{ $t('config.waveSettings', { num: characterStore.currentWaveIndex + 1 }) }}</span>
              <UiBadge variant="emerald" size="xs">{{ $t('config.enemiesCount', { count: selectedWave.unitCount }) }}</UiBadge>
            </div>

            <UiButton 
              v-if="characterStore.waveConfigs.length > 1"
              variant="danger"
              size="xs"
              :leading-icon="Trash2"
              @click="characterStore.deleteWave(characterStore.currentWaveIndex)"
            >
              {{ $t('config.deleteWave') }}
            </UiButton>
          </div>

          <!-- Parameters Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <!-- 1. Unit Count -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.unitCount"
                :label="$t('config.enemiesCountLabel')"
                :min="1"
                :max="100"
                :step="1"
                unit=" units"
                @update:model-value="(val) => characterStore.setWaveUnitCount(val || 1)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.enemiesCountDesc') }}</span>
            </UiCard>

            <!-- 2. HP (Health) -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.unitHp"
                :label="$t('config.healthHp')"
                :min="20"
                :max="5000"
                :step="10"
                unit=" HP"
                @update:model-value="(val) => characterStore.setWaveUnitHp(val || 20)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.healthHpDesc') }}</span>
            </UiCard>

            <!-- 3. Movement Speed -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.unitSpeed"
                :label="$t('config.moveSpeed')"
                :min="0.5"
                :max="5.0"
                :step="0.1"
                unit=" c/s"
                @update:model-value="(val) => characterStore.setWaveSpeed(val || 1.0)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.moveSpeedDesc') }}</span>
            </UiCard>

            <!-- 4. Unit Bonus (Kill Bounty) -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.unitBonus ?? selectedWave.goldReward ?? 1"
                :label="$t('config.unitBonus')"
                :min="0"
                :max="50"
                :step="1"
                unit=" gold"
                @update:model-value="(val) => characterStore.setWaveUnitBonus(val ?? 1)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.unitBonusDesc') }}</span>
            </UiCard>

            <!-- 5. End Wave Bonus (Clear Reward) -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.endWaveBonus ?? 50"
                :label="$t('config.endWaveBonus')"
                :min="0"
                :max="500"
                :step="5"
                unit=" gold"
                @update:model-value="(val) => characterStore.setWaveEndBonus(val ?? 50)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.endWaveBonusDesc') }}</span>
            </UiCard>

            <!-- 5. Animation Playback Speed -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.animSpeed || 1.0"
                :label="$t('config.animSpeed')"
                :min="0.5"
                :max="3.0"
                :step="0.1"
                unit="x"
                @update:model-value="(val) => characterStore.setWaveAnimSpeed(val || 1.0)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.animSpeedDesc') }}</span>
            </UiCard>

            <!-- 6. Height / Elevation Offset -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.offsetY || 0"
                :label="$t('config.elevationOffset')"
                :min="-20"
                :max="40"
                :step="1"
                unit="px"
                @update:model-value="(val) => characterStore.setWaveOffsetY(val || 0)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.elevationOffsetDesc') }}</span>
            </UiCard>

            <!-- 7. Unit Scale -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.unitScale || 1.0"
                :label="$t('config.unitScale')"
                :min="0.5"
                :max="3.0"
                :step="0.05"
                unit="x"
                @update:model-value="(val) => characterStore.setWaveUnitScale(val || 1.0)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.unitScaleDesc') }}</span>
            </UiCard>
          </div>

          <!-- Wave Unit Immunities Section -->
          <div class="flex flex-col gap-2 p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <div class="flex items-center justify-between flex-wrap gap-1.5 pb-1 border-b border-slate-800">
              <div class="flex items-center gap-1.5">
                <Shield class="w-4 h-4 text-purple-400" />
                <span class="text-xs font-bold text-slate-200">{{ $t('immunities.title') }}</span>
              </div>
              <UiBadge 
                :variant="(selectedWave.immunities && selectedWave.immunities.length > 0) ? 'brand' : 'slate'" 
                size="xs"
              >
                {{ (selectedWave.immunities && selectedWave.immunities.length > 0) ? `${selectedWave.immunities.length} immunities` : $t('immunities.none') }}
              </UiBadge>
            </div>
            <p class="text-[10px] text-slate-400 leading-tight">
              {{ $t('immunities.desc') }}
            </p>

            <!-- Immunities Toggle Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
              <button
                v-for="trait in TOWER_TRAITS"
                :key="trait.id"
                type="button"
                @click="toggleWaveImmunity(trait.id)"
                :title="$t(trait.descKey)"
                class="flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer select-none group"
                :class="hasWaveImmunity(trait.id)
                  ? 'ring-1 ring-white/40 shadow-sm scale-102 ' + trait.bgClass + ' ' + trait.borderClass
                  : 'bg-slate-950/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-400'"
              >
                <component 
                  :is="trait.icon" 
                  class="w-4 h-4 transition-transform group-hover:scale-110"
                  :style="{ color: hasWaveImmunity(trait.id) ? trait.color : '#94a3b8' }"
                />
                <span 
                  class="text-[10px] font-medium truncate max-w-full mt-1"
                  :class="hasWaveImmunity(trait.id) ? 'font-bold text-slate-100' : 'text-slate-400'"
                >
                  {{ $t(trait.nameKey) }}
                </span>
                <span v-if="hasWaveImmunity(trait.id)" class="text-[8px] font-bold text-purple-300 uppercase tracking-wider mt-0.5">
                  {{ $t('immunities.resist') }}
                </span>
              </button>
            </div>
          </div>

          <!-- Formation & March Settings -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 mt-auto">
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold text-slate-300">{{ $t('config.marchFormation') }}</span>
              <UiTabs 
                v-model="characterStore.formation"
                :items="formationOptions"
                fill
                size="sm"
              />
            </div>

            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                v-model="characterStore.pairDistance"
                :label="$t('config.unitSpacing')"
                :min="0.1"
                :max="1.5"
                :step="0.05"
                unit="k"
              />
              <span class="text-[10px] text-slate-500 block mt-1">{{ $t('config.unitSpacingDesc') }}</span>
            </UiCard>
          </div>
        </UiCard>

      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- TAB 3: MAP TD BALANCE & ECONOMY                                           -->
    <!-- ========================================================================= -->
    <div v-else-if="toolStore.gameConfigActiveTab === 'balance'" class="flex flex-col gap-4">
      <UiCard variant="amber" padding="sm" custom-class="flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold shadow-inner">
            <Coins class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-slate-100 text-xs sm:text-sm">{{ $t('config.mapEconomy') }}</h3>
            <p class="text-[11px] text-slate-400">{{ $t('config.mapEconomyDesc') }}</p>
          </div>
        </div>
        <UiBadge variant="amber" size="sm" class="flex items-center gap-1">
          <MapPin class="w-3.5 h-3.5" />
          <span>{{ mapStore.project.name || 'Map' }}</span>
        </UiBadge>
      </UiCard>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <!-- 1. Starting Gold -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Coins class="w-4 h-4 text-yellow-400" />
              {{ $t('config.startingGold') }}
            </span>
            <UiBadge variant="amber" size="sm">{{ characterStore.startingGold }} gold</UiBadge>
          </div>
          <p class="text-[11px] text-slate-400 leading-tight">
            {{ $t('config.startingGoldDesc') }}
          </p>
          <UiSlider 
            v-model="characterStore.startingGold"
            :min="10"
            :max="1000"
            :step="10"
            unit=" gold"
          />
          <div class="flex items-center gap-1.5 flex-wrap">
            <UiButton 
              v-for="preset in [50, 100, 150, 250, 500, 1000]"
              :key="preset"
              :variant="characterStore.startingGold === preset ? 'game-amber' : 'secondary'"
              size="xs"
              @click="characterStore.startingGold = preset"
            >
              {{ preset }}
            </UiButton>
          </div>
        </UiCard>

        <!-- 2. Starting Lives -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Heart class="w-4 h-4 text-rose-400" />
              {{ $t('config.baseLives') }}
            </span>
            <UiBadge variant="rose" size="sm">{{ characterStore.startingLives }} lives</UiBadge>
          </div>
          <p class="text-[11px] text-slate-400 leading-tight">
            {{ $t('config.baseLivesDesc') }}
          </p>
          <UiSlider 
            v-model="characterStore.startingLives"
            :min="1"
            :max="100"
            :step="1"
            unit=" lives"
          />
          <div class="flex items-center gap-1.5 flex-wrap">
            <UiButton 
              v-for="preset in [5, 10, 20, 50, 100]"
              :key="preset"
              :variant="characterStore.startingLives === preset ? 'danger' : 'secondary'"
              size="xs"
              @click="characterStore.startingLives = preset"
            >
              {{ preset }}
            </UiButton>
          </div>
        </UiCard>

        <!-- 3. Wave Prep Timer -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Timer class="w-4 h-4 text-indigo-400" />
              {{ $t('config.wavePrepTimer') }}
            </span>
            <UiBadge variant="brand" size="sm">{{ characterStore.wavePrepDuration }}s</UiBadge>
          </div>
          <p class="text-[11px] text-slate-400 leading-tight">
            {{ $t('config.wavePrepTimerDesc') }}
          </p>
          <UiSlider 
            v-model="characterStore.wavePrepDuration"
            :min="3"
            :max="60"
            :step="1"
            unit="s"
          />
          <div class="flex items-center gap-1.5 flex-wrap">
            <UiButton 
              v-for="preset in [5, 10, 15, 20, 30]"
              :key="preset"
              :variant="characterStore.wavePrepDuration === preset ? 'primary' : 'secondary'"
              size="xs"
              @click="characterStore.wavePrepDuration = preset"
            >
              {{ preset }}s
            </UiButton>
          </div>
        </UiCard>
      </div>

      <!-- Summary & Balance Info Card -->
      <UiCard variant="subtle" padding="md" custom-class="flex flex-col gap-2 text-xs text-slate-300">
        <div class="font-bold text-slate-200 flex items-center gap-2">
          <Sparkles class="w-4 h-4 text-amber-400" />
          <span>{{ $t('config.aboutDefenseBalance') }}</span>
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          {{ $t('config.aboutDefenseBalanceDesc', { code: '.isomap.json' }) }}
        </p>
      </UiCard>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 4: SPAWN POINTS                                                       -->
    <!-- ========================================================================= -->
    <div v-else-if="toolStore.gameConfigActiveTab === 'spawns'" class="flex flex-col gap-3">
      
      <!-- Top Overview Bar -->
      <UiCard variant="emerald" padding="sm" custom-class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold shadow-inner">
            <MapPin class="w-5 h-5" />
          </div>
          <div>
            <h3 class="font-bold text-slate-100 text-xs sm:text-sm">{{ $t('config.enemySpawnPoints') }}</h3>
            <p class="text-[11px] text-slate-400">{{ $t('config.enemySpawnPointsDesc') }}</p>
          </div>
        </div>

        <UiBadge variant="emerald" size="sm">
          {{ $t('config.doorsCount', { count: characterStore.detectedDoors.length }) }}
        </UiBadge>
      </UiCard>

      <!-- Empty State for Spawn Points -->
      <UiCard 
        v-if="characterStore.detectedDoors.length === 0" 
        variant="subtle"
        padding="lg"
        custom-class="text-center flex flex-col items-center gap-3 my-2"
      >
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <MapPin class="w-6 h-6" />
        </div>
        <div class="flex flex-col gap-1 max-w-md">
          <span class="font-bold text-sm text-emerald-300">{{ $t('config.noSpawnPoints') }}</span>
          <p class="text-xs text-slate-400 leading-tight">{{ $t('config.noSpawnPointsDesc') }}</p>
        </div>
        <UiButton 
          variant="game-green"
          size="md"
          :leading-icon="Plus"
          @click="handleTriggerAddSpawnPoint"
        >
          {{ $t('config.placeFirstSpawn') }}
        </UiButton>
      </UiCard>

      <!-- Active Spawn Points Section -->
      <div v-else class="flex flex-col gap-3">
        <!-- Spawn Doors Buttons List -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <MapPin class="w-4 h-4 text-emerald-400" />
              <span>{{ $t('config.selectSpawnDoor') }}</span>
            </span>

            <UiButton 
              variant="game-amber"
              size="xs"
              :leading-icon="Plus"
              @click="handleTriggerAddSpawnPoint"
            >
              {{ $t('config.placeNewDoor') }}
            </UiButton>
          </div>

          <!-- Door Buttons Grid -->
          <div class="flex items-center gap-2 flex-wrap">
            <UiButton 
              v-for="(door, idx) in characterStore.detectedDoors" 
              :key="door.id || idx"
              :variant="characterStore.selectedDoorIndex === idx ? 'game-amber' : 'secondary'"
              size="sm"
              :leading-icon="Flag"
              @click="characterStore.selectedDoorIndex = idx"
            >
              <span>{{ door.name }} ({{ door.col }}, {{ door.row }})</span>
            </UiButton>
          </div>

          <!-- Selected Door Action Toolbar -->
          <div 
            v-if="characterStore.selectedDoor" 
            class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 flex-wrap"
          >
            <div class="flex items-center gap-2 text-xs">
              <UiBadge variant="amber" size="xs">{{ $t('config.activeDoor', { name: characterStore.selectedDoor.name }) }}</UiBadge>
              <span class="text-slate-400 font-mono text-[11px]">Cell: [{{ characterStore.selectedDoor.col }}, {{ characterStore.selectedDoor.row }}]</span>
            </div>

            <div class="flex items-center gap-1.5">
              <UiButton 
                variant="secondary"
                size="xs"
                :leading-icon="MapPin"
                @click="handleTriggerRelocateSpawnPoint"
              >
                {{ $t('config.relocateDoor') }}
              </UiButton>

              <UiButton 
                variant="danger"
                size="xs"
                :leading-icon="Trash2"
                @click="characterStore.removeSpawnPoint(characterStore.selectedDoorIndex ?? 0)"
              >
                {{ $t('config.deleteDoor') }}
              </UiButton>
            </div>
          </div>
        </UiCard>

        <!-- Spawn Mode & Custom Route Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Spawn Mode Selection -->
          <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2">
            <span class="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Sparkles class="w-3.5 h-3.5 text-brand-400" />
              <span>{{ $t('config.spawnDistributionMode') }}</span>
            </span>
            <UiTabs 
              v-model="characterStore.spawnMode"
              :items="spawnModeOptions"
              fill
              size="sm"
            />
          </UiCard>

          <!-- Custom Route Waypoints -->
          <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2">
            <span class="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Navigation class="w-3.5 h-3.5 text-brand-400" />
              <span>{{ $t('config.customRouteWaypoints') }}</span>
            </span>

            <div class="grid grid-cols-2 gap-2">
              <UiButton 
                variant="primary"
                size="sm"
                :leading-icon="PenTool"
                @click="handleStartDrawingRoute"
              >
                {{ $t('config.drawRoute') }}
              </UiButton>

              <UiButton 
                variant="secondary"
                size="sm"
                :leading-icon="RotateCcw"
                @click="characterStore.deleteCurrentRoute()"
              >
                {{ $t('config.clearRoute') }}
              </UiButton>
            </div>
          </UiCard>
        </div>

      </div>

    </div>
  </UiModal>

  <!-- SELECT TOWER SPRITE MODAL (Triggered by Pencil / Change Sprite) -->
  <UiModal
    :is-open="isChangeSpriteModalOpen"
    :title="$t('config.selectTowerSprite')"
    :subtitle="$t('config.selectTowerSpriteSubtitle')"
    :icon="Image"
    icon-color="amber"
    size="4xl"
    @close="isChangeSpriteModalOpen = false"
  >
    <div class="flex flex-col gap-3.5 select-none">
      <!-- Search & Category Filters -->
      <div class="flex items-center gap-2 flex-wrap justify-between">
        <UiInput 
          v-model="spriteModalSearchQuery"
          size="sm"
          :placeholder="$t('config.searchSpritesPlaceholder')"
          :leading-icon="Search"
          clearable
          custom-class="w-full sm:w-72"
        />

        <UiTabs
          v-model="selectedSpriteCategory"
          :items="spriteCategories"
          size="xs"
          variant="amber"
        />
      </div>

      <!-- Preview & Sprites Grid -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        <!-- Left: Selected Sprite Detail Preview Box -->
        <div class="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-950 border border-slate-800 checker-pattern h-56 relative overflow-hidden shadow-inner">
          <img
            v-if="tempSelectedAsset"
            :src="assetStore.getAssetPreview(tempSelectedAsset)"
            :alt="tempSelectedAsset.name"
            class="w-full h-full object-contain filter drop-shadow-xl"
          />
          <div v-else class="text-slate-500 text-xs font-mono text-center">
            {{ $t('config.noSpriteSelected') }}
          </div>
          <div v-if="tempSelectedAsset" class="absolute bottom-2 inset-x-2 px-2.5 py-1 rounded-xl bg-slate-900/95 border border-slate-700 text-center shadow-md">
            <span class="text-xs font-bold text-amber-300 truncate block">{{ tempSelectedAsset.name }}</span>
          </div>
        </div>

        <!-- Right: Spacious Sprites Grid -->
        <div class="md:col-span-8 max-h-60 overflow-y-auto custom-scrollbar p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
            <div
              v-for="asset in filteredModalAssets"
              :key="asset.id"
              @click="tempSelectedAssetId = asset.id"
              :class="tempSelectedAssetId === asset.id
                ? 'ring-2 ring-amber-400 bg-amber-500/30 border-amber-400 scale-105'
                : 'hover:bg-slate-800/80 bg-slate-950/80 border border-slate-800/80'"
              class="aspect-square p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all overflow-hidden group select-none"
              :title="asset.name"
            >
              <img
                :src="assetStore.getAssetPreview(asset)"
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

      <!-- Modal Actions Footer -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
        <UiButton
          variant="secondary"
          size="md"
          @click="isChangeSpriteModalOpen = false"
        >
          {{ $t('common.cancel') }}
        </UiButton>

        <UiButton
          variant="primary"
          size="md"
          :disabled="!tempSelectedAsset"
          :leading-icon="Check"
          @click="saveSpriteSelection()"
        >
          {{ $t('common.save') }}
        </UiButton>
      </div>
    </div>
  </UiModal>

  <!-- SELECT WAVE UNIT MODEL GALLERY MODAL -->
  <UiModal
    :is-open="isChangeUnitModalOpen"
    :title="$t('config.selectWaveUnit')"
    :subtitle="$t('config.selectWaveUnitSubtitle')"
    :icon="Users"
    icon-color="brand"
    size="4xl"
    @close="isChangeUnitModalOpen = false"
  >
    <div class="flex flex-col gap-3.5 select-none">
      <!-- Top Info Bar -->
      <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-300">{{ $t('config.availableUnits') }}</span>
          <UiBadge variant="brand" size="xs">{{ $t('config.modelsCount', { count: availableCharacterModels.length }) }}</UiBadge>
        </div>
        <div class="text-[11px] text-slate-400">
          {{ $t('config.customizingUnit', { name: selectedWave?.name || '' }) }}
        </div>
      </div>

      <!-- Main Gallery Layout: Left Grid of Models + Right Live Test Simulator -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        <!-- Left: Character Models Cards (5 cols) -->
        <div class="lg:col-span-5 flex flex-col gap-2.5 max-h-96 overflow-y-auto custom-scrollbar p-1">
          <div
            v-for="model in availableCharacterModels"
            :key="model.id"
            @click="tempSelectedUnitModel = model.id"
            :class="tempSelectedUnitModel === model.id
              ? 'ring-2 ring-purple-500 bg-purple-950/40 border-purple-500/80 shadow-lg shadow-purple-950/50 scale-[1.01]'
              : 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800'"
            class="p-3 rounded-2xl cursor-pointer transition-all flex items-center justify-between gap-3 group relative overflow-hidden"
          >
            <!-- Left Info & Icon -->
            <div class="flex items-center gap-3">
              <div 
                class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                :class="tempSelectedUnitModel === model.id ? 'bg-purple-600/30 border border-purple-500/50 shadow-inner text-purple-300' : 'bg-slate-950 border border-slate-800 group-hover:border-slate-700 text-slate-400'"
              >
              </div>
              
              <div class="flex flex-col">
                <span class="font-bold text-sm text-slate-100 capitalize flex items-center gap-1.5">
                  {{ model.name }}
                  <UiBadge v-if="selectedWave?.characterModel === model.id" variant="brand" size="xs">{{ $t('config.currentBadge') }}</UiBadge>
                </span>
                <span class="text-[11px] text-slate-400">
                  {{ $t('config.animationsCount', { count: Object.keys(model.actions || {}).length }) }}
                </span>
              </div>
            </div>

            <!-- Right Checkmark when selected -->
            <div 
              class="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
              :class="tempSelectedUnitModel === model.id ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800 text-transparent'"
            >
              <Check class="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        <!-- Right: Live Interactive Animation Tester & Compass (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-2 bg-slate-900/60 rounded-2xl border border-slate-800 p-2.5">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800 flex-wrap gap-1.5">
            <span class="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <span>{{ $t('config.liveTestUnit', { name: getUnitModelDisplayName(tempSelectedUnitModel) }) }}</span>
            </span>
            <div class="flex items-center gap-1.5">
              <UiBadge 
                size="xs" 
                :custom-class="getVariantDef(tempSelectedVariant).bgClass + ' ' + getVariantDef(tempSelectedVariant).borderClass + ' ' + getVariantDef(tempSelectedVariant).textClass + ' border'"
              >
                {{ $t(getVariantDef(tempSelectedVariant).nameKey) }}
              </UiBadge>
              <UiBadge variant="brand" size="xs">{{ $t('config.interactiveTest') }}</UiBadge>
            </div>
          </div>

          <!-- Elemental Variant Selector Pills inside Modal -->
          <div class="flex flex-col gap-1 p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{{ $t('config.unitVariant') }}</span>
              <span class="text-[10px] font-bold" :style="{ color: getVariantDef(tempSelectedVariant).color }">
                {{ $t(getVariantDef(tempSelectedVariant).nameKey) }}
              </span>
            </div>
            <div class="grid grid-cols-4 sm:grid-cols-8 gap-1">
              <button
                v-for="v in UNIT_VARIANTS"
                :key="v.id"
                type="button"
                @click="tempSelectedVariant = v.id"
                :title="$t(v.nameKey) + ' - ' + $t(v.descKey)"
                class="flex flex-col items-center justify-center py-1.5 px-1 rounded-xl border transition-all cursor-pointer select-none group"
                :class="tempSelectedVariant === v.id
                  ? 'ring-1 ring-white/40 shadow-sm scale-102 ' + v.bgClass + ' ' + v.borderClass
                  : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800/80 text-slate-400'"
              >
                <component 
                  :is="getVariantIcon(v.icon)" 
                  class="w-3.5 h-3.5 transition-transform group-hover:scale-110"
                  :style="{ color: v.color }"
                />
                <span 
                  class="text-[9px] font-medium truncate max-w-full mt-0.5"
                  :class="tempSelectedVariant === v.id ? 'font-bold text-slate-100' : 'text-slate-400'"
                >
                  {{ $t(v.nameKey) }}
                </span>
              </button>
            </div>
          </div>

          <CharacterLivePreview
            :model-value="tempSelectedUnitModel"
            :anim-speed="selectedWave?.animSpeed || 1.0"
            :offset-y="selectedWave?.offsetY || 0"
            :unit-scale="selectedWave?.unitScale || 1.0"
            :unit-variant="tempSelectedVariant"
            :variant-tint="selectedWave?.variantTint"
            :show-model-selector="false"
          />
        </div>

      </div>

      <!-- Modal Footer Buttons -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
        <UiButton
          variant="secondary"
          size="md"
          @click="isChangeUnitModalOpen = false"
        >
          {{ $t('common.cancel') }}
        </UiButton>

        <UiButton
          variant="primary"
          size="md"
          :leading-icon="Check"
          @click="saveUnitSelection()"
        >
          {{ $t('config.saveApplyUnit') }}
        </UiButton>
      </div>

    </div>
  </UiModal>

  <!-- ========================================================================= -->
  <!-- EDIT / CREATE CLAN MODAL                                                  -->
  <!-- ========================================================================= -->
  <UiModal
    :is-open="isClanModalOpen"
    :title="isNewClanMode ? $t('clans.newClan') : $t('clans.editClan')"
    :icon="Swords"
    icon-color="amber"
    size="md"
    @close="isClanModalOpen = false"
  >
    <div class="flex flex-col gap-3.5 select-none">
      <UiInput
        v-model="clanForm.name"
        :label="$t('clans.clanName')"
        :placeholder="$t('clans.clanNamePlaceholder')"
      />

      <UiInput
        v-model="clanForm.description"
        :label="$t('clans.clanDescription')"
        :placeholder="$t('clans.clanDescPlaceholder')"
      />

      <!-- Icon Selector -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-slate-300">{{ $t('clans.clanIcon') }}</label>
        <div class="grid grid-cols-5 sm:grid-cols-8 gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 max-h-36 overflow-y-auto custom-scrollbar">
          <button
            v-for="iconItem in CLAN_AVAILABLE_ICONS"
            :key="iconItem.id"
            :class="[
              'w-9 h-9 rounded-xl flex items-center justify-center border transition-all cursor-pointer',
              clanForm.iconName === iconItem.id
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 ring-2 ring-amber-400/40'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            :title="iconItem.name"
            @click="clanForm.iconName = iconItem.id"
          >
            <component :is="iconItem.icon" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Color Selector -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-slate-300">{{ $t('clans.clanColor') }}</label>
        <div class="flex items-center gap-2 flex-wrap p-2 rounded-xl bg-slate-900 border border-slate-800">
          <button
            v-for="colorItem in CLAN_AVAILABLE_COLORS"
            :key="colorItem.id"
            :class="[
              'w-7 h-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center',
              clanForm.color === colorItem.id
                ? 'border-white scale-110 shadow-lg'
                : 'border-transparent hover:scale-105'
            ]"
            :style="{ backgroundColor: colorItem.id }"
            :title="colorItem.name"
            @click="clanForm.color = colorItem.id"
          >
            <Check v-if="clanForm.color === colorItem.id" class="w-3.5 h-3.5 text-slate-950 font-black" />
          </button>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
        <UiButton variant="secondary" size="sm" @click="isClanModalOpen = false">
          {{ $t('common.cancel') }}
        </UiButton>
        <UiButton variant="game-amber" size="sm" :leading-icon="Check" @click="saveClanForm">
          {{ $t('common.save') }}
        </UiButton>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Gamepad2, X, ShieldAlert, Swords, TowerControl, Users, 
  Plus, Sparkles, Trash2, Crosshair, Play, Pause, RotateCcw, 
  MapPin, Navigation, PenTool, Activity, User, Coins, Heart, Timer,
  Search, Pencil, Check, Image, Flag, Wand2, Skull, Shield, Flame,
  ArrowRight, Zap, CircleDot, Snowflake, Radio, Rocket, Ghost, Droplet, Crown,
  TrendingDown, TrendingUp, Equal
} from 'lucide-vue-next'
import { 
  UiModal, 
  UiTabs, 
  UiButton, 
  UiIconButton, 
  UiInput, 
  UiNumberInput, 
  UiSlider, 
  UiSwitch, 
  UiCard, 
  UiBadge, 
  TabItem 
} from './ui'
import { useToolStore } from '../stores/toolStore'
import { useTowerStore } from '../stores/towerStore'
import { useCharacterStore } from '../stores/characterStore'
import { useAssetStore } from '../stores/assetStore'
import { useMapStore } from '../stores/mapStore'
import { AssetItem, UnitVariantType, TowerTraitType, TowerClan, TowerLevelConfig } from '../types/map'
import { UNIT_VARIANTS, UnitVariantDef, getVariantDef } from '../utils/unitVariants'
import { TOWER_TRAITS, TowerTraitDef, getTraitDef } from '../utils/towerTraits'
import { getClanIcon, CLAN_AVAILABLE_ICONS, CLAN_AVAILABLE_COLORS } from '../utils/towerClans'
import { requestAppFullscreen } from '../utils/fullscreen'
import TowerLivePreview from './game/TowerLivePreview.vue'
import CharacterLivePreview from './game/CharacterLivePreview.vue'
import characterManifest from '../assets/generated/characterManifest.json'
import { useI18n } from '../stores/i18nStore'
import { sanitizeMapId } from '../services/mapManager'

const router = useRouter()
const toolStore = useToolStore()
const towerStore = useTowerStore()
const characterStore = useCharacterStore()
const assetStore = useAssetStore()
const mapStore = useMapStore()
const { t } = useI18n()

// Clan Management state
const isClanModalOpen = ref(false)
const isNewClanMode = ref(false)
const clanForm = ref<{
  id: string
  name: string
  description: string
  iconName: string
  color: string
}>({
  id: '',
  name: '',
  description: '',
  iconName: 'Castle',
  color: '#38bdf8',
})

const activeEditorClan = computed(() => towerStore.selectedEditorClan)

function getClanTowerCount(clanId: string): number {
  return towerStore.blueprints.filter(bp => {
    if (bp.clanId) return bp.clanId === clanId
    return clanId === towerStore.clans[0]?.id
  }).length
}

function openCreateClanModal() {
  isNewClanMode.value = true
  clanForm.value = {
    id: `clan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    description: '',
    iconName: 'Castle',
    color: '#38bdf8',
  }
  isClanModalOpen.value = true
}

function openEditClanModal(clan: TowerClan) {
  isNewClanMode.value = false
  clanForm.value = {
    id: clan.id,
    name: clan.name,
    description: clan.description || '',
    iconName: clan.iconName || 'Castle',
    color: clan.color || '#38bdf8',
  }
  isClanModalOpen.value = true
}

function saveClanForm() {
  const name = clanForm.value.name.trim() || (isNewClanMode.value ? 'New Clan' : 'Clan')
  const payload = {
    id: clanForm.value.id,
    name,
    description: clanForm.value.description,
    iconName: clanForm.value.iconName,
    color: clanForm.value.color,
  }
  if (isNewClanMode.value) {
    towerStore.createClan(payload)
  } else if (clanForm.value.id) {
    towerStore.updateClan(clanForm.value.id, payload)
  }
  isClanModalOpen.value = false
}

function confirmDeleteClan(clanId: string) {
  if (towerStore.clans.length <= 1) return
  if (window.confirm(t('clans.deleteClanConfirm'))) {
    towerStore.deleteClan(clanId)
  }
}

function openCreateTowerModal() {
  towerStore.isCreateTowerModalOpen = true
}

const variantIconMap: Record<string, any> = {
  Shield,
  Flame,
  Snowflake,
  Skull,
  Ghost,
  Zap,
  Droplet,
  Crown
}

function getVariantIcon(iconName: string) {
  return variantIconMap[iconName] || Shield
}

const configTabItems = computed<TabItem[]>(() => [
  { id: 'towers', label: t('clans.title') || 'Clans & Towers', icon: Swords, count: towerStore.clans.length },
  { id: 'waves', label: t('config.tabWaves') || 'Waves', icon: ShieldAlert, count: characterStore.waveConfigs.length },
  { id: 'balance', label: t('config.tabRules') || 'Map Balance', icon: Coins },
  { id: 'spawns', label: t('config.tabRoutes') || 'Spawn Points', icon: MapPin, count: characterStore.detectedDoors.length },
])

const selectedBp = computed(() => towerStore.selectedBlueprint)
const selectedWave = computed(() => characterStore.currentWaveConfig)

const splashTypeOptions = computed(() => [
  { id: 'falloff', label: t('traits.splashFalloff'), icon: TrendingDown },
  { id: 'constant', label: t('traits.splashConstant'), icon: Equal },
])

// Tower Blueprint Upgrade Levels State
const selectedLevelIndex = ref(0)

const currentBlueprintLevels = computed<TowerLevelConfig[]>(() => {
  if (!selectedBp.value) return []
  return towerStore.ensureBlueprintLevels(selectedBp.value)
})

const activeLevelConfig = computed<TowerLevelConfig>(() => {
  if (!selectedBp.value) return {} as TowerLevelConfig
  const levels = currentBlueprintLevels.value
  const validIdx = Math.max(0, Math.min(levels.length - 1, selectedLevelIndex.value))
  return levels[validIdx] || levels[0] || (selectedBp.value as any)
})

watch(() => towerStore.selectedBlueprintId, () => {
  selectedLevelIndex.value = 0
})

function handleAddLevel() {
  if (!selectedBp.value) return
  const newLvl = towerStore.addBlueprintLevel(selectedBp.value.id)
  if (newLvl) {
    selectedLevelIndex.value = currentBlueprintLevels.value.length - 1
  }
}

function handleRemoveLevel() {
  if (!selectedBp.value || selectedLevelIndex.value <= 0) return
  towerStore.removeBlueprintLevel(selectedBp.value.id, selectedLevelIndex.value)
  selectedLevelIndex.value = Math.max(0, selectedLevelIndex.value - 1)
}

function updateActiveLevel(partial: Partial<TowerLevelConfig>) {
  if (!selectedBp.value) return
  towerStore.updateBlueprintLevel(selectedBp.value.id, selectedLevelIndex.value, partial)
}

function hasLevelTrait(traitId: TowerTraitType): boolean {
  if (!activeLevelConfig.value || !activeLevelConfig.value.traits) return false
  return activeLevelConfig.value.traits.includes(traitId)
}

function toggleLevelTrait(traitId: TowerTraitType) {
  if (!selectedBp.value) return
  const currentTraits = Array.isArray(activeLevelConfig.value.traits) ? [...activeLevelConfig.value.traits] : []
  const idx = currentTraits.indexOf(traitId)
  if (idx !== -1) {
    currentTraits.splice(idx, 1)
  } else {
    currentTraits.push(traitId)
    // Apply default values if not set
    const traitDef = getTraitDef(traitId)
    if (traitDef && traitDef.defaultValues) {
      updateActiveLevel(traitDef.defaultValues)
    }
  }
  updateActiveLevel({ traits: currentTraits })
}

function hasTowerTrait(traitId: TowerTraitType): boolean {
  return hasLevelTrait(traitId)
}

function toggleTowerTrait(traitId: TowerTraitType) {
  toggleLevelTrait(traitId)
}

function hasWaveImmunity(traitId: TowerTraitType): boolean {
  if (!selectedWave.value || !selectedWave.value.immunities) return false
  return selectedWave.value.immunities.includes(traitId)
}

function toggleWaveImmunity(traitId: TowerTraitType) {
  if (!selectedWave.value) return
  const currentImmunities = Array.isArray(selectedWave.value.immunities) ? [...selectedWave.value.immunities] : []
  const idx = currentImmunities.indexOf(traitId)
  if (idx !== -1) {
    currentImmunities.splice(idx, 1)
  } else {
    currentImmunities.push(traitId)
  }
  selectedWave.value.immunities = currentImmunities
  characterStore.syncWavesToProject()
}

// Change Unit Appearance Modal State
const isChangeUnitModalOpen = ref(false)
const tempSelectedUnitModel = ref('male')
const tempSelectedVariant = ref<UnitVariantType>('normal')

const availableCharacterModels = computed(() => {
  const models = Object.values(characterManifest) as Array<{
    id: string
    name: string
    cellWidth: number
    cellHeight: number
    actions: Record<string, { id: string; label: string; icon: string; frameCount: number }>
  }>
  return models.length > 0 ? models : [
    { id: 'male', name: 'Male', cellWidth: 256, cellHeight: 512, actions: {} },
    { id: 'warrior', name: 'Warrior', cellWidth: 256, cellHeight: 256, actions: {} },
    { id: 'female', name: 'Female', cellWidth: 256, cellHeight: 256, actions: {} },
  ]
})

function getUnitModelDisplayName(id?: string): string {
  const lower = String(id || 'male').toLowerCase()
  const found = (characterManifest as any)?.[lower]
  if (found && found.name) return found.name
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function getUnitBadgeVariant(id?: string): 'brand' | 'amber' | 'rose' | 'emerald' {
  const lower = String(id || 'male').toLowerCase()
  if (lower.includes('warrior') || lower.includes('knight')) return 'amber'
  if (lower.includes('female') || lower.includes('woman')) return 'rose'
  if (lower.includes('orc') || lower.includes('goblin') || lower.includes('dragon')) return 'emerald'
  return 'brand'
}

function openChangeUnitModal() {
  tempSelectedUnitModel.value = selectedWave.value?.characterModel || 'male'
  tempSelectedVariant.value = (selectedWave.value?.unitVariant as UnitVariantType) || 'normal'
  isChangeUnitModalOpen.value = true
}

function saveUnitSelection() {
  if (tempSelectedUnitModel.value) {
    characterStore.setWaveCharacterModel(tempSelectedUnitModel.value)
  }
  if (tempSelectedVariant.value) {
    characterStore.setWaveUnitVariant(tempSelectedVariant.value)
  }
  isChangeUnitModalOpen.value = false
}

const formationOptions = computed(() => [
  { id: 'pairs', label: t('config.pairsFormation'), icon: Users },
  { id: 'single', label: t('config.singleFormation'), icon: User },
])

const spawnModeOptions = computed(() => [
  { id: 'all_doors', label: t('config.allDoorsSimultaneously'), icon: Sparkles },
  { id: 'single_door', label: t('config.selectedDoorOnly'), icon: MapPin },
])

const projectileOptions = computed(() => [
  { id: 'fireball', name: t('towers.projectileFireball'), icon: Flame },
  { id: 'arrow', name: t('towers.projectileArrow'), icon: ArrowRight },
  { id: 'magic_bolt', name: t('towers.projectileMagic'), icon: Zap },
  { id: 'cannonball', name: t('towers.projectileCannonball'), icon: CircleDot },
  { id: 'frost_bolt', name: t('towers.projectileFrost'), icon: Snowflake },
  { id: 'laser', name: t('towers.projectileLaser'), icon: Radio },
  { id: 'missile', name: t('towers.projectileMissile'), icon: Rocket },
])

// Change Sprite Modal State
const isChangeSpriteModalOpen = ref(false)
const spriteModalSearchQuery = ref('')
const selectedSpriteCategory = ref('all')
const tempSelectedAssetId = ref('')

const spriteCategories = computed(() => [
  { id: 'all', label: t('assets.catAll') },
  { id: 'walls', label: t('assets.catWalls') },
  { id: 'ground', label: t('assets.catGround') },
  { id: 'stairs', label: t('assets.catStairs') },
  { id: 'props', label: t('assets.catProps') },
])

const filteredModalAssets = computed(() => {
  let list = assetStore.assets
  if (selectedSpriteCategory.value !== 'all') {
    list = list.filter(item => {
      const lower = (item.name || item.id || '').toLowerCase()
      if (selectedSpriteCategory.value === 'walls') {
        return lower.includes('wall') || lower.includes('gate') || lower.includes('door') || lower.includes('archway') || lower.includes('column') || lower.includes('support')
      }
      if (selectedSpriteCategory.value === 'ground') {
        return lower.includes('dirt') || lower.includes('planks') || (lower.includes('stone') && !lower.includes('wall') && !lower.includes('column'))
      }
      if (selectedSpriteCategory.value === 'stairs') {
        return lower.includes('stairs') || lower.includes('bridge')
      }
      if (selectedSpriteCategory.value === 'props') {
        return lower.includes('barrel') || lower.includes('chest') || lower.includes('crate') || lower.includes('table') || lower.includes('chair') || lower.includes('display') || lower.includes('bookcase')
      }
      return true
    })
  }
  const query = spriteModalSearchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter(item => (item.name || '').toLowerCase().includes(query))
  }
  return list
})

const tempSelectedAsset = computed(() => {
  if (!tempSelectedAssetId.value) return null
  return assetStore.assets.find(a => a.id === tempSelectedAssetId.value) || null
})

function openChangeSpriteModal() {
  if (selectedBp.value) {
    tempSelectedAssetId.value = selectedBp.value.assetId || ''
  }
  spriteModalSearchQuery.value = ''
  selectedSpriteCategory.value = 'all'
  isChangeSpriteModalOpen.value = true
}

function saveSpriteSelection() {
  if (selectedBp.value && tempSelectedAsset.value) {
    changeBlueprintAsset(selectedBp.value.id, tempSelectedAsset.value)
  }
  isChangeSpriteModalOpen.value = false
}

function updateSelectedBp(updates: any) {
  if (selectedBp.value) {
    towerStore.updateBlueprint(selectedBp.value.id, updates)
    if (updates.clanId && updates.clanId !== towerStore.selectedEditorClanId) {
      towerStore.selectEditorClan(updates.clanId)
    }
  }
}

function handleRemoveSelectedBp() {
  if (selectedBp.value) {
    towerStore.removeBlueprint(selectedBp.value.id)
  }
}

function handleApplySelectedBp() {
  if (selectedBp.value) {
    towerStore.applyBlueprintToAllPlacedTowers(selectedBp.value.id)
  }
}

function changeBlueprintAsset(bpId: string, asset: AssetItem) {
  const preview = assetStore.getAssetPreview(asset)
  towerStore.updateBlueprint(bpId, {
    assetId: asset.id,
    assetName: `${asset.name}.webp`,
    assetPath: preview || asset.previewSrc || asset.src || '',
  })
}

function handleTriggerAddSpawnPoint() {
  toolStore.closeGameConfig()
  characterStore.isSettingSpawnPoint = true
  characterStore.spawnPointPlacementMode = 'add'
}

function handleTriggerRelocateSpawnPoint() {
  toolStore.closeGameConfig()
  characterStore.isSettingSpawnPoint = true
  characterStore.spawnPointPlacementMode = 'relocate'
}

function handleStartDrawingRoute() {
  toolStore.closeGameConfig()
  characterStore.startDrawingCustomRoute()
}

function handleStartPlayModeFromModal() {
  toolStore.closeGameConfig()
  characterStore.entrySource = 'editor'
  characterStore.startLoadingScreen(mapStore.project.name || 'Map')
  const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || 'julion')
  router.push(`/game/${cleanId}`)
  requestAppFullscreen()
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
