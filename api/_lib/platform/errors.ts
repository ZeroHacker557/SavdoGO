/**
 * Platforma amallaridagi xato: matn + HTTP holati + mashina o'qiydigan kod.
 *
 * Alohida faylda — shops.ts, owners.ts va super.ts bir-birini
 * import qiladi; xato klassi ulardan birida tursa, aylana import
 * paydo bo'lardi.
 */
export class PlatformError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code?: string,
  ) {
    super(message)
    this.name = 'PlatformError'
  }
}
