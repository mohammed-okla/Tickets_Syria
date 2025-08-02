import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRequireRole } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import MerchantHome from '@/components/merchant/MerchantHome';
import BusinessPage from '@/components/merchant/BusinessPage';
import PaymentsPage from '@/components/merchant/PaymentsPage';
import QRCodesPage from '@/components/merchant/QRCodesPage';
import AnalyticsPage from '@/components/merchant/AnalyticsPage';
import ProfilePage from '@/components/common/ProfilePage';
import SettingsPage from '@/components/common/SettingsPage';
import ChatInterface from '@/components/chat/ChatInterface';
import WithdrawalPage from '@/components/common/WithdrawalPage';

function MerchantDashboard() {
  useRequireRole(['merchant']);

  return (
    <DashboardLayout userType="merchant">
      <Routes>
        <Route path="/" element={<Navigate to="/merchant/home" replace />} />
        <Route path="/home" element={<MerchantHome />} />
        <Route path="/business" element={<BusinessPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/qr-codes" element={<QRCodesPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/chat" element={<ChatInterface />} />
        <Route path="/withdrawal" element={<WithdrawalPage />} />
      </Routes>
    </DashboardLayout>
  );
}

export default MerchantDashboard;