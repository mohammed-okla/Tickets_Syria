import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  Edit,
  Save,
  X,
  Camera
} from 'lucide-react'

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone_number: profile?.phone_number || '',
    language_preference: profile?.language_preference || 'en'
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!profile) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone_number: formData.phone_number,
          language_preference: formData.language_preference,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)

      if (error) throw error

      // Update language if changed
      if (formData.language_preference !== language) {
        setLanguage(formData.language_preference as 'en' | 'ar')
      }

      await refreshProfile()
      setIsEditing(false)
      toast.success(t('profileUpdated'))
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(t('errorUpdatingProfile'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || '',
      language_preference: profile?.language_preference || 'en'
    })
    setIsEditing(false)
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      passenger: t('passenger'),
      driver: t('driver'),
      merchant: t('merchant'),
      event_admin: t('eventAdmin'),
      admin: t('systemAdmin')
    }
    return roleNames[role as keyof typeof roleNames] || role
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  if (!profile) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('profile')}</h1>
          <p className="text-muted-foreground">{t('manageYourAccountInformation')}</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            {t('editProfile')}
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Picture Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('profilePicture')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="text-lg">
                  {getUserInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {t('clickToUploadNewPicture')}
            </p>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-lg">{t('personalInformation')}</CardTitle>
              <CardDescription>{t('updateYourPersonalDetails')}</CardDescription>
            </div>
            {isEditing && (
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleSave} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {t('save')}
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  {t('cancel')}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('fullName')}</Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.full_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">{t('phoneNumber')}</Label>
                {isEditing ? (
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.phone_number || t('notProvided')}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('email')}</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('language')}</Label>
                {isEditing ? (
                  <Select
                    value={formData.language_preference}
                    onValueChange={(value) => handleInputChange('language_preference', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{profile.language_preference === 'ar' ? 'العربية' : 'English'}</span>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('accountType')}</Label>
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">
                    {getRoleDisplayName(profile.user_type)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('memberSince')}</Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(profile.created_at).toLocaleDateString(
                      language === 'ar' ? 'ar-SY' : 'en-US'
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('verificationStatus')}</Label>
                <Badge variant={profile.is_verified ? "default" : "secondary"}>
                  {profile.is_verified ? t('verified') : t('unverified')}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>{t('accountStatus')}</Label>
                <Badge variant={profile.is_active ? "default" : "destructive"}>
                  {profile.is_active ? t('active') : t('inactive')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accountActions')}</CardTitle>
          <CardDescription>{t('manageYourAccountSecurity')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">
              {t('changePassword')}
            </Button>
            <Button variant="outline">
              {t('downloadData')}
            </Button>
            <Button variant="outline">
              {t('twoFactorAuth')}
            </Button>
            <Button variant="destructive" disabled>
              {t('deleteAccount')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}