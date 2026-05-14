import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { isTokenExpired } from './token'

const ROLES = ['student', 'organiser', 'admin'] as const
export type UserRole = typeof ROLES[number]

export interface User {
  id: string
  email: string
  role: UserRole
}

interface AuthContextValue {
  token: string | null
  user: User | null
  login: (token: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function clearStorage() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

function isValidRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

function isValidUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false
  const u = value as Record<string, unknown>
  return (
    typeof u.id === 'string' &&
    typeof u.email === 'string' &&
    isValidRole(u.role)
  )
}

function loadUser(): User | null {
  const storedToken = localStorage.getItem('token')
  if (!storedToken || isTokenExpired(storedToken)) return null
  const stored = localStorage.getItem('user')
  if (!stored) return null
  try {
    const parsed = JSON.parse(stored)
    if (!isValidUser(parsed)) {
      clearStorage()
      return null
    }
    return parsed
  } catch {
    clearStorage()
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem('token')
    if (!stored) return null
    if (isTokenExpired(stored)) {
      clearStorage()
      return null
    }
    return stored
  })

  const [user, setUser] = useState<User | null>(loadUser)

  const login = useCallback((newToken: string, newUser: User) => {
    if (!isValidUser(newUser)) {
      clearStorage()
      setToken(null)
      setUser(null)
      return
    }
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }, [])

  const logout = useCallback(() => {
    clearStorage()
    setToken(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider')
  return ctx
}
