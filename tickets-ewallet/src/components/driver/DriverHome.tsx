import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Car, DollarSign, Users, QrCode, TrendingUp, MapPin, Clock, Calendar, Eye, EyeOff, BarChart3, AlertTriangle, Shield } from 'lucide-react';
import { supabase, VerificationStatus } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface DriverStats {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalTrips: number;
  dailyTrips: number;
  activeQRCodes: number;
  averageRating: number;
}

interface RecentTrip {
  id: string;
  passenger_name: string;
  amount: number;
  created_at: string;
  status: string;
  pickup_location?: string;
  dropoff_location?: string;
}

export default function DriverHome() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<DriverStats>({
    totalEarnings: 0,
    dailyEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalTrips: 0,
    dailyTrips: 0,
    activeQRCodes: 0,
    averageRating: 0
  });
  const [recentTrips, setRecentTrips] = useState<RecentTrip[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_submitted');
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(false);

  useEffect(() => {
    if (user) {
      Promise.all([
        fetchDriverStats(),
        fetchRecentTrips(),
        fetchVerificationStatus()
      ]).finally(() => setLoading(false));
    }
  }, [user]);

  const fetchDriverStats = async () => {
    if (!user) return;

    try {
      // Fetch driver earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from('transactions')
        .select('amount, created_at')
        .eq('to_user_id', user.id)
        .eq('type', 'transport_payment');

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

      // Fetch trip counts
      const totalTrips = earnings.length;
      const dailyTrips = earnings.filter(t => new Date(t.created_at) >= today).length;

      // Fetch active QR codes
      const { data: qrData, error: qrError } = await supabase
        .from('qr_codes')
        .select('id')
        .eq('driver_id', user.id)
        .eq('is_active', true);

      if (qrError) throw qrError;

      setStats({
        totalEarnings,
        dailyEarnings,
        weeklyEarnings,
        monthlyEarnings,
        totalTrips,
        dailyTrips,
        activeQRCodes: qrData?.length || 0,
        averageRating: 4.5 // Mock rating for now
      });
    } catch (error) {
      console.error('Error fetching driver stats:', error);
    }
  };

  const fetchRecentTrips = async () => {
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
          profiles!transactions_from_user_id_fkey (
            full_name
          )
        `)
        .eq('to_user_id', user.id)
        .eq('type', 'transport_payment')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const trips = data?.map(trip => ({
        id: trip.id,
        passenger_name: (trip.profiles as any)?.full_name || t('unknown_passenger'),
        amount: trip.amount,
        created_at: trip.created_at,
        status: trip.status,
        pickup_location: 'Damascus', // Mock data
        dropoff_location: 'Aleppo' // Mock data
      })) || [];

      setRecentTrips(trips);
    } catch (error) {
      console.error('Error fetching recent trips:', error);
    }
  };

  const fetchVerificationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('verification_status')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching verification status:', error);
        return;
      }

      if (data) {
        setVerificationStatus(data.verification_status || 'not_submitted');
      }
    } catch (error) {
      console.error('Error:', error);
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

  const dailyGoal = 50000; // SYP
  const dailyProgress = (stats.dailyEarnings / dailyGoal) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold">{t('driver_dashboard')}</h1>
        <p className="text-muted-foreground">{t('driver_dashboard_description')}</p>
      </motion.div>

      {/* Verification Status Alert */}
      {verificationStatus !== 'approved' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Alert 
            className={`border-l-4 ${
              verificationStatus === 'rejected' ? 'border-l-red-500 bg-red-50 dark:bg-red-950' :
              verificationStatus === 'pending' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950' :
              'border-l-blue-500 bg-blue-50 dark:bg-blue-950'
            }`}
          >
            <div className="flex items-center gap-3">
              {verificationStatus === 'rejected' ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : verificationStatus === 'pending' ? (
                <Clock className="h-5 w-5 text-yellow-600" />
              ) : (
                <Shield className="h-5 w-5 text-blue-600" />
              )}
              <div className="flex-1">
                <h4 className="font-medium mb-1">
                  {verificationStatus === 'rejected' && t('driver.verification.status.rejected')}
                  {verificationStatus === 'pending' && t('driver.verification.status.pending')}
                  {verificationStatus === 'not_submitted' && t('driver.verification.title')}
                </h4>
                <AlertDescription className="text-sm">
                  {verificationStatus === 'rejected' && t('driver.verification.rejectedMessage')}
                  {verificationStatus === 'pending' && 'Your verification is being reviewed. You will be notified once approved.'}
                  {verificationStatus === 'not_submitted' && 'Complete your driver verification to start earning with passengers.'}
                </AlertDescription>
              </div>
              <Link to="/driver/verification">
                <Button 
                  variant={verificationStatus === 'rejected' ? 'destructive' : 'default'}
                  size="sm"
                >
                  {verificationStatus === 'rejected' ? 'Resubmit' : 
                   verificationStatus === 'pending' ? 'View Status' : 
                   'Start Verification'}
                </Button>
              </Link>
            </div>
          </Alert>
        </motion.div>
      )}

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
                {t('weekly')}: {balanceVisible ? formatCurrency(stats.weeklyEarnings) : '••••••'}
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
              <CardTitle className="text-sm font-medium">{t('total_trips')}</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
              <p className="text-xs text-muted-foreground">
                {stats.dailyTrips} {t('today')}
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
              <CardTitle className="text-sm font-medium">{t('active_qr_codes')}</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeQRCodes}</div>
              <p className="text-xs text-muted-foreground">
                ⭐ {stats.averageRating.toFixed(1)} {t('rating')}
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
            <CardDescription>{t('quick_actions_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button asChild className="h-20 flex flex-col">
                <Link to="/driver/qr-generator">
                  <QrCode className="h-6 w-6 mb-2" />
                  {t('generate_qr_code')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex flex-col">
                <Link to="/driver/trips">
                  <Car className="h-6 w-6 mb-2" />
                  {t('view_trips')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex flex-col">
                <Link to="/driver/earnings">
                  <DollarSign className="h-6 w-6 mb-2" />
                  {t('view_earnings')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex flex-col">
                <Link to="/driver/analytics">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  {t('view_analytics')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Trips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('recent_trips')}</CardTitle>
            <CardDescription>{t('recent_trips_description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTrips.length === 0 ? (
              <div className="text-center py-8">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">{t('no_trips_yet')}</h3>
                <p className="text-muted-foreground">{t('no_trips_description')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTrips.map((trip, index) => (
                  <motion.div
                    key={trip.id}
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
                        <p className="font-medium">{trip.passenger_name}</p>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3 mr-1" />
                          {trip.pickup_location} → {trip.dropoff_location}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(trip.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(trip.amount)}
                      </p>
                      {getStatusBadge(trip.status)}
                    </div>
                  </motion.div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/driver/trips">{t('view_all_trips')}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}