# 🏰 Isocraft - Isometric Map Generator & Tower Defense Game

A high-performance Isometric Map Editor and playable Tower Defense Game built with **Vue 3**, **TypeScript**, **Pinia**, **PixiJS 8**, and **Tailwind CSS**.

---

## ✨ Asosiy Imkoniyatlar (Key Features)

- **📐 Professional Izometrik Xarita Redaktori**:
  - Qatlamlar (Layers) boshqaruvi va aniq 2:1 izometrik chuqurlik (Z-index sorting).
  - 4 tomonga simmetrik chizish (Simmetriya o'qlari va markaziy nuqta).
  - Qalam, chiziq, to'g'ri to'rtburchak, chelak (flood fill) va o'chirg'ich asboblari.
  - Har bir katak elementini erkin sozlash (Element Driveri).

- **🏃 Chiqish Nuqtalari va Yo'nalishlar (Movement Driver)**:
  - Istalgan katakka chiqish nuqtalarini (Spawn points) joylashtirish va ko'chirish.
  - Kataklar bo'ylab yo'nalishlarni erkin chizish (A* algoritmi yoki qo'lda chizish).
  - Bir vaqtda 2 kishi yonma-yon (`pairs`) yoki 1 kishilik safda yurish.

- **🏰 Minoralar va Jang Tizimi (Tower Defense Engine)**:
  - O'zingiz xohlagan rasmni tanlab yangi minoralar (Tower Blueprints) yaratish.
  - Otish masofasi, hujum tezligi, zarar, maydonli zarar (Splash), snaryad turi va tezligi.
  - Dinamik nishon olish, uchar snaryadlar, portlash halqalari va zarba ko'rsatkichlari (damage floaters).

- **🌊 To'lqinlar Redaktori (Wave Editor)**:
  - Har bir to'lqinga alohida odamlar soni, HP, yurish tezligi va oltin mukofoti.
  - Har bir to'lqinni alohida sinab ko'rish.

- **🎮 O'ynab Ko'rish Rejimi (Playable Game Mode)**:
  - To'lqinlar oralig'ida 10 sekundlik qurilish va tayyorgarlik fazasi (Skip imkoniyati bilan).
  - Minoralar sotib olish, xaritaga qurish, darajasini ko'tarish (upgrade) va sotish.
  - Jonlar, oltin, hisob va g'alaba/mag'lubiyat tizimi.

- **💾 To'liq Eksport va Import**:
  - Xaritalarni yengil `.isomap.json` formatida eksport/import qilish (barcha minoralar, to'lqinlar va yo'llar bilan).
  - Shaffof PNG rasm sifatida yuklab olish.

---

## 🛠️ O'rnatish va Ishga Tushirish

```bash
git clone <repo-url>
cd Generator
npm install
npm run dev
```
