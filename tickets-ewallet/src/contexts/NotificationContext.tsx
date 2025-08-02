import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { 
  Notification, 
  NotificationStats, 
  NotificationFilter, 
  NotificationSubscription,
  CreateNotificationRequest,
  NotificationResponse
} from '@/lib/types'
import { toast } from 'sonner'

interface NotificationContextType {
  // State
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  stats: NotificationStats | null
  
  // Actions
  fetchNotifications: (filter?: NotificationFilter) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  createNotification: (request: CreateNotificationRequest) => Promise<boolean>
  
  // Real-time
  subscribe: () => NotificationSubscription | null
  
  // Utils
  refreshStats: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<NotificationStats | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async (filter?: NotificationFilter) => {
    if (!user) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      // Apply filters
      if (filter) {
        if (filter.type && filter.type.length > 0) {
          query = query.in('type', filter.type)
        }
        if (filter.priority && filter.priority.length > 0) {
          query = query.in('priority', filter.priority)
        }
        if (filter.is_read !== undefined) {
          query = query.eq('is_read', filter.is_read)
        }
        if (filter.date_from) {
          query = query.gte('created_at', filter.date_from)
        }
        if (filter.date_to) {
          query = query.lte('created_at', filter.date_to)
        }
        if (filter.search) {
          query = query.or(`title.ilike.%${filter.search}%,message.ilike.%${filter.search}%`)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching notifications:', error)
        toast.error('Failed to load notifications')
        return
      }

      setNotifications(data || [])
      
      // Update unread count
      const unread = (data || []).filter(n => !n.is_read && (!n.expires_at || new Date(n.expires_at) > new Date())).length
      setUnreadCount(unread)
      
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return

    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_user_id: user.id
      })

      if (error) {
        console.error('Error marking notification as read:', error)
        return
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )
      
      setUnreadCount(prev => Math.max(0, prev - 1))
      
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [user])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return

    try {
      const { error } = await supabase.rpc('mark_all_notifications_read', {
        p_user_id: user.id
      })

      if (error) {
        console.error('Error marking all notifications as read:', error)
        toast.error('Failed to mark notifications as read')
        return
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      
      setUnreadCount(0)
      toast.success('All notifications marked as read')
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    }
  }, [user])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error deleting notification:', error)
        toast.error('Failed to delete notification')
        return
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      
      // Update unread count if notification was unread
      const notification = notifications.find(n => n.id === notificationId)
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      
      toast.success('Notification deleted')
      
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }, [user, notifications])

  // Create notification (for admins)
  const createNotification = useCallback(async (request: CreateNotificationRequest): Promise<boolean> => {
    if (!user) return false

    try {
      if (request.user_ids && request.user_ids.length > 0) {
        // Broadcast to multiple users
        const { error } = await supabase.rpc('broadcast_notification', {
          p_user_ids: request.user_ids,
          p_title: request.title,
          p_message: request.message,
          p_type: request.type || 'info',
          p_priority: request.priority || 'normal',
          p_action_url: request.action_url,
          p_action_label: request.action_label,
          p_created_by: user.id
        })

        if (error) {
          console.error('Error broadcasting notification:', error)
          toast.error('Failed to send notifications')
          return false
        }
      } else if (request.user_id) {
        // Single user notification
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: request.user_id,
            title: request.title,
            message: request.message,
            type: request.type || 'info',
            priority: request.priority || 'normal',
            action_url: request.action_url,
            action_label: request.action_label,
            metadata: request.metadata,
            created_by: user.id
          })

        if (error) {
          console.error('Error creating notification:', error)
          toast.error('Failed to send notification')
          return false
        }
      } else {
        toast.error('No recipient specified')
        return false
      }

      toast.success('Notification sent successfully')
      return true
      
    } catch (error) {
      console.error('Error creating notification:', error)
      toast.error('Failed to send notification')
      return false
    }
  }, [user])

  // Refresh statistics
  const refreshStats = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, priority, is_read')
        .eq('user_id', user.id)

      if (error) {
        console.error('Error fetching notification stats:', error)
        return
      }

      const stats: NotificationStats = {
        total: data.length,
        unread: data.filter(n => !n.is_read).length,
        by_type: {
          info: data.filter(n => n.type === 'info').length,
          success: data.filter(n => n.type === 'success').length,
          warning: data.filter(n => n.type === 'warning').length,
          error: data.filter(n => n.type === 'error').length,
          system: data.filter(n => n.type === 'system').length,
          ticket: data.filter(n => n.type === 'ticket').length,
          payment: data.filter(n => n.type === 'payment').length,
          refund: data.filter(n => n.type === 'refund').length,
          event: data.filter(n => n.type === 'event').length
        },
        by_priority: {
          low: data.filter(n => n.priority === 'low').length,
          normal: data.filter(n => n.priority === 'normal').length,
          high: data.filter(n => n.priority === 'high').length,
          urgent: data.filter(n => n.priority === 'urgent').length
        }
      }

      setStats(stats)
      
    } catch (error) {
      console.error('Error refreshing notification stats:', error)
    }
  }, [user])

  // Real-time subscription
  const subscribe = useCallback((): NotificationSubscription | null => {
    if (!user) return null

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification
            setNotifications(prev => [newNotification, ...prev])
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1)
            }
            
            // Show toast for new notification
            if (newNotification.priority === 'urgent') {
              toast.error(newNotification.title, {
                description: newNotification.message
              })
            } else if (newNotification.type === 'success') {
              toast.success(newNotification.title, {
                description: newNotification.message
              })
            } else {
              toast.info(newNotification.title, {
                description: newNotification.message
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as Notification
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setNotifications(prev => prev.filter(n => n.id !== deletedId))
          }
        }
      )
      .subscribe()

    return {
      unsubscribe: () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  // Initial fetch and cleanup
  useEffect(() => {
    if (user) {
      fetchNotifications()
      refreshStats()
      
      const subscription = subscribe()
      
      return () => {
        subscription?.unsubscribe()
      }
    }
  }, [user, fetchNotifications, refreshStats, subscribe])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        refreshStats()
      }
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [user, refreshStats])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    stats,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createNotification,
    subscribe,
    refreshStats
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}