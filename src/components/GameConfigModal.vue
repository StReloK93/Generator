<template>
  <UiModal
    :is-open="toolStore.isGameConfigModalOpen"
    title="Tower Defense & Movement Settings"
    subtitle="Configure tower blueprints, wave difficulty, map balance, placed defenses and routes"
    :icon="Gamepad2"
    icon-color="amber"
    size="5xl"
    @close="toolStore.closeGameConfig()"
  >
    <!-- Header Extra Slot for Gold -->
    <template #title>
      <div class="flex items-center justify-between w-full">
        <span>Tower Defense & Movement Settings</span>
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
    <!-- TAB 1: TOWER BLUEPRINTS                                                   -->
    <!-- ========================================================================= -->
    <div v-if="toolStore.gameConfigActiveTab === 'towers'" class="flex flex-col gap-3">
      
      <!-- Header Actions: Blueprint tabs & Create button -->
      <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800/80 shrink-0">
        <div class="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          <UiButton 
            v-for="bp in towerStore.blueprints" 
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
          @click="towerStore.isCreateTowerModalOpen = true"
        >
          Create Tower
        </UiButton>
      </div>

      <!-- No Blueprints State -->
      <UiCard 
        v-if="towerStore.blueprints.length === 0" 
        variant="subtle"
        padding="lg"
        custom-class="flex flex-col items-center text-center gap-3 my-4"
      >
        <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <TowerControl class="w-6 h-6" />
        </div>
        <div class="flex flex-col gap-1 max-w-md">
          <span class="font-bold text-sm text-amber-300">No defense towers configured</span>
          <span class="text-xs text-slate-400">Select any sprite image from your library to forge custom defense towers.</span>
        </div>
        <UiButton 
          variant="game-amber"
          size="md"
          :leading-icon="Plus"
          @click="towerStore.isCreateTowerModalOpen = true"
        >
          Create First Tower
        </UiButton>
      </UiCard>

      <!-- Active Selected Blueprint Editor -->
      <div v-else-if="selectedBp" class="grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
        
        <!-- Left Column: Visual Preview & Sprite Select -->
        <UiCard variant="amber" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-300 text-xs">Tower Appearance</span>
            <UiBadge variant="amber" size="xs">{{ selectedBp.assetName || 'Custom' }}</UiBadge>
          </div>

          <!-- Sprite Preview -->
          <div class="h-32 rounded-2xl bg-slate-900 checker-pattern flex items-center justify-center p-3 border border-slate-800 shadow-inner overflow-hidden">
            <img 
              :src="assetStore.getAssetPreview(selectedBp.assetId || selectedBp.assetName) || selectedBp.assetPath" 
              :alt="selectedBp.name" 
              class="max-w-full max-h-full object-contain filter drop-shadow-lg scale-110"
            />
          </div>

          <!-- Quick Sprite Picker Grid -->
          <div class="flex flex-col gap-1.5 grow">
            <div class="flex items-center justify-between">
              <span class="text-[10px] text-slate-400 font-semibold">Change Sprite:</span>
              <span class="text-[9px] text-slate-500 font-mono">{{ towerAvailableAssets.length }} sprites</span>
            </div>
            <UiInput 
              v-model="assetSearchQuery"
              size="sm"
              placeholder="Search assets..."
              :leading-icon="Search"
              clearable
            />
            <main class="grow min-h-0 overflow-y-auto custom-scrollbar relative">
  <div
    class="absolute inset-0 grid grid-cols-4 content-start auto-rows-max gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800"
  >
    <div
      v-for="asset in towerAvailableAssets"
      :key="asset.id"
      @click="changeBlueprintAsset(selectedBp.id, asset)"
      :class="
        selectedBp.assetId === asset.id
          ? 'ring-2 ring-amber-400 bg-amber-500/30'
          : 'hover:bg-slate-800 border border-slate-800/80'
      "
      class="w-full aspect-square min-w-0 p-1 rounded-lg flex items-center justify-center cursor-pointer transition-all overflow-hidden"
      :title="asset.name"
    >
      <img
        :src="assetStore.getAssetPreview(asset)"
        :alt="asset.name"
        class="w-full h-full object-contain pointer-events-none"
      />
    </div>
  </div>
