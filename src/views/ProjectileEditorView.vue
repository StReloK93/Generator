<template>
  <div class="h-dvh max-h-dvh w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
    <!-- TOP HEADER -->
    <header class="h-14 shrink-0 bg-slate-900/90 border-b border-slate-800/80 px-4 flex items-center justify-between z-20 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="ArrowLeft"
          @click="handleBack"
        >
          {{ t('common.back') }}
        </UiButton>

        <div class="h-5 w-px bg-slate-800" />

        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crosshair class="w-4 h-4" />
          </div>
          <div>
            <h1 class="text-sm font-bold text-slate-100 leading-none">
              {{ t('projectiles.studioTitle') || 'Projectile Studio' }}
            </h1>
            <span class="text-[10px] text-slate-400 font-medium">
              {{ t('projectiles.studioSubtitle') || 'Unified Composable Projectile Engine' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <UiButton
          variant="game-green"
          size="sm"
          :leading-icon="Plus"
          @click="handleCreateClean"
        >
          {{ t('common.create') }}
        </UiButton>

        <UiButton
          :variant="isCopied ? 'game-green' : 'game-amber'"
          size="sm"
          :leading-icon="isCopied ? Check : Copy"
          @click="handleCopyJson"
        >
          {{ isCopied ? 'Copied JSON!' : 'Copy JSON' }}
        </UiButton>

        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="ClipboardPaste"
          @click="handlePasteJson"
        >
          Paste JSON
        </UiButton>

        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="Download"
          @click="projectileStore.exportProjectilesJson"
        >
          {{ t('projectiles.exportJson') }}
        </UiButton>

        <UiButton
          variant="secondary"
          size="sm"
          :leading-icon="RotateCcw"
          @click="confirmResetDefaults"
        >
          {{ t('common.reset') }}
        </UiButton>

        <div class="h-5 w-px bg-slate-800 mx-1" />
        <UiLanguageSwitcher />
      </div>
    </header>

    <!-- MAIN 3-COLUMN STUDIO WORKSPACE -->
    <div class="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-slate-950">
      <!-- 1. LEFT COLUMN: PROJECTILES LIST WITH ARCHETYPE TABS -->
      <div class="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-800/80">
        <!-- Search bar -->
        <div class="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <UiInput
            v-model="searchQuery"
            size="sm"
            :placeholder="t('projectiles.search')"
            :leading-icon="Search"
            class="flex-1"
          />
          <UiBadge variant="amber" size="sm">
            {{ filteredProjectiles.length }}
          </UiBadge>
        </div>

        <!-- Archetype Filter Tabs -->
        <div class="p-2 border-b border-slate-800/80 flex flex-wrap gap-1 bg-slate-950/40">
          <button
            type="button"
            :class="[
              'px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border shrink-0 flex items-center gap-1',
              activeFilterTab === 'all'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            @click="activeFilterTab = 'all'"
          >
            <Sparkles class="w-3 h-3" />
            <span>Barchasi</span>
          </button>

          <button
            v-for="arch in PROJECTILE_ARCHETYPES"
            :key="arch.id"
            type="button"
            :class="[
              'px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer border shrink-0 flex items-center gap-1',
              activeFilterTab === arch.id
                ? 'bg-slate-800 border-amber-400 text-amber-300 shadow-xs ring-1 ring-amber-400/40'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            ]"
            @click="activeFilterTab = arch.id"
          >
            <component :is="arch.icon" class="w-3 h-3" />
            <span>{{ arch.nameUz.split(' ')[0] }}</span>
          </button>
        </div>

        <!-- Projectiles list items -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          <div
            v-for="proj in filteredProjectiles"
            :key="proj.identity.id"
            :class="[
              'flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer',
              selectedId === proj.identity.id
                ? 'bg-amber-500/15 border-amber-400/80 shadow-md ring-1 ring-amber-400/30'
                : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
            ]"
            @click="selectedId = proj.identity.id"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <div 
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border relative"
                :style="{ backgroundColor: `${proj.visual.colorCss}20`, borderColor: `${proj.visual.colorCss}50` }"
              >
                <div class="w-3 h-3 rounded-full shadow-sm" :style="{ backgroundColor: proj.visual.colorCss }" />
              </div>

              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-bold text-slate-100 truncate">
                    {{ getLocalizedName(proj) }}
                  </span>
                  <span 
                    class="text-[8px] font-bold px-1 py-0.2 rounded border uppercase tracking-wider"
                    :class="getArchetypeMeta(proj).badgeClass"
                  >
                    {{ getArchetypeMeta(proj).nameUz.split(' ')[0] }}
                  </span>
                </div>
                <span class="text-[10px] text-slate-400 capitalize truncate">
                  {{ proj.identity.category }} • {{ proj.movement.isInstant ? (proj.movement.instantType || 'instant') : proj.visual.shape }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-1">
              <UiIconButton
                variant="ghost"
                size="xs"
                :icon="Copy"
                title="Duplicate"
                @click.stop="duplicateProjectile(proj.identity.id)"
              />
              <UiIconButton
                v-if="proj.identity.isCustom"
                variant="danger"
                size="xs"
                :icon="Trash2"
                title="Delete"
                @click.stop="deleteProjectile(proj.identity.id)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 2. CENTER COLUMN: LIVE PIXIJS ARENA PREVIEW -->
      <div class="w-full lg:w-96 xl:w-110 shrink-0 flex flex-col justify-between p-3.5 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-y-auto custom-scrollbar">
        <!-- Top HUD Badge -->
        <div class="flex items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg">
            <span 
              class="w-2.5 h-2.5 rounded-full animate-pulse shadow-sm"
              :style="{ backgroundColor: currentForm.visual.colorCss }"
            />
            <span class="text-xs font-bold text-slate-100 truncate max-w-36 sm:max-w-48">
              {{ getLocalizedName(currentForm) }}
            </span>
            <UiBadge variant="amber" size="xs">
              {{ currentArchetypeMeta.nameUz }}
            </UiBadge>
          </div>

          <span class="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
            PixiJS 8 Arena
          </span>
        </div>

        <!-- Firing Direction Modes Selector -->
        <div class="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mb-2 overflow-x-auto custom-scrollbar">
          <button
            v-for="mode in aimModes"
            :key="mode.id"
            type="button"
            :class="[
              'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap',
              aimMode === mode.id
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs'
                : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
            ]"
            @click="aimMode = mode.id"
          >
            {{ mode.label }}
          </button>
        </div>

        <!-- Dedicated Square 1:1 Live Arena Canvas -->
        <div 
          class="relative w-full aspect-square max-w-88 sm:max-w-96 xl:max-w-105 mx-auto rounded-3xl bg-slate-950 border border-slate-800/90 shadow-2xl overflow-hidden my-auto flex items-center justify-center group cursor-crosshair"
          @click="spawnManualShot"
        >
          <canvas ref="arenaCanvasRef" class="w-full h-full block"></canvas>

          <!-- Top-Right Mode Badge -->
          <div class="absolute top-3 right-3 pointer-events-none flex flex-col items-end gap-1">
            <span 
              class="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border shadow-md"
              :class="currentArchetypeMeta.badgeClass"
            >
              {{ currentArchetypeMeta.nameUz.toUpperCase() }}
            </span>
            <span class="text-[9px] font-mono font-bold text-cyan-300 bg-cyan-950/90 px-2 py-0.5 rounded-md border border-cyan-800/60 shadow-md uppercase">
              {{ aimMode }}
            </span>
          </div>

          <div class="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700/80 text-[10px] text-slate-300 shadow-lg">
            {{ t('projectiles.clickArenaHint') || 'Bosing: snaryad otish' }}
          </div>
        </div>

        <!-- Bottom Controls -->
        <div class="flex flex-col gap-2 mt-2.5">
          <div class="flex items-center justify-between gap-2">
            <UiButton
              variant="game-amber"
              size="sm"
              :leading-icon="Zap"
              custom-class="flex-1"
              @click="spawnManualShot"
            >
              {{ t('header.playTest') }} ({{ t('common.start') }})
            </UiButton>
            <div class="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-slate-800">
              <span>{{ t('common.speed') }}:</span>
              <span class="font-mono text-amber-400 font-bold">{{ shootIntervalSec }}s</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. RIGHT COLUMN: PROPERTIES INSPECTOR (ALL IN ONE CONTINUOUS PAGE) -->
      <div class="flex-1 flex flex-col overflow-hidden bg-slate-900/40 min-w-0">
        <!-- Sticky Section Header -->
        <div class="px-4 py-3 border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span class="text-xs font-bold text-slate-100 uppercase tracking-wider">
              {{ t('projectiles.studioTitle') }}
            </span>
          </div>
          <span class="text-[11px] font-mono text-slate-400">
            {{ currentForm.identity.id }}
          </span>
        </div>

        <!-- Single Continuous Scrollable Form -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-5">
          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- 0. TOP ARCHETYPE SELECTOR CARDS (5 Prominent Delivery Types) -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-amber-400 uppercase tracking-wide">
              Snaryadning Asosiy Turi (Delivery Type Archetype)
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
              <button
                v-for="arch in PROJECTILE_ARCHETYPES"
                :key="arch.id"
                type="button"
                :class="[
                  'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1',
                  currentArchetype === arch.id
                    ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400/50 shadow-md scale-[1.01]'
                    : 'bg-slate-900/90 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                ]"
                @click="switchArchetype(arch.id)"
              >
                <div class="flex items-center gap-2">
                  <div 
                    class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border"
                    :class="arch.badgeClass"
                  >
                    <component :is="arch.icon" class="w-3.5 h-3.5" />
                  </div>
                  <span class="text-xs font-bold text-slate-100 leading-tight">
                    {{ arch.nameUz }}
                  </span>
                </div>
                <span class="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {{ arch.descUz }}
                </span>
              </button>
            </div>
          </div>

          <div class="h-px bg-slate-800/80" />

          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- 1. SHAPE & VISUAL SECTION -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800/60">
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wide">
                1. {{ t('projectiles.tabShape') || 'Visual & Shape' }}
              </span>
              <span class="text-[10px] font-mono text-slate-400 uppercase">
                {{ currentArchetypeMeta.nameUz }}
              </span>
            </div>

            <!-- Name Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UiInput
                v-model="currentForm.identity.name"
                :label="t('projectiles.englishName')"
                placeholder="e.g. Phoenix Flame Bolt"
              />
              <UiInput
                v-model="currentForm.identity.nameUz"
                :label="t('projectiles.uzbekName')"
                placeholder="e.g. Fenix Olovli Nayzasi"
              />
            </div>

            <!-- Category & Specific Shape/Method -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">{{ t('projectiles.category') }}</label>
                <select
                  v-model="currentForm.identity.category"
                  class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                >
                  <option value="fire">Fire / Inferno (Olov)</option>
                  <option value="frost">Frost / Ice (Muz)</option>
                  <option value="electro">Electro / Storm (Chaqmoq)</option>
                  <option value="poison">Poison / Nature (Zahar)</option>
                  <option value="arcane">Arcane / Cosmic (Sehr)</option>
                  <option value="void">Void / Blood (Zulmat)</option>
                  <option value="siege">Siege / Physical (Qamal)</option>
                  <option value="holy">Holy / Radiant (Nur)</option>
                  <option value="custom">Custom / Studio (Maxsus)</option>
                </select>
              </div>

              <!-- Context-specific Shape / Method selector -->
              <div>
                <!-- 1. Flying Projectiles Shapes -->
                <div v-if="currentArchetype === 'flying'">
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">Uchuvchi O'q Ko'rinishi (Visual Shape)</label>
                  <select
                    v-model="currentForm.visual.shape"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="arrow">Arrow (Kamon O'qi)</option>
                    <option value="procedural_flame">Procedural Flame Comet (Olov Kometa)</option>
                    <option value="rocket">Aerodynamic Rocket (Raketa)</option>
                    <option value="diamond_shard">Diamond Crystal Shard (Olmos Kristall)</option>
                    <option value="star">Radiant Star (Yulduz)</option>
                    <option value="energy_orb">Energy Orb (Plazma Shari)</option>
                    <option value="energy_wave">Energy Wave Blade (To'lqin Tig'i)</option>
                    <option value="shuriken">Shuriken</option>
                    <option value="sawblade">Sawblade (Aylanuvchi Arra)</option>
                    <option value="lightning_bolt">Lightning Bolt (Chaqmoq Nayzasi)</option>
                    <option value="line_streak">Line Streak (Nur Chizig'i)</option>
                    <option value="sand_cluster">Sand Cluster (Qum To'dasi)</option>
                    <option value="circle">Circle / Orb (Oddiy Shar)</option>
                  </select>
                </div>

                <!-- 2. Sky Strikes Methods & Falling Shape -->
                <div v-else-if="currentArchetype === 'sky_strike'" class="space-y-2">
                  <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1.5">Osmondan Tushish Uslubi (Sky Strike Method)</label>
                    <select
                      v-model="currentForm.movement.instantType"
                      class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="sky_thunder">Osmondan tushuvchi chaqmoq (Sky Thunder Bolt)</option>
                      <option value="heavenly_pillar">Ilohiy nur ustuni (Radiant Holy Light Pillar)</option>
                      <option value="meteor_fall">Olovli meteorit qulashi (Flaming Meteor Strike)</option>
                      <option value="solar_beam">Quyosh orbital lazer nuri (Orbital Solar Beam)</option>
                      <option value="arrow_rain">Osmondan yog'iluvchi kamon o'qlari (Rain of Arrows)</option>
                      <option value="holy_spear">Ilohiy nur nayzasi (Holy Spear of Light)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-400 mb-1.5">Tushuvchi O'q/Snaryad Shakli (Falling Visual Shape)</label>
                    <select
                      v-model="currentForm.visual.shape"
                      class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="instant_strike">Standart / Nur Ustuni (Default Strike Ray)</option>
                      <option value="arrow">Kamon O'qi (Arrow)</option>
                      <option value="procedural_flame">Olovli Meteorit Kometa (Flame Comet)</option>
                      <option value="rocket">Hujum Raketasi (Airstrike Rocket)</option>
                      <option value="diamond_shard">Olmos / Muz Kristalli (Diamond Shard)</option>
                      <option value="star">Ilohiy Yulduz (Radiant Star)</option>
                      <option value="energy_orb">Plazma Shari (Energy Orb)</option>
                      <option value="shuriken">Shuriken</option>
                      <option value="sawblade">Aylanuvchi Arra (Sawblade)</option>
                      <option value="lightning_bolt">Chaqmoq Nayzasi (Lightning Bolt)</option>
                      <option value="circle">Shar (Circle / Orb)</option>
                    </select>
                  </div>
                </div>

                <!-- 3. Ground Bursts Methods -->
                <div v-else-if="currentArchetype === 'ground_burst'">
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">Yerdan Otilish Uslubi (Ground Burst Method)</label>
                  <select
                    v-model="currentForm.movement.instantType"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="ground_fissure">Yer yorig'i / Magma razlomi (Earth Fissure)</option>
                    <option value="magma_geyser">Qaynoq magma geyzeri (Magma Geyser Eruption)</option>
                    <option value="frost_spikes">Muz nayzalari otilishi (Frost Spikes Eruption)</option>
                    <option value="poison_roots">Zaharli tikanli ildizlar (Poison Bramble Thorns)</option>
                    <option value="void_portal">Qora tuynuk razlomi (Void Abyss Rift)</option>
                    <option value="quake_stomp">Yer titrashi to'lqini (Seismic Shockwave Eruption)</option>
                  </select>
                </div>

                <!-- 4. Unit Aura Methods -->
                <div v-else-if="currentArchetype === 'unit_aura'">
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">Aura va Girdob Uslubi (Unit Aura Method)</label>
                  <select
                    v-model="currentForm.movement.instantType"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="unit_singularity">Gravitatsion qora nuqta (Gravity Singularity)</option>
                    <option value="swirling_blades">Aylanuvchi po'lat tig'lar (Orbiting Blade Ring)</option>
                    <option value="frost_nova">Muz portlashi to'lqini (Frost Nova Burst)</option>
                    <option value="void_vortex">Qonli qora girdob (Void Blood Vortex)</option>
                    <option value="poison_cloud">Zaharli gaz buluti (Toxic Cloud Explosion)</option>
                    <option value="electric_discharge">Statik elektr razryad (Static Electro Discharge)</option>
                    <option value="rune_seal">Qadimiy runik doira (Arcane Rune Seal)</option>
                    <option value="holy_halo">Ilohiy jannat nuri (Radiant Sacred Halo)</option>
                  </select>
                </div>

                <!-- 5. Laser Beam -->
                <div v-else-if="currentArchetype === 'laser'">
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">Lazer Nuri Uslubi (Laser Style)</label>
                  <select
                    v-model="currentForm.formation.type"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="laser_beam">Continuous Focused Laser (Uzluksiz fokuslangan nur)</option>
                    <option value="single">Pulsing Beam (Pulsatsiyalanuvchi nur)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Visual Sliders -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UiSlider
                v-model="currentForm.visual.size"
                label="Size"
                :min="3"
                :max="32"
                :step="1"
              />
              <UiSlider
                v-model="currentForm.visual.scale"
                label="Scale Multiplier"
                :min="0.4"
                :max="2.5"
                :step="0.05"
              />
              <UiSlider
                v-model="currentForm.visual.length"
                label="Length / Height"
                :min="10"
                :max="90"
                :step="2"
              />
            </div>

            <!-- Colors -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UiColorPicker
                v-model="currentForm.visual.colorCss"
                label="Main Color"
                @update:model-value="syncHexColors"
              />
              <UiColorPicker
                v-model="currentForm.visual.glowColorCss"
                label="Glow Color"
                @update:model-value="syncHexColors"
              />
              <UiColorPicker
                v-model="currentForm.visual.coreColorCss"
                label="Core Color"
                @update:model-value="syncHexColors"
              />
            </div>
          </div>

          <div class="h-px bg-slate-800/80" />

          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- 2. MOVEMENT & FORMATION SECTION -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800/60">
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wide">
                2. {{ t('projectiles.tabMovement') || 'Movement & Formation' }}
              </span>
            </div>

            <!-- Flying-specific Controls -->
            <div v-if="currentArchetype === 'flying'" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UiSlider
                  v-model="currentForm.movement.speed"
                  label="Flight Speed (cells/s)"
                  :min="4"
                  :max="40"
                  :step="1"
                />
                <div>
                  <label class="block text-xs font-semibold text-slate-400 mb-1.5">Formation Pattern (Shakllanish sxemasi)</label>
                  <select
                    v-model="currentForm.formation.type"
                    class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="single">Single (Yakka to'g'ri o'q)</option>
                    <option value="single_helix">Single Helix (1-talik 3D spiral / zigzag to'lqin)</option>
                    <option value="volley_3">Volley 3 (3-talik parallel o'q)</option>
                    <option value="volley_5">Volley 5 (5-talik keng volley)</option>
                    <option value="twin_helix">Twin Helix (3D Qo'shaloq spiral)</option>
                    <option value="triple_helix">Triple Helix (3D Uchtalik spiral)</option>
                    <option value="fan_spread">Fan Spread (5-talik yelpog'ich sochilish)</option>
                    <option value="ring_burst">Ring Burst (6-talik doiraviy zarb)</option>
                    <option value="cluster_burst">Cluster Burst (3-talik to'p zarbasi)</option>
                    <option value="staggered_burst">Staggered Burst (Ketma-ket 3-talik o'q)</option>
                    <option value="satellites">Satellites (Aylanuvchi sun'iy yo'ldoshlar)</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <UiSwitch
                  v-model="currentForm.movement.hasArc"
                  label="Ballistic 3D Arc (Parabolik Traektoriya & Soya)"
                />
                <div v-if="currentForm.formation.type === 'satellites'">
                  <UiSlider
                    v-model="currentForm.formation.satelliteCount"
                    label="Satellite Orbiters Count"
                    :min="0"
                    :max="6"
                    :step="1"
                  />
                </div>
              </div>
            </div>

            <!-- Sky Strike / Ground Burst / Unit Aura / Laser Controls -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UiSlider
                v-model="currentForm.movement.speed"
                label="Attack Cadence / Speed"
                :min="10"
                :max="40"
                :step="1"
              />
              <div v-if="currentArchetype === 'unit_aura'">
                <UiSlider
                  v-model="currentForm.formation.satelliteCount"
                  label="Orbiting Items / Blades Count"
                  :min="0"
                  :max="8"
                  :step="1"
                />
              </div>
            </div>
          </div>

          <div class="h-px bg-slate-800/80" />

          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- 3. TRAIL & IMPACT SECTION -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <div class="space-y-4">
            <div class="flex items-center justify-between pb-1 border-b border-slate-800/60">
              <span class="text-xs font-bold text-amber-400 uppercase tracking-wide">
                3. {{ t('projectiles.tabImpact') || 'Trail & Impact' }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-if="currentArchetype === 'flying'">
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Trail Style</label>
                <select
                  v-model="currentForm.trail.style"
                  class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                >
                  <option value="none">None (Dumsiz)</option>
                  <option value="solid_line">Solid Line (Silliq chiziq)</option>
                  <option value="glow_streak">Glow Streak (Nurli iz)</option>
                  <option value="particles">Particles / Sparks (Zarrachalar)</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-400 mb-1.5">Impact Spark Type</label>
                <select
                  v-model="currentForm.impact.sparkType"
                  class="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                >
                  <option value="fire_ember">Fire Ember (Olov cho'g'lari)</option>
                  <option value="ice_shard">Ice Shard (Muz parchalari)</option>
                  <option value="snowflake">Snowflake (Qor parchalari)</option>
                  <option value="lightning_arc">Lightning Arc (Elektr yoylari)</option>
                  <option value="acid_drop">Acid Drop (Kislota tomchilari)</option>
                  <option value="arcane_star">Arcane Star (Sehrli yulduzlar)</option>
                  <option value="void_blood">Void Blood (Zulmat qoni)</option>
                  <option value="sand_dust">Sand Dust (Qum changi)</option>
                  <option value="spark_line">Spark Line (Nur chiziqlari)</option>
                  <option value="holy_cross">Holy Cross (Ilohiy xochlar)</option>
                  <option value="shrapnel">Shrapnel (Po'lat parchalari)</option>
                  <option value="default">Default</option>
                </select>
              </div>
            </div>

            <!-- Trail & Spark Sliders -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UiSlider
                v-if="currentArchetype === 'flying'"
                v-model="currentForm.trail.length"
                label="Trail Length"
                :min="2"
                :max="24"
                :step="1"
              />
              <UiSlider
                v-if="currentArchetype === 'flying' || currentArchetype === 'laser'"
                v-model="currentForm.trail.width"
                :label="currentArchetype === 'laser' ? 'Beam Width' : 'Trail Width'"
                :min="1"
                :max="16"
                :step="1"
              />
              <UiSlider
                v-model="currentForm.impact.sparkCount"
                label="Impact Spark Count"
                :min="4"
                :max="40"
                :step="2"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UiSlider
                v-model="currentForm.impact.shockwaveRadius"
                label="Shockwave Radius"
                :min="10"
                :max="60"
                :step="2"
              />
              <UiSwitch
                v-model="currentForm.impact.hasDoubleRing"
                label="Double Shockwave Ring"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <UiColorPicker
                v-if="currentArchetype === 'flying'"
                v-model="currentForm.trail.colorCss"
                label="Trail Color"
                @update:model-value="syncHexColors"
              />
              <UiColorPicker
                v-model="currentForm.impact.sparkColorCss"
                label="Spark Color"
                @update:model-value="syncHexColors"
              />
              <UiColorPicker
                v-model="currentForm.impact.shockwaveColorCss"
                label="Shockwave Color"
                @update:model-value="syncHexColors"
              />
            </div>
          </div>

          <div class="h-px bg-slate-800/80" />

          <!-- ══════════════════════════════════════════════════════════ -->
          <!-- 4. JSON SCHEMA SECTION -->
          <!-- ══════════════════════════════════════════════════════════ -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-slate-300">4. Portable ProjectileDefinition JSON</span>
              <UiButton
                variant="game-amber"
                size="xs"
                :leading-icon="Copy"
                @click="handleCopyJson"
              >
                Copy JSON
              </UiButton>
            </div>
            <pre class="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-[11px] font-mono text-amber-300 overflow-x-auto max-h-60 custom-scrollbar select-text">{{ JSON.stringify(currentForm, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- JSON Import / Paste Modal -->
    <UiModal
      v-model:is-open="showPasteModal"
      title="Snaryad JSON Import / Paste"
      size="md"
    >
      <div class="space-y-3 p-1">
        <p class="text-xs text-slate-400 leading-relaxed">
          Quyidagi maydonga <code class="text-amber-400 font-mono">ProjectileDefinition</code> JSON kodini joylashtiring va "Import Qilish" tugmasini bosing:
        </p>
        <textarea
          v-model="pasteModalText"
          rows="14"
          placeholder='{"identity": {"name": "Maxsus Snaryad", ...}, "visual": {...}}'
          class="w-full bg-slate-950 border border-slate-700/80 rounded-2xl p-3 text-xs font-mono text-amber-300 focus:outline-hidden focus:ring-1 focus:ring-amber-400 custom-scrollbar select-text"
        />
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <UiButton
            variant="secondary"
            size="sm"
            @click="showPasteModal = false"
          >
            Bekor qilish
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :leading-icon="ClipboardPaste"
            @click="submitPasteModal"
          >
            Import Qilish
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Application, Graphics } from 'pixi.js'
import {
  ArrowLeft, Crosshair, Plus, Copy, Check, Download, RotateCcw,
  Search, Zap, Trash2, ClipboardPaste, Sparkles
} from 'lucide-vue-next'
import { useI18n } from '../stores/i18nStore'
import { useProjectileStore } from '../stores/projectileStore'
import { useNotificationStore } from '../stores/notificationStore'
import { ProjectileRenderer } from '../rendering/pixi/ProjectileRenderer'
import {
  PROJECTILE_ARCHETYPES,
  getProjectileArchetype,
  applyProjectileArchetype
} from '../utils/projectileCatalog'
import { ProjectileDefinition, ProjectileArchetype } from '../types/projectile'
import UiButton from '../components/ui/UiButton.vue'
import UiIconButton from '../components/ui/UiIconButton.vue'
import UiInput from '../components/ui/UiInput.vue'
import UiSlider from '../components/ui/UiSlider.vue'
import UiSwitch from '../components/ui/UiSwitch.vue'
import UiBadge from '../components/ui/UiBadge.vue'
import UiColorPicker from '../components/ui/UiColorPicker.vue'
import UiLanguageSwitcher from '../components/ui/UiLanguageSwitcher.vue'
import UiModal from '../components/ui/UiModal.vue'

const router = useRouter()
const { t, currentLocale } = useI18n()
const projectileStore = useProjectileStore()
const notify = useNotificationStore()

const searchQuery = ref('')
const activeFilterTab = ref<string>('all')
const selectedId = ref('fireball')
const isCopied = ref(false)
const showPasteModal = ref(false)
const pasteModalText = ref('')

const aimModes = [
  { id: 'single', label: 'Isometric Arc (3D)' },
  { id: 'moving', label: 'Moving Target (Jonli)' },
  { id: 'multi', label: 'Multi Arc (5-Way)' },
  { id: 'stream', label: 'Continuous Stream' },
]
const aimMode = ref('single')
const shootIntervalSec = ref(0.6)

const arenaCanvasRef = ref<HTMLCanvasElement | null>(null)
let app: Application | null = null
let combatGraphics: Graphics | null = null

interface ActiveProj {
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  progress: number
  speed: number
  offsetPerp?: number
  phaseOffset?: number
  isHelix?: boolean
  def: ProjectileDefinition
  trail: { x: number; y: number; alpha: number; size: number }[]
}

interface ActiveRing {
  x: number
  y: number
  r: number
  maxR: number
  color: number
  alpha: number
}

interface ActiveSpark {
  x: number
  y: number
  vx: number
  vy: number
  color: number
  alpha: number
  size: number
  life: number
}

interface ActiveStrike {
  x: number
  y: number
  life: number
  maxLife: number
  def: ProjectileDefinition
}

const activeProjectiles: ActiveProj[] = []
const activeRings: ActiveRing[] = []
const activeSparks: ActiveSpark[] = []
const activeStrikes: ActiveStrike[] = []

const currentForm = computed<ProjectileDefinition>(() => {
  return projectileStore.getProjectile(selectedId.value)
})

const currentArchetype = computed<ProjectileArchetype>(() => {
  return getProjectileArchetype(currentForm.value)
})

const currentArchetypeMeta = computed(() => {
  return PROJECTILE_ARCHETYPES.find(a => a.id === currentArchetype.value) || PROJECTILE_ARCHETYPES[0]
})

function getArchetypeMeta(proj: ProjectileDefinition) {
  const arch = getProjectileArchetype(proj)
  return PROJECTILE_ARCHETYPES.find(a => a.id === arch) || PROJECTILE_ARCHETYPES[0]
}

const filteredProjectiles = computed(() => {
  let list = projectileStore.allProjectiles
  if (activeFilterTab.value !== 'all') {
    list = list.filter(p => getProjectileArchetype(p) === activeFilterTab.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(p =>
      p.identity.name.toLowerCase().includes(q) ||
      (p.identity.nameUz && p.identity.nameUz.toLowerCase().includes(q)) ||
      p.visual.shape.toLowerCase().includes(q) ||
      (p.movement.instantType && p.movement.instantType.toLowerCase().includes(q))
    )
  }
  return list
})

function switchArchetype(newArch: ProjectileArchetype) {
  applyProjectileArchetype(currentForm.value, newArch)
  syncHexColors()
  notify.info(`Snaryad turi: ${getArchetypeMeta(currentForm.value).nameUz}`)
}

function getLocalizedName(proj?: ProjectileDefinition): string {
  if (!proj) return ''
  return (currentLocale.value === 'uz' && proj.identity.nameUz) ? proj.identity.nameUz : proj.identity.name
}

function handleBack() {
  router.push('/play')
}

function handleCreateClean() {
  const blank = projectileStore.createBlankProjectile()
  selectedId.value = blank.identity.id
  notify.success('Yangi snaryad yaratildi')
}

async function handleCopyJson() {
  const jsonStr = JSON.stringify(currentForm.value, null, 2)
  try {
    await navigator.clipboard.writeText(jsonStr)
    isCopied.value = true
    notify.success('ProjectileDefinition JSON klipbordga nusxalandi!')
    setTimeout(() => { isCopied.value = false }, 2000)
  } catch {
    // Fallback: open modal showing the JSON so user can copy
    pasteModalText.value = jsonStr
    showPasteModal.value = true
    notify.info('JSON nusxalash uchun quyidagi oynadan oling')
  }
}

async function handlePasteJson() {
  try {
    const text = await navigator.clipboard.readText()
    if (text && text.trim().startsWith('{')) {
      const res = projectileStore.importProjectileFromJson(text)
      if (res.success && res.data) {
        selectedId.value = res.data.identity.id
        notify.success(`Snaryad "${res.data.identity.name}" muvaffaqiyatli import qilindi!`)
        return
      }
    }
  } catch {
    // Clipboard permission not granted or unsupported
  }
  // Open modal fallback
  pasteModalText.value = ''
  showPasteModal.value = true
}

function submitPasteModal() {
  if (!pasteModalText.value.trim()) {
    notify.error('JSON matnini kiriting')
    return
  }
  const res = projectileStore.importProjectileFromJson(pasteModalText.value)
  if (res.success && res.data) {
    selectedId.value = res.data.identity.id
    showPasteModal.value = false
    notify.success(`Snaryad "${res.data.identity.name}" muvaffaqiyatli import qilindi!`)
  } else {
    notify.error(res.error || 'JSON formati noto\'g\'ri')
  }
}

function duplicateProjectile(id: string) {
  const cloned = projectileStore.duplicateProjectile(id)
  if (cloned) {
    selectedId.value = cloned.identity.id
    notify.success('Nusxa yaratildi')
  }
}

function deleteProjectile(id: string) {
  projectileStore.deleteProjectile(id)
  selectedId.value = projectileStore.allProjectiles[0]?.identity.id || 'fireball'
  notify.info('Snaryad o\'chirildi')
}

function confirmResetDefaults() {
  if (confirm('Barcha snaryadlarni standart holatga qaytarishni xohlaysizmi?')) {
    projectileStore.resetToDefaults()
    selectedId.value = 'fireball'
    notify.success('Standart holat tiklandi')
  }
}

function syncHexColors() {
  const parseCss = (css: string, fallback: number) => {
    if (!css) return fallback
    if (css.startsWith('#')) {
      const v = parseInt(css.slice(1), 16)
      return isNaN(v) ? fallback : v
    }
    return fallback
  }

  currentForm.value.visual.colorHex = parseCss(currentForm.value.visual.colorCss, 0xf97316)
  if (currentForm.value.visual.glowColorCss) {
    currentForm.value.visual.glowColorHex = parseCss(currentForm.value.visual.glowColorCss, currentForm.value.visual.colorHex)
  }
  if (currentForm.value.visual.coreColorCss) {
    currentForm.value.visual.coreColorHex = parseCss(currentForm.value.visual.coreColorCss, 0xffffff)
  }
  if (currentForm.value.trail.colorCss) {
    currentForm.value.trail.colorHex = parseCss(currentForm.value.trail.colorCss, currentForm.value.visual.colorHex)
  }
  if (currentForm.value.impact.sparkColorCss) {
    currentForm.value.impact.sparkColorHex = parseCss(currentForm.value.impact.sparkColorCss, currentForm.value.visual.colorHex)
  }
  if (currentForm.value.impact.shockwaveColorCss) {
    currentForm.value.impact.shockwaveColorHex = parseCss(currentForm.value.impact.shockwaveColorCss, 0xef4444)
  }
}

async function initPixi() {
  if (!arenaCanvasRef.value) return

  app = new Application()
  await app.init({
    canvas: arenaCanvasRef.value,
    width: 400,
    height: 400,
    background: 0x020617,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    antialias: true,
  })

  combatGraphics = new Graphics()
  app.stage.addChild(combatGraphics)

  app.ticker.add((ticker) => {
    updateArena(ticker.deltaTime / 60)
  })
}

let shotCounter = 0
let movingTargetAngle = 0

function spawnManualShot() {
  if (!app) return
  const w = app.screen.width
  const h = app.screen.height

  // Isometric Tower Position (Bottom-Left pedestal)
  const startX = w * 0.22
  const startY = h * 0.74

  // Target Position (Top-Right creep base)
  let targetX = w * 0.74
  let targetY = h * 0.34

  if (aimMode.value === 'moving') {
    targetX = w * 0.58 + Math.cos(movingTargetAngle) * (w * 0.22)
    targetY = h * 0.40 + Math.sin(movingTargetAngle) * (h * 0.12)
  } else if (aimMode.value === 'multi') {
    const offsets = [
      { dx: 0, dy: 0 },
      { dx: -w * 0.16, dy: h * 0.08 },
      { dx: w * 0.14, dy: -h * 0.08 },
      { dx: -w * 0.28, dy: h * 0.16 },
      { dx: w * 0.22, dy: -h * 0.14 },
    ]
    const off = offsets[shotCounter % offsets.length]
    shotCounter++
    targetX += off.dx
    targetY += off.dy
  } else if (aimMode.value === 'stream') {
    targetX += (Math.random() - 0.5) * 35
    targetY += (Math.random() - 0.5) * 25
  }

  const def = currentForm.value
  const arch = currentArchetype.value

  if (arch === 'sky_strike' || arch === 'ground_burst') {
    activeStrikes.push({
      x: targetX,
      y: targetY,
      life: 0.45,
      maxLife: 0.45,
      def,
    })
    handleImpact({ targetX, targetY, def })
    return
  }

  if (arch === 'unit_aura') {
    handleImpact({ targetX, targetY, def })
    return
  }

  const dist = Math.hypot(targetX - startX, targetY - startY) || 1
  const speed = Math.max(1, def.movement.speed * 20)
  const durationSec = Math.max(0.25, dist / speed)
  const formationType = def.formation?.type || 'single'

  const pushProj = (offsetPerp = 0, phaseOffset = 0, isHelix = false, progOffset = 0) => {
    activeProjectiles.push({
      startX,
      startY,
      targetX,
      targetY,
      currentX: startX,
      currentY: startY,
      progress: progOffset,
      speed: 1 / durationSec,
      offsetPerp,
      phaseOffset,
      isHelix,
      def,
      trail: []
    })
  }

  if (formationType === 'single_helix') {
    pushProj(14, 0, true)
  } else if (formationType === 'volley_3') {
    pushProj(-18, 0, false)
    pushProj(0, 0, false)
    pushProj(18, 0, false)
  } else if (formationType === 'volley_5') {
    pushProj(-28, 0, false)
    pushProj(-14, 0, false)
    pushProj(0, 0, false)
    pushProj(14, 0, false)
    pushProj(28, 0, false)
  } else if (formationType === 'twin_helix') {
    pushProj(14, 0, true)
    pushProj(14, Math.PI, true)
  } else if (formationType === 'triple_helix') {
    pushProj(15, 0, true)
    pushProj(15, (2 * Math.PI) / 3, true)
    pushProj(15, (4 * Math.PI) / 3, true)
  } else if (formationType === 'fan_spread') {
    const fanOffsets = [-32, -16, 0, 16, 32]
    fanOffsets.forEach((off) => pushProj(off, 0, false))
  } else if (formationType === 'ring_burst') {
    const ringCount = 6
    for (let r = 0; r < ringCount; r++) {
      const ang = (Math.PI * 2 * r) / ringCount
      pushProj(Math.sin(ang) * 22, ang, false)
    }
  } else if (formationType === 'cluster_burst') {
    pushProj(-10, 0, false)
    pushProj(0, 0.4, false)
    pushProj(10, 0.8, false)
  } else if (formationType === 'staggered_burst') {
    pushProj(-6, 0, false, 0)
    pushProj(0, 0, false, -0.15)
    pushProj(6, 0, false, -0.30)
  } else {
    pushProj(0, 0, false)
  }
}

function handleImpact(p: { targetX: number; targetY: number; def: ProjectileDefinition }) {
  const def = p.def
  const sparkCount = def.impact.sparkCount || 16
  const sparkColor = def.impact.sparkColorHex || 0xfbbf24

  activeRings.push({
    x: p.targetX,
    y: p.targetY,
    r: 4,
    maxR: def.impact.shockwaveRadius || 24,
    color: def.impact.shockwaveColorHex || 0xef4444,
    alpha: 0.95
  })

  if (def.impact.hasDoubleRing) {
    activeRings.push({
      x: p.targetX,
      y: p.targetY,
      r: 2,
      maxR: (def.impact.shockwaveRadius || 24) * 0.65,
      color: def.visual.glowColorHex || 0xffffff,
      alpha: 0.8
    })
  }

  for (let s = 0; s < sparkCount; s++) {
    const angle = (Math.PI * 2 * s) / sparkCount + (Math.random() - 0.5) * 0.5
    const spd = 30 + Math.random() * 65
    activeSparks.push({
      x: p.targetX,
      y: p.targetY,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd * 0.5,
      color: sparkColor,
      alpha: 1.0,
      size: 1.5 + Math.random() * 2.0,
      life: 0.35 + Math.random() * 0.2,
    })
  }
}

let autoSpawnTimer = 0

function updateArena(dt: number) {
  if (!app || !combatGraphics) return

  const w = app.screen.width
  const h = app.screen.height
  combatGraphics.clear()

  // Update Moving Target Position
  movingTargetAngle += dt * 1.5

  // ══════════════════════════════════════════════════════════
  // 1. ISOMETRIC BATTLEFIELD FLOOR & GRID BACKGROUND
  // ══════════════════════════════════════════════════════════
  const originX = w * 0.5
  const originY = h * 0.52
  const tileW = 56
  const tileH = 28

  // Draw 2:1 Isometric Grid Diamond Floor
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const gx = originX + (c - r) * (tileW * 0.5)
      const gy = originY + (c + r) * (tileH * 0.5)
      combatGraphics
        .poly([
          { x: gx, y: gy - tileH * 0.5 },
          { x: gx + tileW * 0.5, y: gy },
          { x: gx, y: gy + tileH * 0.5 },
          { x: gx - tileW * 0.5, y: gy },
        ])
        .stroke({ width: 0.8, color: 0x1e293b, alpha: 0.45 })
    }
  }

  // Tower Launch Base Diamond & Pedestal (Bottom-Left)
  const towerX = w * 0.22
  const towerY = h * 0.74
  combatGraphics
    .ellipse(towerX, towerY, 24, 12)
    .fill({ color: 0x0f172a, alpha: 0.85 })
    .stroke({ width: 1.5, color: 0x38bdf8, alpha: 0.75 })
  combatGraphics.circle(towerX, towerY - 6, 4).fill({ color: 0x38bdf8, alpha: 0.95 })

  // Target Creep Base (Top-Right or Moving Target)
  let curTargetX = w * 0.74
  let curTargetY = h * 0.34
  if (aimMode.value === 'moving') {
    curTargetX = w * 0.58 + Math.cos(movingTargetAngle) * (w * 0.22)
    curTargetY = h * 0.40 + Math.sin(movingTargetAngle) * (h * 0.12)
  }

  // Creep Base Shadow & Target Marker
  combatGraphics
    .ellipse(curTargetX, curTargetY, 20, 10)
    .fill({ color: 0xef4444, alpha: 0.15 })
    .stroke({ width: 1.2, color: 0xef4444, alpha: 0.6 })
  combatGraphics.circle(curTargetX, curTargetY - 8, 3.5).fill({ color: 0xef4444, alpha: 0.95 })

  // Auto Spawner
  autoSpawnTimer -= dt
  const interval = aimMode.value === 'stream' ? 0.18 : shootIntervalSec.value
  if (autoSpawnTimer <= 0) {
    autoSpawnTimer = interval
    spawnManualShot()
  }

  const nowTime = performance.now()
  const arch = currentArchetype.value

  // ══════════════════════════════════════════════════════════
  // 2. CONTINUOUS LASER BEAM RENDERING
  // ══════════════════════════════════════════════════════════
  if (arch === 'laser') {
    ProjectileRenderer.renderHead(
      combatGraphics,
      currentForm.value,
      curTargetX,
      curTargetY - 8,
      0,
      towerX,
      towerY - 6,
      nowTime
    )
    if (Math.random() < 0.35) {
      activeSparks.push({
        x: curTargetX,
        y: curTargetY - 8,
        vx: (Math.random() - 0.5) * 50,
        vy: (Math.random() - 0.5) * 40,
        color: currentForm.value.visual.glowColorHex || 0xfbbf24,
        alpha: 1.0,
        size: 1.5 + Math.random() * 2,
        life: 0.2,
      })
    }
  }

  // ══════════════════════════════════════════════════════════
  // 3. CONTINUOUS UNIT AURA RENDERING (Centered on Creep)
  // ══════════════════════════════════════════════════════════
  if (arch === 'unit_aura') {
    ProjectileRenderer.renderHead(
      combatGraphics,
      currentForm.value,
      curTargetX,
      curTargetY - 8,
      0,
      curTargetX,
      curTargetY - 8,
      nowTime
    )
  }

  // ══════════════════════════════════════════════════════════
  // 4. ACTIVE SKY STRIKES & GROUND BURSTS
  // ══════════════════════════════════════════════════════════
  for (let i = activeStrikes.length - 1; i >= 0; i--) {
    const s = activeStrikes[i]
    s.life -= dt
    if (s.life <= 0) {
      activeStrikes.splice(i, 1)
    } else {
      ProjectileRenderer.renderHead(
        combatGraphics,
        s.def,
        s.x,
        s.y,
        0,
        s.x,
        s.y,
        nowTime
      )
    }
  }

  // ══════════════════════════════════════════════════════════
  // 5. FLYING PROJECTILES 3D PARABOLIC TRAJECTORY & FORMATIONS
  // ══════════════════════════════════════════════════════════
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]
    p.progress += p.speed * dt
    if (p.progress < 0) continue // Staggered wait

    const prog = Math.min(1.0, p.progress)

    const dx = p.targetX - p.startX
    const dy = p.targetY - p.startY
    const totalDist = Math.hypot(dx, dy) || 1
    const perpX = -dy / totalDist
    const perpY = dx / totalDist

    // 1. Ground Plane Position (Isometric floor)
    const groundX = p.startX + dx * prog
    const groundY = p.startY + dy * prog

    // 2. Lateral offset calculation (Volleys / Helixes / Fan / Ring)
    let lateralX = 0
    let lateralY = 0
    if (p.isHelix) {
      const swirl = Math.sin(prog * Math.PI * 6 + (p.phaseOffset || 0)) * (p.offsetPerp || 14)
      lateralX = perpX * swirl
      lateralY = perpY * swirl * 0.5
    } else if (p.offsetPerp) {
      lateralX = perpX * p.offsetPerp
      lateralY = perpY * p.offsetPerp * 0.5
    }

    // 3. Parabolic 3D Arc Height (Ascending & Descending)
    const hasArc = Boolean(p.def.movement.hasArc)
    const maxArc = hasArc ? Math.min(65, totalDist * 0.28) : 0
    const arcHeight = maxArc > 0 ? Math.sin(prog * Math.PI) * maxArc : 0

    // 4. True 3D Airborne Render Position
    const renderX = groundX + lateralX
    const renderY = groundY - arcHeight + lateralY

    // 5. Ground Shadow (stays on the isometric floor!)
    const shadowAlpha = Math.max(0.12, 0.45 * (1 - (arcHeight / (maxArc || 1)) * 0.6))
    const shadowR = Math.max(3, (p.def.visual.size * (p.def.visual.scale || 1.0) * 1.1) * (1 - (arcHeight / (maxArc || 1)) * 0.3))
    combatGraphics
      .ellipse(groundX + lateralX, groundY + lateralY, shadowR * 1.3, shadowR * 0.65)
      .fill({ color: 0x000000, alpha: shadowAlpha })

    // 6. Airborne Trail History
    p.trail.push({ x: renderX, y: renderY, alpha: 1.0, size: p.def.trail.width || 4 })
    const maxTrailLen = Math.max(3, p.def.trail.length || 8)
    if (p.trail.length > maxTrailLen) p.trail.shift()

    // 7. Tangent Flight Vector & Direction Angle
    const vx = dx
    const vy = dy - (maxArc > 0 ? Math.cos(prog * Math.PI) * Math.PI * maxArc : 0)
    const angle = Math.atan2(vy, vx)

    // 8. Render Trail & Head with unified ProjectileRenderer
    ProjectileRenderer.renderTrail(combatGraphics, p.def, p.trail, nowTime)
    ProjectileRenderer.renderHead(combatGraphics, p.def, renderX, renderY, angle, p.startX, p.startY, nowTime)

    // Reach Target
    if (p.progress >= 1.0) {
      handleImpact({ targetX: p.targetX + lateralX, targetY: p.targetY + lateralY, def: p.def })
      activeProjectiles.splice(i, 1)
    }
  }

  // ══════════════════════════════════════════════════════════
  // 6. SHOCKWAVES & SPARKS
  // ══════════════════════════════════════════════════════════
  for (let i = activeRings.length - 1; i >= 0; i--) {
    const ring = activeRings[i]
    ring.r += (ring.maxR - ring.r) * dt * 10
    ring.alpha -= dt * 2.5
    if (ring.alpha <= 0 || ring.r >= ring.maxR * 0.95) {
      activeRings.splice(i, 1)
    } else {
      combatGraphics.ellipse(ring.x, ring.y, ring.r, ring.r * 0.5)
        .stroke({ width: 2.2, color: ring.color, alpha: ring.alpha * 0.85 })
      combatGraphics.ellipse(ring.x, ring.y, ring.r * 0.8, ring.r * 0.4)
        .fill({ color: ring.color, alpha: ring.alpha * 0.25 })
    }
  }

  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const sp = activeSparks[i]
    sp.x += sp.vx * dt
    sp.y += sp.vy * dt
    sp.alpha -= dt * 2.8
    if (sp.alpha <= 0) {
      activeSparks.splice(i, 1)
    } else {
      combatGraphics.circle(sp.x, sp.y, sp.size).fill({ color: sp.color, alpha: sp.alpha })
    }
  }
}

onMounted(() => {
  initPixi()
})

onUnmounted(() => {
  if (app) {
    app.destroy(true, { children: true, texture: false })
    app = null
  }
})
</script>
