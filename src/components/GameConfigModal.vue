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
        
        <!-- Left Column: Visual Live Preview & Sprite Select -->
        <UiCard variant="amber" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-amber-300 text-xs truncate">Tower Appearance</span>
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
              Change Sprite
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
              Delete Blueprint
            </UiButton>
          </div>
        </UiCard>

        <!-- Right Column: Attributes Configuration Form -->
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
            <span class="text-[11px] font-semibold text-slate-300">Projectile Type & Animation:</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
            <span class="mr-1">{{ getModelEmoji(w.characterModel) }}</span>
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
          <span class="text-xs text-slate-400">Add a wave to customize enemy density, health, unit model and bounty.</span>
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

      <!-- Active Selected Wave Editor Layout (Split Columns) -->
      <div v-else-if="selectedWave" class="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
        
        <!-- Left Column (1 col): Character Model & Live Animation Preview -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="font-bold text-purple-300 text-xs truncate">Unit Appearance</span>
            <UiBadge :variant="getUnitBadgeVariant(selectedWave.characterModel)" size="xs">
              {{ getModelEmoji(selectedWave.characterModel) }} {{ getUnitModelDisplayName(selectedWave.characterModel) }}
            </UiBadge>
          </div>

          <!-- Live Character Animation Simulator -->
          <CharacterLivePreview 
            :model-value="selectedWave.characterModel || 'male'" 
            :anim-speed="selectedWave.animSpeed || 1.0"
            :offset-y="selectedWave.offsetY || 0"
            :show-model-selector="false"
          />

          <!-- Action Button: Change Unit Appearance -->
          <UiButton 
            variant="primary"
            size="sm"
            block
            :leading-icon="Users"
            custom-class="mt-auto shadow-md shadow-purple-900/30"
            @click="openChangeUnitModal()"
          >
            Change Unit Appearance
          </UiButton>
        </UiCard>

        <!-- Right Column (2 cols): Parameters & Wave Difficulty -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3 lg:col-span-2">
          <div class="flex items-center justify-between pb-2 border-b border-slate-800">
            <div class="flex items-center gap-2">
              <span class="font-bold text-purple-300 text-sm">{{ selectedWave.name }} Settings</span>
              <UiBadge variant="emerald" size="xs">{{ selectedWave.unitCount }} Enemies</UiBadge>
              <UiBadge :variant="getUnitBadgeVariant(selectedWave.characterModel)" size="xs">
                {{ getModelEmoji(selectedWave.characterModel) }} {{ getUnitModelDisplayName(selectedWave.characterModel) }}
              </UiBadge>
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
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

            <!-- 3. Movement Speed -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.unitSpeed"
                label="⚡ Movement Speed"
                :min="0.5"
                :max="5.0"
                :step="0.1"
                unit=" c/s"
                @update:model-value="(val) => characterStore.setWaveSpeed(val || 1.0)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">Movement cells per second</span>
            </UiCard>

            <!-- 4. Gold Reward -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.goldReward"
                label="🪙 Bounty Reward"
                :min="1"
                :max="100"
                :step="1"
                unit=" gold"
                @update:model-value="(val) => characterStore.setWaveGoldReward(val || 1)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">Gold awarded per enemy killed & clear</span>
            </UiCard>

            <!-- 5. Animation Playback Speed -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.animSpeed || 1.0"
                label="🏃 Animation Speed"
                :min="0.5"
                :max="3.0"
                :step="0.1"
                unit="x"
                @update:model-value="(val) => characterStore.setWaveAnimSpeed(val || 1.0)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">Unit walk/run anim cycle rate</span>
            </UiCard>

            <!-- 6. Height / Elevation Offset -->
            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                :model-value="selectedWave.offsetY || 0"
                label="📏 Elevation / Balandlik"
                :min="-20"
                :max="40"
                :step="1"
                unit="px"
                @update:model-value="(val) => characterStore.setWaveOffsetY(val || 0)"
              />
              <span class="text-[10px] text-slate-500 block mt-1">Elevation above ground tile</span>
            </UiCard>
          </div>

          <!-- Formation & March Settings -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800 mt-auto">
            <div class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold text-slate-300">👥 March Formation:</span>
              <UiTabs 
                v-model="characterStore.formation"
                :items="[
                  { id: 'pairs', label: 'Pairs (2 abreast)', icon: Users },
                  { id: 'single', label: 'Single File (1 by 1)', icon: User },
                ]"
                fill
                size="sm"
              />
            </div>

            <UiCard variant="subtle" padding="sm">
              <UiSlider 
                v-model="characterStore.pairDistance"
                label="📏 Unit Spacing"
                :min="0.1"
                :max="1.5"
                :step="0.05"
                unit="k"
              />
              <span class="text-[10px] text-slate-500 block mt-1">Spatial interval between marching units</span>
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
            <h3 class="font-bold text-slate-100 text-xs sm:text-sm">Enemy Spawn Points & Routes</h3>
            <p class="text-[11px] text-slate-400">Manage door entry coordinates, custom patrol paths and map visibility</p>
          </div>
        </div>

        <UiBadge variant="emerald" size="sm">
          {{ characterStore.detectedDoors.length }} doors
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
          <span class="font-bold text-sm text-emerald-300">No spawn points placed</span>
          <p class="text-xs text-slate-400 leading-tight">Place spawn doors directly onto map cells. Invaders will emerge from these coordinates during waves.</p>
        </div>
        <UiButton 
          variant="game-green"
          size="md"
          :leading-icon="Plus"
          @click="handleTriggerAddSpawnPoint"
        >
          Place First Spawn Door
        </UiButton>
      </UiCard>

      <!-- Active Spawn Points Section -->
      <div v-else class="flex flex-col gap-3">
        <!-- Spawn Doors Buttons List -->
        <UiCard variant="default" padding="md" custom-class="flex flex-col gap-3">
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <span class="font-bold text-slate-200 text-xs flex items-center gap-1.5">
              <MapPin class="w-4 h-4 text-emerald-400" />
              <span>Select Spawn Door:</span>
            </span>

            <UiButton 
              variant="game-amber"
              size="xs"
              :leading-icon="Plus"
              @click="handleTriggerAddSpawnPoint"
            >
              + Place New Door
            </UiButton>
          </div>

          <!-- Door Buttons Grid -->
          <div class="flex items-center gap-2 flex-wrap">
            <UiButton 
              v-for="(door, idx) in characterStore.detectedDoors" 
              :key="door.id || idx"
              :variant="characterStore.selectedDoorIndex === idx ? 'game-amber' : 'secondary'"
              size="sm"
              @click="characterStore.selectedDoorIndex = idx"
            >
              <span class="w-2 h-2 rounded-full mr-1.5" :class="characterStore.selectedDoorIndex === idx ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'"></span>
              <span>🚩 {{ door.name }} ({{ door.col }}, {{ door.row }})</span>
            </UiButton>
          </div>

          <!-- Selected Door Action Toolbar -->
          <div 
            v-if="characterStore.selectedDoor" 
            class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 flex-wrap"
          >
            <div class="flex items-center gap-2 text-xs">
              <UiBadge variant="amber" size="xs">Active: {{ characterStore.selectedDoor.name }}</UiBadge>
              <span class="text-slate-400 font-mono text-[11px]">Cell: [{{ characterStore.selectedDoor.col }}, {{ characterStore.selectedDoor.row }}]</span>
            </div>

            <div class="flex items-center gap-1.5">
              <UiButton 
                variant="secondary"
                size="xs"
                :leading-icon="MapPin"
                @click="handleTriggerRelocateSpawnPoint"
              >
                Relocate Door
              </UiButton>

              <UiButton 
                variant="danger"
                size="xs"
                :leading-icon="Trash2"
                @click="characterStore.removeSpawnPoint(characterStore.selectedDoorIndex)"
              >
                Delete Door
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
              <span>Spawn Distribution Mode:</span>
            </span>
            <UiTabs 
              v-model="characterStore.spawnMode"
              :items="[
                { id: 'all_doors', label: 'All Doors Simultaneously', icon: Sparkles },
                { id: 'single_door', label: 'Selected Door Only', icon: MapPin },
              ]"
              fill
              size="sm"
            />
          </UiCard>

          <!-- Custom Route Waypoints -->
          <UiCard variant="subtle" padding="sm" custom-class="flex flex-col gap-2">
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
                Draw Route
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
        </div>

      </div>

    </div>
  </UiModal>

  <!-- SELECT TOWER SPRITE MODAL (Triggered by Pencil / Change Sprite) -->
  <UiModal
    :is-open="isChangeSpriteModalOpen"
    title="Select Tower Sprite"
    subtitle="Choose any sprite image from the library for this defense tower"
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
          placeholder="Search sprites (wall, tower, stone, column)..."
          :leading-icon="Search"
          clearable
          custom-class="w-full sm:w-72"
        />

        <div class="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
          <button
            v-for="cat in spriteCategories"
            :key="cat.id"
            type="button"
            class="px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer"
            :class="selectedSpriteCategory === cat.id 
              ? 'bg-amber-500 text-slate-950 font-black shadow-sm' 
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'"
            @click="selectedSpriteCategory = cat.id"
          >
            {{ cat.label }}
          </button>
        </div>
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
            No sprite selected
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
                class="w-full h-full object-contain pointer-events-none group-hover:scale-110 transition-transform"
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
          Cancel
        </UiButton>

        <UiButton
          variant="primary"
          size="md"
          :disabled="!tempSelectedAsset"
          :leading-icon="Check"
          @click="saveSpriteSelection()"
        >
          Save
        </UiButton>
      </div>
    </div>
  </UiModal>

  <!-- SELECT WAVE UNIT MODEL GALLERY MODAL -->
  <UiModal
    :is-open="isChangeUnitModalOpen"
    title="Select Wave Unit Appearance"
    subtitle="Choose 3D isometric enemy character model and test animations for this wave"
    :icon="Users"
    icon-color="brand"
    size="4xl"
    @close="isChangeUnitModalOpen = false"
  >
    <div class="flex flex-col gap-3.5 select-none">
      <!-- Top Info Bar -->
      <div class="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-xs font-bold text-slate-300">Available Unit Characters:</span>
          <UiBadge variant="brand" size="xs">{{ availableCharacterModels.length }} models</UiBadge>
        </div>
        <div class="text-[11px] text-slate-400">
          Customizing: <strong class="text-purple-300 font-bold">{{ selectedWave?.name }}</strong>
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
            <!-- Left Info & Emoji -->
            <div class="flex items-center gap-3">
              <div 
                class="w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all"
                :class="tempSelectedUnitModel === model.id ? 'bg-purple-600/30 border border-purple-500/50 shadow-inner' : 'bg-slate-950 border border-slate-800 group-hover:border-slate-700'"
              >
                {{ getModelEmoji(model.id) }}
              </div>
              
              <div class="flex flex-col">
                <span class="font-bold text-sm text-slate-100 capitalize flex items-center gap-1.5">
                  {{ model.name }}
                  <UiBadge v-if="selectedWave?.characterModel === model.id" variant="brand" size="xs">Current</UiBadge>
                </span>
                <span class="text-[11px] text-slate-400">
                  {{ Object.keys(model.actions || {}).length }} animations
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
          <div class="flex items-center justify-between pb-1 border-b border-slate-800">
            <span class="text-xs font-bold text-purple-300 flex items-center gap-1.5">
              <span>{{ getModelEmoji(tempSelectedUnitModel) }}</span>
              <span>Live Test: {{ getUnitModelDisplayName(tempSelectedUnitModel) }}</span>
            </span>
            <UiBadge variant="brand" size="xs">Interactive Test</UiBadge>
          </div>

          <CharacterLivePreview
            :model-value="tempSelectedUnitModel"
            :anim-speed="selectedWave?.animSpeed || 1.0"
            :offset-y="selectedWave?.offsetY || 0"
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
          Cancel
        </UiButton>

        <UiButton
          variant="primary"
          size="md"
          :leading-icon="Check"
          @click="saveUnitSelection()"
        >
          Save & Apply Unit
        </UiButton>
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
  Search, Pencil, Check, Image
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
import { AssetItem } from '../types/map'
import { requestAppFullscreen } from '../utils/fullscreen'
import TowerLivePreview from './game/TowerLivePreview.vue'
import CharacterLivePreview from './game/CharacterLivePreview.vue'
import characterManifest from '../assets/generated/characterManifest.json'

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
  { id: 'spawns', label: 'Spawn Points', icon: MapPin, count: characterStore.detectedDoors.length },
])

