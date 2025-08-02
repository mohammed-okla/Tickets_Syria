import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  QrCode,
  Camera,
  CameraOff,
  Smartphone,
  Car,
  Store,
  Ticket,
  AlertCircle,
  CheckCircle,
  Loader2,
  History,
  Plus,
  Minus,
  Wallet,
  HelpCircle,
  Zap,
  ShieldCheck
} from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface QRScanResult {
  type: 'driver' | 'merchant' | 'unknown'
  data: any
  rawData: string
}

interface PaymentConfirmation {
  qrData: any
  amount?: number
  quantity?: number
  type: 'driver' | 'merchant'
}

interface WalletData {
  balance: number
  currency: string
  is_frozen: boolean
}

export default function QRScannerPage() {
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null)
  const [manualQRInput, setManualQRInput] = useState('')
  const [paymentDialog, setPaymentDialog] = useState<PaymentConfirmation | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [ticketQuantity, setTicketQuantity] = useState(1)
  const [processing, setProcessing] = useState(false)
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [recentScans, setRecentScans] = useState<QRScanResult[]>([])
  const [cameraError, setCameraError] = useState<string>('')
  const [initializing, setInitializing] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [cameraSupported, setCameraSupported] = useState(true)
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const { profile } = useAuth()
  const { t, isRTL } = useLanguage()

  useEffect(() => {
    if (profile) {
      fetchWalletData()
    }
    
    // Check camera support
    checkCameraSupport()
    
    return () => {
      stopScanning()
    }
  }, [profile])

  const checkCameraSupport = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraSupported(false)
        return
      }
      
      // Check if camera devices are available
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      if (videoDevices.length === 0) {
        setCameraSupported(false)
      }
    } catch (error) {
      console.error('Error checking camera support:', error)
      setCameraSupported(false)
    }
  }

  const fetchWalletData = async () => {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', profile?.id)
        .single()

      if (error) throw error
      setWalletData(data)
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    }
  }

  const startScanning = async () => {
    if (!scanning) {
      setInitializing(true)
      setCameraError('')
      
      try {
        if (!cameraSupported) {
          throw new Error('Camera not supported on this device')
        }
        
        // Request camera permissions first with better error handling
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        })
        
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop())
        
        setScanning(true)
        setScanResult(null)
        
        const config = {
          fps: 10,
          qrbox: { width: 280, height: 280 },
          rememberLastUsedCamera: true,
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
          supportedScanTypes: [0], // Only QR codes
          videoConstraints: {
            facingMode: 'environment'
          }
        }

        scannerRef.current = new Html5QrcodeScanner('qr-reader', config, false)
        
        scannerRef.current.render(
          (decodedText) => {
            handleScanSuccess(decodedText)
          },
          (error) => {
            // Handle scan error silently - this fires frequently during scanning
            console.debug('QR scan error (normal):', error)
          }
        )
        
        toast.success('Camera started successfully! Point at a QR code to scan.')
        
      } catch (error: any) {
        console.error('Camera initialization error:', error)
        setScanning(false)
        
        if (error.name === 'NotAllowedError') {
          setCameraError('Camera permission denied. Please allow camera access and try again.')
          toast.error('Camera permission denied. Please allow camera access to scan QR codes.')
        } else if (error.name === 'NotFoundError') {
          setCameraError('No camera found on this device.')
          toast.error('No camera found on this device. Please use manual entry.')
        } else if (error.name === 'NotSupportedError') {
          setCameraError('Camera not supported on this browser.')
          toast.error('Camera not supported. Please try a different browser or use manual entry.')
        } else {
          setCameraError('Camera initialization failed. Please try again or use manual entry.')
          toast.error('Failed to start camera. Please try again or use manual entry.')
        }
      } finally {
        setInitializing(false)
      }
    }
  }

  const stopScanning = () => {
    if (scannerRef.current && scanning) {
      scannerRef.current.clear().then(() => {
        setScanning(false)
      }).catch((error) => {
        console.error('Error stopping scanner:', error)
        setScanning(false)
      })
    }
  }

  const handleScanSuccess = (decodedText: string) => {
    stopScanning()
    processQRCode(decodedText)
  }

  const processQRCode = async (qrData: string) => {
    try {
      // Try to parse as JSON first
      let parsedData
      try {
        parsedData = JSON.parse(qrData)
      } catch {
        // If not JSON, treat as raw string
        parsedData = { raw: qrData }
      }

      // Determine QR code type and process accordingly
      let result: QRScanResult

      if (parsedData.type === 'driver' || parsedData.driver_id) {
        // Driver payment QR
        result = {
          type: 'driver',
          data: parsedData,
          rawData: qrData
        }
        
        // Fetch driver details from database
        const { data: driverData } = await supabase
          .from('qr_codes')
          .select(`
            *,
            driver_profile:driver_profiles!qr_codes_driver_id_fkey(
              ticket_fee,
              route_name,
              vehicle_type
            ),
            profile:profiles!qr_codes_driver_id_fkey(full_name)
          `)
          .eq('qr_data', qrData)
          .eq('is_active', true)
          .single()

        if (driverData) {
          result.data = { ...result.data, ...driverData }
          setPaymentDialog({
            qrData: result.data,
            amount: driverData.driver_profile?.ticket_fee || 500,
            quantity: 1,
            type: 'driver'
          })
        } else {
          throw new Error('Invalid or inactive driver QR code')
        }
      } else if (parsedData.type === 'merchant' || parsedData.merchant_id) {
        // Merchant payment QR
        result = {
          type: 'merchant',
          data: parsedData,
          rawData: qrData
        }
        
        // For merchant QR, usually amount is specified in QR or user enters it
        setPaymentDialog({
          qrData: result.data,
          amount: parsedData.amount,
          type: 'merchant'
        })
      } else {
        // Unknown QR type
        result = {
          type: 'unknown',
          data: parsedData,
          rawData: qrData
        }
        toast.error('Unrecognized QR code format')
      }

      setScanResult(result)
      setRecentScans(prev => [result, ...prev.slice(0, 4)]) // Keep last 5 scans
      
    } catch (error) {
      console.error('Error processing QR code:', error)
      toast.error('Invalid QR code or service unavailable')
    }
  }

  const handleManualQRSubmit = () => {
    if (manualQRInput.trim()) {
      processQRCode(manualQRInput.trim())
      setManualQRInput('')
    }
  }

  const processPayment = async () => {
    if (!paymentDialog || !profile) return

    setProcessing(true)

    try {
      if (paymentDialog.type === 'driver') {
        // Process transport payment
        const { data, error } = await supabase.rpc('process_transport_payment', {
          p_passenger_id: profile.id,
          p_driver_id: paymentDialog.qrData.driver_id,
          p_amount: (paymentDialog.amount || 500) * ticketQuantity,
          p_qr_code_id: paymentDialog.qrData.id,
          p_quantity: ticketQuantity
        })

        if (error) throw error

        if (data && data.length > 0) {
          const result = data[0]
          if (result.error_message) {
            toast.error(result.error_message)
          } else {
            toast.success(t('scanner.paymentSuccess'))
            setPaymentDialog(null)
            fetchWalletData()
          }
        }
      } else if (paymentDialog.type === 'merchant') {
        // Process merchant payment
        const amount = parseFloat(paymentAmount) || paymentDialog.amount || 0
        
        if (amount <= 0) {
          toast.error('Please enter a valid amount')
          return
        }

        const { data, error } = await supabase.rpc('process_merchant_payment', {
          p_passenger_id: profile.id,
          p_merchant_id: paymentDialog.qrData.merchant_id || paymentDialog.qrData.user_id,
          p_amount: amount
        })

        if (error) throw error

        if (data && data.length > 0) {
          const result = data[0]
          if (result.error_message) {
            toast.error(result.error_message)
          } else {
            toast.success(t('scanner.paymentSuccess'))
            setPaymentDialog(null)
            fetchWalletData()
          }
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error)
      toast.error(t('scanner.paymentFailed'))
    } finally {
      setProcessing(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="h-full p-4 lg:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">{t('scanner.title')}</h1>
          <p className="text-muted-foreground">Scan QR codes to make instant payments</p>
        </div>
        
        {walletData && (
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="font-medium">{formatCurrency(walletData.balance)}</span>
            </div>
          </Card>
        )}
      </motion.div>

      {/* Wallet Status Alert */}
      {walletData?.is_frozen && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your wallet is frozen. You cannot make payments at this time.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="scan" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="scan" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Scan QR Code
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="space-y-6">
          {/* QR Scanner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Scanner
                </CardTitle>
                <CardDescription>
                  Point your camera at a QR code to scan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!scanning ? (
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-64 h-64 border-2 border-dashed border-primary/30 rounded-xl flex items-center justify-center bg-primary/5 relative overflow-hidden">
                      <div className="text-center z-10">
                        {cameraError ? (
                          <>
                            <CameraOff className="h-16 w-16 mx-auto text-red-500 mb-3" />
                            <p className="text-sm text-red-600 mb-2">Camera Error</p>
                            <p className="text-xs text-muted-foreground px-4">{cameraError}</p>
                          </>
                        ) : initializing ? (
                          <>
                            <Loader2 className="h-16 w-16 mx-auto text-primary mb-3 animate-spin" />
                            <p className="text-sm text-muted-foreground mb-2">Starting camera...</p>
                            <p className="text-xs text-muted-foreground">Please allow camera access</p>
                          </>
                        ) : (
                          <>
                            <Camera className="h-16 w-16 mx-auto text-primary mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">Ready to scan QR codes</p>
                            <p className="text-xs text-muted-foreground">Make sure to allow camera access</p>
                          </>
                        )}
                      </div>
                      
                      {/* Animated scanning lines */}
                      {!cameraError && !initializing && (
                        <motion.div
                          className="absolute inset-0 border-2 border-primary/20"
                          animate={{
                            opacity: [0.3, 0.7, 0.3],
                            scale: [0.9, 1, 0.9]
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      {cameraSupported ? (
                        <Button 
                          onClick={startScanning} 
                          disabled={initializing}
                          className="gap-2 px-8 py-3 text-base"
                        >
                          {initializing ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Starting Camera...
                            </>
                          ) : (
                            <>
                              <Camera className="h-5 w-5" />
                              Start Camera Scanner
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              Camera not available on this device. Please use manual entry below.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        onClick={() => setShowTutorial(true)}
                        className="gap-2"
                      >
                        <HelpCircle className="h-4 w-4" />
                        How to Scan
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                      Point your camera at a QR code to scan. Works with driver transport QR codes and merchant payment QR codes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <div id="qr-reader" className="mx-auto max-w-sm"></div>
                      
                      {/* Scanning overlay */}
                      <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                          <div className="bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            Scanning...
                          </div>
                          <div className="bg-black/50 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Secure
                          </div>
                        </div>
                      </motion.div>
                    </div>
                    
                    <div className="text-center space-y-2">
                      <Button onClick={stopScanning} variant="outline" className="gap-2">
                        <CameraOff className="h-4 w-4" />
                        Stop Scanning
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Hold your device steady and ensure the QR code is clearly visible
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          {/* Manual QR Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Manual QR Code Entry</CardTitle>
                <CardDescription>
                  Enter QR code data manually if scanning doesn't work
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qr-input">QR Code Data</Label>
                  <Input
                    id="qr-input"
                    placeholder="Paste or type QR code data here"
                    value={manualQRInput}
                    onChange={(e) => setManualQRInput(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleManualQRSubmit} 
                  disabled={!manualQRInput.trim()}
                  className="w-full gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  Process QR Code
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Recent Scans */}
      {recentScans.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Scans
              </CardTitle>
              <CardDescription>
                Previously scanned QR codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentScans.map((scan, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {scan.type === 'driver' ? (
                        <Car className="h-5 w-5 text-blue-500" />
                      ) : scan.type === 'merchant' ? (
                        <Store className="h-5 w-5 text-green-500" />
                      ) : (
                        <QrCode className="h-5 w-5 text-gray-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {scan.type === 'driver' ? 'Transport Payment' : 
                           scan.type === 'merchant' ? 'Merchant Payment' : 'Unknown QR'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-40">
                          {scan.rawData}
                        </p>
                      </div>
                    </div>
                    <Badge variant={scan.type === 'unknown' ? 'destructive' : 'secondary'}>
                      {scan.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payment Confirmation Dialog */}
      <Dialog open={!!paymentDialog} onOpenChange={(open) => !open && setPaymentDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {paymentDialog?.type === 'driver' ? (
                <Car className="h-5 w-5 text-blue-500" />
              ) : (
                <Store className="h-5 w-5 text-green-500" />
              )}
              Confirm Payment
            </DialogTitle>
            <DialogDescription>
              {paymentDialog?.type === 'driver' 
                ? 'Confirm your transport payment'
                : 'Confirm your merchant payment'
              }
            </DialogDescription>
          </DialogHeader>

          {paymentDialog && (
            <div className="space-y-4">
              {/* Payment Details */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  {paymentDialog.type === 'driver' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Driver:</span>
                        <span className="text-sm font-medium">
                          {paymentDialog.qrData.profile?.full_name || 'Unknown Driver'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Route:</span>
                        <span className="text-sm font-medium">
                          {paymentDialog.qrData.driver_profile?.route_name || 'City Route'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Vehicle:</span>
                        <span className="text-sm font-medium">
                          {paymentDialog.qrData.driver_profile?.vehicle_type || 'Bus'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Ticket Price:</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(paymentDialog.amount || 500)}
                        </span>
                      </div>
                      
                      {/* Ticket Quantity */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('scanner.quantity')}:</span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTicketQuantity(Math.max(1, ticketQuantity - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">{ticketQuantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTicketQuantity(ticketQuantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {paymentDialog.type === 'merchant' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Merchant:</span>
                        <span className="text-sm font-medium">
                          {paymentDialog.qrData.business_name || 'Local Store'}
                        </span>
                      </div>
                      
                      {!paymentDialog.amount && (
                        <div className="space-y-2">
                          <Label htmlFor="payment-amount">Payment Amount</Label>
                          <Input
                            id="payment-amount"
                            type="number"
                            placeholder="Enter amount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                          />
                        </div>
                      )}
                    </>
                  )}

                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>
                      {paymentDialog.type === 'driver' 
                        ? formatCurrency((paymentDialog.amount || 500) * ticketQuantity)
                        : formatCurrency(parseFloat(paymentAmount) || paymentDialog.amount || 0)
                      }
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Balance Check */}
              {walletData && (
                <Alert>
                  <Wallet className="h-4 w-4" />
                  <AlertDescription>
                    Current balance: {formatCurrency(walletData.balance)}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPaymentDialog(null)}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={processPayment}
                  disabled={processing || walletData?.is_frozen}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Pay Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tutorial Dialog */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              How to Scan QR Codes
            </DialogTitle>
            <DialogDescription>
              Follow these simple steps to scan QR codes successfully
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Allow Camera Access</h4>
                      <p className="text-sm text-muted-foreground">
                        When prompted, allow the website to access your camera. This is needed to scan QR codes.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Position Your Device</h4>
                      <p className="text-sm text-muted-foreground">
                        Hold your device steady and point the camera at the QR code. Keep it about 6-12 inches away.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="font-medium mb-1">Wait for Recognition</h4>
                      <p className="text-sm text-muted-foreground">
                        The scanner will automatically detect and process the QR code. No need to take a photo!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 mb-1">Supported QR Codes</h4>
                  <p className="text-sm text-blue-700">
                    You can scan driver transport QR codes for ticket payments and merchant QR codes for purchases.
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={() => setShowTutorial(false)} className="w-full">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}