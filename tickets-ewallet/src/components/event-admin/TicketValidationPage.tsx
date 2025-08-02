import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  QrCode,
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  Ticket,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react'

interface Event {
  id: string
  title: string
  description: string
  category: string
  start_date: string
  location: string
  image_url?: string
  is_active: boolean
}

interface TicketData {
  ticket_number: string
  event_title: string
  event_date: string
  purchased_at: string
  event_details: any
}

interface ValidationResult {
  success: boolean
  message: string
  ticket_data?: TicketData
}

interface QRValidation {
  id: string
  ticket_id: string
  event_id: string
  validated_by: string
  validation_status: string
  validation_location?: string
  validation_notes?: string
  validated_at: string
  ticket?: {
    ticket_number: string
    user?: {
      full_name: string
      email: string
    }
    event_details_snapshot: any
  }
}

export default function TicketValidationPage() {
  const { profile } = useAuth()
  const { t, language } = useLanguage()
  
  // State management
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [validations, setValidations] = useState<QRValidation[]>([])
  const [filteredValidations, setFilteredValidations] = useState<QRValidation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [validationLocation, setValidationLocation] = useState('')
  const [lastValidationResult, setLastValidationResult] = useState<ValidationResult | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isValidationDialogOpen, setIsValidationDialogOpen] = useState(false)
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchEvents()
    return () => {
      stopCamera()
    }
  }, [])

  useEffect(() => {
    if (selectedEvent) {
      fetchValidations()
    }
  }, [selectedEvent])

  useEffect(() => {
    filterValidations()
  }, [validations, searchQuery, statusFilter])

  const fetchEvents = async () => {
    if (!profile) return
    
    try {
      // Fetch events where user is admin or creator
      const { data: eventAdmins, error: adminError } = await supabase
        .from('event_admins')
        .select(`
          event_id,
          events (
            id,
            title,
            description,
            category,
            start_date,
            location,
            image_url,
            is_active
          )
        `)
        .eq('user_id', profile.id)
        .eq('is_active', true)

      if (adminError) throw adminError

      // Also fetch events created by user
      const { data: ownEvents, error: ownError } = await supabase
        .from('events')
        .select('id, title, description, category, start_date, location, image_url, is_active')
        .eq('created_by', profile.id)

      if (ownError) throw ownError

      // Combine and deduplicate events
      const adminEventsData = (eventAdmins || []).map(ea => ea.events).filter(Boolean)
      const allEventsData = [
        ...(ownEvents || []),
        ...adminEventsData
      ]

      const uniqueEvents = allEventsData.reduce((acc: Event[], event: any) => {
        if (event && !acc.find(e => e.id === event.id)) {
          acc.push(event as Event)
        }
        return acc
      }, [] as Event[])

      setEvents(uniqueEvents.filter(e => e.is_active))
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error(t('errorFetchingEvents'))
    } finally {
      setIsLoading(false)
    }
  }

  const fetchValidations = async () => {
    if (!selectedEvent) return

    try {
      const { data, error } = await supabase
        .from('qr_validations')
        .select(`
          *,
          user_tickets (
            ticket_number,
            event_details_snapshot,
            profiles (
              full_name,
              email
            )
          )
        `)
        .eq('event_id', selectedEvent)
        .order('validated_at', { ascending: false })

      if (error) throw error

      const validationsWithTickets = (data || []).map(validation => ({
        ...validation,
        ticket: validation.user_tickets ? {
          ticket_number: validation.user_tickets.ticket_number,
          user: validation.user_tickets.profiles,
          event_details_snapshot: validation.user_tickets.event_details_snapshot
        } : null
      }))

      setValidations(validationsWithTickets)
    } catch (error) {
      console.error('Error fetching validations:', error)
      toast.error('Error fetching validations')
    }
  }

  const filterValidations = () => {
    let filtered = validations

    if (searchQuery) {
      filtered = filtered.filter(validation =>
        validation.ticket?.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        validation.ticket?.user?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        validation.ticket?.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(validation => validation.validation_status === statusFilter)
    }

    setFilteredValidations(filtered)
  }

  const startCamera = async () => {
    try {
      setCameraError(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCameraActive(true)
        
        // Start scanning interval
        scanIntervalRef.current = setInterval(scanQRCode, 1000)
      }
    } catch (error) {
      console.error('Camera error:', error)
      setCameraError(t('cameraAccessDenied'))
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    
    setIsCameraActive(false)
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    try {
      // Here you would use a QR code scanning library
      // For now, we'll simulate with manual input
      // import QrScanner from 'qr-scanner' would be used in real implementation
    } catch (error) {
      // QR scanning failed, continue
    }
  }

  const validateQRCode = async (qrData: string) => {
    if (!selectedEvent) {
      toast.error(t('selectEventFirst'))
      return
    }

    try {
      setIsLoading(true)

      const { data, error } = await supabase.rpc('validate_event_qr', {
        p_ticket_qr_data: qrData,
        p_event_id: selectedEvent,
        p_validator_id: profile?.id,
        p_validation_location: validationLocation || null
      })

      if (error) throw error

      const result = data[0] as ValidationResult
      setLastValidationResult(result)
      setIsValidationDialogOpen(true)

      if (result.success) {
        toast.success(t('ticketValidatedSuccessfully'))
        fetchValidations() // Refresh validation list
      } else {
        toast.error(result.message)
      }

      // Clear manual input
      setManualCode('')
    } catch (error) {
      console.error('Validation error:', error)
      toast.error(t('validationError'))
      setLastValidationResult({
        success: false,
        message: t('validationError')
      })
      setIsValidationDialogOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualValidation = () => {
    if (!manualCode.trim()) {
      toast.error(t('enterQRCode'))
      return
    }
    validateQRCode(manualCode.trim())
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString(
      language === 'ar' ? 'ar-SY' : 'en-US'
    )
  }

  const getValidationStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'default'
      case 'invalid': return 'destructive'
      case 'expired': return 'secondary'
      case 'used': return 'outline'
      default: return 'secondary'
    }
  }

  const getValidationStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'invalid': return <XCircle className="h-4 w-4 text-red-500" />
      case 'expired': return <Clock className="h-4 w-4 text-gray-500" />
      case 'used': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('ticketValidation')}</h1>
          <p className="text-muted-foreground">{t('scanAndValidateEventTickets')}</p>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('selectEvent')}</CardTitle>
          <CardDescription>
            {t('chooseEventToValidateTickets')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('event')}</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectEvent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex items-center space-x-2">
                          <span>{event.title}</span>
                          <span className="text-muted-foreground text-sm">
                            ({new Date(event.start_date).toLocaleDateString()})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('validationLocation')} ({t('optional')})</Label>
                <Input
                  value={validationLocation}
                  onChange={(e) => setValidationLocation(e.target.value)}
                  placeholder={t('enterValidationLocation')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEvent && (
        <>
          {/* QR Scanner Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Camera Scanner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <QrCode className="h-5 w-5" />
                  <span>{t('qrScanner')}</span>
                </CardTitle>
                <CardDescription>
                  {t('scanTicketQRCode')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  {isCameraActive ? (
                    <div className="space-y-4">
                      <div className="relative bg-black rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          className="w-full h-64 object-cover"
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg"></div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={stopCamera}
                        className="w-full"
                      >
                        <CameraOff className="h-4 w-4 mr-2" />
                        {t('stopCamera')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center h-64 bg-muted rounded-lg">
                        <div className="text-center">
                          <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="font-medium">{t('cameraNotActive')}</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            {t('startCameraToScan')}
                          </p>
                        </div>
                      </div>
                      {cameraError ? (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{cameraError}</AlertDescription>
                        </Alert>
                      ) : (
                        <Button
                          onClick={startCamera}
                          className="w-full"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          {t('startCamera')}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Manual Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Ticket className="h-5 w-5" />
                  <span>{t('manualValidation')}</span>
                </CardTitle>
                <CardDescription>
                  {t('enterQRCodeManually')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('qrCodeData')}</Label>
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder={t('pasteQRCodeData')}
                  />
                </div>
                <Button
                  onClick={handleManualValidation}
                  disabled={!manualCode.trim() || isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {t('validateTicket')}
                </Button>

                {/* Quick validation stats */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">{t('todayStats')}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      <div className="font-medium text-green-700 dark:text-green-400">
                        {validations.filter(v => 
                          v.validation_status === 'valid' &&
                          new Date(v.validated_at).toDateString() === new Date().toDateString()
                        ).length}
                      </div>
                      <div className="text-green-600 dark:text-green-500">{t('valid')}</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <div className="font-medium text-red-700 dark:text-red-400">
                        {validations.filter(v => 
                          v.validation_status === 'invalid' &&
                          new Date(v.validated_at).toDateString() === new Date().toDateString()
                        ).length}
                      </div>
                      <div className="text-red-600 dark:text-red-500">{t('invalid')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Validation History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('validationHistory')}</CardTitle>
                  <CardDescription>
                    {t('recentTicketValidations')}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchValidations}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('refresh')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('searchValidations')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('filterByStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('allStatuses')}</SelectItem>
                      <SelectItem value="valid">{t('valid')}</SelectItem>
                      <SelectItem value="invalid">{t('invalid')}</SelectItem>
                      <SelectItem value="expired">{t('expired')}</SelectItem>
                      <SelectItem value="used">{t('used')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Validations Table */}
                {filteredValidations.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('ticket')}</TableHead>
                          <TableHead>{t('holder')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                          <TableHead>{t('location')}</TableHead>
                          <TableHead>{t('validatedAt')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredValidations.map((validation, index) => (
                          <motion.tr
                            key={validation.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">
                                  #{validation.ticket?.ticket_number}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {validation.ticket?.event_details_snapshot?.event_title}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">
                                  {validation.ticket?.user?.full_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {validation.ticket?.user?.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                {getValidationStatusIcon(validation.validation_status)}
                                <Badge variant={getValidationStatusColor(validation.validation_status)}>
                                  {t(validation.validation_status)}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {validation.validation_location || '-'}
                            </TableCell>
                            <TableCell>
                              {formatDateTime(validation.validated_at)}
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium">{t('noValidationsFound')}</h3>
                    <p className="text-muted-foreground">{t('startValidatingTickets')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Validation Result Dialog */}
      <Dialog open={isValidationDialogOpen} onOpenChange={setIsValidationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {lastValidationResult?.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>{t('validTicket')}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span>{t('invalidTicket')}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                {lastValidationResult?.message}
              </AlertDescription>
            </Alert>

            {lastValidationResult?.success && lastValidationResult.ticket_data && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('ticketDetails')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('ticketNumber')}:</span>
                      <span className="font-medium">#{lastValidationResult.ticket_data.ticket_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('event')}:</span>
                      <span className="font-medium">{lastValidationResult.ticket_data.event_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('eventDate')}:</span>
                      <span>{formatDateTime(lastValidationResult.ticket_data.event_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('purchasedAt')}:</span>
                      <span>{formatDateTime(lastValidationResult.ticket_data.purchased_at)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setIsValidationDialogOpen(false)}>
                {t('close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}