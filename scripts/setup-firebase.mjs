/**
 * Firebase loyihasini platformaga tayyorlaydi — `firebase-tools`siz.
 *
 *   1. Anonymous kirishni yoqadi (xaridorlar parolsiz buyurtma beradi)
 *   2. firestore.rules va storage.rules ni deploy qiladi
 *
 * Qoidalar yuklanishda Firebase ularni kompilyatsiya qiladi — xato
 * bo'lsa hech narsa o'zgarmaydi va qator raqami bilan ko'rsatiladi.
 * Qayta ishga tushirish xavfsiz (qoidalar o'zgarsa — shu buyruq).
 *
 * Ishlatish:  node scripts/setup-firebase.mjs [--rules-only]
 */
import { readFileSync } from 'node:fs'
import { cert } from 'firebase-admin/app'
import { connect } from './_firebase.mjs'

const { projectId, key } = connect()
const token = (await cert(key).getAccessToken()).access_token
const rulesOnly = process.argv.includes('--rules-only')
const bucket = process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`

async function google(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, json }
}

if (!rulesOnly) {
  const result = await google(
    'PATCH',
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config?updateMask=signIn.anonymous.enabled`,
    { signIn: { anonymous: { enabled: true } } },
  )
  if (!result.ok) {
    console.error('❌ Anonymous yoqilmadi:', result.status, result.json.error?.message)
    process.exit(1)
  }
  console.log('✅ Anonymous kirish yoqildi')
}

const RULES = 'https://firebaserules.googleapis.com/v1'
for (const [release, file] of [['cloud.firestore', 'firestore.rules'], [`firebase.storage/${bucket}`, 'storage.rules']]) {
  const content = readFileSync(file, 'utf8')
  const created = await google('POST', `${RULES}/projects/${projectId}/rulesets`, { source: { files: [{ name: file, content }] } })
  if (!created.ok) {
    console.error(`❌ ${file} kompilyatsiya bo‘lmadi:`)
    for (const issue of created.json.error?.details?.flatMap?.((d) => d.issues ?? []) ?? []) {
      console.error(`   ${issue.sourcePosition?.line}:${issue.sourcePosition?.column} ${issue.description}`)
    }
    console.error('  ', created.json.error?.message)
    process.exit(1)
  }
  const rulesetName = created.json.name
  const name = `projects/${projectId}/releases/${release}`
  let result = await google('PATCH', `${RULES}/${name}`, { release: { name, rulesetName } })
  if (result.status === 404) result = await google('POST', `${RULES}/projects/${projectId}/releases`, { name, rulesetName })
  if (!result.ok) {
    console.error(`❌ ${file} deploy bo‘lmadi:`, result.status, result.json.error?.message)
    process.exit(1)
  }
  console.log(`✅ ${file} deploy qilindi`)
}
process.exit(0)
