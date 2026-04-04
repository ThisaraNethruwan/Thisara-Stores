import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'

const CartContext = createContext(null)
const CART_KEY    = 'thisara-cart'

function loadCart() {
  try { const r = localStorage.getItem(CART_KEY); return r ? JSON.parse(r) : [] }
  catch { return [] }
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(loadCart)

  useEffect(() => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
  }, [cart])

  const addToCart = useCallback((product, weightOption = null) => {
    setCart(prev => {
      if (weightOption) {
        // ── Weight-based item ──────────────────────────────────────────────
        // For custom weights, use a unique key so the same product at different
        // weights coexists as separate line items.
        // weightOption shape: { value: number, label: string, isCustom?: boolean }
        const key = `${product.id}_${weightOption.value}`
        const pricePerKg = product.price_per_kg
        const sub  = pricePerKg * weightOption.value

        const ex = prev.find(i => i.cartKey === key)
        if (ex) {
          // Increment qty — each qty "unit" = one order of that weight amount
          return prev.map(i => i.cartKey === key
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * sub }
            : i
          )
        }
        return [...prev, {
          ...product,
          cartKey:         key,
          qty:             1,
          is_weight_based: true,
          weight_value:    weightOption.value,
          weight_label:    weightOption.label,
          is_custom_weight: weightOption.isCustom || false,
          subtotal:        sub,
        }]
      } else {
        // ── Flat-price item ────────────────────────────────────────────────
        // If a variant is selected the price field is already overridden in product
        const key = product.selectedVariant
          ? `${product.id}_${product.selectedVariant}`
          : String(product.id)

        const ex = prev.find(i => i.cartKey === key)
        if (ex) {
          return prev.map(i => i.cartKey === key
            ? { ...i, qty: i.qty + 1, subtotal: (i.qty + 1) * i.price }
            : i
          )
        }
        return [...prev, {
          ...product,
          cartKey:         key,
          qty:             1,
          is_weight_based: false,
          subtotal:        product.price,
        }]
      }
    })
  }, [])

  const removeFromCart = useCallback(key =>
    setCart(prev => prev.filter(i => i.cartKey !== key)), [])

  const updateQty = useCallback((key, qty) => {
    if (qty < 1) { removeFromCart(key); return }
    setCart(prev => prev.map(i => {
      if (i.cartKey !== key) return i
      // For weight-based: unit cost = price_per_kg × weight_value
      const unit = i.is_weight_based
        ? i.price_per_kg * i.weight_value
        : i.price
      return { ...i, qty, subtotal: qty * unit }
    }))
  }, [removeFromCart])

  const clearCart = useCallback(() => setCart([]), [])

  const total    = useMemo(() => cart.reduce((s, i) => s + (i.subtotal || 0), 0), [cart])
  const count    = useMemo(() => cart.length, [cart])
  const totalQty = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart])

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, total, count, totalQty }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
