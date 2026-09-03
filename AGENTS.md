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
  - **`editor/GameplayPreviewOverlay.vue`**: Redaktor ichida dizayn ko'rinishi (o'yindagi bilan 100% bir xil HUD va Do'kon).
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

## 🚀 Ishga Tushirish (Quick Start)

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. Dasturchi serverini ishga tushirish
npm run dev

# 3. Production build tekshirish
npm run build
```
