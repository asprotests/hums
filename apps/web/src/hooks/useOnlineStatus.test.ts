import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnlineStatus, useOfflineQueue, useOfflineFeature } from './useOnlineStatus';

// Helper to set online status
const setOnlineStatus = (globalThis as unknown as { setOnlineStatus: (status: boolean) => void }).setOnlineStatus;

describe('useOnlineStatus', () => {
  beforeEach(() => {
    setOnlineStatus(true);
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic online/offline detection', () => {
    it('should return true when online', () => {
      setOnlineStatus(true);
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);
    });

    it('should return false when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(false);
    });

    it('should update when going offline', async () => {
      setOnlineStatus(true);
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);

      act(() => {
        setOnlineStatus(false);
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current).toBe(false);
      });
    });

    it('should update when coming online', async () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(false);

      act(() => {
        setOnlineStatus(true);
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current).toBe(true);
      });
    });
  });
});

describe('useOfflineQueue', () => {
  const STORAGE_KEY = 'hums-offline-queue';

  beforeEach(() => {
    setOnlineStatus(true);
    window.localStorage.clear();
    // Mock fetch for sync tests
    vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queue management', () => {
    it('should initialize with empty queue', () => {
      const { result } = renderHook(() => useOfflineQueue());
      expect(result.current.queue).toEqual([]);
      expect(result.current.queueLength).toBe(0);
    });

    it('should add action to queue', () => {
      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.addToQueue({
          type: 'ATTENDANCE',
          payload: { name: 'Test Student' },
          endpoint: '/api/students',
          method: 'POST',
        });
      });

      expect(result.current.queue.length).toBe(1);
      expect(result.current.queueLength).toBe(1);
      expect(result.current.queue[0].type).toBe('ATTENDANCE');
    });

    it('should persist queue to localStorage', () => {
      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.addToQueue({
          type: 'GRADE',
          payload: { id: '123', name: 'Updated Course' },
          endpoint: '/api/courses/123',
          method: 'PATCH',
        });
      });

      const stored = window.localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.length).toBe(1);
      expect(parsed[0].type).toBe('GRADE');
    });

    it('should remove action from queue', () => {
      const { result } = renderHook(() => useOfflineQueue());

      let actionId: string;
      act(() => {
        actionId = result.current.addToQueue({
          type: 'FORM_SUBMISSION',
          payload: { id: '456' },
          endpoint: '/api/payments/456',
          method: 'DELETE',
        });
      });

      expect(result.current.queue.length).toBe(1);

      act(() => {
        result.current.removeFromQueue(actionId!);
      });

      expect(result.current.queue.length).toBe(0);
      expect(result.current.queueLength).toBe(0);
    });

    it('should clear synced actions from queue', () => {
      const { result } = renderHook(() => useOfflineQueue());

      let actionId1: string;
      let actionId2: string;
      act(() => {
        actionId1 = result.current.addToQueue({
          type: 'ATTENDANCE',
          payload: {},
          endpoint: '/api/test1',
          method: 'POST',
        });
        actionId2 = result.current.addToQueue({
          type: 'GRADE',
          payload: {},
          endpoint: '/api/test2',
          method: 'POST',
        });
      });

      expect(result.current.queue.length).toBe(2);

      act(() => {
        result.current.clearSyncedActions([actionId1!]);
      });

      expect(result.current.queue.length).toBe(1);
      expect(result.current.queue[0].id).toBe(actionId2);
    });

    it('should load queue from localStorage on mount', () => {
      const existingQueue = [
        {
          id: 'existing-1',
          type: 'ATTENDANCE',
          payload: { data: 'test' },
          endpoint: '/api/existing',
          method: 'POST',
          timestamp: new Date().toISOString(),
          retryCount: 0,
        },
      ];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(existingQueue));

      const { result } = renderHook(() => useOfflineQueue());

      expect(result.current.queue.length).toBe(1);
      expect(result.current.queue[0].id).toBe('existing-1');
    });
  });

  describe('queue syncing', () => {
    it('should sync queue when online', async () => {
      setOnlineStatus(true);

      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.addToQueue({
          type: 'ATTENDANCE',
          payload: { data: 'sync' },
          endpoint: '/api/sync',
          method: 'POST',
        });
      });

      await act(async () => {
        await result.current.syncQueue();
      });

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should return early when offline', async () => {
      setOnlineStatus(false);

      const { result } = renderHook(() => useOfflineQueue());

      act(() => {
        result.current.addToQueue({
          type: 'ATTENDANCE',
          payload: {},
          endpoint: '/api/offline',
          method: 'POST',
        });
      });

      await act(async () => {
        const syncResult = await result.current.syncQueue();
        expect(syncResult).toEqual({ synced: 0, failed: 0 });
      });

      // Queue should remain since we're offline
      expect(result.current.queue.length).toBe(1);
    });

    it('should have isSyncing state property', () => {
      const { result } = renderHook(() => useOfflineQueue());

      // isSyncing should be a boolean
      expect(typeof result.current.isSyncing).toBe('boolean');
    });
  });
});

describe('useOfflineFeature', () => {
  beforeEach(() => {
    setOnlineStatus(true);
  });

  describe('offline-available features', () => {
    it('should allow view-schedule when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('view-schedule'));
      expect(result.current).toBe(true);
    });

    it('should allow view-grades when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('view-grades'));
      expect(result.current).toBe(true);
    });

    it('should allow view-profile when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('view-profile'));
      expect(result.current).toBe(true);
    });

    it('should allow mark-attendance when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('mark-attendance'));
      expect(result.current).toBe(true);
    });

    it('should allow enter-grades when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('enter-grades'));
      expect(result.current).toBe(true);
    });
  });

  describe('online-only features', () => {
    it('should block make-payment when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('make-payment'));
      expect(result.current).toBe(false);
    });

    it('should allow make-payment when online', () => {
      setOnlineStatus(true);
      const { result } = renderHook(() => useOfflineFeature('make-payment'));
      expect(result.current).toBe(true);
    });

    it('should block register-courses when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('register-courses'));
      expect(result.current).toBe(false);
    });

    it('should block submit-admission when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('submit-admission'));
      expect(result.current).toBe(false);
    });

    it('should block create-user when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('create-user'));
      expect(result.current).toBe(false);
    });
  });

  describe('unknown features', () => {
    it('should allow unknown features when online', () => {
      setOnlineStatus(true);
      const { result } = renderHook(() => useOfflineFeature('unknown-feature'));
      expect(result.current).toBe(true);
    });

    it('should block unknown features when offline', () => {
      setOnlineStatus(false);
      const { result } = renderHook(() => useOfflineFeature('unknown-feature'));
      expect(result.current).toBe(false);
    });
  });
});
