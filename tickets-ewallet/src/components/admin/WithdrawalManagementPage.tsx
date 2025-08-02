import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { 
  DollarSign, 
  Eye, 
  Check, 
  X, 
  Clock, 
  Building2, 
  Phone, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  Download,
  Filter,
  Search,
  User,
  CreditCard,
  FileText
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface WithdrawalRequest {
  id: string
  user_id: string
  amount: number
  currency: string
  payment_method: any
  status: string
  request_notes?: string
  admin_notes?: string
  processing_fee: number
  final_amount: number
  processed_by?: string
  processed_at?: string
  created_at: string
  updated_at: string
  user?: {
    full_name: string
    email: string
    user_type: string
  }
  processor?: {
    full_name: string
    email: string
  }
}

interface WithdrawalStats {
  total: number
  pending: number
  approved: number
  rejected: number
  completed: number
  totalAmount: number
  pendingAmount: number
}

export default function WithdrawalManagementPage() {
  const { profile } = useAuth()
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [stats, setStats] = useState<WithdrawalStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    totalAmount: 0,
    pendingAmount: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [userTypeFilter, setUserTypeFilter] = useState('all')
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [processingFee, setProcessingFee] = useState(0)
  const [newStatus, setNewStatus] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (profile) {
      fetchWithdrawals()
    }
  }, [profile])

  useEffect(() => {
    calculateStats()
  }, [withdrawals])

  const fetchWithdrawals = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          user:profiles!withdrawal_requests_user_id_fkey (
            full_name,
            email,
            user_type
          ),
          processor:profiles!withdrawal_requests_processed_by_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setWithdrawals(data || [])
    } catch (error) {
      console.error('Error fetching withdrawals:', error)
      toast.error('Failed to load withdrawal requests')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateStats = () => {
    const total = withdrawals.length
    const pending = withdrawals.filter(w => w.status === 'pending').length
    const approved = withdrawals.filter(w => w.status === 'approved').length
    const rejected = withdrawals.filter(w => w.status === 'rejected').length
    const completed = withdrawals.filter(w => w.status === 'completed').length
    const totalAmount = withdrawals.reduce((sum, w) => sum + w.amount, 0)
    const pendingAmount = withdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + w.amount, 0)

    setStats({ total, pending, approved, rejected, completed, totalAmount, pendingAmount })
  }

  const filteredWithdrawals = withdrawals.filter(withdrawal => {
    const matchesSearch = withdrawal.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         withdrawal.user?.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         withdrawal.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || withdrawal.status === statusFilter
    const matchesUserType = userTypeFilter === 'all' || withdrawal.user?.user_type === userTypeFilter
    
    return matchesSearch && matchesStatus && matchesUserType
  })

  const handleUpdateWithdrawal = async () => {
    if (!selectedWithdrawal) return

    setIsUpdating(true)
    try {
      const updateData: any = {
        status: newStatus,
        admin_notes: adminNotes.trim() || null,
        processing_fee: processingFee,
        final_amount: selectedWithdrawal.amount - processingFee,
        processed_by: profile?.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('withdrawal_requests')
        .update(updateData)
        .eq('id', selectedWithdrawal.id)

      if (error) throw error

      toast.success('Withdrawal request updated successfully')
      setIsDialogOpen(false)
      fetchWithdrawals()
      resetForm()
    } catch (error) {
      console.error('Error updating withdrawal:', error)
      toast.error('Failed to update withdrawal request')
    } finally {
      setIsUpdating(false)
    }
  }

  const resetForm = () => {
    setAdminNotes('')
    setProcessingFee(0)
    setNewStatus('')
    setSelectedWithdrawal(null)
  }

  const openWithdrawalDialog = (withdrawal: WithdrawalRequest) => {
    setSelectedWithdrawal(withdrawal)
    setAdminNotes(withdrawal.admin_notes || '')
    setProcessingFee(withdrawal.processing_fee || 0)
    setNewStatus(withdrawal.status)
    setIsDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'approved': return 'bg-green-500'
      case 'rejected': return 'bg-red-500'
      case 'completed': return 'bg-blue-500'
      case 'cancelled': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return Clock
      case 'approved': return Check
      case 'rejected': return X
      case 'completed': return Check
      case 'cancelled': return X
      default: return Clock
    }
  }

  const formatCurrency = (amount: number, currency: string = 'SYP') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'SYP' ? 'USD' : currency,
      minimumFractionDigits: 0
    }).format(amount).replace('$', '') + ' ' + currency
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
          <h1 className="text-3xl font-bold tracking-tight">Withdrawal Management</h1>
          <p className="text-muted-foreground">Review and process withdrawal requests</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Financial Report
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Ready for payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Check className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Paid out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">All requests</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingAmount)}</div>
            <p className="text-xs text-muted-foreground">To be processed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by user type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All User Types</SelectItem>
                <SelectItem value="merchant">Merchants</SelectItem>
                <SelectItem value="event_admin">Event Admins</SelectItem>
                <SelectItem value="driver">Drivers</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests ({filteredWithdrawals.length})</CardTitle>
          <CardDescription>Review and process user withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredWithdrawals.length > 0 ? (
              filteredWithdrawals.map((withdrawal, index) => {
                const StatusIcon = getStatusIcon(withdrawal.status)
                return (
                  <motion.div
                    key={withdrawal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4" />
                          <h4 className="font-medium">{withdrawal.user?.full_name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{withdrawal.user?.email}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {withdrawal.user?.user_type}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-lg font-bold">{formatCurrency(withdrawal.amount, withdrawal.currency)}</p>
                        <p className="text-sm text-muted-foreground">
                          {withdrawal.payment_method?.type === 'bank_transfer' ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              Bank Transfer
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {withdrawal.payment_method?.provider}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <Badge className={`text-white text-xs ${getStatusColor(withdrawal.status)}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {withdrawal.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(withdrawal.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div>
                        {withdrawal.processor && (
                          <div>
                            <p className="text-sm font-medium">Processed by:</p>
                            <p className="text-xs text-muted-foreground">{withdrawal.processor.full_name}</p>
                          </div>
                        )}
                        {withdrawal.processing_fee > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Fee: {formatCurrency(withdrawal.processing_fee)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog open={isDialogOpen && selectedWithdrawal?.id === withdrawal.id} onOpenChange={(open) => {
                          setIsDialogOpen(open)
                          if (!open) resetForm()
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openWithdrawalDialog(withdrawal)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Review Withdrawal Request</DialogTitle>
                              <DialogDescription>
                                Review and process this withdrawal request
                              </DialogDescription>
                            </DialogHeader>
                            {selectedWithdrawal && (
                              <div className="grid gap-6">
                                {/* Request Details */}
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>User</Label>
                                    <p className="text-sm font-medium">{selectedWithdrawal.user?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedWithdrawal.user?.email}</p>
                                    <Badge variant="outline" className="text-xs">
                                      {selectedWithdrawal.user?.user_type}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Amount</Label>
                                    <p className="text-lg font-bold">{formatCurrency(selectedWithdrawal.amount, selectedWithdrawal.currency)}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Payment Method</Label>
                                    {selectedWithdrawal.payment_method?.type === 'bank_transfer' ? (
                                      <div className="text-sm">
                                        <p><strong>Bank:</strong> {selectedWithdrawal.payment_method.bank_name}</p>
                                        <p><strong>Account:</strong> {selectedWithdrawal.payment_method.account_number}</p>
                                        <p><strong>Holder:</strong> {selectedWithdrawal.payment_method.account_holder}</p>
                                        {selectedWithdrawal.payment_method.swift_code && (
                                          <p><strong>SWIFT:</strong> {selectedWithdrawal.payment_method.swift_code}</p>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="text-sm">
                                        <p><strong>Provider:</strong> {selectedWithdrawal.payment_method?.provider}</p>
                                        <p><strong>Phone:</strong> {selectedWithdrawal.payment_method?.phone_number}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={newStatus} onValueChange={setNewStatus}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* User Notes */}
                                {selectedWithdrawal.request_notes && (
                                  <div className="space-y-2">
                                    <Label>User Notes</Label>
                                    <div className="p-3 bg-muted rounded-lg">
                                      <p className="text-sm">{selectedWithdrawal.request_notes}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Processing Fee */}
                                <div className="space-y-2">
                                  <Label htmlFor="processing-fee">Processing Fee</Label>
                                  <Input
                                    id="processing-fee"
                                    type="number"
                                    placeholder="0.00"
                                    value={processingFee}
                                    onChange={(e) => setProcessingFee(parseFloat(e.target.value) || 0)}
                                    min="0"
                                    step="0.01"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Final amount: {formatCurrency(selectedWithdrawal.amount - processingFee)}
                                  </p>
                                </div>

                                {/* Admin Notes */}
                                <div className="space-y-2">
                                  <Label htmlFor="admin-notes">Admin Notes</Label>
                                  <Textarea
                                    id="admin-notes"
                                    placeholder="Add notes about this withdrawal request..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateWithdrawal} disabled={isUpdating}>
                                    {isUpdating ? 'Updating...' : 'Update Request'}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No withdrawal requests found</h3>
                <p className="text-muted-foreground">No requests match your current filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}