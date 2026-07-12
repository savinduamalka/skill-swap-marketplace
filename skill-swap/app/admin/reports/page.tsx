'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Flag, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface ReportUser {
  id: string;
  fullName: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  isVerified: boolean;
}

interface Report {
  id: string;
  reportedByUserId: string;
  reportedUserId: string | null;
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  status: string;
  action: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reportedBy: ReportUser | null;
  reportedUser: ReportUser | null;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  REVIEWED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  DISMISSED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  ACTIONED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const reasonLabels: Record<string, string> = {
  SPAM: 'Spam or misleading',
  HARASSMENT: 'Harassment or bullying',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  FAKE_PROFILE: 'Fake profile',
  SCAM: 'Scam or fraud',
  HATE_SPEECH: 'Hate speech',
  IMPERSONATION: 'Impersonation',
  OTHER: 'Other',
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}&page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleReview = async (status: string, action: string | null) => {
    if (!selectedReport) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: selectedReport.id,
          status,
          action,
        }),
      });

      if (res.ok) {
        toast.success('Report updated successfully');
        setSelectedReport(null);
        fetchReports();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update report');
      }
    } catch {
      toast.error('Failed to update report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Review and manage user reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
              <SelectItem value="ACTIONED">Actioned</SelectItem>
              <SelectItem value="DISMISSED">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-5 w-24 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-12 text-center">
          <Flag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No reports found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="p-4 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={report.reportedUser?.image || ''} />
                    <AvatarFallback>
                      {(report.reportedUser?.fullName || report.reportedUser?.name || '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {report.reportedUser?.fullName || report.reportedUser?.name || 'Unknown User'}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {reasonLabels[report.reason] || report.reason}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Reported by {report.reportedBy?.fullName || report.reportedBy?.name || 'Unknown'} · {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                    {report.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{report.description}</p>
                    )}
                  </div>
                </div>
                <Badge className={`shrink-0 ${statusColors[report.status] || ''}`}>
                  {report.status}
                </Badge>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} reports
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) { setSelectedReport(null); } }}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-red-500" />
                  Report Details
                </DialogTitle>
                <DialogDescription>
                  Review this report and take appropriate action.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Reported User */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reported User</p>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedReport.reportedUser?.image || ''} />
                      <AvatarFallback>
                        {(selectedReport.reportedUser?.fullName || '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedReport.reportedUser?.fullName || selectedReport.reportedUser?.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedReport.reportedUser?.email}</p>
                    </div>
                    {selectedReport.reportedUser && !selectedReport.reportedUser.isVerified && (
                      <Badge variant="destructive" className="text-xs ml-auto">Suspended</Badge>
                    )}
                  </div>
                </div>

                {/* Reporter */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reported By</p>
                  <p className="text-sm">{selectedReport.reportedBy?.fullName || selectedReport.reportedBy?.name} ({selectedReport.reportedBy?.email})</p>
                </div>

                {/* Reason */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Violation Type</p>
                  <Badge variant="outline">{reasonLabels[selectedReport.reason] || selectedReport.reason}</Badge>
                </div>

                {/* Description */}
                {selectedReport.description && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Details</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{selectedReport.description}</p>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Status</p>
                  <Badge className={statusColors[selectedReport.status] || ''}>{selectedReport.status}</Badge>
                </div>

                {/* Actions (only for PENDING reports) */}
                {selectedReport.status === 'PENDING' && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Take Action</p>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        className="justify-start"
                        disabled={isSubmitting}
                        onClick={() => handleReview('DISMISSED', 'DISMISSED')}
                      >
                        <XCircle className="w-4 h-4 mr-2 text-gray-500" />
                        Dismiss — No violation found
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start"
                        disabled={isSubmitting}
                        onClick={() => handleReview('ACTIONED', 'WARNING')}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" />
                        Issue Warning
                      </Button>
                      <Button
                        variant="destructive"
                        className="justify-start"
                        disabled={isSubmitting}
                        onClick={() => handleReview('ACTIONED', 'SUSPENDED')}
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Suspend User Account
                      </Button>
                    </div>
                  </div>
                )}

                {selectedReport.status !== 'PENDING' && selectedReport.reviewedAt && (
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Reviewed</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(selectedReport.reviewedAt).toLocaleString()}
                      {selectedReport.action && ` — Action: ${selectedReport.action}`}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