const selectedBp = computed(() => towerStore.selectedBlueprint)
const selectedWave = computed(() => characterStore.currentWaveConfig)

// Change Unit Appearance Modal State
const isChangeUnitModalOpen = ref(false)
const tempSelectedUnitModel = ref('male')

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

function getModelEmoji(id?: string): string {
  const lower = String(id || 'male').toLowerCase()
  if (lower.includes('warrior') || lower.includes('knight')) return '⚔️'
  if (lower.includes('archer') || lower.includes('hunter') || lower.includes('bow')) return '🏹'
  if (lower.includes('mage') || lower.includes('wizard') || lower.includes('sorcerer')) return '🧙'
  if (lower.includes('male') || lower.includes('peasant') || lower.includes('villager') || lower.includes('worker')) return '🧑'
  if (lower.includes('female') || lower.includes('woman') || lower.includes('girl')) return '👩'
  if (lower.includes('orc') || lower.includes('goblin') || lower.includes('monster') || lower.includes('ogre')) return '👹'
  if (lower.includes('skeleton') || lower.includes('zombie') || lower.includes('undead')) return '💀'
  if (lower.includes('dragon') || lower.includes('beast') || lower.includes('demon')) return '🐉'
  return '👤'
}

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
  isChangeUnitModalOpen.value = true
}

