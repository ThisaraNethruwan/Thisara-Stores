export const SHOP_NAME            = 'Thisara Stores'
export const OWNER_PHONE          = '0707779453'
export const OWNER_WHATSAPP       = '94707779453'
export const SHOP_ADDRESS         = 'Ragama, Western Province, Sri Lanka'
export const SHOP_AREA            = 'Ragama'
export const SHOP_HOURS           = 'Open daily: 10:00 AM – 9:00 PM'
export const HERO_IMAGE_URL       = '/delivery-guy-2.svg'

export const SHOP_LAT             = 7.015468376212816
export const SHOP_LNG             = 79.91953996256439

export const DELIVERY_RATE_PER_KM    = 70
export const FREE_DELIVERY_THRESHOLD = 10000
export const MIN_DELIVERY_FEE        = 100

export const WEIGHT_OPTIONS = [
  { label: '250g',  value: 0.25 },
  { label: '500g',  value: 0.5  },
  { label: '1 kg',  value: 1    },
  { label: '2 kg',  value: 2    },
  { label: '5 kg',  value: 5    },
  { label: '10 kg', value: 10   },
]

export const DELIVERY_AREAS = [
  'Ragama','Kandana','Ja-Ela','Wattala','Kelaniya',
  'Peliyagoda','Ekala','Seeduwa','Minuwangoda','Katunayake','Other',
]

// Collision-resistant order ID: TS + base-36 timestamp + 4 random chars
// e.g.  TSM0ZZZZ1A2B  — effectively unique for decades of use
export function generateOrderId() {
  const ts  = Date.now().toString(36).toUpperCase()
  const rnd = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TS${ts}${rnd}`
}
