import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Wallet, 
  DollarSign, 
  CreditCard, 
  Building2, 
  Phone, 
  Calendar,
  Check,
  X,
  Clock,
  TrendingUp,
  Download,
  AlertCircle,
  Info
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface WithdrawalRequest {
  id: string
  amount: number
  currency: string
  status: string
  payment_method: any
  request_notes?: string
  admin_notes?: string
  requested_at: string
  processed_at?: string
}

interface Wallet {
  balance: number
  currency: string
}

const WithdrawalPage: React.FC = () => {
  const { user } = useAuth()
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [bankDetails, setBankDetails] = useState({
    bank_name: '',
    account_number: '',
    account_holder: '',
    swift_code: ''
  })
  const [mobileWallet, setMobileWallet] = useState({
    provider: 'syriatel',
    phone_number: ''
  })
  const [notes, setNotes] = useState('')

  // Fetch wallet balance
  const fetchWallet = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance, currency')
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('Error fetching wallet:', error)
        return
      }

      setWallet(data)
    } catch (error) {
      console.error('Error fetching wallet:', error)
    }
  }

  // Fetch withdrawal requests
  const fetchWithdrawalRequests = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false })

      if (error) {
        console.error('Error fetching withdrawal requests:', error)
        toast.error('Failed to load withdrawal history')
        return
      }

      setWithdrawalRequests(data || [])
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error)
      toast.error('Failed to load withdrawal history')
    } finally {
      setLoading(false)
    }
  }

  // Submit withdrawal request
  const handleSubmitWithdrawal = async () => {
    if (!user || !wallet) return

    const withdrawalAmount = parseFloat(amount)
    
    // Validation
    if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (withdrawalAmount > wallet.balance) {
      toast.error('Insufficient balance')
      return
    }

    if (withdrawalAmount < 1000) {
      toast.error('Minimum withdrawal amount is 1,000 SYP')
      return
    }

    let paymentMethodData: any = {}
    
    if (paymentMethod === 'bank_transfer') {
      if (!bankDetails.bank_name || !bankDetails.account_number || !bankDetails.account_holder) {
        toast.error('Please fill in all bank details')
        return
      }
      paymentMethodData = {
        type: 'bank_transfer',
        ...bankDetails
      }
    } else if (paymentMethod === 'mobile_wallet') {
      if (!mobileWallet.phone_number) {
        toast.error('Please enter your mobile wallet phone number')
        return
      }
      paymentMethodData = {
        type: 'mobile_wallet',
        ...mobileWallet
      }
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          amount: withdrawalAmount,
          currency: wallet.currency,
          payment_method: paymentMethodData,
          request_notes: notes.trim() || null
        })

      if (error) {
        console.error('Error submitting withdrawal request:', error)
        toast.error('Failed to submit withdrawal request')
        return
      }

      toast.success('Withdrawal request submitted successfully')
      
      // Reset form
      setAmount('')
      setNotes('')
      setBankDetails({
        bank_name: '',
        account_number: '',
        account_holder: '',
        swift_code: ''
      })
      setMobileWallet({
        provider: 'syriatel',
        phone_number: ''
      })

      // Refresh data
      fetchWithdrawalRequests()
      
    } catch (error) {
      console.error('Error submitting withdrawal request:', error)
      toast.error('Failed to submit withdrawal request')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchWallet()
      fetchWithdrawalRequests()
    }
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'approved': return 'bg-green-500'
      case 'rejected': return 'bg-red-500'
      case 'completed': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock
      case 'approved': return Check
      case 'rejected': return X
      case 'completed': return Check
      default: return AlertCircle
    }
  }

  const formatCurrency = (amount: number, currency: string = 'SYP') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'SYP' ? 'USD' : currency,
      minimumFractionDigits: 0
    }).format(amount).replace('$', '') + ' ' + currency
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to access withdrawal features</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold">
                {wallet ? formatCurrency(wallet.balance, wallet.currency) : '...'} 
              </p>
              <p className="text-sm text-muted-foreground">Available for withdrawal</p>
            </div>
            <div className="text-right">
              <TrendingUp className="h-8 w-8 text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">Total earnings</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="request">Request Withdrawal</TabsTrigger>
          <TabsTrigger value="history">Withdrawal History</TabsTrigger>
        </TabsList>

        {/* Withdrawal Request Tab */}
        <TabsContent value="request" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Request Withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Withdrawal Amount */}
              <div>
                <Label htmlFor="amount">Withdrawal Amount *</Label>
                <div className="relative">
                  <DollarSign className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-10"
                    min="1000"
                    max={wallet?.balance || 0}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: 1,000 SYP • Available: {wallet ? formatCurrency(wallet.balance, wallet.currency) : '0 SYP'}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <Label htmlFor="payment-method">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Bank Transfer
                      </div>
                    </SelectItem>
                    <SelectItem value="mobile_wallet">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Mobile Wallet
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bank Transfer Details */}
              {paymentMethod === 'bank_transfer' && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Bank Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="bank-name">Bank Name *</Label>
                      <Input
                        id="bank-name"
                        placeholder="e.g., Bank Audi"
                        value={bankDetails.bank_name}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, bank_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="account-number">Account Number *</Label>
                      <Input
                        id="account-number"
                        placeholder="1234567890"
                        value={bankDetails.account_number}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, account_number: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="account-holder">Account Holder Name *</Label>
                      <Input
                        id="account-holder"
                        placeholder="Full name as on bank account"
                        value={bankDetails.account_holder}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, account_holder: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="swift-code">SWIFT/BIC Code</Label>
                      <Input
                        id="swift-code"
                        placeholder="Optional"
                        value={bankDetails.swift_code}
                        onChange={(e) => setBankDetails(prev => ({ ...prev, swift_code: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Wallet Details */}
              {paymentMethod === 'mobile_wallet' && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Mobile Wallet Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="wallet-provider">Provider</Label>
                      <Select 
                        value={mobileWallet.provider} 
                        onValueChange={(value) => setMobileWallet(prev => ({ ...prev, provider: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="syriatel">Syriatel Cash</SelectItem>
                          <SelectItem value="mtn">MTN Cash</SelectItem>
                          <SelectItem value="bemo">Bemo Pay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="wallet-phone">Phone Number *</Label>
                      <Input
                        id="wallet-phone"
                        placeholder="+963 XXX XXX XXX"
                        value={mobileWallet.phone_number}
                        onChange={(e) => setMobileWallet(prev => ({ ...prev, phone_number: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions or notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={handleSubmitWithdrawal} 
                  disabled={submitting || !amount || parseFloat(amount) <= 0}
                  className="w-full md:w-auto"
                >
                  {submitting ? 'Submitting...' : 'Submit Withdrawal Request'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Important Information */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-medium">Important Information</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Minimum withdrawal amount is 1,000 SYP</li>
                    <li>• Processing time: 2-5 business days</li>
                    <li>• Bank transfers may incur additional fees</li>
                    <li>• Ensure your payment details are accurate to avoid delays</li>
                    <li>• You'll receive a notification once your request is processed</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Withdrawal History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading withdrawal history...</p>
                </div>
              ) : withdrawalRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No withdrawal requests yet</p>
                  <p className="text-sm text-muted-foreground">Your withdrawal history will appear here</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {withdrawalRequests.map((request) => {
                      const StatusIcon = getStatusIcon(request.status)
                      return (
                        <div key={request.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`${getStatusColor(request.status)} text-white`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </Badge>
                              <span className="text-lg font-medium">
                                {formatCurrency(request.amount, request.currency)}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(request.requested_at), { addSuffix: true })}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Payment Method:</p>
                              <p className="font-medium">
                                {request.payment_method?.type === 'bank_transfer' 
                                  ? `Bank Transfer - ${request.payment_method.bank_name}`
                                  : `${request.payment_method?.provider} - ${request.payment_method?.phone_number}`
                                }
                              </p>
                            </div>
                            {request.processed_at && (
                              <div>
                                <p className="text-muted-foreground">Processed:</p>
                                <p className="font-medium">
                                  {formatDistanceToNow(new Date(request.processed_at), { addSuffix: true })}
                                </p>
                              </div>
                            )}
                          </div>

                          {request.request_notes && (
                            <div className="mt-3 p-2 bg-muted/30 rounded text-sm">
                              <p className="text-muted-foreground">Your notes:</p>
                              <p>{request.request_notes}</p>
                            </div>
                          )}

                          {request.admin_notes && (
                            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                              <p className="text-muted-foreground">Admin notes:</p>
                              <p>{request.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default WithdrawalPage