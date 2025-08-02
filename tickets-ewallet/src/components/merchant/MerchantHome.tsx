import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Store, DollarSign, QrCode, TrendingUp, Users, ShoppingCart, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface MerchantStats {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalTransactions: number;
  dailyTransactions: number;
  activeQRCodes: number;
  uniqueCustomers: number;
}

interface RecentTransaction {
  id: string;
  customer_name: string;
  amount: number;
  created_at: string;
  status: string;
  payment_method: string;
}

export default function MerchantHome() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<MerchantStats>({
    totalEarnings: 0,
    dailyEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalTransactions: 0,
    dailyTransactions: 0,
    activeQRCodes: 0,
    uniqueCustomers: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(false);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchMerchantStats(),
        fetchRecentTransactions()
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  const fetchMerchantStats = async () => {
    if (!user) return;

    try {
      // Fetch merchant earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('transactions')
        .select('amount, created_at, from_user_id')
        .eq('to_user_id', user.id)
        .eq('type', 'merchant_payment');

      if (earningsError) throw earningsError;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const earnings = earningsData || [];
      const totalEarnings = earnings.reduce((sum, t) => sum + t.amount, 0);
      const dailyEarnings = earnings
        .filter(t => new Date(t.created_at) >= today)
        .reduce((sum, t) => sum + t.amount, 0);
      const weeklyEarnings = earnings
        .filter(t => new Date(t.created_at) >= weekAgo)
        .reduce((sum, t) => sum + t.amount, 0);
      const monthlyEarnings = earnings
        .filter(t => new Date(t.created_at) >= monthAgo)
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate transaction counts
      const totalTransactions = earnings.length;
      const dailyTransactions = earnings.filter(t => new Date(t.created_at) >= today).length;

      // Calculate unique customers
      const uniqueCustomers = new Set(earnings.map(t => t.from_user_id)).size;

      // Fetch active QR codes
      const { data: qrData, error: qrError } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('driver_id', user.id) // Using driver_id field for merchants as well
        .eq('is_active', true);

      if (qrError) throw qrError;

      setStats({
        totalEarnings,
        dailyEarnings,
        weeklyEarnings,
        monthlyEarnings,
        totalTransactions,
        dailyTransactions,
        activeQRCodes: qrData?.length || 0,
        uniqueCustomers
      });
    } catch (error) {
      console.error('Error fetching merchant stats:', error);
    }
  };

  const fetchRecentTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          status,
          from_user_id,
          metadata,
          profiles!transactions_from_user_id_fkey (
            full_name
          )
        `)
        .eq('to_user_id', user.id)
        .eq('type', 'merchant_payment')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const transactions = data?.map(transaction => ({
        id: transaction.id,
        customer_name: (transaction.profiles as any)?.full_name || t('unknown_customer'),
        amount: transaction.amount,
        created_at: transaction.created_at,
        status: transaction.status,
        payment_method: (transaction.metadata as any)?.payment_method || 'wallet'
      })) || [];

      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SY' : 'en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, label: t('completed') },
      pending: { variant: 'outline' as const, label: t('pending') },
      cancelled: { variant: 'destructive' as const, label: t('cancelled') }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <LoadingSpinner text={t('loading_dashboard')} />;
  }

  const dailyGoal = 100000; // SYP
  const dailyProgress = (stats.dailyEarnings / dailyGoal) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold">{t('merchant_dashboard')}</h1>
        <p className="text-muted-foreground">{t('merchant_dashboard_description')}</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('daily_earnings')}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="h-4 w-4"
              >
                {balanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balanceVisible ? formatCurrency(stats.dailyEarnings) : '••••••'}
              </div>
              <div className="mt-2">
                <Progress value={dailyProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(dailyProgress)}% {t('of_daily_goal')}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('total_earnings')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {balanceVisible ? formatCurrency(stats.totalEarnings) : '••••••'}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                {t('monthly')}: {balanceVisible ? formatCurrency(stats.monthlyEarnings) : '••••••'}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('transactions')}</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions}</div>
              <p className="text-xs text-muted-foreground">
                {stats.dailyTransactions} {t('today')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('customers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeQRCodes} {t('active_qr_codes')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('quick_actions')}</CardTitle>
            <CardDescription>{t('merchant_quick_actions_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button asChild className="h-20 flex flex-col">
                <Link to="/merchant/qr-codes">
                  <QrCode className="h-6 w-6 mb-2" />
                  {t('create_qr_code')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex flex-col">
                <Link to="/merchant/payments">
                  <DollarSign className="h-6 w-6 mb-2" />
                  {t('view_payments')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex flex-col">
                <Link to="/merchant/business">
                  <Store className="h-6 w-6 mb-2" />
                  {t('manage_business')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex flex-col">
                <Link to="/merchant/analytics">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  {t('view_analytics')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('recent_transactions')}</CardTitle>
            <CardDescription>{t('recent_merchant_transactions_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('no_transactions_yet')}</h3>
                <p className="text-muted-foreground">{t('no_merchant_transactions_description')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{transaction.customer_name}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span className="mr-2">{t('payment_method')}: {t(transaction.payment_method)}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <span>{formatDate(transaction.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(transaction.amount)}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </motion.div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/merchant/payments">{t('view_all_payments')}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}