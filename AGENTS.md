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

### 3. 🖥️ Asosiy Komponentlar (`src/components/`)
- **`CanvasViewport.vue`**: PixiJS viewport, pan & zoom, sichqoncha va klaviatura hodisalari, simulyatsiya tick loopi (`effectiveDelta = rawDelta * gameSpeed`).
- **`Header.vue`**: Loyiha nomi, qatlamlar, o'lchamlar, simmetriya/setka boshqaruvi, xarita yuklash (Import) va eksport, o'yin rejimiga o'tish ("🎮 O'ynab Ko'rish").
- **`ElementInspector.vue`** (Chap yon panel): Tanlangan katakdagi elementlarni sozlash (X/Y ofset, masshtab, aylantirish, z-index, qirqish).
- **`CharacterControlBar.vue`** (O'ng yon panel): Chiqish nuqtalari qo'yish/ko'chirish, yo'nalish chizish, 2 kishi yonma-yon/bittalab harakat, oraliq zichlik, kamera ergashishi va yo'l chizig'i.
- **`TowerDefenseBar.vue`** (Pastki o'ng panel):
  - **1-tab**: Minora turlarini yaratish, tahrirlash, spriteni almashtirish (rasm galereyasi), xususiyatlarni sinxronlash.
  - **2-tab**: To'lqinlar redaktori (har bir to'lqinga alohida odam soni, HP, tezlik, mukofot, saqlash, faqat shu to'lqinni sinash).
  - **3-tab**: Xaritaga qurilgan minoralar ro'yxati va statistikasi.
- **`GamePlayHUD.vue`**: O'yin rejimi oynasi (Jonlar, Oltin, To'lqinlar, Hisob, 10s qurilish taymeri va Skip tugmasi, Minora sotib olish do'koni, kuchaytirish, sotish, G'alaba va Mag'lubiyat oynalari).
- **`ExportModal.vue`**: Loyihani to'liq JSON (`.isomap.json`) yoki shaffof PNG rasm qilib yuklab olish.
- **`WelcomeProjectModal.vue`**: Boshlang'ich xush kelibsiz oynasi, tayyor shablonlar, JSON import va oxirgi sessiyani tiklash.

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
