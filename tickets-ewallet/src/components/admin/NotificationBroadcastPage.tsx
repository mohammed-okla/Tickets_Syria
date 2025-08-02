import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotifications } from '@/contexts/NotificationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { 
  NotificationType, 
  NotificationPriority, 
  UserProfile,
  NotificationTemplate
} from '@/lib/types'
import { 
  Send, 
  Users, 
  Filter, 
  Search, 
  Plus,
  Edit,
  Trash2,
  Copy,
  Save,
  Megaphone,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { toast } from 'sonner'

interface BroadcastForm {
  title: string
  message: string
  type: NotificationType
  priority: NotificationPriority
  action_url?: string
  action_label?: string
  target_roles: string[]
  target_users: string[]
  schedule_at?: string
  expires_at?: string
}

interface UserFilter {
  role?: string
  is_verified?: boolean
  is_active?: boolean
  search?: string
}

const NotificationBroadcastPage: React.FC = () => {
  const { createNotification } = useNotifications()
  const { language } = useLanguage()

  // State
  const [form, setForm] = useState<BroadcastForm>({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    target_roles: [],
    target_users: []
  })
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [userFilter, setUserFilter] = useState<UserFilter>({})
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch users and templates
  useEffect(() => {
    fetchUsers()
    fetchTemplates()
  }, [])

  // Filter users
  useEffect(() => {
    let filtered = users

    if (userFilter.role) {
      filtered = filtered.filter(user => user.role === userFilter.role)
    }
    if (userFilter.is_verified !== undefined) {
      filtered = filtered.filter(user => user.is_verified === userFilter.is_verified)
    }
    if (userFilter.is_active !== undefined) {
      filtered = filtered.filter(user => user.is_active === userFilter.is_active)
    }
    if (userFilter.search) {
      const search = userFilter.search.toLowerCase()
      filtered = filtered.filter(user => 
        user.full_name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      )
    }

    setFilteredUsers(filtered)
  }, [users, userFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name')

      if (error) {
        console.error('Error fetching users:', error)
        toast.error('Failed to load users')
        return
      }

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching templates:', error)
        return
      }

      setTemplates(data || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setForm(prev => ({
        ...prev,
        title: template.title_template,
        message: template.message_template,
        type: template.type,
        priority: template.priority,
        action_url: template.action_url_template,
        action_label: template.action_label
      }))
      setSelectedTemplate(templateId)
    }
  }

  // Handle role selection
  const handleRoleToggle = (role: string) => {
    setForm(prev => ({
      ...prev,
      target_roles: prev.target_roles.includes(role)
        ? prev.target_roles.filter(r => r !== role)
        : [...prev.target_roles, role]
    }))
  }

  // Handle user selection
  const handleUserToggle = (userId: string) => {
    setForm(prev => ({
      ...prev,
      target_users: prev.target_users.includes(userId)
        ? prev.target_users.filter(u => u !== userId)
        : [...prev.target_users, userId]
    }))
  }

  // Handle select all users
  const handleSelectAllUsers = () => {
    const allUserIds = filteredUsers.map(u => u.id)
    setForm(prev => ({
      ...prev,
      target_users: prev.target_users.length === allUserIds.length ? [] : allUserIds
    }))
  }

  // Get target user IDs
  const getTargetUserIds = (): string[] => {
    let targetIds = [...form.target_users]

    // Add users by role
    if (form.target_roles.length > 0) {
      const roleUsers = users.filter(user => form.target_roles.includes(user.role))
      targetIds = [...targetIds, ...roleUsers.map(u => u.id)]
    }

    // Remove duplicates
    return [...new Set(targetIds)]
  }

  // Send notification
  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Please fill in title and message')
      return
    }

    const targetUserIds = getTargetUserIds()
    if (targetUserIds.length === 0) {
      toast.error('Please select at least one recipient')
      return
    }

    setSending(true)
    try {
      const success = await createNotification({
        user_ids: targetUserIds,
        title: form.title,
        message: form.message,
        type: form.type,
        priority: form.priority,
        action_url: form.action_url,
        action_label: form.action_label
      })

      if (success) {
        toast.success(`Notification sent to ${targetUserIds.length} users`)
        // Reset form
        setForm({
          title: '',
          message: '',
          type: 'info',
          priority: 'normal',
          target_roles: [],
          target_users: []
        })
        setSelectedTemplate('')
      }
    } catch (error) {
      console.error('Error sending notification:', error)
      toast.error('Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  // Save as template
  const handleSaveTemplate = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Please fill in title and message')
      return
    }

    const templateName = prompt('Enter template name:')
    if (!templateName) return

    try {
      const { error } = await supabase
        .from('notification_templates')
        .insert({
          name: templateName,
          title_template: form.title,
          message_template: form.message,
          type: form.type,
          priority: form.priority,
          action_url_template: form.action_url,
          action_label: form.action_label,
          variables: [],
          created_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (error) {
        console.error('Error saving template:', error)
        toast.error('Failed to save template')
        return
      }

      toast.success('Template saved successfully')
      fetchTemplates()
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Failed to save template')
    }
  }

  const targetUserIds = getTargetUserIds()

  // Texts
  const texts = {
    en: {
      title: 'Broadcast Notifications',
      description: 'Send notifications to multiple users',
      compose: 'Compose',
      templates: 'Templates',
      recipients: 'Recipients',
      preview: 'Preview',
      notificationTitle: 'Notification Title',
      notificationMessage: 'Message Content',
      type: 'Type',
      priority: 'Priority',
      actionUrl: 'Action URL (optional)',
      actionLabel: 'Action Button Label',
      targetRoles: 'Target User Roles',
      targetUsers: 'Specific Users',
      searchUsers: 'Search users...',
      selectAll: 'Select All',
      selected: 'selected',
      sendNotification: 'Send Notification',
      saveTemplate: 'Save as Template',
      loadTemplate: 'Load Template',
      sending: 'Sending...',
      noTemplates: 'No templates available',
      noUsers: 'No users found',
      scheduledFor: 'Schedule for later',
      expiresAt: 'Expires at'
    },
    ar: {
      title: 'بث الإشعارات',
      description: 'إرسال إشعارات لعدة مستخدمين',
      compose: 'إنشاء',
      templates: 'القوالب',
      recipients: 'المستلمون',
      preview: 'معاينة',
      notificationTitle: 'عنوان الإشعار',
      notificationMessage: 'محتوى الرسالة',
      type: 'النوع',
      priority: 'الأولوية',
      actionUrl: 'رابط الإجراء (اختياري)',
      actionLabel: 'تسمية زر الإجراء',
      targetRoles: 'أدوار المستخدمين المستهدفة',
      targetUsers: 'مستخدمون محددون',
      searchUsers: 'البحث في المستخدمين...',
      selectAll: 'تحديد الكل',
      selected: 'محدد',
      sendNotification: 'إرسال الإشعار',
      saveTemplate: 'حفظ كقالب',
      loadTemplate: 'تحميل القالب',
      sending: 'جارٍ الإرسال...',
      noTemplates: 'لا توجد قوالب متاحة',
      noUsers: 'لم يتم العثور على مستخدمين',
      scheduledFor: 'جدولة لوقت لاحق',
      expiresAt: 'ينتهي في'
    }
  }

  const t = texts[language]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6" />
          {t.title}
        </h1>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Section */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="compose" className="space-y-4">
            <TabsList>
              <TabsTrigger value="compose">{t.compose}</TabsTrigger>
              <TabsTrigger value="templates">{t.templates}</TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t.compose}</CardTitle>
                  <CardDescription>Create and send a notification</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Title */}
                  <div>
                    <Label htmlFor="title">{t.notificationTitle}</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter notification title..."
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <Label htmlFor="message">{t.notificationMessage}</Label>
                    <Textarea
                      id="message"
                      value={form.message}
                      onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Enter notification message..."
                      rows={4}
                    />
                  </div>

                  {/* Type and Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{t.type}</Label>
                      <Select 
                        value={form.type} 
                        onValueChange={(value: NotificationType) => 
                          setForm(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="ticket">Ticket</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t.priority}</Label>
                      <Select 
                        value={form.priority} 
                        onValueChange={(value: NotificationPriority) => 
                          setForm(prev => ({ ...prev, priority: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Action URL and Label */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="actionUrl">{t.actionUrl}</Label>
                      <Input
                        id="actionUrl"
                        value={form.action_url || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, action_url: e.target.value }))}
                        placeholder="/dashboard/tickets"
                      />
                    </div>

                    <div>
                      <Label htmlFor="actionLabel">{t.actionLabel}</Label>
                      <Input
                        id="actionLabel"
                        value={form.action_label || ''}
                        onChange={(e) => setForm(prev => ({ ...prev, action_label: e.target.value }))}
                        placeholder="View Details"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleSaveTemplate}>
                      <Save className="h-4 w-4 mr-2" />
                      {t.saveTemplate}
                    </Button>

                    <Button 
                      onClick={handleSend} 
                      disabled={sending || targetUserIds.length === 0}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? t.sending : t.sendNotification}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t.templates}</CardTitle>
                  <CardDescription>Load from saved templates</CardDescription>
                </CardHeader>
                <CardContent>
                  {templates.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {t.noTemplates}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <motion.div
                          key={template.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedTemplate === template.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => handleTemplateSelect(template.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">{template.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {template.title_template}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {template.type}
                              </Badge>
                              <Badge variant="outline">
                                {template.priority}
                              </Badge>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Recipients Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t.recipients}
              </CardTitle>
              <CardDescription>
                {targetUserIds.length} users selected
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Role Selection */}
              <div>
                <Label>{t.targetRoles}</Label>
                <div className="space-y-2 mt-2">
                  {['passenger', 'driver', 'merchant', 'event_admin'].map((role) => (
                    <div key={role} className="flex items-center space-x-2">
                      <Checkbox
                        id={role}
                        checked={form.target_roles.includes(role)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label htmlFor={role} className="capitalize">
                        {role.replace('_', ' ')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* User Search */}
              <div>
                <Label>{t.targetUsers}</Label>
                <div className="space-y-2 mt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t.searchUsers}
                      value={userFilter.search || ''}
                      onChange={(e) => setUserFilter(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllUsers}
                    >
                      {t.selectAll} ({filteredUsers.length})
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {form.target_users.length} {t.selected}
                    </span>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                      >
                        <Checkbox
                          checked={form.target_users.includes(user.id)}
                          onCheckedChange={() => handleUserToggle(user.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {(form.title || form.message) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  {t.preview}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {form.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                      {form.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                      {form.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                      {!['success', 'warning', 'error'].includes(form.type) && <Info className="h-5 w-5 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm">{form.title || 'Notification Title'}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {form.message || 'Notification message will appear here...'}
                      </p>
                      {form.action_label && (
                        <Button size="sm" variant="link" className="h-auto p-0 mt-2">
                          {form.action_label}
                        </Button>
                      )}
                    </div>
                    <Badge 
                      variant={form.priority === 'urgent' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {form.priority}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotificationBroadcastPage