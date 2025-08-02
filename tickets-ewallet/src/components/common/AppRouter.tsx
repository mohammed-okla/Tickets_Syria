import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'

// Auth Pages
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import OTPVerificationPage from '@/pages/auth/OTPVerificationPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Dashboard Pages
import PassengerDashboard from '@/pages/passenger/PassengerDashboard'
import DriverDashboard from '@/pages/driver/DriverDashboard'
import MerchantDashboard from '@/pages/merchant/MerchantDashboard'
import EventAdminDashboard from '@/pages/event-admin/EventAdminDashboard'
import AdminDashboard from '@/pages/admin/AdminDashboard'

// Common Components
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ProtectedRoute from '@/components/common/ProtectedRoute'

export default function AppRouter() {
  const { user, profile, loading } = useAuth()
  const { isRTL } = useLanguage()

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className={`min-h-screen ${isRTL ? 'rtl' : 'ltr'}`}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={user ? <DashboardRedirect /> : <LandingPage />} />
          <Route path="/login" element={user ? <DashboardRedirect /> : <LoginPage />} />
          <Route path="/register" element={user ? <DashboardRedirect /> : <RegisterPage />} />
          <Route path="/forgot-password" element={user ? <DashboardRedirect /> : <ForgotPasswordPage />} />
          <Route path="/otp-verification" element={<OTPVerificationPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Dashboard Routes */}
          <Route path="/passenger/*" element={
            <ProtectedRoute allowedRoles={['passenger']}>
              <PassengerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/driver/*" element={
            <ProtectedRoute allowedRoles={['driver']}>
              <DriverDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/merchant/*" element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/event-admin/*" element={
            <ProtectedRoute allowedRoles={['event_admin']}>
              <EventAdminDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Catch all - redirect to dashboard or login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  )
}

function DashboardRedirect() {
  const { profile } = useAuth()
  
  if (!profile) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={`/${profile.user_type}`} replace />
}