import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Bell, 
  Globe, 
  Shield, 
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  CreditCard,
  Moon,
  Sun
} from 'lucide-react'

export default function SettingsPage() {
  const { profile } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const [isLoading, setIsLoading] = useState(false)
  const [showBalance, setShowBalance] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    transactions: true,
    marketing: false,
    security: true
  })

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showOnlineStatus: true,
    allowDataCollection: false
  })

  const handleNotificationChange = (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
    toast.success(t('settingUpdated'))
  }

  const handlePrivacyChange = (key: string, value: any) => {
    setPrivacy(prev => ({ ...prev, [key]: value }))
    toast.success(t('settingUpdated'))
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as 'en' | 'ar')
    toast.success(t('languageChanged'))
  }

  const handleExportData = () => {
    toast.info(t('dataExportStarted'))
  }

  const handleDeleteAccount = () => {
    toast.error(t('featureNotAvailable'))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings')}</h1>
        <p className="text-muted-foreground">{t('manageYourAppPreferences')}</p>
      </div>

      <div className="grid gap-6">
        {/* Language & Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>{t('languageAndAppearance')}</span>
            </CardTitle>
            <CardDescription>{t('customizeYourAppExperience')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('language')}</Label>
                <Select value={language} onValueChange={handleLanguageChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label>{t('darkMode')}</Label>
                  <p className="text-sm text-muted-foreground">{t('toggleDarkMode')}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4" />
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                  />
                  <Moon className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label>{t('showWalletBalance')}</Label>
                <p className="text-sm text-muted-foreground">{t('displayBalanceInDashboard')}</p>
              </div>
              <div className="flex items-center space-x-2">
                <EyeOff className="h-4 w-4" />
                <Switch
                  checked={showBalance}
                  onCheckedChange={setShowBalance}
                />
                <Eye className="h-4 w-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>{t('notifications')}</span>
            </CardTitle>
            <CardDescription>{t('controlWhenAndHowYouReceiveNotifications')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{t('emailNotifications')}</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">{t('receiveEmailUpdates')}</p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(value) => handleNotificationChange('email', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>{t('pushNotifications')}</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">{t('receivePushNotifications')}</p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(value) => handleNotificationChange('push', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('smsNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">{t('receiveSmsUpdates')}</p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(value) => handleNotificationChange('sms', value)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <CreditCard className="h-4 w-4" />
                    <span>{t('transactionNotifications')}</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">{t('notifyOnTransactions')}</p>
                </div>
                <Switch
                  checked={notifications.transactions}
                  onCheckedChange={(value) => handleNotificationChange('transactions', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('marketingNotifications')}</Label>
                  <p className="text-sm text-muted-foreground">{t('receivePromotionalEmails')}</p>
                </div>
                <Switch
                  checked={notifications.marketing}
                  onCheckedChange={(value) => handleNotificationChange('marketing', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>{t('securityNotifications')}</span>
                  </Label>
                  <p className="text-sm text-muted-foreground">{t('notifyOnSecurityEvents')}</p>
                </div>
                <Switch
                  checked={notifications.security}
                  onCheckedChange={(value) => handleNotificationChange('security', value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>{t('privacyAndSecurity')}</span>
            </CardTitle>
            <CardDescription>{t('controlYourDataAndPrivacy')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('profileVisibility')}</Label>
                <Select 
                  value={privacy.profileVisibility} 
                  onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{t('public')}</SelectItem>
                    <SelectItem value="private">{t('private')}</SelectItem>
                    <SelectItem value="contacts">{t('contactsOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('showOnlineStatus')}</Label>
                  <p className="text-sm text-muted-foreground">{t('letOthersKnowWhenYouAreOnline')}</p>
                </div>
                <Switch
                  checked={privacy.showOnlineStatus}
                  onCheckedChange={(value) => handlePrivacyChange('showOnlineStatus', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('allowDataCollection')}</Label>
                  <p className="text-sm text-muted-foreground">{t('helpImproveAppBySharing')}</p>
                </div>
                <Switch
                  checked={privacy.allowDataCollection}
                  onCheckedChange={(value) => handlePrivacyChange('allowDataCollection', value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Management */}
        <Card>
          <CardHeader>
            <CardTitle>{t('accountManagement')}</CardTitle>
            <CardDescription>{t('manageYourAccountDataAndSettings')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" onClick={handleExportData}>
                {t('exportMyData')}
              </Button>
              <Button variant="outline">
                {t('changePassword')}
              </Button>
              <Button variant="outline">
                {t('twoFactorAuth')}
              </Button>
              <Button variant="outline">
                {t('connectedAccounts')}
              </Button>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-destructive">{t('dangerZone')}</Label>
              <p className="text-sm text-muted-foreground">{t('irreversibleActions')}</p>
              <div className="flex space-x-2">
                <Button variant="destructive" onClick={handleDeleteAccount}>
                  {t('deleteAccount')}
                </Button>
                <Button variant="outline">
                  {t('deactivateAccount')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('appInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('version')}</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('lastUpdate')}</span>
              <span>{new Date().toLocaleDateString(language === 'ar' ? 'ar-SY' : 'en-US')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('buildNumber')}</span>
              <span>1.0.0-beta</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}