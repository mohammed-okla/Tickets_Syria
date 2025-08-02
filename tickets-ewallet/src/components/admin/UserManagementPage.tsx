import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  Download,
  RefreshCw,
  MoreHorizontal,
  Settings,
  Crown,
  Car,
  Store,
  Ticket,
  UserPlus,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'

// User interface
interface User {
  id: string
  full_name: string
  email: string
  phone_number?: string
  user_type: 'passenger' | 'driver' | 'merchant' | 'event_admin' | 'admin'
  is_active: boolean
  is_verified: boolean
  language_preference: 'en' | 'ar'
  avatar_url?: string
  created_at: string
  updated_at: string
  // Computed fields
  wallet_balance?: number
  total_transactions?: number
  last_login?: string
  verification_status?: string
}

// User statistics interface
interface UserStats {
  total_users: number
  active_users: number
  verified_users: number
  new_this_month: number
  by_role: Record<string, number>
  by_status: Record<string, number>
}

const userRoles = [
  { value: 'passenger', label: 'Passenger', icon: Users, color: 'bg-blue-500' },
  { value: 'driver', label: 'Driver', icon: Car, color: 'bg-green-500' },
  { value: 'merchant', label: 'Merchant', icon: Store, color: 'bg-purple-500' },
  { value: 'event_admin', label: 'Event Admin', icon: Ticket, color: 'bg-orange-500' },
  { value: 'admin', label: 'Admin', icon: Crown, color: 'bg-red-500' }
]

