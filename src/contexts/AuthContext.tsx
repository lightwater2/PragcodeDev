import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (username: string, password: string) => Promise<void>
  signup: (username: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
  error: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      verifyToken(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(tokenToVerify)
      } else {
        localStorage.removeItem('token')
      }
    } catch (err) {
      console.error('Token verification failed:', err)
      localStorage.removeItem('token')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (username: string, password: string) => {
    setError(null)
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const signup = async (username: string, password: string) => {
    setError(null)
    try {
      const response = await fetch('http://localhost:3001/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed')
      }

      localStorage.setItem('token', data.token)
      setToken(data.token)
      setUser(data.user)
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.removeItem('projectName')
    sessionStorage.removeItem('isProjectInitialized')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      signup,
      logout,
      isLoading,
      error
    }}>
      {children}
    </AuthContext.Provider>
  )
}