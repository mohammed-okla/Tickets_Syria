import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useNotifications } from '@/contexts/NotificationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationFilter 
} from '@/lib/types'
import { 
  Search, 
  Filter, 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  ExternalLink,
  Calendar,
  SortAsc,
  SortDesc,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Settings,
  Ticket,
  CreditCard,
  DollarSign,
  CalendarDays
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    stats,
    fetchNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications()
  const { language } = useLanguage()
  const navigate = useNavigate()

  // State
  const [filter, setFilter] = useState<NotificationFilter>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Type filter
    if (filter.type && filter.type.length > 0) {
      if (!filter.type.includes(notification.type)) return false
    }

    // Priority filter
    if (filter.priority && filter.priority.length > 0) {
      if (!filter.priority.includes(notification.priority)) return false
    }

    // Read status filter
    if (filter.is_read !== undefined) {
      if (notification.is_read !== filter.is_read) return false
    }

    // Date filters
    if (filter.date_from) {
      if (new Date(notification.created_at) < new Date(filter.date_from)) return false
    }
    if (filter.date_to) {
      if (new Date(notification.created_at) > new Date(filter.date_to)) return false
    }

    return true
  })

  // Sort notifications
  const sortedNotifications = [...filteredNotifications].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
  })

  // Get notification icon
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'ticket':
        return <Ticket className="h-5 w-5 text-blue-600" />
      case 'payment':
        return <CreditCard className="h-5 w-5 text-green-600" />
      case 'refund':
        return <DollarSign className="h-5 w-5 text-orange-600" />
      case 'event':
        return <CalendarDays className="h-5 w-5 text-purple-600" />
      case 'system':
        return <Settings className="h-5 w-5 text-gray-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  // Get priority badge
  const getPriorityBadge = (priority: NotificationPriority) => {
    const variants = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge variant="secondary" className={variants[priority]}>
        {priority.toUpperCase()}
      </Badge>
    )
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    if (notification.action_url) {
      navigate(notification.action_url)
    }
  }

  // Handle bulk actions
  const handleBulkMarkAsRead = () => {
    selectedNotifications.forEach(id => {
      const notification = notifications.find(n => n.id === id)
      if (notification && !notification.is_read) {
        markAsRead(id)
      }
    })
    setSelectedNotifications([])
  }

  const handleBulkDelete = () => {
    selectedNotifications.forEach(id => {
      deleteNotification(id)
    })
    setSelectedNotifications([])
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.length === sortedNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(sortedNotifications.map(n => n.id))
    }
  }

  // Update filter
  const updateFilter = (key: keyof NotificationFilter, value: any) => {
    const newFilter = { ...filter, [key]: value }
    setFilter(newFilter)
    fetchNotifications(newFilter)
  }

  // Clear filters
  const clearFilters = () => {
    setFilter({})
    setSearchTerm('')
    fetchNotifications()
  }

  // Apply search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filter.search) {
        updateFilter('search', searchTerm || undefined)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Texts
  const texts = {
    en: {
      title: 'Notifications',
      description: 'Stay updated with your latest notifications',
      search: 'Search notifications...',
      filters: 'Filters',
      showFilters: 'Show Filters',
      hideFilters: 'Hide Filters',
      type: 'Type',
      priority: 'Priority', 
      status: 'Status',
      dateFrom: 'From Date',
      dateTo: 'To Date',
      clearFilters: 'Clear Filters',
      markAllRead: 'Mark All Read',
      markSelectedRead: 'Mark Selected Read',
      deleteSelected: 'Delete Selected',
      selectAll: 'Select All',
      sortNewest: 'Newest First',
      sortOldest: 'Oldest First',
      noNotifications: 'No notifications found',
      noNotificationsDesc: 'Try adjusting your filters or check back later',
      all: 'All',
      read: 'Read',
      unread: 'Unread',
      selected: 'selected'
    },
    ar: {
      title: 'الإشعارات',
      description: 'ابق محدثاً بأحدث إشعاراتك',
      search: 'البحث في الإشعارات...',
      filters: 'المرشحات',
      showFilters: 'إظهار المرشحات',
      hideFilters: 'إخفاء المرشحات',
      type: 'النوع',
      priority: 'الأولوية',
      status: 'الحالة',
      dateFrom: 'من تاريخ',
      dateTo: 'إلى تاريخ',
      clearFilters: 'مسح المرشحات',
      markAllRead: 'تحديد الكل كمقروء',
      markSelectedRead: 'تحديد المحدد كمقروء',
      deleteSelected: 'حذف المحدد',
      selectAll: 'تحديد الكل',
      sortNewest: 'الأحدث أولاً',
      sortOldest: 'الأقدم أولاً',
      noNotifications: 'لم يتم العثور على إشعارات',
      noNotificationsDesc: 'جرب تعديل المرشحات أو تحقق لاحقاً',
      all: 'الكل',
      read: 'مقروء',
      unread: 'غير مقروء',
      selected: 'محدد'
    }
  }

  const t = texts[language]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-muted-foreground">{t.description}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
                  {stats.unread}
                </Badge>
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold">{stats.unread}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">High Priority</p>
                  <p className="text-2xl font-bold">{stats.by_priority.high + stats.by_priority.urgent}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Read</p>
                  <p className="text-2xl font-bold">{stats.total - stats.unread}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Search and Sort */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t.search}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? t.hideFilters : t.showFilters}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'desc' ? (
                    <><SortDesc className="h-4 w-4 mr-2" />{t.sortNewest}</>
                  ) : (
                    <><SortAsc className="h-4 w-4 mr-2" />{t.sortOldest}</>
                  )}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Separator className="mb-4" />
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <Label>{t.type}</Label>
                      <Select 
                        value={filter.type?.[0] || 'all'} 
                        onValueChange={(value) => 
                          updateFilter('type', value === 'all' ? undefined : [value as NotificationType])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.all}</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="ticket">Ticket</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t.priority}</Label>
                      <Select 
                        value={filter.priority?.[0] || 'all'} 
                        onValueChange={(value) => 
                          updateFilter('priority', value === 'all' ? undefined : [value as NotificationPriority])
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.all}</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t.status}</Label>
                      <Select 
                        value={filter.is_read === undefined ? 'all' : filter.is_read ? 'read' : 'unread'} 
                        onValueChange={(value) => 
                          updateFilter('is_read', value === 'all' ? undefined : value === 'read')
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t.all}</SelectItem>
                          <SelectItem value="read">{t.read}</SelectItem>
                          <SelectItem value="unread">{t.unread}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>{t.dateFrom}</Label>
                      <Input
                        type="date"
                        value={filter.date_from || ''}
                        onChange={(e) => updateFilter('date_from', e.target.value || undefined)}
                      />
                    </div>

                    <div>
                      <Label>{t.dateTo}</Label>
                      <Input
                        type="date"
                        value={filter.date_to || ''}
                        onChange={(e) => updateFilter('date_to', e.target.value || undefined)}
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      {t.clearFilters}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bulk Actions */}
            {selectedNotifications.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border"
              >
                <span className="text-sm font-medium">
                  {selectedNotifications.length} {t.selected}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleBulkMarkAsRead}>
                    <Check className="h-4 w-4 mr-2" />
                    {t.markSelectedRead}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.deleteSelected}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notifications ({filteredNotifications.length})</CardTitle>
              {unreadCount > 0 && (
                <CardDescription>
                  {unreadCount} unread notifications
                </CardDescription>
              )}
            </div>
            
            <div className="flex gap-2">
              {sortedNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  <Checkbox 
                    checked={selectedNotifications.length === sortedNotifications.length}
                    className="mr-2"
                  />
                  {t.selectAll}
                </Button>
              )}
              
              {unreadCount > 0 && (
                <Button size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {t.markAllRead}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sortedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-muted-foreground mb-2">
                {t.noNotifications}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t.noNotificationsDesc}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-1">
                {sortedNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-start gap-4 p-4 border-l-4 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      !notification.is_read 
                        ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'border-l-gray-200'
                    } ${
                      selectedNotifications.includes(notification.id) 
                        ? 'bg-blue-100 dark:bg-blue-900' 
                        : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <Checkbox
                      checked={selectedNotifications.includes(notification.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNotifications(prev => [...prev, notification.id])
                        } else {
                          setSelectedNotifications(prev => prev.filter(id => id !== notification.id))
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className={`font-medium ${
                            !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getPriorityBadge(notification.priority)}
                          {!notification.is_read && (
                            <Badge variant="destructive" className="h-2 w-2 p-0 rounded-full">
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), 'MMM dd, yyyy • HH:mm')}
                        </span>

                        <div className="flex items-center gap-2">
                          {notification.action_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleNotificationClick(notification)
                              }}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {notification.action_label || 'View'}
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default NotificationsPage