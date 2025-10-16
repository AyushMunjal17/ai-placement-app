import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  // Configure axios defaults
  const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api'
  axios.defaults.baseURL = API_BASE_URL

  // Set auth header if token exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.post('/auth/verify-token')
          setUser(response.data.user)
        } catch (error) {
          console.error('Token verification failed:', error)
          logout()
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [token])

  const login = async (identifier, password) => {
    try {
      const response = await axios.post('/auth/login', {
        identifier,
        password
      })

      const { token: newToken, user: userData } = response.data
      
      setToken(newToken)
      setUser(userData)
      localStorage.setItem('token', newToken)
      
      return { success: true, user: userData }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      return { success: false, error: message }
    }
  }

  const register = async (userData) => {
    try {
      const response = await axios.post('/auth/register', userData)
      
      const { token: newToken, user: newUser } = response.data
      
      setToken(newToken)
      setUser(newUser)
      localStorage.setItem('token', newToken)
      
      return { success: true, user: newUser }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      return { success: false, error: message }
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
  }

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/auth/profile', profileData)
      setUser(response.data.user)
      return { success: true, user: response.data.user }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
