import type { ComponentType, SVGProps } from 'react'
import {
  Apple, Archive, Armchair, BedDouble, Beef, Cake, CakeSlice, Carrot, ChefHat, CookingPot, Croissant, CupSoda,
  Droplets, Drumstick, Egg, Fish, Flower2, Footprints, Gem, Gift, Glasses, Grid2X2, Ham, Headphones,
  IceCreamBowl, IceCreamCone, Keyboard, Lamp, Laptop, Milk, Package, Pizza, Popsicle, Salad, Sandwich,
  Shirt, ShoppingBag, Smartphone, Snowflake, Sofa, Soup, Sparkles, SprayCan, Star, Tag, Vegan, Watch, Wheat,
} from 'lucide-react'
import { CurdBarIcon, DumplingIcon, SamsaIcon } from '../components/icons/FoodIcons'
import { DressIcon, HeelIcon, HoodieIcon, JacketIcon, JeansIcon, SneakerIcon } from '../components/icons/ShopIcons'

/**
 * Ikonka komponenti.
 *
 * `LucideIcon` emas: ro'yxatda o'zimiz chizgan ikonkalar ham bor
 * (chuchvara, sirok, somsa) — lucide'da ular yo'q edi.
 */
export type CategoryIconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

/**
 * Kategoriya ikonkasi.
 *
 * Avval bazadagi `icon` maydoniga qaraydi (admin tanlagan), topilmasa
 * nom bo'yicha taxmin qiladi, u ham bo'lmasa umumiy yorliq ishlatiladi.
 * Ilgari faqat oldindan yozilgan nomlar bilan solishtirilardi, shuning
 * uchun har qanday yangi kategoriya doim quti bo'lib qolardi (F-17).
 *
 * Ro'yxat avval MUSA (oziq-ovqat) assortimentiga moslangan edi; endi
 * platformadagi har bir biznes turi andozasining kalitlari ham bor
 * (business-types.ts → `categories[].icon`): kiyim, poyabzal, mebel,
 * kosmetika, elektronika, gullar, qandolat. Aks holda kiyim do'konida
 * ham hamma kategoriya qozon bo'lib chiqardi.
 */
const BY_KEY: Record<string, CategoryIconType> = {
  all: Grid2X2,

  // Xamirli mahsulotlar
  dumpling: DumplingIcon,
  chuchvara: DumplingIcon,
  pelmeni: DumplingIcon,
  manti: DumplingIcon,
  somsa: SamsaIcon,
  samsa: SamsaIcon,
  hanum: CookingPot,
  xamir: Wheat,
  dough: Wheat,
  lagmon: Soup,
  ugra: Wheat,

  // Go'shtli mahsulotlar
  meat: Beef,
  gosht: Beef,
  beef: Beef,
  mol: Beef,
  chicken: Drumstick,
  tovuq: Drumstick,
  nugget: Drumstick,
  kotlet: Ham,
  cutlet: Ham,
  lulya: Ham,
  kabob: Ham,
  sausage: Ham,
  hotdog: Sandwich,
  burger: Sandwich,
  pizza: Pizza,

  // Muzqaymoq va sut shirinliklari
  muzqaymoq: IceCreamCone,
  morojniy: IceCreamCone,
  plombir: IceCreamCone,
  eskimo: Popsicle,
  popsicle: Popsicle,
  rojok: IceCreamCone,
  vedro: IceCreamBowl,
  sirok: CurdBarIcon,
  syrok: CurdBarIcon,
  glazur: CurdBarIcon,
  tvorog: Milk,
  sut: Milk,
  dairy: Milk,
  milk: Milk,

  // Boshqa
  fish: Fish,
  baliq: Fish,
  egg: Egg,
  tuxum: Egg,
  vegetable: Carrot,
  sabzavot: Carrot,
  salad: Salad,
  vegan: Vegan,
  dessert: Cake,
  shirinlik: Cake,
  frozen: Snowflake,
  muzlatilgan: Snowflake,
  set: ChefHat,
  box: Package,

  // Restoran
  soup: Soup,
  drink: CupSoda,

  // Kiyim va poyabzal
  shirt: Shirt,
  dress: DressIcon,
  jacket: JacketIcon,
  jeans: JeansIcon,
  hoodie: HoodieIcon,
  sneaker: SneakerIcon,
  shoe: Footprints,
  heel: HeelIcon,

  // Aksessuarlar
  watch: Watch,
  glasses: Glasses,
  gem: Gem,
  bag: ShoppingBag,

  // Mebel
  sofa: Sofa,
  chair: Armchair,
  bed: BedDouble,
  lamp: Lamp,
  cabinet: Archive,

  // Oziq-ovqat
  apple: Apple,
  bread: Croissant,

  // Kosmetika
  cream: Droplets,
  sparkles: Sparkles,
  perfume: SprayCan,

  // Elektronika
  phone: Smartphone,
  laptop: Laptop,
  headphones: Headphones,
  keyboard: Keyboard,

  // Gullar va qandolat
  flower: Flower2,
  gift: Gift,
  cake: Cake,
  croissant: Croissant,

  // Umumiy
  star: Star,
  tag: Tag,
}

