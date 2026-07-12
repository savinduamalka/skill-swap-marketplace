'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Loader2, Search, UserX, UserCheck, Shield } from 'lucide-react';

interface AdminUser {
  id: string;
  fullName: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  createdAt: string;
  _count: {
    skillsOffered: number;
    connections: number;
    newsfeedPosts: number;
  };
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(searchParams.get('filter') || 'all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; name: string; action: 'suspend' | 'restore' } | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        filter,
        page: page.toString(),
        limit: '10',
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleAction = async () => {
    if (!confirmAction) return;

    setIsActioning(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: confirmAction.userId,
          action: confirmAction.action,
        }),
      });

      if (res.ok) {
        toast.success(
          confirmAction.action === 'suspend'
            ? `${confirmAction.name} has been suspended`
            : `${confirmAction.name} has been restored`
        );
        fetchUsers();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Action failed');
      }
    } catch {
      toast.error('Action failed');
    } finally {
      setIsActioning(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">View and manage platform users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="space-y-2">
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>User</span>
            <span>Skills</span>
            <span>Connections</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No users found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table Header */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <span>User</span>
            <span>Skills</span>
            <span>Connections</span>
            <span>Joined</span>
            <span>Actions</span>
          </div>

          {users.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 items-start md:items-center">
                {/* User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={user.image || ''} />
                    <AvatarFallback>
                      {(user.fullName || user.name || '?')[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {user.fullName || user.name || 'Unnamed'}
                      </p>
                      {user.isAdmin && (
                        <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      {!user.isVerified && (
                        <Badge variant="destructive" className="text-xs shrink-0">Suspended</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <p className="text-sm">{user._count.skillsOffered}</p>
                <p className="text-sm">{user._count.connections}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </p>

                {/* Actions */}
                <div>
                  {user.isAdmin ? (
                    <Badge variant="secondary" className="text-xs">Admin</Badge>
                  ) : user.isVerified ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                      onClick={() => setConfirmAction({ userId: user.id, name: user.fullName || user.name || 'User', action: 'suspend' })}
                    >
                      <UserX className="w-3.5 h-3.5 mr-1" />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                      onClick={() => setConfirmAction({ userId: user.id, name: user.fullName || user.name || 'User', action: 'restore' })}
                    >
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total} users
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {page} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === 'suspend' ? 'Suspend User' : 'Restore User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === 'suspend'
                ? `Are you sure you want to suspend ${confirmAction.name}? They will not be able to log in or use the platform until restored.`
                : `Are you sure you want to restore ${confirmAction?.name}? They will regain full access to the platform.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isActioning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isActioning}
              className={confirmAction?.action === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isActioning ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {confirmAction?.action === 'suspend' ? 'Suspend' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
