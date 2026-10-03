import { BRAND } from '../../config/brand'

type Props = {
  /** Belgi o'lchami (px). Yozuv shunga nisbatan masshtablanadi. */
  size?: number
  /** Yozuvsiz — faqat belgi (kichik joylar uchun). */
  markOnly?: boolean
  className?: string
}

/**
 * Do'kon logotipi.
 *
 * Ega logo yuklagan bo'lsa — o'sha rasm (oq fonda, burchaklari
 * yumaloq). Yuklamagan bo'lsa — nomining bosh harflari brend rangidagi
 * plitada (monogramma). Shu tufayli logosiz do'kon ham «brendli»
 * ko'rinadi va rang o'zgarganda belgi ham o'zi o'zgaradi.
 */
export function BrandLogo({ size = 44, markOnly = false, className = '' }: Props) {
  const radius = size * 0.28
  return (
    <span className={'flex min-w-0 items-center gap-2.5 ' + className}>
      {BRAND.logo ? (
        <img
          src={BRAND.logo}
          alt={BRAND.name}
          width={size}
          height={size}
          className="shrink-0 object-cover"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: '#ffffff',
            boxShadow: 'var(--shadow-brand)',
          }}
          decoding="async"
        />
      ) : (
        <span
          role="img"
          aria-label={BRAND.name}
          className="grid shrink-0 place-items-center"
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%)',
            color: 'var(--brand-ink)',
            boxShadow: 'var(--shadow-brand)',
            fontFamily: 'var(--font-display)',
            fontSize: size * 0.4,
            letterSpacing: '0.02em',
          }}
        >
          {BRAND.monogram}
        </span>
      )}

      {!markOnly && (
        <span className="min-w-0 leading-none">
          <b className="wordmark block truncate" style={{ fontSize: size * 0.46, color: 'var(--ink)' }}>
            {BRAND.name}
          </b>
          {BRAND.tagline && (
            <small
              className="mt-1 block truncate font-bold uppercase"
              style={{ fontSize: Math.max(8, size * 0.19), letterSpacing: '0.08em', color: 'var(--brand)' }}
            >
              {BRAND.tagline}
            </small>
          )}
        </span>
      )}
    </span>
  )
}
