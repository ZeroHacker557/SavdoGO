/**
 * Biznes turlari — platformaning «avtomatik moslashuv» yuragi.
 *
 * Do'kon egasi ro'yxatdan o'tishda turini tanlaydi, shundan keyin:
 *   - katalog nomi, mahsulot atamasi va variant yorlig'i (o'lcham,
 *     porsiya, hajm, xotira) shu yerdan olinadi;
 *   - boshlang'ich kategoriyalar va namuna mahsulotlar yaratiladi —
 *     to'lovgacha do'kon shular bilan ko'rinadi;
 *   - tavsiya etilgan rang va shrift beriladi (ega o'zgartira oladi).
 *
 * Yangi biznes turi qo'shish = shu ro'yxatga bitta obyekt qo'shish
 * (ikonkasi — business-icons.ts da).
 * Rasmlar — Unsplash (bepul litsenziya), faqat namuna uchun.
 *
 * ⚠️ Bu fayl SERVERDA ham ishlatiladi (api/_lib/seed.ts — do'kon
 * yaratilganda namuna mahsulotlar yoziladi). Shuning uchun bu yerda
 * React, DOM yoki ikonka importi bo'lmasin — faqat toza ma'lumot.
 */

export type BusinessTypeId =
  | 'restaurant' | 'clothing' | 'shoes' | 'accessories' | 'furniture'
  | 'grocery' | 'cosmetics' | 'electronics' | 'flowers' | 'bakery' | 'other'

export type FontPairId = 'modern' | 'bold' | 'elegant' | 'friendly'

export type DemoCategory = {
  name: string
  nameRu: string
  /** utils/category-icons.ts dagi kalit. */
  icon: string
}

export type DemoProduct = {
  name: string
  nameRu: string
  price: number
  oldPrice?: number
  category: string
  image: string
  description: string
  descriptionRu?: string
  sizes?: string[]
  colors?: string[]
  popular?: boolean
  stock?: number
}

export type BusinessType = {
  id: BusinessTypeId
  name: string
  nameRu: string
  /** Landing va formadagi qisqa izoh. */
  pitch: string
  /** Tavsiya etilgan ranglar: asosiy va aksent. */
  brand: string
  accent: string
  font: FontPairId
  terms: {
    /** «Menyu» yoki «Katalog». */
    catalog: string
    catalogRu: string
    /** Bitta mahsulot nomi: «taom», «mahsulot», «guldasta». */
    item: string
    itemRu: string
    /** Variant yorlig'i — mahsulot sahifasida o'lcham tanlash ustida. */
    sizeLabel: string
    sizeLabelRu: string
    colorLabel: string
    colorLabelRu: string
  }
  /** Admin panelda yangi mahsulot qo'shishda taklif qilinadigan variantlar. */
  sizePresets: string[]
  colorPresets: string[]
  /** Yetkazib berish boshlang'ich sozlamasi (so'm). */
  delivery: { fee: number; freeFrom: number; minOrder: number }
  /** Do'kon bosh sahifasidagi katta blok. */
  hero: { title: string; titleRu: string; subtitle: string; subtitleRu: string; image: string }
  categories: DemoCategory[]
  products: DemoProduct[]
}

