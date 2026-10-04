import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isDemoAccount: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signInDemo: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (profile: { fullName: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const demoSessionKey = 'smartbite.demo.session.v1'
let memoryDemoUser: User | null = null

function mapSupabaseUser(user: SupabaseUser): User {
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''),
    avatarUrl: typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : undefined,
  }
}

function getDemoUser() {
  try {
    const stored = window.localStorage.getItem(demoSessionKey)
    return stored ? JSON.parse(stored) as User : memoryDemoUser
  } catch {
    return memoryDemoUser
  }
}

function setDemoUser(user: User | null) {
  memoryDemoUser = user
  try {
    if (user) window.localStorage.setItem(demoSessionKey, JSON.stringify(user))
    else window.localStorage.removeItem(demoSessionKey)
  } catch {
    // Local-only preview mode remains usable if the embedding browser blocks storage.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoAccount, setIsDemoAccount] = useState(false)

  useEffect(() => {
    if (!supabase) {
      setUser(getDemoUser())
      setIsDemoAccount(Boolean(getDemoUser()))
      setLoading(false)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ? mapSupabaseUser(data.session.user) : null)
      setIsDemoAccount(false)
      setLoading(false)
    }).catch(() => {
      if (mounted) setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      setUser(session?.user ? mapSupabaseUser(session.user) : null)
      setIsDemoAccount(false)
      setLoading(false)
    })
    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      const cleanEmail = email.trim().toLowerCase()
      if (!cleanEmail || password.length < 1) throw new Error('Enter your email and password to continue.')
      const demoUser: User = {
        id: `local-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
        email: cleanEmail,
        fullName: cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
      }
      setDemoUser(demoUser)
      setUser(demoUser)
      setIsDemoAccount(true)
      return
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error(error.message)
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!supabase) {
      if (password.length < 8) throw new Error('Use at least 8 characters for your password.')
      const demoUser: User = { id: `local-${crypto.randomUUID()}`, email: email.trim().toLowerCase(), fullName: fullName.trim() }
      setDemoUser(demoUser)
      setUser(demoUser)
      setIsDemoAccount(true)
      return
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    })
    if (error) throw new Error(error.message)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) {
      if (!email.trim()) throw new Error('Enter the email address you used to sign in.')
      // No email is sent in local demo mode. The UI explains this clearly.
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth?mode=reset`,
    })
    if (error) throw new Error(error.message)
  }, [])

  const signInDemo = useCallback(async () => {
    if (supabase && isSupabaseConfigured) {
      const demoUser: User = { id: 'demo-local', email: 'demo@smartbite.local', fullName: 'Alex' }
      setDemoUser(demoUser)
      setUser(demoUser)
      setIsDemoAccount(true)
      return
    }
    const demoUser: User = { id: 'demo-local', email: 'demo@smartbite.local', fullName: 'Alex' }
    setDemoUser(demoUser)
    setUser(demoUser)
    setIsDemoAccount(true)
  }, [])

  const signOut = useCallback(async () => {
    if (isDemoAccount || !supabase) {
      setDemoUser(null)
      setUser(null)
      setIsDemoAccount(false)
      return
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(error.message)
  }, [isDemoAccount])

  const updateProfile = useCallback(async ({ fullName }: { fullName: string }) => {
    if (!user) return
    const nextUser = { ...user, fullName: fullName.trim() }
    if (isDemoAccount || !supabase) {
      setDemoUser(nextUser)
      setUser(nextUser)
      return
    }
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
    if (error) throw new Error(error.message)
    setUser(nextUser)
  }, [isDemoAccount, user])

  const value = useMemo(() => ({ user, loading, isDemoAccount, signIn, signUp, resetPassword, signInDemo, signOut, updateProfile }), [
    user, loading, isDemoAccount, signIn, signUp, resetPassword, signInDemo, signOut, updateProfile,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