export default function UserManagementPage() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  
  // State management
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [verificationFilter, setVerificationFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  // Form data state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    user_type: 'passenger',
    is_active: true,
    language_preference: 'en'
  })

  useEffect(() => {
    fetchUsers()
    fetchUserStats()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, roleFilter, statusFilter, verificationFilter])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          wallets (
            balance
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process users with additional data
      const usersWithStats = await Promise.all(
        (data || []).map(async (user) => {
          // Get transaction count
          const { count: transactionCount } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)

          return {
            ...user,
            wallet_balance: user.wallets?.[0]?.balance || 0,
            total_transactions: transactionCount || 0
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error(t('errorFetchingUsers'))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, is_active, is_verified, created_at')

      if (error) throw error

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const stats: UserStats = {
        total_users: data.length,
        active_users: data.filter(u => u.is_active).length,
        verified_users: data.filter(u => u.is_verified).length,
        new_this_month: data.filter(u => new Date(u.created_at) >= startOfMonth).length,
        by_role: {},
        by_status: {
          active: data.filter(u => u.is_active).length,
          inactive: data.filter(u => !u.is_active).length,
          verified: data.filter(u => u.is_verified).length,
          unverified: data.filter(u => !u.is_verified).length
        }
      }

      // Calculate by role
      userRoles.forEach(role => {
        stats.by_role[role.value] = data.filter(u => u.user_type === role.value).length
      })

      setUserStats(stats)
    } catch (error) {
      console.error('Error fetching user stats:', error)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.phone_number && user.phone_number.includes(searchQuery))
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.user_type === roleFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.is_active)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => !user.is_active)
      }
    }

    if (verificationFilter !== 'all') {
      if (verificationFilter === 'verified') {
        filtered = filtered.filter(user => user.is_verified)
      } else if (verificationFilter === 'unverified') {
        filtered = filtered.filter(user => !user.is_verified)
      }
    }

    setFilteredUsers(filtered)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleUserSelect = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(userId)
      } else {
        newSet.delete(userId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)))
    } else {
      setSelectedUsers(new Set())
    }
  }

  const toggleUserStatus = async (userId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(t('userStatusUpdated'))
      fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error(t('errorUpdatingUser'))
    }
  }

  const toggleUserVerification = async (userId: string, newStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: newStatus })
        .eq('id', userId)

      if (error) throw error

      toast.success(t('userVerificationUpdated'))
      fetchUsers()
    } catch (error) {
      console.error('Error updating user verification:', error)
      toast.error(t('errorUpdatingUser'))
    }
  }

  const changeUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success(t('userRoleUpdated'))
      fetchUsers()
    } catch (error) {
      console.error('Error updating user role:', error)
      toast.error(t('errorUpdatingUser'))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.size === 0) {
      toast.error(t('selectUsersFirst'))
      return
    }

    try {
      const userIds = Array.from(selectedUsers)
      let updateData: any = {}

      switch (action) {
        case 'activate':
          updateData = { is_active: true }
          break
        case 'deactivate':
          updateData = { is_active: false }
          break
        case 'verify':
          updateData = { is_verified: true }
          break
        case 'unverify':
          updateData = { is_verified: false }
          break
        default:
          return
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .in('id', userIds)

      if (error) throw error

      toast.success(t('bulkActionCompleted'))
      setSelectedUsers(new Set())
      fetchUsers()
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast.error(t('errorPerformingBulkAction'))
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === 'ar' ? 'ar-SY' : 'en-US'
    )
  }

  const getRoleConfig = (role: string) => {
    return userRoles.find(r => r.value === role) || userRoles[0]
  }

  const getStatusBadge = (user: User) => {
    if (!user.is_active) {
      return <Badge variant="destructive">Inactive</Badge>
    }
    if (!user.is_verified) {
      return <Badge variant="secondary">Unverified</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('userManagement')}</h1>
          <p className="text-muted-foreground">{t('manageAllSystemUsers')}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('refresh')}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {userStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{userStats.total_users}</div>
                  <p className="text-sm text-muted-foreground">{t('totalUsers')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold">{userStats.active_users}</div>
                  <p className="text-sm text-muted-foreground">{t('activeUsers')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="h-8 w-8 text-purple-500" />
                <div>
                  <div className="text-2xl font-bold">{userStats.verified_users}</div>
                  <p className="text-sm text-muted-foreground">{t('verifiedUsers')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-8 w-8 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{userStats.new_this_month}</div>
                  <p className="text-sm text-muted-foreground">{t('newThisMonth')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('searchUsers')}
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
                  {userRoles.map(role => (
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
              <Select value={verificationFilter} onValueChange={setVerificationFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('filterByVerification')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allVerification')}</SelectItem>
                  <SelectItem value="verified">{t('verified')}</SelectItem>
                  <SelectItem value="unverified">{t('unverified')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">
                  {selectedUsers.size} {t('usersSelected')}
                </span>
                <div className="flex space-x-2 ml-auto">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
                    <UserCheck className="h-4 w-4 mr-1" />
                    {t('activate')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')}>
                    <UserX className="h-4 w-4 mr-1" />
                    {t('deactivate')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('verify')}>
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    {t('verify')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('unverify')}>
                    <Shield className="h-4 w-4 mr-1" />
                    {t('unverify')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('users')}</CardTitle>
          <CardDescription>
            {t('manageUserAccountsAndPermissions')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>{t('user')}</TableHead>
                    <TableHead>{t('role')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('wallet')}</TableHead>
                    <TableHead>{t('joined')}</TableHead>
                    <TableHead className="w-24">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {filteredUsers.map((user, index) => {
                      const roleConfig = getRoleConfig(user.user_type)
                      const IconComponent = roleConfig.icon
                      
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={(checked) => handleUserSelect(user.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.full_name}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="h-4 w-4" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium">{user.full_name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                {user.phone_number && (
                                  <div className="text-xs text-muted-foreground">{user.phone_number}</div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${roleConfig.color}`} />
                              <IconComponent className="h-4 w-4" />
                              <span>{t(roleConfig.label.toLowerCase())}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getStatusBadge(user)}
                              {user.is_verified && (
                                <div className="flex items-center space-x-1 text-xs text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>{t('verified')}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {formatCurrency(user.wallet_balance || 0)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.total_transactions || 0} {t('transactions')}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(user.created_at)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleUserStatus(user.id, !user.is_active)}
                                title={user.is_active ? t('deactivate') : t('activate')}
                              >
                                {user.is_active ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleUserVerification(user.id, !user.is_verified)}
                                title={user.is_verified ? t('unverify') : t('verify')}
                              >
                                {user.is_verified ? (
                                  <Shield className="h-4 w-4" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4" />
                                )}
                              </Button>
                              <Select
                                value={user.user_type}
                                onValueChange={(newRole) => changeUserRole(user.id, newRole)}
                              >
                                <SelectTrigger className="w-auto h-8 text-xs">
                                  <Settings className="h-3 w-3" />
                                </SelectTrigger>
                                <SelectContent>
                                  {userRoles.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                      <div className="flex items-center space-x-2">
                                        <role.icon className="h-4 w-4" />
                                        <span>{t(role.label.toLowerCase())}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">{t('noUsersFound')}</h3>
              <p className="text-muted-foreground">{t('adjustFiltersToSeeUsers')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}