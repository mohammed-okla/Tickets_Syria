import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, TrendingDown, DollarSign, Car, Clock, Users, 
  MapPin, Star, BarChart3, Download, AlertTriangle, Target 
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Transaction {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  transaction_type: string;
  status: string;
  created_at: string;
  metadata?: any;
  profiles?: {
    full_name: string;
  };
}

interface QRCode {
  id: string;
  driver_id: string;
  qr_data: string;
  is_active: boolean;
  created_at: string;
  usage_count: number;
}

const DriverAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, dateRange]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      // Fetch transaction data (transport payments to this driver)
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          profiles!transactions_from_user_id_fkey (
            full_name
          )
        `)
        .eq('to_user_id', user.id)
        .eq('type', 'transport_payment')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (transactionsError) throw transactionsError;

      // Fetch QR codes data
      const { data: qrCodesData, error: qrCodesError } = await supabase
        .from('qr_codes')
        .select('*')
        .eq('driver_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (qrCodesError) throw qrCodesError;

      setTransactions(transactionsData || []);
      setQrCodes(qrCodesData || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const completedTransactions = transactions.filter(transaction => transaction.status === 'completed');
    const totalEarnings = completedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    
    // Mock data for distance and duration since we don't have actual trip data
    const avgDistance = 15; // Average 15km per trip
    const avgDuration = 30; // Average 30 minutes per trip
    const totalDistance = completedTransactions.length * avgDistance;
    const totalDuration = completedTransactions.length * avgDuration;
    const avgRating = 4.5; // Mock average rating

    const today = new Date();
    const todayTransactions = completedTransactions.filter(transaction => isToday(parseISO(transaction.created_at)));
    const todayEarnings = todayTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

    const avgTripFare = completedTransactions.length > 0 ? totalEarnings / completedTransactions.length : 0;
    const avgTripDistance = avgDistance;
    const avgTripDuration = avgDuration;

    // Calculate efficiency metrics
    const earningsPerKm = totalDistance > 0 ? totalEarnings / totalDistance : 0;
    const earningsPerHour = totalDuration > 0 ? totalEarnings / (totalDuration / 60) : 0;
    const cancellationRate = transactions.length > 0 ? (transactions.filter(t => t.status === 'cancelled').length / transactions.length) * 100 : 0;

    // Calculate growth trends
    const halfPeriod = Math.floor(parseInt(dateRange) / 2);
    const midDate = subDays(new Date(), halfPeriod);
    const recentTransactions = completedTransactions.filter(t => parseISO(t.created_at) >= midDate);
    const olderTransactions = completedTransactions.filter(t => parseISO(t.created_at) < midDate);
    const recentTotal = recentTransactions.reduce((sum, t) => sum + t.amount, 0);
    const olderTotal = olderTransactions.reduce((sum, t) => sum + t.amount, 0);
    const earningsGrowth = olderTotal > 0 ? ((recentTotal - olderTotal) / olderTotal) * 100 : 0;

    return {
      totalTrips: completedTransactions.length,
      totalEarnings,
      avgRating,
      todayEarnings,
      avgTripFare,
      avgTripDistance,
      avgTripDuration,
      earningsPerKm,
      earningsPerHour,
      cancellationRate,
      earningsGrowth,
      totalDistance,
      totalDuration
    };
  };

  // Prepare earnings trend data
  const getEarningsTrendData = () => {
    const dailyEarnings = new Map<string, number>();
    
    transactions.filter(t => t.status === 'completed').forEach(transaction => {
      const date = format(parseISO(transaction.created_at), 'yyyy-MM-dd');
      dailyEarnings.set(date, (dailyEarnings.get(date) || 0) + transaction.amount);
    });

    return Array.from(dailyEarnings.entries())
      .map(([date, amount]) => ({
        date: format(parseISO(date), 'MMM dd', { locale: language === 'ar' ? ar : undefined }),
        earnings: amount,
        trips: transactions.filter(transaction => 
          format(parseISO(transaction.created_at), 'yyyy-MM-dd') === date && 
          transaction.status === 'completed'
        ).length
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Prepare hourly performance data
  const getHourlyPerformanceData = () => {
    const hourlyStats = new Map<number, { trips: number, earnings: number }>();
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.set(hour, { trips: 0, earnings: 0 });
    }

    transactions.filter(transaction => transaction.status === 'completed').forEach(transaction => {
      const hour = parseISO(transaction.created_at).getHours();
      const current = hourlyStats.get(hour) || { trips: 0, earnings: 0 };
      hourlyStats.set(hour, {
        trips: current.trips + 1,
        earnings: current.earnings + transaction.amount
      });
    });

    return Array.from(hourlyStats.entries()).map(([hour, stats]) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      trips: stats.trips,
      earnings: stats.earnings,
      avgFare: stats.trips > 0 ? stats.earnings / stats.trips : 0
    }));
  };

  // Prepare monthly comparison data
  const getMonthlyComparisonData = () => {
    const months: Array<{
      month: string;
      trips: number;
      earnings: number;
      avgRating: number;
    }> = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthTransactions = transactions.filter(transaction => {
        const transactionDate = parseISO(transaction.created_at);
        return transactionDate >= monthStart && transactionDate <= monthEnd && transaction.status === 'completed';
      });

      months.push({
        month: format(date, 'MMM yyyy', { locale: language === 'ar' ? ar : undefined }),
        trips: monthTransactions.length,
        earnings: monthTransactions.reduce((sum, t) => sum + t.amount, 0),
        avgRating: 4.5 // Mock rating
      });
    }
    
    return months;
  };

  // Prepare location performance data
  const getLocationPerformanceData = () => {
    // Mock location data since we don't have trip location details
    const mockLocations = [
      { location: 'Damascus City Center', trips: Math.floor(Math.random() * 50) + 10, earnings: Math.floor(Math.random() * 500000) + 100000 },
      { location: 'Aleppo', trips: Math.floor(Math.random() * 40) + 8, earnings: Math.floor(Math.random() * 400000) + 80000 },
      { location: 'Lattakia', trips: Math.floor(Math.random() * 30) + 5, earnings: Math.floor(Math.random() * 300000) + 60000 },
      { location: 'Homs', trips: Math.floor(Math.random() * 25) + 5, earnings: Math.floor(Math.random() * 250000) + 50000 },
      { location: 'Daraa', trips: Math.floor(Math.random() * 20) + 3, earnings: Math.floor(Math.random() * 200000) + 40000 },
    ];

    return mockLocations
      .map(location => ({
        ...location,
        avgFare: location.earnings / location.trips,
        avgRating: 4.0 + Math.random() * 1 // Random rating between 4-5
      }))
      .sort((a, b) => b.earnings - a.earnings);
  };

  // Export analytics data
  const exportAnalytics = () => {
    const kpis = calculateKPIs();
    const analyticsData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dateRange: `${dateRange} days`,
        driverId: user?.id,
        generatedBy: 'Tickets Driver Analytics'
      },
      kpis,
      earningsTrend: getEarningsTrendData(),
      hourlyPerformance: getHourlyPerformanceData(),
      monthlyComparison: getMonthlyComparisonData(),
      locationPerformance: getLocationPerformanceData(),
      rawData: {
        transactions: transactions.length,
        qrCodes: qrCodes.length
      }
    };

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = calculateKPIs();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('driver.analytics')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('Track your earnings, performance, and business insights')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="7">{t('Last 7 days')}</option>
            <option value="30">{t('Last 30 days')}</option>
            <option value="90">{t('Last 90 days')}</option>
            <option value="365">{t('Last year')}</option>
          </select>
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('export')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('driver.totalEarnings')}</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalEarnings.toLocaleString()} SYP</div>
            <div className="flex items-center text-xs text-gray-600">
              {kpis.earningsGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={kpis.earningsGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(kpis.earningsGrowth).toFixed(1)}% vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalTrips')}</CardTitle>
            <Car className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalTrips}</div>
            <p className="text-xs text-gray-600">
              Avg fare: {kpis.avgTripFare.toLocaleString()} SYP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('averageRating')}</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgRating.toFixed(1)}</div>
            <p className="text-xs text-gray-600">
              Cancellation rate: {kpis.cancellationRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('driver.earningsPerHour')}</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.earningsPerHour.toLocaleString()}</div>
            <p className="text-xs text-gray-600">
              Per km: {kpis.earningsPerKm.toLocaleString()} SYP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="earnings">{t('earnings')}</TabsTrigger>
          <TabsTrigger value="performance">{t('driver.performance')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('monthly')}</TabsTrigger>
          <TabsTrigger value="hourly">{t('hourly')}</TabsTrigger>
          <TabsTrigger value="locations">{t('locations')}</TabsTrigger>
          <TabsTrigger value="efficiency">{t('driver.efficiency')}</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('driver.earningsTrend')}</CardTitle>
                <CardDescription>
                  {t('Daily earnings and trip volume over time')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('line')}
                >
                  {t('Line')}
                </Button>
                <Button
                  variant={chartType === 'area' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('area')}
                >
                  {t('Area')}
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                >
                  {t('Bar')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={getEarningsTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'earnings' ? 'SYP' : ''}`,
                          name === 'earnings' ? 'Earnings' : 'Trips'
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="earnings" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="trips" stroke="#82ca9d" strokeWidth={2} />
                    </LineChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={getEarningsTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'earnings' ? 'SYP' : ''}`,
                          name === 'earnings' ? 'Earnings' : 'Trips'
                        ]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="earnings" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </AreaChart>
                  ) : (
                    <BarChart data={getEarningsTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'earnings' ? 'SYP' : ''}`,
                          name === 'earnings' ? 'Earnings' : 'Trips'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="earnings" fill="#8884d8" />
                      <Bar dataKey="trips" fill="#82ca9d" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('driver.performanceMetrics')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Trip Distance</span>
                    <span className="font-semibold">{kpis.avgTripDistance.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Trip Duration</span>
                    <span className="font-semibold">{Math.round(kpis.avgTripDuration / 60)} min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Distance</span>
                    <span className="font-semibold">{kpis.totalDistance.toLocaleString()} km</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Duration</span>
                    <span className="font-semibold">{Math.round(kpis.totalDuration / 3600)} hrs</span>
                  </div>
                </div>
                
                {kpis.cancellationRate > 10 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">
                      High cancellation rate detected
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('driver.ratingDistribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '5 Stars', value: Math.floor(transactions.length * 0.6), fill: '#10B981' },
                          { name: '4 Stars', value: Math.floor(transactions.length * 0.3), fill: '#84CC16' },
                          { name: '3 Stars', value: Math.floor(transactions.length * 0.08), fill: '#F59E0B' },
                          { name: '2 Stars', value: Math.floor(transactions.length * 0.02), fill: '#F97316' },
                          { name: '1 Star', value: Math.floor(transactions.length * 0.01), fill: '#EF4444' },
                        ].filter(item => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: '5 Stars', value: Math.floor(transactions.length * 0.6), fill: '#10B981' },
                          { name: '4 Stars', value: Math.floor(transactions.length * 0.3), fill: '#84CC16' },
                          { name: '3 Stars', value: Math.floor(transactions.length * 0.08), fill: '#F59E0B' },
                          { name: '2 Stars', value: Math.floor(transactions.length * 0.02), fill: '#F97316' },
                          { name: '1 Star', value: Math.floor(transactions.length * 0.01), fill: '#EF4444' },
                        ].filter(item => item.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('driver.monthlyComparison')}</CardTitle>
              <CardDescription>
                {t('Compare performance across different months')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyComparisonData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'earnings' ? `${value} SYP` : 
                        name === 'avgRating' ? `${value}/5` : value,
                        name === 'earnings' ? 'Earnings' : 
                        name === 'trips' ? 'Trips' :
                        'Avg Rating'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="earnings" fill="#8884d8" />
                    <Bar dataKey="trips" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hourly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('driver.hourlyPerformance')}</CardTitle>
              <CardDescription>
                {t('Analyze your busiest hours and earnings patterns')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getHourlyPerformanceData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'earnings' || name === 'avgFare' ? `${value} SYP` : value,
                        name === 'earnings' ? 'Earnings' : 
                        name === 'trips' ? 'Trips' :
                        'Avg Fare'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="trips" fill="#82ca9d" />
                    <Bar dataKey="earnings" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('driver.locationPerformance')}</CardTitle>
              <CardDescription>
                {t('Areas with highest earnings and trip frequency')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getLocationPerformanceData().map((location, index) => (
                  <div key={location.location} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h4 className="font-semibold">{location.location}</h4>
                        <p className="text-sm text-gray-600">
                          {location.trips} trips • 
                          {location.avgRating.toFixed(1)} ⭐
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{location.earnings.toLocaleString()} SYP</p>
                      <p className="text-sm text-gray-600">
                        {location.avgFare.toLocaleString()} SYP/trip
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>{t('driver.efficiency')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Earnings per KM</span>
                    <span className="font-bold text-green-600">
                      {kpis.earningsPerKm.toLocaleString()} SYP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Earnings per Hour</span>
                    <span className="font-bold text-blue-600">
                      {kpis.earningsPerHour.toLocaleString()} SYP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Average Trip Fare</span>
                    <span className="font-bold text-purple-600">
                      {kpis.avgTripFare.toLocaleString()} SYP
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    {kpis.avgRating < 4.5 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Target className="h-4 w-4" />
                        <span>Focus on improving customer service to boost ratings</span>
                      </div>
                    )}
                    {kpis.cancellationRate > 10 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Work on reducing trip cancellations</span>
                      </div>
                    )}
                    {kpis.earningsPerHour < 500 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>Consider working during peak hours for better earnings</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('driver.todaySnapshot')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">
                    <h3 className="text-2xl font-bold">{kpis.todayEarnings.toLocaleString()}</h3>
                    <p className="text-purple-100">Today's Earnings</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">{transactions.filter(t => isToday(parseISO(t.created_at)) && t.status === 'completed').length}</h4>
                      <p className="text-sm text-gray-600">Today's Trips</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">{kpis.avgRating.toFixed(1)}</h4>
                      <p className="text-sm text-gray-600">Overall Rating</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DriverAnalyticsPage;