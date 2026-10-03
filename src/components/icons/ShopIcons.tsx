import { Svg, type IconProps } from './FoodIcons'

/**
 * Kiyim va poyabzal kategoriyalari uchun ikonkalar.
 *
 * Lucide'da futbolka (`Shirt`) bor, lekin ko'ylak, kurtka, jinsi, xudi
 * va tufli yo'q — ularning o'rniga hammasiga bir xil belgi chiqib,
 * kategoriyalar bir-biridan ajralmay qolardi. FoodIcons kabi AYNAN
 * lucide uslubida chiziladi: 24×24, chiziq, qalinligi 2.
 */

/** Ayollar ko'ylagi — ingichka bog'ich, bel va kengayuvchi etak. */
export function DressIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 2v3.5L7.5 9.5 9 11 5 22h14l-4-11 1.5-1.5L15 5.5V2" />
      <path d="M9 11h6" />
    </Svg>
  )
}

/** Kurtka — ikki bo'lak, o'rtada zamok chizig'i. */
export function JacketIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 2 4 4.5 2 12l3 1v9h6V8" />
      <path d="M16 2l4 2.5 2 7.5-3 1v9h-6V8" />
      <path d="M8 2l3 6M16 2l-3 6" />
    </Svg>
  )
}

/** Shim / jinsi — kamar va ikki pocha. */
export function JeansIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 2h12l1 20h-5l-2-12-2 12H5z" />
      <path d="M6.2 6h11.6" />
    </Svg>
  )
}

/** Xudi — kapyushon va kenguru cho'ntak. */
export function HoodieIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 3.5a3 3 0 0 0 6 0" />
      <path d="M9 3.5 4.5 6 2 13l3 1v8h14v-8l3-1-2.5-7L15 3.5" />
      <path d="M9 16h6v3H9z" />
    </Svg>
  )
}

/** Poshnali tufli. */
export function HeelIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9c3 0 5 3 8 6 2 2 4 3 7 3h2a2 2 0 0 0 0-4c-3 0-7-5-10-8" />
      <path d="M3 9v12" />
      <path d="M11 15l-1 6" />
    </Svg>
  )
}

/** Krossovka — taglik va bog'ich chiziqlari. */
export function SneakerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M2 17V8.5L6 7l2.5 3.5L14 12l6 1.5a2 2 0 0 1 2 2V17z" />
      <path d="M2 17v2.5h20V17" />
      <path d="M8.5 10.5 10 9M11 11.3l1.4-1.6" />
    </Svg>
  )
}
