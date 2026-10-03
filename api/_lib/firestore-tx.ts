import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore'

/**
 * Xavfsiz tranzaksiya — `db.runTransaction` o'rniga.
 *
 * MUAMMO. Server Firestore'ga REST orqali ulanadi (firebase-admin.ts →
 * `preferRest`). Bu rejimda tranzaksiya ichida xato tashlansa (omborda
 * yo'q, limit tugagan, ariza allaqachon ko'rib chiqilgan...), o'qilgan
 * hujjatlar ustidagi qulf yechilmay qoladi va ~1 daqiqa turadi. Shu
 * hujjatga tegadigan keyingi so'rov (boshqa mijozning buyurtmasi ham)
 * shu vaqt davomida osilib turardi.
 *
 * YECHIM. Ichki funksiya xato tashlasa, tranzaksiya xatosiz yakunlanadi
 * (bo'sh commit — qulf darhol yechiladi), xato esa TASHQARIDA qayta
 * tashlanadi. Yozuvlar (`set/update/create/delete`) oxirigacha
 * to'planib turadi va faqat funksiya muvaffaqiyatli tugasa qo'llanadi —
 * «hammasi yoki hech narsa» qoidasi avvalgidek saqlanadi.
 *
 * Firestore'ning o'z xatolari (raqamli `code`, masalan to'qnashuvdagi
 * ABORTED) o'tkazib yuboriladi — kutubxona ularda tranzaksiyani o'zi
 * qaytadan urinadi.
 */
export async function runTx<T>(db: Firestore, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const outcome = await db.runTransaction(async (tx) => {
    const writes: (() => void)[] = []
    const buffered = new Proxy(tx, {
      get(target, prop, receiver) {
        if (prop === 'set' || prop === 'update' || prop === 'create' || prop === 'delete') {
          return (...args: unknown[]) => {
            writes.push(() => (Reflect.get(target, prop) as (...a: unknown[]) => unknown).apply(target, args))
            return receiver
          }
        }
        const value = Reflect.get(target, prop)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
    try {
      const value = await fn(buffered)
      for (const write of writes) write()
      return { ok: true as const, value }
    } catch (error) {
      if (typeof (error as { code?: unknown })?.code === 'number') throw error
      return { ok: false as const, error }
    }
  })
  if (!outcome.ok) throw outcome.error
  return outcome.value
}

/**
 * Hujjat yo'q bo'lsa yaratadi va `true` qaytaradi; bor bo'lsa — `false`.
 *
 * `ref.create()` o'rniga: REST rejimida mavjud hujjatga `create()`
 * javob qaytarmay osilib qoladi (ALREADY_EXISTS'ni qayta urinaveradi).
 * Tranzaksiyada esa tekshiruv va yozish birga — bir vaqtdagi ikki
 * so'rovdan faqat bittasi yaratadi.
 */
export async function createIfAbsent(db: Firestore, ref: DocumentReference, data: Record<string, unknown>): Promise<boolean> {
  return runTx(db, async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) return false
    tx.set(ref, data)
    return true
  })
}
