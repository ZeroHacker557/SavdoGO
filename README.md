# SavdoGO — biznes uchun tayyor onlayn do'kon platformasi

Tadbirkor landingda formani to'ldiradi (biznes turi, nomi, logosi, ranglari,
yetkazish va to'lov shartlari), va 5 daqiqada o'z subdomenida do'kon ochiladi:
`nomi.savdogo.shop`. Mijozlar uchun sayt, do'kon egasi uchun admin panel va
platforma egasi uchun `/super` panel — bitta kod bazasida.

| Sahifa | Manzil | Kim uchun |
| --- | --- | --- |
| Landing + ro'yxatdan o'tish | `savdogo.shop`, `savdogo.shop/start` | Yangi tadbirkor |
| Do'kon sayti | `nomi.savdogo.shop` yoki o'z domeni | Xaridor |
| Admin panel | `savdogo.shop/admin` (istalgan domenda `/admin`) | Do'kon egasi, admin, kuryer |
| Platforma paneli | `savdogo.shop/super` | Siz (platforma egasi) |

## Qanday ishlaydi

1. **Ro'yxatdan o'tish** (`/start`, 5 qadam). Biznes turi tanlanadi, shu
   bo'yicha katalog atamalari ("Menyu", "Porsiya", "Xotira"...), tavsiya
   ranglar va namuna mahsulotlar olinadi. O'ng tomonda jonli telefon ko'rinishi.
2. **Do'kon yaratiladi** (`POST /api/platform → shop.create`): subdomen band
   qilinadi, ega hisobi ochiladi, biznes turiga mos 6–12 ta namuna mahsulot
   yoziladi. Do'kon darhol ishlaydi: **10 kunlik bepul sinov**
   (`status: active`, `trial: true`, `paidUntil` — sinov tugaydigan kun;
   kunlar soni `src/platform/plans.ts → TRIAL_DAYS`).
3. **Bepul sinov**: hamma amallar ochiq — mahsulot qo'shish, buyurtma qabul
   qilish, xodimlar, aksiyalar. Admin panel tepasida "Bepul sinov: N kun
   qoldi" qatori. «Telegram va kuryerlar» to'plami sinovga kirmaydi.
4. **Sinov tugagach** — ko'rish rejimi: sayt ochiladi (tepada "buyurtma
   qabul qilinmayapti" qatori), admin panelning hamma bo'limi ko'rinadi,
   lekin har qanday o'zgartirish server tomonidan 402 bilan to'xtaydi va
   "To'lov qiling" oynasi chiqadi. (Eski `status: demo` do'konlar ham shunday.)
5. **To'lov**: ega admin paneldagi «Obuna va to'lov» bo'limida tarifni
   tanlaydi, platforma kartasiga o'tkazadi va chek rasmini yuklaydi. Sizga
   Telegram xabari keladi. Sinov tugashidan oldin to'lasa ham bo'ladi.
6. **Tasdiqlash** (`/super`): chekni ko'rib "Tasdiqlash" bosasiz — do'kon
   `active` bo'ladi, `trial` o'chadi, muddat qo'shiladi (eski muddat yoki
   sinovning qolgan kunlari ustiga). Ochiq turgan sayt va panel qayta
   yuklanmasdan yangilanadi.

### Bitta ega — bitta do'kon

Forma orqali bir kishi faqat **bitta** do'kon ochadi. Server egani email
(Firebase Auth'da yagona) va telefon raqami (`ownerPhones/{998...}`)
bo'yicha taniydi — ikkalasidan biri band bo'lsa, `owner-exists` bilan rad
etadi. Do'kon ochgan kishi `/start` ni qayta ochsa, forma o'rniga «Sizda
allaqachon do'kon bor» ekrani chiqadi.

**Ikkinchi do'kon** — ariza orqali:

1. Ega admin panelning **«Yangi do'kon»** bo'limida ariza qoldiradi
   (nomi, biznes turi, istalgan manzil, izoh). Sizga Telegram xabari keladi.
2. `/super` → **Arizalar** → «Tasdiqlash» yoki «Rad etish» (sabab bilan).
3. Tasdiqlansa egada bir martalik havola chiqadi (14 kun):
   `/start?invite=...`. Ega formani to'ldiradi — yangi do'kon **o'sha
   hisobga** qo'shiladi, yangi login kerak emas.
4. Admin panelda chap yuqorida do'kon tanlagichi paydo bo'ladi — do'konlar
   orasida bir bosishda almashiladi. Har do'kon obunasi alohida to'lanadi.

Hisobning do'konlari — `staffIndex/{uid}.shops`, faol do'kon —
`staffIndex/{uid}.shopId` va token claim'idagi `shopId`
([`api/_lib/platform/owners.ts`](api/_lib/platform/owners.ts)).

### Tariflar

| Tarif | Narx | Muddat |
| --- | --- | --- |
| Haftalik | 89 000 so'm | 7 kun |
| Oylik | 199 000 so'm | 30 kun |
| Yillik | 2 000 000 so'm | 365 kun (−16%) |
| Telegram mini app ulash | $50 | bir martalik |

Narxlar bitta joyda: [`src/platform/plans.ts`](src/platform/plans.ts) — landing,
forma, admin panel va server shu fayldan o'qiydi.

## Ma'lumotlar tuzilmasi (Firestore)

```
shops/{id}                  do'konning ommaviy hujjati: nom, logo, ranglar, aloqa,
                            yetkazish/to'lov shartlari, status, paidUntil
shops/{id}/products|categories|sections|orders|users|staff|settings|...
shopPrivate/{id}            egasining ma'lumoti (email, telefon)
shopSecrets/{id}            Telegram bot tokeni — brauzer hech qachon o'qimaydi
staffIndex/{uid}            xodim qaysi do'konniki (shopId — faol, shops — hammasi)
ownerPhones/{998...}        egasining telefoni band — «bitta ega — bitta do'kon»
shopRequests/{id}           ikkinchi do'kon arizalari (pending → approved → used)
payments/{id}               obuna to'lovlari (cheklar)
domains/{host}              o'z domeni → do'kon
platform/settings           platforma kartasi
```

Xavfsizlik: [`firestore.rules`](firestore.rules) — xodim faqat o'z do'konini
ko'radi (`shopId` claim + do'kon ichidagi `staff` hujjati), xaridor faqat
o'z buyurtmalarini (`uid`). Pul bilan bog'liq hech narsani brauzer yoza
olmaydi: buyurtma narxi, promokod, holat va to'lov — faqat server.

