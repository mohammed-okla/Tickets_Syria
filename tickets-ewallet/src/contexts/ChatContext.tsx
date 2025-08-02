import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'
import { 
  ChatConversation, 
  ChatMessage, 
  ChatStats, 
  ChatFilter, 
  ChatSubscription,
  CreateChatRequest,
  SendMessageRequest,
  ChatResponse
} from '@/lib/types'
import { toast } from 'sonner'

interface ChatContextType {
  // State
  conversations: ChatConversation[]
  activeConversation: ChatConversation | null
  messages: ChatMessage[]
  loading: boolean
  stats: ChatStats | null
  
  // Actions
  fetchConversations: (filter?: ChatFilter) => Promise<void>
  fetchMessages: (conversationId: string) => Promise<void>
  createConversation: (request: CreateChatRequest) => Promise<string | null>
  sendMessage: (request: SendMessageRequest) => Promise<void>
  setActiveConversation: (conversation: ChatConversation | null) => void
  assignConversation: (conversationId: string, adminId: string) => Promise<void>
  updateConversationStatus: (conversationId: string, status: 'open' | 'assigned' | 'resolved' | 'closed') => Promise<void>
  
  // Real-time
  subscribe: () => ChatSubscription | null
  
  // Utils
  refreshStats: () => Promise<void>
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

interface ChatProviderProps {
  children: ReactNode
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversation, setActiveConversationState] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<ChatStats | null>(null)

  // Fetch conversations with filtering
  const fetchConversations = useCallback(async (filter?: ChatFilter) => {
    if (!user) return
    
    setLoading(true)
    try {
      let query = supabase
        .from('chat_conversations')
        .select(`
          *,
          user:profiles!chat_conversations_user_id_fkey(id, full_name, email, avatar_url),
          assigned_admin:profiles!chat_conversations_assigned_admin_id_fkey(id, full_name, email)
        `)
        .order('updated_at', { ascending: false })

      // Apply role-based filtering
      if (user.role === 'admin') {
        // Admins can see all conversations
      } else {
        // Regular users can only see their own conversations
        query = query.eq('user_id', user.id)
      }

      // Apply additional filters
      if (filter) {
        if (filter.status && filter.status.length > 0) {
          query = query.in('status', filter.status)
        }
        if (filter.priority && filter.priority.length > 0) {
          query = query.in('priority', filter.priority)
        }
        if (filter.category && filter.category.length > 0) {
          query = query.in('category', filter.category)
        }
        if (filter.assigned_admin_id) {
          query = query.eq('assigned_admin_id', filter.assigned_admin_id)
        }
        if (filter.date_from) {
          query = query.gte('created_at', filter.date_from)
        }
        if (filter.date_to) {
          query = query.lte('created_at', filter.date_to)
        }
        if (filter.search) {
          query = query.or(`subject.ilike.%${filter.search}%,category.ilike.%${filter.search}%`)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching conversations:', error)
        toast.error('Failed to load conversations')
        return
      }

      // Fetch last message for each conversation
      const conversationsWithMessages = await Promise.all(
        (data || []).map(async (conversation) => {
          const { data: lastMessage } = await supabase
            .from('chat_messages')
            .select(`
              *,
              sender:profiles!chat_messages_sender_id_fkey(id, full_name, avatar_url)
            `)
            .eq('conversation_id', conversation.id)
            .eq('is_internal', false)
            .order('created_at', { ascending: false })
            .limit(1)

          // Get unread count for user
          let unread_count = 0
          if (user.role !== 'admin') {
            const { data: unreadMessages } = await supabase
              .from('chat_messages')
              .select('id')
              .eq('conversation_id', conversation.id)
              .neq('sender_id', user.id)
              .eq('is_internal', false)
              .gt('created_at', conversation.updated_at || conversation.created_at)

            unread_count = unreadMessages?.length || 0
          }

          return {
            ...conversation,
            last_message: lastMessage?.[0] || null,
            unread_count
          }
        })
      )

      setConversations(conversationsWithMessages)
      
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!user) return
    
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          sender:profiles!chat_messages_sender_id_fkey(id, full_name, email, avatar_url, role)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching messages:', error)
        toast.error('Failed to load messages')
        return
      }

      // Filter internal messages for non-admin users
      const filteredMessages = user.role === 'admin' 
        ? data || []
        : (data || []).filter(msg => !msg.is_internal)

      setMessages(filteredMessages)
      
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create new conversation
  const createConversation = useCallback(async (request: CreateChatRequest): Promise<string | null> => {
    if (!user) return null

    try {
      const { data, error } = await supabase.rpc('start_chat_conversation', {
        p_user_id: user.id,
        p_subject: request.subject,
        p_initial_message: request.initial_message,
        p_category: request.category || 'general',
        p_priority: request.priority || 'normal'
      })

      if (error) {
        console.error('Error creating conversation:', error)
        toast.error('Failed to start conversation')
        return null
      }

      const result = data[0]
      if (result.success) {
        toast.success('Support request submitted successfully')
        await fetchConversations() // Refresh conversations
        return result.conversation_id
      } else {
        toast.error(result.message)
        return null
      }
      
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast.error('Failed to start conversation')
      return null
    }
  }, [user, fetchConversations])

  // Send message
  const sendMessage = useCallback(async (request: SendMessageRequest) => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('add_chat_message', {
        p_conversation_id: request.conversation_id,
        p_sender_id: user.id,
        p_content: request.content,
        p_message_type: request.message_type || 'text',
        p_attachments: request.attachments || [],
        p_is_internal: request.is_internal || false
      })

      if (error) {
        console.error('Error sending message:', error)
        toast.error('Failed to send message')
        return
      }

      const result = data[0]
      if (result.success) {
        // Refresh messages for active conversation
        if (activeConversation?.id === request.conversation_id) {
          await fetchMessages(request.conversation_id)
        }
        await fetchConversations() // Refresh conversations list
      } else {
        toast.error(result.message)
      }
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }, [user, activeConversation, fetchMessages, fetchConversations])

  // Set active conversation
  const setActiveConversation = useCallback((conversation: ChatConversation | null) => {
    setActiveConversationState(conversation)
    if (conversation) {
      fetchMessages(conversation.id)
    } else {
      setMessages([])
    }
  }, [fetchMessages])

  // Assign conversation to admin (admin only)
  const assignConversation = useCallback(async (conversationId: string, adminId: string) => {
    if (!user || user.role !== 'admin') return

    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ 
          assigned_admin_id: adminId,
          status: 'assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

      if (error) {
        console.error('Error assigning conversation:', error)
        toast.error('Failed to assign conversation')
        return
      }

      toast.success('Conversation assigned successfully')
      await fetchConversations()
      
    } catch (error) {
      console.error('Error assigning conversation:', error)
      toast.error('Failed to assign conversation')
    }
  }, [user, fetchConversations])

