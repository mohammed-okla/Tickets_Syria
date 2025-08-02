import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, X, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useNotifications } from '@/contexts/NotificationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Notification, NotificationType } from '@/lib/types'
import { formatDistanceToNow } from 'date-fns'
import { useNavigate } from 'react-router-dom'

const NotificationBell: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)

  // Get recent notifications (last 10)
  const recentNotifications = notifications.slice(0, 10)

  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return '✅'
      case 'warning':
        return '⚠️'
      case 'error':
        return '❌'
      case 'ticket':
        return '🎫'
      case 'payment':
        return '💳'
      case 'refund':
        return '💰'
      case 'event':
        return '📅'
      case 'system':
        return '🔧'
      default:
        return 'ℹ️'
    }
  }

  // Get notification color based on type and priority
  const getNotificationColor = (notification: Notification) => {
    if (notification.priority === 'urgent') return 'text-red-600 bg-red-50 border-red-200'
    if (notification.priority === 'high') return 'text-orange-600 bg-orange-50 border-orange-200'
    
    switch (notification.type) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      markAsRead(notification.id)
    }

    // Navigate to action URL if available
    if (notification.action_url) {
      navigate(notification.action_url)
      setIsOpen(false)
    }
  }

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  // Texts based on language
  const texts = {
    en: {
      notifications: 'Notifications',
      markAllRead: 'Mark all as read',
      noNotifications: 'No notifications',
      noNotificationsDesc: 'You\'re all caught up!',
      viewAll: 'View all notifications',
      delete: 'Delete',
      just_now: 'just now'
    },
    ar: {
      notifications: 'الإشعارات',
      markAllRead: 'تحديد الكل كمقروء',
      noNotifications: 'لا توجد إشعارات',
      noNotificationsDesc: 'أنت محدث بالكامل!',
      viewAll: 'عرض جميع الإشعارات',
      delete: 'حذف',
      just_now: 'الآن'
    }
  }

  const t = texts[language]

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Bell className="h-5 w-5" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1"
              >
                <Badge 
                  variant="destructive" 
                  className="h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-80 p-0 shadow-lg border" 
        align="end"
        sideOffset={5}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                {t.notifications}
              </CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {t.markAllRead}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-muted-foreground">
                  {t.noNotifications}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t.noNotificationsDesc}
                </p>
              </div>
            ) : (
              <ScrollArea className="h-80">
                <div className="space-y-1">
                  {recentNotifications.map((notification, index) => (
                    <div key={notification.id}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-3 cursor-pointer transition-colors border-l-4 ${
                          !notification.is_read 
                            ? getNotificationColor(notification)
                            : 'border-l-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-lg flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium leading-tight ${
                                !notification.is_read ? 'text-foreground' : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </h4>
                              
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {notification.action_url && (
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
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
                            
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.created_at), { 
                                  addSuffix: true 
                                }).replace('about ', '')}
                              </span>
                              
                              {!notification.is_read && (
                                <Badge variant="secondary" className="h-5 px-2 text-xs">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                      
                      {index < recentNotifications.length - 1 && (
                        <Separator className="mx-3" />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {recentNotifications.length > 0 && (
              <>
                <Separator />
                <div className="p-3">
                  <Button
                    variant="ghost"
                    className="w-full text-sm"
                    onClick={() => {
                      navigate('/notifications')
                      setIsOpen(false)
                    }}
                  >
                    {t.viewAll}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

export default NotificationBell