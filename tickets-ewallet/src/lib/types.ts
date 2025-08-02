// =====================================================
// SHARED TYPES FOR TICKETS E-WALLET APP
// =====================================================

// Notification System Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system' | 'ticket' | 'payment' | 'refund' | 'event'
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  priority: NotificationPriority
  is_read: boolean
  action_url?: string
  action_label?: string
  metadata?: Record<string, any>
  created_by?: string
  expires_at?: string
  created_at: string
  read_at?: string
}

export interface NotificationTemplate {
  id: string
  name: string
  title_template: string
  message_template: string
  type: NotificationType
  priority: NotificationPriority
  action_url_template?: string
  action_label?: string
  variables: string[]
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

// Chat System Types
export type ChatConversationStatus = 'open' | 'assigned' | 'resolved' | 'closed'
export type ChatMessageType = 'text' | 'image' | 'file' | 'system'

export interface ChatConversation {
  id: string
  user_id: string
  assigned_admin_id?: string
  subject: string
  status: ChatConversationStatus
  priority: NotificationPriority
  category?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  resolved_at?: string
  // Joined data
  user?: UserProfile
  assigned_admin?: UserProfile
  last_message?: ChatMessage
  unread_count?: number
}

export interface ChatMessage {
  id: string
  conversation_id: string
  sender_id: string
  message_type: ChatMessageType
  content: string
  attachments?: string[]
  is_internal: boolean
  metadata?: Record<string, any>
  created_at: string
  edited_at?: string
  deleted_at?: string
  // Joined data
  sender?: UserProfile
}

// User Profile Types
export interface UserProfile {
  id: string
  full_name: string
  email: string
  phone_number?: string
  role: 'passenger' | 'driver' | 'merchant' | 'event_admin' | 'admin'
  avatar_url?: string
  is_active: boolean
  is_verified: boolean
  language: 'en' | 'ar'
  created_at: string
  updated_at: string
}

// Real-time subscription types
export interface NotificationSubscription {
  unsubscribe: () => void
}

export interface ChatSubscription {
  unsubscribe: () => void
}

// API Response types
export interface NotificationResponse {
  data?: Notification[]
  error?: string
  count?: number
}

export interface ChatResponse {
  data?: ChatConversation[]
  error?: string
  count?: number
}

export interface CreateNotificationRequest {
  user_id?: string
  user_ids?: string[]
  title: string
  message: string
  type?: NotificationType
  priority?: NotificationPriority
  action_url?: string
  action_label?: string
  metadata?: Record<string, any>
}

export interface CreateChatRequest {
  subject: string
  initial_message: string
  category?: string
  priority?: NotificationPriority
}

export interface SendMessageRequest {
  conversation_id: string
  content: string
  message_type?: ChatMessageType
  attachments?: string[]
  is_internal?: boolean
}

// Notification Statistics
export interface NotificationStats {
  total: number
  unread: number
  by_type: Record<NotificationType, number>
  by_priority: Record<NotificationPriority, number>
}

// Chat Statistics
export interface ChatStats {
  total_conversations: number
  open_conversations: number
  assigned_conversations: number
  resolved_today: number
  average_response_time: number
  by_category: Record<string, number>
  by_priority: Record<NotificationPriority, number>
}

// Filter and Search types
export interface NotificationFilter {
  type?: NotificationType[]
  priority?: NotificationPriority[]
  is_read?: boolean
  date_from?: string
  date_to?: string
  search?: string
}

export interface ChatFilter {
  status?: ChatConversationStatus[]
  priority?: NotificationPriority[]
  category?: string[]
  assigned_admin_id?: string
  date_from?: string
  date_to?: string
  search?: string
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}