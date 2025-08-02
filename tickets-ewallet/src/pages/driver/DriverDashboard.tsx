import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRequireRole } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import DriverHome from '@/components/driver/DriverHome';
import EarningsPage from '@/components/driver/EarningsPage';
import TripsPage from '@/components/driver/TripsPage';
import QRGeneratorPage from '@/components/driver/QRGeneratorPage';
import DriverAnalyticsPage from '@/components/driver/DriverAnalyticsPage';
import DriverVerificationPage from '@/components/driver/DriverVerificationPage';
import ProfilePage from '@/components/common/ProfilePage';
import SettingsPage from '@/components/common/SettingsPage';
import ChatInterface from '@/components/chat/ChatInterface';

function DriverDashboard() {
  useRequireRole(['driver']);

  return (
    <DashboardLayout userType="driver">
      <Routes>
        <Route path="/" element={<Navigate to="/driver/home" replace />} />
        <Route path="/home" element={<DriverHome />} />
        <Route path="/earnings" element={<EarningsPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/qr-generator" element={<QRGeneratorPage />} />
        <Route path="/analytics" element={<DriverAnalyticsPage />} />
        <Route path="/verification" element={<DriverVerificationPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/chat" element={<ChatInterface />} />
      </Routes>
    </DashboardLayout>
  );
}

export default DriverDashboard;