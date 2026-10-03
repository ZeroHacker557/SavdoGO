import {
  BadgePercent, BellRing, ChartColumn, Check, Globe, Languages, LayoutDashboard, Megaphone, PackageSearch,
  Send, Smartphone, Truck, UsersRound,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { PLATFORM, TELEGRAM_ADDON } from '../../platform/config'
import { ADDON_NAME } from '../../platform/addon'
import { spotlight } from '../hooks'

const ORDERS = [
  { no: '#1048', who: 'Dilnoza · 2 ta', sum: '185 000', badge: 'new', label: 'Yangi' },
  { no: '#1047', who: 'Sardor · 5 ta', sum: '412 000', badge: 'go', label: 'Yo‘lda' },
  { no: '#1046', who: 'Aziza · 1 ta', sum: '96 000', badge: 'done', label: 'Yetkazildi' },
  { no: '#1045', who: 'Jasur · 3 ta', sum: '238 000', badge: 'done', label: 'Yetkazildi' },
]

const BARS = [38, 52, 44, 68, 57, 80, 72, 94, 66, 88, 100, 84]

export function Features() {
  return (
    <section className="lp-section lp-section--after" id="features">
      <div className="lp-container">
        <div className="lp-section__head" data-reveal>
          <span className="lp-kicker">Imkoniyatlar</span>
          <h2 className="lp-h2">
            Do‘kon uchun kerak bo‘lgan <em>hamma narsa</em> — bitta joyda
          </h2>
          <p className="lp-sub">
            Mijoz uchun chiroyli sayt, siz uchun kuchli boshqaruv paneli. Hammasi bir-biriga ulangan va
            real vaqtda ishlaydi.
          </p>
        </div>

        <div className="lp-bento">
          <article className="lp-tile lp-tile--w4 lp-tile--dark lp-tile--wide-md" data-reveal onMouseMove={spotlight}>
            <span className="lp-tile__icon"><LayoutDashboard size={24} /></span>
            <h3>Admin panel — buyurtmalar real vaqtda</h3>
            <p>
              Yangi buyurtma kelishi bilan ovozli signal. Holatini bir bosishda o‘zgartirasiz, chek
              chiqarasiz, kunlik savdoni ko‘rasiz.
            </p>
            <div className="lp-dash" aria-hidden="true">
              <div className="lp-dash__bar"><i /><i /><i /></div>
              <div className="lp-dash__body">
                <div>
                  <div className="lp-dash__stats">
                    <div className="lp-stat"><small>Bugun</small><b>4.85 mln</b><em>+32%</em></div>
                    <div className="lp-stat"><small>Buyurtmalar</small><b>27</b><em>+6</em></div>
                  </div>
                  <div className="lp-chart">
                    {BARS.map((h, i) => (
                      <i key={i} style={{ height: `${h}%`, transitionDelay: `${0.2 + i * 0.05}s` }} />
                    ))}
                  </div>
                </div>
                <div className="lp-orders">
                  {ORDERS.map((o, i) => (
                    <div className="lp-order" key={o.no} style={{ animationDelay: `${0.3 + i * 0.12}s` }}>
                      <span><b>{o.no}</b> · {o.who}</span>
                      <span className={`lp-badge lp-badge--${o.badge}`}>{o.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="lp-tile lp-tile--w2 lp-tile--wide-md lp-tile--client" data-reveal style={{ '--d': '0.08s' } as CSSProperties} onMouseMove={spotlight}>
            <span className="lp-tile__icon"><Smartphone size={24} /></span>
            <h3>Mijoz uchun qulay sayt</h3>
            <p>
              Katalog, qidiruv, sevimlilar, savat va buyurtma kuzatuvi. Telefonda ilovadek tez va silliq
              ishlaydi.
            </p>
            <div className="lp-feature-list" aria-hidden="true">
              {['Qidiruv va filtr', 'Sevimlilar', 'Savat va promokod', 'Xaritadan manzil', 'Buyurtma kuzatuvi', 'Qorong‘i rejim'].map((f, i) => (
                <span key={f} style={{ '--i': i } as CSSProperties}><Check size={14} /> {f}</span>
              ))}
            </div>
          </article>

          <article className="lp-tile lp-tile--w2" data-reveal onMouseMove={spotlight}>
            <span className="lp-tile__icon"><PackageSearch size={24} /></span>
            <h3>Mahsulotlarni boshqarish</h3>
            <p>Rasm, narx, o‘lcham, rang va ombordagi qoldiq. Excel orqali yuzlab mahsulotni birdan yuklang.</p>
          </article>

          <article className="lp-tile lp-tile--w2" data-reveal style={{ '--d': '0.08s' } as CSSProperties} onMouseMove={spotlight}>
            <span className="lp-tile__icon"><BadgePercent size={24} /></span>
            <h3>Aksiya va promokodlar</h3>
            <p>Vaqtli chegirmalar taymer bilan, promokodlar va bosh sahifadagi reklama bannerlari.</p>
          </article>

          <article className="lp-tile lp-tile--w2" data-reveal style={{ '--d': '0.16s' } as CSSProperties} onMouseMove={spotlight}>
            <span className="lp-tile__icon"><ChartColumn size={24} /></span>
            <h3>Hisobot va statistika</h3>
            <p>Kunlik savdo, eng ko‘p sotilgan mahsulotlar, doimiy mijozlar — hammasi grafikda.</p>
          </article>

          <article className="lp-tile lp-tile--w3" data-reveal onMouseMove={spotlight}>
            <span className="lp-tile__icon"><Truck size={24} /></span>
            <h3>Yetkazib berish va olib ketish</h3>
            <p>
              Yetkazish narxi, bepul yetkazish chegarasi va minimal summa. Mijoz manzilini xaritadan
              belgilaydi yoki buyurtmani do‘kondan o‘zi olib ketadi.
            </p>
          </article>

          <article className="lp-tile lp-tile--w3 lp-tile--lime" data-reveal style={{ '--d': '0.08s' } as CSSProperties} onMouseMove={spotlight}>
            <span className="lp-tile__icon"><Languages size={24} /></span>
            <h3>Ikki tilda — o‘zbek va rus</h3>
            <p>Mijoz tilni o‘zi tanlaydi. Mahsulot nomi va tavsifini ikkala tilda kiritishingiz mumkin.</p>
            <div className="lp-flags" aria-hidden="true">
              <span className="lp-flag">O‘zbekcha</span>
              <span className="lp-flag">Русский</span>
            </div>
          </article>

          <article className="lp-tile lp-tile--w2" data-reveal onMouseMove={spotlight}>
            <span className="lp-tile__icon"><Globe size={24} /></span>
            <h3>O‘z manzilingiz</h3>
            <p>Do‘kon darhol subdomenda ochiladi. Xohlasangiz, o‘z domeningizni ham ulaymiz.</p>
            <div className="lp-domain" aria-hidden="true">
              https://<b>sizning-nomingiz</b>.{PLATFORM.rootDomain}<span className="lp-domain__caret" />
            </div>
          </article>

          <article className="lp-tile lp-tile--w2" data-reveal style={{ '--d': '0.08s' } as CSSProperties} onMouseMove={spotlight}>
            <span className="lp-tile__icon"><Megaphone size={24} /></span>
            <h3>Ommaviy xabarlar</h3>
            <p>Yangi aksiya haqida barcha Telegram mijozlaringizga bir bosishda xabar — rasm va tugma bilan.</p>
            <span className="lp-tile__tag">Telegram to‘plamida</span>
          </article>

          <article className="lp-tile lp-tile--w2 lp-tile--dark" data-reveal style={{ '--d': '0.16s' } as CSSProperties} onMouseMove={spotlight}>
            <span className="lp-tile__icon"><Send size={24} /></span>
            <h3>{ADDON_NAME}</h3>
            <p>
              Kuryerlar ilovasi, jonli xarita va buyurtmalar Telegram’ga. Mijoz kuryerni kuzatadi — «qachon
              keladi?» qo‘ng‘iroqlari kamayadi.
            </p>
            <span className="lp-tile__tag">+${TELEGRAM_ADDON.priceUsd} · bir marta</span>
          </article>
        </div>

        <div className="lp-bento lp-bento--strip">
          <article className="lp-tile lp-tile--w3 lp-tile--row" data-reveal onMouseMove={spotlight}>
            <span className="lp-tile__icon"><BellRing size={24} /></span>
            <p>
              <b>Mijozga avtomatik xabarlar:</b> buyurtma qabul qilindi, yo‘lda, yetkazildi — mijoz har bir
              qadamni ko‘rib turadi.
            </p>
          </article>
          <article className="lp-tile lp-tile--w3 lp-tile--row" data-reveal style={{ '--d': '0.08s' } as CSSProperties} onMouseMove={spotlight}>
            <span className="lp-tile__icon"><UsersRound size={24} /></span>
            <p>
              <b>Xodimlar va rollar:</b> ega va adminlar — har biri faqat o‘ziga kerakli bo‘limni ko‘radi.
              Kuryerlar — Telegram to‘plami bilan.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}
