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
  TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Clock, 
  Star, BarChart3, Download, Target, CreditCard, Repeat
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Transaction {
  id: string;
  customer_id: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'completed' | 'pending' | 'failed';
  payment_method: string;
  category: string;
  created_at: string;
}

interface Customer {
  id: string;
  total_spent: number;
  transaction_count: number;
  last_visit: string;
  avg_rating: number;
}

const MerchantAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
      
      // Fetch transactions data
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('merchant_transactions')
        .select('*')
        .eq('merchant_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (transactionsError) throw transactionsError;

      // Fetch customer analytics (simulated)
      const completedTransactions = transactionsData?.filter(t => t.status === 'completed') || [];
      const customerStats = new Map<string, { spent: number, count: number, lastVisit: string, ratings: number[] }>();
      
      completedTransactions.forEach(transaction => {
        const customerId = transaction.customer_id;
        const current = customerStats.get(customerId) || { spent: 0, count: 0, lastVisit: transaction.created_at, ratings: [] };
        customerStats.set(customerId, {
          spent: current.spent + transaction.net_amount,
          count: current.count + 1,
          lastVisit: transaction.created_at > current.lastVisit ? transaction.created_at : current.lastVisit,
          ratings: [...current.ratings, Math.floor(Math.random() * 2) + 4] // Simulate ratings 4-5
        });
      });

      const customerAnalytics = Array.from(customerStats.entries()).map(([id, stats]) => ({
        id,
        total_spent: stats.spent,
        transaction_count: stats.count,
        last_visit: stats.lastVisit,
        avg_rating: stats.ratings.length > 0 ? stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length : 0
      }));

      setTransactions(transactionsData || []);
      setCustomers(customerAnalytics);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const completedTransactions = transactions.filter(t => t.status === 'completed');
    const totalRevenue = completedTransactions.reduce((sum, t) => sum + t.net_amount, 0);
    const totalFees = completedTransactions.reduce((sum, t) => sum + t.fee, 0);
    const totalCustomers = new Set(completedTransactions.map(t => t.customer_id)).size;
    const avgTransactionValue = completedTransactions.length > 0 ? totalRevenue / completedTransactions.length : 0;
    
    const today = new Date();
    const todayTransactions = completedTransactions.filter(t => isToday(parseISO(t.created_at)));
    const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.net_amount, 0);
    
    // Calculate growth trends
    const halfPeriod = Math.floor(parseInt(dateRange) / 2);
    const midDate = subDays(new Date(), halfPeriod);
    const recentTransactions = completedTransactions.filter(t => parseISO(t.created_at) >= midDate);
    const olderTransactions = completedTransactions.filter(t => parseISO(t.created_at) < midDate);
    const recentRevenue = recentTransactions.reduce((sum, t) => sum + t.net_amount, 0);
    const olderRevenue = olderTransactions.reduce((sum, t) => sum + t.net_amount, 0);
    const revenueGrowth = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0;

    // Customer metrics
    const repeatCustomers = customers.filter(c => c.transaction_count > 1).length;
    const customerRetentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;
    const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    // Success rate
    const successRate = transactions.length > 0 ? (completedTransactions.length / transactions.length) * 100 : 0;

    return {
      totalRevenue,
      totalTransactions: completedTransactions.length,
      totalCustomers,
      avgTransactionValue,
      todayRevenue,
      revenueGrowth,
      customerRetentionRate,
      avgCustomerValue,
      successRate,
      totalFees
    };
  };

  // Prepare revenue trend data
  const getRevenueTrendData = () => {
    const dailyRevenue = new Map<string, { revenue: number, transactions: number, customers: Set<string> }>();
    
    transactions.filter(t => t.status === 'completed').forEach(transaction => {
      const date = format(parseISO(transaction.created_at), 'yyyy-MM-dd');
      const current = dailyRevenue.get(date) || { revenue: 0, transactions: 0, customers: new Set() };
      current.customers.add(transaction.customer_id);
      dailyRevenue.set(date, {
        revenue: current.revenue + transaction.net_amount,
        transactions: current.transactions + 1,
        customers: current.customers
      });
    });

    return Array.from(dailyRevenue.entries())
      .map(([date, data]) => ({
        date: format(parseISO(date), 'MMM dd', { locale: language === 'ar' ? ar : undefined }),
        revenue: data.revenue,
        transactions: data.transactions,
        customers: data.customers.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Prepare category breakdown data
  const getCategoryBreakdownData = () => {
    const categoryStats = new Map<string, { revenue: number, transactions: number }>();
    
    transactions.filter(t => t.status === 'completed').forEach(transaction => {
      const category = transaction.category || 'Other';
      const current = categoryStats.get(category) || { revenue: 0, transactions: 0 };
      categoryStats.set(category, {
        revenue: current.revenue + transaction.net_amount,
        transactions: current.transactions + 1
      });
    });

    return Array.from(categoryStats.entries())
      .map(([name, stats]) => ({
        name,
        value: stats.revenue,
        transactions: stats.transactions,
        percentage: 0 // Will be calculated below
      }))
      .sort((a, b) => b.value - a.value);
  };

  // Prepare payment method analysis
  const getPaymentMethodData = () => {
    const methodStats = new Map<string, { revenue: number, transactions: number, successRate: number }>();
    
    transactions.forEach(transaction => {
      const method = transaction.payment_method || 'Unknown';
      const current = methodStats.get(method) || { revenue: 0, transactions: 0, successRate: 0 };
      methodStats.set(method, {
        revenue: current.revenue + (transaction.status === 'completed' ? transaction.net_amount : 0),
        transactions: current.transactions + 1,
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
        revenue: stats.revenue,
        transactions: stats.transactions,
        successRate: stats.successRate
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Prepare customer segments
  const getCustomerSegments = () => {
    const segments = {
      highValue: customers.filter(c => c.total_spent > 10000).length,
      mediumValue: customers.filter(c => c.total_spent >= 5000 && c.total_spent <= 10000).length,
      lowValue: customers.filter(c => c.total_spent < 5000).length,
      frequent: customers.filter(c => c.transaction_count >= 10).length,
      occasional: customers.filter(c => c.transaction_count >= 3 && c.transaction_count < 10).length,
      rare: customers.filter(c => c.transaction_count < 3).length
    };

    return [
      { name: 'High Value (>10K)', value: segments.highValue, color: '#10B981' },
      { name: 'Medium Value (5K-10K)', value: segments.mediumValue, color: '#F59E0B' },
      { name: 'Low Value (<5K)', value: segments.lowValue, color: '#EF4444' },
      { name: 'Frequent (10+ trans)', value: segments.frequent, color: '#8B5CF6' },
      { name: 'Occasional (3-9 trans)', value: segments.occasional, color: '#06B6D4' },
      { name: 'Rare (<3 trans)', value: segments.rare, color: '#6B7280' }
    ].filter(segment => segment.value > 0);
  };

  // Prepare hourly performance data
  const getHourlyPerformanceData = () => {
    const hourlyStats = new Map<number, { revenue: number, transactions: number }>();
    
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.set(hour, { revenue: 0, transactions: 0 });
    }

    transactions.filter(t => t.status === 'completed').forEach(transaction => {
      const hour = parseISO(transaction.created_at).getHours();
      const current = hourlyStats.get(hour) || { revenue: 0, transactions: 0 };
      hourlyStats.set(hour, {
        revenue: current.revenue + transaction.net_amount,
        transactions: current.transactions + 1
      });
    });

    return Array.from(hourlyStats.entries()).map(([hour, stats]) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      revenue: stats.revenue,
      transactions: stats.transactions,
      avgValue: stats.transactions > 0 ? stats.revenue / stats.transactions : 0
    }));
  };

  // Export analytics data
  const exportAnalytics = () => {
    const kpis = calculateKPIs();
    const analyticsData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dateRange: `${dateRange} days`,
        merchantId: user?.id,
        generatedBy: 'Tickets Merchant Analytics'
      },
      kpis,
      revenueTrend: getRevenueTrendData(),
      categoryBreakdown: getCategoryBreakdownData(),
      paymentMethods: getPaymentMethodData(),
      customerSegments: getCustomerSegments(),
      hourlyPerformance: getHourlyPerformanceData(),
      rawData: {
        transactions: transactions.length,
        customers: customers.length
      }
    };

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
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
            Merchant Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your business performance, customer insights, and revenue analytics
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
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalRevenue.toLocaleString()} SYP</div>
            <div className="flex items-center text-xs text-gray-600">
              {kpis.revenueGrowth > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={kpis.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(kpis.revenueGrowth).toFixed(1)}% vs last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalTransactions}</div>
            <p className="text-xs text-gray-600">
              Avg value: {kpis.avgTransactionValue.toLocaleString()} SYP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCustomers}</div>
            <p className="text-xs text-gray-600">
              Retention: {kpis.customerRetentionRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.successRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-600">
              Today: {kpis.todayRevenue.toLocaleString()} SYP
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="hourly">Hourly</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  Daily revenue, transactions, and customer acquisition over time
                </CardDescription>
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
                          `${value} ${name === 'revenue' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'transactions' ? 'Transactions' : 'Customers'
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="transactions" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="customers" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={getRevenueTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'transactions' ? 'Transactions' : 'Customers'
                        ]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </AreaChart>
                  ) : (
                    <BarChart data={getRevenueTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'transactions' ? 'Transactions' : 'Customers'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" />
                      <Bar dataKey="transactions" fill="#82ca9d" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Distribution by spending and frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getCustomerSegments()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {getCustomerSegments().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Customer Value</span>
                    <span className="font-semibold">{kpis.avgCustomerValue.toLocaleString()} SYP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Retention Rate</span>
                    <span className="font-semibold">{kpis.customerRetentionRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Repeat Customers</span>
                    <span className="font-semibold">{customers.filter(c => c.transaction_count > 1).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">New Customers</span>
                    <span className="font-semibold">{customers.filter(c => c.transaction_count === 1).length}</span>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Top Customers</h4>
                  <div className="space-y-2">
                    {customers
                      .sort((a, b) => b.total_spent - a.total_spent)
                      .slice(0, 5)
                      .map((customer, index) => (
                        <div key={customer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="text-sm">Customer {customer.id.slice(-8)}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{customer.total_spent.toLocaleString()} SYP</p>
                            <p className="text-xs text-gray-600">{customer.transaction_count} transactions</p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Revenue breakdown by product/service categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getCategoryBreakdownData().map((category, index) => {
                  const totalRevenue = getCategoryBreakdownData().reduce((sum, c) => sum + c.value, 0);
                  const percentage = totalRevenue > 0 ? (category.value / totalRevenue) * 100 : 0;
                  
                  return (
                    <div key={category.name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-sm">
                          #{index + 1}
                        </Badge>
                        <div>
                          <h4 className="font-semibold">{category.name}</h4>
                          <p className="text-sm text-gray-600">
                            {category.transactions} transactions • {percentage.toFixed(1)}% of revenue
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{category.value.toLocaleString()} SYP</p>
                        <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Analysis</CardTitle>
              <CardDescription>Performance and success rates by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getPaymentMethodData().map((method, index) => (
                  <div key={method.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-6 w-6 text-blue-600" />
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

        <TabsContent value="hourly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hourly Performance</CardTitle>
              <CardDescription>Revenue and transaction patterns throughout the day</CardDescription>
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
                        name === 'revenue' || name === 'avgValue' ? `${value} SYP` : value,
                        name === 'revenue' ? 'Revenue' : 
                        name === 'transactions' ? 'Transactions' : 'Avg Value'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="transactions" fill="#82ca9d" />
                    <Bar dataKey="revenue" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Business Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">Revenue per Transaction</span>
                    <span className="font-bold text-green-600">
                      {kpis.avgTransactionValue.toLocaleString()} SYP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Revenue per Customer</span>
                    <span className="font-bold text-blue-600">
                      {kpis.avgCustomerValue.toLocaleString()} SYP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Total Fees Paid</span>
                    <span className="font-bold text-purple-600">
                      {kpis.totalFees.toLocaleString()} SYP
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    {kpis.customerRetentionRate < 50 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Repeat className="h-4 w-4" />
                        <span>Focus on customer retention strategies to increase repeat business</span>
                      </div>
                    )}
                    {kpis.successRate < 95 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <Target className="h-4 w-4" />
                        <span>Investigate failed transactions to improve success rate</span>
                      </div>
                    )}
                    {kpis.avgTransactionValue < 1000 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>Consider upselling strategies to increase average transaction value</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg">
                    <h3 className="text-2xl font-bold">{kpis.todayRevenue.toLocaleString()}</h3>
                    <p className="text-blue-100">Today's Revenue</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">{transactions.filter(t => isToday(parseISO(t.created_at)) && t.status === 'completed').length}</h4>
                      <p className="text-sm text-gray-600">Today's Transactions</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">{kpis.successRate.toFixed(1)}%</h4>
                      <p className="text-sm text-gray-600">Success Rate</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Quick Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Best performing hour:</span>
                        <span className="font-semibold">
                          {getHourlyPerformanceData().reduce((best, current) => 
                            current.revenue > best.revenue ? current : best
                          ).hour}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Most popular category:</span>
                        <span className="font-semibold">
                          {getCategoryBreakdownData()[0]?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Preferred payment method:</span>
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

export default MerchantAnalyticsPage;