Serverda har so'rov do'kon kontekstida ishlaydi
([`api/_lib/context.ts`](api/_lib/context.ts)): `shopCol('orders')` →
`shops/{joriy}/orders`, `sendMessage()` → joriy do'konning boti.

## Tuzilma

```
index.html          landing yoki do'kon sayti (manzilga qarab — src/main.tsx)
admin.html          admin panel
super.html          platforma paneli
src/landing/        landing, ro'yxatdan o'tish formasi
src/platform/       biznes turlari, tariflar, palitra, jonli telefon ko'rinishi
src/shop/           joriy do'kon (sayt tomoni), namuna katalog, lug'at
src/pages, components, hooks   do'kon sayti
src/admin/          admin panel
src/super/          platforma paneli
api/                Vercel funksiyalari (12 ta — Hobby limiti)
api/_lib/platform/  do'kon yaratish, to'lov, super-admin, Telegram bot ulash
scripts/            Firebase sozlash va tekshirish skriptlari
```

### Biznes turi qo'shish

[`src/platform/business-types.ts`](src/platform/business-types.ts) ga bitta
obyekt (atamalar, ranglar, hero, kategoriyalar, namuna mahsulotlar) va
[`src/platform/business-icons.ts`](src/platform/business-icons.ts) ga ikonka.
Boshqa hech narsa kerak emas — landing, forma, sayt va server o'zi oladi.

## Lokal ishga tushirish

```bash
node ./node_modules/vite/bin/vite.js
```

yoki `npm run dev`. `/api` funksiyalari ham shu serverda ishlaydi
([`vite.config.ts`](vite.config.ts) → `devApi`), kalitlar `.env` dan olinadi
(namuna: [`.env.example`](.env.example)).

| Manzil | Nima ochiladi |
| --- | --- |
| `http://localhost:5173` | landing |
| `http://localhost:5173/start` | ro'yxatdan o'tish |
| `http://localhost:5173/?shop=nomi` | do'kon sayti (lokal subdomen o'rniga) |
| `http://nomi.localhost:5173` | do'kon sayti — subdomen bilan |
| `http://localhost:5173/?preview` | formadagi qoralama — bazasiz |
| `http://localhost:5173/admin` | admin panel |
| `http://localhost:5173/super` | platforma paneli |

## Skriptlar

| Buyruq | Nima qiladi |
| --- | --- |
| `node scripts/check-setup.mjs` | Firebase tayyormi — faqat tekshiradi |
| `node scripts/setup-firebase.mjs` | Anonymous kirishni yoqadi, qoidalarni deploy qiladi |
| `node scripts/setup-firebase.mjs --rules-only` | faqat qoidalar (o'zgartirgandan keyin) |
| `node scripts/create-super.mjs <email> <parol>` | `/super` uchun hisob |
| `node scripts/delete-shop.mjs <id> [--delete]` | do'konni butunlay o'chirish (egasining boshqa do'koni bo'lsa hisobi qoladi) |
| `node scripts/backfill-owners.mjs [--write]` | qoida kiritilishidan oldingi do'konlar telefonini band qilish (bir marta) |

Skriptlar service account JSON faylini loyiha ildizidan
(`*-firebase-adminsdk-*.json`, git'ga tushmaydi) va loyihani
`src/config/firebase.ts` dagi `projectId` bo'yicha oladi.

Internetga chiqarish — [`DEPLOY.md`](DEPLOY.md).
