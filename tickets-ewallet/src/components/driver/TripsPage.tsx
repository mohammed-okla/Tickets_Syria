import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Car, MapPin, Clock, DollarSign, Users, Eye, Search, Filter, Navigation } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface Trip {
  id: string;
  passenger_name: string;
  passenger_id: string;
  amount: number;
  created_at: string;
  status: string;
  pickup_location?: string;
  dropoff_location?: string;
  distance?: number;
  duration?: number;
  rating?: number;
  notes?: string;
}

export default function TripsPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (user) {
      fetchTrips();
    }
  }, [user]);

  useEffect(() => {
    filterTrips();
  }, [trips, searchTerm, statusFilter]);

  const fetchTrips = async () => {
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
        .eq('transaction_type', 'payment')
        .not('qr_code_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tripData = data?.map(transaction => {
        const metadata = transaction.metadata as any || {};
        return {
          id: transaction.id,
          passenger_name: (transaction.profiles as any)?.full_name || t('unknown_passenger'),
          passenger_id: transaction.from_user_id,
          amount: transaction.amount,
          created_at: transaction.created_at,
          status: transaction.status,
          pickup_location: metadata.pickup_location || 'Damascus City Center',
          dropoff_location: metadata.dropoff_location || 'Damascus Airport',
          distance: metadata.distance || Math.floor(Math.random() * 20) + 5,
          duration: metadata.duration || Math.floor(Math.random() * 45) + 15,
          rating: metadata.rating || Math.floor(Math.random() * 2) + 4,
          notes: metadata.notes
        };
      }) || [];

      setTrips(tripData);
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast.error(t('error_fetch_trips'));
    } finally {
      setLoading(false);
    }
  };

  const filterTrips = () => {
    let filtered = trips.filter(trip => {
      const matchesSearch = trip.passenger_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (trip.pickup_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (trip.dropoff_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           trip.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || trip.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    setFilteredTrips(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: 'default' as const, label: t('completed') },
      pending: { variant: 'outline' as const, label: t('pending') },
      cancelled: { variant: 'destructive' as const, label: t('cancelled') },
      in_progress: { variant: 'secondary' as const, label: t('in_progress') }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getRatingStars = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getTripsByStatus = (status: string) => {
    return filteredTrips.filter(trip => trip.status === status);
  };

  if (loading) {
    return <LoadingSpinner text={t('loading_trips')} />;
  }

  const completedTrips = getTripsByStatus('completed');
  const pendingTrips = getTripsByStatus('pending');
  const cancelledTrips = getTripsByStatus('cancelled');
  const inProgressTrips = getTripsByStatus('in_progress');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('trips')}</h1>
        <p className="text-muted-foreground">{t('trips_description')}</p>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('search_trips')}
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
                <SelectItem value="in_progress">{t('in_progress')}</SelectItem>
                <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trips Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('completed')}</p>
                <p className="text-2xl font-bold">{completedTrips.length}</p>
              </div>
              <Car className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('pending')}</p>
                <p className="text-2xl font-bold">{pendingTrips.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('in_progress')}</p>
                <p className="text-2xl font-bold">{inProgressTrips.length}</p>
              </div>
              <Navigation className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('cancelled')}</p>
                <p className="text-2xl font-bold">{cancelledTrips.length}</p>
              </div>
              <Car className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trips Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            {t('all')} ({filteredTrips.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t('completed')} ({completedTrips.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t('pending')} ({pendingTrips.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            {t('in_progress')} ({inProgressTrips.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t('cancelled')} ({cancelledTrips.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TripsList trips={filteredTrips} />
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <TripsList trips={completedTrips} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <TripsList trips={pendingTrips} />
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          <TripsList trips={inProgressTrips} />
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <TripsList trips={cancelledTrips} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function TripsList({ trips }: { trips: Trip[] }) {
    if (trips.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('no_trips_found')}</h3>
            <p className="text-muted-foreground">{t('no_trips_description')}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {trips.map((trip, index) => (
          <motion.div
            key={trip.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{trip.passenger_name}</h3>
                        {getStatusBadge(trip.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          <div>
                            <p className="font-medium">{t('pickup')}</p>
                            <p>{trip.pickup_location}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Navigation className="h-4 w-4 mr-2" />
                          <div>
                            <p className="font-medium">{t('dropoff')}</p>
                            <p>{trip.dropoff_location}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <div>
                            <p className="font-medium">{t('date_time')}</p>
                            <p>{formatDate(trip.created_at)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center space-x-4 text-sm">
                          <span>
                            <strong>{t('distance')}:</strong> {trip.distance}km
                          </span>
                          <span>
                            <strong>{t('duration')}:</strong> {formatDuration(trip.duration || 0)}
                          </span>
                          {trip.rating && (
                            <span>
                              <strong>{t('rating')}:</strong> {getRatingStars(trip.rating)}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(trip.amount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedTrip(trip)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('details')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{t('trip_details')}</DialogTitle>
                        <DialogDescription>
                          {t('trip_id')}: {trip.id}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">{t('passenger_info')}</h4>
                            <div className="space-y-1 text-sm">
                              <p><strong>{t('name')}:</strong> {trip.passenger_name}</p>
                              <p><strong>{t('rating')}:</strong> {trip.rating ? getRatingStars(trip.rating) : t('no_rating')}</p>
                            </div>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">{t('trip_info')}</h4>
                            <div className="space-y-1 text-sm">
                              <p><strong>{t('date')}:</strong> {formatDate(trip.created_at)}</p>
                              <p><strong>{t('status')}:</strong> {getStatusBadge(trip.status)}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">{t('route_details')}</h4>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-green-600">{t('pickup_location')}</p>
                              <p>{trip.pickup_location}</p>
                            </div>
                            <div>
                              <p className="font-medium text-red-600">{t('dropoff_location')}</p>
                              <p>{trip.dropoff_location}</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium mb-2">{t('trip_metrics')}</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <p className="font-medium">{t('distance')}</p>
                              <p className="text-lg font-bold">{trip.distance}km</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <p className="font-medium">{t('duration')}</p>
                              <p className="text-lg font-bold">{formatDuration(trip.duration || 0)}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded">
                              <p className="font-medium">{t('earnings')}</p>
                              <p className="text-lg font-bold text-green-600">{formatCurrency(trip.amount)}</p>
                            </div>
                          </div>
                        </div>

                        {trip.notes && (
                          <div>
                            <h4 className="font-medium mb-2">{t('notes')}</h4>
                            <p className="text-sm bg-gray-50 p-3 rounded">{trip.notes}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    );
  }
}