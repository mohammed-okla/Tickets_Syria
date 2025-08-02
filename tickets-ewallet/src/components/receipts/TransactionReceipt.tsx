import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Receipt,
  Download,
  Printer,
  Share2,
  QrCode,
  Calendar,
  CreditCard,
  Car,
  Store,
  CheckCircle,
  Clock,
  X,
  AlertTriangle,
  Copy,
  ExternalLink
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface Transaction {
  id: string
  from_user_id?: string
  to_user_id?: string
  from_user_name?: string
  to_user_name?: string
  amount: number
  currency: string
  transaction_type: 'payment' | 'recharge' | 'refund' | 'withdrawal'
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  description?: string
  reference_id?: string
  qr_code_id?: string
  trip_id?: string
  created_at: string
  completed_at?: string
}

interface TransactionReceiptProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfile?: {
    id: string
    full_name?: string
    email?: string
    phone?: string
  }
}

export default function TransactionReceipt({
  transaction,
  open,
  onOpenChange,
  userProfile
}: TransactionReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const { t, isRTL } = useLanguage()

  if (!transaction) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SY' : 'en-US', {
      style: 'currency',
      currency: 'SYP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SY' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getTransactionIcon = () => {
    const isOutgoing = transaction.from_user_id === userProfile?.id
    
    switch (transaction.transaction_type) {
      case 'recharge':
        return <CreditCard className="h-8 w-8 text-green-600" />
      case 'payment':
        if (transaction.qr_code_id) {
          return <Car className="h-8 w-8 text-blue-600" />
        }
        return isOutgoing ? 
          <Store className="h-8 w-8 text-purple-600" /> : 
          <CreditCard className="h-8 w-8 text-green-600" />
      case 'refund':
        return <Receipt className="h-8 w-8 text-blue-600" />
      case 'withdrawal':
        return <CreditCard className="h-8 w-8 text-red-600" />
      default:
        return <Receipt className="h-8 w-8 text-gray-600" />
    }
  }

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />
      case 'failed':
        return <X className="h-5 w-5 text-red-600" />
      case 'cancelled':
        return <AlertTriangle className="h-5 w-5 text-gray-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusBadge = () => {
    switch (transaction.status) {
      case 'completed':
        return <Badge className="bg-green-500 text-white">✓ Completed</Badge>
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">⏳ Pending</Badge>
      case 'failed':
        return <Badge variant="destructive">✗ Failed</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="border-gray-400 text-gray-600">⊗ Cancelled</Badge>
      default:
        return <Badge variant="outline">{transaction.status}</Badge>
    }
  }

  const getTransactionTitle = () => {
    const isOutgoing = transaction.from_user_id === userProfile?.id
    
    if (transaction.description) {
      return transaction.description
    }

    switch (transaction.transaction_type) {
      case 'recharge':
        return 'Wallet Top-up'
      case 'payment':
        if (transaction.qr_code_id) {
          return isOutgoing ? 'Bus Ticket Payment' : 'Bus Fare Collection'
        }
        return isOutgoing ? 'Payment Sent' : 'Payment Received'
      case 'refund':
        return 'Transaction Refund'
      case 'withdrawal':
        return 'Wallet Withdrawal'
      default:
        return 'Transaction'
    }
  }

  const getTransactionDirection = () => {
    const isOutgoing = transaction.from_user_id === userProfile?.id
    return isOutgoing ? 'outgoing' : 'incoming'
  }

  const copyTransactionId = () => {
    navigator.clipboard.writeText(transaction.id)
    toast.success('Transaction ID copied to clipboard')
  }

  const exportToPDF = async () => {
    try {
      // Use html2canvas and jsPDF to generate PDF
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      
      if (receiptRef.current) {
        const canvas = await html2canvas(receiptRef.current, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true
        })
        
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF('portrait', 'mm', 'a4')
        
        const imgWidth = 190
        const pageHeight = 297
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        let heightLeft = imgHeight
        
        let position = 10
        
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
        
        while (heightLeft >= 0) {
          position = heightLeft - imgHeight + 10
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }
        
        pdf.save(`receipt-${transaction.id.slice(0, 8)}.pdf`)
        toast.success('Receipt downloaded successfully!')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  const shareReceipt = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Transaction Receipt',
          text: `Receipt for ${getTransactionTitle()} - ${formatCurrency(transaction.amount)}`,
          url: window.location.href
        })
      } catch (error) {
        console.error('Error sharing:', error)
      }
    } else {
      // Fallback to copying link
      navigator.clipboard.writeText(window.location.href)
      toast.success('Receipt link copied to clipboard')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Transaction Receipt
          </DialogTitle>
          <DialogDescription>
            Official receipt for your transaction
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Content */}
        <div ref={receiptRef} className="bg-white p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              {getTransactionIcon()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{getTransactionTitle()}</h2>
              <p className="text-gray-600">Tickets E-Wallet</p>
            </div>
          </div>

          {/* Transaction Status */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              {getStatusIcon()}
              <span className="font-medium text-lg">
                {transaction.status === 'completed' ? 'Transaction Successful' : 
                 transaction.status === 'pending' ? 'Transaction Pending' :
                 transaction.status === 'failed' ? 'Transaction Failed' :
                 'Transaction Cancelled'}
              </span>
            </div>
            {getStatusBadge()}
          </div>

          {/* Amount */}
          <div className="text-center py-6 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600 mb-1">Amount</p>
            <p className={`text-4xl font-bold ${
              getTransactionDirection() === 'incoming' ? 'text-green-600' : 'text-blue-600'
            }`}>
              {getTransactionDirection() === 'incoming' ? '+' : ''}
              {formatCurrency(transaction.amount)}
            </p>
            <p className="text-sm text-gray-500 mt-1">{transaction.currency}</p>
          </div>

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Transaction Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Transaction ID</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {transaction.id.slice(0, 8)}...{transaction.id.slice(-4)}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyTransactionId}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Date & Time</p>
                  <p className="font-medium">{formatDate(transaction.created_at)}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium capitalize">{transaction.transaction_type}</p>
                </div>
              </div>

              <div className="space-y-3">
                {transaction.reference_id && (
                  <div>
                    <p className="text-sm text-gray-600">Reference</p>
                    <p className="font-mono text-sm">{transaction.reference_id}</p>
                  </div>
                )}

                {transaction.completed_at && (
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="font-medium">{formatDate(transaction.completed_at)}</p>
                  </div>
                )}

                {(transaction.from_user_name || transaction.to_user_name) && (
                  <div>
                    <p className="text-sm text-gray-600">
                      {getTransactionDirection() === 'outgoing' ? 'Recipient' : 'Sender'}
                    </p>
                    <p className="font-medium">
                      {getTransactionDirection() === 'outgoing' 
                        ? transaction.to_user_name || 'Unknown'
                        : transaction.from_user_name || 'Unknown'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QR Code for verification */}
          <div className="text-center py-4 border-t">
            <div className="inline-flex items-center gap-2 text-sm text-gray-600">
              <QrCode className="h-4 w-4" />
              <span>Scan to verify this receipt</span>
            </div>
            <div className="mt-2 w-16 h-16 bg-gray-100 rounded-lg mx-auto flex items-center justify-center">
              <QrCode className="h-8 w-8 text-gray-400" />
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 border-t pt-4">
            <p>This is an official receipt generated by Tickets E-Wallet</p>
            <p>For support, contact: support@tickets-ewallet.com</p>
            <p className="mt-2">
              Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={exportToPDF} className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={shareReceipt} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}