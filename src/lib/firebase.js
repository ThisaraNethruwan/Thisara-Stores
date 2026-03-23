import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import {
  getFirestore,
  collection, doc,
  getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, onSnapshot,
  serverTimestamp, Timestamp,
} from 'firebase/firestore'

// ── Your Firebase config (from Firebase Console) ─────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const app     = initializeApp(firebaseConfig)
export const auth    = getAuth(app)
export const db      = getFirestore(app)

// ── Collection references ─────────────────────────────────────────────────────
export const colProducts   = () => collection(db, 'products')
export const colCategories = () => collection(db, 'categories')
export const colOrders     = () => collection(db, 'orders')
export const colReviews    = () => collection(db, 'reviews')
export const colAdmins     = () => collection(db, 'admins')

// ── In-memory cache ───────────────────────────────────────────────────────────
const CACHE     = new Map()
const CACHE_TTL = 60_000

export async function cachedQuery(key, queryFn, ttl = CACHE_TTL) {
  const now = Date.now()
  const hit = CACHE.get(key)
  if (hit && now - hit.ts < ttl) return hit.data
  const data = await queryFn()
  if (data) CACHE.set(key, { data, ts: now })
  return data
}

export function invalidateCache(key) {
  if (key) CACHE.delete(key)
  else CACHE.clear()
}

// ── Helper: Firestore doc → plain object with id ──────────────────────────────
export function docToObj(snap) {
  if (!snap.exists()) return null
  const data = snap.data()
  // Convert Timestamps to ISO strings for consistency
  const cleaned = {}
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Timestamp) cleaned[k] = v.toDate().toISOString()
    else cleaned[k] = v
  }
  return { id: snap.id, ...cleaned }
}

export function docsToArr(snap) {
  return snap.docs.map(docToObj)
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export async function fetchProducts() {
  // Only filter — sort in JS to avoid composite index requirement
  const q = query(colProducts(), where('active', '==', true))
  const snap = await getDocs(q)
  const all = docsToArr(snap)
  return all.sort((a, b) => (a.category || '').localeCompare(b.category || ''))
}

export async function fetchAllProducts() {
  const q = query(colProducts(), orderBy('category'))
  const snap = await getDocs(q)
  return docsToArr(snap)
}

export async function addProduct(data) {
  return addDoc(colProducts(), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function updateProduct(id, data) {
  return updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteProduct(id) {
  return deleteDoc(doc(db, 'products', id))
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────
export async function fetchCategories() {
  const q = query(colCategories(), orderBy('sort_order'))
  const snap = await getDocs(q)
  return docsToArr(snap)
}

export async function addCategory(data) {
  return addDoc(colCategories(), { ...data, createdAt: serverTimestamp() })
}

export async function updateCategory(id, data) {
  return updateDoc(doc(db, 'categories', id), data)
}

export async function deleteCategory(id) {
  return deleteDoc(doc(db, 'categories', id))
}

// ── ORDERS ────────────────────────────────────────────────────────────────────
export async function addOrder(data) {
  return addDoc(colOrders(), { ...data, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

export async function fetchOrders() {
  const q = query(colOrders(), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return docsToArr(snap)
}

export async function updateOrderStatus(id, status) {
  return updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() })
}

// ── REVIEWS ───────────────────────────────────────────────────────────────────
export async function addReview(data) {
  return addDoc(colReviews(), { ...data, approved: false, createdAt: serverTimestamp() })
}

export async function fetchApprovedReviews() {
  // Only filter by approved — sort in JS to avoid composite index requirement
  const q = query(colReviews(), where('approved', '==', true))
  const snap = await getDocs(q)
  const all = docsToArr(snap)
  return all
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)
}

export async function fetchAllReviews() {
  const q = query(colReviews(), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return docsToArr(snap)
}

export async function updateReview(id, data) {
  return updateDoc(doc(db, 'reviews', id), data)
}

export async function deleteReview(id) {
  return deleteDoc(doc(db, 'reviews', id))
}

// ── ADMIN CHECK ───────────────────────────────────────────────────────────────
export async function checkIsAdmin(uid) {
  if (!uid) return false
  try {
    const snap = await getDoc(doc(db, 'admins', uid))
    return snap.exists() && snap.data()?.isAdmin === true
  } catch { return false }
}

export { onSnapshot, doc, db as firestore, query, colOrders as ordersCol, orderBy, serverTimestamp }

// ── Cloudinary image upload (no Firebase Storage needed) ─────────────────────
export async function uploadToCloudinary(file) {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  if (!cloudName || !uploadPreset) {
    throw new Error('Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET in .env')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)
  formData.append('folder', 'products')

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Cloudinary upload failed')
  }

  const data = await res.json()
  return data.secure_url  // permanent HTTPS URL
}