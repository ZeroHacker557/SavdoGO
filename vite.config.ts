import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * Lokal `/api/*` — Vercel funksiyalarini `npm run dev` ichida ishga tushiradi.
 *
 * Nega: shablonda `/api` faqat `vercel dev` yoki deploy'da ishlardi,
 * shuning uchun ro'yxatdan o'tish, buyurtma va admin panelni lokal
 * sinab bo'lmasdi. Bu plagin `/api/admin/action` so'rovini
 * `api/admin/action.ts` faylining default funksiyasiga beradi —
 * Vercel'ning `req.body` / `res.status().json()` ko'rinishida.
 *
 * Maxfiy qiymatlar (FIREBASE_SERVICE_ACCOUNT, BOT_TOKEN...) loyiha
 * ildizidagi `.env` dan olinadi. Production'ga ta'sir qilmaydi — faqat
 * dev server.
 */
function devApi(): Plugin {
  let server: ViteDevServer

  return {
    name: 'savdogo-dev-api',
    apply: 'serve',
    configureServer(dev) {
      server = dev
      // .env dagi hamma qiymat (VITE_ prefiksisiz ham) — faqat server tomonga
      Object.assign(process.env, loadEnv(dev.config.mode, root, ''))

      // vercel.json dagi qayta yozuvlar: /admin → admin.html, /super → super.html
      dev.middlewares.use((req: IncomingMessage, _res: ServerResponse, next: () => void) => {
        const match = /^\/(admin|super)\/?(\?.*)?$/.exec(req.url || '')
        if (match) req.url = `/${match[1]}.html${match[2] || ''}`
        next()
      })

      dev.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        if (!req.url?.startsWith('/api/')) return next()

        const url = new URL(req.url, 'http://localhost')
        const file = path.join(root, `${url.pathname.replace(/\/+$/, '')}.ts`)
        const json = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        }

        if (!file.startsWith(path.join(root, 'api')) || path.basename(file).startsWith('_') || !existsSync(file)) {
          return json(404, { error: 'API topilmadi' })
        }

        try {
          const raw = await readBody(req)
          let body: unknown = raw
          if (raw && String(req.headers['content-type'] || '').includes('application/json')) {
            try {
              body = JSON.parse(raw)
            } catch {
              return json(400, { error: 'JSON noto‘g‘ri' })
            }
          }

          const mod = await server.ssrLoadModule(file)
          const vreq = Object.assign(req, {
            body,
            query: Object.fromEntries(url.searchParams),
            cookies: {},
          })
          const vres = Object.assign(res, {
            status(code: number) {
              res.statusCode = code
              return vres
            },
            json(payload: unknown) {
              if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify(payload))
              return vres
            },
            send(payload: unknown) {
              res.end(typeof payload === 'string' || Buffer.isBuffer(payload) ? payload : JSON.stringify(payload))
              return vres
            },
          })
          await mod.default(vreq, vres)
        } catch (error) {
          server.ssrFixStacktrace(error as Error)
          console.error(`[dev-api] ${url.pathname}:`, error)
          if (!res.headersSent) json(500, { error: error instanceof Error ? error.message : 'Server xatosi' })
        }
      })
    },
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      data += chunk
      // Logo va chek rasmlari data URL bo'lib keladi — 8 MB yetarli
      if (data.length > 8 * 1024 * 1024) reject(new Error('So‘rov juda katta'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

/**
 * Uchta mustaqil sahifa:
 *   index.html — landing (savdogo.shop) YOKI do'kon sayti (nomi.savdogo.shop)
 *   admin.html — do'kon egasining admin paneli (/admin)
 *   super.html — platforma egasining paneli (/super)
 *
 * Ular alohida bundle'ga yig'iladi. Vercel'da /admin, /super va /start
 * qayta yozuvlari vercel.json da.
 */
export default defineConfig({
  plugins: [react(), tailwindcss(), devApi()],
  server: {
    // nomi.localhost:5173 — subdomenli do'konni lokal sinash uchun
    allowedHosts: ['.localhost'],
  },
  build: {
    rollupOptions: {
      input: {
        main: path.join(root, 'index.html'),
        admin: path.join(root, 'admin.html'),
        super: path.join(root, 'super.html'),
      },
    },
  },
})
