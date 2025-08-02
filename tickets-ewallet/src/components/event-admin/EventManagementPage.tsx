import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Edit,
  Trash2,
  Eye,
  Settings,
  Download,
  Upload
} from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  event_date: string
  location: string
  ticket_price: number
  max_capacity: number
  current_bookings: number
  category: string
  is_active: boolean
  image_url?: string
  created_at: string
  created_by: string
}

const eventCategories = [
  'concert',
  'sports',
  'conference',
  'workshop',
  'festival',
  'theater',
  'exhibition',
  'other'
]

export default function EventManagementPage() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  const [events, setEvents] = useState<Event[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    ticket_price: 0,
    max_capacity: 100,
    category: 'other',
    is_active: true
  })

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, searchQuery, categoryFilter, statusFilter])

  const fetchEvents = async () => {
    if (!profile) return
    
    try {
      setIsLoading(true)
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          user_tickets (
            id
          )
        `)
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Calculate current bookings for each event
      const eventsWithBookings = data.map(event => ({
        ...event,
        current_bookings: event.user_tickets?.length || 0
      }))

      setEvents(eventsWithBookings)
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error(t('errorFetchingEvents'))
    } finally {
      setIsLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = events

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === categoryFilter)
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(event => event.is_active)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(event => !event.is_active)
      } else if (statusFilter === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.event_date) > new Date())
      } else if (statusFilter === 'past') {
        filtered = filtered.filter(event => new Date(event.event_date) < new Date())
      }
    }

    setFilteredEvents(filtered)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!profile) return

    try {
      const eventData = {
        ...formData,
        created_by: profile.id,
        updated_at: new Date().toISOString()
      }

      let result
      if (editingEvent) {
        result = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
          .select()
      } else {
        result = await supabase
          .from('events')
          .insert(eventData)
          .select()
      }

      if (result.error) throw result.error

      toast.success(editingEvent ? t('eventUpdated') : t('eventCreated'))
      setIsCreateDialogOpen(false)
      setEditingEvent(null)
      resetForm()
      fetchEvents()
    } catch (error) {
      console.error('Error saving event:', error)
      toast.error(t('errorSavingEvent'))
    }
  }

  const handleEdit = (event: Event) => {
    setEditingEvent(event)
    setFormData({
      title: event.title,
      description: event.description,
      event_date: event.event_date.split('T')[0],
      location: event.location,
      ticket_price: event.ticket_price,
      max_capacity: event.max_capacity,
      category: event.category,
      is_active: event.is_active
    })
    setIsCreateDialogOpen(true)
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm(t('confirmDeleteEvent'))) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)

      if (error) throw error

      toast.success(t('eventDeleted'))
      fetchEvents()
    } catch (error) {
      console.error('Error deleting event:', error)
      toast.error(t('errorDeletingEvent'))
    }
  }

  const toggleEventStatus = async (event: Event) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ is_active: !event.is_active })
        .eq('id', event.id)

      if (error) throw error

      toast.success(t('eventStatusUpdated'))
      fetchEvents()
    } catch (error) {
      console.error('Error updating event status:', error)
      toast.error(t('errorUpdatingEvent'))
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_date: '',
      location: '',
      ticket_price: 0,
      max_capacity: 100,
      category: 'other',
      is_active: true
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (event: Event) => {
    if (!event.is_active) return 'secondary'
    if (new Date(event.event_date) < new Date()) return 'destructive'
    return 'default'
  }

  const getStatusText = (event: Event) => {
    if (!event.is_active) return t('inactive')
    if (new Date(event.event_date) < new Date()) return t('ended')
    return t('active')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('eventManagement')}</h1>
          <p className="text-muted-foreground">{t('createAndManageYourEvents')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingEvent(null) }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createEvent')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? t('editEvent') : t('createNewEvent')}
              </DialogTitle>
              <DialogDescription>
                {editingEvent ? t('updateEventDetails') : t('fillEventInformation')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('eventTitle')}</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder={t('enterEventTitle')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">{t('category')}</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventCategories.map(category => (
                        <SelectItem key={category} value={category}>
                          {t(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('enterEventDescription')}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="event_date">{t('eventDate')}</Label>
                  <Input
                    id="event_date"
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => handleInputChange('event_date', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">{t('location')}</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder={t('enterEventLocation')}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ticket_price">{t('ticketPrice')} (SYP)</Label>
                  <Input
                    id="ticket_price"
                    type="number"
                    value={formData.ticket_price}
                    onChange={(e) => handleInputChange('ticket_price', Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">{t('maxCapacity')}</Label>
                  <Input
                    id="max_capacity"
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => handleInputChange('max_capacity', Number(e.target.value))}
                    min="1"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                />
                <Label htmlFor="is_active">{t('eventActive')}</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleSubmit}>
                  {editingEvent ? t('updateEvent') : t('createEvent')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchEvents')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filterByCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allCategories')}</SelectItem>
                {eventCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {t(category)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="active">{t('active')}</SelectItem>
                <SelectItem value="inactive">{t('inactive')}</SelectItem>
                <SelectItem value="upcoming">{t('upcoming')}</SelectItem>
                <SelectItem value="past">{t('past')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('eventsList')}</CardTitle>
          <CardDescription>
            {t('totalEvents')}: {filteredEvents.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('event')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('location')}</TableHead>
                    <TableHead>{t('price')}</TableHead>
                    <TableHead>{t('capacity')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event, index) => (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="hover:bg-muted/50"
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{event.title}</p>
                          <Badge variant="outline">{t(event.category)}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {new Date(event.event_date).toLocaleDateString(
                              language === 'ar' ? 'ar-SY' : 'en-US'
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">{event.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>{formatCurrency(event.ticket_price)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{event.current_bookings}/{event.max_capacity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(event)}>
                          {getStatusText(event)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(event)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleEventStatus(event)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">{t('noEventsFound')}</h3>
              <p className="text-muted-foreground">{t('createYourFirstEvent')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}