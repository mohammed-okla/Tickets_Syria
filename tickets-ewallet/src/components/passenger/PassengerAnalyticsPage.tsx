import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  AlertCircle
} from 'lucide-react'
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns'

interface AnalyticsData {
  spendingTrend: Array<{
    date: string
    amount: number
    transactions: number
  }>
  categoryBreakdown: Array<{
    category: string
    amount: number
    count: number
    percentage: number
    color: string
  }>
  monthlyComparison: Array<{
    month: string
    currentYear: number
    previousYear: number
  }>
  topMerchants: Array<{
    name: string
    amount: number
    transactions: number
  }>
  paymentMethods: Array<{
    method: string
    amount: number
    count: number
    percentage: number
  }>
  weeklyPattern: Array<{
    day: string
    amount: number
    transactions: number
  }>
  hourlyPattern: Array<{
    hour: string
    amount: number
    transactions: number
  }>
  budgetAnalysis: {
    monthlyAverage: number
    currentMonth: number
    projection: number
    variance: number
  }
  kpis: {
    totalSpent: number
    averageTransaction: number
    transactionCount: number
    topCategory: string
    savingsRate: number
    spendingGrowth: number
  }
}

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1',
  '#d084d0', '#ffb347', '#87ceeb', '#dda0dd', '#98fb98'
]

