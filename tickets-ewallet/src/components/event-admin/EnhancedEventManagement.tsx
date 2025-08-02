import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
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
  Upload,
  Image as ImageIcon,
  Palette,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  UserPlus,
  QrCode,
  CreditCard,
  Star,
  Building,
  Music,
  Trophy,
  Film
} from 'lucide-react'

// Enhanced interfaces
interface TicketType {
  id?: string
  event_id: string
  name: string
  description: string
  price: number
  quantity_available?: number
  quantity_sold: number
  color: string
  benefits: string[]
  restrictions: string[]
  metadata: Record<string, any>
  is_active: boolean
}

interface EventAdmin {
  id?: string
  event_id: string
  user_id: string
  assigned_by: string
  role: 'admin' | 'moderator' | 'validator'
  permissions: string[]
  is_active: boolean
  user?: {
    full_name: string
    email: string
  }
}

interface ParentEvent {
  id: string
  title: string
  category: string
  is_active: boolean
}

interface Event {
  id: string
  parent_event_id?: string
  title: string
  description: string
  category: string
  start_date: string
  end_date?: string
  location: string
  price: number
  available_quantity: number
  current_bookings?: number
  is_active: boolean
  image_url?: string
  metadata: Record<string, any>
  created_at: string
  created_by: string
  ticket_types?: TicketType[]
  child_events?: Event[]
  event_admins?: EventAdmin[]
}

const eventCategories = [
  { value: 'cinema', label: 'Cinema', icon: Film },
  { value: 'hotel', label: 'Hotel', icon: Building },
  { value: 'concert', label: 'Concert', icon: Music },
  { value: 'sports', label: 'Sports', icon: Trophy },
  { value: 'conference', label: 'Conference', icon: Users },
  { value: 'workshop', label: 'Workshop', icon: Settings },
  { value: 'festival', label: 'Festival', icon: Star },
  { value: 'theater', label: 'Theater', icon: Music },
  { value: 'exhibition', label: 'Exhibition', icon: Eye },
  { value: 'other', label: 'Other', icon: Calendar }
]

const ticketTypeTemplates = {
  cinema: [
    { name: 'Standard', description: 'Regular cinema seat', price: 1500, color: '#6B7280' },
    { name: 'VIP', description: 'Premium seats with extra comfort', price: 2500, color: '#F59E0B' },
    { name: 'IMAX', description: 'IMAX experience with best sound and picture', price: 3500, color: '#EF4444' }
  ],
  hotel: [
    { name: 'Single Room', description: 'Single bed accommodation', price: 5000, color: '#6B7280' },
    { name: 'Double Room', description: 'Double bed accommodation', price: 7500, color: '#3B82F6' },
    { name: 'Suite', description: 'Luxury suite with living area', price: 12000, color: '#F59E0B' },
    { name: 'Deluxe Suite', description: 'Premium suite with all amenities', price: 20000, color: '#EF4444' }
  ],
  concert: [
    { name: 'General Admission', description: 'Standing area access', price: 2000, color: '#6B7280' },
    { name: 'Silver', description: 'Reserved seating in middle sections', price: 3500, color: '#9CA3AF' },
    { name: 'Gold', description: 'Premium seating with great view', price: 5000, color: '#F59E0B' },
    { name: 'VIP', description: 'Front row seats with meet & greet', price: 10000, color: '#EF4444' }
  ],
  sports: [
    { name: 'General', description: 'General admission to the venue', price: 1500, color: '#6B7280' },
    { name: 'Premium', description: 'Better seating with good view', price: 3000, color: '#3B82F6' },
    { name: 'VIP', description: 'Premium seats with hospitality', price: 7500, color: '#F59E0B' }
  ],
  default: [
    { name: 'General Admission', description: 'Standard event ticket', price: 1000, color: '#3B82F6' }
  ]
}

