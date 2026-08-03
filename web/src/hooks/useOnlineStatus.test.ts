import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useOnlineStatus } from './useOnlineStatus';

describe('useOnlineStatus', () => {
  // Mock navigator.onLine
  let onlineGetter: jest.SpyInstance;

  beforeEach(() => {
    onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
  });

  afterEach(() => {
    onlineGetter.mockRestore();
  });

  it('should return true when online', () => {
    onlineGetter.mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('should return false when offline', () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('should update when online status changes to offline', () => {
    onlineGetter.mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    // Simulate going offline
    act(() => {
      onlineGetter.mockReturnValue(false);
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current).toBe(false);
  });

  it('should update when online status changes to online', () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    // Simulate going online
    act(() => {
      onlineGetter.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current).toBe(true);
  });
});
