import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react'

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '', // Can be email or username
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Get the page user was trying to access before login
  const from = location.state?.from?.pathname || '/dashboard'

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { identifier, password } = formData

    // Basic validation
    if (!identifier || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      return
    }

    try {
      const result = await login(identifier, password)
      
      if (result.success) {
        navigate(from, { replace: true })
      } else {
        // Check if email verification is required
        if (result.requiresVerification) {
          navigate('/verify-email')
        } else {
          setError(result.error)
        }
      }
    } catch (err) {
      const errorResponse = err.response?.data
      if (errorResponse?.error === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email')
      } else {
        setError(errorResponse?.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="identifier" className="text-sm font-medium">
                Email or Username
              </label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Enter your email or username"
                value={formData.identifier}
                onChange={handleChange}
                disabled={loading}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link 
              to="/register" 
              className="text-primary hover:underline font-medium"
            >
              Sign up here
            </Link>
          </div>

          <div className="mt-4 text-center">
            <Link 
              to="/" 
              className="text-sm text-muted-foreground hover:text-primary"
            >
              ← Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Login
