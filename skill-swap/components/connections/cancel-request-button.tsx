"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/contexts/wallet-context";

export function CancelRequestButton({ receiverId }: { receiverId: string }) {
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  const { refreshWallet } = useWallet();

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch("/api/connections/cancel", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId }),
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success("Connection request cancelled", {
          description: `${data.creditsRefunded} credits have been refunded to your wallet.`,
        });
        refreshWallet();
        router.refresh();
      } else {
        toast.error(data.error || "Failed to cancel request");
      }
    } catch (error) {
      toast.error("Failed to cancel request");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="bg-transparent text-destructive hover:bg-destructive/10"
      onClick={handleCancel}
      disabled={isCancelling}
    >
      {isCancelling ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <XCircle className="w-4 h-4 mr-2" />
      )}
      Cancel Request
    </Button>
  );
}