function saveUnitSelection() {
  if (tempSelectedUnitModel.value) {
    characterStore.setWaveCharacterModel(tempSelectedUnitModel.value)
  }
  isChangeUnitModalOpen.value = false
}

const projectileOptions = [
  { id: 'fireball', name: 'Fireball', icon: '🔥' },
  { id: 'arrow', name: 'Arrow', icon: '🏹' },
  { id: 'magic_bolt', name: 'Magic Bolt', icon: '⚡' },
  { id: 'cannonball', name: 'Cannonball', icon: '💣' },
  { id: 'frost_bolt', name: 'Frost Bolt', icon: '❄️' },
  { id: 'laser', name: 'Laser Beam', icon: '🔴' },
  { id: 'missile', name: 'Missile', icon: '🚀' },
]

// Change Sprite Modal State
const isChangeSpriteModalOpen = ref(false)
const spriteModalSearchQuery = ref('')
const selectedSpriteCategory = ref('all')
const tempSelectedAssetId = ref('')

const spriteCategories = [
  { id: 'all', label: 'All' },
  { id: 'walls', label: 'Walls & Towers' },
  { id: 'ground', label: 'Ground' },
  { id: 'stairs', label: 'Stairs' },
  { id: 'props', label: 'Props & Objects' },
]

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
