import { Wrench } from 'lucide-react'

/**
 * Firebase konfiguratsiyasi hali to'ldirilmagan.
 *
 * Bo'sh `apiKey` bilan Firebase Auth darhol xato tashlaydi va sahifa
 * oq qoladi — o'rniga nima qilish kerakligini ko'rsatamiz. Bu komponent
 * auth modulini import qilmaydi (u yuklanishining o'zi yiqiladi).
 */
export function NotConfigured() {
  return (
    <div className="adm-login">
      <div className="adm-login__card text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl" style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}>
          <Wrench size={26} />
        </span>
        <h1 className="mt-4 text-lg font-extrabold">Firebase hali ulanmagan</h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          <code>src/config/firebase.ts</code> dagi qiymatlarni SavdoGO Firebase loyihasining web config'i bilan to‘ldiring
          va sahifani yangilang. Qadam-baqadam yo‘riqnoma — <code>README.md</code>.
        </p>
      </div>
    </div>
  )
}
