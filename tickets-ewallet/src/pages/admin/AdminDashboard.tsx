import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useRequireRole } from '@/contexts/AuthContext'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import AdminHome from '@/components/admin/AdminHome'
import UserManagementPage from '@/components/admin/UserManagementPage'
import SystemAnalyticsPage from '@/components/admin/SystemAnalyticsPage'
import DisputesPage from '@/components/admin/DisputesPage'
import DriverVerificationReviewPage from '@/components/admin/DriverVerificationReviewPage'
import ProfilePage from '@/components/common/ProfilePage'
import SettingsPage from '@/components/common/SettingsPage'
import NotificationsPage from '@/components/common/NotificationsPage'
import NotificationBroadcastPage from '@/components/admin/NotificationBroadcastPage'
import AdminChatManagement from '@/components/admin/AdminChatManagement'

export default function AdminDashboard() {
  useRequireRole(['admin'])

  return (
    <DashboardLayout userType="admin">
      <Routes>
        <Route path="/" element={<Navigate to="/admin/home" replace />} />
        <Route path="/home" element={<AdminHome />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/analytics" element={<SystemAnalyticsPage />} />
        <Route path="/disputes" element={<DisputesPage />} />
        <Route path="/verification-review" element={<DriverVerificationReviewPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/broadcast" element={<NotificationBroadcastPage />} />
        <Route path="/chat-management" element={<AdminChatManagement />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  )
}