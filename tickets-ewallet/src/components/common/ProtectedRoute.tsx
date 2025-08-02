import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/lib/supabase'
import LoadingSpinner from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profile) {
    return <LoadingSpinner text="Loading profile..." />
  }

  if (!allowedRoles.includes(profile.user_type)) {
    // Redirect to user's appropriate dashboard
    return <Navigate to={`/${profile.user_type}`} replace />
  }

  return <>{children}</>
}