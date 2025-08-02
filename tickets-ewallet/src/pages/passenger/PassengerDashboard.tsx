import React from 'react'
import { Routes, Route } from 'react-router-dom'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import PassengerHome from './PassengerHome'
import WalletPage from '@/components/wallet/WalletPage'
import QRScannerPage from '@/components/scanner/QRScannerPage'
import TransactionsPage from '@/components/transactions/TransactionsPage'
import EventsPage from '@/components/events/EventsPage'
import TicketsPage from '@/components/tickets/TicketsPage'
import PassengerAnalyticsPage from '@/components/passenger/PassengerAnalyticsPage'
import ProfilePage from '@/components/common/ProfilePage'
import SettingsPage from '@/components/common/SettingsPage'
import NotificationsPage from '@/components/common/NotificationsPage'
import ChatInterface from '@/components/chat/ChatInterface'

export default function PassengerDashboard() {
  return (
    <DashboardLayout userType="passenger">
      <Routes>
        <Route index element={<PassengerHome />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="scanner" element={<QRScannerPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="analytics" element={<PassengerAnalyticsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="chat" element={<ChatInterface />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Routes>
    </DashboardLayout>
  )
}