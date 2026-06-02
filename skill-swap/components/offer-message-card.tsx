/**
 * Offer Message Card Component
 *
 * Renders a structured, premium card inside message bubbles for credit/session proposals.
 * Provides interactive action buttons based on the user's role and status of the offer.
 *
 * @fileoverview Card rendering component for offer messages
 */
'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Handshake, Calendar, Clock, MapPin, Video, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import type { Message } from '@/lib/types/messages';
import { cn } from '@/lib/utils';

interface OfferMessageCardProps {
  msg: Message;
  currentUserId?: string;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  onWithdraw: () => Promise<void>;
  onCounterOffer?: () => Promise<void>;
  isSearchMatch?: boolean;
  isCurrentSearchResult?: boolean;
}

export function OfferMessageCard({
  msg,
  currentUserId,
  onAccept,
  onDecline,
  onWithdraw,
  onCounterOffer,
  isSearchMatch,
  isCurrentSearchResult,
}: OfferMessageCardProps) {
  const [loading, setLoading] = useState(false);
  
  let offer: any;
  try {
    offer = JSON.parse(msg.content);
  } catch (e) {
    return (
      <div className="p-3 border border-destructive bg-destructive/10 rounded-lg text-xs text-destructive flex items-center gap-2">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Invalid offer metadata format.</span>
      </div>
    );
  }

  const { sessionName, description, skillName, credits, mode, startDate, endDate, status, sessionId } = offer;
  const isOwnOffer = msg.senderId === currentUserId;
  
  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const datePart = format(start, 'EEE, MMM d, yyyy');
      const timeStart = format(start, 'h:mm a');
      const timeEnd = format(end, 'h:mm a');
      return { datePart, timeRange: `${timeStart} - ${timeEnd}` };
    } catch (e) {
      return { datePart: 'Invalid Date', timeRange: '' };
    }
  };

  const { datePart, timeRange } = formatDateRange(startDate, endDate);

  const handleAction = async (actionFn: () => Promise<void>) => {
    if (loading) return;
    setLoading(true);
    try {
      await actionFn();
    } catch (error) {
      console.error('Error handling offer action:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'DECLINED':
        return 'destructive';
      case 'ACCEPTED':
      case 'WITHDRAWN':
      case 'PENDING':
      default:
        return 'outline';
    }
  };

  return (
    <Card className={cn(
      "w-[340px] max-w-full border shadow-md bg-card overflow-hidden transition-all duration-300 rounded-xl my-1.5",
      isSearchMatch && "ring-2 ring-yellow-400 dark:ring-yellow-500",
      isCurrentSearchResult && "ring-2 ring-primary shadow-lg",
      isOwnOffer ? "border-primary/30" : "border-border",
      msg.isOwn ? "ml-auto" : "mr-auto"
    )}>
      {/* Header Banner */}
      <div className={cn(
        "px-4 py-2.5 flex justify-between items-center border-b",
        status === 'PENDING' && "bg-primary/5 border-primary/10",
        status === 'ACCEPTED' && "bg-emerald-500/10 border-emerald-500/20",
        status === 'DECLINED' && "bg-destructive/10 border-destructive/20",
        status === 'WITHDRAWN' && "bg-muted border-border"
      )}>
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Handshake className={cn(
            "w-4 h-4",
            status === 'PENDING' && "text-primary",
            status === 'ACCEPTED' && "text-emerald-500",
            status === 'DECLINED' && "text-destructive",
            status === 'WITHDRAWN' && "text-muted-foreground"
          )} />
          <span>Swap Proposal</span>
        </div>
        <Badge
          variant={getStatusBadgeVariant(status)}
          className={cn(
            "capitalize text-[10px] font-bold px-2 py-0.5 rounded-full leading-none border",
            status === 'PENDING' && "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900/50",
            status === 'ACCEPTED' && "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900/50",
            status === 'WITHDRAWN' && "bg-zinc-100 text-zinc-800 border-zinc-200 dark:bg-zinc-900/30 dark:text-zinc-400 dark:border-zinc-900/50"
          )}
        >
          {status.toLowerCase()}
        </Badge>
      </div>

      <CardContent className="p-4 space-y-3.5">
        {/* Topic and Skill Info */}
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{sessionName}</h4>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Skill:</span>
            <span className="font-semibold text-foreground underline decoration-primary/45 underline-offset-2">
              {skillName}
            </span>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-2 leading-normal line-clamp-3 bg-muted/20 p-2 rounded border border-border/30">
              {description}
            </p>
          )}
        </div>

        {/* Swap details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/50">
          <div className="space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Credits</span>
            <p className="font-bold text-foreground flex items-baseline gap-0.5">
              <span className="text-primary font-black text-sm">{credits}</span>
              <span className="text-[10px] text-muted-foreground">credits</span>
            </p>
          </div>
          <div className="space-y-0.5">
            <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Session Mode</span>
            <p className="font-semibold text-foreground flex items-center gap-1">
              {mode === 'ONLINE' ? (
                <>
                  <Video className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>In-Person</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Date and Time details */}
        <div className="space-y-1.5 text-xs border-t border-border/40 pt-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4 text-primary/70 shrink-0" />
            <span className="font-medium text-foreground">{datePart}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-primary/70 shrink-0" />
            <span className="font-medium text-foreground">{timeRange}</span>
          </div>
        </div>

        {/* Action Buttons / Result Details */}
        {status === 'PENDING' && (
          <div className={cn(
            "border-t border-border/40 pt-3 w-full",
            isOwnOffer ? "flex justify-end gap-2" : "grid grid-cols-3 gap-2"
          )}>
            {isOwnOffer ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction(onWithdraw)}
                disabled={loading}
                className="text-xs border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-3 rounded-lg"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                )}
                Withdraw
              </Button>
            ) : (
              <>
                {onCounterOffer && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction(onCounterOffer)}
                    disabled={loading}
                    className="text-xs border-primary text-primary hover:bg-primary/10 hover:text-primary h-8 px-2 rounded-lg w-full flex items-center justify-center"
                  >
                    <Handshake className="w-3.5 h-3.5 mr-1" />
                    <span>Counter</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAction(onDecline)}
                  disabled={loading}
                  className="text-xs border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-2 rounded-lg w-full flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                  )}
                  <span>Decline</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAction(onAccept)}
                  disabled={loading}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2 rounded-lg w-full flex items-center justify-center"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 mr-1" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  <span>Accept</span>
                </Button>
              </>
            )}
          </div>
        )}

        {status === 'ACCEPTED' && (
          <div className="border-t border-border/40 pt-2.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>Offer accepted & session scheduled!</span>
            </div>
            {sessionId && (
              <Button
                size="sm"
                variant="link"
                className="text-xs font-bold text-primary hover:underline h-5 p-0 justify-start w-fit"
                asChild
              >
                <a href="/sessions">View Scheduled Sessions &rarr;</a>
              </Button>
            )}
          </div>
        )}

        {status === 'DECLINED' && (
          <div className="border-t border-border/40 pt-2.5 flex items-center gap-1.5 text-xs text-destructive font-bold">
            <XCircle className="w-4 h-4 shrink-0 text-destructive" />
            <span>This swap offer was declined.</span>
          </div>
        )}

        {status === 'WITHDRAWN' && (
          <div className="border-t border-border/40 pt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>This offer was withdrawn.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("animate-spin shrink-0", className)}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
