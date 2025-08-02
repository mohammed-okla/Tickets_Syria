import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, parseISO, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, TrendingDown, Users, DollarSign, Activity, Shield, 
  AlertTriangle, Target, Download, BarChart3, Globe, Smartphone
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface PlatformMetrics {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  platformFees: number;
  avgTransactionValue: number;
  userGrowthRate: number;
  revenueGrowthRate: number;
}

interface UserActivity {
  user_type: 'passenger' | 'driver' | 'merchant' | 'event_admin' | 'admin';
  count: number;
  active_count: number;
  revenue_generated: number;
}

interface TransactionData {
  id: string;
  amount: number;
  fee: number;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  user_type: string;
  created_at: string;
}

interface SecurityEvent {
  id: string;
  event_type: 'failed_login' | 'suspicious_transaction' | 'fraud_attempt' | 'security_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: string;
  details: string;
  created_at: string;
}

const SystemAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  useEffect(() => {
    if (user) {
      fetchSystemAnalytics();
    }
  }, [user, dateRange]);

  const fetchSystemAnalytics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(dateRange));
      
      // Simulate platform-wide data (in real implementation, this would aggregate from all tables)
      const mockPlatformMetrics: PlatformMetrics = {
        totalUsers: 15420,
        activeUsers: 8930,
        totalTransactions: 45280,
        totalRevenue: 1250000,
        platformFees: 125000,
        avgTransactionValue: 2760,
        userGrowthRate: 12.5,
        revenueGrowthRate: 18.3
      };

      const mockUserActivity: UserActivity[] = [
        { user_type: 'passenger', count: 8500, active_count: 5200, revenue_generated: 680000 },
        { user_type: 'driver', count: 2800, active_count: 1850, revenue_generated: 420000 },
        { user_type: 'merchant', count: 3200, active_count: 1600, revenue_generated: 125000 },
        { user_type: 'event_admin', count: 850, active_count: 260, revenue_generated: 25000 },
        { user_type: 'admin', count: 70, active_count: 20, revenue_generated: 0 }
      ];

      // Generate mock transaction data
      const mockTransactions: TransactionData[] = [];
      for (let i = 0; i < 1000; i++) {
        const date = new Date(startDate.getTime() + Math.random() * (new Date().getTime() - startDate.getTime()));
        mockTransactions.push({
          id: `tx_${i}`,
          amount: Math.floor(Math.random() * 10000) + 100,
          fee: Math.floor(Math.random() * 100) + 10,
          status: Math.random() > 0.1 ? 'completed' : Math.random() > 0.5 ? 'pending' : 'failed',
          payment_method: ['MTN Cash', 'Syriatel Cash', 'ShamCash', 'Card'][Math.floor(Math.random() * 4)],
          user_type: ['passenger', 'driver', 'merchant', 'event_admin'][Math.floor(Math.random() * 4)],
          created_at: date.toISOString()
        });
      }

      // Generate mock security events
      const mockSecurityEvents: SecurityEvent[] = [];
      const eventTypes: SecurityEvent['event_type'][] = ['failed_login', 'suspicious_transaction', 'fraud_attempt', 'security_violation'];
      const severities: SecurityEvent['severity'][] = ['low', 'medium', 'high', 'critical'];
      
      for (let i = 0; i < 50; i++) {
        const date = new Date(startDate.getTime() + Math.random() * (new Date().getTime() - startDate.getTime()));
        mockSecurityEvents.push({
          id: `sec_${i}`,
          event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          user_id: Math.random() > 0.3 ? `user_${Math.floor(Math.random() * 1000)}` : undefined,
          details: 'Security event detected by automated monitoring system',
          created_at: date.toISOString()
        });
      }

      setPlatformMetrics(mockPlatformMetrics);
      setUserActivity(mockUserActivity);
      setTransactions(mockTransactions);
      setSecurityEvents(mockSecurityEvents);
    } catch (error) {
      console.error('Error fetching system analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare revenue trend data
  const getRevenueTrendData = () => {
    const dailyRevenue = new Map<string, { revenue: number, transactions: number, fees: number }>();
    
    transactions.filter(t => t.status === 'completed').forEach(transaction => {
      const date = format(parseISO(transaction.created_at), 'yyyy-MM-dd');
      const current = dailyRevenue.get(date) || { revenue: 0, transactions: 0, fees: 0 };
      dailyRevenue.set(date, {
        revenue: current.revenue + transaction.amount,
        transactions: current.transactions + 1,
        fees: current.fees + transaction.fee
      });
    });

    return Array.from(dailyRevenue.entries())
      .map(([date, data]) => ({
        date: format(parseISO(date), 'MMM dd', { locale: language === 'ar' ? ar : undefined }),
        revenue: data.revenue,
        transactions: data.transactions,
        fees: data.fees
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Prepare user growth data
  const getUserGrowthData = () => {
    const userTypeColors = {
      passenger: '#8884d8',
      driver: '#82ca9d',
      merchant: '#ffc658',
      event_admin: '#ff7c7c',
      admin: '#8dd1e1'
    };

    return userActivity.map(activity => ({
      name: activity.user_type.charAt(0).toUpperCase() + activity.user_type.slice(1),
      total: activity.count,
      active: activity.active_count,
      revenue: activity.revenue_generated,
      color: userTypeColors[activity.user_type]
    }));
  };

  // Prepare payment method analysis
  const getPaymentMethodData = () => {
    const methodStats = new Map<string, { transactions: number, revenue: number, successRate: number }>();
    
    transactions.forEach(transaction => {
      const method = transaction.payment_method;
      const current = methodStats.get(method) || { transactions: 0, revenue: 0, successRate: 0 };
      methodStats.set(method, {
        transactions: current.transactions + 1,
        revenue: current.revenue + (transaction.status === 'completed' ? transaction.amount : 0),
        successRate: 0 // Will calculate below
      });
    });

    // Calculate success rates
    methodStats.forEach((stats, method) => {
      const methodTransactions = transactions.filter(t => t.payment_method === method);
      const successful = methodTransactions.filter(t => t.status === 'completed').length;
      stats.successRate = methodTransactions.length > 0 ? (successful / methodTransactions.length) * 100 : 0;
    });

    return Array.from(methodStats.entries())
      .map(([name, stats]) => ({
        name,
        transactions: stats.transactions,
        revenue: stats.revenue,
        successRate: stats.successRate
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Prepare security events analysis
  const getSecurityAnalysis = () => {
    const eventTypes = new Map<string, number>();
    const severityCount = new Map<string, number>();
    
    securityEvents.forEach(event => {
      eventTypes.set(event.event_type, (eventTypes.get(event.event_type) || 0) + 1);
      severityCount.set(event.severity, (severityCount.get(event.severity) || 0) + 1);
    });

    const todayEvents = securityEvents.filter(event => isToday(parseISO(event.created_at)));
    const criticalEvents = securityEvents.filter(event => event.severity === 'critical');

    return {
      totalEvents: securityEvents.length,
      todayEvents: todayEvents.length,
      criticalEvents: criticalEvents.length,
      eventTypes: Array.from(eventTypes.entries()).map(([type, count]) => ({ type, count })),
      severityDistribution: Array.from(severityCount.entries()).map(([severity, count]) => ({ severity, count }))
    };
  };

  // Export analytics data
  const exportAnalytics = () => {
    const analyticsData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dateRange: `${dateRange} days`,
        adminId: user?.id,
        generatedBy: 'Tickets System Analytics'
      },
      platformMetrics,
      userActivity,
      revenueTrend: getRevenueTrendData(),
      paymentMethods: getPaymentMethodData(),
      securityAnalysis: getSecurityAnalysis(),
      rawData: {
        transactions: transactions.length,
        securityEvents: securityEvents.length
      }
    };

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || !platformMetrics) {
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
            System Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Platform-wide business intelligence and performance monitoring
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button onClick={exportAnalytics} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-gray-600">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">
                {platformMetrics.userGrowthRate}% growth
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.totalRevenue.toLocaleString()} SYP</div>
            <div className="flex items-center text-xs text-gray-600">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">
                {platformMetrics.revenueGrowthRate}% vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformMetrics.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-600">
              {((platformMetrics.activeUsers / platformMetrics.totalUsers) * 100).toFixed(1)}% of total users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getSecurityAnalysis().totalEvents}</div>
            <p className="text-xs text-gray-600">
              {getSecurityAnalysis().criticalEvents} critical events
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Platform Performance</CardTitle>
                <CardDescription>Key metrics overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Transactions</span>
                    <span className="font-semibold">{platformMetrics.totalTransactions.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Transaction Value</span>
                    <span className="font-semibold">{platformMetrics.avgTransactionValue.toLocaleString()} SYP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Platform Fees Collected</span>
                    <span className="font-semibold">{platformMetrics.platformFees.toLocaleString()} SYP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-semibold">
                      {((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getUserGrowthData()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="total"
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {getUserGrowthData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
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

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity by Type</CardTitle>
              <CardDescription>User counts and activity levels across different user types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getUserGrowthData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        value,
                        name === 'total' ? 'Total Users' : name === 'active' ? 'Active Users' : 'Revenue Generated'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="total" fill="#8884d8" />
                    <Bar dataKey="active" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily platform revenue and transaction volume</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={chartType === 'line' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('line')}
                >
                  Line
                </Button>
                <Button
                  variant={chartType === 'area' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('area')}
                >
                  Area
                </Button>
                <Button
                  variant={chartType === 'bar' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setChartType('bar')}
                >
                  Bar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'line' ? (
                    <LineChart data={getRevenueTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' || name === 'fees' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'fees' ? 'Fees' : 'Transactions'
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="fees" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="transactions" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={getRevenueTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' || name === 'fees' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'fees' ? 'Fees' : 'Transactions'
                        ]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                      <Area type="monotone" dataKey="fees" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                    </AreaChart>
                  ) : (
                    <BarChart data={getRevenueTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' || name === 'fees' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'fees' ? 'Fees' : 'Transactions'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" />
                      <Bar dataKey="fees" fill="#82ca9d" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods Performance</CardTitle>
              <CardDescription>Usage and success rates by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getPaymentMethodData().map((method, index) => (
                  <div key={method.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-6 w-6 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">{method.name}</h4>
                        <p className="text-sm text-gray-600">
                          {method.transactions} transactions • {method.successRate.toFixed(1)}% success rate
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{method.revenue.toLocaleString()} SYP</p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${method.successRate >= 95 ? 'bg-green-500' : method.successRate >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${method.successRate}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-600">{method.successRate.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Recent security incidents and alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Events (last {dateRange} days)</span>
                    <span className="font-semibold">{getSecurityAnalysis().totalEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Today's Events</span>
                    <span className="font-semibold">{getSecurityAnalysis().todayEvents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Critical Events</span>
                    <span className="font-semibold text-red-600">{getSecurityAnalysis().criticalEvents}</span>
                  </div>
                </div>

                {getSecurityAnalysis().criticalEvents > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-700">
                      Immediate attention required for critical security events
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getSecurityAnalysis().eventTypes.map((event, index) => (
                    <div key={event.type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm capitalize">{event.type.replace('_', ' ')}</span>
                      <Badge variant="outline">{event.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Intelligence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Revenue per Active User</span>
                    <span className="font-bold text-green-600">
                      {(platformMetrics.totalRevenue / platformMetrics.activeUsers).toLocaleString()} SYP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Platform Commission Rate</span>
                    <span className="font-bold text-blue-600">
                      {((platformMetrics.platformFees / platformMetrics.totalRevenue) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">User Engagement Rate</span>
                    <span className="font-bold text-purple-600">
                      {((platformMetrics.activeUsers / platformMetrics.totalUsers) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Strategic Insights</h4>
                  <div className="space-y-2 text-sm">
                    {platformMetrics.userGrowthRate > 10 && (
                      <div className="flex items-center gap-2 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>Strong user growth indicates healthy market demand</span>
                      </div>
                    )}
                    {((platformMetrics.activeUsers / platformMetrics.totalUsers) * 100) < 60 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Target className="h-4 w-4" />
                        <span>Focus on user activation and engagement strategies</span>
                      </div>
                    )}
                    {getSecurityAnalysis().criticalEvents > 5 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <Shield className="h-4 w-4" />
                        <span>Elevated security monitoring recommended</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg">
                    <h3 className="text-2xl font-bold">{platformMetrics.platformFees.toLocaleString()}</h3>
                    <p className="text-green-100">Platform Fees Collected</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">
                        {((transactions.filter(t => t.status === 'completed').length / transactions.length) * 100).toFixed(1)}%
                      </h4>
                      <p className="text-sm text-gray-600">Success Rate</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">{platformMetrics.avgTransactionValue.toLocaleString()}</h4>
                      <p className="text-sm text-gray-600">Avg Transaction</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Quick Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Most active user type:</span>
                        <span className="font-semibold">
                          {getUserGrowthData().reduce((max, user) => 
                            user.active > max.active ? user : max
                          ).name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Highest revenue user type:</span>
                        <span className="font-semibold">
                          {getUserGrowthData().reduce((max, user) => 
                            user.revenue > max.revenue ? user : max
                          ).name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Top payment method:</span>
                        <span className="font-semibold">
                          {getPaymentMethodData()[0]?.name || 'N/A'}
                        </span>
                      </div>
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

export default SystemAnalyticsPage;