import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QrCode, Download, Copy, RefreshCw, MapPin, DollarSign, Clock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { QRCode } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

interface QRCodeData {
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
  amount?: number;
  description?: string;
  type?: string;
  data?: any;
  metadata?: any;
}

export default function QRGeneratorPage() {
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [qrCodes, setQrCodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newQRCode, setNewQRCode] = useState({
    amount: '',
    description: '',
    pickup_location: '',
    dropoff_location: '',
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
        .eq('driver_id', user.id)

        .order('created_at', { ascending: false });

      if (error) throw error;

      const qrCodesWithUsage = data?.map(qr => ({
        ...qr,
        usage_count: qr.usage_count?.[0]?.count || 0
      })) || [];

      setQrCodes(qrCodesWithUsage);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      toast.error(t('error_fetch_qr_codes'));
    } finally {
      setLoading(false);
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
        type: 'transport_payment',
        driver_id: user.id,
        amount: amount,
        pickup_location: newQRCode.pickup_location || null,
        dropoff_location: newQRCode.dropoff_location || null,
        timestamp: Date.now()
      };

      const { data, error } = await supabase
        .from('qr_codes')
        .insert({
          driver_id: user.id,
          qr_data: JSON.stringify(qrData),
          is_active: true,
          expires_at: newQRCode.expires_at || null,
          route_info: `${newQRCode.pickup_location} → ${newQRCode.dropoff_location}`,
          vehicle_info: newQRCode.description || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(t('qr_code_generated_successfully'));
      setNewQRCode({
        amount: '',
        description: '',
        pickup_location: '',
        dropoff_location: '',
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

  const copyQRData = (qrCode: QRCodeData) => {
    const qrText = qrCode.qr_data;
    navigator.clipboard.writeText(qrText);
    toast.success(t('qr_data_copied'));
  };

  const downloadQRCode = (qrCode: QRCodeData) => {
    // In a real implementation, this would generate and download an actual QR code image
    const qrText = qrCode.qr_data;
    const blob = new Blob([qrText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-code-${qrCode.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(t('qr_code_downloaded'));
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

  const getStatusBadge = (qrCode: QRCodeData) => {
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
        <h1 className="text-3xl font-bold">{t('qr_code_generator')}</h1>
        <p className="text-muted-foreground">{t('qr_generator_description')}</p>
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
                <p className="text-sm font-medium text-muted-foreground">{t('total_usage')}</p>
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
                  {formatCurrency(qrCodes.reduce((sum, qr) => sum + 15000 * qr.usage_count, 0))}
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
          <CardTitle>{t('generate_new_qr_code')}</CardTitle>
          <CardDescription>{t('create_qr_description')}</CardDescription>
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
              <Label htmlFor="expires_at">{t('expires_at')}</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={newQRCode.expires_at}
                onChange={(e) => setNewQRCode(prev => ({ ...prev, expires_at: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_location">{t('pickup_location')}</Label>
              <Input
                id="pickup_location"
                placeholder={t('pickup_location_placeholder')}
                value={newQRCode.pickup_location}
                onChange={(e) => setNewQRCode(prev => ({ ...prev, pickup_location: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dropoff_location">{t('dropoff_location')}</Label>
              <Input
                id="dropoff_location"
                placeholder={t('dropoff_location_placeholder')}
                value={newQRCode.dropoff_location}
                onChange={(e) => setNewQRCode(prev => ({ ...prev, dropoff_location: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              placeholder={t('qr_description_placeholder')}
              value={newQRCode.description}
              onChange={(e) => setNewQRCode(prev => ({ ...prev, description: e.target.value }))}
            />
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
          <CardDescription>{t('manage_active_qr_codes')}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeQRCodes.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('no_active_qr_codes')}</h3>
              <p className="text-muted-foreground">{t('generate_first_qr_code')}</p>
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
                          {formatCurrency(qrCode.amount || 0)}
                        </CardTitle>
                        {getStatusBadge(qrCode)}
                      </div>
                      {qrCode.description && (
                        <CardDescription>{qrCode.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm">
                        {qrCode.route_info && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                            <span>{qrCode.route_info}</span>
                          </div>
                        )}
                        {qrCode.vehicle_info && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-600" />
                            <span>{qrCode.vehicle_info}</span>
                          </div>
                        )}
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-blue-600" />
                          <span>{formatDate(qrCode.created_at || '')}</span>
                        </div>
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 mr-2 text-purple-600" />
                          <span>{qrCode.usage_count} {t('times_used')}</span>
                        </div>
                        {qrCode.expires_at && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-orange-600" />
                            <span>{t('expires')}: {formatDate(qrCode.expires_at)}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyQRData(qrCode)}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          {t('copy')}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadQRCode(qrCode)}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          {t('download')}
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
            <CardDescription>{t('manage_inactive_qr_codes')}</CardDescription>
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
                          {formatCurrency(qrCode.amount || 0)}
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
                          <span>{qrCode.usage_count} {t('times_used')}</span>
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
    </div>
  );
}