import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// import {
//   Calendar,
//   DateRange,
//   DayPicker
// } from 'react-day-picker'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  History,
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  MoreHorizontal,
  CalendarIcon,
  CreditCard,
  Car,
  Store,
  Ticket,
  RefreshCw,
  ArrowUpDown,
  Eye,
  ExternalLink,
  Receipt,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { toast } from 'sonner'
import TransactionReceipt from '@/components/receipts/TransactionReceipt'

interface DateRange {
  from?: Date
  to?: Date
}

interface Transaction {
  id: string
  from_user_id?: string
  to_user_id?: string
  amount: number
  currency: string
  transaction_type: 'payment' | 'recharge' | 'refund' | 'withdrawal'
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  description?: string
  reference_id?: string
  qr_code_id?: string
  trip_id?: string
  created_at: string
  completed_at?: string
  from_user_name?: string
  to_user_name?: string
}

interface TransactionStats {
  totalIncoming: number
  totalOutgoing: number
  totalTransactions: number
  pendingCount: number
  thisMonthTotal: number
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [receiptTransaction, setReceiptTransaction] = useState<Transaction | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  
  const { profile } = useAuth()
  const { t, isRTL } = useLanguage()
  
  const PAGE_SIZE = 20

  useEffect(() => {
    if (profile) {
      fetchTransactions()
      calculateStats()
    }
  }, [profile])

  useEffect(() => {
    applyFilters()
  }, [transactions, searchQuery, typeFilter, statusFilter, dateRange, sortBy, sortOrder])

