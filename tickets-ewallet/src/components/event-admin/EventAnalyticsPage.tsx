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
  TrendingUp, TrendingDown, Ticket, Users, DollarSign, Calendar, 
  MapPin, Star, Download, Target, Clock, BarChart3
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  ticket_price: number;
  total_tickets: number;
  tickets_sold: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  category: string;
  created_at: string;
}

interface TicketSale {
  id: string;
  event_id: string;
  customer_id: string;
  quantity: number;
  total_amount: number;
  booking_fee: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'refunded';
  payment_method: string;
  created_at: string;
}

interface Attendee {
  id: string;
  event_id: string;
  ticket_id: string;
  customer_id: string;
  check_in_time?: string;
  rating?: number;
  feedback?: string;
}

const EventAnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [events, setEvents] = useState<Event[]>([]);
  const [ticketSales, setTicketSales] = useState<TicketSale[]>([]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
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
      
      // Fetch events data
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('organizer_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (eventsError) throw eventsError;

      // Fetch ticket sales
      const { data: salesData, error: salesError } = await supabase
        .from('event_ticket_sales')
        .select('*')
        .in('event_id', eventsData?.map(e => e.id) || [])
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Fetch attendees
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('event_attendees')
        .select('*')
        .in('event_id', eventsData?.map(e => e.id) || []);

      if (attendeesError) throw attendeesError;

      setEvents(eventsData || []);
      setTicketSales(salesData || []);
      setAttendees(attendeesData || []);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const calculateKPIs = () => {
    const confirmedSales = ticketSales.filter(sale => sale.status === 'confirmed');
    const totalRevenue = confirmedSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const totalTicketsSold = confirmedSales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalFees = confirmedSales.reduce((sum, sale) => sum + sale.booking_fee, 0);
    const netRevenue = totalRevenue - totalFees;
    
    const completedEvents = events.filter(e => e.status === 'completed');
    const upcomingEvents = events.filter(e => e.status === 'upcoming');
    
    const attendanceRate = attendees.length > 0 && totalTicketsSold > 0 
      ? (attendees.filter(a => a.check_in_time).length / totalTicketsSold) * 100 
      : 0;
    
    const avgTicketPrice = totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0;
    
    // Calculate growth trends
    const halfPeriod = Math.floor(parseInt(dateRange) / 2);
    const midDate = subDays(new Date(), halfPeriod);
    const recentSales = confirmedSales.filter(sale => parseISO(sale.created_at) >= midDate);
    const olderSales = confirmedSales.filter(sale => parseISO(sale.created_at) < midDate);
    const recentRevenue = recentSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const olderRevenue = olderSales.reduce((sum, sale) => sum + sale.total_amount, 0);
    const revenueGrowth = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0;

    // Customer satisfaction
    const ratingsCount = attendees.filter(a => a.rating).length;
    const avgRating = ratingsCount > 0 
      ? attendees.filter(a => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) / ratingsCount 
      : 0;

    const today = new Date();
    const todaySales = confirmedSales.filter(sale => isToday(parseISO(sale.created_at)));
    const todayRevenue = todaySales.reduce((sum, sale) => sum + sale.total_amount, 0);

    return {
      totalRevenue,
      netRevenue,
      totalTicketsSold,
      totalEvents: events.length,
      completedEvents: completedEvents.length,
      upcomingEvents: upcomingEvents.length,
      attendanceRate,
      avgTicketPrice,
      revenueGrowth,
      avgRating,
      todayRevenue,
      totalFees
    };
  };

  // Prepare sales trend data
  const getSalesTrendData = () => {
    const dailySales = new Map<string, { revenue: number, tickets: number, events: Set<string> }>();
    
    ticketSales.filter(sale => sale.status === 'confirmed').forEach(sale => {
      const date = format(parseISO(sale.created_at), 'yyyy-MM-dd');
      const current = dailySales.get(date) || { revenue: 0, tickets: 0, events: new Set() };
      current.events.add(sale.event_id);
      dailySales.set(date, {
        revenue: current.revenue + sale.total_amount,
        tickets: current.tickets + sale.quantity,
        events: current.events
      });
    });

    return Array.from(dailySales.entries())
      .map(([date, data]) => ({
        date: format(parseISO(date), 'MMM dd', { locale: language === 'ar' ? ar : undefined }),
        revenue: data.revenue,
        tickets: data.tickets,
        events: data.events.size
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  // Prepare event performance data
  const getEventPerformanceData = () => {
    return events
      .map(event => {
        const eventSales = ticketSales.filter(sale => 
          sale.event_id === event.id && sale.status === 'confirmed'
        );
        const revenue = eventSales.reduce((sum, sale) => sum + sale.total_amount, 0);
        const ticketsSold = eventSales.reduce((sum, sale) => sum + sale.quantity, 0);
        const sellOutRate = event.total_tickets > 0 ? (ticketsSold / event.total_tickets) * 100 : 0;
        
        const eventAttendees = attendees.filter(a => a.event_id === event.id);
        const checkedIn = eventAttendees.filter(a => a.check_in_time).length;
        const attendanceRate = ticketsSold > 0 ? (checkedIn / ticketsSold) * 100 : 0;

        return {
          ...event,
          revenue,
          ticketsSold,
          sellOutRate,
          attendanceRate,
          avgRating: eventAttendees.length > 0 
            ? eventAttendees.filter(a => a.rating).reduce((sum, a) => sum + (a.rating || 0), 0) / eventAttendees.filter(a => a.rating).length
            : 0
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Prepare category analysis
  const getCategoryAnalysis = () => {
    const categoryStats = new Map<string, { revenue: number, tickets: number, events: number }>();
    
    events.forEach(event => {
      const category = event.category || 'Other';
      const eventSales = ticketSales.filter(sale => 
        sale.event_id === event.id && sale.status === 'confirmed'
      );
      const revenue = eventSales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const tickets = eventSales.reduce((sum, sale) => sum + sale.quantity, 0);
      
      const current = categoryStats.get(category) || { revenue: 0, tickets: 0, events: 0 };
      categoryStats.set(category, {
        revenue: current.revenue + revenue,
        tickets: current.tickets + tickets,
        events: current.events + 1
      });
    });

    return Array.from(categoryStats.entries())
      .map(([name, stats]) => ({
        name,
        revenue: stats.revenue,
        tickets: stats.tickets,
        events: stats.events,
        avgRevenue: stats.events > 0 ? stats.revenue / stats.events : 0
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Prepare monthly comparison
  const getMonthlyComparison = () => {
    const months: Array<{
      month: string;
      events: number;
      revenue: number;
      tickets: number;
    }> = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthEvents = events.filter(event => {
        const eventDate = parseISO(event.created_at);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });
      
      const monthSales = ticketSales.filter(sale => {
        const saleDate = parseISO(sale.created_at);
        return saleDate >= monthStart && saleDate <= monthEnd && sale.status === 'confirmed';
      });

      months.push({
        month: format(date, 'MMM yyyy', { locale: language === 'ar' ? ar : undefined }),
        events: monthEvents.length,
        revenue: monthSales.reduce((sum, sale) => sum + sale.total_amount, 0),
        tickets: monthSales.reduce((sum, sale) => sum + sale.quantity, 0)
      });
    }
    
    return months;
  };

  // Prepare customer insights
  const getCustomerInsights = () => {
    const customerStats = new Map<string, { tickets: number, revenue: number, events: Set<string> }>();
    
    ticketSales.filter(sale => sale.status === 'confirmed').forEach(sale => {
      const customerId = sale.customer_id;
      const current = customerStats.get(customerId) || { tickets: 0, revenue: 0, events: new Set() };
      current.events.add(sale.event_id);
      customerStats.set(customerId, {
        tickets: current.tickets + sale.quantity,
        revenue: current.revenue + sale.total_amount,
        events: current.events
      });
    });

    const customers = Array.from(customerStats.entries()).map(([id, stats]) => ({
      id,
      tickets: stats.tickets,
      revenue: stats.revenue,
      events: stats.events.size,
      avgSpend: stats.tickets > 0 ? stats.revenue / stats.tickets : 0
    }));

    return {
      totalCustomers: customers.length,
      repeatCustomers: customers.filter(c => c.events > 1).length,
      topCustomers: customers.sort((a, b) => b.revenue - a.revenue).slice(0, 10),
      avgSpendPerCustomer: customers.length > 0 
        ? customers.reduce((sum, c) => sum + c.revenue, 0) / customers.length 
        : 0
    };
  };

  // Export analytics data
  const exportAnalytics = () => {
    const kpis = calculateKPIs();
    const analyticsData = {
      metadata: {
        exportDate: new Date().toISOString(),
        dateRange: `${dateRange} days`,
        organizerId: user?.id,
        generatedBy: 'Tickets Event Analytics'
      },
      kpis,
      salesTrend: getSalesTrendData(),
      eventPerformance: getEventPerformanceData(),
      categoryAnalysis: getCategoryAnalysis(),
      monthlyComparison: getMonthlyComparison(),
      customerInsights: getCustomerInsights(),
      rawData: {
        events: events.length,
        ticketSales: ticketSales.length,
        attendees: attendees.length
      }
    };

    const blob = new Blob([JSON.stringify(analyticsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
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
            Event Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your event performance, ticket sales, and attendee insights
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
            <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
            <Ticket className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalTicketsSold}</div>
            <p className="text-xs text-gray-600">
              Avg price: {kpis.avgTicketPrice.toLocaleString()} SYP
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalEvents}</div>
            <p className="text-xs text-gray-600">
              {kpis.upcomingEvents} upcoming • {kpis.completedEvents} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Users className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-gray-600">
              Rating: {kpis.avgRating.toFixed(1)}/5 ⭐
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>
                  Daily ticket sales revenue and volume over time
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
                    <LineChart data={getSalesTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'tickets' ? 'Tickets' : 'Events'
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                      <Line type="monotone" dataKey="tickets" stroke="#82ca9d" strokeWidth={2} />
                      <Line type="monotone" dataKey="events" stroke="#ffc658" strokeWidth={2} />
                    </LineChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={getSalesTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'tickets' ? 'Tickets' : 'Events'
                        ]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    </AreaChart>
                  ) : (
                    <BarChart data={getSalesTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          `${value} ${name === 'revenue' ? 'SYP' : ''}`,
                          name === 'revenue' ? 'Revenue' : name === 'tickets' ? 'Tickets' : 'Events'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" />
                      <Bar dataKey="tickets" fill="#82ca9d" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Performance</CardTitle>
              <CardDescription>Top performing events by revenue and attendance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getEventPerformanceData().slice(0, 10).map((event, index) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-gray-600">
                          {format(parseISO(event.date), 'MMM dd, yyyy')} • {event.location}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.ticketsSold}/{event.total_tickets} tickets • 
                          {event.sellOutRate.toFixed(1)}% sold • 
                          {event.attendanceRate.toFixed(1)}% attendance
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{event.revenue.toLocaleString()} SYP</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-sm">{event.avgRating ? event.avgRating.toFixed(1) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Category Analysis</CardTitle>
              <CardDescription>Performance breakdown by event categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getCategoryAnalysis().map((category, index) => (
                  <div key={category.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-sm">
                        #{index + 1}
                      </Badge>
                      <div>
                        <h4 className="font-semibold">{category.name}</h4>
                        <p className="text-sm text-gray-600">
                          {category.events} events • {category.tickets} tickets sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{category.revenue.toLocaleString()} SYP</p>
                      <p className="text-sm text-gray-600">
                        Avg: {category.avgRevenue.toLocaleString()} SYP/event
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Customer Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Customers</span>
                    <span className="font-semibold">{getCustomerInsights().totalCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Repeat Customers</span>
                    <span className="font-semibold">{getCustomerInsights().repeatCustomers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Spend per Customer</span>
                    <span className="font-semibold">{getCustomerInsights().avgSpendPerCustomer.toLocaleString()} SYP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Customer Retention</span>
                    <span className="font-semibold">
                      {getCustomerInsights().totalCustomers > 0 
                        ? ((getCustomerInsights().repeatCustomers / getCustomerInsights().totalCustomers) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {getCustomerInsights().topCustomers.slice(0, 5).map((customer, index) => (
                    <div key={customer.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="text-sm">Customer {customer.id.slice(-8)}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{customer.revenue.toLocaleString()} SYP</p>
                        <p className="text-xs text-gray-600">{customer.tickets} tickets • {customer.events} events</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Comparison</CardTitle>
              <CardDescription>Compare performance across different months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyComparison()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? `${value} SYP` : value,
                        name === 'revenue' ? 'Revenue' : 
                        name === 'events' ? 'Events' : 'Tickets'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" />
                    <Bar dataKey="events" fill="#82ca9d" />
                    <Bar dataKey="tickets" fill="#ffc658" />
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
                    <span className="text-sm font-medium">Net Revenue</span>
                    <span className="font-bold text-green-600">
                      {kpis.netRevenue.toLocaleString()} SYP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium">Avg Ticket Price</span>
                    <span className="font-bold text-blue-600">
                      {kpis.avgTicketPrice.toLocaleString()} SYP
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium">Platform Fees</span>
                    <span className="font-bold text-purple-600">
                      {kpis.totalFees.toLocaleString()} SYP
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <div className="space-y-2 text-sm">
                    {kpis.attendanceRate < 80 && (
                      <div className="flex items-center gap-2 text-amber-600">
                        <Target className="h-4 w-4" />
                        <span>Focus on improving event promotion to boost attendance</span>
                      </div>
                    )}
                    {kpis.avgRating < 4.0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <Star className="h-4 w-4" />
                        <span>Work on event quality and customer experience</span>
                      </div>
                    )}
                    {kpis.avgTicketPrice < 500 && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <TrendingUp className="h-4 w-4" />
                        <span>Consider premium event offerings to increase revenue</span>
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
                  <div className="text-center p-6 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg">
                    <h3 className="text-2xl font-bold">{kpis.todayRevenue.toLocaleString()}</h3>
                    <p className="text-green-100">Today's Revenue</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">{kpis.attendanceRate.toFixed(1)}%</h4>
                      <p className="text-sm text-gray-600">Attendance Rate</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="text-xl font-bold">{kpis.avgRating.toFixed(1)}</h4>
                      <p className="text-sm text-gray-600">Avg Rating</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Quick Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Best performing category:</span>
                        <span className="font-semibold">
                          {getCategoryAnalysis()[0]?.name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Highest revenue event:</span>
                        <span className="font-semibold">
                          {getEventPerformanceData()[0]?.title.slice(0, 20) || 'N/A'}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Customer retention rate:</span>
                        <span className="font-semibold">
                          {getCustomerInsights().totalCustomers > 0 
                            ? ((getCustomerInsights().repeatCustomers / getCustomerInsights().totalCustomers) * 100).toFixed(1)
                            : 0}%
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

export default EventAnalyticsPage;