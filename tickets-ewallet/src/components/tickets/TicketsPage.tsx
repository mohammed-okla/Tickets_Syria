import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, MapPin, Clock, Ticket, Search, QrCode, Download, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UserTicket, Event } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface TicketWithEvent extends UserTicket {
  event: Event;
}

export function TicketsPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [tickets, setTickets] = useState<TicketWithEvent[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketWithEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<TicketWithEvent | null>(null);

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, statusFilter]);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_tickets')
        .select(`
          *,
          event:events (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error(t('error_fetch_tickets'));
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets.filter(ticket => {
      const matchesSearch = ticket.event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (ticket.event.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (ticket.event.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    setFilteredTickets(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: 'outline' as const, label: t('pending') },
      confirmed: { variant: 'default' as const, label: t('confirmed') },
      used: { variant: 'secondary' as const, label: t('used') },
      cancelled: { variant: 'destructive' as const, label: t('cancelled') }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTicketsByStatus = (status: string) => {
    return filteredTickets.filter(ticket => ticket.status === status);
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

  const downloadTicket = (ticket: TicketWithEvent) => {
    // Create a simple ticket data for download
    const ticketData = {
      ticketId: ticket.id,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.start_date,
      eventLocation: ticket.event.location,
      userName: user?.user_metadata?.full_name || user?.email,
      purchaseDate: ticket.created_at,
      status: ticket.status
    };

    const dataStr = JSON.stringify(ticketData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${ticket.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(t('ticket_downloaded'));
  };

  const generateQRCode = (ticket: TicketWithEvent) => {
    // In a real implementation, this would generate a proper QR code
    const qrData = `TICKET:${ticket.id}:${ticket.event.id}:${user?.id}`;
    
    // For now, we'll show the QR data
    toast.info(t('qr_code_generated'));
    return qrData;
  };

  if (loading) {
    return <LoadingSpinner text={t('loading_tickets')} />;
  }

  const activeTickets = getTicketsByStatus('confirmed');
  const usedTickets = getTicketsByStatus('used');
  const pendingTickets = getTicketsByStatus('pending');
  const cancelledTickets = getTicketsByStatus('cancelled');

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-3xl font-bold">{t('my_tickets')}</h1>
        <p className="text-muted-foreground">{t('tickets_description')}</p>
      </motion.div>

      {/* Search and Filter */}
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
                  placeholder={t('search_tickets')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_statuses')}</SelectItem>
                <SelectItem value="confirmed">{t('confirmed')}</SelectItem>
                <SelectItem value="used">{t('used')}</SelectItem>
                <SelectItem value="pending">{t('pending')}</SelectItem>
                <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Tickets Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="active">
            {t('active')} ({activeTickets.length})
          </TabsTrigger>
          <TabsTrigger value="used">
            {t('used')} ({usedTickets.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            {t('pending')} ({pendingTickets.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t('cancelled')} ({cancelledTickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <TicketsList tickets={activeTickets} />
        </TabsContent>

        <TabsContent value="used" className="space-y-4">
          <TicketsList tickets={usedTickets} />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <TicketsList tickets={pendingTickets} />
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-4">
          <TicketsList tickets={cancelledTickets} />
        </TabsContent>
      </Tabs>
      </motion.div>
    </div>
  );

  function TicketsList({ tickets }: { tickets: TicketWithEvent[] }) {
    if (tickets.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Ticket className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('no_tickets_found')}</h3>
            <p className="text-muted-foreground">{t('no_tickets_description')}</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket, index) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="line-clamp-2">{ticket.event.title}</CardTitle>
                    <CardDescription className="line-clamp-1 mt-2">
                      {ticket.event.description}
                    </CardDescription>
                  </div>
                  {getStatusBadge(ticket.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(ticket.event.start_date || '')}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {ticket.event.location}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Ticket className="h-4 w-4 mr-2" />
                    {t('ticket_id')}: {ticket.id.slice(0, 8)}...
                  </div>
                </div>

                <div className="text-lg font-bold">
                  {formatPrice(ticket.event.price || 0)}
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('view')}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{ticket.event.title}</DialogTitle>
                        <DialogDescription>
                          {t('ticket_details')}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong>{t('ticket_id')}:</strong>
                            <p className="font-mono">{ticket.id}</p>
                          </div>
                          <div>
                            <strong>{t('status')}:</strong>
                            <div className="mt-1">{getStatusBadge(ticket.status)}</div>
                          </div>
                          <div>
                            <strong>{t('event_date')}:</strong>
                            <p>{formatDate(ticket.event.start_date || '')}</p>
                          </div>
                          <div>
                            <strong>{t('purchase_date')}:</strong>
                            <p>{formatDate(ticket.created_at || '')}</p>
                          </div>
                          <div className="col-span-2">
                            <strong>{t('location')}:</strong>
                            <p>{ticket.event.location}</p>
                          </div>
                          {ticket.event.description && (
                            <div className="col-span-2">
                              <strong>{t('description')}:</strong>
                              <p>{ticket.event.description}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            onClick={() => generateQRCode(ticket)}
                            className="flex-1"
                            disabled={ticket.status !== 'confirmed'}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            {t('show_qr_code')}
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={() => downloadTicket(ticket)}
                            className="flex-1"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {t('download')}
                          </Button>
                        </div>
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

export default TicketsPage;