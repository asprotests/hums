import { useOnlineStatus, useOfflineQueue } from '@/hooks/useOnlineStatus';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className = '' }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const { queueLength, isSyncing, syncQueue } = useOfflineQueue();
  const [showSyncComplete, setShowSyncComplete] = useState(false);
  const [prevQueueLength, setPrevQueueLength] = useState(queueLength);

  // Show sync complete notification
  useEffect(() => {
    if (prevQueueLength > 0 && queueLength === 0 && isOnline) {
      setShowSyncComplete(true);
      const timer = setTimeout(() => setShowSyncComplete(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevQueueLength(queueLength);
  }, [queueLength, prevQueueLength, isOnline]);

  // Don't show anything when online and no pending actions
  if (isOnline && queueLength === 0 && !showSyncComplete) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 shadow-lg transition-all duration-300 ${
        !isOnline
          ? 'bg-red-500 text-white'
          : showSyncComplete
            ? 'bg-green-500 text-white'
            : 'bg-yellow-500 text-black'
      } ${className}`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-5 w-5" />
          <span className="font-medium">
            You are offline. Some features are limited.
          </span>
          {queueLength > 0 && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-sm">
              {queueLength} pending
            </span>
          )}
        </>
      ) : showSyncComplete ? (
        <>
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">All changes synced!</span>
        </>
      ) : (
        <>
          <RefreshCw className={`h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="font-medium">
            {isSyncing
              ? `Syncing ${queueLength} pending actions...`
              : `${queueLength} actions pending sync`}
          </span>
          {!isSyncing && (
            <button
              onClick={() => syncQueue()}
              className="ml-2 rounded bg-black/20 px-2 py-0.5 text-sm hover:bg-black/30"
            >
              Sync Now
            </button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Banner version for prominent display
 */
export function OfflineBanner({ className = '' }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const { queueLength, isSyncing } = useOfflineQueue();

  if (isOnline && queueLength === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        !isOnline
          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
      } ${className}`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Some features may not work.</span>
        </>
      ) : (
        <>
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing
              ? `Syncing ${queueLength} pending changes...`
              : `${queueLength} changes waiting to sync`}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Compact status indicator for headers
 */
export function OfflineStatus() {
  const isOnline = useOnlineStatus();
  const { queueLength, isSyncing } = useOfflineQueue();

  if (isOnline && queueLength === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        !isOnline
          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
      }`}
      title={
        !isOnline
          ? 'You are offline'
          : `${queueLength} changes pending sync`
      }
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3 w-3" />
          <span>Offline</span>
        </>
      ) : (
        <>
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{queueLength}</span>
        </>
      )}
    </div>
  );
}
