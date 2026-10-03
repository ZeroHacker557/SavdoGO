import { ArrowRight, LayoutDashboard, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import { useScrolled } from '../hooks'
import { goTo } from '../router'
import { useOwnerShop, type OwnerShop } from '../owner'
import { initials } from '../../platform/shop'

const LINKS = [
  { href: '#features', label: 'Imkoniyatlar' },
  { href: '#how', label: 'Qanday ishlaydi' },
  { href: '#pricing', label: 'Narxlar' },
  { href: '#faq', label: 'Savollar' },
  { href: '/qollanma', label: 'Qo‘llanma' },
]

export function Nav() {
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)
  // Do'kon egasi — «Boshlash» o'rnida o'z do'koni (owner.ts)
  const owner = useOwnerShop()

  // Menyu ochiq — sahifa surilmasin, Escape yopsin
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <header className={`lp-nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="lp-container lp-nav__inner">
          <a href="#top" aria-label="SavdoGO — bosh sahifa">
            <Logo />
          </a>
          <nav className="lp-nav__links" aria-label="Bo‘limlar">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href}>{link.label}</a>
            ))}
          </nav>
          {owner ? (
            <OwnerChip owner={owner} className="lp-nav__cta" />
          ) : (
            <button className="lp-btn lp-btn--primary lp-btn--sm lp-nav__cta" onClick={() => goTo('start')}>
              Boshlash <ArrowRight size={17} />
            </button>
          )}
          <button className="lp-nav__burger" aria-label="Menyu" onClick={() => setOpen(true)}>
            <Menu size={22} />
          </button>
        </div>
      </header>

      {open && (
        <div className="lp-menu" role="dialog" aria-modal="true" aria-label="Menyu">
          <button className="lp-nav__burger lp-menu__close" aria-label="Yopish" onClick={() => setOpen(false)}>
            <X size={22} />
          </button>
          {owner && <OwnerChip owner={owner} className="lp-menu__owner" />}
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          {owner ? (
            <a className="lp-btn lp-btn--primary" style={{ marginTop: 12 }} href="/admin">
              <LayoutDashboard size={18} /> Admin panelga o‘tish
            </a>
          ) : (
            <button
              className="lp-btn lp-btn--primary"
              style={{ marginTop: 12 }}
              onClick={() => {
                setOpen(false)
                goTo('start')
              }}
            >
              Do‘konimni yaratish <ArrowRight size={18} />
            </button>
          )}
        </div>
      )}
    </>
  )
}

/** «Mening do'konim» — admin panelga bir bosishda. */
function OwnerChip({ owner, className = '' }: { owner: OwnerShop; className?: string }) {
  return (
    <a className={`lp-nav__owner ${className}`} href="/admin" title="Admin panelga o‘tish">
      <span className="lp-nav__owner-mark" style={{ background: owner.logo ? '#fff' : owner.brand }}>
        {owner.logo ? <img src={owner.logo} alt="" /> : initials(owner.name)}
      </span>
      <span className="lp-nav__owner-text">
        <small>Mening do‘konim</small>
        <b>{owner.name}</b>
      </span>
      <ArrowRight size={16} />
    </a>
  )
}
