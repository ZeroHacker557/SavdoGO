/**
 * Platforma egasi (super-admin) hisobini yaratadi yoki mavjud hisobga
 * huquq beradi. /super paneliga faqat shu hisob kira oladi.
 *
 * Ishlatish (loyiha ildizidan):
 *   node scripts/create-super.mjs <email> <parol>
 *
 * Hisob allaqachon bo'lsa parol yangilanadi va `super: true` qo'shiladi
 * (boshqa claim'lar saqlanadi). Huquqni olib tashlash:
 *   node scripts/create-super.mjs <email> --revoke
 */
import { connect } from './_firebase.mjs'

const [, , email, password] = process.argv

if (!email || !password) {
  console.error('Ishlatish: node scripts/create-super.mjs <email> <parol>')
  console.error('           node scripts/create-super.mjs <email> --revoke')
  process.exit(1)
}

const { auth } = connect()
const revoke = password === '--revoke'

if (!revoke && password.length < 10) {
  console.error('Parol kamida 10 belgidan iborat bo‘lsin — bu platformaning eng kuchli hisobi.')
  process.exit(1)
}

let user
try {
  user = await auth.getUserByEmail(email)
  if (!revoke) await auth.updateUser(user.uid, { password })
  console.log(`Mavjud hisob: ${email}`)
} catch (error) {
  if (error?.code !== 'auth/user-not-found' || revoke) throw error
  user = await auth.createUser({ email, password, displayName: 'SavdoGO' })
  console.log(`Yangi hisob yaratildi: ${email}`)
}

const claims = { ...(user.customClaims || {}) }
if (revoke) delete claims.super
else claims.super = true
await auth.setCustomUserClaims(user.uid, claims)
// Eski tokenlar bekor — yangi huquq keyingi kirishda kuchga kiradi
await auth.revokeRefreshTokens(user.uid)

console.log(revoke ? '✅ Super-admin huquqi olib tashlandi.' : '✅ Tayyor. /super sahifasiga shu email va parol bilan kiring.')
process.exit(0)
