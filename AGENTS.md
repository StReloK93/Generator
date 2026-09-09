# Isocraft: Isometric Map Generator & Tower Defense Game Engine

Bu loyiha **Vue 3 + TypeScript + Pinia + PixiJS 8 + Tailwind CSS** asosida qurilgan professional izometrik xarita muharriri (Redaktor) va to'liq interaktiv Tower Defense (TD) o'yin dvijogidir.

---

## 🏗️ Loyiha Arxitekturasi va Tuzilishi

### 1. ⚙️ Izometrik Grafika Dvijogi (`src/engine/IsoEngine.ts`)
- **PixiJS 8** asosida ishlaydi (WebGPU / WebGL avtomatik tanlanadi).
- **Koordinata tizimi**: Standard 2:1 izometriya (`tileWidth: 128`, `tileHeight: 64`).
- **Funksiyalar**:
  - `renderGrid`: Setka, markaziy koordinata (Center Origin) va simmetriya o'qlari renderi.
  - `syncLayers`: Qatlamlar (Layers) bo'yicha spritelarni chuqurlik (Z-index depth sorting) bilan chizish.
  - `renderCharacter`: Barcha to'lqin personajlarini (Run, Pickup, Walk animatsiyalari, yo'nalishlar, HP bar, soyalar, o'lim va o'chish animatsiyalari) chizish.
  - `renderTowersAndCombat`: Qurilgan minoralar, nishonni aniqlash, snaryadlar parvozi, splash effektlar, portlash halqalari va zarba sonlarini (floating damage texts) chizish.

### 2. 🏪 State Management (Pinia Stores - `src/stores/`)
- **`mapStore.ts`**: Xarita o'lchami, qatlamlar (`layers`), kataklardagi elementlar (`tiles`), tarix (`undo/redo`), loyiha eksport/importi.
- **`assetStore.ts`**: Standart sprite kutubxonasi (`src/assets/sprites/*.png`), maxsus rasmlarni yuklash, bounding box tahlili va `reconcileImportedAssets`.
- **`characterStore.ts`**:
  - Chiqish nuqtalari (`spawnPoints` / `detectedDoors`).
  - Maxsus yo'nalishlar (`customRoutes`, chizish rejimi).
  - To'lqinlar sozlamalari (`waveConfigs`, har bir to'lqin uchun alohida odam soni, HP, unit yurish tezligi, oltin mukofoti).
  - Harakat tarkibi (`formation`: 2 kishi yonma-yon yoki 1 kishilik; `pairDistance`: oraliq masofa).
  - Simulyatsiya tezligi (`gameSpeed`: 1x dan 50x gacha) va personaj yurish tezligi (`unitSpeed`: 0.8 dan 6.0 k/s) to'liq mustaqil ajratilgan.
  - O'yin rejimi (`isGameMode`, `playerLives`, `gold`, `score`, `gameState`: `build_prep` 10 soniyalik qurilish taymeri va ketma-ket to'lqinlar).
