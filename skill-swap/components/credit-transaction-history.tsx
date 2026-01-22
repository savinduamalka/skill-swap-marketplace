'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  Users,
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  Coins,
} from 'lucide-react';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  isCredit: boolean;
  type: string;
  status: string;
  note: string | null;
  context: string;
  skillName: string;
  relatedUser: {
    id: string;
    name: string;
    image: string | null;
  } | null;
  createdAt: string;
}

interface TransactionHistoryDialogProps {
  trigger?: React.ReactNode;
  currentBalance?: number;
}

// Transaction type display config
const transactionTypeConfig: Record<
  string,
  { label: string; icon: typeof ArrowUpRight; color: string }
> = {
  CONNECTION_REQUEST_SENT: {
    label: 'Connection Request Sent',
    icon: ArrowUpRight,
    color: 'text-orange-500',
  },
  CONNECTION_REQUEST_RECEIVED: {
    label: 'Connection Request Received',
    icon: ArrowDownLeft,
    color: 'text-green-500',
  },
  CONNECTION_REQUEST_REFUNDED: {
    label: 'Connection Request Refunded',
    icon: RefreshCcw,
    color: 'text-blue-500',
  },
  SESSION_REQUEST_SENT: {
    label: 'Session Request Sent',
    icon: ArrowUpRight,
    color: 'text-orange-500',
  },
  SESSION_REQUEST_RECEIVED: {
    label: 'Session Request Received',
    icon: ArrowDownLeft,
    color: 'text-green-500',
  },
  SESSION_REQUEST_REFUNDED: {
    label: 'Session Request Refunded',
    icon: RefreshCcw,
    color: 'text-blue-500',
  },
  SESSION_COMPLETED: {
    label: 'Session Completed',
    icon: Calendar,
    color: 'text-green-500',
  },
  SESSION_CANCELLED: {
    label: 'Session Cancelled',
    icon: RefreshCcw,
    color: 'text-yellow-500',
  },
  INITIAL_ALLOCATION: {
    label: 'Initial Credit Allocation',
    icon: Coins,
    color: 'text-purple-500',
  },
};

// Get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CreditTransactionHistoryDialog({
  trigger,
  currentBalance,
}: TransactionHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (typeFilter && typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      const response = await fetch(`/api/user/transactions?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      setTransactions(data.transactions);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    if (open) {
      fetchTransactions();
    }
  }, [open, fetchTransactions]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [typeFilter]);

  const handlePrevPage = () => {
    if (page > 1) setPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (page < totalPages) setPage((p) => p + 1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <History className="w-4 h-4" />
            Transaction History
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Credit Transaction History
          </DialogTitle>
          <DialogDescription>
            View your complete credit transaction history
          </DialogDescription>
        </DialogHeader>

        {/* Current Balance Display */}
        {currentBalance !== undefined && (
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4 mb-4">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold text-primary">
              {currentBalance} <span className="text-lg">credits</span>
            </p>
          </div>
        )}

        {/* Filter */}
        <div className="flex items-center justify-between mb-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="CONNECTION_REQUEST_SENT">
                Connection Requests Sent
              </SelectItem>
              <SelectItem value="CONNECTION_REQUEST_RECEIVED">
                Connection Requests Received
              </SelectItem>
              <SelectItem value="SESSION_REQUEST_SENT">
                Session Requests Sent
              </SelectItem>
              <SelectItem value="SESSION_REQUEST_RECEIVED">
                Session Requests Received
              </SelectItem>
              <SelectItem value="SESSION_COMPLETED">
                Sessions Completed
              </SelectItem>
              <SelectItem value="INITIAL_ALLOCATION">
                Initial Allocation
              </SelectItem>
            </SelectContent>
          </Select>

          <p className="text-sm text-muted-foreground">
            {total} transaction{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Transactions List */}
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button variant="outline" onClick={fetchTransactions}>
                Try Again
              </Button>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your credit transaction history will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const config = transactionTypeConfig[tx.type] || {
                  label: tx.type,
                  icon: Wallet,
                  color: 'text-muted-foreground',
                };
                const Icon = config.icon;

                return (
                  <div
                    key={tx.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Icon or User Avatar */}
                    <div className="relative">
                      {tx.relatedUser?.image ? (
                        <img
                          src={tx.relatedUser.image}
                          alt={tx.relatedUser.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : tx.relatedUser ? (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <span className="text-xs font-bold text-primary-foreground">
                            {getInitials(tx.relatedUser.name)}
                          </span>
                        </div>
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center ${config.color}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                      )}
                      {/* Credit/Debit indicator */}
                      <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                          tx.isCredit ? 'bg-green-500' : 'bg-orange-500'
                        }`}
                      >
                        {tx.isCredit ? (
                          <ArrowDownLeft className="w-3 h-3 text-white" />
                        ) : (
                          <ArrowUpRight className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {config.label}
                          </p>
                          {tx.relatedUser && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {tx.isCredit ? 'From' : 'To'}: {tx.relatedUser.name}
                            </p>
                          )}
                          {tx.context && (
                            <p className="text-sm text-muted-foreground">
                              {tx.context}
                            </p>
                          )}
                          {tx.note && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              &quot;{tx.note}&quot;
                            </p>
                          )}
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p
                            className={`font-bold ${
                              tx.isCredit ? 'text-green-500' : 'text-orange-500'
                            }`}
                          >
                            {tx.isCredit ? '+' : '-'}
                            {tx.amount}
                          </p>
                          <Badge
                            variant={
                              tx.status === 'COMPLETED'
                                ? 'default'
                                : tx.status === 'PENDING'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(tx.createdAt), 'MMM d, yyyy \'at\' h:mm a')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={page === totalPages || loading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
