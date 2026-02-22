import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OfflineIndicator, OfflineBanner, OfflineStatus } from './offline-indicator';

// Helper to set online status
const setOnlineStatus = (globalThis as unknown as { setOnlineStatus: (status: boolean) => void }).setOnlineStatus;

// Mock the hooks
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(() => true),
  useOfflineQueue: vi.fn(() => ({
    queue: [],
    queueLength: 0,
    isSyncing: false,
    syncQueue: vi.fn(),
    addToQueue: vi.fn(),
    removeFromQueue: vi.fn(),
    clearSyncedActions: vi.fn(),
  })),
}));

import { useOnlineStatus, useOfflineQueue } from '@/hooks/useOnlineStatus';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [],
      queueLength: 0,
      isSyncing: false,
      syncQueue: vi.fn().mockResolvedValue({ synced: 0, failed: 0 }),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });
  });

  it('should not render when online with no pending actions', () => {
    const { container } = render(<OfflineIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('should show offline message when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [],
      queueLength: 0,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it('should show pending count when offline with queued actions', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 3,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/3 pending/)).toBeInTheDocument();
  });

  it('should show syncing state when syncing', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 2,
      isSyncing: true,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/Syncing 2 pending actions/)).toBeInTheDocument();
  });

  it('should show pending actions count when online with queue', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 5,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineIndicator />);
    expect(screen.getByText(/5 actions pending sync/)).toBeInTheDocument();
  });

  it('should call syncQueue when Sync Now button is clicked', () => {
    const mockSyncQueue = vi.fn();
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 1,
      isSyncing: false,
      syncQueue: mockSyncQueue,
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineIndicator />);
    const syncButton = screen.getByRole('button', { name: /Sync Now/i });
    fireEvent.click(syncButton);

    expect(mockSyncQueue).toHaveBeenCalled();
  });

  it('should accept custom className', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    const { container } = render(<OfflineIndicator className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('OfflineBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [],
      queueLength: 0,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });
  });

  it('should not render when online with no pending actions', () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('should show offline banner when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    render(<OfflineBanner />);
    expect(screen.getByText(/You are offline/)).toBeInTheDocument();
  });

  it('should show syncing message when syncing', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 3,
      isSyncing: true,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineBanner />);
    expect(screen.getByText(/Syncing 3 pending changes/)).toBeInTheDocument();
  });

  it('should show waiting message when not syncing', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 2,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineBanner />);
    expect(screen.getByText(/2 changes waiting to sync/)).toBeInTheDocument();
  });
});

describe('OfflineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [],
      queueLength: 0,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });
  });

  it('should not render when online with no pending actions', () => {
    const { container } = render(<OfflineStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('should show Offline text when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    render(<OfflineStatus />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show queue count when online with pending items', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 7,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    render(<OfflineStatus />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should have appropriate title attribute when offline', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(false);

    const { container } = render(<OfflineStatus />);
    expect(container.firstChild).toHaveAttribute('title', 'You are offline');
  });

  it('should have appropriate title attribute when syncing', () => {
    vi.mocked(useOnlineStatus).mockReturnValue(true);
    vi.mocked(useOfflineQueue).mockReturnValue({
      queue: [{ id: '1' }] as any,
      queueLength: 4,
      isSyncing: false,
      syncQueue: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearSyncedActions: vi.fn(),
    });

    const { container } = render(<OfflineStatus />);
    expect(container.firstChild).toHaveAttribute('title', '4 changes pending sync');
  });
});
