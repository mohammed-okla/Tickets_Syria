import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { 
  Calendar,
  Ticket,
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  QrCode,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react'

interface EventStats {
  totalEvents: number
  activeEvents: number
  totalTicketsSold: number
  totalRevenue: number
  pendingValidations: number
  recentEvents: any[]
  recentTickets: any[]
}

export default function EventAdminHome() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  const [stats, setStats] = useState<EventStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    pendingValidations: 0,
    recentEvents: [],
    recentTickets: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [showRevenue, setShowRevenue] = useState(true)

  useEffect(() => {
    if (profile) {
      fetchEventStats()
    }
  }, [profile])

  const fetchEventStats = async () => {
    if (!profile) return

    try {
      setIsLoading(true)

      // Fetch events created by this event admin
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('created_by', profile.id)

      if (eventsError) throw eventsError

      // Fetch tickets for these events
      const eventIds = events?.map(e => e.id) || []
      const { data: tickets, error: ticketsError } = await supabase
        .from('user_tickets')
        .select(`
          *,
          events (
            title,
            ticket_price
          ),
          profiles (
            full_name
          )
        `)
        .in('event_id', eventIds)

      if (ticketsError) throw ticketsError

      // Calculate stats
      const totalEvents = events?.length || 0
      const activeEvents = events?.filter(e => 
        new Date(e.event_date) > new Date() && e.is_active
      ).length || 0
      
      const totalTicketsSold = tickets?.length || 0
      const totalRevenue = tickets?.reduce((sum, ticket) => 
        sum + (ticket.events?.ticket_price || 0), 0
      ) || 0
      
      const pendingValidations = tickets?.filter(t => 
        t.status === 'pending'
      ).length || 0

      // Get recent events (last 5)
      const recentEvents = events
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5) || []

      // Get recent tickets (last 5)
      const recentTickets = tickets
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5) || []

      setStats({
        totalEvents,
        activeEvents,
        totalTicketsSold,
        totalRevenue,
        pendingValidations,
        recentEvents,
        recentTickets
      })
    } catch (error) {
      console.error('Error fetching event stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'pending': return 'secondary'
      case 'used': return 'default'
      case 'cancelled': return 'destructive'
      default: return 'secondary'
    }
  }

  const getTicketStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'used': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
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
            {t('welcome')}, {profile?.full_name}
          </h1>
          <p className="text-muted-foreground">{t('eventAdminDashboardOverview')}</p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('createEvent')}
          </Button>
          <Button variant="outline">
            <QrCode className="h-4 w-4 mr-2" />
            {t('validateTickets')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalEvents')}</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeEvents} {t('activeEvents')}
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
              <CardTitle className="text-sm font-medium">{t('ticketsSold')}</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTicketsSold}</div>
              <p className="text-xs text-muted-foreground">
                +{stats.pendingValidations} {t('pendingValidation')}
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
                <TrendingUp className="h-3 w-3 inline mr-1" />
                {t('fromTicketSales')}
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
              <CardTitle className="text-sm font-medium">{t('pendingValidations')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingValidations}</div>
              <p className="text-xs text-muted-foreground">
                {t('requiresAttention')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle>{t('recentEvents')}</CardTitle>
            <CardDescription>{t('yourLatestEventActivities')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentEvents.length > 0 ? (
                stats.recentEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.event_date).toLocaleDateString(
                          language === 'ar' ? 'ar-SY' : 'en-US'
                        )}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={event.is_active ? 'default' : 'secondary'}>
                        {event.is_active ? t('active') : t('inactive')}
                      </Badge>
                      <span className="text-sm font-medium">
                        {formatCurrency(event.ticket_price)}
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  {t('noEventsYet')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Ticket Activity */}
        <Card>
          <CardHeader>
            <CardTitle>{t('recentTicketActivity')}</CardTitle>
            <CardDescription>{t('latestTicketPurchasesAndValidations')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentTickets.length > 0 ? (
                stats.recentTickets.map((ticket, index) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{ticket.events?.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {t('purchasedBy')} {ticket.profiles?.full_name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusColor(ticket.status)}>
                        <div className="flex items-center space-x-1">
                          {getTicketStatusIcon(ticket.status)}
                          <span>{t(ticket.status)}</span>
                        </div>
                      </Badge>
                    </div>
                  </motion.div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  {t('noTicketActivityYet')}
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
          <CardDescription>{t('commonTasksAndActions')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-auto p-4">
              <div className="flex flex-col items-center space-y-2">
                <Plus className="h-6 w-6" />
                <span>{t('createNewEvent')}</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="flex flex-col items-center space-y-2">
                <QrCode className="h-6 w-6" />
                <span>{t('validateTickets')}</span>
              </div>
            </Button>
            <Button variant="outline" className="h-auto p-4">
              <div className="flex flex-col items-center space-y-2">
                <TrendingUp className="h-6 w-6" />
                <span>{t('viewAnalytics')}</span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}