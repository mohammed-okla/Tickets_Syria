import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, MapPin, Clock, Users, Search, Filter, Ticket, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Event } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface EventWithStats extends Event {
  sold_tickets: number;
  available_tickets: number;
}

export function EventsPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedEvent, setSelectedEvent] = useState<EventWithStats | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterAndSortEvents();
  }, [events, searchTerm, categoryFilter, sortBy]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          sold_tickets:user_tickets(count),
          available_tickets:max_tickets
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString());

      if (error) throw error;

      const eventsWithStats = data?.map(event => ({
        ...event,
        sold_tickets: event.sold_tickets?.[0]?.count || 0,
        available_tickets: event.max_tickets - (event.sold_tickets?.[0]?.count || 0)
      })) || [];

      setEvents(eventsWithStats);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error(t('error_fetch_events'));
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortEvents = () => {
    let filtered = events.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (event.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (event.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });

    // Sort events
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.start_date || '').getTime() - new Date(b.start_date || '').getTime();
        case 'price_low':
          return (a.price || 0) - (b.price || 0);
        case 'price_high':
          return (b.price || 0) - (a.price || 0);
        case 'popularity':
          return b.sold_tickets - a.sold_tickets;
        default:
          return 0;
      }
    });

    setFilteredEvents(filtered);
  };

  const handlePurchaseTicket = async () => {
    if (!selectedEvent || !user) return;

    if (selectedEvent.available_tickets < purchaseQuantity) {
      toast.error(t('insufficient_tickets'));
      return;
    }

    setPurchaseLoading(true);

    try {
      // Check wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletError) throw walletError;

      const totalCost = (selectedEvent.price || 0) * purchaseQuantity;
      if (walletData.balance < totalCost) {
        toast.error(t('insufficient_balance'));
        return;
      }

      // Purchase tickets using RPC function
      const { data, error } = await supabase.rpc('purchase_event_tickets', {
        p_event_id: selectedEvent.id,
        p_user_id: user.id,
        p_quantity: purchaseQuantity
      });

      if (error) throw error;

      toast.success(t('tickets_purchased_success', { quantity: purchaseQuantity.toString() }));
      setSelectedEvent(null);
      setPurchaseQuantity(1);
      fetchEvents(); // Refresh events to update available tickets
    } catch (error) {
      console.error('Error purchasing tickets:', error);
      toast.error(t('error_purchase_tickets'));
    } finally {
      setPurchaseLoading(false);
    }
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const categories = [
    { value: 'all', label: t('all_categories') },
    { value: 'concert', label: t('concert') },
    { value: 'sports', label: t('sports') },
    { value: 'theater', label: t('theater') },
    { value: 'conference', label: t('conference') },
    { value: 'workshop', label: t('workshop') },
    { value: 'other', label: t('other') }
  ];

  if (loading) {
    return <LoadingSpinner text={t('loading_events')} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold">{t('events')}</h1>
        <p className="text-muted-foreground">{t('events_description')}</p>
      </motion.div>

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('search_events')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">{t('sort_by_date')}</SelectItem>
                  <SelectItem value="price_low">{t('sort_by_price_low')}</SelectItem>
                  <SelectItem value="price_high">{t('sort_by_price_high')}</SelectItem>
                  <SelectItem value="popularity">{t('sort_by_popularity')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <CardDescription className="line-clamp-2 mt-2">
                      {event.description}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {t(event.category || 'other')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(event.start_date || '')}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {event.location}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    {event.available_tickets} {t('tickets_available')}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold">
                    {formatPrice(event.price || 0)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star className="h-4 w-4 mr-1 fill-yellow-400 text-yellow-400" />
                    {event.sold_tickets} {t('sold')}
                  </div>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      className="w-full" 
                      disabled={event.available_tickets === 0}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <Ticket className="h-4 w-4 mr-2" />
                      {event.available_tickets === 0 ? t('sold_out') : t('buy_tickets')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{event.title}</DialogTitle>
                      <DialogDescription>{event.description}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>{t('start_date')}:</strong>
                          <p>{formatDate(event.start_date || '')}</p>
                        </div>
                        <div>
                          <strong>{t('end_date')}:</strong>
                          <p>{formatDate(event.end_date || '')}</p>
                        </div>
                        <div>
                          <strong>{t('location')}:</strong>
                          <p>{event.location}</p>
                        </div>
                        <div>
                          <strong>{t('price')}:</strong>
                          <p>{formatPrice(event.price || 0)}</p>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          {t('quantity')}
                        </label>
                        <Select 
                          value={purchaseQuantity.toString()} 
                          onValueChange={(value) => setPurchaseQuantity(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: Math.min(event.available_tickets, 10) }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1} {t('tickets')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{t('total')}:</span>
                          <span className="text-lg font-bold">
                            {formatPrice((event.price || 0) * purchaseQuantity)}
                          </span>
                        </div>
                      </div>

                      <Button 
                        onClick={handlePurchaseTicket} 
                        disabled={purchaseLoading}
                        className="w-full"
                      >
                        {purchaseLoading ? (
                          <LoadingSpinner text={t('processing')} />
                        ) : (
                          t('purchase_tickets')
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('no_events_found')}</h3>
            <p className="text-muted-foreground">{t('no_events_description')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default EventsPage;