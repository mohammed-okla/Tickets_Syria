import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types based on database schema
export type UserRole = 'passenger' | 'driver' | 'merchant' | 'event_admin' | 'admin'
export type Language = 'en' | 'ar'
export type TransactionType = 'payment' | 'recharge' | 'refund' | 'withdrawal'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
export type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected'
export type NotificationType = 'payment' | 'recharge' | 'ticket' | 'system' | 'support'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone_number?: string
  avatar_url?: string
  user_type: UserRole
  language_preference: Language
  theme_preference?: string
  notification_preferences?: any
  is_active: boolean
  is_verified: boolean
  has_completed_tour: boolean
  created_at: string
  updated_at: string
}

export interface Wallet {
  id: string
  user_id: string
  balance: number
  currency: string
  is_frozen: boolean
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  from_user_id?: string
  to_user_id?: string
  amount: number
  currency: string
  transaction_type: TransactionType
  status: TransactionStatus
  description?: string
  reference_id?: string
  qr_code_id?: string
  trip_id?: string
  created_at: string
  completed_at?: string
}

export interface Event {
  id: string
  parent_event_id?: string
  created_by: string
  title: string
  description?: string
  category?: string
  start_date?: string
  end_date?: string
  location?: string
  price?: number
  image_url?: string
  available_quantity?: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserTicket {
  id: string
  user_id: string
  event_id: string
  transaction_id: string
  qr_code_data: string
  status: string
  purchased_at: string
  event_details_snapshot: any
  ticket_number: string
  created_at: string
}

export interface DriverProfile {
  id: string
  user_id: string
  license_number?: string
  license_expiry?: string
  vehicle_type?: string
  vehicle_model?: string
  vehicle_plate?: string
  route_name?: string
  route_description?: string
  ticket_fee: number
  earnings_today: number
  earnings_week: number
  earnings_month: number
  is_active: boolean
  verification_status: VerificationStatus
  verification_documents?: any
  created_at: string
  updated_at: string
}

export interface Merchant {
  id: string
  user_id: string
  business_name: string
  business_category?: string
  created_at: string
  updated_at: string
}

export interface QRCode {
  id: string
  driver_id: string
  qr_data: string
  is_active: boolean
  usage_count: number
  max_usage?: number
  route_info?: string
  vehicle_info?: string
  created_at: string
  updated_at: string
  expires_at?: string
}

export interface Notification {
  id: string
  user_id: string
  notification_type: NotificationType
  title: string
  message: string
  is_read: boolean
  read_at?: string
  metadata?: any
  created_at: string
}

export interface DriverTrip {
  id: string
  driver_id: string
  route_name?: string
  status: string
  passenger_count: number
  earnings: number
  started_at: string
  ended_at?: string
  created_at: string
}