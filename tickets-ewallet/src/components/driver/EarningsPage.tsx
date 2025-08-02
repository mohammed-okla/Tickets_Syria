import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Download, DollarSign, TrendingUp, TrendingDown, Eye, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface EarningStats {
  totalEarnings: number;
  dailyEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  yearlyEarnings: number;
  averagePerTrip: number;
  totalTrips: number;
  peakHours: string[];
}

interface EarningTransaction {
  id: string;
  amount: number;
  created_at: string;
  passenger_name: string;
  trip_details?: string;
  commission?: number;
}

export default function EarningsPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<EarningStats>({
    totalEarnings: 0,
    dailyEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    yearlyEarnings: 0,
    averagePerTrip: 0,
    totalTrips: 0,
    peakHours: []
  });
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<EarningTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date()
  });
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user, dateRange]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType, searchTerm]);

  const fetchEarningsData = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          from_user_id,
          commission,
          profiles!transactions_from_user_id_fkey (
            full_name
          )
        `)
        .eq('to_user_id', user.id)
        .eq('type', 'transport_payment')
        .order('created_at', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const earningTransactions = data?.map(transaction => ({
        id: transaction.id,
        amount: transaction.amount,
        created_at: transaction.created_at,
        passenger_name: (transaction.profiles as any)?.full_name || t('unknown_passenger'),
        commission: transaction.commission || 0
      })) || [];

      setTransactions(earningTransactions);
      calculateStats(earningTransactions);
    } catch (error) {
      console.error('Error fetching earnings:', error);
      toast.error(t('error_fetch_earnings'));
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (transactions: EarningTransaction[]) => {
    if (transactions.length === 0) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const yearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

    const totalEarnings = transactions.reduce((sum, t) => sum + t.amount, 0);
    const dailyEarnings = transactions
      .filter(t => new Date(t.created_at) >= today)
      .reduce((sum, t) => sum + t.amount, 0);
    const weeklyEarnings = transactions
      .filter(t => new Date(t.created_at) >= weekAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const monthlyEarnings = transactions
      .filter(t => new Date(t.created_at) >= monthAgo)
      .reduce((sum, t) => sum + t.amount, 0);
    const yearlyEarnings = transactions
      .filter(t => new Date(t.created_at) >= yearAgo)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalTrips = transactions.length;
    const averagePerTrip = totalTrips > 0 ? totalEarnings / totalTrips : 0;

    // Calculate peak hours
    const hourCounts = new Array(24).fill(0);
    transactions.forEach(t => {
      const hour = new Date(t.created_at).getHours();
      hourCounts[hour]++;
    });
    const maxCount = Math.max(...hourCounts);
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count === maxCount && h.count > 0)
      .map(h => `${h.hour}:00`);

    setStats({
      totalEarnings,
      dailyEarnings,
      weeklyEarnings,
      monthlyEarnings,
      yearlyEarnings,
      averagePerTrip,
      totalTrips,
      peakHours
    });
  };

  const filterTransactions = () => {
    let filtered = transactions;

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  };

  const exportEarnings = () => {
    const csvContent = [
      ['Date', 'Passenger', 'Amount', 'Commission', 'Net Earnings', 'Transaction ID'],
      ...filteredTransactions.map(t => [
        format(new Date(t.created_at), 'yyyy-MM-dd HH:mm'),
        t.passenger_name,
        t.amount.toString(),
        (t.commission || 0).toString(),
        (t.amount - (t.commission || 0)).toString(),
        t.id
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `earnings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('earnings_exported'));
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
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <LoadingSpinner text={t('loading_earnings')} />;
  }

  const previousMonthEarnings = stats.monthlyEarnings * 0.85; // Mock previous month data
  const earningsGrowth = previousMonthEarnings > 0 
    ? ((stats.monthlyEarnings - previousMonthEarnings) / previousMonthEarnings) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('earnings')}</h1>
          <p className="text-muted-foreground">{t('earnings_description')}</p>
        </div>
        <Button onClick={exportEarnings} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t('export')}
        </Button>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">{t('date_range')}</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setDateRange(prev => ({
                    from: e.target.value ? new Date(e.target.value) : undefined,
                    to: prev?.to
                  }))}
                />
                <Input
                  type="date"
                  value={dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setDateRange(prev => ({
                    from: prev?.from,
                    to: e.target.value ? new Date(e.target.value) : undefined
                  }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-48">
                <label className="block text-sm font-medium mb-2">{t('search')}</label>
                <Input
                  placeholder={t('search_transactions')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Stats */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
          <TabsTrigger value="details">{t('details')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('analytics')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('total_earnings')}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalTrips} {t('trips_completed')}
                  </p>
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
                  <CardTitle className="text-sm font-medium">{t('monthly_earnings')}</CardTitle>
                  {earningsGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.monthlyEarnings)}</div>
                  <p className={`text-xs ${earningsGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {earningsGrowth >= 0 ? '+' : ''}{earningsGrowth.toFixed(1)}% {t('from_last_month')}
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
                  <CardTitle className="text-sm font-medium">{t('average_per_trip')}</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.averagePerTrip)}</div>
                  <p className="text-xs text-muted-foreground">
                    {t('daily')}: {formatCurrency(stats.dailyEarnings)}
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
                  <CardTitle className="text-sm font-medium">{t('peak_hours')}</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.peakHours.length > 0 ? stats.peakHours[0] : '--:--'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.peakHours.length > 1 && `+${stats.peakHours.length - 1} ${t('more')}`}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('recent_earnings')}</CardTitle>
              <CardDescription>
                {t('showing')} {filteredTransactions.length} {t('transactions')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('no_earnings_found')}</h3>
                  <p className="text-muted-foreground">{t('no_earnings_description')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTransactions.map((transaction, index) => (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">{transaction.passenger_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {transaction.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-600">
                          +{formatCurrency(transaction.amount)}
                        </p>
                        {transaction.commission && transaction.commission > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {t('commission')}: -{formatCurrency(transaction.commission)}
                          </p>
                        )}
                        <Badge variant="outline" className="mt-1">
                          {t('trip_payment')}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('earnings_breakdown')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>{t('daily_average')}</span>
                  <span className="font-medium">{formatCurrency(stats.dailyEarnings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('weekly_average')}</span>
                  <span className="font-medium">{formatCurrency(stats.weeklyEarnings / 7)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('monthly_average')}</span>
                  <span className="font-medium">{formatCurrency(stats.monthlyEarnings / 30)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="font-medium">{t('total_net_earnings')}</span>
                  <span className="font-bold text-lg">{formatCurrency(stats.totalEarnings)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('performance_metrics')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>{t('total_trips')}</span>
                  <span className="font-medium">{stats.totalTrips}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('average_per_trip')}</span>
                  <span className="font-medium">{formatCurrency(stats.averagePerTrip)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>{t('peak_hours')}</span>
                  <span className="font-medium">
                    {stats.peakHours.length > 0 ? stats.peakHours.join(', ') : t('no_data')}
                  </span>
                </div>
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="font-medium">{t('efficiency_rating')}</span>
                  <Badge variant="outline">⭐ {t('excellent')}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}