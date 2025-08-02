import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import EventAdminHome from '@/components/event-admin/EventAdminHome'
import EventManagementPage from '@/components/event-admin/EventManagementPage'
import TicketValidationPage from '@/components/event-admin/TicketValidationPage'
import EventAnalyticsPage from '@/components/event-admin/EventAnalyticsPage'
import ProfilePage from '@/components/common/ProfilePage'
import SettingsPage from '@/components/common/SettingsPage'
import ChatInterface from '@/components/chat/ChatInterface'
import WithdrawalPage from '@/components/common/WithdrawalPage'

export default function EventAdminDashboard() {
  return (
    <DashboardLayout userType="event_admin">
      <Routes>
        <Route path="/" element={<Navigate to="/event-admin/home" replace />} />
        <Route path="/home" element={<EventAdminHome />} />
        <Route path="/events" element={<EventManagementPage />} />
        <Route path="/validation" element={<TicketValidationPage />} />
        <Route path="/analytics" element={<EventAnalyticsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/withdrawal" element={<WithdrawalPage />} />
      </Routes>
    </DashboardLayout>
  )
}