const BY_NAME: [RegExp, CategoryIconType][] = [
  [/chuchvara|pelmen|dumpling|пельмен|чучвар/i, DumplingIcon],
  [/manti|hanum|xonim|мант|ханум/i, DumplingIcon],
  [/somsa|samsa|самс/i, SamsaIcon],
  [/lagʻmon|lagmon|ugra|лагман/i, Soup],
  [/xamir|dough|тест/i, Wheat],
  [/kotlet|lyulya|lʻulya|kabob|kolbasa|sosiska|котлет|люля|колбас|сосис/i, Ham],
  [/tovuq|nagget|nugget|chicken|товук|кур|наггет/i, Drumstick],
  [/goʻsht|gosht|mol|qoʻy|beef|meat|мяс|говяд/i, Beef],
  [/baliq|fish|рыб/i, Fish],
  [/burger|sendvich|hot ?dog|бургер|сэндвич/i, Sandwich],
  [/pitsa|pizza|пицц/i, Pizza],
  [/tuxum|egg|яйц/i, Egg],
  [/sabzavot|vegetable|овощ/i, Carrot],
  [/salat|salad|салат/i, Salad],
  [/sirok|syrok|glazur|tvorog|сырок|сырк|творож|глазир/i, CurdBarIcon],
  [/eskimo|muzli tayoq|эскимо/i, Popsicle],
  [/muzqaymoq|plombir|morojen|rojok|морожен|пломбир|рожок/i, IceCreamCone],
  [/sut|dairy|молоч|молоко/i, Milk],
  [/shirinlik|dessert|tort|десерт|торт/i, Cake],
  [/muzlatilgan|frozen|заморож/i, Snowflake],
  [/toʻplam|set|combo|набор/i, ChefHat],
  [/yarim tayyor|полуфабрикат/i, DumplingIcon],
  [/ichimlik|sharbat|drink|напит|сок/i, CupSoda],
  [/futbolka|ko[ʻ‘'`]?ylak(?!lar)|shirt|футбол|рубаш/i, Shirt],
  [/ko[ʻ‘'`]?ylaklar|dress|плать/i, DressIcon],
  [/kurtka|palto|ustki|jacket|куртк|пальто|верхн/i, JacketIcon],
  [/shim|jinsi|jeans|брюк|джинс/i, JeansIcon],
  [/xudi|hudi|sviter|hoodie|худи|свитер/i, HoodieIcon],
  [/krossovka|sneaker|кроссов/i, SneakerIcon],
  [/tufli|poshna|туфл|каблук/i, HeelIcon],
  [/poyabzal|kedlar|oyoq kiyim|обув|кеды/i, Footprints],
  [/soat|watch|час/i, Watch],
  [/ko[ʻ‘'`]?zoynak|glasses|очк/i, Glasses],
  [/zargar|uzuk|bilakuzuk|jewel|украш|кольц/i, Gem],
  [/sumka|bag|сумк/i, ShoppingBag],
  [/divan|sofa|диван/i, Sofa],
  [/stul|kreslo|chair|стул|кресл/i, Armchair],
  [/yotoq|karavot|bed|спальн|кроват/i, BedDouble],
  [/yoritish|chiroq|lamp|освещ|ламп/i, Lamp],
  [/shkaf|saqlash|javon|шкаф|хранен/i, Archive],
  [/meva|fruit|фрукт/i, Apple],
  [/non|bread|хлеб/i, Croissant],
  [/atir|parfyum|perfume|духи|парфюм/i, SprayCan],
  [/makiyaj|makeup|макияж/i, Sparkles],
  [/parvarish|krem|uход|уход|крем/i, Droplets],
  [/smartfon|telefon|phone|смартф|телефон/i, Smartphone],
  [/noutbuk|laptop|ноутбук/i, Laptop],
  [/audio|quloqchin|naushnik|наушн|аудио/i, Headphones],
  [/gul|buket|flower|цвет|букет/i, Flower2],
  [/sovg[ʻ‘'`]?a|gift|подар/i, Gift],
  [/pishiriq|vypechka|выпечк/i, Croissant],
  [/desert|десерт/i, CakeSlice],
  [/ommabop|mashhur|popular|популяр/i, Star],
  [/yangi|new|новинк/i, Sparkles],
  [/barcha|hamma|все|all/i, Grid2X2],
]

/**
 * Bot yangi kategoriyaga doim "package" yozadi — bu "tanlanmagan" degani.
 * Shuning uchun uni e'tiborsiz qoldirib, nom bo'yicha aniqlashga o'tamiz.
 */
const UNSET_ICONS = new Set(['', 'package', 'Package'])

export function categoryIcon(icon?: string, name?: string): CategoryIconType {
  if (icon && !UNSET_ICONS.has(icon.trim())) {
    const found = BY_KEY[icon.toLowerCase().trim()]
    if (found) return found
  }
  if (name) {
    for (const [pattern, Icon] of BY_NAME) {
      if (pattern.test(name)) return Icon
    }
  }
  return Tag
}
