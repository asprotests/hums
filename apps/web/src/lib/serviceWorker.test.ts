import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isPWA } from './serviceWorker';

// Service Worker tests - simplified due to complex browser API mocking
describe('Service Worker Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isPWA', () => {
    it('should return false in browser mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
        writable: true,
        configurable: true,
      });

      expect(isPWA()).toBe(false);
    });

    it('should return true in standalone mode', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: (query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
        writable: true,
        configurable: true,
      });

      expect(isPWA()).toBe(true);
    });

    it('should return true when navigator.standalone is true (iOS)', () => {
      Object.defineProperty(window, 'matchMedia', {
        value: () => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
        writable: true,
        configurable: true,
      });

      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: true,
        configurable: true,
      });

      expect(isPWA()).toBe(true);
    });
  });

  describe('Service Worker API checks', () => {
    it('should check if serviceWorker exists in navigator', () => {
      expect('serviceWorker' in navigator).toBe(true);
    });

    it('should check if Notification exists in window', () => {
      expect('Notification' in window).toBe(true);
    });
  });
});
