import {
  ArrowRight, BarChart3, Bell, Bike, Bot, BrainCircuit, Clapperboard, CreditCard, FileBarChart, Flame, Globe, Headset,
  KeyRound, Laptop, Layers, LayoutDashboard, LayoutGrid, MapPinned, Megaphone, Palette, Phone, Send, Settings, ShoppingBag,
  Smartphone, Store, Tag, UserCog, Users, Wallet, type LucideIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { PLANS, PLAN_ORDER, PLATFORM, TRIAL_DAYS, YEAR_SAVING_PERCENT, formatSum } from '../../platform/config'
import { BUSINESS_TYPES } from '../../platform/business-types'
import { goTo } from '../router'
import { Logo } from '../components/Logo'
import './guide.css'

/**
 * /qollanma — SavdoGO'ning to'liq qo'llanmasi, oddiy tilda.
 *
 * SavdoGO botidagi «📖 Qo'llanma» tugmasi shu sahifani mini app sifatida
 * ochadi (landingdan ham havola bor). Ichida: do'kon qanday ochiladi,
 * SavdoGO boti, boshqaruv paneli, o'z boti, mijoz qanday buyurtma
 * beradi, narxlar va savollar. Pastda doim «Do'kon ochish» tugmasi.
 */

const BOT = PLATFORM.botUsername || 'savdogouz_bot'

const SECTIONS = [
  { id: 'nima', label: 'SavdoGO nima' },
  { id: 'ochish', label: 'Do‘kon ochish' },
  { id: 'bot', label: 'SavdoGO boti' },
  { id: 'panel', label: 'Boshqaruv paneli' },
  { id: 'ozbot', label: 'O‘z botingiz' },
  { id: 'mijoz', label: 'Mijoz qanday buyuradi' },
  { id: 'narx', label: 'Narx va to‘lov' },
  { id: 'savollar', label: 'Savollar' },
]

type Item = { icon: LucideIcon; title: string; text: ReactNode; bot?: boolean }

const PANEL: { group: string; items: Item[] }[] = [
  {
    group: 'Savdo',
    items: [
      { icon: BarChart3, title: 'Bosh sahifa', text: 'Bugungi tushum, buyurtmalar soni, oxirgi 14 kun grafigi va eng ko‘p sotilgan mahsulotlar — bir qarashda.' },
      { icon: ShoppingBag, title: 'Buyurtmalar', text: 'Yangi buyurtma ovozli signal bilan keladi. «Qabul qilindi → Yetkazilmoqda → Yetkazildi» — har qadamda mijozga xabar boradi.' },
      { icon: FileBarChart, title: 'Hisobotlar', text: 'Tushum, eng ko‘p sotilganlar, kategoriyalar, to‘lov turlari, qaysi soatda ko‘p buyurtma — bitta tugma bilan Excel faylga.' },
      { icon: MapPinned, title: 'Kuryerlar xaritasi', text: 'Har bir kuryer hozir qayerda ekanini xaritada ko‘rasiz.', bot: true },
    ],
  },
  {
    group: 'Katalog',
    items: [
      { icon: LayoutGrid, title: 'Mahsulotlar', text: 'Rasm, narx, eski narx va chegirma, o‘lcham, rang, qoldiq. O‘zbek va rus tilida. Yuzlab mahsulotni Excel fayl orqali birdaniga yuklaysiz.' },
      { icon: Layers, title: 'Kategoriyalar va bo‘limlar', text: 'Mahsulotlarni guruhlaysiz va saytdagi tartibini o‘zingiz belgilaysiz — sudrab joyini almashtirasiz.' },
      { icon: Flame, title: 'Vaqtli aksiyalar', text: 'Ma’lum vaqtgacha amal qiladigan chegirma. Saytda taymer bilan ko‘rinadi — mijozni shoshiltiradi.' },
      { icon: Clapperboard, title: 'Reklama banneri', text: 'Sayt ochilganda chiqadigan rasm yoki video reklama — yangi mahsulot yoki aksiya haqida.' },
      { icon: Tag, title: 'Promokodlar', text: 'Chegirma kodlari: masalan, birinchi xarid uchun 10%.' },
    ],
  },
  {
    group: 'Odamlar',
    items: [
      { icon: Users, title: 'Mijozlar', text: 'Kim, qachon va qancha xarid qilgani — doimiy mijozlaringizni bilasiz.' },
      { icon: UserCog, title: 'Xodimlar', text: 'Admin va kuryer qo‘shasiz. Har biri faqat o‘ziga kerakli bo‘limni ko‘radi.' },
      { icon: Megaphone, title: 'Ommaviy xabar', text: 'Barcha mijozlaringizga va Telegram kanalingizga rasm va tugma bilan xabar — yangi aksiya haqida bir bosishda.', bot: true },
      { icon: Headset, title: 'Kuryerlar chati', text: 'Kuryer manzilni topolmasa — ilovadan yozadi, siz paneldan javob berasiz.', bot: true },
      { icon: Wallet, title: 'Kuryerlar kassasi', text: 'Kuryer yig‘gan naqd pulni topshiradi, siz tasdiqlaysiz — har bir so‘m hisobda.', bot: true },
    ],
  },
  {
    group: 'Do‘kon',
    items: [
      { icon: Palette, title: 'Dizayn va aloqa', text: 'Logo, rang, shrift, bosh sahifa rasmi, telefon, manzil va ish vaqti.' },
      { icon: Settings, title: 'Yetkazish va to‘lov', text: 'Yetkazish narxi, qaysi summadan bepul, minimal buyurtma, olib ketish, naqd yoki karta.' },
      { icon: CreditCard, title: 'Obuna va to‘lov', text: 'Tarifni tanlaysiz, kartaga o‘tkazasiz va chek rasmini yuklaysiz.' },
      { icon: Store, title: 'Yangi do‘kon', text: 'Ikkinchi biznesingiz bo‘lsa — ariza qoldirasiz, tasdiqlangach bitta hisobdan ikkalasini boshqarasiz.' },
      { icon: KeyRound, title: 'Hisobim', text: 'Kirish usullari: Telegram, Google va email. Zaxira usul ulab qo‘ying — telefon yo‘qolsa ham do‘kon qo‘lingizda qoladi.' },
      { icon: BrainCircuit, title: 'Miya', text: 'Butun do‘koningizning jonli 3D ko‘rinishi — buyurtmalar va mijozlar yulduzlardek.' },
    ],
  },
]

const FAQ: { q: string; a: ReactNode }[] = [
  { q: 'Dasturlashni bilishim kerakmi?', a: 'Yo‘q. Hammasi tugmalar bilan: forma to‘ldirasiz, mahsulot qo‘shasiz — tamom. Telefonning o‘zi yetadi.' },
  { q: 'Telefondan boshqarsa bo‘ladimi?', a: 'Ha. Boshqaruv paneli telefonga moslangan va Telegram ichida ham ochiladi. Kompyuterda ham ishlaydi.' },
  { q: 'Mahsulotlarni qanday qo‘shaman?', a: 'Boshqaruv paneli → «Mahsulotlar». Bittalab (rasm, narx, o‘lcham bilan) yoki Excel fayl orqali yuzlab mahsulotni birdaniga. Namuna mahsulotlarni o‘chirib, o‘zingiznikini qo‘yasiz.' },
  { q: 'Boshqa telefondan qanday kiraman?', a: <>O‘sha Telegram hisobi bo‘lsa — @{BOT} → «⚙️ Boshqaruv paneli». Telegram yangi, lekin raqam o‘sha bo‘lsa — botga raqamingizni yuboring, do‘kon o‘zi ulanadi. Panelning <b>«Hisobim»</b> bo‘limida Google yoki email ulab qo‘ysangiz — istalgan qurilmadan shu bilan kirasiz.</> },
  { q: 'Telegram kanalimga ham yuborsa bo‘ladimi?', a: 'Ha. Botingizni kanalga admin qilib qo‘shing («Xabar joylash» huquqi bilan) — «Ommaviy xabar» bo‘limida kanal o‘zi paydo bo‘ladi, belgilab yuborasiz.' },
  { q: 'Kompyuterda qanday kiraman?', a: <>SavdoGO botidagi «💻 Kompyuterda ochish» tugmasi bir martalik havola beradi. Yoki <b>{PLATFORM.rootDomain}/admin</b> sahifasida «Telegram orqali kirish» ni bosing — botda kodni tasdiqlaysiz, parol kerak emas.</> },
  { q: 'O‘z domenimni ulasa bo‘ladimi?', a: <>Ha. Do‘kon avval <b>nomingiz.{PLATFORM.rootDomain}</b> da ochiladi. To‘lovdan keyin o‘z domeningizni (masalan, kafenur.uz) ulab beramiz.</> },
  { q: 'Sinov tugasa nima bo‘ladi?', a: 'Sayt ochilib turadi, lekin buyurtma qabul qilinmaydi va panelda o‘zgartirib bo‘lmaydi. To‘lov tasdiqlangan zahoti hammasi qaytadi — mahsulot, buyurtma va sozlamalar o‘chmaydi.' },
  { q: 'Ikkinchi do‘kon ochsam bo‘ladimi?', a: 'Ha. Boshqaruv paneli → «Yangi do‘kon» → ariza. Tasdiqlangach yangi do‘konni shu hisobga qo‘shasiz va ikkalasini almashtirib boshqarasiz.' },
  { q: 'Mijozlarim qaysi tilda ko‘radi?', a: 'O‘zbek va rus tillarida — mijoz o‘zi tanlaydi.' },
]

export function GuidePage() {
  // Bot ichida (mini app) — oynani to'liq ochamiz
  useEffect(() => {
    const tg = (window as unknown as { Telegram?: { WebApp?: { ready?: () => void; expand?: () => void } } }).Telegram?.WebApp
    tg?.ready?.()
    tg?.expand?.()
    window.scrollTo({ top: 0 })
  }, [])

  const types = BUSINESS_TYPES.filter((t) => t.id !== 'other').map((t) => t.name)

  return (
    <div className="gd">
      <header className="gd-top">
        <button className="gd-top__logo" onClick={() => goTo('home')} aria-label="Bosh sahifaga"><Logo /></button>
        <span className="gd-top__tag">Qo‘llanma</span>
      </header>

      <section className="gd-hero">
        <h1>SavdoGO qanday ishlaydi?</h1>
        <p>Hammasi oddiy tilda: do‘kon qanday ochiladi, bot va boshqaruv paneli nima qila oladi, mijoz qanday buyurtma beradi.</p>
        <div className="gd-hero__badges">
          <span>⏱ 5 daqiqada do‘kon</span>
          <span>🎁 {TRIAL_DAYS} kun bepul</span>
          <span>💳 Karta kerak emas</span>
        </div>
      </section>

      <nav className="gd-toc" aria-label="Mundarija">
        {SECTIONS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`}><b>{i + 1}</b>{s.label}</a>
        ))}
      </nav>

      {/* 1 */}
      <Section id="nima" n={1} title="SavdoGO nima?">
        <p className="gd-lead">Bir marta ro‘yxatdan o‘tasiz va biznesingiz uchun uchta narsa olasiz:</p>
        <div className="gd-cards">
          <Card icon={Globe} title="Shaxsiy sayt" tone="violet">
            <b>nomingiz.{PLATFORM.rootDomain}</b> — mijozlar telefon yoki kompyuterdan ochadi, mahsulotlarni ko‘radi va buyurtma beradi.
          </Card>
          <Card icon={LayoutDashboard} title="Boshqaruv paneli" tone="lime">
            Mahsulot, narx, buyurtma, aksiya va hisobotlar — hammasini telefoningizdan boshqarasiz.
          </Card>
          <Card icon={Bot} title="Telegram bot" tone="blue">
            Mijozlar do‘koningizni botda ilovadek ochadi, yangi buyurtma sizga Telegram’da darhol keladi.
          </Card>
        </div>
        <p className="gd-note">Dasturchi, dizayner yoki server kerak emas — hammasi tayyor.</p>
      </Section>

      {/* 2 */}
      <Section id="ochish" n={2} title="Do‘kon qanday ochiladi?">
        <Steps
          items={[
            { title: 'Raqamingizni yuboring', text: <>@{BOT} da «📱 Raqamni yuborish» tugmasini bosing. Raqamni Telegram tasdiqlaydi — parol o‘ylab topish shart emas.</> },
            { title: '«🛍 Do‘kon ochish» ni bosing', text: 'Bot ichida 5 qadamli forma ochiladi. Har qadamda o‘ng tomonda (telefonda — pastda) do‘koningiz qanday ko‘rinishini ko‘rib turasiz.' },
            { title: 'Tayyor!', text: 'Bot sizga do‘kon havolasi va boshqaruv tugmalarini yuboradi. Namuna mahsulotlarni o‘zingiznikiga almashtiring va havolani mijozlarga yuboring.' },
          ]}
        />
        <h3 className="gd-h3">Formadagi 5 qadam</h3>
        <ol className="gd-form">
          <li><b>Biznes turi.</b> {types.slice(0, 6).join(', ')} va boshqalar — jami {BUSINESS_TYPES.length} xil. Tanlasangiz katalog, ranglar va namuna mahsulotlar o‘zi moslanadi.</li>
          <li><b>Ma’lumotlar.</b> Do‘kon nomi, telefon, shahar, manzil, ish vaqti.</li>
          <li><b>Yetkazish va to‘lov.</b> Yetkazish narxi, qaysi summadan bepul, olib ketish, naqd yoki karta.</li>
          <li><b>Dizayn.</b> Logo, asosiy rang va shrift.</li>
          <li><b>Manzil.</b> Saytingiz nomi: <code>nomingiz.{PLATFORM.rootDomain}</code></li>
        </ol>
      </Section>

      {/* 3 */}
      <Section id="bot" n={3} title={`SavdoGO boti (@${BOT})`}>
        <p className="gd-lead">Do‘kon ochilgach, botdagi menyu orqali hammasini boshqarasiz:</p>
        <List
          items={[
            { icon: LayoutDashboard, title: '⚙️ Boshqaruv paneli', text: 'Telegram ichida ochiladi, parolsiz kirasiz.' },
            { icon: Globe, title: '🌐 Do‘konni ochish', text: 'Saytingiz mijozlarga qanday ko‘rinishini ko‘rasiz.' },
            { icon: Bot, title: '🤖 O‘z botimni ulash', text: 'Do‘koningizning shaxsiy botini ulaysiz — bepul (5-bo‘limga qarang).' },
            { icon: Laptop, title: '💻 Kompyuterda ochish', text: 'Kompyuterda kirish uchun 10 daqiqalik, bir martalik havola.' },
            { icon: Bell, title: 'Buyurtma xabarlari', text: 'O‘z botingiz ulanmaguncha yangi buyurtmalar shu botga keladi.' },
          ]}
        />
        <p className="gd-note">Menyuni istalgan vaqtda chaqirish uchun botga <b>/start</b> yozing.</p>
      </Section>

      {/* 4 */}
      <Section id="panel" n={4} title="Boshqaruv paneli">
        <p className="gd-lead">Do‘koningizni boshqaradigan joy. Menyudagi har bir bo‘lim nima qilishi:</p>
        {PANEL.map((group) => (
          <div key={group.group} className="gd-group">
            <h3 className="gd-h3">{group.group}</h3>
            <List items={group.items} />
          </div>
        ))}
        <p className="gd-note"><span className="gd-botmark">🤖</span> belgisi bor bo‘limlar o‘z Telegram botingiz ulangach ochiladi.</p>
      </Section>

      {/* 5 */}
      <Section id="ozbot" n={5} title="O‘z Telegram botingiz — bepul">
        <p className="gd-lead">Do‘koningizning nomi va rasmi bilan shaxsiy bot. Ulasangiz:</p>
        <List
          items={[
            { icon: Smartphone, title: 'Do‘kon botda', text: 'Mijozlar do‘koningizni botda ilovadek ochadi, buyurtma holati unga xabar bo‘lib keladi.' },
            { icon: Bell, title: 'Buyurtmalar Telegram’ga', text: 'Yangi buyurtma sizga va adminlarga keladi — «✅ Qabul qilindi» tugmasi bilan.' },
            { icon: Bike, title: 'Kuryerlar', text: 'Kuryerlar ilovasi, jonli xarita, kassa va chat ochiladi.' },
            { icon: Megaphone, title: 'Ommaviy xabar', text: 'Barcha mijozlaringizga rasm va tugma bilan xabar yuborasiz.' },
          ]}
        />
        <h3 className="gd-h3">Qanday ulanadi — 2 daqiqa</h3>
        <Steps
          items={[
            { title: '@BotFather ni oching', text: <>Telegram’da <b>@BotFather</b> ni toping va <b>/newbot</b> yozing.</> },
            { title: 'Nom va username bering', text: <>Nom — masalan, do‘koningiz nomi. Username oxiri <b>bot</b> bilan tugasin: <code>kafenur_bot</code></> },
            { title: 'Tokenni yuboring', text: <>BotFather bergan tokenni (<code>123456789:AA…</code>) @{BOT} ga yuboring yoki panel → «Kuryerlar va bot» ga qo‘ying. Tayyor!</> },
          ]}
        />
      </Section>

      {/* 6 */}
      <Section id="mijoz" n={6} title="Mijoz qanday buyurtma beradi?">
        <Steps
          items={[
            { title: 'Do‘koningizni ochadi', text: 'Saytingiz havolasi yoki botingiz orqali — ilova o‘rnatish shart emas.' },
            { title: 'Tanlaydi', text: 'Katalogdan mahsulotni tanlaydi, o‘lcham va rangini belgilaydi, savatga qo‘shadi.' },
            { title: 'Buyurtma beradi', text: 'Manzilini xaritada belgilaydi (yoki olib ketishni tanlaydi), naqd yoki karta orqali to‘lovni tanlaydi.' },
            { title: 'Kuzatib boradi', text: 'Buyurtma sizga darhol keladi. Mijoz holatini ko‘rib turadi: qabul qilindi, yo‘lda, yetkazildi.' },
          ]}
        />
      </Section>

      {/* 7 */}
      <Section id="narx" n={7} title="Narx va to‘lov">
        <div className="gd-trial">
          <b>{TRIAL_DAYS} kun bepul</b>
          <span>Barcha imkoniyatlar ochiq, karta so‘ralmaydi.</span>
        </div>
        <div className="gd-plans">
          {PLAN_ORDER.map((id) => (
            <div key={id} className={'gd-plan' + (id === 'year' ? ' is-best' : '')}>
              {id === 'year' && <i>−{YEAR_SAVING_PERCENT}%</i>}
              <span>{PLANS[id].name}</span>
              <b>{formatSum(PLANS[id].price)}</b>
              <small>{PLANS[id].days} kun</small>
            </div>
          ))}
        </div>
        <p className="gd-note">Hamma tarifda imkoniyatlar bir xil. O‘z Telegram botingizni ulash — bepul.</p>
        <h3 className="gd-h3">Qanday to‘lanadi</h3>
        <Steps
          items={[
            { title: '«Obuna va to‘lov» ni oching', text: 'Boshqaruv panelida tarifni tanlaysiz.' },
            { title: 'Kartaga o‘tkazing', text: 'Ko‘rsatilgan kartaga summani o‘tkazasiz va chek (skrinshot) rasmini yuklaysiz.' },
            { title: 'Tasdiqlanadi', text: 'Chek tekshirilgach muddat qo‘shiladi. Sinov tugamasdan to‘lasangiz, qolgan kunlar ham saqlanadi.' },
          ]}
        />
      </Section>

      {/* 8 */}
      <Section id="savollar" n={8} title="Ko‘p beriladigan savollar">
        <div className="gd-faq">
          {FAQ.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
        <div className="gd-help">
          <b>Savol qoldimi?</b>
          <span>Yozing yoki qo‘ng‘iroq qiling — yordam beramiz.</span>
          <div>
            <a href={PLATFORM.telegramHref} target="_blank" rel="noreferrer"><Send size={16} /> {PLATFORM.telegram}</a>
            <a href={PLATFORM.phoneHref}><Phone size={16} /> {PLATFORM.phone}</a>
          </div>
        </div>
      </Section>

      <div className="gd-cta">
        <button className="gd-cta__btn" onClick={() => goTo('start')}>
          <Store size={20} /> Do‘kon ochish — {TRIAL_DAYS} kun bepul <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="gd-sec">
      <h2><span>{n}</span>{title}</h2>
      {children}
    </section>
  )
}

function Card({ icon: Icon, title, tone, children }: { icon: LucideIcon; title: string; tone: 'violet' | 'lime' | 'blue'; children: ReactNode }) {
  return (
    <div className={`gd-card gd-card--${tone}`}>
      <i><Icon size={22} /></i>
      <b>{title}</b>
      <p>{children}</p>
    </div>
  )
}

function List({ items }: { items: Item[] }) {
  return (
    <ul className="gd-list">
      {items.map(({ icon: Icon, title, text, bot }) => (
        <li key={title}>
          <i><Icon size={20} /></i>
          <span>
            <b>{title}{bot && <span className="gd-botmark" title="O‘z botingiz bilan">🤖</span>}</b>
            <small>{text}</small>
          </span>
        </li>
      ))}
    </ul>
  )
}

function Steps({ items }: { items: { title: string; text: ReactNode }[] }) {
  return (
    <ol className="gd-steps">
      {items.map((s, i) => (
        <li key={s.title}>
          <span>{i + 1}</span>
          <div>
            <b>{s.title}</b>
            <p>{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

