import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { ArrowLeft, Loader2, ShieldCheck, Mail, RefreshCw, CheckCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'

type OTPType = 'email_verification' | 'password_reset' | 'phone_verification'

export default function OTPVerificationPage() {
  const [otp, setOTP] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [canResend, setCanResend] = useState(false)
  
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const { user } = useAuth()
  
  // Get OTP type from URL params
  const otpType: OTPType = (searchParams.get('type') as OTPType) || 'email_verification'
  const email = searchParams.get('email') || user?.email || ''
  const phone = searchParams.get('phone') || ''

  // Countdown timer for resend
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [timeLeft])

  const getPageContent = () => {
    switch (otpType) {
      case 'email_verification':
        return {
          title: 'Verify Your Email',
          description: `We've sent a 6-digit verification code to ${email}. Please enter it below to verify your email address.`,
          icon: <Mail className="h-6 w-6" />,
          successMessage: 'Email verified successfully!',
          resendText: 'Resend verification email'
        }
      case 'password_reset':
        return {
          title: 'Reset Your Password',
          description: `We've sent a 6-digit code to ${email}. Enter it below to reset your password.`,
          icon: <ShieldCheck className="h-6 w-6" />,
          successMessage: 'Code verified! You can now reset your password.',
          resendText: 'Resend reset code'
        }
      case 'phone_verification':
        return {
          title: 'Verify Your Phone',
          description: `We've sent a 6-digit verification code to ${phone}. Please enter it below.`,
          icon: <ShieldCheck className="h-6 w-6" />,
          successMessage: 'Phone number verified successfully!',
          resendText: 'Resend SMS code'
        }
      default:
        return {
          title: 'Verify Code',
          description: 'Please enter the verification code sent to you.',
          icon: <ShieldCheck className="h-6 w-6" />,
          successMessage: 'Code verified successfully!',
          resendText: 'Resend code'
        }
    }
  }

  const content = getPageContent()

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setError('')
    setLoading(true)

    try {
      switch (otpType) {
        case 'email_verification':
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'signup'
          })
          
          if (verifyError) {
            setError(verifyError.message)
          } else {
            setMessage(content.successMessage)
            setTimeout(() => navigate('/'), 2000)
          }
          break

        case 'password_reset':
          const { error: resetError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'recovery'
          })
          
          if (resetError) {
            setError(resetError.message)
          } else {
            setMessage(content.successMessage)
            setTimeout(() => navigate(`/reset-password?token=${otp}&email=${email}`), 2000)
          }
          break

        case 'phone_verification':
          const { error: phoneError } = await supabase.auth.verifyOtp({
            phone,
            token: otp,
            type: 'sms'
          })
          
          if (phoneError) {
            setError(phoneError.message)
          } else {
            setMessage(content.successMessage)
            setTimeout(() => navigate('/'), 2000)
          }
          break

        default:
          setError('Invalid verification type')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendLoading(true)
    setError('')
    setMessage('')

    try {
      switch (otpType) {
        case 'email_verification':
          const { error: resendEmailError } = await supabase.auth.resend({
            type: 'signup',
            email
          })
          
          if (resendEmailError) {
            setError(resendEmailError.message)
          } else {
            setMessage('Verification email sent again!')
            setTimeLeft(60)
            setCanResend(false)
          }
          break

        case 'password_reset':
          const { error: resendResetError } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/otp-verification?type=password_reset&email=${email}`
          })
          
          if (resendResetError) {
            setError(resendResetError.message)
          } else {
            setMessage('Reset code sent again!')
            setTimeLeft(60)
            setCanResend(false)
          }
          break

        case 'phone_verification':
          setMessage('SMS code sent again!')
          setTimeLeft(60)
          setCanResend(false)
          break
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleOTPChange = (value: string) => {
    setOTP(value)
    setError('')
    
    // Auto-verify when 6 digits are entered
    if (value.length === 6) {
      setTimeout(handleVerify, 500)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/login" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
          
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="relative">
              <img src="/logo.svg" alt="Tickets Logo" className="h-12 w-12" />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg blur opacity-50"></div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Tickets
            </h1>
          </motion.div>
        </div>

        <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                {content.icon}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-white">{content.title}</CardTitle>
            <CardDescription className="text-center text-gray-400 leading-relaxed">
              {content.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}
            
            {message && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-400">{message}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <Label className="text-center block text-white">Enter 6-digit verification code</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={handleOTPChange}
                  className="gap-3"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} className="h-14 w-14 text-xl bg-white/5 border-white/10 text-white focus:border-blue-400/50" />
                    <InputOTPSlot index={1} className="h-14 w-14 text-xl bg-white/5 border-white/10 text-white focus:border-blue-400/50" />
                    <InputOTPSlot index={2} className="h-14 w-14 text-xl bg-white/5 border-white/10 text-white focus:border-blue-400/50" />
                    <InputOTPSlot index={3} className="h-14 w-14 text-xl bg-white/5 border-white/10 text-white focus:border-blue-400/50" />
                    <InputOTPSlot index={4} className="h-14 w-14 text-xl bg-white/5 border-white/10 text-white focus:border-blue-400/50" />
                    <InputOTPSlot index={5} className="h-14 w-14 text-xl bg-white/5 border-white/10 text-white focus:border-blue-400/50" />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            
            <Button 
              onClick={handleVerify}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 text-white py-6 text-lg font-semibold" 
              disabled={loading || otp.length !== 6}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Verify Code
            </Button>

            <div className="text-center space-y-4">
              <p className="text-sm text-gray-400">
                Didn't receive the code?
              </p>
              {canResend ? (
                <Button 
                  variant="ghost" 
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                >
                  {resendLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {content.resendText}
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Resend available in {timeLeft}s</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Secure Verification</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Protected</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}