- **`towerStore.ts`**:
  - Minora turlari/blueprintlari (`blueprints`: rasm, zarar, hujum tezligi, masofa, splash turi, snaryad turi/tezligi/rangi, narxi).
  - Xaritadagi minoralar (`placedTowers`: darajalar, kuchaytirish, sotish, jami berilgan zarar, o'ldirilgan dushmanlar).
  - Jang simulyatsiyasi (`updateCombatTick`).
- **`toolStore.ts`**: Faol asboblar (`select`, `brush`, `eraser`, `bucket`, `line`, `rectangle`), tanlangan element, modal oynalar holati.

### 3. 🖥️ Asosiy Komponentlar (`src/components/` & `src/views/`)
- **`HomeView.vue`**: Asosiy sahifa (Yangi xona ochish, Onlayn o'yinga ulanish, Xarita redaktori).
- **`LobbyView.vue`**: Ko'p o'yinchili xona (O'yinchilar slotlari, rang tanlash, xaritani sinxronlash, chat).
- **`EditorView.vue`**: Asosiy xarita redaktori sahifasi.
  - **`editor/EditorHeader.vue`**: Yuqori panel (Asboblar: Brush, Bucket, Eraser, Line, Rect, Select; Grid/Symmetry boshqaruvi, Eksport, O'ynab ko'rish).
  - **`editor/EditorCanvas.vue`**: PixiJS 8 izometrik muharrir viewporti (Pan, Zoom, qatlamlarni chizish, elementlarni tanlash).
  - **`RightSidebar.vue`**: O'ng yon panel (1-tab: Qatlamlar & Elementlar boshqaruvi; 2-tab: Sprite kutubxonasi & qidiruv).
  - **`ElementInspector.vue`**: Tanlangan katakdagi element sozlamalari (X/Y ofset, masshtab, Z-index, aylantirish).
  - **`GameConfigModal.vue`**: 5 ta tabli TD sozlamalari (Minoralar, To'lqinlar, Karta balansi, Qurilganlar, Chiqish yo'llari).
  - **`WelcomeProjectModal.vue`**: Xarita yaratish, tayyor andozalar (Burbenog TD) va JSON yuklash.
  - **`ExportModal.vue`**: Xaritani to'liq JSON (`.isomap.json`) yoki shaffof PNG rasm qilib yuklab olish.
- **`GameView.vue`**: Haqiqiy TD o'yini jangi sahifasi.
  - **`game/GameCanvas.vue`**: O'yin maydoni (Personajlar harakati, minoralar otishi, zarbalar va jang effektlari).
  - **`game/GameHud.vue`**: Yuqori o'yin paneli (Jonlar, Oltin, To'lqinlar, Score, Kills, FPS, To'xtatish).
  - **`game/GameControls.vue`**: Pastki minora sotib olish do'koni, tezlik ko'paytirgichlari (1x-50x), to'lqin taymeri.
  - **`game/GameOverModal.vue`** va **`game/GameVictoryModal.vue`**: Mag'lubiyat va G'alaba oynalari.

---

## 🎨 Tailwind CSS v4 Qoidalari va Stil Standartlari (MAJBURIY)

Barcha yangi yoki tahrirlanadigan Vue komponentlarida **faqat Tailwind CSS v4** qoidalari asosida yozilsin:

1. **O'lchamlar va Spacing (Hech qachon `w-[10px]` yoki `max-w-[85px]` kabi yozilmasin)**:
   - Standart yoki kasr sonli shkala ishlatiladi: `1 birlik = 4px (0.25rem)`.
   - Misollar:
     - `w-[10px]` ❌ -> `w-2.5` ✅ (yoki `w-2` / `w-3`)
     - `max-w-[85px]` ❌ -> `max-w-21.25` ✅ (yoki `max-w-20` / `max-w-24`)
     - `max-w-[100px]` ❌ -> `max-w-25` ✅
     - `w-[500px]` ❌ -> `w-125` ✅
     - `h-[350px]` ❌ -> `h-87.5` ✅
     - `min-w-[40px]` ❌ -> `min-w-10` ✅
     - `min-h-[160px]` ❌ -> `min-h-40` ✅

2. **Gradientlar (Linear / Radial Gradients)**:
   - Tailwind v3 `bg-gradient-to-*` ishlatilmaydi ❌
   - Tailwind v4 `bg-linear-to-*` ishlatiladi ✅:
     - `bg-gradient-to-r` ❌ -> `bg-linear-to-r` ✅
     - `bg-gradient-to-b` ❌ -> `bg-linear-to-b` ✅
     - `bg-gradient-to-tr` ❌ -> `bg-linear-to-tr` ✅
     - Radial uchun: `bg-radial` yoki `bg-[radial-gradient(...)]`

3. **Important (`!`) Modifikatori**:
   - Oldiga qo'yish ❌ (`!relative`, `!w-10`, `!min-w-[40px]`)
   - Orqasiga qo'yish ✅ (`relative!`, `w-10!`, `min-w-10!`, `hidden!`, `flex!`)

---

## 🔣 Ikonkalar Qoidasi (Emoji/Windows Icon Taqiqlangan - Faqat Lucide Icons)

Barcha UI komponentlarida (tugmalar, modallar, panellar, tablar):
- Hech qachon matnli emojilar (masalan: `🏞️`, `🌲`, `🔷`, `👣`, `💡`, `🏰`, `🧘`, `🏃`) ishlatilmasin! ❌
- Har doim faqat `lucide-vue-next` kutubxonasining vektorli SVG ikonkalari (`Mountain`, `TreePine`, `Footprints`, `Lightbulb`, `Castle`, `Crosshair`, `Boxes`, `Image`, va h.k.) ishlatilsin! ✅

---

## 💾 TD Settings, Wave & Game Rules Eksport/Import Qoidasi (MAJBURIY)

TD sozlamalari, to'lqinlar yoki o'yin qoidalariga (`goldReward`, `animSpeed`, `offsetY`, `startingGold`, `startingLives`, `wavePrepTime`, `towerBlueprints`, `unitHp`, `unitSpeed`, `unitCount`, va h.k.) yangi parametr qo'shilsa yoki tahrirlansa, quyidagi 5 ta nuqtaga bir vaqtda to'liq ulanishi **shart**:

1. **`src/types/map.ts`**: Interfeyslar (`WaveConfig`, `MapGameSettings`, `TowerBlueprint`) yangilanadi.
2. **`src/utils/exportHelpers.ts`**: `buildFullProjectJsonPayload` (Export & Auto-save) va `importProjectFromJson` da saqlanadi va o'qiladi.
3. **`src/components/WelcomeProjectModal.vue`**: JSON xarita import qilinganda `.json` fayldan to'liq o'qib olinadi va store'ga yuklanadi.
4. **`src/stores/characterStore.ts`**: `syncWavesToProject()`, `restoreWavesFromProject()`, `syncGameSettingsToProject()`, va `restoreGameSettingsFromProject()` orqali sinxronlashtiriladi.
5. **`src/stores/multiplayerStore.ts`**: Ko'p o'yinchili o'yinda (`MAP_DATA` va `START_GAME`) barcha ulangan o'yinchilarga bir xil to'liq uzatiladi.

> ⚠️ **Qat'iy Talab**: Hech qachon o'yin balansi, mukofotlar yoki personaj/minora sozlamalari kod ichida hardcode qilinmasin — o'yinning barcha qoidalari to'g'ridan-to'g'ri xaritadagi (`.json`) TD settings va wave konfiguratsiyasidan olinishi shart!

---

## 🧩 UI Elementlarni Markazlashtirish va Standartlashtirish Qoidasi (MAJBURIY)

Barcha sahifalar, modallar, panellar va komponentlarda faqat `src/components/ui/` ichidagi markazlashtirilgan UI komponentlar ishlatilsin. Hech qachon qo'lda xom `<button>`, `<input>` yoki maxsus tab dizaynlari yozilmasin:

1. **`UiButton`** / **`UiIconButton`**: Har qanday tugma, harakat, trigger uchun (variantlar: `primary`, `secondary`, `danger`, `ghost`, `amber`, `game-green`, `game-amber`).
2. **`UiTabs`**: Har qanday tab, ko'rinish rejimi (View Mode), qadam ko'paytirgich (Step selector), opacity presetlari, toifalar (Categories), yoki burchak/masshtab presetlari uchun (`variant="segmented"`, `"pills"`, `"amber"`, `"emerald"` va `size="xs" | "sm" | "md"`).
3. **`UiInput`** / **`UiNumberInput`**: Barcha matnli va raqamli kiritish maydonlari (katak koordinatalari, ofsetlar, Z-Index, nomlar, sonlar). Stepper yoki inline ixcham rejimlar bilan.
4. **`UiColorPicker`**: Rang tanlash palitrasi uchun.
5. **`UiCard`**, **`UiBadge`**, **`UiModal`**, **`UiSlider`**, **`UiSwitch`**, **`UiLanguageSwitcher`**.
6. **Kod Tozaligi va SOLID**: Kod doimo ixcham, toza, qayta foydalaniladigan va o'qish uchun maksimal qulay bo'lishi shart!

---

## 📱 Mobile-First Dizayn va No-Scroll Qoidasi (MAJBURIY)

Xarita muharriri (`EditorView`) va Asset muharriri (`AssetEditorView`) dan tashqari, dasturning barcha sahifalari (`HomeView`, `PlayView`, `LobbyView`, `GameView`, o'yin modallari) **Mobile-First** standartida bo'lishi shart:

1. **Scroll Bo'lmasligi Shart (Zero Unwanted Scroll)**:
   - Mobil va planshet ekranlarida sahifalar to'liq ko'rinishi (`h-dvh`, `max-h-dvh`, `overflow-hidden`, `pt-safe`, `pb-safe`) va vertikal/gorizontal scroll bo'lmasligi kerak.
   - Agar biror joyda scroll hosil bo'lsa, o'yinchiga kerak bo'lmagan ikkinchi darajali ortiqcha ma'lumotlar olib tashlanib, ixchamlashtirilishi shart!

2. **Ixcham va Qulay Boshqaruv (Touch & Mobile Friendly)**:
   - Tugmalar, kartalar va inputlar barmog'i bilan teginish uchun qulay (`touch-target`, kamida `h-9` yoki `h-10` interaktiv maydonlar).
   - Matnlar qisqa, tushunarli, muhim harakatlar (Play, Host, Join) birinchi o'rinda.

---

## 🚀 Ishga Tushirish (Quick Start)

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. Dasturchi serverini ishga tushirish
npm run dev

# 3. Production build tekshirish
npm run build
```


