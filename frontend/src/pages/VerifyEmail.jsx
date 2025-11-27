import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const VerifyEmail = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [hasSentInitialOTP, setHasSentInitialOTP] = useState(false)

  useEffect(() => {
    // Redirect if user is not logged in or email is already verified
    if (!user) {
      navigate('/login')
      return
    }
    if (user.isEmailVerified) {
      navigate('/dashboard')
      return
    }
  }, [user, navigate])

  useEffect(() => {
    // Don't auto-send OTP - registration already sends it
    // Only send if user explicitly requests it via resend button
    setHasSentInitialOTP(true)
  }, [])

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const sendOTP = async () => {
    // Prevent multiple simultaneous requests
    if (sending || countdown > 0) {
      return
    }

    try {
      setSending(true)
      setError('')
      setSuccess('')
      const response = await axios.post('/auth/send-verification-otp')
      setSuccess(response.data.message || 'OTP sent to your email!')
      setCountdown(60) // 60 seconds cooldown
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

  const handleOtpChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerify(newOtp.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').trim()
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('')
      setOtp(digits)
      document.getElementById('otp-5')?.focus()
    }
  }

  const handleVerify = async (otpValue = null) => {
    const otpString = otpValue || otp.join('')
    
    if (otpString.length !== 6) {
      setError('Please enter a 6-digit OTP')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')
      
      const response = await axios.post('/auth/verify-email', { otp: otpString })
      
      setSuccess('Email verified successfully! Redirecting...')
      
      // Update user in context
      setTimeout(() => {
        navigate('/dashboard')
        window.location.reload() // Refresh to update user state
      }, 1500)
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.')
      // Clear OTP on error
      setOtp(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.isEmailVerified) {
    return null
  }

  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Verify Your Email</CardTitle>
          <CardDescription className="text-center">
            We've sent a 6-digit OTP to <strong>{user.email || 'your email'}</strong>
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

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Enter OTP</label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <Input
                    key={index}
                    id={`otp-${index}`}
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
              onClick={() => handleVerify()}
              className="w-full"
              disabled={loading || otp.some(d => d === '')}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Didn't receive the OTP?
              </p>
              <Button
                variant="outline"
                onClick={sendOTP}
                disabled={sending || countdown > 0}
                className="w-full"
              >
                {sending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </div>
                ) : countdown > 0 ? (
                  `Resend OTP (${countdown}s)`
                ) : (
                  'Resend OTP'
                )}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              The OTP will expire in 10 minutes. Make sure to check your spam folder if you don't see it.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default VerifyEmail

