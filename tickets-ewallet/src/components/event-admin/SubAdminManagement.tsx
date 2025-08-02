import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Filter, 
  User,
  Users,
  Shield,
  ShieldCheck,
  Edit,
  Trash2,
  Eye,
  Settings,
  Mail,
  AlertTriangle,
  CheckCircle,
  XCircle,
  UserPlus,
  Crown,
  Key,
  Clock
} from 'lucide-react'

interface Event {
  id: string
  title: string
  category: string
  start_date: string
  location: string
  is_active: boolean
}

interface UserProfile {
  id: string
  full_name: string
  email: string
  user_type: string
  is_active: boolean
  is_verified: boolean
}

interface EventAdmin {
  id: string
  event_id: string
  user_id: string
  assigned_by: string
  role: 'admin' | 'moderator' | 'validator'
  permissions: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  user?: UserProfile
  event?: Event
  assigned_by_user?: UserProfile
}

const adminRoles = [
  {
    value: 'admin',
    label: 'Admin',
    description: 'Full access to event management',
    icon: Crown,
    color: 'text-yellow-600'
  },
  {
    value: 'moderator',
    label: 'Moderator',
    description: 'Can manage tickets and validate entries',
    icon: Shield,
    color: 'text-blue-600'
  },
  {
    value: 'validator',
    label: 'Validator',
    description: 'Can only validate QR codes',
    icon: ShieldCheck,
    color: 'text-green-600'
  }
]

const availablePermissions = [
  { id: 'view_tickets', label: 'View Tickets', description: 'Can view ticket sales and details' },
  { id: 'validate_qr', label: 'Validate QR Codes', description: 'Can scan and validate ticket QR codes' },
  { id: 'manage_refunds', label: 'Manage Refunds', description: 'Can process ticket refunds' },
  { id: 'view_analytics', label: 'View Analytics', description: 'Can access event analytics and reports' },
  { id: 'manage_event', label: 'Manage Event', description: 'Can edit event details and settings' },
  { id: 'manage_admins', label: 'Manage Sub-admins', description: 'Can add/remove other sub-admins' },
  { id: 'export_data', label: 'Export Data', description: 'Can export reports and attendee data' },
  { id: 'send_notifications', label: 'Send Notifications', description: 'Can send notifications to attendees' }
]

const rolePermissions = {
  admin: ['view_tickets', 'validate_qr', 'manage_refunds', 'view_analytics', 'manage_event', 'manage_admins', 'export_data', 'send_notifications'],
  moderator: ['view_tickets', 'validate_qr', 'manage_refunds', 'view_analytics', 'export_data'],
  validator: ['view_tickets', 'validate_qr']
}

