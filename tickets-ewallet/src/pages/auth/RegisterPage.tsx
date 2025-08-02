import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, ArrowLeft, Sparkles, UserPlus, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { UserRole } from '@/lib/supabase'

const getRoleFeatures = (t: (key: string) => string) => ({
  passenger: [t('features.digitalWallet'), t('features.qrPayments'), t('features.eventTickets'), t('features.transactionHistory')],
  driver: [t('features.driverDashboard'), t('features.earningsTracking'), t('features.qrGeneration'), t('features.tripManagement')],
  merchant: [t('features.businessDashboard'), t('features.paymentProcessing'), t('features.analyticsInsights'), t('features.customerManagement')],
  event_admin: [t('features.eventCreation'), t('features.ticketManagement'), t('features.attendeeAnalytics'), t('features.revenueTracking')]
})

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phoneNumber: '',
    userRole: 'passenger' as UserRole
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const { signUp } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        phone_number: formData.phoneNumber,
        user_role: formData.userRole
      })
      
      if (error) {
        setError(error.message)
      } else {
        // Redirect to OTP verification for email confirmation
        navigate(`/otp-verification?type=email_verification&email=${encodeURIComponent(formData.email)}`)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const roleFeatures = getRoleFeatures(t)
  const selectedRoleFeatures = roleFeatures[formData.userRole] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      <div className="w-full max-w-4xl relative">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            {t('registration.backToHome')}
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

          <div className="flex items-center justify-center gap-2 mb-2">
            <UserPlus className="h-4 w-4 text-green-400" />
            <span className="text-white/70 text-sm">{t('registration.joinRevolution')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registration Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-black/40 backdrop-blur-xl border-white/10 shadow-2xl">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-white">{t('auth.register')}</CardTitle>
                <CardDescription className="text-gray-400">
                  {t('auth.getStartedDescription')}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                      <AlertDescription className="text-red-400">{error}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="userRole" className="text-white">{t('auth.accountType')}</Label>
                    <Select
                      value={formData.userRole}
                      onValueChange={(value) => handleInputChange('userRole', value)}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white focus:border-blue-400/50 focus:ring-blue-400/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="passenger" className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            {t('auth.passenger')}
                          </div>
                        </SelectItem>
                        <SelectItem value="driver" className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            {t('auth.driver')}
                          </div>
                        </SelectItem>
                        <SelectItem value="merchant" className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                            {t('auth.merchant')}
                          </div>
                        </SelectItem>
                        <SelectItem value="event_admin" className="text-white hover:bg-white/10">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            {t('auth.eventAdmin')}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-white">{t('auth.fullName')}</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">{t('auth.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      required
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="text-white">{t('auth.phoneNumber')} ({t('common.optional')})</Label>
                    <Input
                      id="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder={t('auth.phoneNumberPlaceholder')}
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-400/50 focus:ring-blue-400/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">{t('auth.password')}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder={t('auth.createPasswordPlaceholder')}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-400/50 focus:ring-blue-400/20 pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-white">{t('auth.confirmPassword')}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        placeholder={t('auth.confirmPasswordPlaceholder')}
                        required
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-blue-400/50 focus:ring-blue-400/20 pr-12"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-400 hover:text-white"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 text-white py-6 text-lg font-semibold" 
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {t('auth.register')}
                  </Button>
                </form>
                
                <div className="text-center">
                  <div className="text-sm text-gray-400">
                    {t('auth.alreadyHaveAccount')}{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-semibold">
                      {t('auth.signInHere')}
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Features Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6"
          >
            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-400" />
                  {formData.userRole === 'passenger' && t('registration.personalAccountFeatures')}
                  {formData.userRole === 'driver' && t('registration.driverAccountFeatures')}
                  {formData.userRole === 'merchant' && t('registration.businessAccountFeatures')}
                  {formData.userRole === 'event_admin' && t('registration.eventOrganizerFeatures')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {selectedRoleFeatures.map((feature, index) => (
                    <motion.li
                      key={feature}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="flex items-center gap-3 text-gray-300"
                    >
                      <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                      {feature}
                    </motion.li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-black/40 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <h3 className="text-white font-semibold mb-4">{t('registration.whyChooseTickets')}</h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span>{t('registration.bankGradeSecurity')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>{t('registration.instantTransactions')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <span>{t('registration.customerSupport')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span>{t('registration.lowFees')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        
        {/* Trust indicators */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>{t('registration.soc2Certified')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>{t('registration.iso27001')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>{t('registration.pciCompliant')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}