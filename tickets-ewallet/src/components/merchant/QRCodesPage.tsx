import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Copy, RefreshCw, Store, DollarSign, Clock, Eye, EyeOff, Printer, Share2, Maximize } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';

interface MerchantQRCode {
  id: string;
  driver_id: string;
  qr_data: string;
  is_active: boolean;
  usage_count: number;
  max_usage?: number;
  route_info?: string;
  vehicle_info?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  business_name?: string;
  description?: string;
  amount?: number;
  qr_image?: string;
}

export default function QRCodesPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [qrCodes, setQrCodes] = useState<MerchantQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedQR, setSelectedQR] = useState<MerchantQRCode | null>(null);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const [newQRCode, setNewQRCode] = useState({
    amount: '',
    description: '',
    business_name: '',
    expires_at: ''
  });

  useEffect(() => {
    if (user) {
      fetchQRCodes();
    }
  }, [user]);

  const fetchQRCodes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('qr_codes')
        .select(`
          *,
          usage_count:transactions(count)
        `)
        .eq('driver_id', user.id) // Using driver_id field for merchants
        .order('created_at', { ascending: false });

      if (error) throw error;

      const qrCodesWithUsage = data?.map(qr => ({
        ...qr,
        usage_count: qr.usage_count?.[0]?.count || 0,
        business_name: qr.route_info, // Using route_info for business name
        description: qr.vehicle_info // Using vehicle_info for description
      })) || [];

      setQrCodes(qrCodesWithUsage);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast.error(t('error_fetch_qr_codes'));
    } finally {
      setLoading(false);
    }
  };

  const generateQRCodeImage = async (qrData: string) => {
    try {
      return await QRCodeLib.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
    } catch (error) {
      console.error('Error generating QR image:', error);
      return null;
    }
  };

  const generateQRCode = async () => {
    if (!user || !newQRCode.amount) {
      toast.error(t('please_fill_required_fields'));
      return;
    }

    setGenerating(true);

    try {
      const amount = parseFloat(newQRCode.amount);
      if (amount <= 0) {
        toast.error(t('invalid_amount'));
        return;
      }

      const qrData = {
        type: 'merchant',
        merchant_id: user.id,
        amount: amount,
        business_name: newQRCode.business_name || null,
        description: newQRCode.description || null,
        timestamp: Date.now()
      };

      const qrDataString = JSON.stringify(qrData);
      const qrImage = await generateQRCodeImage(qrDataString);

      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          driver_id: user.id, // Using driver_id field for merchants
          qr_data: qrDataString,
          is_active: true,
          expires_at: newQRCode.expires_at || null,
          route_info: newQRCode.business_name || null, // Using route_info for business name
          vehicle_info: newQRCode.description || null // Using vehicle_info for description
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('qr_code_generated_successfully'));
      setNewQRCode({
        amount: '',
        description: '',
        business_name: '',
        expires_at: ''
      });
      fetchQRCodes();
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error(t('error_generate_qr_code'));
    } finally {
      setGenerating(false);
    }
  };

  const toggleQRCodeStatus = async (qrId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('qr_codes')
        .update({ is_active: !currentStatus })
        .eq('id', qrId)
        .eq('driver_id', user?.id);

      if (error) throw error;

      toast.success(currentStatus ? t('qr_code_deactivated') : t('qr_code_activated'));
      fetchQRCodes();
    } catch (error) {
      console.error('Error toggling QR code status:', error);
      toast.error(t('error_toggle_qr_status'));
    }
  };

  const copyQRData = (qrCode: MerchantQRCode) => {
    const qrText = qrCode.qr_data;
    navigator.clipboard.writeText(qrText);
    toast.success(t('qr_data_copied'));
  };

  const downloadQRCode = async (qrCode: MerchantQRCode) => {
    try {
      // Generate QR code image
      const qrImage = await generateQRCodeImage(qrCode.qr_data);
      if (!qrImage) {
        toast.error('Failed to generate QR code image');
        return;
      }
      
      // Create download link
      const link = document.createElement('a');
      link.href = qrImage;
      link.download = `merchant-qr-${qrCode.business_name || qrCode.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(t('qr_code_downloaded'));
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  const printQRCode = async (qrCode: MerchantQRCode) => {
    try {
      const qrImage = await generateQRCodeImage(qrCode.qr_data);
      if (!qrImage) {
        toast.error('Failed to generate QR code image');
        return;
      }
      
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const parsedData = JSON.parse(qrCode.qr_data);
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${qrCode.business_name || 'Merchant Payment'}</title>
              <style>
                body { 
                  font-family: Arial, sans-serif; 
                  text-align: center; 
                  padding: 20px;
                  background: white;
                }
                .qr-container {
                  max-width: 400px;
                  margin: 0 auto;
                  padding: 30px;
                  border: 2px solid #ddd;
                  border-radius: 10px;
                }
                .business-name { 
                  font-size: 24px; 
                  font-weight: bold; 
                  margin-bottom: 10px;
                  color: #333;
                }
                .amount { 
                  font-size: 32px; 
                  font-weight: bold; 
                  color: #059669;
                  margin: 20px 0;
                }
                .description { 
                  font-size: 16px; 
                  color: #666;
                  margin-bottom: 20px;
                }
                .qr-image { 
                  margin: 20px 0;
                }
                .instructions {
                  font-size: 14px;
                  color: #666;
                  margin-top: 20px;
                }
                @media print {
                  body { margin: 0; }
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <div class="business-name">${qrCode.business_name || 'Merchant Payment'}</div>
                ${qrCode.description ? `<div class="description">${qrCode.description}</div>` : ''}
                <div class="amount">${formatCurrency(parsedData.amount || 0)}</div>
                <div class="qr-image">
                  <img src="${qrImage}" alt="QR Code" style="max-width: 200px; height: auto;" />
                </div>
                <div class="instructions">
                  Scan this QR code with the Tickets app to make a payment
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('Error printing QR code:', error);
      toast.error('Failed to print QR code');
    }
  };

  const shareQRCode = async (qrCode: MerchantQRCode) => {
    try {
      const qrImage = await generateQRCodeImage(qrCode.qr_data);
      if (!qrImage) {
        toast.error('Failed to generate QR code image');
        return;
      }
      
      // Convert data URL to blob
      const response = await fetch(qrImage);
      const blob = await response.blob();
      const file = new File([blob], `merchant-qr-${qrCode.business_name || qrCode.id}.png`, { type: 'image/png' });
      
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `QR Code - ${qrCode.business_name || 'Merchant Payment'}`,
          text: `Payment QR Code for ${formatCurrency(JSON.parse(qrCode.qr_data).amount || 0)}`,
          files: [file]
        });
      } else {
        // Fallback: copy image to clipboard
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (blob) {
              navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              toast.success('QR code copied to clipboard');
            }
          });
        };
        img.src = qrImage;
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      // Fallback: copy QR data as text
      navigator.clipboard.writeText(qrCode.qr_data);
      toast.success('QR data copied to clipboard');
    }
  };

  const viewQRCode = (qrCode: MerchantQRCode) => {
    setSelectedQR(qrCode);
    setQrPreviewOpen(true);
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

  const isExpired = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getStatusBadge = (qrCode: MerchantQRCode) => {
    if (isExpired(qrCode.expires_at)) {
      return <Badge variant="destructive">{t('expired')}</Badge>;
    }
    if (!qrCode.is_active) {
      return <Badge variant="outline">{t('inactive')}</Badge>;
    }
    return <Badge variant="default">{t('active')}</Badge>;
  };

  if (loading) {
    return <LoadingSpinner text={t('loading_qr_codes')} />;
  }

  const activeQRCodes = qrCodes.filter(qr => qr.is_active && !isExpired(qr.expires_at));
  const inactiveQRCodes = qrCodes.filter(qr => !qr.is_active || isExpired(qr.expires_at));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('merchant_qr_codes')}</h1>
        <p className="text-muted-foreground">{t('merchant_qr_description')}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('active_qr_codes')}</p>
                <p className="text-2xl font-bold">{activeQRCodes.length}</p>
              </div>
              <QrCode className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('total_scans')}</p>
                <p className="text-2xl font-bold">
                  {qrCodes.reduce((sum, qr) => sum + qr.usage_count, 0)}
                </p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('total_earnings')}</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(qrCodes.reduce((sum, qr) => sum + 25000 * qr.usage_count, 0))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate New QR Code */}
      <Card>
        <CardHeader>
          <CardTitle>{t('generate_merchant_qr_code')}</CardTitle>
          <CardDescription>{t('create_merchant_qr_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">{t('amount')} *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={newQRCode.amount}
                onChange={(e) => setNewQRCode(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="business_name">{t('business_name')}</Label>
              <Input
                id="business_name"
                placeholder={t('business_name_placeholder')}
                value={newQRCode.business_name}
                onChange={(e) => setNewQRCode(prev => ({ ...prev, business_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">{t('description')}</Label>
              <Input
                id="description"
                placeholder={t('qr_description_placeholder')}
                value={newQRCode.description}
                onChange={(e) => setNewQRCode(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="expires_at">{t('expires_at')}</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={newQRCode.expires_at}
                onChange={(e) => setNewQRCode(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>
          </div>

          <Button onClick={generateQRCode} disabled={generating} className="w-full">
            {generating ? (
              <LoadingSpinner text={t('generating')} />
            ) : (
              <>
                <QrCode className="h-4 w-4 mr-2" />
                {t('generate_qr_code')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Active QR Codes */}
      <Card>
        <CardHeader>
          <CardTitle>{t('active_qr_codes')} ({activeQRCodes.length})</CardTitle>
          <CardDescription>{t('manage_active_merchant_qr_codes')}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeQRCodes.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('no_active_qr_codes')}</h3>
              <p className="text-muted-foreground">{t('generate_first_merchant_qr_code')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeQRCodes.map((qrCode, index) => (
                <motion.div
                  key={qrCode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {qrCode.business_name || t('merchant_payment')}
                        </CardTitle>
                        {getStatusBadge(qrCode)}
                      </div>
                      {qrCode.description && (
                        <CardDescription>{qrCode.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center">
                          <Store className="h-4 w-4 mr-2 text-blue-600" />
                          <span>{qrCode.business_name || t('merchant_business')}</span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-600" />
                          <span>{formatDate(qrCode.created_at || '')}</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-2 text-purple-600" />
                          <span>{qrCode.usage_count} {t('times_scanned')}</span>
                        </div>
                        {qrCode.expires_at && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-orange-600" />
                            <span>{t('expires')}: {formatDate(qrCode.expires_at)}</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewQRCode(qrCode)}
                          className="gap-1"
                        >
                          <Maximize className="h-3 w-3" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQRCode(qrCode)}
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printQRCode(qrCode)}
                          className="gap-1"
                        >
                          <Printer className="h-3 w-3" />
                          Print
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => shareQRCode(qrCode)}
                          className="gap-1"
                        >
                          <Share2 className="h-3 w-3" />
                          Share
                        </Button>
                      </div>

                      <Button
                        variant={qrCode.is_active ? "destructive" : "default"}
                        size="sm"
                        onClick={() => toggleQRCodeStatus(qrCode.id, qrCode.is_active)}
                        className="w-full"
                      >
                        {qrCode.is_active ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            {t('deactivate')}
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            {t('activate')}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inactive/Expired QR Codes */}
      {inactiveQRCodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('inactive_expired_qr_codes')} ({inactiveQRCodes.length})</CardTitle>
            <CardDescription>{t('manage_inactive_merchant_qr_codes')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveQRCodes.map((qrCode, index) => (
                <motion.div
                  key={qrCode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="opacity-60 hover:opacity-80 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {qrCode.business_name || t('merchant_payment')}
                        </CardTitle>
                        {getStatusBadge(qrCode)}
                      </div>
                      {qrCode.description && (
                        <CardDescription>{qrCode.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>{formatDate(qrCode.created_at || '')}</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          <span>{qrCode.usage_count} {t('times_scanned')}</span>
                        </div>
                      </div>

                      {!isExpired(qrCode.expires_at) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleQRCodeStatus(qrCode.id, qrCode.is_active)}
                          className="w-full"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t('reactivate')}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Preview Dialog */}
      <Dialog open={qrPreviewOpen} onOpenChange={setQrPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {selectedQR?.business_name || t('merchant_payment')}
            </DialogTitle>
            {selectedQR?.description && (
              <DialogDescription className="text-center">
                {selectedQR.description}
              </DialogDescription>
            )}
          </DialogHeader>
          
          {selectedQR && (
            <div className="space-y-6">
              {/* QR Code Display */}
              <div className="flex justify-center">
                <QRCodeCanvas qrData={selectedQR.qr_data} />
              </div>
              
              {/* QR Code Info */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{t('amount')}:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(JSON.parse(selectedQR.qr_data).amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('status')}:</span>
                  {getStatusBadge(selectedQR)}
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('scans')}:</span>
                  <span>{selectedQR.usage_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">{t('created')}:</span>
                  <span>{formatDate(selectedQR.created_at)}</span>
                </div>
                {selectedQR.expires_at && (
                  <div className="flex justify-between">
                    <span className="font-medium">{t('expires')}:</span>
                    <span>{formatDate(selectedQR.expires_at)}</span>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => downloadQRCode(selectedQR)}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('download')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printQRCode(selectedQR)}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  {t('print')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareQRCode(selectedQR)}
                  className="gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  {t('share')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyQRData(selectedQR)}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {t('copy')}
                </Button>
              </div>
              
              {/* Toggle Status */}
              <Button
                variant={selectedQR.is_active ? "destructive" : "default"}
                onClick={() => {
                  toggleQRCodeStatus(selectedQR.id, selectedQR.is_active);
                  setQrPreviewOpen(false);
                }}
                className="w-full gap-2"
                disabled={isExpired(selectedQR.expires_at)}
              >
                {selectedQR.is_active ? (
                  <>
                    <EyeOff className="h-4 w-4" />
                    {t('deactivate')}
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    {t('activate')}
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// QR Code Canvas Component
interface QRCodeCanvasProps {
  qrData: string;
  size?: number;
}

function QRCodeCanvas({ qrData, size = 200 }: QRCodeCanvasProps) {
  const [qrImageSrc, setQrImageSrc] = useState<string>('');
  
  useEffect(() => {
    const generateQRImage = async () => {
      try {
        const qrImage = await QRCodeLib.toDataURL(qrData, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        setQrImageSrc(qrImage);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };
    
    if (qrData) {
      generateQRImage();
    }
  }, [qrData, size]);
  
  if (!qrImageSrc) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ width: size, height: size }}
      >
        <LoadingSpinner text="" />
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <img 
        src={qrImageSrc} 
        alt="QR Code" 
        className="rounded"
        style={{ width: size, height: size }}
      />
    </div>
  );
}