export default function SubAdminManagement() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  
  // State management
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [eventAdmins, setEventAdmins] = useState<EventAdmin[]>([])
  const [filteredAdmins, setFilteredAdmins] = useState<EventAdmin[]>([])
  const [searchUsers, setSearchUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<EventAdmin | null>(null)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  
  // Form data state
  const [formData, setFormData] = useState({
    user_id: '',
    role: 'validator' as 'admin' | 'moderator' | 'validator',
    permissions: [] as string[],
    is_active: true
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchEventAdmins()
    }
  }, [selectedEvent])

  useEffect(() => {
    filterAdmins()
  }, [eventAdmins, searchQuery, roleFilter, statusFilter])

  useEffect(() => {
    // Set default permissions when role changes
    if (formData.role) {
      setFormData(prev => ({
        ...prev,
        permissions: rolePermissions[prev.role] || []
      }))
    }
  }, [formData.role])

  useEffect(() => {
    if (userSearchQuery.length >= 2) {
      searchForUsers()
    } else {
      setSearchUsers([])
    }
  }, [userSearchQuery])

  const fetchEvents = async () => {
    if (!profile) return
    
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('events')
        .select('id, title, category, start_date, location, is_active')
        .eq('created_by', profile.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error(t('errorFetchingEvents'))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEventAdmins = async () => {
    if (!selectedEvent) return

    try {
      const { data, error } = await supabase
        .from('event_admins')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            email,
            user_type,
            is_active,
            is_verified
          ),
          events:event_id (
            id,
            title,
            category,
            start_date,
            location,
            is_active
          ),
          assigned_by_profiles:assigned_by (
            full_name,
            email
          )
        `)
        .eq('event_id', selectedEvent)
        .order('created_at', { ascending: false })

      if (error) throw error

      const adminsWithDetails = (data || []).map(admin => ({
        ...admin,
        user: admin.profiles,
        event: admin.events,
        assigned_by_user: admin.assigned_by_profiles
      }))

      setEventAdmins(adminsWithDetails)
    } catch (error) {
      console.error('Error fetching event admins:', error)
      toast.error('Error fetching event admins')
    }
  }

  const searchForUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, is_active, is_verified')
        .or(`full_name.ilike.%${userSearchQuery}%,email.ilike.%${userSearchQuery}%`)
        .eq('is_active', true)
        .limit(10)

      if (error) throw error

      // Filter out users who are already admins for this event
      const existingAdminUserIds = eventAdmins.map(admin => admin.user_id)
      const filteredUsers = (data || []).filter(user => 
        !existingAdminUserIds.includes(user.id) && user.id !== profile?.id
      )

      setSearchUsers(filteredUsers)
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const filterAdmins = () => {
    let filtered = eventAdmins

    if (searchQuery) {
      filtered = filtered.filter(admin =>
        admin.user?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(admin => admin.role === roleFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(admin => admin.is_active)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(admin => !admin.is_active)
      }
    }

    setFilteredAdmins(filtered)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }))
  }

  const handleSubmit = async () => {
    if (!profile || !selectedEvent) return

    try {
      if (!formData.user_id) {
        toast.error(t('selectUser'))
        return
      }

      const adminData = {
        event_id: selectedEvent,
        user_id: formData.user_id,
        assigned_by: profile.id,
        role: formData.role,
        permissions: formData.permissions,
        is_active: formData.is_active
      }

      let result
      if (editingAdmin) {
        result = await supabase
          .from('event_admins')
          .update(adminData)
          .eq('id', editingAdmin.id)
          .select()
      } else {
        result = await supabase
          .from('event_admins')
          .insert(adminData)
          .select()
      }

      if (result.error) throw result.error

      toast.success(editingAdmin ? t('adminUpdated') : t('adminAdded'))
      setIsCreateDialogOpen(false)
      setEditingAdmin(null)
      resetForm()
      fetchEventAdmins()
    } catch (error) {
      console.error('Error saving admin:', error)
      toast.error(t('errorSavingAdmin'))
    }
  }

  const handleEdit = (admin: EventAdmin) => {
    setEditingAdmin(admin)
    setFormData({
      user_id: admin.user_id,
      role: admin.role,
      permissions: admin.permissions || [],
      is_active: admin.is_active
    })
    setIsCreateDialogOpen(true)
  }

  const handleDelete = async (adminId: string) => {
    if (!confirm(t('confirmRemoveAdmin'))) return

    try {
      const { error } = await supabase
        .from('event_admins')
        .delete()
        .eq('id', adminId)

      if (error) throw error

      toast.success(t('adminRemoved'))
      fetchEventAdmins()
    } catch (error) {
      console.error('Error removing admin:', error)
      toast.error(t('errorRemovingAdmin'))
    }
  }

  const toggleAdminStatus = async (admin: EventAdmin) => {
    try {
      const { error } = await supabase
        .from('event_admins')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id)

      if (error) throw error

      toast.success(t('adminStatusUpdated'))
      fetchEventAdmins()
    } catch (error) {
      console.error('Error updating admin status:', error)
      toast.error(t('errorUpdatingAdmin'))
    }
  }

  const resetForm = () => {
    setFormData({
      user_id: '',
      role: 'validator',
      permissions: rolePermissions.validator,
      is_active: true
    })
    setUserSearchQuery('')
    setSearchUsers([])
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(
      language === 'ar' ? 'ar-SY' : 'en-US'
    )
  }

  const getRoleColor = (role: string) => {
    const roleConfig = adminRoles.find(r => r.value === role)
    return roleConfig?.color || 'text-gray-600'
  }

  const getRoleIcon = (role: string) => {
    const roleConfig = adminRoles.find(r => r.value === role)
    const IconComponent = roleConfig?.icon || User
    return <IconComponent className={`h-4 w-4 ${getRoleColor(role)}`} />
  }

  const getStatusColor = (admin: EventAdmin) => {
    if (!admin.is_active) return 'secondary'
    if (!admin.user?.is_verified) return 'outline'
    return 'default'
  }

  const getStatusText = (admin: EventAdmin) => {
    if (!admin.is_active) return t('inactive')
    if (!admin.user?.is_verified) return t('unverified')
    return t('active')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('subAdminManagement')}</h1>
          <p className="text-muted-foreground">{t('manageEventAdministrators')}</p>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectEvent')}</CardTitle>
          <CardDescription>
            {t('chooseEventToManageAdmins')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>{t('event')}</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger>
                <SelectValue placeholder={t('selectEvent')} />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    <div className="flex items-center space-x-2">
                      <span>{event.title}</span>
                      <span className="text-muted-foreground text-sm">
                        ({new Date(event.start_date).toLocaleDateString()})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedEvent && (
        <>
          {/* Admin Management */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{t('eventAdministrators')}</h2>
              <p className="text-muted-foreground">{t('manageTeamAccess')}</p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetForm(); setEditingAdmin(null) }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('addAdmin')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingAdmin ? t('editAdmin') : t('addNewAdmin')}
                  </DialogTitle>
                  <DialogDescription>
                    {editingAdmin ? t('updateAdminDetails') : t('assignUserAsAdmin')}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6">
                  {/* User Selection */}
                  {!editingAdmin && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('searchUser')}</Label>
                        <Input
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          placeholder={t('searchByNameOrEmail')}
                        />
                      </div>
                      
                      {searchUsers.length > 0 && (
                        <div className="space-y-2">
                          <Label>{t('selectUser')}</Label>
                          <div className="border rounded-lg max-h-40 overflow-y-auto">
                            {searchUsers.map(user => (
                              <div
                                key={user.id}
                                className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 ${
                                  formData.user_id === user.id ? 'bg-primary/10' : ''
                                }`}
                                onClick={() => handleInputChange('user_id', user.id)}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">{user.full_name}</p>
                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline">{user.user_type}</Badge>
                                    {user.is_verified && (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {userSearchQuery.length >= 2 && searchUsers.length === 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            {t('noUsersFound')}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}

                  {/* Role Selection */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>{t('role')}</Label>
                      <Select 
                        value={formData.role} 
                        onValueChange={(value: any) => handleInputChange('role', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {adminRoles.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              <div className="flex items-center space-x-2">
                                {React.createElement(role.icon, { 
                                  className: `h-4 w-4 ${role.color}` 
                                })}
                                <div>
                                  <div className="font-medium">{t(role.label.toLowerCase())}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {t(role.description)}
                                  </div>
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Role Description */}
                    <Alert>
                      <Key className="h-4 w-4" />
                      <AlertDescription>
                        {t(adminRoles.find(r => r.value === formData.role)?.description || '')}
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Permissions */}
                  <div className="space-y-4">
                    <div>
                      <Label>{t('permissions')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('customizeAccessPermissions')}
                      </p>
                    </div>
                    
                    <div className="grid gap-3">
                      {availablePermissions.map(permission => (
                        <div key={permission.id} className="flex items-start space-x-3">
                          <Checkbox
                            id={permission.id}
                            checked={formData.permissions.includes(permission.id)}
                            onCheckedChange={(checked) => 
                              handlePermissionChange(permission.id, !!checked)
                            }
                          />
                          <div className="grid gap-1.5 leading-none">
                            <Label 
                              htmlFor={permission.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {t(permission.label)}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              {t(permission.description)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active">{t('adminActive')}</Label>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t('cancel')}
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!editingAdmin && !formData.user_id}
                  >
                    {editingAdmin ? t('updateAdmin') : t('addAdmin')}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('searchAdmins')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('filterByRole')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allRoles')}</SelectItem>
                    {adminRoles.map(role => (
                      <SelectItem key={role.value} value={role.value}>
                        {t(role.label.toLowerCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={t('filterByStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allStatuses')}</SelectItem>
                    <SelectItem value="active">{t('active')}</SelectItem>
                    <SelectItem value="inactive">{t('inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Admins Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('adminsList')}</CardTitle>
              <CardDescription>
                {t('totalAdmins')}: {filteredAdmins.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAdmins.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('admin')}</TableHead>
                        <TableHead>{t('role')}</TableHead>
                        <TableHead>{t('permissions')}</TableHead>
                        <TableHead>{t('assignedBy')}</TableHead>
                        <TableHead>{t('status')}</TableHead>
                        <TableHead>{t('assignedAt')}</TableHead>
                        <TableHead className="text-right">{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAdmins.map((admin, index) => (
                        <motion.tr
                          key={admin.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium">{admin.user?.full_name}</p>
                                {admin.user?.is_verified && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {admin.user?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getRoleIcon(admin.role)}
                              <Badge variant="outline">
                                {t(admin.role)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {admin.permissions?.slice(0, 3).map(permission => (
                                <Badge key={permission} variant="secondary" className="text-xs">
                                  {t(permission.replace('_', ' '))}
                                </Badge>
                              ))}
                              {admin.permissions && admin.permissions.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{admin.permissions.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {admin.assigned_by_user?.full_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {admin.assigned_by_user?.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(admin)}>
                              {getStatusText(admin)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {formatDateTime(admin.created_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(admin)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleAdminStatus(admin)}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(admin.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">{t('noAdminsFound')}</h3>
                  <p className="text-muted-foreground">{t('addYourFirstAdmin')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}