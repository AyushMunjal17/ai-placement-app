import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Mail, Lock, CheckCircle, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: Enter email, 2: Enter OTP, 3: Set new password
  const [formData, setFormData] = useState({
    email: '',
    otp: ['', '', '', '', '', ''],
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(0)

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleEmailChange = (e) => {
    setFormData({ ...formData, email: e.target.value })
    if (error) setError('')
  }

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...formData.otp]
    newOtp[index] = value
    setFormData({ ...formData, otp: newOtp })

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }

    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerifyOTP(newOtp.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      setFormData({ ...formData, otp: digits })
      document.getElementById('reset-otp-5')?.focus()
    }
  }

  const requestOTP = async () => {
    if (!formData.email) {
      setError('Please enter your email address')
      return
    }

    try {
      setSending(true)
      setError('')
      setSuccess('')
      const response = await axios.post('/auth/forgot-password', { email: formData.email })
      setSuccess(response.data.message || 'OTP sent to your email!')
      setStep(2)
      setCountdown(60)
    } catch (error) {
      const errorData = error.response?.data
      if (errorData?.error === 'RATE_LIMIT') {
        setCountdown(errorData.retryAfter || 60)
        setError(errorData.message || 'Please wait before requesting a new OTP.')
      } else {
        setError(errorData?.message || 'Failed to send OTP. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOTP = async (otpValue = null) => {
    const otpString = otpValue || formData.otp.join('')
    
    if (otpString.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      
      // Just verify OTP, don't reset password yet
      // We'll move to step 3 to set new password
      setStep(3)
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.')
      setFormData({ ...formData, otp: ['', '', '', '', '', ''] })
      document.getElementById('reset-otp-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all fields')
      return
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      const otpString = formData.otp.join('')
      const response = await axios.post('/auth/reset-password', {
        email: formData.email,
        otp: otpString,
        newPassword: formData.newPassword
      })

      setSuccess('Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            {step === 1 ? (
              <Mail className="h-8 w-8 text-primary" />
            ) : step === 2 ? (
              <Lock className="h-8 w-8 text-primary" />
            ) : (
              <CheckCircle className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl text-center">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Enter Verification Code'}
            {step === 3 && 'Set New Password'}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 1 && 'Enter your email address to receive a password reset code'}
            {step === 2 && `We've sent a 6-digit code to ${formData.email}`}
            {step === 3 && 'Enter your new password'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md mb-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded-md mb-4">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          )}

          {/* Step 1: Enter Email */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  disabled={sending}
                />
              </div>

              <Button
                onClick={requestOTP}
                className="w-full"
                disabled={sending || !formData.email}
              >
                {sending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </div>
                ) : (
                  'Send Reset Code'
                )}
              </Button>
            </div>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Enter 6-digit Code</label>
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {formData.otp.map((digit, index) => (
                    <Input
                      key={index}
                      id={`reset-otp-${index}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold"
                      disabled={loading}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={() => handleVerifyOTP()}
                className="w-full"
                disabled={loading || formData.otp.some(d => d === '')}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  'Verify Code'
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={requestOTP}
                  disabled={sending || countdown > 0}
                  className="w-full"
                >
                  {sending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </div>
                  ) : countdown > 0 ? (
                    `Resend Code (${countdown}s)`
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Set New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
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
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ForgotPassword

