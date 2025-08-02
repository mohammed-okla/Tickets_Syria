import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase, VerificationStatus } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { CheckCircle, Clock, XCircle, Upload, FileText, Car, CreditCard, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface VerificationDocument {
  type: string;
  file: File | null;
  url?: string;
  uploaded: boolean;
}

interface DriverVerificationData {
  license_number: string;
  license_expiry: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_plate: string;
  route_name: string;
  route_description: string;
  verification_status: VerificationStatus;
  verification_documents?: any;
}

const REQUIRED_DOCUMENTS = [
  { type: 'license_front', label: 'Driver License (Front)', icon: CreditCard },
  { type: 'license_back', label: 'Driver License (Back)', icon: CreditCard },
  { type: 'vehicle_registration', label: 'Vehicle Registration', icon: FileText },
  { type: 'vehicle_photo', label: 'Vehicle Photo', icon: Car },
];

const VEHICLE_TYPES = [
  'bus',
  'microbus', 
  'taxi',
  'private_car',
  'motorcycle',
  'truck'
];

export default function DriverVerificationPage() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verificationData, setVerificationData] = useState<DriverVerificationData>({
    license_number: '',
    license_expiry: '',
    vehicle_type: '',
    vehicle_model: '',
    vehicle_plate: '',
    route_name: '',
    route_description: '',
    verification_status: 'not_submitted',
  });
  
  const [documents, setDocuments] = useState<VerificationDocument[]>(
    REQUIRED_DOCUMENTS.map(doc => ({
      type: doc.type,
      file: null,
      uploaded: false
    }))
  );

  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchVerificationData();
  }, [user]);

  const fetchVerificationData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching driver profile:', error);
        return;
      }

      if (data) {
        setVerificationData({
          license_number: data.license_number || '',
          license_expiry: data.license_expiry || '',
          vehicle_type: data.vehicle_type || '',
          vehicle_model: data.vehicle_model || '',
          vehicle_plate: data.vehicle_plate || '',
          route_name: data.route_name || '',
          route_description: data.route_description || '',
          verification_status: data.verification_status,
          verification_documents: data.verification_documents
        });

        // Load existing document URLs if available
        if (data.verification_documents) {
          const existingDocs = documents.map(doc => ({
            ...doc,
            url: data.verification_documents?.[doc.type]?.url,
            uploaded: !!data.verification_documents?.[doc.type]?.url
          }));
          setDocuments(existingDocs);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const uploadDocument = async (docType: string, file: File): Promise<string | null> => {
    try {
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${docType}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('verification-docs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      setUploadProgress(prev => ({ ...prev, [docType]: 100 }));

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('verification-docs')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadProgress(prev => ({ ...prev, [docType]: 0 }));
      return null;
    }
  };

  const handleFileChange = async (docType: string, file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t('driver.verification.invalidFileType'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('driver.verification.fileTooLarge'));
      return;
    }

    const uploadedUrl = await uploadDocument(docType, file);
    if (uploadedUrl) {
      setDocuments(prev => prev.map(doc => 
        doc.type === docType 
          ? { ...doc, file, url: uploadedUrl, uploaded: true }
          : doc
      ));
      toast.success(t('driver.verification.documentUploaded'));
    } else {
      toast.error(t('driver.verification.uploadFailed'));
    }
  };

  const handleSubmitVerification = async () => {
    // Validate form
    if (!verificationData.license_number || !verificationData.license_expiry || 
        !verificationData.vehicle_type || !verificationData.vehicle_model || 
        !verificationData.vehicle_plate) {
      toast.error(t('driver.verification.fillRequired'));
      return;
    }

    // Check if all documents are uploaded
    const allDocumentsUploaded = documents.every(doc => doc.uploaded);
    if (!allDocumentsUploaded) {
      toast.error(t('driver.verification.uploadAllDocuments'));
      return;
    }

    setSaving(true);
    try {
      // Prepare verification documents object
      const verificationDocs = documents.reduce((acc, doc) => {
        if (doc.url) {
          acc[doc.type] = {
            url: doc.url,
            uploaded_at: new Date().toISOString(),
            status: 'uploaded'
          };
        }
        return acc;
      }, {} as any);

      // Update driver profile
      const { error } = await supabase
        .from('driver_profiles')
        .update({
          license_number: verificationData.license_number,
          license_expiry: verificationData.license_expiry,
          vehicle_type: verificationData.vehicle_type,
          vehicle_model: verificationData.vehicle_model,
          vehicle_plate: verificationData.vehicle_plate,
          route_name: verificationData.route_name,
          route_description: verificationData.route_description,
          verification_status: 'pending',
          verification_documents: verificationDocs,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      setVerificationData(prev => ({ ...prev, verification_status: 'pending' }));
      toast.success(t('driver.verification.submitted'));
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationData.verification_status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    const statusColors = {
      'not_submitted': 'secondary',
      'pending': 'default',
      'approved': 'default',
      'rejected': 'destructive'
    } as const;

    return (
      <Badge variant={statusColors[verificationData.verification_status]} className="flex items-center gap-1">
        {getStatusIcon()}
        {t(`driver.verification.status.${verificationData.verification_status}`)}
      </Badge>
    );
  };

  const getProgressPercentage = () => {
    const steps = [
      verificationData.license_number,
      verificationData.vehicle_type,
      verificationData.vehicle_plate,
      documents.filter(doc => doc.uploaded).length === REQUIRED_DOCUMENTS.length
    ];
    return (steps.filter(Boolean).length / steps.length) * 100;
  };

  if (loading) {
    return <div className="flex justify-center p-8">{t('common.loading')}...</div>;
  }

  const isReadOnly = verificationData.verification_status === 'approved' || 
                    verificationData.verification_status === 'pending';

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">{t('driver.verification.title')}</h1>
        <p className="text-muted-foreground">{t('driver.verification.description')}</p>
      </div>

      {/* Status Overview */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {t('driver.verification.status.title')}
              {getStatusBadge()}
            </CardTitle>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{t('driver.verification.progress')}</span>
              <span>{Math.round(getProgressPercentage())}%</span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" />
          </div>
        </CardHeader>
        {verificationData.verification_status === 'rejected' && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('driver.verification.rejectedMessage')}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Driver Information Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('driver.verification.driverInfo')}</CardTitle>
          <CardDescription>{t('driver.verification.driverInfoDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="license_number">{t('driver.verification.licenseNumber')} *</Label>
              <Input
                id="license_number"
                value={verificationData.license_number}
                onChange={(e) => setVerificationData(prev => ({ 
                  ...prev, 
                  license_number: e.target.value 
                }))}
                placeholder={t('driver.verification.licenseNumberPlaceholder')}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="license_expiry">{t('driver.verification.licenseExpiry')} *</Label>
              <Input
                id="license_expiry"
                type="date"
                value={verificationData.license_expiry}
                onChange={(e) => setVerificationData(prev => ({ 
                  ...prev, 
                  license_expiry: e.target.value 
                }))}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_type">{t('driver.verification.vehicleType')} *</Label>
              <Select
                value={verificationData.vehicle_type}
                onValueChange={(value) => setVerificationData(prev => ({ 
                  ...prev, 
                  vehicle_type: value 
                }))}
                disabled={isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('driver.verification.selectVehicleType')} />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {t(`driver.verification.vehicleTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="vehicle_model">{t('driver.verification.vehicleModel')} *</Label>
              <Input
                id="vehicle_model"
                value={verificationData.vehicle_model}
                onChange={(e) => setVerificationData(prev => ({ 
                  ...prev, 
                  vehicle_model: e.target.value 
                }))}
                placeholder={t('driver.verification.vehicleModelPlaceholder')}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vehicle_plate">{t('driver.verification.vehiclePlate')} *</Label>
            <Input
              id="vehicle_plate"
              value={verificationData.vehicle_plate}
              onChange={(e) => setVerificationData(prev => ({ 
                ...prev, 
                vehicle_plate: e.target.value 
              }))}
              placeholder={t('driver.verification.vehiclePlatePlaceholder')}
              disabled={isReadOnly}
            />
          </div>

          <Separator />

          <div>
            <Label htmlFor="route_name">{t('driver.verification.routeName')}</Label>
            <Input
              id="route_name"
              value={verificationData.route_name}
              onChange={(e) => setVerificationData(prev => ({ 
                ...prev, 
                route_name: e.target.value 
              }))}
              placeholder={t('driver.verification.routeNamePlaceholder')}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="route_description">{t('driver.verification.routeDescription')}</Label>
            <Textarea
              id="route_description"
              value={verificationData.route_description}
              onChange={(e) => setVerificationData(prev => ({ 
                ...prev, 
                route_description: e.target.value 
              }))}
              placeholder={t('driver.verification.routeDescriptionPlaceholder')}
              disabled={isReadOnly}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Document Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('driver.verification.documents')}</CardTitle>
          <CardDescription>{t('driver.verification.documentsDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc, index) => {
              const docInfo = REQUIRED_DOCUMENTS[index];
              const IconComponent = docInfo.icon;
              return (
                <div key={doc.type} className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <IconComponent className="w-5 h-5 text-primary" />
                    <span className="font-medium">{t(`driver.verification.documentTypes.${doc.type}`)}</span>
                    {doc.uploaded && <CheckCircle className="w-4 h-4 text-green-500" />}
                  </div>
                  
                  {!isReadOnly && (
                    <div className="space-y-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(doc.type, file);
                        }}
                        disabled={doc.uploaded}
                      />
                      {uploadProgress[doc.type] > 0 && uploadProgress[doc.type] < 100 && (
                        <Progress value={uploadProgress[doc.type]} className="w-full" />
                      )}
                    </div>
                  )}

                  {doc.url && (
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(doc.url, '_blank')}
                        className="flex items-center gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        {t('driver.verification.viewDocument')}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      {!isReadOnly && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitVerification}
            disabled={saving || documents.some(doc => !doc.uploaded)}
            className="min-w-32"
          >
            {saving ? t('common.saving') : t('driver.verification.submit')}
          </Button>
        </div>
      )}

      {verificationData.verification_status === 'approved' && (
        <Alert className="mt-4">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {t('driver.verification.approvedMessage')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}