</main>
          </div>

          <!-- Delete Blueprint -->
          <UiButton 
            v-if="towerStore.blueprints.length > 1"
            variant="danger"
            size="sm"
            block
            :leading-icon="Trash2"
            custom-class="mt-auto"
            @click="handleRemoveSelectedBp()"
          >
            Delete Blueprint
          </UiButton>
        </UiCard>

        <!-- Middle & Right Columns: Attributes Configuration Form -->
        <UiCard variant="default" padding="md" custom-class="md:col-span-2 flex flex-col gap-3">
          <!-- Name & Cost Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UiInput 
              :model-value="selectedBp.name"
              label="Tower Name"
              size="sm"
              @update:model-value="(val) => updateSelectedBp({ name: String(val) })"
            />

            <UiNumberInput 
              :model-value="selectedBp.cost"
              label="Build Cost (Gold)"
              :min="10"
              :max="5000"
              :step="10"
              unit=" gold"
              @update:model-value="(val) => updateSelectedBp({ cost: val || 50 })"
            />
          </div>

          <!-- Damage, Attack Speed, Range Sliders -->
          <UiCard variant="subtle" padding="sm" custom-class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <!-- Damage -->
            <UiSlider 
              :model-value="selectedBp.damage"
              label="💥 Damage"
              :min="5"
              :max="500"
              :step="5"
              unit=" DMG"
              @update:model-value="(val) => updateSelectedBp({ damage: val })"
            />

            <!-- Attack Speed -->
            <UiSlider 
              :model-value="selectedBp.attackSpeed"
              label="⚡ Attack Speed"
              :min="0.1"
              :max="3.0"
              :step="0.1"
              unit="s"
              @update:model-value="(val) => updateSelectedBp({ attackSpeed: val })"
            />

            <!-- Range -->
            <UiSlider 
              :model-value="selectedBp.range"
              label="🎯 Attack Range"
              :min="1"
              :max="12"
              :step="1"
              unit=" cells"
              @update:model-value="(val) => updateSelectedBp({ range: val })"
            />
          </UiCard>

          <!-- Projectile Type & Color -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-semibold text-slate-300">Projectile Type:</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <UiButton 
                v-for="pType in projectileOptions" 
                :key="pType.id"
                :variant="selectedBp.projectileType === pType.id ? 'game-amber' : 'secondary'"
                size="xs"
                @click="updateSelectedBp({ projectileType: pType.id as any })"
              >
                <span class="mr-1">{{ pType.icon }}</span>
                <span>{{ pType.name }}</span>
              </UiButton>
            </div>
          </div>

          <!-- Splash Damage Options -->
          <UiSwitch
            :model-value="selectedBp.isSplash"
            label="💥 Area of Effect (Splash AoE)"
            description="Deals splash damage to adjacent enemies around the impact point"
            variant="amber"
            @update:model-value="(val) => updateSelectedBp({ isSplash: val })"
          />

          <div v-if="selectedBp.isSplash" class="flex items-center gap-2 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <UiSlider 
              :model-value="selectedBp.splashRadius || 1.5"
              label="Splash Radius"
              :min="0.5"
              :max="5.0"
              :step="0.5"
              unit=" cells"
              @update:model-value="(val) => updateSelectedBp({ splashRadius: val })"
            />
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
            Apply to All Placed Towers on Map
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
            <span>{{ w.name }}</span>
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
          New Wave
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
          <span class="font-bold text-sm text-purple-300">No waves defined</span>
          <span class="text-xs text-slate-400">Add a wave to customize enemy density, health and gold bounty.</span>
        </div>
        <UiButton 
          variant="primary"
          size="md"
          :leading-icon="Plus"
          @click="characterStore.addNewWave()"
        >
          Create Wave 1
        </UiButton>
      </UiCard>

      <!-- Active Wave Editor Card -->
      <UiCard v-else-if="selectedWave" variant="default" padding="md" custom-class="flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-800">
          <div class="flex items-center gap-2">
            <span class="font-bold text-purple-300 text-sm">{{ selectedWave.name }} Settings</span>
          </div>

          <UiButton 
            v-if="characterStore.waveConfigs.length > 1"
            variant="danger"
            size="xs"
            :leading-icon="Trash2"
            @click="characterStore.deleteWave(characterStore.currentWaveIndex)"
          >
            Delete Wave
          </UiButton>
        </div>

        <!-- Parameters Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- 1. Unit Count -->
          <UiCard variant="subtle" padding="sm">
            <UiSlider 
              :model-value="selectedWave.unitCount"
              label="👥 Enemies Count"
              :min="1"
              :max="100"
              :step="1"
              unit=" units"
              @update:model-value="(val) => characterStore.setWaveUnitCount(val || 1)"
            />
            <span class="text-[10px] text-slate-500 block mt-1">Invaders spawned per wave</span>
          </UiCard>

          <!-- 2. HP (Health) -->
          <UiCard variant="subtle" padding="sm">
            <UiSlider 
              :model-value="selectedWave.unitHp"
              label="❤️ Health (HP)"
              :min="20"
              :max="5000"
              :step="10"
              unit=" HP"
              @update:model-value="(val) => characterStore.setWaveUnitHp(val || 20)"
            />
            <span class="text-[10px] text-slate-500 block mt-1">Health durability per enemy unit</span>
          </UiCard>

          <!-- 3. Speed -->
          <UiCard variant="subtle" padding="sm">
            <UiSlider 
              :model-value="selectedWave.unitSpeed"
              label="⚡ Movement Speed"
              :min="0.5"
              :max="5.0"
              :step="0.1"
              unit=" cells/s"
              @update:model-value="(val) => characterStore.setWaveSpeed(val || 1.0)"
            />
            <span class="text-[10px] text-slate-500 block mt-1">Grid cells per second</span>
          </UiCard>

          <!-- 4. Gold Reward -->
          <UiCard variant="subtle" padding="sm">
            <UiSlider 
              :model-value="selectedWave.goldReward"
              label="🪙 Bounty Reward"
              :min="10"
              :max="1000"
              :step="10"
              unit=" gold"
              @update:model-value="(val) => characterStore.setWaveGoldReward(val || 50)"
            />
            <span class="text-[10px] text-slate-500 block mt-1">Gold awarded upon wave clearance</span>
          </UiCard>
        </div>

        <!-- Bottom Test Wave Action Button -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-800">
          <span class="text-[11px] text-slate-400">
            Simulate and test this specific wave on the map:
          </span>

          <UiButton 
            variant="game-green"
            size="sm"
            :leading-icon="Play"
            @click="handleTestWave(characterStore.currentWaveIndex)"
          >
            Test This Wave Only
          </UiButton>
        </div>
      </UiCard>

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
            <h3 class="font-bold text-slate-100 text-xs sm:text-sm">Map Economy & Defense Balance</h3>
            <p class="text-[11px] text-slate-400">Starting treasury, base lives and wave prep timers are saved per project</p>
          </div>
        </div>
        <UiBadge variant="amber" size="sm">
          🗺️ {{ mapStore.project.name || 'Map' }}
        </UiBadge>
      </UiCard>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <!-- 1. Starting Gold -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Coins class="w-4 h-4 text-yellow-400" />
              Starting Gold
            </span>
            <UiBadge variant="amber" size="sm">{{ characterStore.startingGold }} gold</UiBadge>
          </div>
          <p class="text-[11px] text-slate-400 leading-tight">
            Initial treasury given to players upon game start.
          </p>
          <UiSlider 
            v-model="characterStore.startingGold"
            :min="50"
            :max="2000"
            :step="25"
            unit=" gold"
          />
          <div class="flex items-center gap-1.5 flex-wrap">
            <UiButton 
              v-for="preset in [100, 150, 250, 500, 1000]"
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
              Base Lives
            </span>
            <UiBadge variant="rose" size="sm">{{ characterStore.startingLives }} lives</UiBadge>
          </div>
          <p class="text-[11px] text-slate-400 leading-tight">
            Total permitted enemy breaches before defeat.
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
              Wave Prep Timer
            </span>
            <UiBadge variant="brand" size="sm">{{ characterStore.wavePrepDuration }}s</UiBadge>
          </div>
          <p class="text-[11px] text-slate-400 leading-tight">
            Build preparation cooldown between consecutive enemy waves.
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
          <span>About Map Defense Balance:</span>
        </div>
        <p class="text-[11px] text-slate-400 leading-relaxed">
          These settings are persisted inside the project file (<code class="text-amber-300 font-mono">.isomap.json</code>) and exported cleanly. Each imported or newly forged map retains its own autonomous balance parameters.
        </p>
      </UiCard>
    </div>

    <!-- ========================================================================= -->
    <!-- TAB 4: PLACED TOWERS                                                      -->
    <!-- ========================================================================= -->
    <div v-else-if="toolStore.gameConfigActiveTab === 'placed'" class="flex flex-col gap-3">
      
      <!-- Placed Towers Summary Row -->
      <div class="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-200 text-xs">Towers Constructed on Map:</span>
          <UiBadge variant="cyan" size="xs">
            {{ towerStore.placedTowers.length }} towers
          </UiBadge>
        </div>

        <UiButton 
          v-if="towerStore.placedTowers.length > 0"
          variant="danger"
          size="xs"
          :leading-icon="Trash2"
          @click="towerStore.clearAllTowers()"
        >
          Clear All Towers
        </UiButton>
      </div>

      <!-- No Placed Towers State -->
      <UiCard 
        v-if="towerStore.placedTowers.length === 0" 
        variant="subtle"
        padding="lg"
        custom-class="flex flex-col items-center text-center gap-3 my-4"
      >
        <div class="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <TowerControl class="w-6 h-6" />
        </div>
        <div class="flex flex-col gap-1 max-w-md">
          <span class="font-bold text-sm text-sky-300">No towers placed on the map</span>
          <span class="text-xs text-slate-400">Select a tower blueprint to place defenses directly onto map cells or construct during battle.</span>
        </div>
      </UiCard>

      <!-- Placed Towers List Cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <UiCard 
          v-for="tower in towerStore.placedTowers" 
          :key="tower.id"
          variant="default"
          padding="sm"
          custom-class="flex flex-col gap-2.5 hover:border-slate-700"
        >
          <!-- Card Top: Name & Level -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 min-w-0">
              <span class="font-bold text-white text-xs truncate">{{ tower.name }}</span>
              <UiBadge variant="amber" size="xs">Lvl {{ tower.level }}</UiBadge>
            </div>
            <span class="text-[10px] font-mono text-emerald-400 font-semibold shrink-0">
              ({{ tower.col }}, {{ tower.row }})
            </span>
          </div>

          <!-- Stats -->
          <div class="grid grid-cols-3 gap-1 p-1.5 rounded-xl bg-slate-900 text-[10px] text-center">
            <div>
              <span class="text-slate-500 block">💥 Damage</span>
              <strong class="text-amber-300">{{ tower.damage }}</strong>
            </div>
            <div>
              <span class="text-slate-500 block">🎯 Range</span>
              <strong class="text-sky-300">{{ tower.range }}k</strong>
            </div>
            <div>
              <span class="text-slate-500 block">☠️ Kills</span>
              <strong class="text-rose-400">{{ tower.killsCount }}</strong>
            </div>
          </div>

          <!-- Action Buttons: Focus, Upgrade, Sell -->
          <div class="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-800/80">
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Crosshair"
              title="Focus on this tower in map view"
              @click="handleFocusTower(tower)"
            >
              View
            </UiButton>

            <UiButton 
              variant="game-amber"
              size="xs"
              :leading-icon="Sparkles"
              title="Upgrade tower level"
              @click="towerStore.upgradePlacedTower(tower.id)"
            >
              +Lvl
            </UiButton>

            <UiButton 
              variant="danger"
              size="xs"
              :leading-icon="Trash2"
              title="Sell / Dismantle"
              @click="towerStore.sellPlacedTower(tower.id)"
            >
              Sell
            </UiButton>
          </div>
        </UiCard>
      </div>

    </div>

    <!-- ========================================================================= -->
    <!-- TAB 5: SPAWN POINTS & MOVEMENT                                            -->
    <!-- ========================================================================= -->
    <div v-else-if="toolStore.gameConfigActiveTab === 'spawns'" class="flex flex-col gap-3">
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        <!-- LEFT CARD: SPAWN POINTS & ROUTE MANAGEMENT -->
        <UiCard variant="emerald" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <span class="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
              <MapPin class="w-4 h-4" />
              <span>Spawn Points</span>
            </span>
            <UiBadge variant="emerald" size="xs">
              {{ characterStore.detectedDoors.length }} doors
            </UiBadge>
          </div>

          <!-- Empty State for Spawn Points -->
          <UiCard 
            v-if="characterStore.detectedDoors.length === 0" 
            variant="subtle"
            padding="md"
            custom-class="text-center flex flex-col items-center gap-2"
          >
            <span class="text-xs text-slate-300 font-semibold">🚩 No spawn points placed</span>
            <p class="text-[10px] text-slate-400 leading-tight">New maps do not require default doors. You can place spawn doors whenever needed.</p>
            <UiButton 
              variant="game-green"
              size="sm"
              :leading-icon="Plus"
              custom-class="mt-1"
              @click="handleTriggerAddSpawnPoint"
            >
              Place First Spawn Door
            </UiButton>
          </UiCard>

          <!-- Active Spawn Points Section -->
          <template v-else>
            <!-- Spawn Mode Toggle -->
            <UiTabs 
              v-model="characterStore.spawnMode"
              :items="[
                { id: 'all_doors', label: 'All Spawn Doors', icon: Sparkles },
                { id: 'single_door', label: 'Single Door Only', icon: MapPin },
              ]"
              fill
              size="sm"
            />

            <!-- Spawn Point Dropdown Selector -->
            <div class="flex items-center gap-2">
              <select 
                v-model.number="characterStore.selectedDoorIndex"
                class="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
              >
                <option 
                  v-for="(door, idx) in characterStore.detectedDoors" 
                  :key="door.id" 
                  :value="idx"
                >
                  🚩 {{ door.name }} (Cell: {{ door.col }}, {{ door.row }})
                </option>
              </select>

              <UiIconButton 
                :icon="Trash2"
                size="md"
                variant="danger"
                title="Delete this spawn door"
                @click="characterStore.removeSpawnPoint(characterStore.selectedDoorIndex)"
              />
            </div>

            <!-- Action Buttons: Add Spawn Point & Relocate -->
            <div class="grid grid-cols-2 gap-2">
              <UiButton 
                variant="game-amber"
                size="sm"
                :leading-icon="Plus"
                @click="handleTriggerAddSpawnPoint"
              >
                Place New Door
              </UiButton>

              <UiButton 
                variant="secondary"
                size="sm"
                :leading-icon="MapPin"
                @click="handleTriggerRelocateSpawnPoint"
              >
                Relocate Door
              </UiButton>
            </div>
          </template>

          <!-- Route Drawing Tools -->
          <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2 mt-auto">
            <span class="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
              <Navigation class="w-3.5 h-3.5 text-brand-400" />
              <span>Custom Route Waypoints:</span>
            </span>

            <div class="grid grid-cols-2 gap-2">
              <UiButton 
                variant="primary"
                size="sm"
                :leading-icon="PenTool"
                @click="handleStartDrawingRoute"
              >
                Draw Custom Route
              </UiButton>

              <UiButton 
                variant="secondary"
                size="sm"
                :leading-icon="RotateCcw"
                @click="characterStore.deleteCurrentRoute()"
              >
                Clear Route
              </UiButton>
            </div>
          </UiCard>

        </UiCard>

        <!-- RIGHT CARD: MOVEMENT & SIMULATION PARAMETERS -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <Activity class="w-4 h-4 text-brand-400" />
              <span>Movement & Simulation Parameters</span>
            </span>
          </div>

          <!-- Formation: Pairs vs Single -->
          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] font-semibold text-slate-300">March Formation:</span>
            <UiTabs 
              v-model="characterStore.formation"
              :items="[
                { id: 'pairs', label: 'Pairs (2 abreast)', icon: Users },
                { id: 'single', label: 'Single File', icon: User },
              ]"
              fill
              size="sm"
            />
          </div>

          <!-- Pair Distance & Unit Speed Sliders -->
          <UiCard variant="subtle" padding="sm" custom-class="grid grid-cols-2 gap-3">
            <UiSlider 
              v-model="characterStore.pairDistance"
              label="Pair Spacing"
              :min="0.1"
              :max="1.5"
              :step="0.05"
              unit="k"
            />

            <UiSlider 
              v-model="characterStore.unitSpeed"
              label="March Speed"
              :min="0.5"
              :max="6.0"
              :step="0.1"
              unit=" cells/s"
            />
          </UiCard>

          <!-- Game Speed Slider -->
          <UiCard variant="subtle" padding="sm">
            <UiSlider 
              v-model="characterStore.gameSpeed"
              label="⚡ Simulation Multiplier"
              :min="1.0"
              :max="50.0"
              :step="1.0"
              unit="x"
            />
          </UiCard>

          <!-- Follow Camera & Trail Toggles -->
          <div class="grid grid-cols-2 gap-2">
            <UiSwitch 
              v-model="characterStore.followCamera"
              label="Follow Camera"
              variant="brand"
            />
            <UiSwitch 
              v-model="characterStore.showPathTrail"
              label="Waypoint Trail"
              variant="brand"
            />
          </div>

          <!-- Tour Playback Controls -->
          <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 mt-auto">
            <UiButton 
              v-if="!characterStore.isPlaying"
              variant="game-green"
              size="sm"
              :leading-icon="Play"
              @click="characterStore.startTour()"
            >
              Start Tour
            </UiButton>

            <UiButton 
              v-else
              variant="game-amber"
              size="sm"
              :leading-icon="Pause"
              @click="characterStore.pauseTour()"
            >
              Pause
            </UiButton>

            <UiButton 
              variant="secondary"
              size="sm"
              :leading-icon="RotateCcw"
              @click="characterStore.resetTour()"
            >
              Reset
            </UiButton>

            <UiButton 
              variant="game-green"
              size="sm"
              :leading-icon="Gamepad2"
              @click="handleStartPlayModeFromModal"
            >
              To Game
            </UiButton>
          </div>

        </UiCard>

      </div>

    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { 
  Gamepad2, X, ShieldAlert, Swords, TowerControl, Users, 
  Plus, Sparkles, Trash2, Crosshair, Play, Pause, RotateCcw, 
  MapPin, Navigation, PenTool, Activity, User, Coins, Heart, Timer,
  Search
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
import { useTowerStore, PlacedTower } from '../stores/towerStore'
import { useCharacterStore } from '../stores/characterStore'
import { useAssetStore } from '../stores/assetStore'
import { useMapStore } from '../stores/mapStore'
import { AssetItem } from '../types/map'
import { requestAppFullscreen } from '../utils/fullscreen'

const router = useRouter()
const toolStore = useToolStore()
const towerStore = useTowerStore()
const characterStore = useCharacterStore()
const assetStore = useAssetStore()
const mapStore = useMapStore()

const configTabItems = computed<TabItem[]>(() => [
  { id: 'towers', label: 'Towers', icon: ShieldAlert, count: towerStore.blueprints.length },
  { id: 'waves', label: 'Waves', icon: Swords, count: characterStore.waveConfigs.length },
  { id: 'balance', label: 'Map Balance', icon: Coins },
  { id: 'placed', label: 'Placed Defenses', icon: TowerControl, count: towerStore.placedTowers.length },
  { id: 'spawns', label: 'Spawn & Movement', icon: Users },
])

const selectedBp = computed(() => towerStore.selectedBlueprint)
const selectedWave = computed(() => characterStore.currentWaveConfig)

const projectileOptions = [
  { id: 'cannonball', name: 'Cannonball', icon: '💣' },
  { id: 'arrow', name: 'Arrow', icon: '🏹' },
  { id: 'magic_bolt', name: 'Magic Bolt', icon: '⚡' },
  { id: 'fireball', name: 'Fireball', icon: '🔥' },
]

const assetSearchQuery = ref('')

const towerAvailableAssets = computed(() => {
  const query = assetSearchQuery.value.trim().toLowerCase()
  if (!query) return assetStore.assets
  return assetStore.assets.filter(a => (a.name || '').toLowerCase().includes(query))
})

function updateSelectedBp(updates: any) {
  if (selectedBp.value) {
    towerStore.updateBlueprint(selectedBp.value.id, updates)
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
    assetName: `${asset.name}.png`,
    assetPath: preview || asset.previewSrc || asset.src || '',
  })
}

function handleTestWave(idx: number) {
  toolStore.closeGameConfig()
  characterStore.testWave(idx)
}

function handleFocusTower(tower: PlacedTower) {
  toolStore.closeGameConfig()
  toolStore.setSelectedElement({
    col: tower.col,
    row: tower.row,
    layerId: 'layer-objects',
    itemId: tower.id,
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
  router.push('/game')
  requestAppFullscreen()
  characterStore.startLoadingScreen(mapStore.project.name || 'Map')
  characterStore.setLoadingProgress(30, "Checking assets...")
  setTimeout(() => {
    characterStore.setLoadingProgress(100, "Ready!")
    characterStore.startPlayMode()
    characterStore.finishLoadingScreen()
  }, 400)
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
