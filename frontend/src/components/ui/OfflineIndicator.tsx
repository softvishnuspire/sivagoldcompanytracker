"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial online status
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Back online! Automatically refreshing data...", {
        duration: 3000,
      });
      // Optionally trigger query refetch here if needed
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error("You are offline. Please check your internet connection.", {
        duration: 5000,
      });
    };

    // Check for slow connection using Network Information API if supported
    const checkConnectionSpeed = () => {
      const conn = (navigator as any).connection;
      if (conn) {
        if (conn.saveData || /2g|slow-2g/.test(conn.effectiveType)) {
          setIsSlow(true);
        } else {
          setIsSlow(false);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener("change", checkConnectionSpeed);
      checkConnectionSpeed();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (conn) {
        conn.removeEventListener("change", checkConnectionSpeed);
      }
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOffline(false);
      toast.success("Connection re-established successfully!");
      window.location.reload();
    } else {
      toast.error("Still offline. Please check your connection and try again.");
    }
  };

  if (!isOffline && !isSlow) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border bg-white p-4 shadow-xl animate-bounce border-amber-500/30">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
          <svg
            className="h-5 w-5 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            {isOffline ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-3.536 4.978 4.978 0 011.414-3.536m0 0L5.636 5.636M8.464 8.464l1.414 1.414m-1.414 5.656l-1.414 1.414"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            )}
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-900 text-sm">
            {isOffline ? "You're offline" : "Slow Connection Detected"}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {isOffline
              ? "Check your network settings. Features may be disabled."
              : "Data transfers might take longer. Consider pausing uploads."}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleRetry}
              className="rounded bg-gradient-to-r from-[#4d0711] to-[#3d1510] px-3 py-1 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