  // Update conversation status
  const updateConversationStatus = useCallback(async (conversationId: string, status: 'open' | 'assigned' | 'resolved' | 'closed') => {
    if (!user) return

    try {
      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      }

      if (status === 'resolved' || status === 'closed') {
        updateData.resolved_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('chat_conversations')
        .update(updateData)
        .eq('id', conversationId)

      if (error) {
        console.error('Error updating conversation status:', error)
        toast.error('Failed to update conversation status')
        return
      }

      toast.success(`Conversation marked as ${status}`)
      await fetchConversations()
      
    } catch (error) {
      console.error('Error updating conversation status:', error)
      toast.error('Failed to update conversation status')
    }
  }, [user, fetchConversations])

  // Refresh statistics (admin only)
  const refreshStats = useCallback(async () => {
    if (!user || user.role !== 'admin') return

    try {
      const { data: conversationsData, error } = await supabase
        .from('chat_conversations')
        .select('status, priority, category, created_at, resolved_at')

      if (error) {
        console.error('Error fetching chat stats:', error)
        return
      }

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const stats: ChatStats = {
        total_conversations: conversationsData.length,
        open_conversations: conversationsData.filter(c => c.status === 'open').length,
        assigned_conversations: conversationsData.filter(c => c.status === 'assigned').length,
        resolved_today: conversationsData.filter(c => 
          c.resolved_at && new Date(c.resolved_at) >= today
        ).length,
        average_response_time: 0, // TODO: Calculate from message timestamps
        by_category: {},
        by_priority: {
          low: conversationsData.filter(c => c.priority === 'low').length,
          normal: conversationsData.filter(c => c.priority === 'normal').length,
          high: conversationsData.filter(c => c.priority === 'high').length,
          urgent: conversationsData.filter(c => c.priority === 'urgent').length
        }
      }

      // Calculate by_category
      conversationsData.forEach(c => {
        const category = c.category || 'general'
        stats.by_category[category] = (stats.by_category[category] || 0) + 1
      })

      setStats(stats)
      
    } catch (error) {
      console.error('Error refreshing chat stats:', error)
    }
  }, [user])

  // Real-time subscription
  const subscribe = useCallback((): ChatSubscription | null => {
    if (!user) return null

    const conversationSubscription = supabase
      .channel('chat_conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations'
        },
        (payload) => {
          // Refresh conversations on any change
          fetchConversations()
        }
      )
      .subscribe()

    const messageSubscription = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as ChatMessage
            
            // If this is a message for the active conversation, add it to messages
            if (activeConversation?.id === newMessage.conversation_id) {
              // Fetch the complete message with sender info
              supabase
                .from('chat_messages')
                .select(`
                  *,
                  sender:profiles!chat_messages_sender_id_fkey(id, full_name, email, avatar_url, role)
                `)
                .eq('id', newMessage.id)
                .single()
                .then(({ data }) => {
                  if (data) {
                    setMessages(prev => [...prev, data])
                  }
                })
            }

            // Show toast for new messages (only if not from current user)
            if (newMessage.sender_id !== user.id && !newMessage.is_internal) {
              toast.info('New message received', {
                description: 'You have a new message in your support conversation'
              })
            }
          }
          
          // Refresh conversations list
          fetchConversations()
        }
      )
      .subscribe()

    return {
      unsubscribe: () => {
        conversationSubscription.unsubscribe()
        messageSubscription.unsubscribe()
      }
    }
  }, [user, activeConversation, fetchConversations])

  // Initial fetch and cleanup
  useEffect(() => {
    if (user) {
      fetchConversations()
      if (user.role === 'admin') {
        refreshStats()
      }
      
      const subscription = subscribe()
      
      return () => {
        subscription?.unsubscribe()
      }
    }
  }, [user, fetchConversations, refreshStats, subscribe])

  // Auto-refresh stats every 5 minutes for admins
  useEffect(() => {
    if (user?.role === 'admin') {
      const interval = setInterval(() => {
        refreshStats()
      }, 5 * 60 * 1000) // 5 minutes

      return () => clearInterval(interval)
    }
  }, [user, refreshStats])

  const value: ChatContextType = {
    conversations,
    activeConversation,
    messages,
    loading,
    stats,
    fetchConversations,
    fetchMessages,
    createConversation,
    sendMessage,
    setActiveConversation,
    assignConversation,
    updateConversationStatus,
    subscribe,
    refreshStats
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}