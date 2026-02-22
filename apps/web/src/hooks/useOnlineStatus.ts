import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track online/offline status
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to manage offline queue
 */
export interface OfflineAction {
  id: string;
  type: 'ATTENDANCE' | 'GRADE' | 'MATERIAL_DOWNLOAD' | 'FORM_SUBMISSION';
  payload: unknown;
  timestamp: string;
  retryCount: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
}

const OFFLINE_QUEUE_KEY = 'hums-offline-queue';

export function useOfflineQueue() {
  const [queue, setQueue] = useState<OfflineAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const isOnline = useOnlineStatus();

  // Load queue from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (stored) {
      try {
        setQueue(JSON.parse(stored));
      } catch {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
      }
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Add action to queue
  const addToQueue = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    setQueue(prev => [...prev, newAction]);
    return newAction.id;
  }, []);

  // Remove action from queue
  const removeFromQueue = useCallback((id: string) => {
    setQueue(prev => prev.filter(action => action.id !== id));
  }, []);

  // Clear all synced actions
  const clearSyncedActions = useCallback((ids: string[]) => {
    setQueue(prev => prev.filter(action => !ids.includes(action.id)));
  }, []);

  // Sync queue when back online
  const syncQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0 || isSyncing) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    const syncedIds: string[] = [];
    let failed = 0;

    for (const action of queue) {
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(action.payload),
        });

        if (response.ok) {
          syncedIds.push(action.id);
        } else if (response.status >= 400 && response.status < 500) {
          // Client error - remove from queue, don't retry
          syncedIds.push(action.id);
          failed++;
        } else {
          // Server error - increment retry count
          setQueue(prev =>
            prev.map(a =>
              a.id === action.id ? { ...a, retryCount: a.retryCount + 1 } : a
            )
          );
          failed++;
        }
      } catch {
        // Network error - will retry later
        setQueue(prev =>
          prev.map(a =>
            a.id === action.id ? { ...a, retryCount: a.retryCount + 1 } : a
          )
        );
        failed++;
      }
    }

    clearSyncedActions(syncedIds);
    setIsSyncing(false);

    return { synced: syncedIds.length, failed };
  }, [isOnline, queue, isSyncing, clearSyncedActions]);

  // Auto-sync when back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      syncQueue();
    }
  }, [isOnline, queue.length, syncQueue]);

  return {
    queue,
    queueLength: queue.length,
    isSyncing,
    addToQueue,
    removeFromQueue,
    syncQueue,
    clearSyncedActions,
  };
}

/**
 * Hook to check if a specific feature is available offline
 */
export function useOfflineFeature(feature: string): boolean {
  const isOnline = useOnlineStatus();

  const offlineFeatures = [
    'view-schedule',
    'view-grades',
    'view-profile',
    'view-materials',
    'mark-attendance',
    'enter-grades',
  ];

  const onlineOnlyFeatures = [
    'make-payment',
    'register-courses',
    'submit-admission',
    'create-user',
  ];

  if (onlineOnlyFeatures.includes(feature)) {
    return isOnline;
  }

  return offlineFeatures.includes(feature) || isOnline;
}
