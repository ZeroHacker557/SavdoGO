import {
  Bold, CheckCircle2, Code, ExternalLink, EyeOff, ImagePlus, Italic, LayoutDashboard, Link2, Loader2, Megaphone, Plus,
  RefreshCw, Search, Send, ShieldBan, Sparkles, Store, Strikethrough, Trash2, Underline, UserRound, Users, X, XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { uploadPlatformBroadcastMedia, type UploadedAdMedia } from '../admin/lib/storage'
import { ConfirmDialog } from '../admin/components/Modal'
import { PLANS, PLATFORM, TRIAL_DAYS, YEAR_SAVING_PERCENT, formatSum } from '../platform/config'

/**
 * /super → «Xabar»: SavdoGO botidagi foydalanuvchilarga ommaviy xabar.
 * Server — api/_lib/platform/broadcast.ts (bo'laklab yuboradi, bloklaganlarni
 * belgilaydi). Ro'yxat va guruhlar shu yerda hisoblanadi — «nechta odamga
 * boradi» yuborishdan oldin aniq ko'rinadi.
 */

type Api = <T>(action: string, body?: Record<string, unknown>) => Promise<T>
type Show = (text: string, kind?: 'ok' | 'error') => void

type ShopState = 'trial' | 'active' | 'expired' | 'blocked'
type AudienceRow = {
  id: string
  name: string
  username: string | null
  hasPhone: boolean
  blocked: boolean
  lastSeen: string | null
  createdAt: string | null
  shop: { id: string; name: string; state: ShopState } | null
}
type HistoryRow = {
  id: string
  createdAt: string
  audience: string
  total: number
  sent: number
  failed: number
  blocked: number
  stopped: boolean
  preview: string
  media: 'image' | 'video' | null
}
/** SavdoGO boti admin qilib qo'shilgan kanal/guruh (api/_lib/channels.ts). */
type ChannelRow = { id: string; title: string; username: string | null; type: 'channel' | 'group' | 'supergroup'; canPost: boolean }
type AudienceData = { users: AudienceRow[]; channels: ChannelRow[]; history: HistoryRow[]; testChat: boolean }
type ChunkResult = {
  sent: number
  failed: number
  blocked: number
  skipped: number
  channelsSent?: number
  channelErrors?: string[]
  mediaId: string | null
}

type Audience = 'all' | 'owners' | 'trial' | 'expired' | 'noShop' | 'started' | 'recent' | 'manual' | 'none'
const DAY = 86_400_000

const AUDIENCES: { key: Audience; label: string; hint: string; match: (u: AudienceRow, now: number) => boolean }[] = [
  { key: 'all', label: 'Hamma', hint: 'Botni ishga tushirgan barcha foydalanuvchilar', match: () => true },
  { key: 'owners', label: 'Do‘kon egalari', hint: 'Do‘koni bor hamma', match: (u) => Boolean(u.shop) },
  { key: 'trial', label: 'Bepul sinovdagilar', hint: `${TRIAL_DAYS} kunlik sinovdagi do‘konlar — to‘lovga undash uchun`, match: (u) => u.shop?.state === 'trial' },
  { key: 'expired', label: 'Muddati tugaganlar', hint: 'Sinovi yoki obunasi tugagan do‘konlar', match: (u) => u.shop?.state === 'expired' },
  { key: 'noShop', label: 'Do‘kon ochmaganlar', hint: 'Raqamini yuborgan, lekin do‘kon ochmaganlar', match: (u) => u.hasPhone && !u.shop },
  { key: 'started', label: 'Faqat /start bosganlar', hint: 'Raqam ham yubormagan — eng sovuq auditoriya', match: (u) => !u.hasPhone && !u.shop },
  { key: 'recent', label: 'So‘nggi 7 kunda faol', hint: 'Botga yaqinda yozganlar', match: (u, now) => (Date.parse(u.lastSeen || '') || 0) > now - 7 * DAY },
  { key: 'manual', label: 'Qo‘lda tanlash', hint: 'Ro‘yxatdan kerakli odamlarni belgilang', match: () => false },
  { key: 'none', label: 'Faqat kanalga', hint: 'Odamlarga emas — faqat pastda belgilangan kanal va guruhlarga', match: () => false },
]

/** Tugma: havola yoki bot ichidagi amal (mini app / menyu). */
type ButtonKind = 'url' | 'start' | 'admin' | 'menu' | 'bot'
type ButtonColor = '' | 'success' | 'primary' | 'danger'
type ButtonDraft = { kind: ButtonKind; text: string; url: string; style: ButtonColor; sameRow: boolean }

const KINDS: { key: ButtonKind; label: string; hint: string }[] = [
  { key: 'start', label: 'Do‘kon ochish', hint: 'Ro‘yxatdan o‘tish formasi (mini app)' },
  { key: 'admin', label: 'Boshqaruv paneli', hint: 'Do‘kon egasining paneli (mini app)' },
  { key: 'bot', label: 'Botni ulash', hint: 'O‘z botini ulash yo‘riqnomasi' },
  { key: 'menu', label: 'Bosh menyu', hint: 'Botning /start menyusi' },
  { key: 'url', label: 'Havola', hint: 'Istalgan sayt, kanal yoki post' },
]

const COLORS: { key: ButtonColor; label: string; swatch: string }[] = [
  { key: '', label: 'Odatiy', swatch: '#8e99a4' },
  { key: 'success', label: 'Yashil', swatch: '#2fa84f' },
  { key: 'primary', label: 'Ko‘k', swatch: '#2f80ed' },
  { key: 'danger', label: 'Qizil', swatch: '#e5484d' },
]

const MAX_BUTTONS = 8
const TEXT_MAX = 4000
const CAPTION_MAX = 1024
const CHUNK = 25
const EMOJIS = ['🎉', '🔥', '✅', '🛍', '🎁', '⚡️', '📢', '👇', '💳', '🚀', '⏰', '❤️']

const plainLength = (html: string) => html.replace(/<[^>]+>/g, '').length

function buttonError(b: ButtonDraft): string {
  if (!b.text.trim()) return 'Tugma matnini yozing'
  if (b.kind === 'url' && !/^(https?:\/\/|tg:\/\/)\S+$/i.test(b.url.trim())) return 'Havola https:// bilan boshlansin'
  return ''
}

/* ─── Shablonlar ─────────────────────────────────────────── */

type Template = { key: string; label: string; audience: Audience; text: string; buttons: ButtonDraft[] }

const month = PLANS.month
const year = PLANS.year
const TEMPLATES: Template[] = [
  {
    key: 'intro',
    label: 'Taqdimot',
    audience: 'noShop',
    text: [
      '🛍 <b>{ism}, biznesingizni internetga olib chiqing!</b>',
      '',
      `${PLATFORM.name} bilan 5 daqiqada o‘z onlayn do‘koningizni oching:`,
      `✅ Shaxsiy sayt — nomingiz.${PLATFORM.rootDomain}`,
      '✅ Telegram bot — mijozlar do‘konni ilovadek ochadi',
      '✅ Buyurtmalar, kuryerlar, hisobotlar — bitta telefonda',
      '',
      `🎁 <b>${TRIAL_DAYS} kun bepul</b> — karta kerak emas.`,
      '👇 Hoziroq boshlang',
    ].join('\n'),
    buttons: [{ kind: 'start', text: '🛍 Do‘kon ochish', url: '', style: 'success', sameRow: false }],
  },
  {
    key: 'trial',
    label: 'Sinov tugayapti',
    audience: 'trial',
    text: [
      '⏰ <b>{ism}, bepul sinov tugashiga oz qoldi</b>',
      '',
      'Do‘koningiz to‘xtab qolmasligi uchun obunani hozir faollashtiring — mijozlar buyurtma berishda davom etadi.',
      '',
      `💳 Oylik — ${formatSum(month.price)} · Yillik — ${formatSum(year.price)} (−${YEAR_SAVING_PERCENT}%)`,
      'Boshqaruv paneli → «Obuna va to‘lov»',
    ].join('\n'),
    buttons: [{ kind: 'admin', text: '💳 To‘lov qilish', url: '', style: 'primary', sameRow: false }],
  },
  {
    key: 'expired',
    label: 'Qaytib keling',
    audience: 'expired',
    text: [
      '👋 <b>{ism}, do‘koningiz sizni kutyapti</b>',
      '',
      'Mahsulotlar, dizayn va sozlamalar joyida — obunani faollashtirsangiz, do‘kon shu zahoti yana buyurtma qabul qiladi.',
      '',
      `💳 Oylik — ${formatSum(month.price)}`,
    ].join('\n'),
    buttons: [{ kind: 'admin', text: '🔓 Do‘konni qayta ochish', url: '', style: 'success', sameRow: false }],
  },
  {
    key: 'bot',
    label: 'Botingizni ulang',
    audience: 'owners',
    text: [
      '🤖 <b>{ism}, do‘koningizga o‘z Telegram botingizni ulang — bepul!</b>',
      '',
      '✅ Mijozlar do‘konni botda ilovadek ochadi',
      '✅ Yangi buyurtmalar darhol Telegram’ga keladi',
      '✅ Kuryerlar ilovasi va jonli xarita ochiladi',
      '',
      '2 daqiqa: @BotFather → /newbot → tokenni shu botga yuboring.',
    ].join('\n'),
    buttons: [{ kind: 'bot', text: '🤖 Botni ulash', url: '', style: 'primary', sameRow: false }],
  },
  {
    key: 'news',
    label: 'Yangilik',
    audience: 'all',
    text: '📢 <b>Yangilik!</b>\n\n{ism}, ',
    buttons: [],
  },
]

/* ─── Ko'rinish (Telegram'dagidek) ───────────────────────── */

/** Faqat Telegram ruxsat beradigan teglar qayta tiklanadi — qolgani matn bo'lib ko'rinadi. */
function previewHtml(source: string): string {
  const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  return escaped
    .replace(/&lt;(\/?)(b|strong|i|em|u|s|code|pre)&gt;/g, '<$1$2>')
    .replace(/&lt;tg-spoiler&gt;/g, '<span class="sp-bc-spoiler">')
    .replace(/&lt;\/tg-spoiler&gt;/g, '</span>')
    .replace(/&lt;a href=&quot;(https?:\/\/[^&\s]+)&quot;&gt;/g, '<a href="$1" target="_blank" rel="noreferrer">')
    .replace(/&lt;\/a&gt;/g, '</a>')
    .replace(/\{ism\}/gi, 'Anvar')
}

function rowsOf(buttons: ButtonDraft[]): ButtonDraft[][] {
  const rows: ButtonDraft[][] = []
  buttons.forEach((b, i) => {
    const last = rows[rows.length - 1]
    if (i > 0 && b.sameRow && last && last.length < 3) last.push(b)
    else rows.push([b])
  })
  return rows
}

/* ─── Sahifa ─────────────────────────────────────────────── */

export function Broadcast({ api, show }: { api: Api; show: Show }) {
  const [data, setData] = useState<AudienceData | null>(null)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)

  const [text, setText] = useState('')
  const [media, setMedia] = useState<UploadedAdMedia | null>(null)
  const [uploading, setUploading] = useState(false)
  const [buttons, setButtons] = useState<ButtonDraft[]>([])
  const [silent, setSilent] = useState(false)
  const [protect, setProtect] = useState(false)
  const [noPreview, setNoPreview] = useState(true)

  const [audience, setAudience] = useState<Audience>('all')
  const [manual, setManual] = useState<string[]>([])
  const [pickedChannels, setPickedChannels] = useState<string[]>([])
  const [newChannel, setNewChannel] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')

  const [confirming, setConfirming] = useState(false)
  const [testing, setTesting] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<{
    sent: number
    failed: number
    blocked: number
    skipped: number
    processed: number
    channelsSent: number
    channelErrors: string[]
  } | null>(null)
  const cancelled = useRef(false)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    api<AudienceData>('super.broadcast.audience').then(
      (result) => {
        if (!alive) return
        setData(result)
        setLoadError('')
      },
      (error) => {
        if (alive) setLoadError(error instanceof Error ? error.message : 'Yuklab bo‘lmadi')
      },
    )
    return () => {
      alive = false
    }
  }, [api, reload])

  const users = useMemo(() => data?.users ?? [], [data])
  const reachable = useMemo(() => users.filter((u) => !u.blocked), [users])
  const counts = useMemo(() => {
    const result = {} as Record<Audience, number>
    for (const a of AUDIENCES) result[a.key] = a.key === 'manual' ? manual.length : reachable.filter((u) => a.match(u, now)).length
    return result
  }, [reachable, manual, now])
  const channels = useMemo(() => data?.channels ?? [], [data])
  // Kanal ro'yxatdan chiqib ketgan bo'lsa (bot chiqarilgan) — tanlovdan ham
  const selectedChannels = useMemo(() => channels.filter((c) => c.canPost && pickedChannels.includes(c.id)), [channels, pickedChannels])
  const recipients = useMemo(() => {
    if (audience === 'none') return []
    if (audience === 'manual') return reachable.filter((u) => manual.includes(u.id))
    const rule = AUDIENCES.find((a) => a.key === audience)!
    return reachable.filter((u) => rule.match(u, now))
  }, [reachable, audience, manual, now])

  /* Matn tahriri */
  const wrap = useCallback((open: string, close: string, fallback = '') => {
    const el = textRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.slice(start, end) || fallback
    const next = text.slice(0, start) + open + selected + close + text.slice(end)
    setText(next.slice(0, TEXT_MAX))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + open.length, start + open.length + selected.length)
    })
  }, [text])
  const insertLink = () => {
    const url = window.prompt('Havola (https://...)', 'https://')
    if (!url || !/^https?:\/\/\S+$/i.test(url.trim())) return
    wrap(`<a href="${url.trim().replace(/"/g, '')}">`, '</a>', 'havola')
  }

  const applyTemplate = (t: Template) => {
    setText(t.text)
    setButtons(t.buttons.map((b) => ({ ...b })))
    setAudience(t.audience)
  }

  const pickMedia = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      setMedia(await uploadPlatformBroadcastMedia(file))
    } catch (error) {
      show(error instanceof Error ? error.message : 'Yuklab bo‘lmadi', 'error')
    } finally {
      setUploading(false)
    }
  }

  const editButton = (index: number, patch: Partial<ButtonDraft>) =>
    setButtons(buttons.map((b, i) => (i === index ? { ...b, ...patch } : b)))

  const content = () => ({
    text,
    media,
    buttons: buttons.map((b) => ({ kind: b.kind, text: b.text.trim(), url: b.url.trim(), style: b.style, sameRow: b.sameRow })),
    options: { silent, protect, noPreview },
  })

  /** Kanalni qo'lda qo'shish: @kanal yoki t.me/kanal — bot u yerda admin bo'lishi shart. */
  const addChannel = async (event: FormEvent) => {
    event.preventDefault()
    if (!newChannel.trim()) return
    setAdding(true)
    try {
      const { channel } = await api<{ channel: ChannelRow }>('super.broadcast.addChannel', { chat: newChannel })
      setNewChannel('')
      setPickedChannels((list) => [...new Set([...list, channel.id])])
      setReload((n) => n + 1)
      show(`«${channel.title}» qo‘shildi`)
    } catch (error) {
      show(error instanceof Error ? error.message : 'Kanal qo‘shilmadi', 'error')
    } finally {
      setAdding(false)
    }
  }

  const sendTest = async () => {
    setTesting(true)
    try {
      await api('super.broadcast.send', { ...content(), test: true })
      show('Sinov xabari sizga yuborildi — Telegram’da ko‘ring')
    } catch (error) {
      show(error instanceof Error ? error.message : 'Yuborilmadi', 'error')
    } finally {
      setTesting(false)
    }
  }

  const start = async () => {
    setConfirming(false)
    setRunning(true)
    cancelled.current = false
    const ids = recipients.map((u) => u.id)
    const totals = { sent: 0, failed: 0, blocked: 0, skipped: 0, processed: 0, channelsSent: 0, channelErrors: [] as string[] }
    setProgress({ ...totals })
    let mediaId: string | null = null
    const body = content()
    try {
      // Avval kanallar — bitta so'rovda
      if (selectedChannels.length) {
        const result = await api<ChunkResult>('super.broadcast.send', {
          ...body,
          media: media ? { ...media, fileId: mediaId } : null,
          channels: selectedChannels.map((c) => c.id),
          recipients: [],
        })
        mediaId = result.mediaId ?? mediaId
        totals.channelsSent = result.channelsSent ?? 0
        totals.channelErrors = result.channelErrors ?? []
        setProgress({ ...totals })
      }
      for (let i = 0; i < ids.length && !cancelled.current; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK)
        const result: ChunkResult = await api<ChunkResult>(
          'super.broadcast.send',
          { ...body, media: media ? { ...media, fileId: mediaId } : null, recipients: chunk },
        )
        mediaId = result.mediaId ?? mediaId
        totals.sent += result.sent
        totals.failed += result.failed
        totals.blocked += result.blocked
        totals.skipped += result.skipped
        totals.processed += chunk.length
        setProgress({ ...totals })
      }
      const toChannels = selectedChannels.length ? `, kanallarga: ${totals.channelsSent}/${selectedChannels.length}` : ''
      show(cancelled.current ? `To‘xtatildi — ${totals.sent} ta yuborildi${toChannels}` : `Tayyor: ${totals.sent} ta yuborildi${toChannels}`)
    } catch (error) {
      show(error instanceof Error ? error.message : 'Yuborishda xato', 'error')
    } finally {
      setRunning(false)
      await api('super.broadcast.log', {
        text,
        audience: AUDIENCES.find((a) => a.key === audience)?.label ?? audience,
        total: ids.length,
        sent: totals.sent,
        failed: totals.failed,
        blocked: totals.blocked,
        skipped: totals.skipped,
        channels: totals.channelsSent,
        stopped: cancelled.current,
        media: media?.type ?? null,
        buttons: buttons.length,
      }).catch(() => undefined)
      setReload((n) => n + 1)
    }
  }

  const needle = search.trim().toLowerCase()
  const pickList = reachable
    .filter((u) => !needle || u.name.toLowerCase().includes(needle) || (u.username || '').toLowerCase().includes(needle) || (u.shop?.name || '').toLowerCase().includes(needle))
    .slice(0, 100)

  const buttonsInvalid = buttons.some((b) => buttonError(b))
  const longCaption = Boolean(media) && plainLength(text) > CAPTION_MAX
  const empty = !text.trim() && !media
  const blocked = running || uploading || buttonsInvalid || empty || (recipients.length === 0 && selectedChannels.length === 0)
  const target = [
    recipients.length ? `${recipients.length} kishiga` : '',
    selectedChannels.length ? `${selectedChannels.length} ta kanalga` : '',
  ].filter(Boolean).join(' va ')

  if (!data) {
    return loadError ? (
      <div className="adm-card adm-empty">
        <p className="font-extrabold">Ro‘yxatni yuklab bo‘lmadi</p>
        <p className="text-sm">{loadError}</p>
        <button className="adm-btn adm-btn--primary mt-2" onClick={() => setReload((n) => n + 1)}>Qayta urinish</button>
      </div>
    ) : <div className="adm-skeleton h-40" />
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
      <section className="adm-card grid content-start gap-4 p-4 sm:p-5">
        {/* Shablonlar */}
        <div>
          <p className="adm-label"><span className="inline-flex items-center gap-1.5"><Sparkles size={14} /> Tayyor shablonlar</span></p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((t) => (
              <button key={t.key} type="button" className="adm-chip" onClick={() => applyTemplate(t)} disabled={running}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* Rasm yoki video */}
        <div>
          <p className="adm-label">Rasm yoki video <span style={{ color: 'var(--faint)' }}>(ixtiyoriy)</span></p>
          {media ? (
            <div className="adm-bc-media">
              {media.type === 'image' ? <img src={media.url} alt="" /> : <video src={media.url} controls playsInline preload="metadata" />}
              <button type="button" className="adm-bc-media__remove" onClick={() => setMedia(null)} disabled={running} aria-label="Olib tashlash">
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className={'adm-bc-add ' + (uploading ? 'is-busy' : '')}>
              {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
              <span className="text-sm font-bold">{uploading ? 'Yuklanmoqda…' : 'Rasm yoki video yuklash'}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Rasm: JPG/PNG · Video: MP4, 20 MB gacha</span>
              <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" className="sr-only" onChange={pickMedia} disabled={uploading || running} />
            </label>
          )}
        </div>

        {/* Matn */}
        <div>
          <label className="adm-label" htmlFor="sp-bc-text">Xabar matni</label>
          <div className="sp-bc-toolbar" role="toolbar" aria-label="Formatlash">
            <ToolButton label="Qalin" onClick={() => wrap('<b>', '</b>', 'matn')}><Bold size={15} /></ToolButton>
            <ToolButton label="Qiya" onClick={() => wrap('<i>', '</i>', 'matn')}><Italic size={15} /></ToolButton>
            <ToolButton label="Tagiga chizilgan" onClick={() => wrap('<u>', '</u>', 'matn')}><Underline size={15} /></ToolButton>
            <ToolButton label="O‘chirilgan" onClick={() => wrap('<s>', '</s>', 'matn')}><Strikethrough size={15} /></ToolButton>
            <ToolButton label="Kod (bosilsa nusxalanadi)" onClick={() => wrap('<code>', '</code>', 'PROMO10')}><Code size={15} /></ToolButton>
            <ToolButton label="Yashirin matn (spoyler)" onClick={() => wrap('<tg-spoiler>', '</tg-spoiler>', 'sir')}><EyeOff size={15} /></ToolButton>
            <ToolButton label="Havola" onClick={insertLink}><Link2 size={15} /></ToolButton>
            <span className="sp-bc-toolbar__sep" />
            <button type="button" className="sp-bc-toolbar__ism" onClick={() => wrap('{ism}', '')} title="Har kimga o‘z ismi qo‘yiladi">
              <UserRound size={14} /> {'{ism}'}
            </button>
            <span className="sp-bc-toolbar__sep" />
            {EMOJIS.map((e) => (
              <button key={e} type="button" className="sp-bc-toolbar__emoji" onClick={() => wrap(e, '')}>{e}</button>
            ))}
          </div>
          <textarea
            id="sp-bc-text"
            ref={textRef}
            className="adm-input sp-bc-text"
            rows={9}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'🎉 Yangilik!\n\n{ism}, …'}
            disabled={running}
            maxLength={TEXT_MAX}
          />
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--faint)' }}>
              Matnni belgilab, yuqoridagi tugmani bosing. <code>{'{ism}'}</code> — har kimning o‘z ismi.
            </p>
            <p className="shrink-0 text-xs font-semibold" style={{ color: 'var(--muted)' }}>{text.length} / {TEXT_MAX}</p>
          </div>
          {longCaption && (
            <p className="adm-bc-note">
              Matn {CAPTION_MAX} belgidan uzun — Telegram rasm ostiga buncha matn sig‘dirmaydi. Avval rasm/video, keyin matn
              tugmalar bilan alohida xabar bo‘lib boradi.
            </p>
          )}
        </div>

        {/* Tugmalar */}
        <div>
          <p className="adm-label">Tugmalar <span style={{ color: 'var(--faint)' }}>(ixtiyoriy, {MAX_BUTTONS} tagacha)</span></p>
          <div className="flex flex-col gap-2">
            {buttons.map((b, index) => {
              const error = buttonError(b)
              return (
                <div key={index} className="adm-bc-btn">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {KINDS.map((k) => (
                      <button
                        key={k.key}
                        type="button"
                        title={k.hint}
                        className={'adm-chip ' + (b.kind === k.key ? 'active' : '')}
                        onClick={() => editButton(index, { kind: k.key })}
                        disabled={running}
                      >
                        {k.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="adm-icon-btn adm-icon-btn--danger ml-auto"
                      onClick={() => setButtons(buttons.filter((_, i) => i !== index))}
                      aria-label="Tugmani o‘chirish"
                      disabled={running}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <input
                      className="adm-input"
                      value={b.text}
                      onChange={(e) => editButton(index, { text: e.target.value })}
                      placeholder="Tugma matni — 🛍 Do‘kon ochish"
                      maxLength={64}
                      disabled={running}
                    />
                    {b.kind === 'url' ? (
                      <input
                        className="adm-input"
                        value={b.url}
                        onChange={(e) => editButton(index, { url: e.target.value })}
                        placeholder="https://t.me/kanal/123"
                        inputMode="url"
                        disabled={running}
                      />
                    ) : (
                      <p className="self-center text-xs" style={{ color: 'var(--muted)' }}>{KINDS.find((k) => k.key === b.kind)?.hint}</p>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="adm-bc-sub" style={{ margin: 0 }}>Rangi:</span>
                    {COLORS.map((c) => (
                      <button
                        key={c.key || 'default'}
                        type="button"
                        className={'adm-chip inline-flex items-center gap-1.5 ' + (b.style === c.key ? 'active' : '')}
                        onClick={() => editButton(index, { style: c.key })}
                        disabled={running}
                      >
                        <span className="adm-bc-swatch" style={{ background: c.swatch }} /> {c.label}
                      </button>
                    ))}
                    {index > 0 && (
                      <label className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--muted)' }}>
                        <input type="checkbox" checked={b.sameRow} onChange={(e) => editButton(index, { sameRow: e.target.checked })} disabled={running} />
                        Oldingisi bilan yonma-yon
                      </label>
                    )}
                  </div>
                  {error && (b.text || b.url) && <p className="mt-1.5 text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
                </div>
              )
            })}
            {buttons.length < MAX_BUTTONS && (
              <button
                type="button"
                className="adm-btn adm-btn--ghost self-start"
                onClick={() => setButtons([...buttons, { kind: 'start', text: '', url: '', style: '', sameRow: false }])}
                disabled={running}
              >
                <Plus size={16} /> Tugma qo‘shish
              </button>
            )}
          </div>
        </div>

        {/* Sozlamalar */}
        <div className="grid gap-2 sm:grid-cols-3">
          <Option checked={silent} onChange={setSilent} title="Ovozsiz" hint="Bildirishnoma ovozsiz keladi" disabled={running} />
          <Option checked={protect} onChange={setProtect} title="Uzatishni taqiqlash" hint="Nusxalab, boshqaga yuborib bo‘lmaydi" disabled={running} />
          <Option checked={noPreview} onChange={setNoPreview} title="Havola ko‘rinishisiz" hint="Matndagi havolaning rasmi chiqmaydi" disabled={running || Boolean(media)} />
        </div>

        {/* Kimga */}
        <div>
          <p className="adm-label">Kimga</p>
          <div className="adm-audience">
            {AUDIENCES.map((item) => (
              <button
                key={item.key}
                type="button"
                className={'adm-audience__item ' + (audience === item.key ? 'active' : '')}
                onClick={() => { setAudience(item.key); setSearch('') }}
                disabled={running}
                aria-pressed={audience === item.key}
              >
                <b className="flex items-center justify-between gap-2">{item.label} <span className="sp-bc-count">{counts[item.key]}</span></b>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>
          {audience === 'manual' && (
            <div className="mt-3">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--faint)' }} />
                <input className="adm-input icon-left" placeholder="Ism, @username yoki do‘kon nomi..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="adm-picklist">
                {pickList.map((u) => (
                  <label key={u.id}>
                    <input
                      type="checkbox"
                      checked={manual.includes(u.id)}
                      onChange={() => setManual(manual.includes(u.id) ? manual.filter((id) => id !== u.id) : [...manual, u.id])}
                    />
                    <span className="truncate">{u.name}</span>
                    <small>{u.shop ? u.shop.name : u.username ? `@${u.username}` : ''}</small>
                  </label>
                ))}
              </div>
              <div className="mt-2 flex gap-3 text-xs">
                <button type="button" className="adm-link" onClick={() => setManual([...new Set([...manual, ...pickList.map((u) => u.id)])])}>Ko‘rinayotganlarni belgilash</button>
                <button type="button" className="adm-link" onClick={() => setManual([])}>Tozalash</button>
              </div>
            </div>
          )}
        </div>

        {/* Kanal va guruhlar — bot admin qilib qo'shilganlari o'zi chiqadi */}
        <div>
          <p className="adm-label">Kanal va guruhlar</p>
          {channels.length ? (
            <div className="sp-bc-channels">
              {channels.map((c) => (
                <label key={c.id} className={'sp-bc-channel' + (c.canPost ? '' : ' is-off') + (pickedChannels.includes(c.id) && c.canPost ? ' is-on' : '')}>
                  <input
                    type="checkbox"
                    checked={pickedChannels.includes(c.id) && c.canPost}
                    disabled={!c.canPost || running}
                    onChange={() => setPickedChannels(pickedChannels.includes(c.id) ? pickedChannels.filter((id) => id !== c.id) : [...pickedChannels, c.id])}
                  />
                  <span>
                    <b>{c.type === 'channel' ? '📢' : '👥'} {c.title}</b>
                    <small>
                      {c.username ? `@${c.username}` : c.type === 'channel' ? 'Yopiq kanal' : 'Guruh'}
                      {!c.canPost && ' · botda «xabar joylash» huquqi yo‘q'}
                    </small>
                  </span>
                </label>
              ))}
              <p className="text-xs" style={{ color: 'var(--faint)' }}>
                Kanalda tugmalar botga havola bo‘lib chiqadi, <code>{'{ism}'}</code> o‘rniga «do‘stlar» qo‘yiladi.
              </p>
            </div>
          ) : (
            <p className="sp-bc-hint">
              Kanalingizga ham yuborish uchun <b>@{PLATFORM.botUsername || 'bot'}</b> ni kanalga admin qilib qo‘shing
              («Xabar joylash» huquqi bilan), keyin kanal manzilini pastga yozing.
            </p>
          )}
          <form className="sp-bc-add" onSubmit={addChannel}>
            <input
              className="adm-input"
              placeholder="@kanal_nomi yoki t.me/kanal_nomi"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value)}
              disabled={adding || running}
              autoCapitalize="none"
              spellCheck={false}
            />
            <button className="adm-btn adm-btn--ghost" disabled={adding || running || !newChannel.trim()}>
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Kanal qo‘shish
            </button>
          </form>
        </div>

        {/* Yuborish */}
        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <button
            className="adm-btn adm-btn--ghost py-3"
            onClick={sendTest}
            disabled={running || testing || uploading || buttonsInvalid || empty}
            title={data.testChat ? 'PLATFORM_CHAT_ID ga — o‘zingizga' : 'Avval Vercel’da PLATFORM_CHAT_ID qo‘ying'}
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />} Menga sinov
          </button>
          <button className="adm-btn adm-btn--primary py-3" onClick={() => setConfirming(true)} disabled={blocked}>
            <Send size={17} />
            {running ? 'Yuborilmoqda...' : target ? `${target} yuborish` : 'Qabul qiluvchi yo‘q'}
          </button>
        </div>
        {!data.testChat && (
          <p className="text-xs" style={{ color: 'var(--faint)' }}>
            «Menga sinov» uchun @{PLATFORM.botUsername || 'bot'} ga <code>/id</code> yozing va chiqqan raqamni Vercel’ga <code>PLATFORM_CHAT_ID</code> qilib qo‘ying.
          </p>
        )}
        {running && (
          <button className="adm-btn adm-btn--ghost w-full" onClick={() => { cancelled.current = true }}>To‘xtatish</button>
        )}
      </section>

      <aside className="flex flex-col gap-4">
        {/* Telegram'dagi ko'rinishi */}
        <div className="adm-card p-4">
          <h2 className="text-sm font-extrabold">Ko‘rinishi</h2>
          <div className="sp-bc-chat mt-3">
            <div className="adm-bc-preview">
              <div className="adm-bc-preview__bubble">
                {media && (media.type === 'image' ? <img src={media.url} alt="" /> : <video src={media.url} muted playsInline preload="metadata" />)}
                {(text.trim() || !media) && (
                  text.trim()
                    ? <p dangerouslySetInnerHTML={{ __html: previewHtml(text) }} />
                    : <p style={{ color: 'var(--faint)' }}>Xabar matni shu yerda ko‘rinadi...</p>
                )}
              </div>
              {rowsOf(buttons).map((row, r) => (
                <div key={r} className="sp-bc-row">
                  {row.map((b, i) => (
                    <span key={i} className={'adm-bc-preview__btn' + (b.style ? ` is-${b.style}` : '')}>
                      {b.text.trim() || 'Tugma'}
                      {b.kind === 'url' ? <ExternalLink size={11} /> : b.kind === 'admin' ? <LayoutDashboard size={11} /> : b.kind === 'start' ? <Store size={11} /> : null}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs" style={{ color: 'var(--faint)' }}>Ko‘rinishda {'{ism}'} o‘rnida «Anvar» turibdi.</p>
        </div>

        {/* Auditoriya */}
        <div className="adm-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <Users size={16} /> SavdoGO boti foydalanuvchilari
            <button className="adm-icon-btn ml-auto" onClick={() => setReload((n) => n + 1)} aria-label="Yangilash" title="Yangilash"><RefreshCw size={15} /></button>
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Jami" value={users.length} />
            <Stat label="Do‘kon egalari" value={counts.owners} />
            <Stat label="Do‘kon ochmagan" value={counts.noShop + counts.started} />
            <Stat label="Botni bloklagan" value={users.length - reachable.length} tone="var(--danger)" />
          </div>
          <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
            Hozir tanlangan: <b style={{ color: 'var(--brand)' }}>{recipients.length}</b> kishi. Bloklaganlarga yuborilmaydi.
          </p>
        </div>

        {progress && (
          <div className="adm-card p-4">
            <h2 className="text-sm font-extrabold">Jarayon</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Line icon={<CheckCircle2 size={15} />} label="Yuborildi" value={progress.sent} tone="var(--success)" />
              <Line icon={<ShieldBan size={15} />} label="Botni bloklagan" value={progress.blocked} tone="var(--danger)" />
              <Line icon={<XCircle size={15} />} label="Yetmadi (boshqa xato)" value={progress.failed} tone="var(--warning)" />
              <Line icon={<Megaphone size={15} />} label="O‘tkazib yuborildi" value={progress.skipped} tone="var(--muted)" />
              {selectedChannels.length > 0 && (
                <Line icon={<Send size={15} />} label="Kanal va guruhlarga" value={progress.channelsSent} tone="var(--brand)" />
              )}
            </div>
            {progress.channelErrors.map((e) => (
              <p key={e} className="mt-2 text-xs" style={{ color: 'var(--danger)' }}>{e}</p>
            ))}
            <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-3)' }}>
              <div
                className="h-full rounded-full"
                style={{ background: 'var(--brand)', width: `${Math.min(100, (progress.processed / Math.max(1, recipients.length)) * 100)}%`, transition: 'width 0.3s ease' }}
              />
            </div>
          </div>
        )}

        {/* Tarix */}
        <div className="adm-card p-4">
          <h2 className="text-sm font-extrabold">Yuborilganlar tarixi</h2>
          {data.history.length ? (
            <ul className="mt-2 flex flex-col divide-y" style={{ borderColor: 'var(--line)' }}>
              {data.history.map((h) => (
                <li key={h.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <b className="truncate">{h.audience || '—'}</b>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--faint)' }}>
                      {new Date(h.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                    {h.media ? (h.media === 'video' ? '🎬 ' : '🖼 ') : ''}{h.preview || '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    ✅ {h.sent} / {h.total}{h.blocked ? ` · 🚫 ${h.blocked}` : ''}{h.failed ? ` · ⚠️ ${h.failed}` : ''}{h.stopped ? ' · to‘xtatilgan' : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>Hali ommaviy xabar yuborilmagan.</p>
          )}
        </div>
      </aside>

      {confirming && (
        <ConfirmDialog
          title="Ommaviy xabar yuborilsinmi?"
          message={`Xabar ${target || 'hech kimga'} boradi${selectedChannels.length ? ` (${selectedChannels.map((c) => c.title).join(', ')})` : ''}. Yuborilgan xabarni qaytarib bo‘lmaydi.`}
          confirmLabel="Ha, yuborilsin"
          onConfirm={start}
          onClose={() => setConfirming(false)}
        />
      )}
    </div>
  )
}

function ToolButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="sp-bc-toolbar__btn" onClick={onClick} title={label} aria-label={label}>
      {children}
    </button>
  )
}

function Option({ checked, onChange, title, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint: string; disabled?: boolean }) {
  return (
    <label className={'sp-bc-option ' + (checked ? 'is-on' : '')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>
        <b>{title}</b>
        <small>{hint}</small>
      </span>
    </label>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: 'var(--surface-2)' }}>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-lg font-extrabold" style={tone ? { color: tone } : undefined}>{value}</p>
    </div>
  )
}

function Line({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: tone }}>{icon}</span>
      <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="font-extrabold">{value}</span>
    </div>
  )
}
