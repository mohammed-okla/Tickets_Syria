import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase, VerificationStatus } from '../../lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { CheckCircle, XCircle, Clock, Eye, Car, FileText, CreditCard, AlertTriangle, User, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface DriverVerificationSubmission {
  id: string;
  user_id: string;
  license_number: string;
  license_expiry: string;
  vehicle_type: string;
  vehicle_model: string;
  vehicle_plate: string;
  route_name: string;
  route_description: string;
  verification_status: VerificationStatus;
  verification_documents: any;
  created_at: string;
  updated_at: string;
  // Joined data
  full_name: string;
  email: string;
  phone_number?: string;
  user_created_at: string;
}

interface DocumentViewerProps {
  url: string;
  title: string;
  type: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ url, title, type }) => {
  const isImage = type.includes('image');
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center items-center p-4 max-h-[70vh] overflow-auto">
          {isImage ? (
            <img 
              src={url} 
              alt={title}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          ) : (
            <iframe
              src={url}
              title={title}
              className="w-full h-96 border rounded-lg"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function DriverVerificationReviewPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [submissions, setSubmissions] = useState<DriverVerificationSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<DriverVerificationSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          profiles!driver_profiles_user_id_fkey (
            full_name,
            email,
            phone_number,
            created_at
          )
        `)
        .neq('verification_status', 'not_submitted')
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedData = data?.map(item => ({
        ...item,
        full_name: item.profiles?.full_name || 'Unknown',
        email: item.profiles?.email || '',
        phone_number: item.profiles?.phone_number,
        user_created_at: item.profiles?.created_at || item.created_at
      })) || [];

      setSubmissions(formattedData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmission = async () => {
    if (!selectedSubmission) return;

    setReviewLoading(true);
    try {
      const { error } = await supabase
        .from('driver_profiles')
        .update({
          verification_status: reviewAction,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', selectedSubmission.user_id);

      if (error) {
        throw error;
      }

      // Send notification to driver
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedSubmission.user_id,
          notification_type: 'system',
          title: reviewAction === 'approve' ? 'Verification Approved' : 'Verification Rejected',
          message: reviewAction === 'approve' 
            ? 'Congratulations! Your driver verification has been approved. You can now start accepting passengers.'
            : `Your verification was rejected. ${reviewNotes || 'Please review your documents and resubmit.'}`,
          metadata: {
            verification_status: reviewAction,
            review_notes: reviewNotes,
            reviewer_id: user?.id
          }
        });

      toast.success(`Driver verification ${reviewAction}d successfully`);
      setReviewDialog(false);
      setSelectedSubmission(null);
      setReviewNotes('');
      await fetchSubmissions();
    } catch (error) {
      console.error('Error reviewing submission:', error);
      toast.error(t('common.error'));
    } finally {
      setReviewLoading(false);
    }
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    const statusColors = {
      'pending': 'default',
      'approved': 'default',
      'rejected': 'destructive'
    } as const;

    return (
      <Badge variant={statusColors[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {t(`driver.verification.status.${status}`)}
      </Badge>
    );
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (activeTab === 'all') return true;
    return submission.verification_status === activeTab;
  });

  const getTabCounts = () => {
    return {
      pending: submissions.filter(s => s.verification_status === 'pending').length,
      approved: submissions.filter(s => s.verification_status === 'approved').length,
      rejected: submissions.filter(s => s.verification_status === 'rejected').length,
      all: submissions.length
    };
  };

  const tabCounts = getTabCounts();

  if (loading) {
    return <div className="flex justify-center p-8">{t('common.loading')}...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Driver Verification Review</h1>
        <p className="text-muted-foreground">Review and approve driver verification submissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            Pending {tabCounts.pending > 0 && <Badge variant="outline">{tabCounts.pending}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            Approved {tabCounts.approved > 0 && <Badge variant="outline">{tabCounts.approved}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            Rejected {tabCounts.rejected > 0 && <Badge variant="outline">{tabCounts.rejected}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            All {tabCounts.all > 0 && <Badge variant="outline">{tabCounts.all}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredSubmissions.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No submissions found for this status.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <User className="w-8 h-8 text-primary" />
                      <div>
                        <h3 className="font-semibold text-lg">{submission.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{submission.email}</p>
                        {submission.phone_number && (
                          <p className="text-sm text-muted-foreground">{submission.phone_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(submission.verification_status)}
                      <Button
                        variant="outline"
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        Review Details
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span>{submission.vehicle_type} - {submission.vehicle_model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>License: {submission.license_number}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span>{submission.route_name || 'No route specified'}</span>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground">
                    Submitted: {new Date(submission.updated_at).toLocaleDateString()} at {new Date(submission.updated_at).toLocaleTimeString()}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detailed Review Dialog */}
      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {selectedSubmission.full_name} - Verification Review
              </DialogTitle>
              <DialogDescription>
                Review driver information and documents for verification approval
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Driver Information */}
              <div>
                <h4 className="font-medium mb-3">Driver Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="font-medium">{selectedSubmission.full_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{selectedSubmission.phone_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Account Created</Label>
                    <p className="font-medium">{new Date(selectedSubmission.user_created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Vehicle Information */}
              <div>
                <h4 className="font-medium mb-3">Vehicle Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">License Number</Label>
                    <p className="font-medium">{selectedSubmission.license_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">License Expiry</Label>
                    <p className="font-medium">{selectedSubmission.license_expiry}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vehicle Type</Label>
                    <p className="font-medium">{selectedSubmission.vehicle_type}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vehicle Model</Label>
                    <p className="font-medium">{selectedSubmission.vehicle_model}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vehicle Plate</Label>
                    <p className="font-medium">{selectedSubmission.vehicle_plate}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Route</Label>
                    <p className="font-medium">{selectedSubmission.route_name || 'Not specified'}</p>
                  </div>
                </div>
                {selectedSubmission.route_description && (
                  <div className="mt-3">
                    <Label className="text-muted-foreground">Route Description</Label>
                    <p className="text-sm mt-1">{selectedSubmission.route_description}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Documents */}
              <div>
                <h4 className="font-medium mb-3">Uploaded Documents</h4>
                {selectedSubmission.verification_documents ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedSubmission.verification_documents).map(([docType, docData]: [string, any]) => {
                      const getDocIcon = (type: string) => {
                        if (type.includes('license')) return CreditCard;
                        if (type.includes('vehicle')) return Car;
                        return FileText;
                      };
                      const IconComponent = getDocIcon(docType);
                      
                      return (
                        <div key={docType} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <IconComponent className="w-5 h-5 text-primary" />
                            <span className="font-medium">
                              {t(`driver.verification.documentTypes.${docType}`)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Uploaded: {new Date(docData.uploaded_at).toLocaleDateString()}
                            </span>
                            <DocumentViewer 
                              url={docData.url} 
                              title={t(`driver.verification.documentTypes.${docType}`)}
                              type={docData.url.includes('.pdf') ? 'application/pdf' : 'image'}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No documents uploaded</p>
                )}
              </div>

              {/* Review Actions */}
              {selectedSubmission.verification_status === 'pending' && (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => {
                      setReviewAction('approve');
                      setReviewDialog(true);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Verification
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setReviewAction('reject');
                      setReviewDialog(true);
                    }}
                    className="flex-1"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Verification
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Review Confirmation Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Approve' : 'Reject'} Driver Verification
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve' 
                ? 'This will approve the driver verification and allow them to start accepting passengers.'
                : 'This will reject the driver verification. Please provide feedback for the driver.'}
            </DialogDescription>
          </DialogHeader>

          {reviewAction === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="review-notes">Feedback for Driver</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Explain why the verification was rejected and what needs to be corrected..."
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReviewSubmission}
              disabled={reviewLoading || (reviewAction === 'reject' && !reviewNotes.trim())}
              variant={reviewAction === 'approve' ? 'default' : 'destructive'}
            >
              {reviewLoading ? 'Processing...' : `${reviewAction === 'approve' ? 'Approve' : 'Reject'} Verification`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}