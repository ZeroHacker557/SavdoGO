import { useEffect, useState, type ReactNode } from 'react'
import { activeShop, onShopChange } from './active'
import { ShopContext } from './context'

export function ShopProvider({ children }: { children: ReactNode }) {
  const [shop, setShop] = useState(activeShop)
  useEffect(() => onShopChange(setShop), [])
  return <ShopContext.Provider value={shop}>{children}</ShopContext.Provider>
}
