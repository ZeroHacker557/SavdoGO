/**
 * Reklama videosini MP4 ga aylantiradi — har kadr aniq vaqtda chiziladi.
 *
 * Talab: `npm run dev` ishlab turgan bo'lsin (http://localhost:5173),
 * kompyuterda Google Chrome va ffmpeg bo'lsin.
 *
 *   node promo/render.mjs                    # 60 kadr/s: subtitrli + subtitrsiz, .srt va diktor matni
 *   node promo/render.mjs --fps 30           # tezroq, 30 kadr/s
 *   node promo/render.mjs --stills 3,14,40   # faqat shu soniyalardagi kadrlar (tekshirish uchun)
 *   node promo/render.mjs --vertical         # 9:16 (1080×1920) — Reels, TikTok, Shorts
 *   node promo/render.mjs --no-clean         # faqat subtitrli versiya
 *   node promo/render.mjs --only-clean       # faqat subtitrsiz versiya
 *   node promo/render.mjs --short            # 30 soniyalik tezkor versiya (Short.tsx)
 *
 * Oxirida ovoz (effektlar + fon musiqasi, soundtrack.mjs) yaratiladi va
 * videolarga qo'shiladi. Faqat ovozni o'zgartirsangiz, videoni qayta
 * yozish shart emas:
 *   node promo/soundtrack.mjs
 *
 * Natija: promo/out/
 */
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const here = dirname(fileURLToPath(import.meta.url))
const out = join(here, 'out')
mkdirSync(out, { recursive: true })

const args = process.argv.slice(2)
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : fallback
}
const fps = Number(opt('fps', '60'))
const stills = opt('stills', '')
const base = opt('url', 'http://localhost:5173/promo/')
const vertical = args.includes('--vertical')
const cut = args.includes('--short') ? '30' : '67'
const [W, H] = vertical ? [1080, 1920] : [1920, 1080]
/** Fayl nomi: savdogo-reklama-subtitrli.mp4, savdogo-30s-9x16-subtitrli.mp4 ... */
const prefix = cut === '30' ? 'savdogo-30s-' : 'savdogo-'
const videoName = (kind) => `savdogo-${cut === '30' ? '30s' : 'reklama'}-${vertical ? '9x16-' : ''}${kind}.mp4`
const query = (extra = '') => `${base}?render${vertical ? '&v' : ''}${cut === '30' ? '&cut=30' : ''}${extra}`

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].find((p) => existsSync(p))
if (!CHROME) throw new Error('Google Chrome topilmadi')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function openPage(url) {
  const port = 9400 + Math.floor(Math.random() * 400)
  // Vaqtinchalik Chrome profili — yopilganda o'chiriladi (har biri ~100–200 MB)
  const profile = join(tmpdir(), `savdogo-promo-${port}`)
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', `--window-size=${W},${H}`, 'about:blank',
  ], { stdio: 'ignore' })
  let targets
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); break } catch { await sleep(200) }
  }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))
  let id = 0
  const pending = new Map()
  const loads = []
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
    else if (m.method === 'Page.loadEventFired') loads.splice(0).forEach((r) => r())
  })
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'JS xato')
    return r.result?.result?.value
  }
  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false })
  const loaded = new Promise((r) => loads.push(r))
  await send('Page.navigate', { url })
  await loaded
  for (let i = 0; i < 100 && !(await evaluate('Boolean(window.__promo)')); i++) await sleep(100)
  await evaluate('window.__promo.ready()')
  const shot = async () => Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality: 93 })).result.data, 'base64')
  const seek = (t) => evaluate(`(window.__promo.seek(${t}), new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`)
  /** Chrome to'liq chiqqach profil papkasini o'chiradi — aks holda disk to'lib boradi. */
  const close = async () => {
    ws.close()
    const exited = new Promise((r) => chrome.once('exit', r))
    chrome.kill()
    await Promise.race([exited, sleep(5000)])
    for (let i = 0; i < 10; i++) {
      try { rmSync(profile, { recursive: true, force: true }); break } catch { await sleep(300) }
    }
  }
  return { chrome, ws, evaluate, seek, shot, close }
}

async function renderVideo(file, subs) {
  const page = await openPage(query(subs ? '' : '&subs=0'))
  const duration = await page.evaluate('window.__promo.duration')
  const total = Math.round(duration * fps)
  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] })
  const started = Date.now()
  for (let i = 0; i < total; i++) {
    await page.seek(i / fps)
    const frame = await page.shot()
    if (!ffmpeg.stdin.write(frame)) await new Promise((r) => ffmpeg.stdin.once('drain', r))
    if (i % fps === 0) {
      const done = (i / total) * 100
      const eta = i ? ((Date.now() - started) / i) * (total - i) / 1000 : 0
      process.stdout.write(`\r  ${file.split(/[\\/]/).pop()}: ${done.toFixed(0)}%  (~${Math.round(eta)} s qoldi)   `)
    }
  }
  ffmpeg.stdin.end()
  await new Promise((r) => ffmpeg.on('close', r))
  await page.close()
  process.stdout.write(`\r  ✅ ${file.split(/[\\/]/).pop()} — ${total} kadr, ${fps} kadr/s, ${Math.round((Date.now() - started) / 1000)} s\n`)
}

function srtTime(s) {
  const ms = Math.round(s * 1000)
  const h = String(Math.floor(ms / 3_600_000)).padStart(2, '0')
  const m = String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0')
  const sec = String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')
  return `${h}:${m}:${sec},${String(ms % 1000).padStart(3, '0')}`
}

if (stills) {
  const page = await openPage(query())
  for (const t of stills.split(',').map(Number)) {
    await page.seek(t)
    writeFileSync(join(out, `kadr-${cut === '30' ? '30s-' : ''}${vertical ? 'v-' : ''}${String(t).replace('.', '_')}s.jpg`), await page.shot())
    console.log(`kadr: ${t} s`)
  }
  await page.close()
  process.exit(0)
}

// Subtitrlar (.srt) va diktor matni — ovozni shu bo'yicha yozasiz
{
  const page = await openPage(query())
  const subs = await page.evaluate('window.__promo.subtitles')
  await page.close()
  writeFileSync(join(out, `${prefix}subtitrlar.srt`), subs.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join('\n'))
  writeFileSync(join(out, `${prefix}diktor-matni.txt`), subs.map((s) => `[${srtTime(s.start).slice(3, 8)}] ${s.text}`).join('\n') + '\n')
  console.log(`  ✅ ${prefix}subtitrlar.srt, ${prefix}diktor-matni.txt`)
}

if (!args.includes('--only-clean')) await renderVideo(join(out, videoName('subtitrli')), true)
if (!args.includes('--no-clean')) await renderVideo(join(out, videoName('toza')), false)

// Ovoz: effektlar + fon musiqasi — alohida dorojkalar va videolar ichida
const { buildSoundtrack } = await import('./soundtrack.mjs')
const { muxInto } = await import('./audio.mjs')
const wav = buildSoundtrack(cut)
for (const kind of ['subtitrli', 'toza']) {
  const video = join(out, videoName(kind))
  if (existsSync(video)) muxInto(video, wav)
}
console.log(`  ✅ ${wav.split(/[\\/]/).pop()} (effektlar + musiqa) — videolarga qo‘shildi`)
process.exit(0)