/** Unsplash rasm manzili — o'lcham va sifat bilan. */
function img(id: string, w = 800): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`
}

const CLOTH_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44']

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: 'restaurant',
    name: 'Restoran va kafe',
    nameRu: 'Ресторан и кафе',
    pitch: 'Onlayn menyu, yetkazib berish va olib ketish',
    brand: '#E4572E',
    accent: '#FFB400',
    font: 'bold',
    terms: {
      catalog: 'Menyu', catalogRu: 'Меню',
      item: 'taom', itemRu: 'блюдо',
      sizeLabel: 'Porsiya', sizeLabelRu: 'Порция',
      colorLabel: 'Tur', colorLabelRu: 'Вид',
    },
    sizePresets: ['0.5 porsiya', '1 porsiya', '1.5 porsiya'],
    colorPresets: ['Achchiq', 'Achchiq emas'],
    delivery: { fee: 12_000, freeFrom: 150_000, minOrder: 40_000 },
    hero: {
      title: 'Issiq va mazali — eshigingizgacha',
      titleRu: 'Горячо и вкусно — прямо к двери',
      subtitle: 'Buyurtma bering, 40 daqiqada yetkazamiz',
      subtitleRu: 'Закажите — доставим за 40 минут',
      image: img('1555939594-58d7cb561ad1', 1200),
    },
    categories: [
      { name: 'Kaboblar', nameRu: 'Шашлыки', icon: 'kabob' },
      { name: 'Fast food', nameRu: 'Фастфуд', icon: 'burger' },
      { name: 'Pitsa', nameRu: 'Пицца', icon: 'pizza' },
      { name: 'Issiq taomlar', nameRu: 'Горячие блюда', icon: 'soup' },
      { name: 'Salatlar', nameRu: 'Салаты', icon: 'salad' },
      { name: 'Ichimliklar', nameRu: 'Напитки', icon: 'drink' },
    ],
    products: [
      {
        name: 'Mol go‘shtidan kabob', nameRu: 'Шашлык из говядины', price: 32_000, category: 'Kaboblar',
        image: img('1555939594-58d7cb561ad1'), popular: true,
        description: 'Ko‘mirda pishirilgan yumshoq mol go‘shti, piyoz va sous bilan. 1 six.',
        descriptionRu: 'Нежная говядина на углях, с луком и соусом. 1 шампур.',
      },
      {
        name: 'Qovurg‘a BBQ', nameRu: 'Рёбрышки BBQ', price: 98_000, category: 'Kaboblar',
        image: img('1544025162-d76694265947'),
        description: 'Maxsus BBQ sousida sekin pishirilgan qovurg‘alar, garnir bilan.',
        descriptionRu: 'Рёбрышки медленного приготовления в соусе BBQ, с гарниром.',
      },
      {
        name: 'Ribay stek', nameRu: 'Стейк рибай', price: 145_000, oldPrice: 165_000, category: 'Issiq taomlar',
        image: img('1600891964092-4316c288032e'), popular: true,
        description: '300 g marmar mol go‘shti, kartoshka fri va yashil sous bilan.',
        descriptionRu: '300 г мраморной говядины, с картофелем фри и зелёным соусом.',
      },
      {
        name: 'Klassik burger', nameRu: 'Классический бургер', price: 42_000, category: 'Fast food',
        image: img('1551782450-a2132b4ba21d'), popular: true,
        description: 'Mol go‘shti kotleti, cheddar, pomidor, salat bargi va kartoshka fri.',
        descriptionRu: 'Котлета из говядины, чеддер, томат, салат и картофель фри.',
      },
      {
        name: 'Dubl chizburger', nameRu: 'Двойной чизбургер', price: 52_000, category: 'Fast food',
        image: img('1550547660-d9450f859349'),
        description: 'Ikki kotlet, ikki qavat pishloq va maxsus sous.',
        descriptionRu: 'Две котлеты, двойной сыр и фирменный соус.',
      },
      {
        name: 'Pitsa Margarita', nameRu: 'Пицца Маргарита', price: 79_000, oldPrice: 89_000, category: 'Pitsa',
        image: img('1574071318508-1cdbab80d002'), sizes: ['30 sm', '40 sm'],
        description: 'Pomidor sousi, motsarella va yangi rayhon. Tandirda pishiriladi.',
        descriptionRu: 'Томатный соус, моцарелла и свежий базилик. Из печи.',
      },
      {
        name: 'Go‘shtli pitsa', nameRu: 'Мясная пицца', price: 95_000, category: 'Pitsa',
        image: img('1513104890138-7c749659a591'), sizes: ['30 sm', '40 sm'],
        description: 'Uch xil go‘sht, motsarella va qo‘ziqorin.',
        descriptionRu: 'Три вида мяса, моцарелла и грибы.',
      },
      {
        name: 'Ramen', nameRu: 'Рамен', price: 48_000, category: 'Issiq taomlar',
        image: img('1569718212165-3a8278d5f624'),
        description: 'Boy sho‘rva, uy lag‘moni, tuxum va ko‘katlar.',
        descriptionRu: 'Насыщенный бульон, домашняя лапша, яйцо и зелень.',
      },
      {
        name: 'Dengiz mahsulotli pasta', nameRu: 'Паста с морепродуктами', price: 85_000, category: 'Issiq taomlar',
        image: img('1563379926898-05f4575a45d8'),
        description: 'Krevetka, pomidor sousi va parmezan bilan spagetti.',
        descriptionRu: 'Спагетти с креветками, томатным соусом и пармезаном.',
      },
      {
        name: 'Avokadoli bowl', nameRu: 'Боул с авокадо', price: 45_000, category: 'Salatlar',
        image: img('1512621776951-a57141f2eefd'),
        description: 'Avokado, no‘xat, yangi sabzavotlar va limonli sous.',
        descriptionRu: 'Авокадо, нут, свежие овощи и лимонный соус.',
      },
      {
        name: 'Uy limonadi', nameRu: 'Домашний лимонад', price: 22_000, category: 'Ichimliklar',
        image: img('1497534446932-c925b458314e'), sizes: ['0.5 l', '1 l'],
        description: 'Yangi siqilgan limon, rezavorlar va yalpiz.',
        descriptionRu: 'Свежевыжатый лимон, ягоды и мята.',
      },
      {
        name: 'Kapuchino', nameRu: 'Капучино', price: 24_000, category: 'Ichimliklar',
        image: img('1509042239860-f550ce710b93'),
        description: 'Arabika donidan espresso va ko‘pirtirilgan sut.',
        descriptionRu: 'Эспрессо из арабики и взбитое молоко.',
      },
    ],
  },

  {
    id: 'clothing',
    name: 'Kiyim do‘koni',
    nameRu: 'Магазин одежды',
    pitch: 'O‘lcham va ranglar, yangi kolleksiyalar',
    brand: '#7C3AED',
    accent: '#F472B6',
    font: 'elegant',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'O‘lcham', sizeLabelRu: 'Размер',
      colorLabel: 'Rang', colorLabelRu: 'Цвет',
    },
    sizePresets: CLOTH_SIZES,
    colorPresets: ['Qora', 'Oq', 'Kulrang', 'Ko‘k', 'Bej'],
    delivery: { fee: 25_000, freeFrom: 500_000, minOrder: 0 },
    hero: {
      title: 'Yangi mavsum kolleksiyasi',
      titleRu: 'Коллекция нового сезона',
      subtitle: 'O‘zingizga mosini toping — O‘zbekiston bo‘ylab yetkazamiz',
      subtitleRu: 'Найдите свой стиль — доставка по Узбекистану',
      image: img('1445205170230-053b83016050', 1200),
    },
    categories: [
      { name: 'Futbolkalar', nameRu: 'Футболки', icon: 'shirt' },
      { name: 'Ko‘ylaklar', nameRu: 'Платья', icon: 'dress' },
      { name: 'Ustki kiyim', nameRu: 'Верхняя одежда', icon: 'jacket' },
      { name: 'Shim va jinsi', nameRu: 'Брюки и джинсы', icon: 'jeans' },
      { name: 'Xudi va sviterlar', nameRu: 'Худи и свитеры', icon: 'hoodie' },
    ],
    products: [
      {
        name: 'Oversayz futbolka', nameRu: 'Оверсайз футболка', price: 149_000, category: 'Futbolkalar',
        image: img('1583743814966-8936f5b7be1a'), sizes: CLOTH_SIZES, colors: ['Qora', 'Oq'], popular: true,
        description: '100% paxta, zich mato. Kundalik kiyish uchun erkin bichim.',
        descriptionRu: '100% хлопок, плотная ткань. Свободный крой на каждый день.',
      },
      {
        name: 'Printli futbolka', nameRu: 'Футболка с принтом', price: 169_000, category: 'Futbolkalar',
        image: img('1576566588028-4147f3842f27'), sizes: CLOTH_SIZES, colors: ['Oq'],
        description: 'Yorqin print, yuvilganda o‘chmaydi.',
        descriptionRu: 'Яркий принт, не выцветает после стирки.',
      },
      {
        name: 'Charm kurtka', nameRu: 'Кожаная куртка', price: 1_290_000, oldPrice: 1_590_000, category: 'Ustki kiyim',
        image: img('1551028719-00167b16eac5'), sizes: ['M', 'L', 'XL'], colors: ['Qora'], popular: true,
        description: 'Tabiiy charm, ichki astar va metall zamoklar.',
        descriptionRu: 'Натуральная кожа, подкладка и металлическая фурнитура.',
      },
      {
        name: 'Bomber kurtka', nameRu: 'Куртка-бомбер', price: 690_000, category: 'Ustki kiyim',
        image: img('1591047139829-d91aecb6caea'), sizes: CLOTH_SIZES, colors: ['Jigarrang', 'Qora'],
        description: 'Yengil kuz-bahor kurtkasi, suv o‘tkazmaydigan mato.',
        descriptionRu: 'Лёгкая демисезонная куртка, водоотталкивающая ткань.',
      },
      {
        name: 'Klassik jinsi', nameRu: 'Классические джинсы', price: 389_000, category: 'Shim va jinsi',
        image: img('1542272604-787c3835535d'), sizes: ['28', '30', '32', '34', '36'], colors: ['Ko‘k', 'Qora'],
        description: 'To‘g‘ri bichim, cho‘ziluvchan denim.',
        descriptionRu: 'Прямой крой, эластичный деним.',
      },
      {
        name: 'Kulrang xudi', nameRu: 'Серое худи', price: 329_000, category: 'Xudi va sviterlar',
        image: img('1556821840-3a63f95609a7'), sizes: CLOTH_SIZES, colors: ['Kulrang', 'Qora'],
        description: 'Ichi yumshoq tukli, kapyushonli.',
        descriptionRu: 'Мягкий начёс внутри, с капюшоном.',
      },
      {
        name: 'Jinsi ko‘ylak', nameRu: 'Джинсовая рубашка', price: 279_000, category: 'Futbolkalar',
        image: img('1596755094514-f87e34085b2c'), sizes: CLOTH_SIZES, colors: ['Ko‘k'],
        description: 'Yengil denim, kundalik va ofis uchun.',
        descriptionRu: 'Лёгкий деним, для повседневной носки и офиса.',
      },
      {
        name: 'Qizil kechki ko‘ylak', nameRu: 'Красное вечернее платье', price: 549_000, category: 'Ko‘ylaklar',
        image: img('1595777457583-95e059d581b8'), sizes: ['XS', 'S', 'M', 'L'], colors: ['Qizil'], popular: true,
        description: 'Uzun, yengil shifon, bayram va to‘ylar uchun.',
        descriptionRu: 'Длинное, из лёгкого шифона — для праздников и торжеств.',
      },
      {
        name: 'Oq yozgi ko‘ylak', nameRu: 'Белое летнее платье', price: 459_000, category: 'Ko‘ylaklar',
        image: img('1515372039744-b8f02a3ae446'), sizes: ['XS', 'S', 'M', 'L'], colors: ['Oq'],
        description: 'Tabiiy mato, yelkasi ochiq bichim.',
        descriptionRu: 'Натуральная ткань, открытые плечи.',
      },
      {
        name: 'To‘qima poncho', nameRu: 'Вязаное пончо', price: 259_000, category: 'Xudi va sviterlar',
        image: img('1434389677669-e08b4cac3105'), sizes: ['Universal'], colors: ['Bej'],
        description: 'Qo‘lda to‘qilgan, popukli poncho.',
        descriptionRu: 'Пончо ручной вязки с бахромой.',
      },
    ],
  },

  {
    id: 'shoes',
    name: 'Poyabzal',
    nameRu: 'Обувь',
    pitch: 'Krossovka, kedlar va klassik poyabzal',
    brand: '#0EA5E9',
    accent: '#F97316',
    font: 'bold',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'O‘lcham', sizeLabelRu: 'Размер',
      colorLabel: 'Rang', colorLabelRu: 'Цвет',
    },
    sizePresets: SHOE_SIZES,
    colorPresets: ['Qora', 'Oq', 'Kulrang'],
    delivery: { fee: 25_000, freeFrom: 700_000, minOrder: 0 },
    hero: {
      title: 'Qadamingizga mos poyabzal',
      titleRu: 'Обувь под ваш шаг',
      subtitle: 'Original krossovkalar — 36 dan 45 gacha o‘lchamlar',
      subtitleRu: 'Оригинальные кроссовки — размеры с 36 по 45',
      image: img('1560769629-975ec94e6a86', 1200),
    },
    categories: [
      { name: 'Krossovkalar', nameRu: 'Кроссовки', icon: 'sneaker' },
      { name: 'Kedlar', nameRu: 'Кеды', icon: 'shoe' },
      { name: 'Ayollar poyabzali', nameRu: 'Женская обувь', icon: 'heel' },
    ],
    products: [
      {
        name: 'Jigarrang krossovka', nameRu: 'Коричневые кроссовки', price: 849_000, category: 'Krossovkalar',
        image: img('1549298916-b41d501d3772'), sizes: SHOE_SIZES, popular: true,
        description: 'Zamsh ustki qism, yengil taglik.',
        descriptionRu: 'Замшевый верх, лёгкая подошва.',
      },
      {
        name: 'Yugurish krossovkasi', nameRu: 'Беговые кроссовки', price: 1_190_000, category: 'Krossovkalar',
        image: img('1606107557195-0e29a4b5b4aa'), sizes: SHOE_SIZES,
        description: 'Nafas oladigan to‘r, amortizatsiyali taglik.',
        descriptionRu: 'Дышащая сетка, амортизирующая подошва.',
      },
      {
        name: 'Air krossovka', nameRu: 'Кроссовки Air', price: 1_390_000, oldPrice: 1_590_000, category: 'Krossovkalar',
        image: img('1600185365483-26d7a4cc7519'), sizes: SHOE_SIZES, popular: true,
        description: 'Havo yostiqchali mashhur model.',
        descriptionRu: 'Культовая модель с воздушной подушкой.',
      },
      {
        name: 'Rang-barang krossovka', nameRu: 'Разноцветные кроссовки', price: 990_000, category: 'Krossovkalar',
        image: img('1560769629-975ec94e6a86'), sizes: SHOE_SIZES,
        description: 'Yorqin ranglar, yoshlar uslubi.',
        descriptionRu: 'Яркие цвета, молодёжный стиль.',
      },
      {
        name: 'Pastel krossovka', nameRu: 'Пастельные кроссовки', price: 890_000, category: 'Krossovkalar',
        image: img('1595950653106-6c9ebd614d3a'), sizes: ['36', '37', '38', '39', '40'],
        description: 'Yumshoq pastel ranglar, ayollar uchun.',
        descriptionRu: 'Нежные пастельные оттенки, женская модель.',
      },
      {
        name: 'Oq kedlar', nameRu: 'Белые кеды', price: 590_000, category: 'Kedlar',
        image: img('1608231387042-66d1773070a5'), sizes: SHOE_SIZES, popular: true,
        description: 'Har qanday kiyimga mos klassika.',
        descriptionRu: 'Классика, которая подходит ко всему.',
      },
      {
        name: 'Bordo kedlar', nameRu: 'Бордовые кеды', price: 520_000, category: 'Kedlar',
        image: img('1525966222134-fcfa99b8ae77'), sizes: SHOE_SIZES,
        description: 'Zamsh va kanvas, rezina taglik.',
        descriptionRu: 'Замша и канвас, резиновая подошва.',
      },
      {
        name: 'Baland poshnali tufli', nameRu: 'Туфли на каблуке', price: 690_000, category: 'Ayollar poyabzali',
        image: img('1543163521-1bf539c55dd2'), sizes: ['36', '37', '38', '39'],
        description: 'Gulli naqsh, 9 sm poshna.',
        descriptionRu: 'Цветочный принт, каблук 9 см.',
      },
    ],
  },

  {
    id: 'accessories',
    name: 'Aksessuarlar',
    nameRu: 'Аксессуары',
    pitch: 'Soat, sumka, ko‘zoynak va zargarlik',
    brand: '#1F2937',
    accent: '#C9A227',
    font: 'elegant',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'O‘lcham', sizeLabelRu: 'Размер',
      colorLabel: 'Rang', colorLabelRu: 'Цвет',
    },
    sizePresets: ['16', '17', '18', '19', '20'],
    colorPresets: ['Tilla', 'Kumush', 'Qora', 'Jigarrang'],
    delivery: { fee: 20_000, freeFrom: 1_000_000, minOrder: 0 },
    hero: {
      title: 'Obrazingizni yakunlovchi detal',
      titleRu: 'Деталь, завершающая образ',
      subtitle: 'Soatlar, sumkalar va zargarlik buyumlari — sovg‘a qadog‘ida',
      subtitleRu: 'Часы, сумки и украшения — в подарочной упаковке',
      image: img('1523275335684-37898b6baf30', 1200),
    },
    categories: [
      { name: 'Soatlar', nameRu: 'Часы', icon: 'watch' },
      { name: 'Ko‘zoynaklar', nameRu: 'Очки', icon: 'glasses' },
      { name: 'Zargarlik', nameRu: 'Украшения', icon: 'gem' },
      { name: 'Sumkalar', nameRu: 'Сумки', icon: 'bag' },
    ],
    products: [
      {
        name: 'Minimalist soat', nameRu: 'Минималистичные часы', price: 750_000, category: 'Soatlar',
        image: img('1523275335684-37898b6baf30'), colors: ['Kumush'], popular: true,
        description: 'Yapon mexanizmi, suvga chidamli, charm tasma.',
        descriptionRu: 'Японский механизм, водозащита, кожаный ремешок.',
      },
      {
        name: 'Klassik soat', nameRu: 'Классические часы', price: 890_000, category: 'Soatlar',
        image: img('1524592094714-0f0654e20314'), colors: ['Jigarrang', 'Qora'],
        description: 'Oq siferblat, ingichka korpus.',
        descriptionRu: 'Белый циферблат, тонкий корпус.',
      },
      {
        name: 'Rose gold soat', nameRu: 'Часы rose gold', price: 1_150_000, oldPrice: 1_350_000, category: 'Soatlar',
        image: img('1522312346375-d1a52e2b99b3'), colors: ['Rose gold'], popular: true,
        description: 'Ayollar uchun nafis model, sapfir oyna.',
        descriptionRu: 'Изящная женская модель, сапфировое стекло.',
      },
      {
        name: 'Quyosh ko‘zoynagi', nameRu: 'Солнцезащитные очки', price: 390_000, category: 'Ko‘zoynaklar',
        image: img('1572635196237-14b3f281503f'), colors: ['Qora'],
        description: 'UV400 himoya, klassik shakl.',
        descriptionRu: 'Защита UV400, классическая форма.',
      },
      {
        name: 'Dumaloq ko‘zoynak', nameRu: 'Круглые очки', price: 350_000, category: 'Ko‘zoynaklar',
        image: img('1511499767150-a48a237f0083'), colors: ['Tilla'],
        description: 'Metall gardish, polarizatsiyalangan linzalar.',
        descriptionRu: 'Металлическая оправа, поляризованные линзы.',
      },
      {
        name: 'Tilla bilaguzuk', nameRu: 'Золотой браслет', price: 2_400_000, category: 'Zargarlik',
        image: img('1611591437281-460bfbe1220a'), sizes: ['16', '17', '18', '19'],
        description: '585-proba tilla, qo‘lda ishlangan naqsh.',
        descriptionRu: 'Золото 585 пробы, ручная работа.',
      },
      {
        name: 'Marvarid shoda', nameRu: 'Жемчужное ожерелье', price: 1_850_000, category: 'Zargarlik',
        image: img('1515562141207-7a88fb7ce338'),
        description: 'Tabiiy chuchuk suv marvaridlari.',
        descriptionRu: 'Натуральный пресноводный жемчуг.',
      },
      {
        name: 'Brilliant uzuk', nameRu: 'Кольцо с бриллиантом', price: 4_900_000, category: 'Zargarlik',
        image: img('1605100804763-247f67b3557e'), sizes: ['16', '17', '18', '19'], popular: true,
        description: 'Oq tilla, markazda brilliant tosh. Sertifikati bilan.',
        descriptionRu: 'Белое золото, бриллиант в центре. С сертификатом.',
      },
      {
        name: 'Qizil sumka', nameRu: 'Красная сумка', price: 790_000, category: 'Sumkalar',
        image: img('1584917865442-de89df76afd3'), colors: ['Qizil'],
        description: 'Tabiiy charm, qo‘lda ushlash va yelka tasmasi.',
        descriptionRu: 'Натуральная кожа, ручка и плечевой ремень.',
      },
      {
        name: 'To‘qima sumka', nameRu: 'Плетёная сумка', price: 650_000, category: 'Sumkalar',
        image: img('1590874103328-eac38a683ce7'), colors: ['Apelsin'],
        description: 'Yozgi to‘qima sumka, charm qopqoq.',
        descriptionRu: 'Летняя плетёная сумка с кожаным клапаном.',
      },
      {
        name: 'Charm hamyon', nameRu: 'Кожаный кошелёк', price: 260_000, category: 'Sumkalar',
        image: img('1627123424574-724758594e93'), colors: ['Jigarrang'],
        description: '8 ta karta joyi, RFID himoya.',
        descriptionRu: '8 отделений для карт, защита RFID.',
      },
    ],
  },

  {
    id: 'furniture',
    name: 'Mebel do‘koni',
    nameRu: 'Мебельный магазин',
    pitch: 'Divan, stol-stul, yotoqxona — yetkazish va yig‘ish',
    brand: '#3F6B4E',
    accent: '#D6A461',
    font: 'modern',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'O‘lcham', sizeLabelRu: 'Размер',
      colorLabel: 'Mato rangi', colorLabelRu: 'Цвет обивки',
    },
    sizePresets: ['140×200', '160×200', '180×200'],
    colorPresets: ['Kulrang', 'Bej', 'Yashil', 'Jigarrang'],
    delivery: { fee: 0, freeFrom: 0, minOrder: 0 },
    hero: {
      title: 'Uyingizga qulaylik olib kiring',
      titleRu: 'Добавьте уюта в ваш дом',
      subtitle: 'Bepul yetkazib berish va yig‘ib berish — Toshkent bo‘ylab',
      subtitleRu: 'Бесплатная доставка и сборка — по Ташкенту',
      image: img('1586023492125-27b2c045efd7', 1200),
    },
    categories: [
      { name: 'Divanlar', nameRu: 'Диваны', icon: 'sofa' },
      { name: 'Stul va kreslolar', nameRu: 'Стулья и кресла', icon: 'chair' },
      { name: 'Yotoqxona', nameRu: 'Спальня', icon: 'bed' },
      { name: 'Yoritish', nameRu: 'Освещение', icon: 'lamp' },
      { name: 'Saqlash', nameRu: 'Хранение', icon: 'cabinet' },
    ],
    products: [
      {
        name: 'Velur divan, 3 o‘rinli', nameRu: 'Велюровый диван, 3-местный', price: 6_900_000, category: 'Divanlar',
        image: img('1555041469-a586c61ea9bc'), colors: ['Yashil', 'Kulrang', 'Bej'], popular: true,
        description: 'Yumshoq velur, qayin yog‘och karkas. 220×95 sm.',
        descriptionRu: 'Мягкий велюр, каркас из берёзы. 220×95 см.',
      },
      {
        name: 'Charm divan', nameRu: 'Кожаный диван', price: 8_400_000, oldPrice: 9_200_000, category: 'Divanlar',
        image: img('1540574163026-643ea20ade25'), colors: ['Jigarrang'],
        description: 'Tabiiy charm, skandinav uslubi. 210×90 sm.',
        descriptionRu: 'Натуральная кожа, скандинавский стиль. 210×90 см.',
      },
      {
        name: 'Mehmonxona divani', nameRu: 'Диван для гостиной', price: 5_700_000, category: 'Divanlar',
        image: img('1493663284031-b7e3aefcae8e'), colors: ['Kulrang'],
        description: 'Keng o‘rindiq, yostiqlari bilan.',
        descriptionRu: 'Глубокая посадка, с подушками.',
      },
      {
        name: 'Yumshoq kreslo', nameRu: 'Мягкое кресло', price: 2_300_000, category: 'Stul va kreslolar',
        image: img('1567538096630-e0c55bd6374c'), colors: ['Oq', 'Bej'], popular: true,
        description: 'Kapitone tikuv, yog‘och oyoqlar.',
        descriptionRu: 'Стёжка капитоне, деревянные ножки.',
      },
      {
        name: 'Skandinav stul', nameRu: 'Скандинавский стул', price: 450_000, category: 'Stul va kreslolar',
        image: img('1592078615290-033ee584e267'), colors: ['Qora', 'Oq'],
        description: 'Plastik o‘rindiq, bukdan yasalgan oyoqlar.',
        descriptionRu: 'Пластиковое сиденье, ножки из бука.',
      },
      {
        name: 'Yog‘och stul', nameRu: 'Деревянный стул', price: 380_000, category: 'Stul va kreslolar',
        image: img('1506439773649-6e0eb8cfb237'),
        description: 'Tabiiy yong‘oq yog‘ochi, lak bilan qoplangan.',
        descriptionRu: 'Натуральный орех, покрыт лаком.',
      },
      {
        name: 'Ikki kishilik karavot', nameRu: 'Двуспальная кровать', price: 7_800_000, category: 'Yotoqxona',
        image: img('1505693416388-ac5ce068fe85'), sizes: ['160×200', '180×200'], popular: true,
        description: 'Yumshoq bosh qismi, ortopedik asos.',
        descriptionRu: 'Мягкое изголовье, ортопедическое основание.',
      },
      {
        name: 'Torsher', nameRu: 'Торшер', price: 690_000, category: 'Yoritish',
        image: img('1507473885765-e6ed057f782c'),
        description: 'Balandligi 160 sm, burilgan abajur.',
        descriptionRu: 'Высота 160 см, поворотный абажур.',
      },
      {
        name: 'Osma chiroq', nameRu: 'Подвесной светильник', price: 420_000, category: 'Yoritish',
        image: img('1513506003901-1e6a229e2d15'),
        description: 'Oshxona va stol usti uchun metall abajur.',
        descriptionRu: 'Металлический абажур для кухни и обеденного стола.',
      },
      {
        name: 'Devor javoni', nameRu: 'Настенный шкаф', price: 1_250_000, category: 'Saqlash',
        image: img('1595428774223-ef52624120d2'),
        description: 'Ochiq va yopiq tokchalar, dub rangi.',
        descriptionRu: 'Открытые и закрытые полки, цвет дуб.',
      },
    ],
  },

  {
    id: 'grocery',
    name: 'Oziq-ovqat / Market',
    nameRu: 'Продукты / Маркет',
    pitch: 'Meva, sabzavot, sut mahsulotlari — uyga yetkazish',
    brand: '#16A34A',
    accent: '#F59E0B',
    font: 'friendly',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'Miqdor', sizeLabelRu: 'Количество',
      colorLabel: 'Tur', colorLabelRu: 'Вид',
    },
    sizePresets: ['0.5 kg', '1 kg', '2 kg'],
    colorPresets: [],
    delivery: { fee: 10_000, freeFrom: 200_000, minOrder: 50_000 },
    hero: {
      title: 'Yangi mahsulotlar — bir soatda uyingizda',
      titleRu: 'Свежие продукты — у вас через час',
      subtitle: 'Bozordagidek yangi, do‘kondagidek qulay',
      subtitleRu: 'Свежо, как на базаре, удобно, как в магазине',
      image: img('1542838132-92c53300491e', 1200),
    },
    categories: [
      { name: 'Mevalar', nameRu: 'Фрукты', icon: 'apple' },
      { name: 'Sabzavotlar', nameRu: 'Овощи', icon: 'sabzavot' },
      { name: 'Sut mahsulotlari', nameRu: 'Молочные продукты', icon: 'milk' },
      { name: 'Non va tuxum', nameRu: 'Хлеб и яйца', icon: 'bread' },
    ],
    products: [
      {
        name: 'Qizil olma', nameRu: 'Красные яблоки', price: 18_000, category: 'Mevalar',
        image: img('1560806887-1e4cd0b6cbd6'), sizes: ['1 kg', '2 kg'], popular: true,
        description: 'Namangan olmasi, shirin va suvli. Narx 1 kg uchun.',
        descriptionRu: 'Наманганские яблоки, сладкие и сочные. Цена за 1 кг.',
      },
      {
        name: 'Tarvuz', nameRu: 'Арбуз', price: 4_000, category: 'Mevalar',
        image: img('1587049352846-4a222e784d38'),
        description: 'Mahalliy tarvuz, narx 1 kg uchun.',
        descriptionRu: 'Местный арбуз, цена за 1 кг.',
      },
      {
        name: 'Mevalar to‘plami', nameRu: 'Фруктовый набор', price: 85_000, oldPrice: 99_000, category: 'Mevalar',
        image: img('1610832958506-aa56368176cf'), popular: true,
        description: 'Tsitrus, kivi, avokado va mavsumiy mevalar — 3 kg.',
        descriptionRu: 'Цитрусы, киви, авокадо и сезонные фрукты — 3 кг.',
      },
      {
        name: 'Sabzavot to‘plami', nameRu: 'Овощной набор', price: 65_000, category: 'Sabzavotlar',
        image: img('1498837167922-ddd27525d352'),
        description: 'Pomidor, bodring, bulg‘or qalampiri va ko‘katlar.',
        descriptionRu: 'Помидоры, огурцы, болгарский перец и зелень.',
      },
      {
        name: 'Salat uchun ko‘katlar', nameRu: 'Зелень для салата', price: 15_000, category: 'Sabzavotlar',
        image: img('1540420773420-3366772f4999'),
        description: 'Yangi uzilgan ko‘katlar va rediska.',
        descriptionRu: 'Свежесрезанная зелень и редис.',
      },
      {
        name: 'Sigir suti, 1 l', nameRu: 'Коровье молоко, 1 л', price: 14_000, category: 'Sut mahsulotlari',
        image: img('1550583724-b2692b85b150'), popular: true,
        description: 'Fermer suti, 3.2% yog‘lilik.',
        descriptionRu: 'Фермерское молоко, 3,2% жирности.',
      },
      {
        name: 'Javdar noni', nameRu: 'Ржаной хлеб', price: 8_000, category: 'Non va tuxum',
        image: img('1509440159596-0249088772ff'),
        description: 'Har kuni ertalab pishiriladi.',
        descriptionRu: 'Выпекается каждое утро.',
      },
      {
        name: 'Tuxum, 10 dona', nameRu: 'Яйца, 10 шт.', price: 16_000, category: 'Non va tuxum',
        image: img('1582722872445-44dc5f7e3c8f'),
        description: 'Uy tovuqlari tuxumi.',
        descriptionRu: 'Яйца домашних кур.',
      },
    ],
  },

  {
    id: 'cosmetics',
    name: 'Kosmetika va parfyumeriya',
    nameRu: 'Косметика и парфюмерия',
    pitch: 'Parvarish, makiyaj va atirlar',
    brand: '#DB2777',
    accent: '#F9A8D4',
    font: 'elegant',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'Hajm', sizeLabelRu: 'Объём',
      colorLabel: 'Tus', colorLabelRu: 'Оттенок',
    },
    sizePresets: ['30 ml', '50 ml', '100 ml'],
    colorPresets: ['01 Och', '02 O‘rta', '03 To‘q'],
    delivery: { fee: 20_000, freeFrom: 400_000, minOrder: 0 },
    hero: {
      title: 'Go‘zalligingiz uchun original mahsulotlar',
      titleRu: 'Оригинальная косметика для вашей красоты',
      subtitle: 'Sertifikatlangan brendlar va sovg‘a to‘plamlari',
      subtitleRu: 'Сертифицированные бренды и подарочные наборы',
      image: img('1522335789203-aabd1fc54bc9', 1200),
    },
    categories: [
      { name: 'Parvarish', nameRu: 'Уход', icon: 'cream' },
      { name: 'Makiyaj', nameRu: 'Макияж', icon: 'sparkles' },
      { name: 'Atirlar', nameRu: 'Парфюмерия', icon: 'perfume' },
    ],
    products: [
      {
        name: 'Ayollar atiri', nameRu: 'Женский парфюм', price: 1_450_000, category: 'Atirlar',
        image: img('1541643600914-78b084683601'), sizes: ['50 ml', '100 ml'], popular: true,
        description: 'Gulli-aldegid notalar, uzoq saqlanadi.',
        descriptionRu: 'Цветочно-альдегидные ноты, стойкий аромат.',
      },
      {
        name: 'Gulli atir', nameRu: 'Цветочный аромат', price: 1_290_000, oldPrice: 1_490_000, category: 'Atirlar',
        image: img('1592945403244-b3fbafd7f539'), sizes: ['50 ml', '100 ml'],
        description: 'Atirgul va yasmin notalari.',
        descriptionRu: 'Ноты розы и жасмина.',
      },
      {
        name: 'Namlovchi krem', nameRu: 'Увлажняющий крем', price: 189_000, category: 'Parvarish',
        image: img('1556228578-8c89e6adf883'), popular: true,
        description: 'Gialuron kislotasi bilan, har kuni uchun.',
        descriptionRu: 'С гиалуроновой кислотой, для ежедневного ухода.',
      },
      {
        name: 'Yuz niqobi', nameRu: 'Маска для лица', price: 149_000, category: 'Parvarish',
        image: img('1608248543803-ba4f8c70ae0b'),
        description: 'Tiklovchi tungi niqob.',
        descriptionRu: 'Восстанавливающая ночная маска.',
      },
      {
        name: 'Tozalovchi gel', nameRu: 'Очищающий гель', price: 129_000, category: 'Parvarish',
        image: img('1620916566398-39f1143ab7be'),
        description: 'Yumshoq formula, sezgir teri uchun.',
        descriptionRu: 'Мягкая формула для чувствительной кожи.',
      },
      {
        name: 'Soyalar palitrasi', nameRu: 'Палетка теней', price: 259_000, category: 'Makiyaj',
        image: img('1512496015851-a90fb38ba796'), popular: true,
        description: '35 ta tus, mat va yaltiroq.',
        descriptionRu: '35 оттенков, матовые и сияющие.',
      },
      {
        name: 'Cho‘tkalar to‘plami', nameRu: 'Набор кистей', price: 199_000, category: 'Makiyaj',
        image: img('1596462502278-27bfdc403348'),
        description: '8 ta professional cho‘tka, sumkasi bilan.',
        descriptionRu: '8 профессиональных кистей в косметичке.',
      },
      {
        name: 'Makiyaj to‘plami', nameRu: 'Набор для макияжа', price: 459_000, category: 'Makiyaj',
        image: img('1522335789203-aabd1fc54bc9'), colors: ['01 Och', '02 O‘rta'],
        description: 'Tonal krem, pudra va ruj — sovg‘a qutisida.',
        descriptionRu: 'Тональный крем, пудра и помада — в подарочной коробке.',
      },
    ],
  },

  {
    id: 'electronics',
    name: 'Elektronika',
    nameRu: 'Электроника',
    pitch: 'Smartfon, noutbuk, gadjetlar — kafolat bilan',
    brand: '#2563EB',
    accent: '#22D3EE',
    font: 'modern',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'Xotira', sizeLabelRu: 'Память',
      colorLabel: 'Rang', colorLabelRu: 'Цвет',
    },
    sizePresets: ['128 GB', '256 GB', '512 GB'],
    colorPresets: ['Qora', 'Oq', 'Ko‘k', 'Kumush'],
    delivery: { fee: 0, freeFrom: 0, minOrder: 0 },
    hero: {
      title: 'Eng so‘nggi gadjetlar — rasmiy kafolat bilan',
      titleRu: 'Новейшие гаджеты — с официальной гарантией',
      subtitle: 'Muddatli to‘lov va bepul yetkazib berish',
      subtitleRu: 'Рассрочка и бесплатная доставка',
      image: img('1593642632559-0c6d3fc62b89', 1200),
    },
    categories: [
      { name: 'Smartfonlar', nameRu: 'Смартфоны', icon: 'phone' },
      { name: 'Noutbuklar', nameRu: 'Ноутбуки', icon: 'laptop' },
      { name: 'Audio', nameRu: 'Аудио', icon: 'headphones' },
      { name: 'Aqlli soatlar', nameRu: 'Умные часы', icon: 'watch' },
      { name: 'Aksessuarlar', nameRu: 'Аксессуары', icon: 'keyboard' },
    ],
    products: [
      {
        name: 'iPhone 12', nameRu: 'iPhone 12', price: 6_900_000, category: 'Smartfonlar',
        image: img('1592899677977-9c10ca588bbd'), sizes: ['128 GB', '256 GB'], colors: ['Qora', 'Ko‘k'], popular: true,
        description: 'OLED ekran, A14 protsessor, 1 yil kafolat.',
        descriptionRu: 'OLED-экран, процессор A14, гарантия 1 год.',
      },
      {
        name: 'iPhone 11', nameRu: 'iPhone 11', price: 4_900_000, oldPrice: 5_400_000, category: 'Smartfonlar',
        image: img('1511707171634-5f897ff02aa9'), sizes: ['64 GB', '128 GB'], colors: ['Oq', 'Qora'],
        description: 'Ikki kamerali, kuchli batareya.',
        descriptionRu: 'Двойная камера, ёмкий аккумулятор.',
      },
      {
        name: 'MacBook Air', nameRu: 'MacBook Air', price: 13_500_000, category: 'Noutbuklar',
        image: img('1517336714731-489689fd1ca8'), sizes: ['256 GB', '512 GB'], popular: true,
        description: 'M-seriya chip, 18 soatgacha batareya.',
        descriptionRu: 'Чип M-серии, до 18 часов работы.',
      },
      {
        name: 'Noutbuk 15.6″', nameRu: 'Ноутбук 15,6″', price: 7_200_000, category: 'Noutbuklar',
        image: img('1496181133206-80ce9b88a853'), sizes: ['512 GB', '1 TB'],
        description: 'Core i5, 16 GB RAM, ish va o‘qish uchun.',
        descriptionRu: 'Core i5, 16 ГБ ОЗУ, для работы и учёбы.',
      },
      {
        name: 'Apple Watch', nameRu: 'Apple Watch', price: 3_900_000, category: 'Aqlli soatlar',
        image: img('1546868871-7041f2a55e12'), sizes: ['41 mm', '45 mm'],
        description: 'Puls, uyqu va mashg‘ulotlarni kuzatadi.',
        descriptionRu: 'Пульс, сон и тренировки.',
      },
      {
        name: 'Simsiz quloqchin', nameRu: 'Беспроводные наушники', price: 890_000, category: 'Audio',
        image: img('1505740420928-5e560c06d30e'), colors: ['Qora', 'Oq'], popular: true,
        description: 'Shovqinni bostirish, 30 soat ishlaydi.',
        descriptionRu: 'Шумоподавление, 30 часов работы.',
      },
      {
        name: 'Studiya quloqchini', nameRu: 'Студийные наушники', price: 1_290_000, category: 'Audio',
        image: img('1583394838336-acd977736f90'),
        description: 'Professional ovoz, yumshoq quloq yostiqchalari.',
        descriptionRu: 'Профессиональный звук, мягкие амбушюры.',
      },
      {
        name: 'TWS quloqchin', nameRu: 'TWS-наушники', price: 450_000, category: 'Audio',
        image: img('1606220588913-b3aacb4d2f46'),
        description: 'Ixcham quti, sensorli boshqaruv.',
        descriptionRu: 'Компактный кейс, сенсорное управление.',
      },
      {
        name: 'Simsiz klaviatura', nameRu: 'Беспроводная клавиатура', price: 350_000, category: 'Aksessuarlar',
        image: img('1587829741301-dc798b83add3'),
        description: 'Ingichka, jim tugmalar, Bluetooth.',
        descriptionRu: 'Тонкая, тихие клавиши, Bluetooth.',
      },
      {
        name: 'Simsiz sichqoncha', nameRu: 'Беспроводная мышь', price: 190_000, category: 'Aksessuarlar',
        image: img('1527864550417-7fd91fc51a46'),
        description: 'Ergonomik shakl, 12 oy batareya.',
        descriptionRu: 'Эргономичная форма, батарея на 12 месяцев.',
      },
    ],
  },

  {
    id: 'flowers',
    name: 'Gullar va sovg‘alar',
    nameRu: 'Цветы и подарки',
    pitch: 'Guldastalar, kompozitsiyalar, tezkor yetkazish',
    brand: '#E11D48',
    accent: '#FDBA74',
    font: 'elegant',
    terms: {
      catalog: 'Guldastalar', catalogRu: 'Букеты',
      item: 'guldasta', itemRu: 'букет',
      sizeLabel: 'Hajm', sizeLabelRu: 'Размер',
      colorLabel: 'Rang', colorLabelRu: 'Цвет',
    },
    sizePresets: ['S', 'M', 'L'],
    colorPresets: ['Qizil', 'Pushti', 'Oq'],
    delivery: { fee: 30_000, freeFrom: 500_000, minOrder: 0 },
    hero: {
      title: 'His-tuyg‘ularingizni gullar aytsin',
      titleRu: 'Пусть цветы скажут о ваших чувствах',
      subtitle: '2 soatda yetkazamiz — otkritka sovg‘a',
      subtitleRu: 'Доставим за 2 часа — открытка в подарок',
      image: img('1487070183336-b863922373d4', 1200),
    },
    categories: [
      { name: 'Guldastalar', nameRu: 'Букеты', icon: 'flower' },
      { name: 'Kompozitsiyalar', nameRu: 'Композиции', icon: 'flower' },
      { name: 'Sovg‘alar', nameRu: 'Подарки', icon: 'gift' },
    ],
    products: [
      {
        name: 'Pushti guldasta', nameRu: 'Розовый букет', price: 350_000, category: 'Guldastalar',
        image: img('1563241527-3004b7be0ffd'), sizes: ['S', 'M', 'L'], popular: true,
        description: 'Pion atirgullar va evkalipt, kraft qog‘ozda.',
        descriptionRu: 'Пионовидные розы и эвкалипт в крафте.',
      },
      {
        name: 'Lolalar guldastasi', nameRu: 'Букет тюльпанов', price: 290_000, category: 'Guldastalar',
        image: img('1561181286-d3fee7d55364'), sizes: ['15 dona', '25 dona'],
        description: 'Gollandiya lolalari, bahor kayfiyati.',
        descriptionRu: 'Голландские тюльпаны, весеннее настроение.',
      },
      {
        name: 'Kamalak atirgullar', nameRu: 'Радужные розы', price: 590_000, oldPrice: 690_000, category: 'Guldastalar',
        image: img('1508610048659-a06b669e3321'), popular: true,
        description: '25 ta rang-barang atirgul, noyob sovg‘a.',
        descriptionRu: '25 разноцветных роз — необычный подарок.',
      },
      {
        name: '«Yurak» kompozitsiyasi', nameRu: 'Композиция «Сердце»', price: 450_000, category: 'Kompozitsiyalar',
        image: img('1526047932273-341f2a7631f9'),
        description: 'Yurak shaklidagi mavsumiy gullar.',
        descriptionRu: 'Сезонные цветы в форме сердца.',
      },
      {
        name: 'Dala gullari', nameRu: 'Полевые цветы', price: 220_000, category: 'Kompozitsiyalar',
        image: img('1490750967868-88aa4486c946'),
        description: 'Yorqin, quvnoq guldasta.',
        descriptionRu: 'Яркий, жизнерадостный букет.',
      },
      {
        name: 'Sovg‘a qutisi', nameRu: 'Подарочная коробка', price: 150_000, category: 'Sovg‘alar',
        image: img('1549465220-1a8b9238cd48'),
        description: 'Shokolad, otkritka va lenta — guldastaga qo‘shimcha.',
        descriptionRu: 'Шоколад, открытка и лента — дополнение к букету.',
      },
    ],
  },

  {
    id: 'bakery',
    name: 'Qandolat va tortlar',
    nameRu: 'Кондитерская и торты',
    pitch: 'Tort, desert va pishiriqlar — buyurtma asosida',
    brand: '#C2410C',
    accent: '#FBBF24',
    font: 'friendly',
    terms: {
      catalog: 'Menyu', catalogRu: 'Меню',
      item: 'mahsulot', itemRu: 'изделие',
      sizeLabel: 'Og‘irlik', sizeLabelRu: 'Вес',
      colorLabel: 'Ta’m', colorLabelRu: 'Вкус',
    },
    sizePresets: ['1 kg', '1.5 kg', '2 kg'],
    colorPresets: ['Shokolad', 'Vanil', 'Qulupnay'],
    delivery: { fee: 15_000, freeFrom: 300_000, minOrder: 0 },
    hero: {
      title: 'Har kuni yangi pishgan shirinliklar',
      titleRu: 'Свежая выпечка каждый день',
      subtitle: 'Bayramingiz uchun tortni oldindan buyurtma qiling',
      subtitleRu: 'Закажите торт к празднику заранее',
      image: img('1578985545062-69928b1d9587', 1200),
    },
    categories: [
      { name: 'Tortlar', nameRu: 'Торты', icon: 'cake' },
      { name: 'Pishiriqlar', nameRu: 'Выпечка', icon: 'croissant' },
      { name: 'Desertlar', nameRu: 'Десерты', icon: 'dessert' },
    ],
    products: [
      {
        name: 'Shokoladli tort', nameRu: 'Шоколадный торт', price: 320_000, category: 'Tortlar',
        image: img('1578985545062-69928b1d9587'), sizes: ['1 kg', '1.5 kg', '2 kg'], popular: true,
        description: 'Belgiya shokoladi, ganash va biskvit.',
        descriptionRu: 'Бельгийский шоколад, ганаш и бисквит.',
      },
      {
        name: 'Kamalak tort', nameRu: 'Радужный торт', price: 380_000, category: 'Tortlar',
        image: img('1464349095431-e9a21285b5f3'), sizes: ['1.5 kg', '2 kg'],
        description: 'Rang-barang qatlamlar, bolalar bayramiga.',
        descriptionRu: 'Разноцветные коржи — для детского праздника.',
      },
      {
        name: 'Rezavorli tort', nameRu: 'Ягодный торт', price: 420_000, oldPrice: 460_000, category: 'Tortlar',
        image: img('1535141192574-5d4897c12636'), sizes: ['1.5 kg', '2 kg'], popular: true,
        description: 'Qaymoqli krem va yangi rezavorlar.',
        descriptionRu: 'Сливочный крем и свежие ягоды.',
      },
      {
        name: 'Medovik (bo‘lak)', nameRu: 'Медовик (кусочек)', price: 45_000, category: 'Desertlar',
        image: img('1571115177098-24ec42ed204d'),
        description: 'Asalli qatlamlar, smetanali krem.',
        descriptionRu: 'Медовые коржи и сметанный крем.',
      },
      {
        name: 'Donatlar, 4 dona', nameRu: 'Донаты, 4 шт.', price: 60_000, category: 'Pishiriqlar',
        image: img('1551024601-bec78aea704b'),
        description: 'Shokolad glazuri va rangli sepma.',
        descriptionRu: 'Шоколадная глазурь и цветная посыпка.',
      },
      {
        name: 'Shokoladli pechenye', nameRu: 'Шоколадное печенье', price: 35_000, category: 'Pishiriqlar',
        image: img('1558961363-fa8fdf82db35'),
        description: '6 dona, ichi yumshoq.',
        descriptionRu: '6 шт., мягкие внутри.',
      },
      {
        name: 'Kruassan', nameRu: 'Круассан', price: 18_000, category: 'Pishiriqlar',
        image: img('1555507036-ab1f4038808a'), popular: true,
        description: 'Sariyog‘li, 27 qavatli xamir.',
        descriptionRu: 'На сливочном масле, 27 слоёв.',
      },
      {
        name: 'Qulupnayli desert', nameRu: 'Клубничный десерт', price: 38_000, category: 'Desertlar',
        image: img('1488477181946-6428a0291777'),
        description: 'Panna-kotta va qulupnay sousi.',
        descriptionRu: 'Панна-котта с клубничным соусом.',
      },
    ],
  },

  {
    id: 'other',
    name: 'Boshqa biznes',
    nameRu: 'Другой бизнес',
    pitch: 'Har qanday mahsulot sotadigan biznes uchun',
    brand: '#4F46E5',
    accent: '#22C55E',
    font: 'modern',
    terms: {
      catalog: 'Katalog', catalogRu: 'Каталог',
      item: 'mahsulot', itemRu: 'товар',
      sizeLabel: 'Variant', sizeLabelRu: 'Вариант',
      colorLabel: 'Rang', colorLabelRu: 'Цвет',
    },
    sizePresets: [],
    colorPresets: [],
    delivery: { fee: 20_000, freeFrom: 300_000, minOrder: 0 },
    hero: {
      title: 'Sifatli mahsulotlar — qulay narxlarda',
      titleRu: 'Качественные товары — по доступным ценам',
      subtitle: 'Onlayn buyurtma bering, tez yetkazamiz',
      subtitleRu: 'Закажите онлайн — быстро доставим',
      image: img('1549465220-1a8b9238cd48', 1200),
    },
    categories: [
      { name: 'Ommabop', nameRu: 'Популярное', icon: 'star' },
      { name: 'Yangi', nameRu: 'Новинки', icon: 'sparkles' },
      { name: 'Sovg‘alar', nameRu: 'Подарки', icon: 'gift' },
    ],
    products: [
      {
        name: 'Sovg‘a to‘plami', nameRu: 'Подарочный набор', price: 150_000, category: 'Sovg‘alar',
        image: img('1549465220-1a8b9238cd48'), popular: true,
        description: 'Chiroyli qadoqlangan sovg‘a qutisi.',
        descriptionRu: 'Красиво упакованная подарочная коробка.',
      },
      {
        name: 'Ryukzak', nameRu: 'Рюкзак', price: 420_000, category: 'Ommabop',
        image: img('1553062407-98eeb64c6a62'), colors: ['Ko‘k'], popular: true,
        description: 'Noutbuk bo‘limi, suv o‘tkazmaydi.',
        descriptionRu: 'Отделение для ноутбука, водонепроницаемый.',
      },
      {
        name: 'Simsiz quloqchin', nameRu: 'Беспроводные наушники', price: 890_000, category: 'Yangi',
        image: img('1505740420928-5e560c06d30e'),
        description: 'Shovqinni bostirish, 30 soat.',
        descriptionRu: 'Шумоподавление, 30 часов.',
      },
      {
        name: 'Stol chirog‘i', nameRu: 'Настольная лампа', price: 420_000, category: 'Yangi',
        image: img('1513506003901-1e6a229e2d15'),
        description: 'Zamonaviy dizayn, iliq yorug‘lik.',
        descriptionRu: 'Современный дизайн, тёплый свет.',
      },
      {
        name: 'Klassik soat', nameRu: 'Классические часы', price: 750_000, oldPrice: 850_000, category: 'Ommabop',
        image: img('1523275335684-37898b6baf30'),
        description: 'Suvga chidamli, charm tasma.',
        descriptionRu: 'Водозащита, кожаный ремешок.',
      },
      {
        name: 'Charm hamyon', nameRu: 'Кожаный кошелёк', price: 260_000, category: 'Sovg‘alar',
        image: img('1627123424574-724758594e93'),
        description: 'Tabiiy charm, 8 ta karta joyi.',
        descriptionRu: 'Натуральная кожа, 8 отделений.',
      },
    ],
  },
]

const BY_ID = new Map(BUSINESS_TYPES.map((type) => [type.id, type]))

export function businessType(id: string | undefined | null): BusinessType {
  return BY_ID.get(id as BusinessTypeId) ?? BY_ID.get('other')!
}

/** Shrift juftliklari — sarlavha va matn. Google Fonts'dan yuklanadi. */
export const FONT_PAIRS: Record<FontPairId, { label: string; display: string; body: string; href: string }> = {
  modern: {
    label: 'Zamonaviy',
    display: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    body: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap',
  },
  bold: {
    label: 'Qat’iy',
    display: '"Archivo Black", "Montserrat", ui-sans-serif, sans-serif',
    body: '"Montserrat", ui-sans-serif, system-ui, sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Montserrat:wght@400;500;600;700;800&display=swap',
  },
  elegant: {
    label: 'Nafis',
    display: '"Playfair Display", Georgia, serif',
    body: '"Manrope", ui-sans-serif, system-ui, sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&display=swap',
  },
  friendly: {
    label: 'Samimiy',
    display: '"Nunito", ui-rounded, system-ui, sans-serif',
    body: '"Nunito", ui-rounded, system-ui, sans-serif',
    href: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
  },
}

/** Formada taklif qilinadigan tayyor ranglar. */
export const COLOR_PRESETS: string[] = [
  '#E4572E', '#F97316', '#F59E0B', '#16A34A', '#0F766E', '#0EA5E9',
  '#2563EB', '#4F46E5', '#7C3AED', '#DB2777', '#E11D48', '#1F2937',
]
