import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Wallet,
  QrCode,
  Plus,
  TrendingUp,
  TrendingDown,
  Calendar,
  Ticket,
  ArrowRight,
  Eye,
  EyeOff,
  CreditCard,
  MapPin,
  Clock,
  DollarSign
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'

interface WalletData {
  balance: number
  currency: string
  is_frozen: boolean
}

interface RecentTransaction {
  id: string
  from_user_id?: string
  to_user_id?: string
  amount: number
  transaction_type: string
  status: string
  description: string
  created_at: string
  from_user_name?: string
  to_user_name?: string
}

interface UpcomingEvent {
  id: string
  title: string
  start_date: string
  location: string
  price: number
  image_url: string
}

interface UserTicket {
  id: string
  ticket_number: string
  event_details_snapshot: any
  status: string
  purchased_at: string
}

export default function PassengerHome() {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [userTickets, setUserTickets] = useState<UserTicket[]>([])
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  
  const { profile } = useAuth()
  const { t, isRTL } = useLanguage()

  useEffect(() => {
    if (profile) {
      fetchDashboardData()
    }
  }, [profile])

  const fetchDashboardData = async () => {
    try {
      // Fetch wallet data
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', profile?.id)
        .single()

      if (wallet) {
        setWalletData(wallet)
      }

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          from_profile:profiles!transactions_from_user_id_fkey(full_name),
          to_profile:profiles!transactions_to_user_id_fkey(full_name)
        `)
        .or(`from_user_id.eq.${profile?.id},to_user_id.eq.${profile?.id}`)
        .order('created_at', { ascending: false })
        .limit(5)

      if (transactions) {
        const formattedTransactions = transactions.map(t => ({
          ...t,
          from_user_name: t.from_profile?.full_name,
          to_user_name: t.to_profile?.full_name
        }))
        setRecentTransactions(formattedTransactions)
      }

      // Fetch upcoming events
      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(3)

      if (events) {
        setUpcomingEvents(events)
      }

      // Fetch user tickets
      const { data: tickets } = await supabase
        .from('user_tickets')
        .select('*')
        .eq('user_id', profile?.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false })
        .limit(3)

      if (tickets) {
        setUserTickets(tickets)
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SY' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (type: string, isOutgoing: boolean) => {
    if (type === 'recharge') return <Plus className="h-4 w-4 text-green-600" />
    if (isOutgoing) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <TrendingUp className="h-4 w-4 text-green-600" />
  }

  const QuickActions = () => (
    <div className="grid grid-cols-2 gap-4">
      <Link to="/passenger/scanner">
        <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="rounded-full bg-primary/10 p-3 mb-3">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-medium text-center">{t('scanner.title')}</h3>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Pay with QR code
            </p>
          </CardContent>
        </Card>
      </Link>

      <Link to="/passenger/wallet">
        <Card className="cursor-pointer transition-all hover:shadow-md hover:scale-105">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="rounded-full bg-green-500/10 p-3 mb-3">
              <Plus className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-medium text-center">{t('wallet.recharge')}</h3>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Add money to wallet
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  )

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4 lg:p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {t('app.welcome')}, {profile?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-muted-foreground">
              {new Date().toLocaleDateString(isRTL ? 'ar-SY' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <Badge variant="outline" className="hidden sm:flex">
            {t('auth.passenger')}
          </Badge>
        </div>
      </motion.div>

      {/* Wallet Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                <span className="font-medium">{t('wallet.title')}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => setBalanceVisible(!balanceVisible)}
              >
                {balanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm opacity-90">{t('wallet.balance')}</p>
              <p className="text-3xl font-bold">
                {balanceVisible ? formatCurrency(walletData?.balance || 0) : '••••••'}
              </p>
              {walletData?.is_frozen && (
                <Badge variant="destructive" className="mt-2">
                  Account Frozen
                </Badge>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Link to="/passenger/wallet" className="flex-1">
                <Button variant="secondary" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('wallet.recharge')}
                </Button>
              </Link>
              <Link to="/passenger/transactions" className="flex-1">
                <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  History
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <QuickActions />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{t('transactions.recent')}</CardTitle>
              <Link to="/passenger/transactions">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => {
                  const isOutgoing = transaction.from_user_id === profile?.id
                  const otherParty = isOutgoing ? transaction.to_user_name : transaction.from_user_name
                  
                  return (
                    <div key={transaction.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(transaction.transaction_type, isOutgoing)}
                        <div>
                          <p className="font-medium text-sm">
                            {transaction.description || `${isOutgoing ? 'Payment to' : 'Payment from'} ${otherParty}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium text-sm ${
                          isOutgoing ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isOutgoing ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </p>
                        <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {transaction.status}
                        </Badge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{t('events.upcoming')}</CardTitle>
              <Link to="/passenger/events">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{event.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">{formatCurrency(event.price || 0)}</p>
                      <Link to={`/passenger/events`}>
                        <Button size="sm" variant="outline" className="mt-1">
                          Buy
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No upcoming events</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* My Tickets */}
      {userTickets.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">{t('nav.tickets')}</CardTitle>
              <Link to="/passenger/tickets">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {userTickets.map((ticket) => (
                  <div key={ticket.id} className="p-4 rounded-lg border bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">#{ticket.ticket_number.slice(-6)}</span>
                    </div>
                    <h4 className="font-medium text-sm mb-1">{ticket.event_details_snapshot?.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ticket.purchased_at)}
                    </p>
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}