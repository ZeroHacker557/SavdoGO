import { ArrowRight, Mail, Phone, Plus, Send } from 'lucide-react'
import type { CSSProperties } from 'react'
import { PLANS, PLATFORM, TRIAL_DAYS, formatSum, platformBotLink } from '../../platform/config'
import { Logo } from '../components/Logo'
import { goTo } from '../router'

const FAQ: { q: string; a: string }[] = [
  {
    q: `${TRIAL_DAYS} kunlik bepul sinovda nima ochiq?`,
    a: `Hammasi. Formani yuborishingiz bilan do‘koningiz o‘z manzilida ochiladi — logotipingiz, ranglaringiz va biznesingizga mos namuna mahsulotlar bilan — va ${TRIAL_DAYS} kun bepul, to‘liq ishlaydi: mahsulot qo‘shasiz, mijozlar buyurtma beradi, admin panelning hamma bo‘limi ochiq. Karta ma’lumoti so‘ralmaydi. Sinov tugagach tanlagan tarifingizni to‘laysiz; to‘lamasangiz, sayt ochiq qoladi, lekin buyurtma qabul qilinmaydi.`,
  },
  {
    q: 'To‘lov qanday qilinadi?',
    a: `Admin paneldagi «Obuna va to‘lov» bo‘limida tarifni tanlaysiz, ko‘rsatilgan kartaga pul o‘tkazasiz va chek rasmini yuklaysiz. Tekshirilgach (odatda 1 soat ichida) obuna muddati qo‘shiladi; sinov tugashidan oldin to‘lasangiz, qolgan bepul kunlar ham saqlanadi. Oylik tarif — ${formatSum(PLANS.month.price)}.`,
  },
  {
    q: 'O‘z domenimni ulasa bo‘ladimi?',
    a: `Ha. Do‘kon avval nomi.${PLATFORM.rootDomain} manzilida ochiladi. To‘lovdan keyin o‘z domeningizni (masalan, kafenur.uz) ulab beramiz — domenni o‘zingiz sotib olasiz yoki biz yordam beramiz.`,
  },
  {
    q: 'Telegram bot va kuryerlar nima beradi?',
    a: `Yetkazib berishni o‘zi boshqaradigan tizim. Kuryerlar buyurtmani telefonida oladi («Oldim», yo‘l ko‘rsatish, «Yetkazildi»), siz ularni jonli xaritada ko‘rasiz, mijoz esa kuryerni kuzatib turadi. Yangi buyurtmalar sizga Telegram’da keladi, do‘kon bot ichida ilovadek ochiladi, kuryerlar kassasi va ommaviy xabar ham shu bot bilan ishlaydi. Botni BotFather’da o‘zingiz yaratib ulaysiz — bepul, 2 daqiqada.`,
  },
  {
    q: 'Mahsulotlarni qanday qo‘shaman?',
    a: 'Admin panelda bittalab (rasm, narx, o‘lcham, rang, qoldiq bilan) yoki Excel fayl orqali yuzlab mahsulotni birdaniga yuklaysiz. Namuna mahsulotlarni o‘chirib, o‘zingiznikini qo‘yasiz.',
  },
  {
    q: 'Tarifni keyin o‘zgartirsam bo‘ladimi?',
    a: 'Albatta. Muddat tugashidan oldin boshqa tarifni tanlab to‘lasangiz, yangi muddat eskisining ustiga qo‘shiladi — to‘lagan kunlaringiz yo‘qolmaydi.',
  },
  {
    q: 'Ma’lumotlarim xavfsizmi?',
    a: 'Har bir do‘kon ma’lumoti alohida saqlanadi va faqat siz hamda xodimlaringiz ko‘ra olasiz. Buyurtma narxlari serverda qayta hisoblanadi — mijoz narxni o‘zgartira olmaydi.',
  },
]

export function Faq() {
  return (
    <section className="lp-section" id="faq">
      <div className="lp-container">
        <div className="lp-section__head" data-reveal>
          <span className="lp-kicker">Savollar</span>
          <h2 className="lp-h2">Ko‘p beriladigan <em>savollar</em></h2>
        </div>
        <div className="lp-faq">
          {FAQ.map((item, i) => (
            <details key={item.q} data-reveal style={{ '--d': `${i * 0.05}s` } as CSSProperties} open={i === 0}>
              <summary>
                {item.q}
                <span><Plus size={18} /></span>
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Final() {
  return (
    <section className="lp-section lp-section--tight">
      <div className="lp-container">
        <div className="lp-final" data-reveal="zoom">
          <h2 className="lp-h2">Birinchi onlayn buyurtmangiz bugun kelishi mumkin</h2>
          <p>Do‘konni yaratish 5 daqiqa oladi. Birinchi {TRIAL_DAYS} kun — bepul va to‘liq imkoniyatlar bilan.</p>
          <button className="lp-btn lp-btn--lime lp-btn--shine" onClick={() => goTo('start')}>
            Do‘konimni yaratish <ArrowRight size={19} />
          </button>
          {platformBotLink() && (
            <p style={{ marginTop: 14 }}>
              yoki <a href={platformBotLink()!} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 700 }}>Telegram botimizda oching</a> — parolsiz, telefoningizdan
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-container">
        <div className="lp-footer__grid">
          <div className="lp-footer__brand">
            <Logo light />
            <p className="lp-footer__about">
              {PLATFORM.tagline}. Restoran, kiyim, mebel, gullar va boshqa bizneslar uchun avtomatik yig‘iladigan
              sayt va admin panel.
            </p>
          </div>
          <div>
            <h4>Bo‘limlar</h4>
            <ul>
              <li><a href="#features">Imkoniyatlar</a></li>
              <li><a href="#how">Qanday ishlaydi</a></li>
              <li><a href="#pricing">Narxlar</a></li>
              <li><a href="#faq">Savollar</a></li>
            </ul>
          </div>
          <div>
            <h4>Aloqa</h4>
            <ul>
              <li><a href={PLATFORM.phoneHref}><Phone size={14} style={{ display: 'inline', marginRight: 8 }} />{PLATFORM.phone}</a></li>
              <li><a href={PLATFORM.telegramHref} target="_blank" rel="noreferrer"><Send size={14} style={{ display: 'inline', marginRight: 8 }} />{PLATFORM.telegram}</a></li>
              <li><a href={`mailto:${PLATFORM.email}`}><Mail size={14} style={{ display: 'inline', marginRight: 8 }} />{PLATFORM.email}</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer__bottom">
          <span>© {new Date().getFullYear()} {PLATFORM.name}. Barcha huquqlar himoyalangan.</span>
          <a href="/admin">Do‘kon egalari uchun kirish →</a>
        </div>
      </div>
    </footer>
  )
}