export default function EnhancedEventManagement() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  
  // State management
  const [events, setEvents] = useState<Event[]>([])
  const [parentEvents, setParentEvents] = useState<ParentEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([])
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [activeTab, setActiveTab] = useState('basic')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  // Form data state
  const [formData, setFormData] = useState({
    parent_event_id: '',
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    price: 0,
    available_quantity: 100,
    category: 'other',
    is_active: true,
    metadata: {}
  })

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([])
  const [eventAdmins, setEventAdmins] = useState<EventAdmin[]>([])

  useEffect(() => {
    fetchEvents()
    fetchParentEvents()
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
            id,
            ticket_type_id,
            status
          ),
          ticket_types (
            id,
            name,
            description,
            price,
            quantity_available,
            quantity_sold,
            color,
            benefits,
            restrictions,
            is_active
          ),
          event_admins (
            id,
            user_id,
            role,
            permissions,
            is_active,
            profiles (
              full_name,
              email
            )
          )
        `)
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Process events with hierarchical structure
      const eventsWithBookings = data.map(event => ({
        ...event,
        current_bookings: event.user_tickets?.filter((t: any) => t.status === 'active').length || 0,
        ticket_types: event.ticket_types || [],
        event_admins: event.event_admins?.map((admin: any) => ({
          ...admin,
          user: admin.profiles
        })) || []
      }))

      // Separate parent and child events
      const parentEvents = eventsWithBookings.filter(e => !e.parent_event_id)
      const childEvents = eventsWithBookings.filter(e => e.parent_event_id)

      // Group child events under parents
      const eventsWithChildren = parentEvents.map(parent => ({
        ...parent,
        child_events: childEvents.filter(child => child.parent_event_id === parent.id)
      }))

      setEvents(eventsWithChildren)
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error(t('errorFetchingEvents'))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchParentEvents = async () => {
    if (!profile) return
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, category, is_active')
        .eq('created_by', profile.id)
        .is('parent_event_id', null)
        .eq('is_active', true)

      if (error) throw error
      setParentEvents(data || [])
    } catch (error) {
      console.error('Error fetching parent events:', error)
    }
  }

  const filterEvents = () => {
    let filtered = events

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.child_events?.some(child => 
          child.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          child.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => 
        event.category === categoryFilter ||
        event.child_events?.some(child => child.category === categoryFilter)
      )
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(event => event.is_active)
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(event => !event.is_active)
      } else if (statusFilter === 'upcoming') {
        filtered = filtered.filter(event => new Date(event.start_date) > new Date())
      } else if (statusFilter === 'past') {
        filtered = filtered.filter(event => new Date(event.start_date) < new Date())
      }
    }

    setFilteredEvents(filtered)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadEventImage = async (eventId: string) => {
    if (!selectedImage) return null

    try {
      const fileExt = selectedImage.name.split('.').pop()
      const fileName = `${eventId}-${Date.now()}.${fileExt}`
      const filePath = `events/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, selectedImage)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Error uploading image')
      return null
    }
  }

  const loadTicketTypeTemplate = (category: string) => {
    const template = ticketTypeTemplates[category as keyof typeof ticketTypeTemplates] || ticketTypeTemplates.default
    const newTicketTypes = template.map(template => ({
      event_id: '',
      name: template.name,
      description: template.description,
      price: template.price,
      quantity_available: 100,
      quantity_sold: 0,
      color: template.color,
      benefits: [],
      restrictions: [],
      metadata: {},
      is_active: true
    }))
    setTicketTypes(newTicketTypes)
  }

  const addTicketType = () => {
    setTicketTypes(prev => [...prev, {
      event_id: '',
      name: '',
      description: '',
      price: 0,
      quantity_available: 100,
      quantity_sold: 0,
      color: '#3B82F6',
      benefits: [],
      restrictions: [],
      metadata: {},
      is_active: true
    }])
  }

  const updateTicketType = (index: number, field: string, value: any) => {
    setTicketTypes(prev => prev.map((ticket, i) => 
      i === index ? { ...ticket, [field]: value } : ticket
    ))
  }

  const removeTicketType = (index: number) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!profile) return

    try {
      // Create or update event
      const eventData = {
        ...formData,
        created_by: profile.id,
        parent_event_id: formData.parent_event_id || null,
        updated_at: new Date().toISOString()
      }

      let result
      let eventId: string

      if (editingEvent) {
        result = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingEvent.id)
          .select()
        eventId = editingEvent.id
      } else {
        result = await supabase
          .from('events')
          .insert(eventData)
          .select()
        eventId = result.data?.[0]?.id
      }

      if (result.error) throw result.error

      // Upload image if selected
      if (selectedImage && eventId) {
        const imageUrl = await uploadEventImage(eventId)
        if (imageUrl) {
          await supabase
            .from('events')
            .update({ image_url: imageUrl })
            .eq('id', eventId)
        }
      }

      // Save ticket types
      if (ticketTypes.length > 0 && eventId) {
        // Delete existing ticket types if editing
        if (editingEvent) {
          await supabase
            .from('ticket_types')
            .delete()
            .eq('event_id', eventId)
        }

        // Insert new ticket types
        const ticketTypesData = ticketTypes.map(tt => ({
          ...tt,
          event_id: eventId
        }))

        const { error: ticketTypesError } = await supabase
          .from('ticket_types')
          .insert(ticketTypesData)

        if (ticketTypesError) throw ticketTypesError
      }

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
      parent_event_id: event.parent_event_id || '',
      title: event.title,
      description: event.description,
      start_date: event.start_date.slice(0, 16),
      end_date: event.end_date?.slice(0, 16) || '',
      location: event.location,
      price: event.price,
      available_quantity: event.available_quantity,
      category: event.category,
      is_active: event.is_active,
      metadata: event.metadata || {}
    })
    setTicketTypes(event.ticket_types || [])
    setEventAdmins(event.event_admins || [])
    setImagePreview(event.image_url || null)
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
      parent_event_id: '',
      title: '',
      description: '',
      start_date: '',
      end_date: '',
      location: '',
      price: 0,
      available_quantity: 100,
      category: 'other',
      is_active: true,
      metadata: {}
    })
    setTicketTypes([])
    setEventAdmins([])
    setSelectedImage(null)
    setImagePreview(null)
    setActiveTab('basic')
  }

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(eventId)) {
        newSet.delete(eventId)
      } else {
        newSet.add(eventId)
      }
      return newSet
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
    if (new Date(event.start_date) < new Date()) return 'destructive'
    return 'default'
  }

  const getStatusText = (event: Event) => {
    if (!event.is_active) return t('inactive')
    if (new Date(event.start_date) < new Date()) return t('ended')
    return t('active')
  }

  const getCategoryIcon = (category: string) => {
    const categoryConfig = eventCategories.find(c => c.value === category)
    const IconComponent = categoryConfig?.icon || Calendar
    return <IconComponent className="h-4 w-4" />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('enhancedEventManagement')}</h1>
          <p className="text-muted-foreground">{t('createAndManageAdvancedEvents')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingEvent(null) }}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createEvent')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingEvent ? t('editEvent') : t('createNewEvent')}
              </DialogTitle>
              <DialogDescription>
                {editingEvent ? t('updateEventDetails') : t('fillEventInformation')}
              </DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">{t('basicInfo')}</TabsTrigger>
                <TabsTrigger value="image">{t('eventImage')}</TabsTrigger>
                <TabsTrigger value="tickets">{t('ticketTypes')}</TabsTrigger>
                <TabsTrigger value="settings">{t('settings')}</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
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
                    <Select 
                      value={formData.category} 
                      onValueChange={(value) => {
                        handleInputChange('category', value)
                        if (!editingEvent) {
                          loadTicketTypeTemplate(value)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {eventCategories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            <div className="flex items-center space-x-2">
                              {React.createElement(category.icon, { className: "h-4 w-4" })}
                              <span>{t(category.label.toLowerCase())}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_event">{t('parentEvent')} ({t('optional')})</Label>
                  <Select 
                    value={formData.parent_event_id} 
                    onValueChange={(value) => handleInputChange('parent_event_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectParentEvent')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('noParentEvent')}</SelectItem>
                      {parentEvents.map(parent => (
                        <SelectItem key={parent.id} value={parent.id}>
                          {parent.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Label htmlFor="start_date">{t('startDate')}</Label>
                    <Input
                      id="start_date"
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange('start_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">{t('endDate')} ({t('optional')})</Label>
                    <Input
                      id="end_date"
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => handleInputChange('end_date', e.target.value)}
                    />
                  </div>
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

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="price">{t('basePrice')} (SYP)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', Number(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="available_quantity">{t('totalCapacity')}</Label>
                    <Input
                      id="available_quantity"
                      type="number"
                      value={formData.available_quantity}
                      onChange={(e) => handleInputChange('available_quantity', Number(e.target.value))}
                      min="1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="image" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('eventImage')}</Label>
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                      {imagePreview ? (
                        <div className="space-y-4">
                          <img 
                            src={imagePreview} 
                            alt="Event preview" 
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <div className="flex justify-center space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => document.getElementById('image-upload')?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {t('changeImage')}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setImagePreview(null)
                                setSelectedImage(null)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              {t('removeImage')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              onClick={() => document.getElementById('image-upload')?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {t('uploadImage')}
                            </Button>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t('dragDropOrClickToUpload')}
                          </p>
                        </div>
                      )}
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tickets" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{t('ticketTypes')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('configureMultipleTicketTypes')}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadTicketTypeTemplate(formData.category)}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {t('loadTemplate')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={addTicketType}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('addTicketType')}
                      </Button>
                    </div>
                  </div>

                  {ticketTypes.length > 0 ? (
                    <div className="space-y-4">
                      {ticketTypes.map((ticket, index) => (
                        <Card key={index} className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: ticket.color }}
                                />
                                <h4 className="font-medium">
                                  {ticket.name || `${t('ticketType')} ${index + 1}`}
                                </h4>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTicketType(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid gap-4 md:grid-cols-2">
                              <div className="space-y-2">
                                <Label>{t('typeName')}</Label>
                                <Input
                                  value={ticket.name}
                                  onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                                  placeholder={t('enterTypeName')}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t('price')} (SYP)</Label>
                                <Input
                                  type="number"
                                  value={ticket.price}
                                  onChange={(e) => updateTicketType(index, 'price', Number(e.target.value))}
                                  min="0"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>{t('description')}</Label>
                              <Textarea
                                value={ticket.description}
                                onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                                placeholder={t('enterTypeDescription')}
                                rows={2}
                              />
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="space-y-2">
                                <Label>{t('quantity')}</Label>
                                <Input
                                  type="number"
                                  value={ticket.quantity_available || ''}
                                  onChange={(e) => updateTicketType(index, 'quantity_available', e.target.value ? Number(e.target.value) : null)}
                                  placeholder={t('unlimited')}
                                  min="0"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>{t('color')}</Label>
                                <div className="flex space-x-2">
                                  <Input
                                    type="color"
                                    value={ticket.color}
                                    onChange={(e) => updateTicketType(index, 'color', e.target.value)}
                                    className="w-16 h-10 p-1"
                                  />
                                  <Input
                                    value={ticket.color}
                                    onChange={(e) => updateTicketType(index, 'color', e.target.value)}
                                    placeholder="#3B82F6"
                                    className="flex-1"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>{t('status')}</Label>
                                <Switch
                                  checked={ticket.is_active}
                                  onCheckedChange={(checked) => updateTicketType(index, 'is_active', checked)}
                                />
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="p-6">
                      <div className="text-center text-muted-foreground">
                        <CreditCard className="mx-auto h-12 w-12 mb-4" />
                        <h3 className="text-lg font-medium mb-2">{t('noTicketTypes')}</h3>
                        <p className="mb-4">{t('addTicketTypesToStart')}</p>
                        <Button onClick={addTicketType}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('addTicketType')}
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                    <Label htmlFor="is_active">{t('eventActive')}</Label>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-2">{t('eventMetadata')}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('additionalEventSettings')}
                    </p>
                    <Textarea
                      value={JSON.stringify(formData.metadata, null, 2)}
                      onChange={(e) => {
                        try {
                          const metadata = JSON.parse(e.target.value)
                          handleInputChange('metadata', metadata)
                        } catch (error) {
                          // Invalid JSON, don't update
                        }
                      }}
                      placeholder='{"custom_field": "value"}'
                      rows={5}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button onClick={handleSubmit}>
                {editingEvent ? t('updateEvent') : t('createEvent')}
              </Button>
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
                  <SelectItem key={category.value} value={category.value}>
                    {t(category.label.toLowerCase())}
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

      {/* Events List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        ) : filteredEvents.length > 0 ? (
          <AnimatePresence>
            {filteredEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {event.image_url && (
                          <img 
                            src={event.image_url} 
                            alt={event.title}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEventExpansion(event.id)}
                              className="p-0 h-auto"
                            >
                              {expandedEvents.has(event.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <h3 className="text-lg font-semibold">{event.title}</h3>
                            <Badge variant={getStatusColor(event)}>
                              {getStatusText(event)}
                            </Badge>
                            {event.child_events && event.child_events.length > 0 && (
                              <Badge variant="outline">
                                {event.child_events.length} {t('childEvents')}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              {getCategoryIcon(event.category)}
                              <span>{t(event.category)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {new Date(event.start_date).toLocaleDateString(
                                  language === 'ar' ? 'ar-SY' : 'en-US'
                                )}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{event.location}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-4 w-4" />
                              <span>{event.current_bookings}/{event.available_quantity}</span>
                            </div>
                          </div>

                          {event.ticket_types && event.ticket_types.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {event.ticket_types.map(ticketType => (
                                <Badge 
                                  key={ticketType.id} 
                                  variant="outline"
                                  style={{ borderColor: ticketType.color }}
                                >
                                  {ticketType.name} - {formatCurrency(ticketType.price)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
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
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedEvents.has(event.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="mt-4 pt-4 border-t"
                        >
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              {event.description}
                            </p>

                            {/* Child Events */}
                            {event.child_events && event.child_events.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">{t('childEvents')}</h4>
                                <div className="space-y-2">
                                  {event.child_events.map(childEvent => (
                                    <Card key={childEvent.id} className="p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          {getCategoryIcon(childEvent.category)}
                                          <span className="font-medium">{childEvent.title}</span>
                                          <Badge variant={getStatusColor(childEvent)}>
                                            {getStatusText(childEvent)}
                                          </Badge>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEdit(childEvent)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Event Admins */}
                            {event.event_admins && event.event_admins.length > 0 && (
                              <div>
                                <h4 className="font-medium mb-2">{t('eventAdmins')}</h4>
                                <div className="space-y-2">
                                  {event.event_admins.map(admin => (
                                    <div key={admin.id} className="flex items-center space-x-2 text-sm">
                                      <Badge variant="outline">{admin.role}</Badge>
                                      <span>{admin.user?.full_name}</span>
                                      <span className="text-muted-foreground">({admin.user?.email})</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">{t('noEventsFound')}</h3>
                <p className="text-muted-foreground">{t('createYourFirstEvent')}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}