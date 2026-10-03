/** SavdoGO yozuvi — «Savdo» + yashil «GO» nishoni (belgisiz). */
export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className={`lp-logo${light ? ' lp-logo--light' : ''}`}>
      <span className="lp-logo__word">
        Savdo<span className="lp-logo__go">GO</span>
      </span>
    </span>
  )
}
