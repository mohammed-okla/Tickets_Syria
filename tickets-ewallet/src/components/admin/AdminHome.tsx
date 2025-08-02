import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { 
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Activity,
  CreditCard,
  Ticket,
  Building,
  Shield,
  Settings,
  Eye,
  EyeOff,
  Calendar,
  Crown,
  UserCheck,
  Zap,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Award,
  Layers
} from 'lucide-react'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalTransactions: number
  totalRevenue: number
  pendingDisputes: number
  systemUptime: number
  recentUsers: any[]
  recentTransactions: any[]
  usersByType: {
    passengers: number
    drivers: number
    merchants: number
    eventAdmins: number
  }
}

interface EventStats {
  totalEvents: number
  activeEvents: number
  totalTicketsSold: number
  eventRevenue: number
  recentEvents: any[]
  eventAdminPerformance: any[]
  withdrawalRequests: any[]
  topPerformingEvents: any[]
}

export default function AdminHome() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingDisputes: 0,
    systemUptime: 99.9,
    recentUsers: [],
    recentTransactions: [],
    usersByType: {
      passengers: 0,
      drivers: 0,
      merchants: 0,
      eventAdmins: 0
    }
  })
  
  const [eventStats, setEventStats] = useState<EventStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalTicketsSold: 0,
    eventRevenue: 0,
    recentEvents: [],
    eventAdminPerformance: [],
    withdrawalRequests: [],
    topPerformingEvents: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showRevenue, setShowRevenue] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchSystemStats()
      fetchEventStats()
    }
  }, [profile])

  const fetchSystemStats = async () => {
    try {
      setIsLoading(true)

      // Fetch users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          from_profile:profiles!transactions_from_user_id_fkey (
            full_name
          ),
          to_profile:profiles!transactions_to_user_id_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (transactionsError) throw transactionsError

      // Fetch disputes
      const { data: disputes, error: disputesError } = await supabase
        .from('disputes')
        .select('*')
        .eq('status', 'open')

      if (disputesError) throw disputesError

      // Calculate stats
      const totalUsers = users?.length || 0
      const activeUsers = users?.filter(u => u.is_active).length || 0
      const totalTransactions = transactions?.length || 0
      const totalRevenue = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0

      // Count users by type
      const usersByType = {
        passengers: users?.filter(u => u.user_type === 'passenger').length || 0,
        drivers: users?.filter(u => u.user_type === 'driver').length || 0,
        merchants: users?.filter(u => u.user_type === 'merchant').length || 0,
        eventAdmins: users?.filter(u => u.user_type === 'event_admin').length || 0
      }

      // Get recent users (last 5)
      const recentUsers = users?.slice(0, 5) || []

      setStats({
        totalUsers,
        activeUsers,
        totalTransactions,
        totalRevenue,
        pendingDisputes: disputes?.length || 0,
        systemUptime: 99.9, // Mock data
        recentUsers,
        recentTransactions: transactions?.slice(0, 5) || [],
        usersByType
      })
    } catch (error) {
      console.error('Error fetching system stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchEventStats = async () => {
    try {
      // Fetch events with creator info
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          creator:profiles!events_created_by_fkey (
            full_name,
            user_type
          )
        `)
        .order('created_at', { ascending: false })

      if (eventsError) throw eventsError

      // Fetch tickets sold
      const { data: tickets, error: ticketsError } = await supabase
        .from('user_tickets')
        .select(`
          *,
          event:events (
            title,
            created_by
          )
        `)

      if (ticketsError) throw ticketsError

      // Fetch withdrawal requests
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          user:profiles (
            full_name,
            user_type
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (withdrawalsError) throw withdrawalsError

      // Calculate event stats
      const totalEvents = events?.length || 0
      const activeEvents = events?.filter(e => e.is_active).length || 0
      const totalTicketsSold = tickets?.length || 0
      const eventRevenue = tickets?.reduce((sum, t) => sum + (t.event_details_snapshot?.price || 0), 0) || 0

      // Calculate event admin performance
      const eventAdminPerformance = events
        ?.filter(e => e.creator?.user_type === 'event_admin')
        .map(event => {
          const eventTickets = tickets?.filter(t => t.event_id === event.id) || []
          const revenue = eventTickets.reduce((sum, t) => sum + (t.event_details_snapshot?.price || 0), 0)
          return {
            adminName: event.creator?.full_name,
            eventTitle: event.title,
            ticketsSold: eventTickets.length,
            revenue,
            eventStatus: event.is_active ? 'Active' : 'Inactive',
            createdAt: event.created_at
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10) || []

      // Top performing events
      const topPerformingEvents = events
        ?.map(event => {
          const eventTickets = tickets?.filter(t => t.event_id === event.id) || []
          const revenue = eventTickets.reduce((sum, t) => sum + (t.event_details_snapshot?.price || 0), 0)
          return {
            ...event,
            ticketsSold: eventTickets.length,
            revenue
          }
        })
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5) || []

      setEventStats({
        totalEvents,
        activeEvents,
        totalTicketsSold,
        eventRevenue,
        recentEvents: events?.slice(0, 5) || [],
        eventAdminPerformance,
        withdrawalRequests: withdrawals || [],
        topPerformingEvents
      })
    } catch (error) {
      console.error('Error fetching event stats:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'passenger': return 'default'
      case 'driver': return 'secondary'
      case 'merchant': return 'outline'
      case 'event_admin': return 'destructive'
      case 'admin': return 'destructive'
      default: return 'secondary'
    }
  }

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'pending': return 'secondary'
      case 'failed': return 'destructive'
      case 'cancelled': return 'outline'
      default: return 'secondary'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('systemDashboard')}
          </h1>
          <p className="text-muted-foreground">{t('systemOverviewAndManagement')}</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            {t('systemSettings')}
          </Button>
          <Button variant="outline">
            <Shield className="h-4 w-4 mr-2" />
            {t('securityPanel')}
          </Button>
        </div>
      </div>

      {/* System Status Alert */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">{t('systemOperational')}</span>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                {stats.systemUptime}% {t('uptime')}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Ticket className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">{eventStats.totalEvents} Events</span>
              </div>
              <div className="flex items-center space-x-1">
                <Crown className="h-4 w-4 text-purple-600" />
                <span className="text-purple-800">{stats.usersByType.eventAdmins} Event Admins</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="events">Event Management</TabsTrigger>
          <TabsTrigger value="performance">Performance & Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeUsers} {t('activeUsers')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalTransactions')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {t('systemVolume')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalRevenue')}</CardTitle>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => setShowRevenue(!showRevenue)}
                >
                  {showRevenue ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {showRevenue ? formatCurrency(stats.totalRevenue) : '••••••'}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('systemRevenue')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('pendingIssues')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingDisputes}</div>
              <p className="text-xs text-muted-foreground">
                {t('requiresAttention')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
          </div>

          {/* User Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>{t('userDistribution')}</CardTitle>
              <CardDescription>{t('usersByAccountType')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.usersByType.passengers}</div>
                  <p className="text-sm text-muted-foreground">{t('passengers')}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.usersByType.drivers}</div>
                  <p className="text-sm text-muted-foreground">{t('drivers')}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.usersByType.merchants}</div>
                  <p className="text-sm text-muted-foreground">{t('merchants')}</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.usersByType.eventAdmins}</div>
                  <p className="text-sm text-muted-foreground">{t('eventAdmins')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Users */}
            <Card>
              <CardHeader>
                <CardTitle>{t('recentUsers')}</CardTitle>
                <CardDescription>{t('latestRegistrations')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentUsers.length > 0 ? (
                    stats.recentUsers.map((user, index) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{user.full_name}</h4>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getUserTypeColor(user.user_type)}>
                            {t(user.user_type)}
                          </Badge>
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? t('active') : t('inactive')}
                          </Badge>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {t('noRecentUsers')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('recentTransactions')}</CardTitle>
                <CardDescription>{t('latestSystemActivity')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentTransactions.length > 0 ? (
                    stats.recentTransactions.map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">
                            {transaction.from_profile?.full_name} → {transaction.to_profile?.full_name}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {t(transaction.transaction_type)} • {transaction.payment_method}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getTransactionStatusColor(transaction.status)}>
                            {t(transaction.status)}
                          </Badge>
                          <span className="text-sm font-medium">
                            {formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      {t('noRecentTransactions')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
              <CardDescription>{t('commonAdministrativeTasks')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Button variant="outline" className="h-auto p-4">
                  <div className="flex flex-col items-center space-y-2">
                    <Users className="h-6 w-6" />
                    <span>{t('manageUsers')}</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4">
                  <div className="flex flex-col items-center space-y-2">
                    <TrendingUp className="h-6 w-6" />
                    <span>{t('systemAnalytics')}</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4">
                  <div className="flex flex-col items-center space-y-2">
                    <AlertTriangle className="h-6 w-6" />
                    <span>{t('handleDisputes')}</span>
                  </div>
                </Button>
                <Button variant="outline" className="h-auto p-4">
                  <div className="flex flex-col items-center space-y-2">
                    <Settings className="h-6 w-6" />
                    <span>{t('systemConfig')}</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Management Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Event Overview Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{eventStats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">
                  {eventStats.activeEvents} active events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{eventStats.totalTicketsSold}</div>
                <p className="text-xs text-muted-foreground">
                  Across all events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Event Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(eventStats.eventRevenue)}</div>
                <p className="text-xs text-muted-foreground">
                  Total event earnings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Withdrawals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{eventStats.withdrawalRequests.length}</div>
                <p className="text-xs text-muted-foreground">
                  Requiring approval
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Performing Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performing Events
                </CardTitle>
                <CardDescription>Events ranked by revenue and ticket sales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventStats.topPerformingEvents.length > 0 ? (
                    eventStats.topPerformingEvents.map((event, index) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <h4 className="font-medium">{event.title}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {event.ticketsSold} tickets • {event.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(event.revenue)}</p>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No events found
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Pending Withdrawal Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Withdrawals
                </CardTitle>
                <CardDescription>Withdrawal requests awaiting approval</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {eventStats.withdrawalRequests.length > 0 ? (
                    eventStats.withdrawalRequests.slice(0, 5).map((request, index) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{request.user?.full_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {request.user?.user_type} • {request.payment_method?.type}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(request.amount)}</p>
                          <Badge variant="secondary" className="text-xs">
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No pending withdrawals
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance & Analytics Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Event Admin Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Event Admin Performance
              </CardTitle>
              <CardDescription>Track event admin performance and revenue generation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventStats.eventAdminPerformance.length > 0 ? (
                  eventStats.eventAdminPerformance.map((admin, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{admin.adminName}</h4>
                            <p className="text-sm text-muted-foreground">{admin.eventTitle}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <p className="text-lg font-bold">{admin.ticketsSold}</p>
                          <p className="text-xs text-muted-foreground">Tickets</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold">{formatCurrency(admin.revenue)}</p>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                        </div>
                        <div>
                          <Badge variant={admin.eventStatus === 'Active' ? 'default' : 'secondary'}>
                            {admin.eventStatus}
                          </Badge>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No event admin performance data</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* System Performance Metrics */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Performance
                </CardTitle>
                <CardDescription>Key system performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>User Engagement</span>
                    <span>{Math.round((stats.activeUsers / stats.totalUsers) * 100)}%</span>
                  </div>
                  <Progress value={(stats.activeUsers / stats.totalUsers) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Event Success Rate</span>
                    <span>{Math.round((eventStats.activeEvents / eventStats.totalEvents) * 100)}%</span>
                  </div>
                  <Progress value={(eventStats.activeEvents / eventStats.totalEvents) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>System Uptime</span>
                    <span>{stats.systemUptime}%</span>
                  </div>
                  <Progress value={stats.systemUptime} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Management Actions
                </CardTitle>
                <CardDescription>Administrative controls and oversight</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  <Button variant="outline" className="justify-start">
                    <Crown className="h-4 w-4 mr-2" />
                    Manage Event Admins
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Layers className="h-4 w-4 mr-2" />
                    Event Oversight
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Withdrawals
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Handle Disputes ({stats.pendingDisputes})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}