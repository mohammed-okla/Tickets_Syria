import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wallet,
  Plus,
  History,
  CreditCard,
  Smartphone,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  Clock,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface WalletData {
  id: string
  balance: number
  currency: string
  is_frozen: boolean
  created_at: string
  updated_at: string
}

interface Transaction {
  id: string
  amount: number
  transaction_type: string
  status: string
  description: string
  created_at: string
  from_user_id?: string
  to_user_id?: string
}

interface PaymentMethod {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  minAmount: number
  maxAmount: number
  fees: number
  available: boolean
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'mtn_cash',
    name: 'MTN Cash',
    icon: Smartphone,
    description: 'Pay using MTN Cash mobile wallet',
    minAmount: 1000,
    maxAmount: 500000,
    fees: 0,
    available: true
  },
  {
    id: 'syriatel_cash',
    name: 'Syriatel Cash',
    icon: Smartphone,
    description: 'Pay using Syriatel Cash mobile wallet',
    minAmount: 1000,
    maxAmount: 500000,
    fees: 0,
    available: true
  },
  {
    id: 'sham_cash',
    name: 'ShamCash',
    icon: Smartphone,
    description: 'Pay using ShamCash mobile wallet',
    minAmount: 1000,
    maxAmount: 300000,
    fees: 0,
    available: true
  },
  {
    id: 'fatora',
    name: 'Fatora',
    icon: CreditCard,
    description: 'Pay using Fatora payment gateway',
    minAmount: 500,
    maxAmount: 1000000,
    fees: 25,
    available: true
  },
  {
    id: 'stripe',
    name: 'Credit Card',
    icon: CreditCard,
    description: 'International credit/debit cards via Stripe',
    minAmount: 1000,
    maxAmount: 2000000,
    fees: 50,
    available: false // Not available yet as mentioned by user
  }
]

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [loading, setLoading] = useState(true)
  const [recharging, setRecharging] = useState(false)
  
  const { profile } = useAuth()
  const { t, isRTL } = useLanguage()

  useEffect(() => {
    if (profile) {
      fetchWalletData()
      fetchTransactions()
    }
  }, [profile])

  const fetchWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', profile?.id)
        .single()

      if (error) throw error
      setWalletData(data)
    } catch (error) {
      console.error('Error fetching wallet data:', error)
      toast.error('Failed to load wallet data')
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`from_user_id.eq.${profile?.id},to_user_id.eq.${profile?.id}`)
        .in('transaction_type', ['recharge', 'withdrawal'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const handleRecharge = async () => {
    if (!selectedPaymentMethod || !rechargeAmount) return

    const amount = parseFloat(rechargeAmount)
    const method = paymentMethods.find(m => m.id === selectedPaymentMethod)
    
    if (!method) return

    if (amount < method.minAmount || amount > method.maxAmount) {
      toast.error(`Amount must be between ${formatCurrency(method.minAmount)} and ${formatCurrency(method.maxAmount)}`)
      return
    }

    setRecharging(true)

    try {
      // Simulate payment processing since gateways are not available
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Call the Supabase function to handle recharge
      const { data, error } = await supabase.rpc('handle_recharge', {
        p_user_id: profile?.id,
        p_amount: amount,
        p_provider_type: method.name
      })

      if (error) throw error

      if (data && data.length > 0) {
        const result = data[0]
        if (result.error_message) {
          toast.error(result.error_message)
        } else {
          toast.success(t('wallet.rechargeSuccess'))
          setRechargeDialogOpen(false)
          setRechargeAmount('')
          setSelectedPaymentMethod('')
          fetchWalletData()
          fetchTransactions()
        }
      }
    } catch (error) {
      console.error('Error processing recharge:', error)
      toast.error('Failed to process recharge')
    } finally {
      setRecharging(false)
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

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return <Clock className="h-4 w-4 text-yellow-500" />
    if (status === 'failed') return <X className="h-4 w-4 text-red-500" />
    if (type === 'recharge') return <TrendingUp className="h-4 w-4 text-green-500" />
    return <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">{t('transactions.completed')}</Badge>
      case 'pending':
        return <Badge variant="secondary">{t('transactions.pending')}</Badge>
      case 'failed':
        return <Badge variant="destructive">{t('transactions.failed')}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">{t('wallet.title')}</h1>
          <p className="text-muted-foreground">Manage your digital wallet and transactions</p>
        </div>
        
        <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('wallet.recharge')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('wallet.recharge')}</DialogTitle>
              <DialogDescription>
                Add money to your wallet using various payment methods
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">{t('wallet.rechargeAmount')}</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="Enter amount"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('wallet.paymentMethod')}</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem 
                        key={method.id} 
                        value={method.id}
                        disabled={!method.available}
                      >
                        <div className="flex items-center gap-2">
                          <method.icon className="h-4 w-4" />
                          <span>{method.name}</span>
                          {!method.available && (
                            <Badge variant="secondary" className="text-xs">Soon</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPaymentMethod && (
                <Card>
                  <CardContent className="p-4">
                    {(() => {
                      const method = paymentMethods.find(m => m.id === selectedPaymentMethod)
                      return method ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{method.name}</p>
                          <p className="text-xs text-muted-foreground">{method.description}</p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Min: {formatCurrency(method.minAmount)}</span>
                            <span>Max: {formatCurrency(method.maxAmount)}</span>
                          </div>
                          {method.fees > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Processing fee: {formatCurrency(method.fees)}
                            </p>
                          )}
                        </div>
                      ) : null
                    })()}
                  </CardContent>
                </Card>
              )}

              <Button 
                onClick={handleRecharge} 
                disabled={!selectedPaymentMethod || !rechargeAmount || recharging}
                className="w-full"
              >
                {recharging ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-current" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Recharge {rechargeAmount && formatCurrency(parseFloat(rechargeAmount))}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Wallet Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="relative overflow-hidden">
          <Card className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white border-0 shadow-2xl">
            <CardContent className="p-8 relative z-10">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full transform translate-x-16 -translate-y-16" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full transform -translate-x-12 translate-y-12" />
                <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-white rounded-full transform -translate-x-8 -translate-y-8" />
              </div>
              
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{t('wallet.balance')}</h3>
                    <p className="text-sm opacity-75">Main Wallet</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-xl transition-all duration-200"
                  onClick={() => setBalanceVisible(!balanceVisible)}
                >
                  {balanceVisible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </Button>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <motion.p 
                    className="text-5xl font-bold tracking-tight"
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {balanceVisible ? formatCurrency(walletData?.balance || 0) : '••••••'}
                  </motion.p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-75">{walletData?.currency || 'SYP'}</span>
                    <div className="h-1 w-1 bg-white/50 rounded-full" />
                    <span className="text-sm opacity-75">Syrian Pound</span>
                  </div>
                </div>

                {walletData?.is_frozen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 border border-red-500/30 rounded-xl p-4"
                  >
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-red-200">
                        Your wallet is currently frozen. Contact support for assistance.
                      </span>
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/20">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-sm font-medium">Active</span>
                  </div>
                  <span className="text-xs opacity-75">
                    Updated {formatDate(walletData?.updated_at || '')}
                  </span>
                </div>
              </div>
            </CardContent>
            
            {/* Animated Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-purple-600/20 animate-pulse" />
          </Card>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300"
              onClick={() => setRechargeDialogOpen(true)}
            >
              <CardContent className="p-6 text-center space-y-2">
                <div className="p-3 bg-green-500 text-white rounded-xl w-fit mx-auto">
                  <Plus className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-green-700">Add Money</h4>
                <p className="text-xs text-green-600">Top up your wallet</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="cursor-not-allowed bg-gray-50 border-gray-200 opacity-50">
              <CardContent className="p-6 text-center space-y-2">
                <div className="p-3 bg-gray-400 text-white rounded-xl w-fit mx-auto">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-gray-600">Withdraw</h4>
                <p className="text-xs text-gray-500">Coming soon</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="cursor-not-allowed bg-gray-50 border-gray-200 opacity-50">
              <CardContent className="p-6 text-center space-y-2">
                <div className="p-3 bg-gray-400 text-white rounded-xl w-fit mx-auto">
                  <Zap className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-gray-600">Auto-reload</h4>
                <p className="text-xs text-gray-500">Coming soon</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="cursor-not-allowed bg-gray-50 border-gray-200 opacity-50">
              <CardContent className="p-6 text-center space-y-2">
                <div className="p-3 bg-gray-400 text-white rounded-xl w-fit mx-auto">
                  <Shield className="h-6 w-6" />
                </div>
                <h4 className="font-semibold text-gray-600">Security</h4>
                <p className="text-xs text-gray-500">Coming soon</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('transactions.recent')}
            </CardTitle>
            <CardDescription>
              Recent wallet recharges and withdrawals
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.transaction_type, transaction.status)}
                      <div>
                        <p className="font-medium text-sm">
                          {transaction.description || `${transaction.transaction_type} transaction`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium text-sm ${
                        transaction.transaction_type === 'recharge' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'recharge' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No wallet transactions yet</p>
                <p className="text-sm">Recharge your wallet to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Payment Methods Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Available Payment Methods</CardTitle>
            <CardDescription>
              Various ways to add money to your wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <Card key={method.id} className={!method.available ? 'opacity-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <method.icon className="h-5 w-5 text-primary" />
                      <span className="font-medium">{method.name}</span>
                      {!method.available && (
                        <Badge variant="secondary" className="text-xs">Soon</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{method.description}</p>
                    <div className="text-xs text-muted-foreground">
                      <p>Min: {formatCurrency(method.minAmount)}</p>
                      <p>Max: {formatCurrency(method.maxAmount)}</p>
                      {method.fees > 0 && <p>Fee: {formatCurrency(method.fees)}</p>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}