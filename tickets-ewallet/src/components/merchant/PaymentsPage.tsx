import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, Search, Filter, Download, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Payment {
  id: string;
  customer_name: string;
  amount: number;
  created_at: string;
  status: string;
  payment_method: string;
  description?: string;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          amount,
          created_at,
          status,
          metadata,
          profiles!transactions_from_user_id_fkey (
            full_name
          )
        `)
        .eq('to_user_id', user.id)
        .eq('type', 'merchant_payment')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const paymentData = data?.map(transaction => ({
        id: transaction.id,
        customer_name: (transaction.profiles as any)?.full_name || t('unknown_customer'),
        amount: transaction.amount,
        created_at: transaction.created_at,
        status: transaction.status,
        payment_method: (transaction.metadata as any)?.payment_method || 'wallet',
        description: (transaction.metadata as any)?.description
      })) || [];

      setPayments(paymentData);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error(t('error_fetch_payments'));
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments.filter(payment => {
      const matchesSearch = payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           payment.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    setFilteredPayments(filtered);
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

  const exportPayments = () => {
    const csvContent = [
      ['Date', 'Customer', 'Amount', 'Status', 'Payment Method', 'Transaction ID'],
      ...filteredPayments.map(p => [
        formatDate(p.created_at),
        p.customer_name,
        p.amount.toString(),
        p.status,
        p.payment_method,
        p.id
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `merchant-payments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('payments_exported'));
  };

  if (loading) {
    return <LoadingSpinner text={t('loading_payments')} />;
  }

  const completedPayments = filteredPayments.filter(p => p.status === 'completed');
  const pendingPayments = filteredPayments.filter(p => p.status === 'pending');
  const cancelledPayments = filteredPayments.filter(p => p.status === 'cancelled');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('payments')}</h1>
          <p className="text-muted-foreground">{t('merchant_payments_description')}</p>
        </div>
        <Button onClick={exportPayments} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          {t('export')}
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('search_payments')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_statuses')}</SelectItem>
                <SelectItem value="completed">{t('completed')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payment Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('total_payments')}</p>
                <p className="text-2xl font-bold">{filteredPayments.length}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('total_amount')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('unique_customers')}</p>
                <p className="text-2xl font-bold">
                  {new Set(filteredPayments.map(p => p.customer_name)).size}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">
            {t('all')} ({filteredPayments.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('completed')} ({completedPayments.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t('pending')} ({pendingPayments.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t('cancelled')} ({cancelledPayments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <PaymentsList payments={filteredPayments} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <PaymentsList payments={completedPayments} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <PaymentsList payments={pendingPayments} />
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <PaymentsList payments={cancelledPayments} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function PaymentsList({ payments }: { payments: Payment[] }) {
    if (payments.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('no_payments_found')}</h3>
            <p className="text-muted-foreground">{t('no_payments_description')}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {payments.map((payment, index) => (
          <motion.div
            key={payment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{payment.customer_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('payment_method')}: {t(payment.payment_method)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(payment.created_at)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {payment.id.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-green-600">
                      +{formatCurrency(payment.amount)}
                    </p>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }
}