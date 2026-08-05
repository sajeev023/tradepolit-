"use client";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        borderRadius: "8px",
        backgroundColor: "#160b0d",
        border: "1px solid rgba(244, 63, 94, 0.2)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 10px rgba(244, 63, 94, 0.1)",
        color: "#f43f5e",
        fontSize: "12px",
        fontWeight: 600,
        pointerEvents: "none",
      }}
      className="animate-fade-in"
    >
      <WifiOff size={14} className="animate-pulse" />
      <span>You are offline. Displaying cached session details.</span>
    </div>
  );
}
