import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar,
  Eye,
  MessageCircle,
  FileText,
  Settings,
  TrendingUp,
  Users,
  Timer,
  Target,
  Activity
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

interface Dispute {
  id: string
  transaction_id: string
  reported_by: string
  dispute_type: string
  description: string
  status: string
  assigned_to?: string
  admin_notes?: string
  resolution?: string
  priority: string
  created_at: string
  resolved_at?: string
  updated_at: string
  reporter?: {
    full_name: string
    email: string
    user_type: string
  }
  assigned_admin?: {
    full_name: string
    email: string
  }
  transaction?: {
    amount: number
    transaction_type: string
    created_at: string
  }
}

interface DisputeStats {
  total: number
  open: number
  inProgress: number
  resolved: number
  averageResolutionTime: number
}

export default function DisputesPage() {
  const { profile } = useAuth()
  const { t } = useLanguage()
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [stats, setStats] = useState<DisputeStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    averageResolutionTime: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [resolution, setResolution] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [admins, setAdmins] = useState<any[]>([])

  useEffect(() => {
    if (profile) {
      fetchDisputes()
      fetchAdmins()
    }
  }, [profile])

  useEffect(() => {
    calculateStats()
  }, [disputes])

  const fetchDisputes = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('disputes')
        .select(`
          *,
          reporter:profiles!disputes_reported_by_fkey (
            full_name,
            email,
            user_type
          ),
          assigned_admin:profiles!disputes_assigned_to_fkey (
            full_name,
            email
          ),
          transaction:transactions (
            amount,
            transaction_type,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setDisputes(data || [])
    } catch (error) {
      console.error('Error fetching disputes:', error)
      toast.error('Failed to load disputes')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_type', 'admin')
        .eq('is_active', true)

      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error('Error fetching admins:', error)
    }
  }

  const calculateStats = () => {
    const total = disputes.length
    const open = disputes.filter(d => d.status === 'open').length
    const inProgress = disputes.filter(d => d.status === 'in_progress').length
    const resolved = disputes.filter(d => d.status === 'resolved' || d.status === 'closed').length
    
    // Calculate average resolution time for resolved disputes
    const resolvedDisputes = disputes.filter(d => d.resolved_at)
    const averageResolutionTime = resolvedDisputes.length > 0 
      ? resolvedDisputes.reduce((sum, dispute) => {
          const created = new Date(dispute.created_at)
          const resolved = new Date(dispute.resolved_at!)
          return sum + (resolved.getTime() - created.getTime())
        }, 0) / resolvedDisputes.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0

    setStats({ total, open, inProgress, resolved, averageResolutionTime })
  }

  const filteredDisputes = disputes.filter(dispute => {
    const matchesSearch = dispute.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispute.dispute_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         dispute.reporter?.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || dispute.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || dispute.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleUpdateDispute = async () => {
    if (!selectedDispute) return

    setIsUpdating(true)
    try {
      const updateData: any = {}
      
      if (adminNotes.trim()) updateData.admin_notes = adminNotes
      if (resolution.trim()) updateData.resolution = resolution
      if (assignedTo) updateData.assigned_to = assignedTo
      if (newStatus) {
        updateData.status = newStatus
        if (newStatus === 'resolved' || newStatus === 'closed') {
          updateData.resolved_at = new Date().toISOString()
        }
      }
      updateData.updated_at = new Date().toISOString()

      const { error } = await supabase
        .from('disputes')
        .update(updateData)
        .eq('id', selectedDispute.id)

      if (error) throw error

      toast.success('Dispute updated successfully')
      setIsDialogOpen(false)
      fetchDisputes()
      resetForm()
    } catch (error) {
      console.error('Error updating dispute:', error)
      toast.error('Failed to update dispute')
    } finally {
      setIsUpdating(false)
    }
  }

  const resetForm = () => {
    setAdminNotes('')
    setResolution('')
    setAssignedTo('')
    setNewStatus('')
    setSelectedDispute(null)
  }

  const openDisputeDialog = (dispute: Dispute) => {
    setSelectedDispute(dispute)
    setAdminNotes(dispute.admin_notes || '')
    setResolution(dispute.resolution || '')
    setAssignedTo(dispute.assigned_to || '')
    setNewStatus(dispute.status)
    setIsDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-red-500'
      case 'in_progress': return 'bg-yellow-500'
      case 'resolved': return 'bg-green-500'
      case 'closed': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive'
      case 'medium': return 'secondary'
      case 'low': return 'outline'
      default: return 'outline'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return AlertTriangle
      case 'in_progress': return Clock
      case 'resolved': return CheckCircle
      case 'closed': return XCircle
      default: return MessageSquare
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
          <h1 className="text-3xl font-bold tracking-tight">Dispute Management</h1>
          <p className="text-muted-foreground">Handle user disputes and complaints efficiently</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disputes</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">Being handled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageResolutionTime.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Days</p>
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
                placeholder="Search disputes..."
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disputes List */}
      <Card>
        <CardHeader>
          <CardTitle>Disputes ({filteredDisputes.length})</CardTitle>
          <CardDescription>Manage and resolve user disputes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDisputes.length > 0 ? (
              filteredDisputes.map((dispute, index) => {
                const StatusIcon = getStatusIcon(dispute.status)
                return (
                  <motion.div
                    key={dispute.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <StatusIcon className="h-4 w-4" />
                          <h4 className="font-medium">{dispute.dispute_type}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {dispute.description}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{dispute.reporter?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{dispute.reporter?.email}</p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {dispute.reporter?.user_type}
                        </Badge>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getPriorityColor(dispute.priority)} className="text-xs">
                            {dispute.priority} priority
                          </Badge>
                          <Badge className={`text-white text-xs ${getStatusColor(dispute.status)}`}>
                            {dispute.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Dialog open={isDialogOpen && selectedDispute?.id === dispute.id} onOpenChange={(open) => {
                          setIsDialogOpen(open)
                          if (!open) resetForm()
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openDisputeDialog(dispute)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Dispute Details</DialogTitle>
                              <DialogDescription>
                                Manage and resolve this dispute
                              </DialogDescription>
                            </DialogHeader>
                            {selectedDispute && (
                              <div className="grid gap-6">
                                {/* Dispute Info */}
                                <div className="grid gap-4 md:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label>Dispute Type</Label>
                                    <p className="text-sm font-medium">{selectedDispute.dispute_type}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Reporter</Label>
                                    <p className="text-sm font-medium">{selectedDispute.reporter?.full_name}</p>
                                    <p className="text-xs text-muted-foreground">{selectedDispute.reporter?.email}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select value={newStatus} onValueChange={setNewStatus}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="open">Open</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Assign To</Label>
                                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select admin" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {admins.map(admin => (
                                          <SelectItem key={admin.id} value={admin.id}>
                                            {admin.full_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                  <Label>Description</Label>
                                  <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm">{selectedDispute.description}</p>
                                  </div>
                                </div>

                                {/* Admin Notes */}
                                <div className="space-y-2">
                                  <Label htmlFor="admin-notes">Admin Notes</Label>
                                  <Textarea
                                    id="admin-notes"
                                    placeholder="Add notes about this dispute..."
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>

                                {/* Resolution */}
                                <div className="space-y-2">
                                  <Label htmlFor="resolution">Resolution</Label>
                                  <Textarea
                                    id="resolution"
                                    placeholder="Describe how this dispute was resolved..."
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    rows={3}
                                  />
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button onClick={handleUpdateDispute} disabled={isUpdating}>
                                    {isUpdating ? 'Updating...' : 'Update Dispute'}
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
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No disputes found</h3>
                <p className="text-muted-foreground">No disputes match your current filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}