  const fetchTransactions = async (pageNum = 1, append = false) => {
    try {
      setLoading(pageNum === 1)
      
      let query = supabase
        .from('transactions')
        .select(`
          *,
          from_profile:profiles!transactions_from_user_id_fkey(full_name),
          to_profile:profiles!transactions_to_user_id_fkey(full_name)
        `)
        .or(`from_user_id.eq.${profile?.id},to_user_id.eq.${profile?.id}`)
        .order('created_at', { ascending: false })
        .range((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE - 1)

      const { data, error } = await query

      if (error) throw error

      if (data) {
        const formattedTransactions = data.map(t => ({
          ...t,
          from_user_name: t.from_profile?.full_name,
          to_user_name: t.to_profile?.full_name
        }))

        if (append) {
          setTransactions(prev => [...prev, ...formattedTransactions])
        } else {
          setTransactions(formattedTransactions)
        }
        
        setHasMore(data.length === PAGE_SIZE)
        setPage(pageNum)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = async () => {
    try {
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('*')
        .or(`from_user_id.eq.${profile?.id},to_user_id.eq.${profile?.id}`)

      if (allTransactions) {
        const incoming = allTransactions
          .filter(t => t.to_user_id === profile?.id && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0)
        
        const outgoing = allTransactions
          .filter(t => t.from_user_id === profile?.id && t.status === 'completed')
          .reduce((sum, t) => sum + t.amount, 0)

        const pending = allTransactions.filter(t => t.status === 'pending').length

        const thisMonth = new Date()
        thisMonth.setDate(1)
        const thisMonthTransactions = allTransactions
          .filter(t => new Date(t.created_at) >= thisMonth && t.status === 'completed')
          .reduce((sum, t) => sum + (t.to_user_id === profile?.id ? t.amount : -t.amount), 0)

        setStats({
          totalIncoming: incoming,
          totalOutgoing: outgoing,
          totalTransactions: allTransactions.length,
          pendingCount: pending,
          thisMonthTotal: thisMonthTransactions
        })
      }
    } catch (error) {
      console.error('Error calculating stats:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...transactions]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(query) ||
        t.from_user_name?.toLowerCase().includes(query) ||
        t.to_user_name?.toLowerCase().includes(query) ||
        t.id.toLowerCase().includes(query)
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === typeFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(t => t.status === statusFilter)
    }

    // Date range filter
    if (dateRange?.from && dateRange?.to) {
      filtered = filtered.filter(t => {
        const transactionDate = new Date(t.created_at)
        return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!
      })
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount
      }
    })

    setFilteredTransactions(filtered)
  }

  const loadMore = () => {
    if (hasMore && !loading) {
      fetchTransactions(page + 1, true)
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionIcon = (transaction: Transaction) => {
    const isOutgoing = transaction.from_user_id === profile?.id
    
    switch (transaction.transaction_type) {
      case 'recharge':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'payment':
        if (transaction.qr_code_id) {
          return <Car className="h-4 w-4 text-blue-600" />
        }
        return isOutgoing ? 
          <TrendingDown className="h-4 w-4 text-red-600" /> : 
          <TrendingUp className="h-4 w-4 text-green-600" />
      case 'refund':
        return <RefreshCw className="h-4 w-4 text-blue-600" />
      case 'withdrawal':
        return <Minus className="h-4 w-4 text-red-600" />
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">Completed</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTransactionDirection = (transaction: Transaction) => {
    const isOutgoing = transaction.from_user_id === profile?.id
    return isOutgoing ? 'outgoing' : 'incoming'
  }

  const getTransactionTitle = (transaction: Transaction) => {
    const isOutgoing = transaction.from_user_id === profile?.id
    
    if (transaction.description) {
      return transaction.description
    }

    switch (transaction.transaction_type) {
      case 'recharge':
        return 'Wallet Recharge'
      case 'payment':
        if (transaction.qr_code_id) {
          return isOutgoing ? 'Transport Payment' : 'Transport Fare Received'
        }
        return isOutgoing ? 'Payment Sent' : 'Payment Received'
      case 'refund':
        return 'Refund'
      case 'withdrawal':
        return 'Withdrawal'
      default:
        return 'Transaction'
    }
  }

  const exportTransactions = () => {
    // Create CSV content
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Reference']
    const rows = filteredTransactions.map(t => [
      formatDate(t.created_at),
      t.transaction_type,
      getTransactionTitle(t),
      `${getTransactionDirection(t) === 'incoming' ? '+' : '-'}${t.amount}`,
      t.status,
      t.id
    ])

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading && page === 1) {
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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">{t('transactions.title')}</h1>
          <p className="text-muted-foreground">View and manage your transaction history</p>
        </div>
        
        <Button onClick={exportTransactions} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </motion.div>

      {/* Stats Cards */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Incoming</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(stats.totalIncoming)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <span className="text-sm text-muted-foreground">Outgoing</span>
              </div>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(stats.totalOutgoing)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-xl font-bold">
                {stats.totalTransactions}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-muted-foreground">This Month</span>
              </div>
              <p className={`text-xl font-bold ${stats.thisMonthTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(stats.thisMonthTotal))}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search transactions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                    <SelectItem value="recharge">Recharges</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'date' | 'amount')}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Transactions List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Transactions ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length > 0 ? (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => {
                  const isOutgoing = getTransactionDirection(transaction) === 'outgoing'
                  const otherParty = isOutgoing ? transaction.to_user_name : transaction.from_user_name
                  
                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <div className="flex items-center gap-4">
                        {getTransactionIcon(transaction)}
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">
                            {getTransactionTitle(transaction)}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(transaction.created_at)}</span>
                            {otherParty && (
                              <>
                                <span>•</span>
                                <span>{isOutgoing ? 'To' : 'From'}: {otherParty}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-2">
                        <p className={`font-medium text-sm ${
                          isOutgoing ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {isOutgoing ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  )
                })}

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={loading}
                      className="gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No transactions found</p>
                <p className="text-sm">Try adjusting your filters or make your first transaction</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Transaction Detail Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={(open) => !open && setSelectedTransaction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              Complete information about this transaction
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {getTransactionIcon(selectedTransaction)}
                <div>
                  <h3 className="font-medium">{getTransactionTitle(selectedTransaction)}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedTransaction.created_at)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className={`font-medium ${
                    getTransactionDirection(selectedTransaction) === 'outgoing' ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {getTransactionDirection(selectedTransaction) === 'outgoing' ? '-' : '+'}
                    {formatCurrency(selectedTransaction.amount)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedTransaction.status)}
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{selectedTransaction.transaction_type}</span>
                </div>

                {selectedTransaction.reference_id && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Reference:</span>
                    <span className="font-mono text-sm">{selectedTransaction.reference_id}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-xs">{selectedTransaction.id}</span>
                </div>

                {selectedTransaction.completed_at && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Completed:</span>
                    <span className="text-sm">{formatDate(selectedTransaction.completed_at)}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    setReceiptTransaction(selectedTransaction)
                    setReceiptOpen(true)
                  }}
                  className="w-full gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  View Receipt
                </Button>
                
                {selectedTransaction.status === 'completed' && (
                  <Button 
                    variant="outline" 
                    onClick={() => setDisputeOpen(true)}
                    className="w-full gap-2 text-red-600 hover:text-red-700"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Report Issue
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction Receipt */}
      <TransactionReceipt
        transaction={receiptTransaction}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        userProfile={profile || undefined}
      />

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Report Transaction Issue
            </DialogTitle>
            <DialogDescription>
              Describe the issue you're experiencing with this transaction
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="issue-type">Issue Type</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unauthorized">Unauthorized Transaction</SelectItem>
                  <SelectItem value="wrong-amount">Wrong Amount Charged</SelectItem>
                  <SelectItem value="service-not-received">Service Not Received</SelectItem>
                  <SelectItem value="duplicate">Duplicate Charge</SelectItem>
                  <SelectItem value="technical">Technical Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full p-3 border rounded-lg resize-none h-24"
                placeholder="Please describe the issue in detail..."
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDisputeOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={() => {
                // Handle dispute submission
                toast.success('Issue reported successfully. Our support team will contact you soon.')
                setDisputeOpen(false)
              }}>
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}