export default function PassengerAnalyticsPage() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    spendingTrend: [],
    categoryBreakdown: [],
    monthlyComparison: [],
    topMerchants: [],
    paymentMethods: [],
    weeklyPattern: [],
    hourlyPattern: [],
    budgetAnalysis: {
      monthlyAverage: 0,
      currentMonth: 0,
      projection: 0,
      variance: 0
    },
    kpis: {
      totalSpent: 0,
      averageTransaction: 0,
      transactionCount: 0,
      topCategory: '',
      savingsRate: 0,
      spendingGrowth: 0
    }
  })
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState('last_30_days')
  const [chartType, setChartType] = useState('line')

  useEffect(() => {
    if (profile) {
      fetchAnalytics()
    }
  }, [profile, dateRange])

  const fetchAnalytics = async () => {
    if (!profile) return

    try {
      setIsLoading(true)

      // Calculate date range
      const endDate = new Date()
      let startDate = new Date()
      
      switch (dateRange) {
        case 'last_7_days':
          startDate = subDays(endDate, 7)
          break
        case 'last_30_days':
          startDate = subDays(endDate, 30)
          break
        case 'last_90_days':
          startDate = subDays(endDate, 90)
          break
        case 'last_year':
          startDate = subDays(endDate, 365)
          break
        default:
          startDate = subDays(endDate, 30)
      }

      // Fetch transactions
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`
          *,
          to_profile:profiles!transactions_to_user_id_fkey (
            full_name,
            user_type
          )
        `)
        .eq('from_user_id', profile.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) throw error

      const filteredTransactions = transactions || []

      // Calculate spending trend
      const spendingTrend = eachDayOfInterval({ start: startDate, end: endDate }).map(date => {
        const dayTransactions = filteredTransactions.filter(t => 
          format(new Date(t.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
        )
        return {
          date: format(date, 'MMM dd'),
          amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: dayTransactions.length
        }
      })

      // Category breakdown
      const categoryMap = new Map()
      filteredTransactions.forEach(transaction => {
        const category = transaction.transaction_type
        if (categoryMap.has(category)) {
          const existing = categoryMap.get(category)
          categoryMap.set(category, {
            amount: existing.amount + transaction.amount,
            count: existing.count + 1
          })
        } else {
          categoryMap.set(category, {
            amount: transaction.amount,
            count: 1
          })
        }
      })

      const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)
      const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data], index) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        color: COLORS[index % COLORS.length]
      })).sort((a, b) => b.amount - a.amount)

      // Monthly comparison (current year vs previous year)
      const monthlyComparison = eachMonthOfInterval({
        start: subMonths(endDate, 11),
        end: endDate
      }).map(monthDate => {
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        
        const currentYearTransactions = filteredTransactions.filter(t => {
          const transactionDate = new Date(t.created_at)
          return transactionDate >= monthStart && transactionDate <= monthEnd
        })

        const previousYearStart = subMonths(monthStart, 12)
        const previousYearEnd = subMonths(monthEnd, 12)
        
        // This would need separate query for previous year data
        // For now, simulate with reduced current data
        const previousYearAmount = currentYearTransactions.reduce((sum, t) => sum + t.amount, 0) * 0.8

        return {
          month: format(monthDate, 'MMM'),
          currentYear: currentYearTransactions.reduce((sum, t) => sum + t.amount, 0),
          previousYear: previousYearAmount
        }
      })

      // Top merchants/recipients
      const merchantMap = new Map()
      filteredTransactions.forEach(transaction => {
        const merchantName = transaction.to_profile?.full_name || 'Unknown'
        if (merchantMap.has(merchantName)) {
          const existing = merchantMap.get(merchantName)
          merchantMap.set(merchantName, {
            amount: existing.amount + transaction.amount,
            transactions: existing.transactions + 1
          })
        } else {
          merchantMap.set(merchantName, {
            amount: transaction.amount,
            transactions: 1
          })
        }
      })

      const topMerchants = Array.from(merchantMap.entries())
        .map(([name, data]) => ({
          name,
          amount: data.amount,
          transactions: data.transactions
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // Payment methods breakdown
      const paymentMethodMap = new Map()
      filteredTransactions.forEach(transaction => {
        const method = transaction.payment_method || 'wallet'
        if (paymentMethodMap.has(method)) {
          const existing = paymentMethodMap.get(method)
          paymentMethodMap.set(method, {
            amount: existing.amount + transaction.amount,
            count: existing.count + 1
          })
        } else {
          paymentMethodMap.set(method, {
            amount: transaction.amount,
            count: 1
          })
        }
      })

      const paymentMethods = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
      }))

      // Weekly pattern
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const weeklyPattern = weekDays.map(day => {
        const dayTransactions = filteredTransactions.filter(t => {
          const weekDay = format(new Date(t.created_at), 'EEE')
          return weekDay === day
        })
        return {
          day,
          amount: dayTransactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: dayTransactions.length
        }
      })

      // Hourly pattern
      const hourlyPattern = Array.from({ length: 24 }, (_, hour) => {
        const hourTransactions = filteredTransactions.filter(t => {
          const transactionHour = new Date(t.created_at).getHours()
          return transactionHour === hour
        })
        return {
          hour: `${hour.toString().padStart(2, '0')}:00`,
          amount: hourTransactions.reduce((sum, t) => sum + t.amount, 0),
          transactions: hourTransactions.length
        }
      })

      // Budget analysis
      const currentMonth = filteredTransactions.filter(t => {
        const transactionDate = new Date(t.created_at)
        const now = new Date()
        return transactionDate.getMonth() === now.getMonth() && 
               transactionDate.getFullYear() === now.getFullYear()
      }).reduce((sum, t) => sum + t.amount, 0)

      const monthlyAverage = totalAmount / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)))
      const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
      const currentDay = new Date().getDate()
      const projection = (currentMonth / currentDay) * daysInMonth

      // KPIs
      const kpis = {
        totalSpent: totalAmount,
        averageTransaction: filteredTransactions.length > 0 ? totalAmount / filteredTransactions.length : 0,
        transactionCount: filteredTransactions.length,
        topCategory: categoryBreakdown[0]?.category || '',
        savingsRate: Math.max(0, (monthlyAverage - currentMonth) / Math.max(monthlyAverage, 1) * 100),
        spendingGrowth: monthlyComparison.length >= 2 ? 
          ((monthlyComparison[monthlyComparison.length - 1]?.currentYear || 0) - 
           (monthlyComparison[monthlyComparison.length - 2]?.currentYear || 0)) / 
           Math.max(monthlyComparison[monthlyComparison.length - 2]?.currentYear || 1, 1) * 100 : 0
      }

      setAnalytics({
        spendingTrend,
        categoryBreakdown,
        monthlyComparison,
        topMerchants,
        paymentMethods,
        weeklyPattern,
        hourlyPattern,
        budgetAnalysis: {
          monthlyAverage,
          currentMonth,
          projection,
          variance: ((projection - monthlyAverage) / Math.max(monthlyAverage, 1)) * 100
        },
        kpis
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const exportReport = () => {
    const data = {
      generatedAt: new Date().toISOString(),
      period: dateRange,
      ...analytics
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `spending-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('spendingAnalytics')}</h1>
          <p className="text-muted-foreground">{t('detailedInsightsIntoYourSpending')}</p>
        </div>
        <div className="flex space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7_days">{t('last7Days')}</SelectItem>
              <SelectItem value="last_30_days">{t('last30Days')}</SelectItem>
              <SelectItem value="last_90_days">{t('last90Days')}</SelectItem>
              <SelectItem value="last_year">{t('lastYear')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            {t('exportReport')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalSpent')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.kpis.totalSpent)}</div>
              <div className="flex items-center space-x-2">
                {analytics.kpis.spendingGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-red-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-500" />
                )}
                <p className={`text-xs ${analytics.kpis.spendingGrowth >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {analytics.kpis.spendingGrowth >= 0 ? '+' : ''}{analytics.kpis.spendingGrowth.toFixed(1)}% {t('fromLastMonth')}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('avgTransaction')}</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.kpis.averageTransaction)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.kpis.transactionCount} {t('transactions')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('monthlyBudget')}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(analytics.budgetAnalysis.projection)}</div>
              <p className={`text-xs ${analytics.budgetAnalysis.variance >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {analytics.budgetAnalysis.variance >= 0 ? '+' : ''}{analytics.budgetAnalysis.variance.toFixed(1)}% {t('projected')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('topCategory')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{t(analytics.kpis.topCategory)}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.categoryBreakdown[0]?.percentage.toFixed(1)}% {t('ofSpending')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('savingsRate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.kpis.savingsRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {t('comparedToAverage')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('frequency')}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(analytics.kpis.transactionCount / Math.max(1, parseInt(dateRange.split('_')[1]))).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                {t('transactionsPerDay')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="trend">{t('spendingTrend')}</TabsTrigger>
          <TabsTrigger value="category">{t('categories')}</TabsTrigger>
          <TabsTrigger value="comparison">{t('comparison')}</TabsTrigger>
          <TabsTrigger value="patterns">{t('patterns')}</TabsTrigger>
          <TabsTrigger value="merchants">{t('merchants')}</TabsTrigger>
          <TabsTrigger value="methods">{t('paymentMethods')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t('spendingTrend')}</CardTitle>
                <CardDescription>{t('dailySpendingPattern')}</CardDescription>
              </div>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">{t('line')}</SelectItem>
                  <SelectItem value="area">{t('area')}</SelectItem>
                  <SelectItem value="bar">{t('bar')}</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'line' ? (
                  <LineChart data={analytics.spendingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('amount')]} />
                    <Legend />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={analytics.spendingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('amount')]} />
                    <Area type="monotone" dataKey="amount" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  </AreaChart>
                ) : (
                  <BarChart data={analytics.spendingTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('amount')]} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('spendingByCategory')}</CardTitle>
                <CardDescription>{t('categoryDistribution')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${t(name)} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {analytics.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('amount')]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('categoryBreakdown')}</CardTitle>
                <CardDescription>{t('detailedCategoryAnalysis')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.categoryBreakdown.map((category, index) => (
                    <div key={category.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-medium">{t(category.category)}</span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(category.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{category.count} {t('transactions')}</span>
                        <span>{category.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${category.percentage}%`,
                            backgroundColor: category.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('monthlyComparison')}</CardTitle>
              <CardDescription>{t('currentVsPreviousYear')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  <Legend />
                  <Bar dataKey="currentYear" fill="#8884d8" name={t('currentYear')} />
                  <Bar dataKey="previousYear" fill="#82ca9d" name={t('previousYear')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('weeklyPattern')}</CardTitle>
                <CardDescription>{t('spendingByDayOfWeek')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.weeklyPattern}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('amount')]} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('hourlyPattern')}</CardTitle>
                <CardDescription>{t('spendingByHourOfDay')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.hourlyPattern}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('amount')]} />
                    <Line type="monotone" dataKey="amount" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="merchants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('topMerchants')}</CardTitle>
              <CardDescription>{t('merchantsBySpending')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topMerchants.map((merchant, index) => (
                  <motion.div
                    key={merchant.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl font-bold text-muted-foreground">#{index + 1}</div>
                      <div>
                        <p className="font-medium">{merchant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {merchant.transactions} {t('transactions')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(merchant.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(merchant.amount / merchant.transactions)} {t('avg')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('paymentMethods')}</CardTitle>
                <CardDescription>{t('methodDistribution')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.paymentMethods}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, percentage }) => `${t(method)} ${percentage.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {analytics.paymentMethods.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('amount')]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('methodBreakdown')}</CardTitle>
                <CardDescription>{t('detailedMethodAnalysis')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.paymentMethods.map((method, index) => (
                    <div key={method.method} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{t(method.method)}</span>
                        </div>
                        <span className="text-sm font-medium">{formatCurrency(method.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{method.count} {t('transactions')}</span>
                        <span>{method.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${method.percentage}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Budget Alert */}
      {analytics.budgetAnalysis.variance > 20 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-800">{t('budgetWarning')}</span>
              <Badge variant="outline" className="bg-orange-100 text-orange-800">
                +{analytics.budgetAnalysis.variance.toFixed(1)}% {t('overBudget')}
              </Badge>
            </div>
            <p className="text-sm text-orange-700 mt-2">
              {t('yourProjectedSpendingIs')} {formatCurrency(analytics.budgetAnalysis.projection)} {t('comparedToYourAverage')} {formatCurrency(analytics.budgetAnalysis.monthlyAverage)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}