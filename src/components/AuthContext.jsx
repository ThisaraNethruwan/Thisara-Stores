import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, checkIsAdmin } from '../lib/firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const mountedRef = useRef(true)

  const verifyAdmin = useCallback(async (uid) => {
    const admin = await checkIsAdmin(uid)
    if (mountedRef.current) setIsAdmin(admin)
    return admin
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!mountedRef.current) return
      setUser(fbUser)
      if (fbUser) {
        await verifyAdmin(fbUser.uid)
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    })
    return () => { mountedRef.current = false; unsub() }
  }, [verifyAdmin])

  const signIn = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      await verifyAdmin(cred.user.uid)
      return { user: cred.user, error: null }
    } catch (e) {
      return { user: null, error: { message: e.message } }
    }
  }

  const signOut = async () => {
    try { await fbSignOut(auth) } catch {}
    setUser(null)
    setIsAdmin(false)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
