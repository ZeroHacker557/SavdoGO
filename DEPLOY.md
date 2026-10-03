# Internetga chiqarish

Firebase loyihasi (`savdogo-aac7a`) allaqachon tayyor: Firestore, Storage,
Email/Password va Anonymous kirish yoqilgan, qoidalar deploy qilingan.
Tekshirish: `node scripts/check-setup.mjs`.

## 1. Super-admin hisobi

```bash
node scripts/create-super.mjs siz@gmail.com "Kuchli-Parol-2026"
```

Shu email va parol bilan `/super` ga kirasiz. Parolni faqat o'zingiz biling.

## 2. Vercel

1. Loyihani GitHub'ga yuklang va Vercel'da **Import** qiling (Framework: Vite).
2. **Settings → Environment Variables** (Production va Preview):

   | Nom | Qiymat |
   | --- | --- |
   | `FIREBASE_SERVICE_ACCOUNT` | service account JSON — butunligicha, bitta qatorda |
   | `CRON_SECRET` | uzun tasodifiy satr |
   | `PLATFORM_BOT_TOKEN` | (ixtiyoriy) sizga xabar yuboradigan bot |
   | `PLATFORM_CHAT_ID` | (ixtiyoriy) sizning Telegram chat ID ingiz |

   `.env` faylidagi `FIREBASE_SERVICE_ACCOUNT` qatorini to'g'ridan-to'g'ri
   nusxalash mumkin. `PUBLIC_BASE_URL` va `SHOP_BASE_URL` ni Vercel'ga
   **qo'ymang** — ular faqat lokal sinov uchun.

3. Deploy. Tekshirish: `https://<loyiha>.vercel.app/api/platform` —
   `serviceAccount.valid: true` bo'lishi kerak.

## 3. Domen: savdogo.shop va *.savdogo.shop

Har do'kon o'z subdomenida ochiladi, shuning uchun **wildcard** domen kerak.
Vercel wildcard'ni faqat domenning DNS'i Vercel'da bo'lsa ulaydi:

1. Vercel → **Settings → Domains** → `savdogo.shop` va `*.savdogo.shop` qo'shing.
2. Domen sotib olingan joyda (Namecheap, Porkbun, GoDaddy va h.k.) nameserverlarni
   Vercel ko'rsatganiga almashtiring: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`.
3. Bir necha soatdan keyin `nomi.savdogo.shop` ishlaydi — yangi do'konlar uchun
   hech narsa qo'shish shart emas.

Domen boshqa bo'lsa — [`src/platform/plans.ts`](src/platform/plans.ts) dagi
`rootDomain` ni o'zgartiring.

Firebase Console → **Authentication → Settings → Authorized domains** ga
`savdogo.shop` ni qo'shing.

## 4. Birinchi sozlamalar (`/super`)

- **Bitta ega — bitta do'kon** qoidasi oldin ochilgan do'konlarga ham
  tegishli bo'lishi uchun bir marta (avval quruq ishga tushirib ko'ring):

  ```bash
  node scripts/backfill-owners.mjs
  node scripts/backfill-owners.mjs --write
  ```

  Skript faqat qo'shadi: eski do'konlar egalarining telefonini band
  qiladi. Bir raqam bilan oldin bir nechta do'kon ochilgan bo'lsa, ular
  ishlashda davom etadi — shu raqam bilan faqat YANGI do'kon ochilmaydi.
- **Arizalar** → ikkinchi do'kon so'ragan egalar (README → «Bitta ega —
  bitta do'kon»).

- **Sozlamalar** → obuna to'lovlari kartasi (do'kon egalari shuni ko'radi).
- Yangi chek kelganda **To'lovlar** bo'limida nishon chiqadi; `PLATFORM_BOT_TOKEN`
  bo'lsa Telegram'ga ham xabar keladi. Obunasi 3 kun ichida tugaydigan
  do'konlar ro'yxati har kuni keladi (`/api/cron`, Toshkent 00:00).

## 5. Qo'shimcha xizmatlar

### «Telegram va kuryerlar» to'plami ($50)

Kuryer bilan bog'liq **hamma narsa** — kuryer roli, kuryerga biriktirish,
kuryerlar xaritasi, kassa, kuryer chati — hamda Telegram xabarlari va
ommaviy xabar faqat shu to'plam bilan ochiladi. Ungacha admin panelda bu
bo'limlar o'rnida «Kuryerlar va bot · $50» sahifasi turadi va to'plamni
tushuntiradi. Server ham bu amallarni botsiz do'kon uchun rad etadi.

1. Ega «Obuna va to'lov»da to'plamni belgilab to'laydi (yoki
   «Kuryerlar va bot» sahifasidagi «Ulash» tugmasi).
2. Siz `/super` da chekni tasdiqlaysiz — do'konda «Telegram · bot ulang!»
   belgisi paydo bo'ladi, egada esa «Ulanmoqda» holati va yo'riqnoma.
3. Bot: @BotFather → `/newbot` (ega yaratib tokenni yuboradi yoki siz yaratasiz).
4. `/super` → **Do'konlar** → do'kon → **Boshqarish** → Telegram: tokenni
   kiriting va saqlang. Server o'zi: tokenni tekshiradi, webhook
   (`/api/telegram?shop=<id>`) va menyu tugmasini o'rnatadi. Shu zahoti
   egada kuryer bo'limlari ochiladi.
5. Ega «Xodimlar» bo'limida kuryerlarni Telegram ID si bilan qo'shadi.

Botni uzish: token maydoniga `-` yozib saqlang.

### O'z domeni

1. Vercel → **Settings → Domains** → `kafenur.uz` qo'shing, egasiga DNS
   yozuvlarini bering (Vercel ko'rsatadi).
2. `/super` → do'kon → **Boshqarish** → O'z domeni: `kafenur.uz` → Saqlash.
   Sayt shu domenda ochiladi (`domains/kafenur.uz` yozuvi orqali).

## 6. Qoidalar o'zgarsa

`firestore.rules` yoki `storage.rules` ni tahrirlagandan keyin:

```bash
node scripts/setup-firebase.mjs --rules-only
```

## Cheklovlar

- **To'lov**: obuna ham, xaridor to'lovi ham — kartaga o'tkazma + chek. Payme
  yoki Click orqali avtomatik to'lov ulanmagan.
- **Yangi buyurtma xabari**: Telegram xizmati ulanmagan do'konda admin panel
  ochiq bo'lsa ovozli signal chalinadi; SMS yoki email xabari yo'q.
- **Vercel Hobby** rejasida 12 ta funksiya — hozir aniq 12 ta. Yangi endpoint
  kerak bo'lsa mavjudlaridan biriga `action` qo'shing (masalan `api/platform.ts`).
